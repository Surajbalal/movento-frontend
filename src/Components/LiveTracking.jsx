import { useEffect, useState, useMemo, useRef } from "react";
import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  Polyline,
  useJsApiLoader,
} from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "100%",
};

export default function LiveTracking({ rideData, isCaptain, pickup: pickupProp, destination: destinationProp }) {
  const mapRef = useRef(null);

  const [userLocation, setUserLocation] = useState(null);
  const [captainLocation, setCaptainLocation] = useState(null);
  const [directions, setDirections] = useState(null);

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
    if (directions) {
      const leg = directions.routes[0]?.legs[0];
      if (leg?.start_location) {
        return {
          lat: leg.start_location.lat(),
          lng: leg.start_location.lng(),
        };
      }
    }
    return null;
  }, [pickup, directions]);

  const resolvedDestination = useMemo(() => {
    if (!destination) return null;
    if (typeof destination === "object" && destination.lat && destination.lng) {
      return destination;
    }
    if (directions) {
      const leg = directions.routes[0]?.legs[0];
      if (leg?.end_location) {
        return {
          lat: leg.end_location.lat(),
          lng: leg.end_location.lng(),
        };
      }
    }
    return null;
  }, [destination, directions]);

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

    // ONGOING → Captain to Destination
    if (status === "ongoing" && captainLocation && destination) {
      return {
        origin: captainLocation,
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

    console.log("[LiveTracking] Fetching directions:", {
      origin: routeInfo.origin,
      destination: routeInfo.destination,
    });

    const service = new window.google.maps.DirectionsService();

    service.route(
      {
        origin: routeInfo.origin,
        destination: routeInfo.destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") {
          console.log("[LiveTracking] Directions OK — rendering route");
          setDirections(result);

          if (mapRef.current) {
            const bounds = new window.google.maps.LatLngBounds();
            result.routes[0].overview_path.forEach((point) =>
              bounds.extend(point)
            );
            mapRef.current.fitBounds(bounds, {
              top: 60,
              bottom: 200,
              left: 40,
              right: 40,
            });
          }
        } else {
          console.warn(
            "[LiveTracking] Directions failed:",
            status,
            "- falling back to straight polyline"
          );
          // Clear stale directions so fallback polyline renders
          setDirections(null);
        }
      }
    );
  }, [isLoaded, routeInfo.showRoute, originKey, destinationKey]);

  // ===============================
  // 📐 Fit bounds to markers (Fallback when directions is not loaded yet/fails)
  // ===============================
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
    if (!resolvedPickup || !resolvedDestination) return;
    // Only fit bounds when we don't have directions (directions handler fits its own bounds)
    if (directions) return;

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
    directions,
  ]);

  // ===============================
  // 📍 Map Center Fallback
  // ===============================
  const mapCenter =
    captainLocation || userLocation || pickup || destination;

  if (!isLoaded) return <div>Loading Map...</div>;

  return (
    <div style={{ width: "100%", height: "100%" }}>
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

        {/* Route Line — Directions API result */}
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{ suppressMarkers: true }}
          />
        )}

        {/* Fallback Polyline — when Directions API fails but we have endpoints */}
        {!directions && routeInfo.showRoute && routeInfo.origin && routeInfo.destination && (
          <Polyline
            path={[routeInfo.origin, routeInfo.destination]}
            options={{
              strokeColor: "#4285F4",
              strokeOpacity: 0.8,
              strokeWeight: 4,
              geodesic: true,
            }}
          />
        )}
        
      </GoogleMap>
    </div>
  );
}
