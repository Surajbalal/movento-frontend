import { useEffect, useState, useMemo, useContext } from "react";
import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  useJsApiLoader,
} from "@react-google-maps/api";
import { CaptainDataContext } from "../Context/CaptainContext";

const containerStyle = {
  width: "100%",
  height: "100%",
};

export default function LiveTracking({ rideData = null, isCaptain = true }) {
  const { captain } = useContext(CaptainDataContext);

  const [heading, setHeading] = useState(0);
  const [compassEnabled, setCompassEnabled] = useState(false);

  const [currentLocation, setCurrentLocation] = useState(null);
  const [homeLocation, setHomeLocation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [geoError, setGeoError] = useState(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API,
  });

  // -----------------------------
  // 📍 Extract Pickup & Destination
  // -----------------------------
  const pickup = useMemo(() => {
    if (rideData?.pickup?.location?.coordinates) {
      return {
        lat: Number(rideData.pickup.location.coordinates[1]),
        lng: Number(rideData.pickup.location.coordinates[0]),
      };
    }
    return homeLocation;
  }, [rideData, homeLocation]);

  const destination = useMemo(() => {
    if (rideData?.destination?.location?.coordinates) {
      return {
        lat: Number(rideData.destination.location.coordinates[1]),
        lng: Number(rideData.destination.location.coordinates[0]),
      };
    }
    return null;
  }, [rideData]);

  // -----------------------------
  // 🧠 Route Logic
  // Get route info based on role and status
  const routeInfo = useMemo(() => {
    if (!rideData) return { origin: null, destination: null, showRoute: false };

    const status = rideData.status;
    console.log('🚗 Ride Status:', status);

    // Captain: Current → Pickup
    if (isCaptain && (status === 'accepted' || status === 'confirmed') && currentLocation && pickup) {
      console.log('🚗 Captain → Pickup');
      return {
        origin: currentLocation,
        destination: pickup,
        showRoute: true,
        routeType: 'captain_to_pickup'
      };
    }

    // Captain: Pickup → Destination (after OTP)
    if (isCaptain && (status === 'started' || status === 'ongoing') && pickup && destination) {
      console.log('🚙 Pickup → Destination');
      return {
        origin: pickup,
        destination: destination,
        showRoute: true,
        routeType: 'pickup_to_destination'
      };
    }

    // User: Current → Destination
    if (!isCaptain && (status === 'started' || status === 'ongoing') && currentLocation && destination) {
      console.log('👤 User → Destination');
      return {
        origin: currentLocation,
        destination: destination,
        showRoute: true,
        routeType: 'user_to_destination'
      };
    }

    return { origin: null, destination: null, showRoute: false };
  }, [rideData, currentLocation, isCaptain]);

  // -----------------------------
  // 🧭 Get Initial Location
  // -----------------------------
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setHomeLocation(coords);
        setCurrentLocation(coords);
        setGeoError(null);
      },
      (err) => {
        setGeoError(err.message);
      }
    );
  }, []);

  // -----------------------------
  // 📡 Live Location Tracking (ONLY ONE WATCH)
  // -----------------------------
  useEffect(() => {
    if (!rideData) return;

    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCurrentLocation(coords);
      },
      (err) => {
        console.log("Location error:", err.message);
      },
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [rideData]);

  // -----------------------------
  // 🗺️ Fetch Directions
  // -----------------------------
  useEffect(() => {
    if (!isLoaded || !routeInfo.showRoute) return;

    setDirections(null);
    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: routeInfo.origin,
        destination: routeInfo.destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") {
          setDirections(result);
        } else {
          console.log("Directions failed:", status);
        }
      }
    );
  }, [routeInfo, isLoaded]);

  // -----------------------------
  // 🧭 Compass
  // -----------------------------
  const enableCompass = () => {
    setCompassEnabled(true);

    window.addEventListener("deviceorientationabsolute", (e) => {
      if (e.alpha !== null) {
        setHeading(360 - e.alpha);
      }
    });
  };

  const markerIcon = useMemo(() => {
    if (!isLoaded || !window.google) return undefined;

    return {
      path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 6,
      fillColor: "#4285F4",
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: "#fff",
      rotation: heading,
    };
  }, [heading, isLoaded]);

  // -----------------------------
  // 🌍 Open in Google Maps
  // -----------------------------
  const openInGoogleMaps = () => {
    if (!routeInfo.showRoute) return;

    const url = `https://www.google.com/maps/dir/?api=1&origin=${routeInfo.origin.lat},${routeInfo.origin.lng}&destination=${routeInfo.destination.lat},${routeInfo.destination.lng}&travelmode=driving`;
    window.open(url, "_blank");
  };

  // -----------------------------
  // 🧾 Loading State
  // -----------------------------
  if (!isLoaded || !currentLocation) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        {geoError ? geoError : "Loading Map..."}
      </div>
    );
  }

  const mapCenter =
    routeInfo.origin || currentLocation || pickup;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={16}
        options={{ disableDefaultUI: true }}
      >
        {/* Captain */}
        {isCaptain && currentLocation && (
          <Marker position={currentLocation} icon={markerIcon} />
        )}

        {/* User */}
        {!isCaptain && currentLocation && (
          <Marker 
            position={currentLocation} 
            label="👤"
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#34A853",
              fillOpacity: 0.8,
              strokeWeight: 2,
              strokeColor: "#ffffff",
            }}
          />
        )}

        {/* Pickup */}
        {pickup && <Marker position={pickup} label="P" />}

        {/* Destination */}
        {destination && <Marker position={destination} label="D" />}

        {/* Directions */}
        {directions && (
          <DirectionsRenderer
            options={{ directions, suppressMarkers: true }}
          />
        )}
      </GoogleMap>

      {/* Compass Button */}
      {!compassEnabled && (
        <button
          onClick={enableCompass}
          style={{
            position: "absolute",
            bottom: "80px",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          🧭 Enable Compass
        </button>
      )}

      {/* Google Maps Button */}
      {routeInfo.showRoute && (
        <button
          onClick={openInGoogleMaps}
          style={{
            position: "absolute",
            bottom: "30px",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          Open in Google Maps
        </button>
      )}
    </div>
  );
}
