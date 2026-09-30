import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Search } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

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

  const lat = parseFloat(latitude) || 13.0827;
  const lng = parseFloat(longitude) || 80.2707;

  const handleMapClick = (newLat, newLng) => {
    onLocationChange(parseFloat(newLat.toFixed(6)), parseFloat(newLng.toFixed(6)));
  };

  const handleSearchAddress = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim()
        )}&countrycodes=in&limit=1`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const foundLat = parseFloat(data[0].lat);
        const foundLng = parseFloat(data[0].lon);
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

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <div className="space-y-2">
      {/* Location Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search address or landmark (e.g. Vadapalani Chennai)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:border-[var(--accent-primary)]"
          />
        </div>
        <button
          type="button"
          onClick={handleSearchAddress}
          disabled={searching}
          className="px-3 py-2 bg-[var(--accent-primary)] text-white text-xs font-bold rounded-xl cursor-pointer hover:opacity-90 disabled:opacity-50"
        >
          {searching ? "Searching..." : "Locate"}
        </button>
      </div>

      {/* Interactive Leaflet Map */}
      <div className="h-56 w-full rounded-2xl overflow-hidden border border-[var(--border-subtle)] relative">
        <MapContainer
          key={`${lat}-${lng}`}
          center={[lat, lng]}
          zoom={13}
          style={{ width: "100%", height: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer url={tileUrl} />
          <MapClickHandler onLocationSelect={handleMapClick} />
          <Marker position={[lat, lng]} />
        </MapContainer>
        <div className="absolute bottom-2 left-2 z-[1000] bg-[var(--bg-surface)]/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] text-[10px] font-mono text-[var(--text-muted)]">
          Click map to adjust pin • Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)}
        </div>
      </div>
    </div>
  );
}
