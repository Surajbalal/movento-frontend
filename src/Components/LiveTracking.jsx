import { useEffect, useState, useMemo, useRef } from "react";
import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  useJsApiLoader,
} from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "100%",
};

export default function LiveTracking({ rideData, isCaptain }) {
  const mapRef = useRef(null);

  const [userLocation, setUserLocation] = useState(null);
  const [captainLocation, setCaptainLocation] = useState(null);
  const [directions, setDirections] = useState(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API,
  });

  // ===============================
  // 📍 Extract Pickup & Destination
  // ===============================
  const pickup = useMemo(() => {
    if (rideData?.pickup?.location?.coordinates) {
      return {
        lat: Number(rideData.pickup.location.coordinates[1]),
        lng: Number(rideData.pickup.location.coordinates[0]),
      };
    }
    return null;
  }, [rideData]);

  const destination = useMemo(() => {
    if (rideData?.destination?.location?.coordinates) {
      return {
        lat: Number(rideData.destination.location.coordinates[1]),
        lng: Number(rideData.destination.location.coordinates[0]),
      };
    }
    return null;
  }, [rideData]);

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
  // 🧠 Route Logic
  // ===============================
  const routeInfo = useMemo(() => {
    if (!rideData) return { showRoute: false };

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

    return { showRoute: false };
  }, [rideData, captainLocation, pickup, destination]);

  // ===============================
  // 🗺️ Fetch Directions
  // ===============================
 useEffect(() => {
  if (!isLoaded) return;
  if (!routeInfo.showRoute) return;
  if (!routeInfo.origin || !routeInfo.destination) return;

  const service = new window.google.maps.DirectionsService();

  service.route(
    {
      origin: routeInfo.origin,
      destination: routeInfo.destination,
      travelMode: window.google.maps.TravelMode.DRIVING,
    },
    (result, status) => {
      if (status === "OK") {
        setDirections(result);

        if (mapRef.current) {
          const bounds = new window.google.maps.LatLngBounds();
          result.routes[0].overview_path.forEach((point) =>
            bounds.extend(point)
          );
          mapRef.current.fitBounds(bounds);
        }
      } else {
        console.log("Directions failed:", status);
      }
    }
  );
}, [
  isLoaded,
  routeInfo.origin?.lat,
  routeInfo.origin?.lng,
  routeInfo.destination?.lat,
  routeInfo.destination?.lng,
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
        {pickup && <Marker position={pickup} label="P" />}

        {/* Destination Marker */}
        {destination &&
          (!isCaptain ||
            rideData?.status === "ongoing" ||
            rideData?.status === "started") && (
            <Marker position={destination} label="D" />
          )}

        {/* Route Line */}
        {directions && (
          <DirectionsRenderer
            options={{ directions, suppressMarkers: true }}
          />
        )}
        
      </GoogleMap>
    </div>
  );
}
