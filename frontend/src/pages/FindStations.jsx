import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  MapPin,
  Zap,
  Star,
  Navigation,
  Compass,
  RefreshCw,
  List,
  Map as MapIcon,
  X,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  ChevronDown,
  Clock,
  Sparkles,
  Layers,
  ArrowUpDown,
} from "lucide-react";
import { stationService } from "../services/stationService";
import { useLocation } from "../contexts/LocationContext";
import EVMap from "../components/EVMap";

const CONNECTOR_OPTIONS = ["All Connectors", "CCS2", "Type 2", "CHAdeMO", "GB/T"];

const QUICK_FILTERS = [
  { id: "ALL", label: "All Stations" },
  { id: "FAST_50", label: "⚡ 50kW+ Fast" },
  { id: "AVAILABLE", label: "🔌 Available Now" },
  { id: "DC_FAST", label: "⚡ DC Fast" },
  { id: "AC_CHARGING", label: "🌱 AC Standard" },
  { id: "OPEN_24X7", label: "⏰ 24x7 Open" },
];

export default function FindStations() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryFromUrl = searchParams.get("search") || "";

  const { currentLocation, getDistanceToStation } = useLocation();

  const [dbStations, setDbStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(queryFromUrl);
  const [selectedNetwork, setSelectedNetwork] = useState("All Networks");
  const [selectedConnector, setSelectedConnector] = useState("All Connectors");
  const [quickFilter, setQuickFilter] = useState("ALL");
  const [maxPrice, setMaxPrice] = useState(30);
  const [sortBy, setSortBy] = useState("nearest"); // 'nearest' | 'price' | 'availability' | 'power' | 'rating'
  const [viewMode, setViewMode] = useState("split"); // 'split' | 'list' | 'map'
  const [selectedStation, setSelectedStation] = useState(null);

  const fetchStations = async () => {
    setLoading(true);
    try {
      const res = await stationService.getApprovedStations();
      if (res?.success && Array.isArray(res.data)) {
        setDbStations(res.data);
      }
    } catch (err) {
      console.warn("Failed to load approved stations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  // Distinct networks from database stations
  const networkOptions = useMemo(() => {
    const set = new Set();
    dbStations.forEach((s) => {
      const net = s.networkName || s.operator;
      if (net) set.add(net);
    });
    return ["All Networks", ...Array.from(set)];
  }, [dbStations]);

  // Filter logic
  const filteredStations = useMemo(() => {
    return dbStations.filter((st) => {
      // Network filter
      if (selectedNetwork !== "All Networks") {
        const net = st.networkName || st.operator || "";
        if (net.toLowerCase() !== selectedNetwork.toLowerCase()) return false;
      }

      // Connector filter
      if (selectedConnector !== "All Connectors") {
        const connectors = st.connectors || st.chargers || [];
        const hasConnector = connectors.some((c) =>
          (c.connectorType || c.connector || "").toLowerCase().includes(selectedConnector.toLowerCase())
        );
        if (!hasConnector) return false;
      }

      // Quick filter
      if (quickFilter === "FAST_50") {
        const power = parseFloat(st.maxPower || st.maximumPower || 0);
        if (power < 50 && !st.isFast) return false;
      } else if (quickFilter === "AVAILABLE") {
        if ((st.availableSlots ?? st.availableBays ?? 0) === 0) return false;
      } else if (quickFilter === "DC_FAST") {
        const connectors = st.connectors || st.chargers || [];
        const hasDC = connectors.some((c) => (c.chargerType || c.type || "").toUpperCase().includes("DC"));
        if (!hasDC && !st.isFast) return false;
      } else if (quickFilter === "AC_CHARGING") {
        const connectors = st.connectors || st.chargers || [];
        const hasAC = connectors.some((c) => (c.chargerType || c.type || "").toUpperCase().includes("AC"));
        if (!hasAC) return false;
      } else if (quickFilter === "OPEN_24X7") {
        if (!st.is24x7 && !st.openingHours?.includes("24")) return false;
      }

      // Price filter
      const price = parseFloat(st.pricePerKwh || st.chargingPrice || 18);
      if (price > maxPrice) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = (st.stationName || st.name || "").toLowerCase().includes(q);
        const matchCity = (st.city || "").toLowerCase().includes(q);
        const matchAddress = (st.address || "").toLowerCase().includes(q);
        const matchPincode = (st.pincode || "").toLowerCase().includes(q);
        const matchNetwork = (st.networkName || st.operator || "").toLowerCase().includes(q);
        const matchId = (st.stationId || String(st.id) || "").toLowerCase().includes(q);
        if (!matchName && !matchCity && !matchAddress && !matchPincode && !matchNetwork && !matchId) {
          return false;
        }
      }

      return true;
    });
  }, [dbStations, selectedNetwork, selectedConnector, quickFilter, maxPrice, searchTerm]);

  // Sort logic
  const sortedStations = useMemo(() => {
    const list = [...filteredStations];
    if (sortBy === "nearest") {
      list.sort((a, b) => {
        const distA = getDistanceToStation ? parseFloat(getDistanceToStation(a) || 999) : 0;
        const distB = getDistanceToStation ? parseFloat(getDistanceToStation(b) || 999) : 0;
        return distA - distB;
      });
    } else if (sortBy === "price") {
      list.sort((a, b) => parseFloat(a.pricePerKwh || 18) - parseFloat(b.pricePerKwh || 18));
    } else if (sortBy === "availability") {
      list.sort((a, b) => (b.availableSlots ?? b.availableBays ?? 0) - (a.availableSlots ?? a.availableBays ?? 0));
    } else if (sortBy === "power") {
      list.sort((a, b) => parseFloat(b.maxPower || b.maximumPower || 0) - parseFloat(a.maxPower || a.maximumPower || 0));
    } else if (sortBy === "rating") {
      list.sort((a, b) => parseFloat(b.rating || 4.8) - parseFloat(a.rating || 4.8));
    }
    return list;
  }, [filteredStations, sortBy, getDistanceToStation]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto font-sans pb-10">
      {/* Top Hero Banner */}
      <div className="theme-card p-6 md:p-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold border border-emerald-500/20 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                DATABASE-DRIVEN NETWORK
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-mono font-bold border border-blue-500/20">
                {sortedStations.length} APPROVED STATIONS
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
              <MapPin size={28} className="text-[var(--accent-primary)]" />
              Find EV Charging Stations
            </h1>
            <p className="text-xs md:text-sm text-[var(--text-muted)] mt-1">
              Discover real verified EV chargers, check live bay availability, dynamic power limits, and reserve instantly.
            </p>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 p-1 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-2xl shrink-0">
            <button
              onClick={() => setViewMode("split")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === "split"
                  ? "bg-[var(--accent-primary)] text-white shadow-md shadow-blue-500/20"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Layers size={14} />
              <span>Split View</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === "list"
                  ? "bg-[var(--accent-primary)] text-white shadow-md shadow-blue-500/20"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <List size={14} />
              <span>Cards List</span>
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === "map"
                  ? "bg-[var(--accent-primary)] text-white shadow-md shadow-blue-500/20"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <MapIcon size={14} />
              <span>Full Map</span>
            </button>
          </div>
        </div>

        {/* Search & Filters Controls */}
        <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Main Search Input */}
          <div className="md:col-span-4 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search station, network, city, or pincode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-[var(--accent-primary)] transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Network Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedNetwork}
              onChange={(e) => setSelectedNetwork(e.target.value)}
              className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--accent-primary)] cursor-pointer"
            >
              {networkOptions.map((net) => (
                <option key={net} value={net}>
                  {net}
                </option>
              ))}
            </select>
          </div>

          {/* Connector Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedConnector}
              onChange={(e) => setSelectedConnector(e.target.value)}
              className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--accent-primary)] cursor-pointer"
            >
              {CONNECTOR_OPTIONS.map((conn) => (
                <option key={conn} value={conn}>
                  {conn}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-1.5 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-2.5 py-1.5">
              <ArrowUpDown size={14} className="text-[var(--text-muted)] shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-transparent text-[var(--text-primary)] text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="nearest">Nearest</option>
                <option value="availability">Available Bays</option>
                <option value="price">Lowest Price</option>
                <option value="power">Highest Power</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-[var(--border-subtle)]">
          <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider font-semibold mr-1">
            Filter:
          </span>
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setQuickFilter(f.id)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                quickFilter === f.id
                  ? "bg-[var(--accent-primary)] text-white shadow-sm"
                  : "bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={fetchStations}
            disabled={loading}
            className="ml-auto p-1.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      {viewMode === "map" ? (
        <div className="h-[650px] w-full rounded-3xl overflow-hidden border border-[var(--border-subtle)] shadow-xl">
          <EVMap />
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${viewMode === "split" ? "lg:grid-cols-12 gap-6" : "gap-4"}`}>
          {/* Station Cards Column */}
          <div className={viewMode === "split" ? "lg:col-span-6 space-y-4" : "space-y-4"}>
            {loading ? (
              // Loading Skeleton
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="theme-card p-5 animate-pulse space-y-3">
                    <div className="h-5 bg-[var(--border-subtle)] rounded-lg w-1/3"></div>
                    <div className="h-4 bg-[var(--border-subtle)] rounded-lg w-2/3"></div>
                    <div className="h-10 bg-[var(--border-subtle)] rounded-xl"></div>
                  </div>
                ))}
              </div>
            ) : sortedStations.length === 0 ? (
              // Empty State
              <div className="theme-card p-10 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-[var(--accent-primary)] flex items-center justify-center mx-auto">
                  <MapPin size={28} />
                </div>
                <h3 className="font-bold text-lg text-[var(--text-primary)]">No Charging Stations Found</h3>
                <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
                  No registered stations match your current filters. Try changing your search query or reset filters.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedNetwork("All Networks");
                    setSelectedConnector("All Connectors");
                    setQuickFilter("ALL");
                  }}
                  className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-bold transition shadow-md cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              // Station Cards Grid
              <div className={viewMode === "list" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
                {sortedStations.map((st) => {
                  const availableBays = parseInt(st.availableSlots ?? st.availableBays ?? 0, 10);
                  const totalBays = parseInt(st.totalSlots ?? st.totalBays ?? 4, 10);
                  const isAvailable = availableBays > 0;
                  const distance = getDistanceToStation ? getDistanceToStation(st) : null;
                  const networkName = st.networkName || st.operator || "GreenCharge";

                  return (
                    <div
                      key={st.id || st.stationId}
                      className="theme-card p-5 hover:border-[var(--accent-primary)]/50 transition-all duration-200 group flex flex-col justify-between gap-4"
                    >
                      <div>
                        {/* Top Meta Bar */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-mono font-bold uppercase tracking-wider border border-blue-500/20">
                            {networkName}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border flex items-center gap-1 ${
                              isAvailable
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                            {isAvailable ? `${availableBays} / ${totalBays} Available` : "Full"}
                          </span>
                        </div>

                        {/* Station Name & Address */}
                        <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition truncate">
                          {st.stationName || st.name}
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] line-clamp-1 mt-0.5">
                          📍 {st.address || `${st.city}, ${st.state || "Tamil Nadu"}`}
                        </p>

                        {/* Spec Pills */}
                        <div className="grid grid-cols-3 gap-2 mt-3 p-2.5 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-center text-xs">
                          <div>
                            <span className="block text-[9px] uppercase font-mono text-[var(--text-muted)]">Power</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              {st.maxPower ? `${st.maxPower} kW` : "120 kW"}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9px] uppercase font-mono text-[var(--text-muted)]">Tariff</span>
                            <span className="font-bold text-[var(--text-primary)]">
                              ₹{st.pricePerKwh || 18} <span className="text-[9px] font-normal">/kWh</span>
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9px] uppercase font-mono text-[var(--text-muted)]">Distance</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {distance ? `${distance} km` : `${st.city || "Tamil Nadu"}`}
                            </span>
                          </div>
                        </div>

                        {/* Amenities Tags */}
                        {st.amenities && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {(Array.isArray(st.amenities) ? st.amenities : [st.amenities]).slice(0, 3).map((a, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-secondary)] font-medium"
                              >
                                {a}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-3 border-t border-[var(--border-subtle)]">
                        <button
                          onClick={() => navigate(`/customer/stations/${st.id || st.stationId}`)}
                          className="flex-1 py-2 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] font-bold text-xs border border-[var(--border-subtle)] transition cursor-pointer"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => navigate(`/customer/book?stationId=${st.id || st.stationId}`)}
                          className="flex-1 py-2 rounded-xl bg-[var(--accent-primary)] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Zap size={14} className="fill-white" />
                          <span>Book Bay</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Interactive Map Column (in Split View) */}
          {viewMode === "split" && (
            <div className="lg:col-span-6 h-[720px] sticky top-24 rounded-3xl overflow-hidden border border-[var(--border-subtle)] shadow-xl">
              <EVMap />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
