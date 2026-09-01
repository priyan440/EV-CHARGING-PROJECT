import { createContext, useContext, useState, useEffect } from "react";

const LocationContext = createContext();

// Default location (Chennai / Madurai)
const DEFAULT_LOCATION = {
  city: "Chennai",
  state: "Tamil Nadu",
  address: "Anna Salai, Central Chennai",
  pincode: "600002",
  latitude: 13.0827,
  longitude: 80.2707,
  isGps: false,
};

/**
 * Haversine formula to calculate distance in km between 2 lat/lng points
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

export function LocationProvider({ children }) {
  const [currentLocation, setCurrentLocation] = useState(() => {
    const saved = localStorage.getItem("ev_user_location");
    return saved ? JSON.parse(saved) : DEFAULT_LOCATION;
  });

  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    localStorage.setItem("ev_user_location", JSON.stringify(currentLocation));
  }, [currentLocation]);

  const detectLocation = () => {
    setIsLocating(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation((prev) => ({
          ...prev,
          latitude,
          longitude,
          city: "GPS Location",
          address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          isGps: true,
        }));
        setIsLocating(false);
      },
      (error) => {
        setLocationError("Location permission denied or unavailable. Using manual location.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const setManualLocation = (locationData) => {
    setCurrentLocation({
      city: locationData.city || "Custom Location",
      state: locationData.state || "Tamil Nadu",
      address: locationData.address || `${locationData.city}`,
      pincode: locationData.pincode || "600001",
      latitude: locationData.latitude || 13.0827,
      longitude: locationData.longitude || 80.2707,
      isGps: false,
    });
  };

  const getDistanceToStation = (station) => {
    if (!station || !station.latitude || !station.longitude) return 0;
    return calculateHaversineDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      station.latitude,
      station.longitude
    );
  };

  const estimateTravelTimeMinutes = (distanceKm) => {
    // Average urban speed ~ 25 km/h -> 2.4 min per km
    return Math.max(3, Math.round(distanceKm * 2.4));
  };

  return (
    <LocationContext.Provider
      value={{
        currentLocation,
        isLocating,
        locationError,
        detectLocation,
        setManualLocation,
        getDistanceToStation,
        estimateTravelTimeMinutes,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}
