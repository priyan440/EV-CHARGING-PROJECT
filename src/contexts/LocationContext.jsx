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
  const latNum1 = parseFloat(lat1);
  const lonNum1 = parseFloat(lon1);
  const latNum2 = parseFloat(lat2);
  const lonNum2 = parseFloat(lon2);
  if (isNaN(latNum1) || isNaN(lonNum1) || isNaN(latNum2) || isNaN(lonNum2)) return null;

  const R = 6371; // Earth radius in km
  const dLat = ((latNum2 - latNum1) * Math.PI) / 180;
  const dLon = ((lonNum2 - lonNum1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((latNum1 * Math.PI) / 180) *
      Math.cos((latNum2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

export function LocationProvider({ children }) {
  const [currentLocation, setCurrentLocation] = useState(() => {
    try {
      const saved = localStorage.getItem("ev_user_location");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.isGps || parsed?.isManual) return parsed;
      }
    } catch {
      // ignore
    }
    return {
      isGps: false,
      isManual: false,
      city: null,
      state: null,
      latitude: null,
      longitude: null,
    };
  });

  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    if (currentLocation?.isGps || currentLocation?.isManual) {
      localStorage.setItem("ev_user_location", JSON.stringify(currentLocation));
    }
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
        setCurrentLocation({
          latitude,
          longitude,
          city: "GPS Location",
          address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          isGps: true,
          isManual: false,
        });
        setIsLocating(false);
      },
      (error) => {
        setLocationError("Location permission denied or unavailable.");
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
      latitude: parseFloat(locationData.latitude) || null,
      longitude: parseFloat(locationData.longitude) || null,
      isGps: false,
      isManual: true,
    });
  };

  const getDistanceToStation = (station) => {
    if (!currentLocation?.latitude || !currentLocation?.longitude) {
      return null;
    }
    if (!currentLocation?.isGps && !currentLocation?.isManual) {
      return null;
    }
    if (!station || !station.latitude || !station.longitude) {
      return null;
    }
    return calculateHaversineDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      station.latitude,
      station.longitude
    );
  };

  const estimateTravelTimeMinutes = (distanceKm) => {
    if (distanceKm == null || isNaN(distanceKm)) return null;
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
