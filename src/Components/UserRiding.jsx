import { useEffect, useState } from "react";
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

export default function UserRiding({ rideData }) {
  const [heading, setHeading] = useState(0);
  const [compassEnabled, setCompassEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [geoError, setGeoError] = useState(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API,
  });

  // Get locations from ride data
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

  // Route logic for user
  const routeInfo = useMemo(() => {
    if (!rideData) return { origin: null, destination: null, showRoute: false };

    const status = rideData.status;
    console.log('👤 User Ride Status:', status);

    // User: Current → Destination
    if ((status === 'started' || status === 'ongoing') && currentLocation && destination) {
      console.log('👤 User → Destination');
      return {
        origin: currentLocation,
        destination: destination,
        showRoute: true,
        routeType: 'user_to_destination'
      };
    }

    return { origin: null, destination: null, showRoute: false };
  }, [rideData, currentLocation, destination]);

  // Get initial location
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
        setCurrentLocation(coords);
        setGeoError(null);
      },
      (err) => {
        setGeoError(err.message);
      }
    );
  }, []);

  // Track location during ride
  useEffect(() => {
    if (!rideData) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCurrentLocation(coords);
        console.log('📍 User location updated:', coords);
      },
      (err) => {
        console.log('Location error:', err.message);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [rideData]);

  // Update directions
  useEffect(() => {
    if (!routeInfo.showRoute || !isLoaded) return;

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
          console.log('✅ User directions loaded:', result);
        } else {
          console.log('❌ Directions failed:', status);
        }
      }
    );
  }, [routeInfo, isLoaded]);

  // Compass
  const enableCompass = () => {
    setCompassEnabled(true);
    window.addEventListener("deviceorientationabsolute", (e) => {
      if (e.alpha !== null) {
        setHeading(360 - e.alpha);
      }
    });
  };

  const openInGoogleMaps = () => {
    if (routeInfo.origin && routeInfo.destination) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${routeInfo.origin.lat},${routeInfo.origin.lng}&destination=${routeInfo.destination.lat},${routeInfo.destination.lng}&travelmode=driving`;
      window.open(url, "_blank");
    }
  };

  if (!isLoaded || !currentLocation) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        {geoError ? geoError : "Loading Map..."}
      </div>
    );
  }

  const mapCenter = routeInfo.origin || currentLocation || destination;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={16}
        options={{ disableDefaultUI: false, zoomControl: true }}
      >
        {/* User's current location */}
        {currentLocation && (
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

        {/* Pickup location */}
        {pickup && (
          <Marker 
            position={pickup} 
            label="P"
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#FF6B6B",
              fillOpacity: 0.8,
              strokeWeight: 2,
              strokeColor: "#ffffff",
            }}
          />
        )}

        {/* Destination */}
        {destination && (
          <Marker 
            position={destination} 
            label="D"
            icon={{
              path: window.google.maps.SymbolPath.FLAG,
              scale: 8,
              fillColor: "#EA4335",
              fillOpacity: 0.8,
              strokeWeight: 2,
              strokeColor: "#ffffff",
            }}
          />
        )}

        {/* Directions */}
        {directions && (
          <DirectionsRenderer 
            options={{ directions, suppressMarkers: true }} 
          />
        )}
      </GoogleMap>

      {/* Status Indicator */}
      {rideData && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            right: "20px",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            padding: "12px",
            borderRadius: "8px",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: 
                routeInfo.routeType === 'user_to_destination' ? '#34A853' :
                '#EA4335'
            }} />
            <span style={{ fontSize: "14px", fontWeight: "500", color: "#333" }}>
              {routeInfo.routeType === 'user_to_destination' && '👤 Following ride'}
              {!routeInfo.routeType && '📍 Ready for rides'}
            </span>
          </div>
        </div>
      )}

      {/* Compass Button */}
      {!compassEnabled && (
        <button
          onClick={enableCompass}
          style={{
            position: "absolute",
            bottom: "80px",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "8px 16px",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            borderRadius: "20px",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
            zIndex: 10,
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
            padding: "8px 16px",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            borderRadius: "20px",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
            zIndex: 10,
          }}
        >
          Open in Google Maps
        </button>
      )}
    </div>
  );
}
