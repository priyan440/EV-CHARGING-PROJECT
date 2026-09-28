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
} from "lucide-react";
import { useSystemState } from "../contexts/SystemStateContext";
import { useLocation } from "../contexts/LocationContext";
import { apiService } from "../services/apiService";
import InteractiveMap from "../components/InteractiveMap";
import EVMap from "../components/EVMap";

const INDIAN_STATES = [
  "All States",
  "Tamil Nadu",
  "Karnataka",
  "Maharashtra",
  "Delhi NCR",
  "Telangana",
  "Gujarat",
  "Kerala",
  "Andhra Pradesh",
  "West Bengal",
  "Rajasthan",
  "Uttar Pradesh",
];

const CONNECTOR_OPTIONS = ["All Connectors", "CCS2", "Type 2", "CHAdeMO", "GB/T"];

const QUICK_FILTERS = [
  { id: "ALL", label: "All Stations" },
  { id: "FAST_50", label: "⚡ Fast (50kW+)" },
  { id: "AVAILABLE", label: "🔌 Available Bays" },
  { id: "DC_FAST", label: "⚡ DC Fast" },
  { id: "AC_CHARGING", label: "🌱 AC Charging" },
];

export default function FindStations() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryFromUrl = searchParams.get("search") || "";

  const { stations: platformStations } = useSystemState();
  const { currentLocation, getDistanceToStation, detectLocation, isLocating } = useLocation();

  const [externalStations, setExternalStations] = useState([]);
  const [loadingExternal, setLoadingExternal] = useState(false);
  const [searchTerm, setSearchTerm] = useState(queryFromUrl);
  const [selectedState, setSelectedState] = useState("All States");
  const [selectedConnector, setSelectedConnector] = useState("All Connectors");
  const [quickFilter, setQuickFilter] = useState("ALL");
  const [selectedStation, setSelectedStation] = useState(null);
  const [sortBy, setSortBy] = useState("distance"); // 'distance' | 'rating'
  const [mobileView, setMobileView] = useState("list"); // 'list' | 'map'
  const [viewMode, setViewMode] = useState("split"); // 'split' | 'liveOverpass'

  // Fetch real India EV charging stations from Open Charge Map API via backend
  useEffect(() => {
    let isMounted = true;
    const loadExternalStations = async () => {
      setLoadingExternal(true);
      try {
        const data = await apiService.fetchExternalEvStations({ maxresults: 150 });
        if (isMounted && Array.isArray(data)) {
          setExternalStations(data);
        }
      } catch (e) {
        console.error("Failed to load external stations", e);
      } finally {
        if (isMounted) setLoadingExternal(false);
      }
    };

    loadExternalStations();
    return () => {
      isMounted = false;
    };
  }, []);

  // Merge platform stations with real external stations, strictly de-duplicated by stable unique ID
  const allStations = useMemo(() => {
    const seenIds = new Set();
    const list = [];
    [
      ...platformStations.map((s) => ({ ...s, isExternal: false })),
      ...externalStations,
    ].forEach((st) => {
      const stableId = String(st.id || `${st.latitude}_${st.longitude}`);
      if (!seenIds.has(stableId)) {
        seenIds.add(stableId);
        list.push(st);
      }
    });
    return list;
  }, [platformStations, externalStations]);

  // Filter logic
  const filteredStations = useMemo(() => {
    return allStations.filter((st) => {
      // State Filter
      if (selectedState !== "All States") {
        const stState = (st.state || "").toLowerCase();
        const selState = selectedState.toLowerCase();
        const inAddress = (st.address || "").toLowerCase().includes(selState);
        const inCity = (st.city || "").toLowerCase().includes(selState);
        if (!stState.includes(selState) && !inAddress && !inCity) {
          return false;
        }
      }

      // Quick Filter Chips
      if (quickFilter === "FAST_50") {
        const maxKw = Math.max(...(st.chargers || []).map((c) => c.powerKw || 0), 0);
        if (maxKw < 50 && !st.isFast) return false;
      } else if (quickFilter === "AVAILABLE") {
        if (st.isExternal) {
          if (st.status === "Non-operational" || st.status === "Offline") return false;
        } else {
          const avail = (st.chargers || []).filter((c) => c.status === "Available").length;
          if (avail === 0) return false;
        }
      } else if (quickFilter === "DC_FAST") {
        const hasDC = (st.chargers || []).some(
          (c) => (c.type || "").toUpperCase().includes("DC") || (c.type || "").toUpperCase().includes("CCS") || (c.powerKw || 0) >= 30
        );
        if (!hasDC && !st.isFast) return false;
      } else if (quickFilter === "AC_CHARGING") {
        const hasAC = (st.chargers || []).some(
          (c) => (c.type || "").toUpperCase().includes("AC") || (c.type || "").toUpperCase().includes("TYPE 2")
        );
        if (!hasAC && st.isFast) return false;
      }

      // Connector Filter
      if (selectedConnector !== "All Connectors") {
        const cTarget = selectedConnector.toUpperCase();
        const hasConnector = (st.chargers || []).some(
          (c) => (c.type || "").toUpperCase().includes(cTarget) || (c.connector || "").toUpperCase().includes(cTarget)
        );
        if (!hasConnector) return false;
      }

      // Search Filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = (st.name || "").toLowerCase().includes(q);
        const matchAddress = (st.address || "").toLowerCase().includes(q);
        const matchCity = (st.city || "").toLowerCase().includes(q);
        const matchState = (st.state || "").toLowerCase().includes(q);
        const matchOperator = (st.operator || "").toLowerCase().includes(q);
        const matchPincode = String(st.pincode || "").includes(q);
        if (!matchName && !matchAddress && !matchCity && !matchState && !matchOperator && !matchPincode) {
          return false;
        }
      }

      return true;
    });
  }, [allStations, selectedState, quickFilter, selectedConnector, searchTerm]);

  // Sort logic
  const sortedStations = useMemo(() => {
    const list = [...filteredStations];
    list.sort((a, b) => {
      if (sortBy === "distance") {
        const distA = getDistanceToStation(a);
        const distB = getDistanceToStation(b);
        if (distA == null && distB == null) return 0;
        if (distA == null) return 1;
        if (distB == null) return -1;
        return distA - distB;
      }
      if (sortBy === "rating") {
        return (b.rating || 0) - (a.rating || 0);
      }
      return 0;
    });
    return list;
  }, [filteredStations, sortBy, getDistanceToStation]);

  const handleSelectStation = (st) => {
    setSelectedStation(st);
  };

  return (
    <div className="space-y-4 font-sans text-[var(--text-primary)]">
      {/* Top Header Card */}
      <div className="bg-[var(--bg-surface)] p-5 md:p-6 rounded-3xl border border-[var(--border-subtle)] shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-mono font-bold bg-[var(--accent-light)] text-[var(--accent-primary)] px-2.5 py-0.5 rounded-full border border-[var(--accent-primary)]/30">
                INDIA EV NETWORK
              </span>
              <span className="text-xs font-mono bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                REAL-TIME POIs
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold font-grotesk tracking-tight flex items-center gap-2 text-[var(--text-primary)]">
              <MapPin size={28} className="text-[var(--accent-primary)] shrink-0" />
              Find Charging Stations
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Locate fast charging hubs across India with live bay status, verified pricing, and GPS navigation.
            </p>
          </div>

          {/* Right Action: View Mode Toggle + Use GPS + Count */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 p-1 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode("split")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === "split"
                    ? "bg-[var(--accent-primary)] text-white shadow-xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                Directory & Map
              </button>
              <button
                type="button"
                onClick={() => setViewMode("liveOverpass")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "liveOverpass"
                    ? "bg-cyan-600 text-white shadow-xs"
                    : "text-cyan-500 hover:text-cyan-400"
                }`}
              >
                <Zap size={13} className="fill-current" />
                <span>⚡ Live Overpass Map</span>
              </button>
            </div>

            <button
              onClick={detectLocation}
              disabled={isLocating}
              className="px-3.5 py-2 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--accent-primary)] font-bold text-xs hover:border-[var(--accent-primary)]/50 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Navigation size={14} className={isLocating ? "animate-spin" : ""} />
              <span>{isLocating ? "Detecting..." : "My GPS"}</span>
            </button>
            <span className="px-3 py-2 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-muted)] font-mono font-bold text-xs rounded-xl">
              <span className="text-[var(--accent-primary)] font-extrabold">{sortedStations.length}</span> POIs
            </span>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by city, station name, area or pincode (e.g. Coimbatore, Madurai, Chennai, Bengaluru)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm rounded-2xl pl-11 pr-10 py-3.5 focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 cursor-pointer"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filters Toolbar: Quick Chips & Dropdowns */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1 border-t border-[var(--border-subtle)]">
          {/* Horizontal Quick Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-sm">
            {QUICK_FILTERS.map((f) => {
              const active = quickFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setQuickFilter(f.id)}
                  className={`px-3.5 py-1.5 rounded-xl font-semibold text-xs whitespace-nowrap transition cursor-pointer ${
                    active
                      ? "bg-[var(--accent-primary)] text-white shadow-xs font-bold"
                      : "bg-[var(--bg-surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Secondary Dropdown Selects */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            {/* State Filter */}
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-xl px-3 py-1.5 focus:outline-none focus:border-[var(--accent-primary)] cursor-pointer text-xs font-medium"
            >
              {INDIAN_STATES.map((st) => (
                <option key={st} value={st} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                  {st}
                </option>
              ))}
            </select>

            {/* Connector Filter */}
            <select
              value={selectedConnector}
              onChange={(e) => setSelectedConnector(e.target.value)}
              className="bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-xl px-3 py-1.5 focus:outline-none focus:border-[var(--accent-primary)] cursor-pointer text-xs font-medium"
            >
              {CONNECTOR_OPTIONS.map((c) => (
                <option key={c} value={c} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                  {c}
                </option>
              ))}
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-xl px-3 py-1.5 focus:outline-none focus:border-[var(--accent-primary)] cursor-pointer text-xs font-medium"
            >
              <option value="distance" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                Sort: Distance
              </option>
              <option value="rating" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                Sort: Rating
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Segmented Toggle (Only visible on small screens) */}
      <div className="lg:hidden flex items-center bg-[var(--bg-surface)] p-1 rounded-2xl border border-[var(--border-subtle)] shadow-xs">
        <button
          onClick={() => setMobileView("list")}
          className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
            mobileView === "list"
              ? "bg-[var(--accent-primary)] text-white shadow-xs"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <List size={16} />
          <span>Station List ({sortedStations.length})</span>
        </button>
        <button
          onClick={() => setMobileView("map")}
          className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
            mobileView === "map"
              ? "bg-[var(--accent-primary)] text-white shadow-xs"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <MapIcon size={16} />
          <span>Map View</span>
        </button>
      </div>

      {/* Conditional Layout: Live Dynamic Overpass Map vs Two-Pane Directory Layout */}
      {viewMode === "liveOverpass" ? (
        <div className="h-[calc(100vh-230px)] min-h-[600px] w-full rounded-3xl overflow-hidden shadow-2xl border border-[var(--border-subtle)]">
          <EVMap
            selectedStation={selectedStation}
            onSelectStation={handleSelectStation}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-250px)] min-h-[620px]">
        {/* Left Column: Station Cards List (5 Cols Desktop, Mobile conditional) */}
        <div
          className={`lg:col-span-5 flex flex-col gap-3 overflow-y-auto pr-1.5 custom-scrollbar ${
            mobileView === "list" ? "block" : "hidden lg:flex"
          }`}
        >
          {loadingExternal && (
            <div className="p-3 bg-[var(--accent-light)] border border-[var(--accent-primary)]/30 rounded-2xl text-xs text-[var(--accent-primary)] flex items-center justify-center gap-2 font-medium">
              <RefreshCw size={15} className="animate-spin" /> Fetching India charging network POIs...
            </div>
          )}

          {sortedStations.length === 0 ? (
            <div className="p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center space-y-3">
              <MapPin size={36} className="text-[var(--text-muted)] mx-auto" />
              <h4 className="font-bold text-[var(--text-primary)] text-base font-grotesk">
                No charging stations found
              </h4>
              <p className="text-sm text-[var(--text-muted)] max-w-xs mx-auto">
                Try clearing your search keyword, switching states, or selecting &quot;All Stations&quot;.
              </p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedState("All States");
                  setSelectedConnector("All Connectors");
                  setQuickFilter("ALL");
                }}
                className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-bold text-sm transition cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            sortedStations.map((st) => {
              const distance = getDistanceToStation(st);
              const distanceDisplay = distance != null ? `${distance} km` : "Distance unavailable";
              const isSelected = selectedStation?.id === st.id;
              const isPlatform = !st.isExternal;
              const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${st.latitude},${st.longitude}`;

              // Determine max power & connector list
              const chargers = st.chargers || [];
              const maxKw = Math.max(...chargers.map((c) => c.powerKw || 0), st.isFast ? 60 : 22);
              const connectorList = Array.from(
                new Set(chargers.map((c) => c.type || c.connector || "CCS2"))
              ).slice(0, 3);
              if (connectorList.length === 0) connectorList.push(st.isFast ? "CCS2" : "Type 2");

              // Status classification
              const isOperational = st.status !== "Non-operational" && st.status !== "Offline";

              // Available bays count
              const availableBays = isPlatform
                ? chargers.filter((c) => c.status === "Available").length
                : null;
              const totalBays = chargers.length || (isPlatform ? 4 : 2);

              return (
                <div
                  key={st.id}
                  onClick={() => handleSelectStation(st)}
                  className={`p-4 md:p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 ${
                    isSelected
                      ? "bg-[var(--bg-surface-raised)] border-[var(--accent-primary)] shadow-md shadow-blue-500/10 ring-1 ring-[var(--accent-primary)]/40"
                      : "bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--bg-surface-raised)]/60"
                  }`}
                >
                  {/* Card Top: Badges & Rating */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                        isPlatform
                          ? "bg-[var(--accent-light)] text-[var(--accent-primary)] border-[var(--accent-primary)]/30"
                          : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30"
                      }`}
                    >
                      {isPlatform ? "⚡ VOLTCHARGE" : st.operator || "EV Network"}
                    </span>

                    <span className="flex items-center gap-1 text-amber-500 text-xs font-bold font-mono">
                      <Star size={13} className="fill-amber-500" />
                      <span>{st.rating || 4.8}</span>
                    </span>
                  </div>

                  {/* Station Name & Address */}
                  <div>
                    <h3 className="font-bold text-lg text-[var(--text-primary)] leading-snug font-grotesk group-hover:text-[var(--accent-primary)] transition-colors">
                      {st.name}
                    </h3>
                    <p className="text-sm text-[var(--text-muted)] line-clamp-1 mt-0.5">
                      📍 {st.address || "Station Road"}{st.city ? `, ${st.city}` : ""}
                    </p>
                  </div>

                  {/* 14px Compact Distance & Status line */}
                  <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] font-medium">
                    <span className="font-semibold text-[var(--text-primary)]">{distanceDisplay}</span>
                    <span>•</span>
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        isOperational
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isOperational ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                        }`}
                      />
                      {st.status || "Operational"}
                    </span>
                    {availableBays != null && (
                      <>
                        <span>•</span>
                        <span className="text-[var(--text-muted)]">
                          <span className="font-semibold text-[var(--text-primary)]">{availableBays}</span>/{totalBays} Bays Free
                        </span>
                      </>
                    )}
                  </div>

                  {/* Mini Specs Row: Power kW, Connectors chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-[var(--bg-surface-raised)] text-[var(--accent-primary)] border border-[var(--border-subtle)] flex items-center gap-1">
                      <Zap size={12} className="text-amber-500" />
                      {maxKw} kW
                    </span>
                    {connectorList.map((c) => (
                      <span
                        key={c}
                        className="text-xs font-medium px-2 py-0.5 rounded-lg bg-[var(--bg-surface-raised)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                      >
                        {c}
                      </span>
                    ))}
                    {st.pricePerKwh && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 ml-auto">
                        ₹{st.pricePerKwh}/kWh
                      </span>
                    )}
                  </div>

                  {/* Actions Row: Directions + Book Now */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]">
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/40 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Compass size={15} className="text-[var(--accent-primary)]" />
                      <span>Directions</span>
                    </a>

                    {isPlatform ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/booking?stationId=${st.id}`);
                        }}
                        className="px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-bold text-sm rounded-xl transition flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-98 cursor-pointer"
                      >
                        <Zap size={15} className="fill-white" />
                        <span>Book Now</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectStation(st);
                          navigate(`/booking?stationId=${st.id}`);
                        }}
                        className="px-3.5 py-2 bg-[var(--bg-surface-raised)] hover:bg-[var(--accent-light)] text-[var(--accent-primary)] font-bold text-sm rounded-xl transition border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/40 cursor-pointer"
                      >
                        View Bay
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Interactive Leaflet Map (7 Cols Desktop, Mobile conditional) */}
        <div
          className={`lg:col-span-7 h-full rounded-3xl overflow-hidden border border-[var(--border-subtle)] shadow-xl ${
            mobileView === "map" ? "block" : "hidden lg:block"
          }`}
        >
          <InteractiveMap
            stations={sortedStations}
            selectedStation={selectedStation}
            onSelectStation={handleSelectStation}
          />
        </div>
      </div>
    )}
    </div>
  );
}
