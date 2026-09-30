import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { Zap, Navigation, Globe, Filter, RefreshCw, Layers, Check, Search } from "lucide-react";
import { stationService } from "../services/stationService";
import { createEVMarkerIcon } from "./ChargingStationMarker";
import StationPopup from "./StationPopup";
import { useTheme } from "../contexts/ThemeContext";

// Fix default Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Basemap Tile Layers
const BASEMAPS = {
  standard: {
    name: "Standard Light",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  dark: {
    name: "CartoDB Dark Matter",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
  },
  humanitarian: {
    name: "Clean Street",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
};

const DEFAULT_CENTER = [13.0827, 80.2707]; // Chennai default center
const DEFAULT_ZOOM = 11;

function MapViewController({ targetCenter, targetZoom }) {
  const map = useMap();
  useEffect(() => {
    if (targetCenter && targetCenter[0] && targetCenter[1]) {
      try {
        map.flyTo(targetCenter, targetZoom || 12, { duration: 1.2 });
      } catch {}
    }
  }, [targetCenter, targetZoom, map]);
  return null;
}

export default function EVMap({
  initialCenter = null,
  initialZoom = null,
  onSelectStation = null,
}) {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNetwork, setSelectedNetwork] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [userLocation, setUserLocation] = useState(null);
  const [targetCenter, setTargetCenter] = useState(initialCenter || DEFAULT_CENTER);
  const [targetZoom, setTargetZoom] = useState(initialZoom || DEFAULT_ZOOM);

  // Load database map stations
  const loadStations = async () => {
    setLoading(true);
    try {
      const res = await stationService.getMapStations();
      if (res?.success && Array.isArray(res.data)) {
        setStations(res.data);
      }
    } catch (err) {
      console.warn("Failed to load map stations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStations();
  }, []);

  // Geolocation
  useEffect(() => {
    if (navigator.geolocation && !initialCenter) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation({ latitude: coords[0], longitude: coords[1] });
          setTargetCenter(coords);
          setTargetZoom(12);
        },
        () => {},
        { timeout: 5000 }
      );
    }
  }, [initialCenter]);

  // Extract distinct networks from database stations
  const availableNetworks = useMemo(() => {
    const set = new Set();
    stations.forEach((s) => {
      const net = s.networkName || s.operator;
      if (net) set.add(net);
    });
    return ["ALL", ...Array.from(set)];
  }, [stations]);

  // Filtered stations based on Network, Status, and Search
  const filteredStations = useMemo(() => {
    return stations.filter((st) => {
      // Network filter
      if (selectedNetwork !== "ALL") {
        const net = st.networkName || st.operator || "";
        if (net.toLowerCase() !== selectedNetwork.toLowerCase()) return false;
      }
      // Status filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "AVAILABLE" && st.status !== "AVAILABLE" && (st.availableBays || 0) === 0) return false;
        if (statusFilter === "DC_FAST" && !st.chargingTypes?.includes("DC Fast")) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (st.stationName || st.name || "").toLowerCase().includes(q);
        const matchCity = (st.city || "").toLowerCase().includes(q);
        const matchNetwork = (st.networkName || "").toLowerCase().includes(q);
        const matchAddress = (st.address || "").toLowerCase().includes(q);
        if (!matchName && !matchCity && !matchNetwork && !matchAddress) return false;
      }
      return true;
    });
  }, [stations, selectedNetwork, statusFilter, searchQuery]);

  const handleBookStation = (st) => {
    const stationId = st.id || st.stationId || "";
    navigate(`/customer/book?stationId=${encodeURIComponent(stationId)}`);
  };

  const handleViewDetails = (st) => {
    if (onSelectStation) {
      onSelectStation(st);
    } else {
      navigate(`/customer/stations/${st.id || st.stationId}`);
    }
  };

  // Determine base tile layer based on active theme
  const activeTile = isDark ? BASEMAPS.dark : BASEMAPS.standard;

  return (
    <div className="relative w-full h-full min-h-[550px] rounded-3xl overflow-hidden font-sans border border-[var(--border-subtle)] shadow-xl bg-[var(--bg-surface)]">
      {/* Top Floating Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Search & Network Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto bg-[var(--bg-surface)]/90 backdrop-blur-md p-2 rounded-2xl border border-[var(--border-subtle)] shadow-lg">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search map stations, cities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-xl pl-8 pr-3 py-1.5 w-44 sm:w-60 focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </div>

          {/* Network Selector Dropdown */}
          <div className="flex items-center gap-1">
            <Filter size={13} className="text-[var(--text-muted)] ml-1" />
            <select
              value={selectedNetwork}
              onChange={(e) => setSelectedNetwork(e.target.value)}
              className="bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[var(--accent-primary)] cursor-pointer"
            >
              {availableNetworks.map((net) => (
                <option key={net} value={net}>
                  {net === "ALL" ? "All Networks" : net}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Live Marker Counter & Reload */}
        <div className="flex items-center gap-2 pointer-events-auto bg-[var(--bg-surface)]/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-[var(--border-subtle)] shadow-lg">
          <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{filteredStations.length} Live Stations</span>
          </span>
          <button
            onClick={loadStations}
            disabled={loading}
            className="p-1.5 rounded-lg bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
            title="Reload stations from database"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Map Canvas */}
      <MapContainer
        center={targetCenter}
        zoom={targetZoom}
        style={{ width: "100%", height: "100%", minHeight: "550px" }}
        scrollWheelZoom={true}
      >
        <MapViewController targetCenter={targetCenter} targetZoom={targetZoom} />

        <TileLayer
          key={activeTile.url}
          url={activeTile.url}
          attribution={activeTile.attribution}
          maxZoom={activeTile.maxZoom}
        />

        {/* Markers from Database */}
        {filteredStations.map((st) => {
          const lat = parseFloat(st.latitude || st.lat);
          const lng = parseFloat(st.longitude || st.lng);
          if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;

          return (
            <Marker key={st.id || st.stationId} position={[lat, lng]} icon={createEVMarkerIcon(st)}>
              <Popup autoPan={true} closeButton={true}>
                <StationPopup
                  station={st}
                  userLocation={userLocation}
                  onBook={handleBookStation}
                  onViewDetails={handleViewDetails}
                />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Bottom Status Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-[var(--bg-surface)]/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-[var(--border-subtle)] shadow-lg text-[11px] font-semibold flex items-center gap-3">
        <span className="text-[var(--text-muted)] uppercase tracking-wider font-mono text-[10px]">Legend:</span>
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Available
        </span>
        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Limited
        </span>
        <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Occupied
        </span>
        <span className="flex items-center gap-1 text-slate-500">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> Maintenance
        </span>
      </div>
    </div>
  );
}
