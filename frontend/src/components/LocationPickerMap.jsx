import React, { useState, useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Search, Loader2 } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

// Fix default leaflet marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapRecenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPickerMap({
  latitude,
  longitude,
  onLocationChange,
}) {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const markerRef = useRef(null);

  const lat = parseFloat(latitude) || 13.0827;
  const lng = parseFloat(longitude) || 80.2707;

  // Reverse geocode lat/lng to human address
  const reverseGeocode = async (targetLat, targetLng) => {
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${targetLat}&lon=${targetLng}&addressdetails=1`,
        { headers: { "User-Agent": "VoltChargeEVPlatform/2.0" } }
      );
      const data = await res.json();
      if (data && data.display_name) {
        onLocationChange(targetLat, targetLng, data.display_name, data.address);
      } else {
        onLocationChange(targetLat, targetLng);
      }
    } catch {
      onLocationChange(targetLat, targetLng);
    } finally {
      setGeocoding(false);
    }
  };

  const handleMapClick = (newLat, newLng) => {
    const cleanLat = parseFloat(newLat.toFixed(6));
    const cleanLng = parseFloat(newLng.toFixed(6));
    reverseGeocode(cleanLat, cleanLng);
  };

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          const cleanLat = parseFloat(newPos.lat.toFixed(6));
          const cleanLng = parseFloat(newPos.lng.toFixed(6));
          reverseGeocode(cleanLat, cleanLng);
        }
      },
    }),
    []
  );

  const handleSearchAddress = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim()
        )}&countrycodes=in&limit=1`,
        { headers: { "User-Agent": "VoltChargeEVPlatform/2.0" } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const foundLat = parseFloat(parseFloat(data[0].lat).toFixed(6));
        const foundLng = parseFloat(parseFloat(data[0].lon).toFixed(6));
        onLocationChange(foundLat, foundLng, data[0].display_name);
      } else {
        alert("Location not found. Click directly on the map to pinpoint.");
      }
    } catch {
      alert("Address search failed. Please click directly on the map.");
    } finally {
      setSearching(false);
    }
  };

  const mapApiKey = import.meta.env.VITE_MAP_API_KEY || import.meta.env.VITE_CARTO_API_KEY || "";
  const tileUrl = isDark && mapApiKey
    ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?api_key=${mapApiKey}`
    : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <div className="space-y-2">
      {/* Location Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search address, landmark, or city (e.g. Vadapalani Chennai)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchAddress(e)}
            className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:border-[var(--accent-primary)]"
          />
        </div>
        <button
          type="button"
          onClick={handleSearchAddress}
          disabled={searching}
          className="px-3 py-2 bg-[var(--accent-primary)] text-white text-xs font-bold rounded-xl cursor-pointer hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
        >
          {searching ? <Loader2 size={13} className="animate-spin" /> : "Locate"}
        </button>
      </div>

      {/* Interactive Leaflet Map */}
      <div className="h-60 w-full rounded-2xl overflow-hidden border border-[var(--border-subtle)] relative">
        <MapContainer
          key={`${lat}-${lng}`}
          center={[lat, lng]}
          zoom={14}
          style={{ width: "100%", height: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            key={`${tileUrl}_${isDark ? "dark" : "light"}`}
            url={tileUrl}
            className={isDark && !mapApiKey ? "map-tiles-dark" : ""}
          />
          <MapRecenter lat={lat} lng={lng} />
          <MapClickHandler onLocationSelect={handleMapClick} />
          <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={[lat, lng]}
            ref={markerRef}
          />
        </MapContainer>
        <div className="absolute bottom-2 left-2 z-[1000] bg-[var(--bg-surface)]/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] text-[10px] font-mono text-[var(--text-muted)] flex items-center gap-2">
          {geocoding ? (
            <span className="flex items-center gap-1 text-[var(--accent-primary)]">
              <Loader2 size={10} className="animate-spin" /> Resolving address...
            </span>
          ) : (
            <span>Drag pin or click map • Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
