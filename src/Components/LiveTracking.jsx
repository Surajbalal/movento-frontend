import { useEffect, useState, useMemo, useRef } from "react";
import {
  GoogleMap,
  Marker,
  Polyline,
  useJsApiLoader,
} from "@react-google-maps/api";
import axiosInstance from "../api/axiosInstance";
import captainAxiosInstance from "../api/captainAxiosInstance";

const containerStyle = {
  width: "100%",
  height: "100%",
};

function decodePolyline(encoded) {
  if (!encoded) return [];
  const poly = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    poly.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return poly;
}

export default function LiveTracking({ rideData, isCaptain, pickup: pickupProp, destination: destinationProp, onRouteUpdate }) {
  const mapRef = useRef(null);

  const [userLocation, setUserLocation] = useState(null);
  const [captainLocation, setCaptainLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeError, setRouteError] = useState(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API,
  });

  // ===============================
  // Extract Pickup & Destination
  // ===============================
  const pickup = useMemo(() => {
    if (rideData?.pickup?.location?.coordinates) {
      return {
        lat: Number(rideData.pickup.location.coordinates[1]),
        lng: Number(rideData.pickup.location.coordinates[0]),
      };
    }
    return pickupProp || null;
  }, [rideData, pickupProp]);

  const destination = useMemo(() => {
    if (rideData?.destination?.location?.coordinates) {
      return {
        lat: Number(rideData.destination.location.coordinates[1]),
        lng: Number(rideData.destination.location.coordinates[0]),
      };
    }
    return destinationProp || null;
  }, [rideData, destinationProp]);

  // Geocoded coordinates fallback for string inputs (e.g. during Fare Preview)
  const resolvedPickup = useMemo(() => {
    if (!pickup) return null;
    if (typeof pickup === "object" && pickup.lat && pickup.lng) {
      return pickup;
    }
    if (routeCoordinates && routeCoordinates.length > 0) {
      return routeCoordinates[0];
    }
    return null;
  }, [pickup, routeCoordinates]);

  const resolvedDestination = useMemo(() => {
    if (!destination) return null;
    if (typeof destination === "object" && destination.lat && destination.lng) {
      return destination;
    }
    if (routeCoordinates && routeCoordinates.length > 0) {
      return routeCoordinates[routeCoordinates.length - 1];
    }
    return null;
  }, [destination, routeCoordinates]);

  // ===============================
  // 👤 Get User Location
  // ===============================
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((pos) => {
      setUserLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
    });
  }, []);

  // ===============================
  // 🚗 Captain Location Handling
  // ===============================
  useEffect(() => {
    if (!rideData) return;

    if (isCaptain) {
      // Captain uses live GPS
      if (!navigator.geolocation) return;

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };

          setCaptainLocation(coords);

          // OPTIONAL: send to backend/socket here
          // socket.emit("captain-location-update", coords);
        },
        (err) => console.log("GPS error:", err),
        { enableHighAccuracy: true }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      // User gets captain location from backend rideData
      if (rideData?.captain?.location?.coordinates) {
        setCaptainLocation({
          lat: Number(rideData.captain.location.coordinates[1]),
          lng: Number(rideData.captain.location.coordinates[0]),
        });
      }
    }
  }, [rideData, isCaptain]);

  // ===============================
  // Route Logic
  // ===============================
  const routeInfo = useMemo(() => {
    if (!rideData) {
      // No ride data yet — if pickup and destination exist, show route preview
      if (pickup && destination) {
        return {
          origin: pickup,
          destination: destination,
          showRoute: true,
        };
      }
      return { showRoute: false };
    }

    const status = rideData.status;

    // ACCEPTED → Captain to Pickup
    if (status === "accepted" && captainLocation && pickup) {
      return {
        origin: captainLocation,
        destination: pickup,
        showRoute: true,
      };
    }

    // ONGOING → Pickup to Destination
    if (status === "ongoing" && pickup && destination) {
      return {
        origin: pickup,
        destination: destination,
        showRoute: true,
      };
    }

    // PENDING or any other status → Pickup to Destination (route preview)
    if (pickup && destination) {
      return {
        origin: pickup,
        destination: destination,
        showRoute: true,
      };
    }

    return { showRoute: false };
  }, [rideData, captainLocation, pickup, destination]);

  const originKey = useMemo(() => {
    if (!routeInfo.origin) return "";
    if (typeof routeInfo.origin === "string") return routeInfo.origin;
    if (routeInfo.origin.lat && routeInfo.origin.lng) {
      return `${routeInfo.origin.lat},${routeInfo.origin.lng}`;
    }
    return "";
  }, [routeInfo.origin]);

  const destinationKey = useMemo(() => {
    if (!routeInfo.destination) return "";
    if (typeof routeInfo.destination === "string") return routeInfo.destination;
    if (routeInfo.destination.lat && routeInfo.destination.lng) {
      return `${routeInfo.destination.lat},${routeInfo.destination.lng}`;
    }
    return "";
  }, [routeInfo.destination]);

  // ===============================
  // 🗺️ Fetch Directions
  // ===============================
  // Fetch Directions
  // ===============================
  useEffect(() => {
    if (!isLoaded) return;
    if (!routeInfo.showRoute) return;
    if (!routeInfo.origin || !routeInfo.destination) return;

    const fetchRoute = async () => {
      try {
        setRouteError(null);
        let originParam = "";
        if (typeof routeInfo.origin === "string") {
          originParam = routeInfo.origin;
        } else if (routeInfo.origin && typeof routeInfo.origin === "object") {
          originParam = `${routeInfo.origin.lat},${routeInfo.origin.lng}`;
        }

        let destParam = "";
        if (typeof routeInfo.destination === "string") {
          destParam = routeInfo.destination;
        } else if (routeInfo.destination && typeof routeInfo.destination === "object") {
          destParam = `${routeInfo.destination.lat},${routeInfo.destination.lng}`;
        }

        const client = isCaptain ? captainAxiosInstance : axiosInstance;
        const requestUrl = "/rides/maps/get-route-polyline";
        const requestParams = {
          origin: originParam,
          destination: destParam
        };
        console.log("[LiveTracking] Request URL:", requestUrl);
        console.log("[LiveTracking] Request parameters:", requestParams);

        const response = await client.get(requestUrl, {
          params: requestParams
        });

        console.log("[LiveTracking] Response payload:", response.data);

        const encodedPolyline = response.data?.encodedPolyline;
        if (encodedPolyline) {
          console.log("[LiveTracking] Routes API OK — encodedPolyline length:", encodedPolyline.length);
          try {
            const decoded = decodePolyline(encodedPolyline);
            console.log("[LiveTracking] Decoded coordinates count:", decoded.length);
            setRouteCoordinates(decoded);

            if (onRouteUpdate) {
              onRouteUpdate({
                distanceMeters: response.data.distanceMeters,
                duration: response.data.duration
              });
            }

            if (mapRef.current && decoded.length > 0) {
              const bounds = new window.google.maps.LatLngBounds();
              decoded.forEach((point) => bounds.extend(point));
              mapRef.current.fitBounds(bounds, {
                top: 60,
                bottom: 200,
                left: 40,
                right: 40,
              });
            }
          } catch (decodeErr) {
            console.error("[LiveTracking] Failed to decode polyline:", decodeErr);
            setRouteError("Failed to decode route coordinates");
            setRouteCoordinates([]);
          }
        } else {
          const errMsg = "Response payload missing encodedPolyline";
          console.error("[LiveTracking] Route polyline error:", errMsg);
          setRouteError(errMsg);
          setRouteCoordinates([]);
        }
      } catch (error) {
        const errMsg = error.response?.data?.message || error.message || "Failed to load route";
        console.error("[LiveTracking] Routes proxy failed:", errMsg, error);
        setRouteError(`Routes proxy failed: ${errMsg}`);
        setRouteCoordinates([]);
      }
    };

    fetchRoute();
  }, [isLoaded, routeInfo.showRoute, originKey, destinationKey, isCaptain]);

  // ===============================
  // 📐 Fit bounds to markers (Fallback when route coordinates are not loaded yet/fails)
  // ===============================
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
    if (!resolvedPickup || !resolvedDestination) return;
    // Only fit bounds when we don't have route coordinates
    if (routeCoordinates && routeCoordinates.length > 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(resolvedPickup);
    bounds.extend(resolvedDestination);
    if (captainLocation) bounds.extend(captainLocation);
    mapRef.current.fitBounds(bounds, {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50,
    });
  }, [
    isLoaded,
    resolvedPickup,
    resolvedDestination,
    captainLocation,
    routeCoordinates,
  ]);

  // ===============================
  // 📍 Map Center Fallback
  // ===============================
  const mapCenter =
    captainLocation || userLocation || pickup || destination;

  if (!isLoaded) return <div>Loading Map...</div>;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {routeError && (
        <div style={{
          position: "absolute",
          top: "10px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "#FEE2E2",
          color: "#991B1B",
          border: "1px solid #F87171",
          padding: "8px 16px",
          borderRadius: "6px",
          zIndex: 9999,
          fontWeight: "600",
          fontSize: "13px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          textAlign: "center",
          width: "90%",
          maxWidth: "400px"
        }}>
          ⚠️ {routeError}
        </div>
      )}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={14}
        options={{ disableDefaultUI: false, zoomControl: true }}
        onLoad={(map) => (mapRef.current = map)}
        
      >
        {/* Captain Marker */}
        {captainLocation && (
          <Marker position={captainLocation} label="🚗" />
        )}

        {/* User Marker */}
        {userLocation && <Marker position={userLocation} label="👤" />}

        {/* Pickup Marker */}
        {resolvedPickup && <Marker position={resolvedPickup} label="P" />}

        {/* Destination Marker — always show when available */}
        {resolvedDestination && (
          <Marker position={resolvedDestination} label="D" />
        )}

        {/* Route Line — decoded coordinates from computeRoutes backend API */}
        {routeCoordinates && routeCoordinates.length > 0 && (
          <Polyline
            path={routeCoordinates}
            options={{
              strokeColor: "#2563EB", // premium blue
              strokeOpacity: 0.85,
              strokeWeight: 5,
              geodesic: true,
            }}
          />
        )}
        
      </GoogleMap>
    </div>
  );
}
