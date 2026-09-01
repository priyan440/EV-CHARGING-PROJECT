import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Filter,
  MapPin,
  Zap,
  Star,
  Clock,
  Navigation,
  CheckCircle2,
  SlidersHorizontal,
  ArrowUpDown,
  Building2,
  Globe,
  Compass,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { useSystemState } from "../contexts/SystemStateContext";
import { useLocation } from "../contexts/LocationContext";
import { apiService } from "../services/apiService";
import InteractiveMap from "../components/InteractiveMap";

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

const CONNECTOR_TYPES = ["ALL", "CCS2", "Type 2", "CHAdeMO", "GB/T"];
const CHARGING_TYPES = ["ALL", "DC Fast Charging", "AC Charging"];

export default function FindStations() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryFromUrl = searchParams.get("search") || "";

  const { stations: platformStations } = useSystemState();
  const { currentLocation, getDistanceToStation, estimateTravelTimeMinutes, detectLocation, isLocating } = useLocation();

  const [externalStations, setExternalStations] = useState([]);
  const [loadingExternal, setLoadingExternal] = useState(false);
  const [searchTerm, setSearchTerm] = useState(queryFromUrl);
  const [selectedState, setSelectedState] = useState("All States");
  const [selectedChargingType, setSelectedChargingType] = useState("ALL");
  const [selectedConnector, setSelectedConnector] = useState("ALL");
  const [selectedPower, setSelectedPower] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedStation, setSelectedStation] = useState(null);
  const [sortBy, setSortBy] = useState("distance");

  // Fetch real India EV charging stations from Open Charge Map API via backend
  useEffect(() => {
    let isMounted = true;
    const loadExternalStations = async () => {
      setLoadingExternal(true);
      const data = await apiService.fetchExternalEvStations({ maxresults: 150 });
      if (isMounted && Array.isArray(data)) {
        setExternalStations(data);
      }
      setLoadingExternal(false);
    };

    loadExternalStations();
    return () => {
      isMounted = false;
    };
  }, []);

  // Merge platform stations with real external Open Charge Map stations
  const allStations = [
    ...platformStations.map((s) => ({ ...s, isExternal: false })),
    ...externalStations,
  ];

  // Filter logic
  const filteredStations = allStations.filter((st) => {
    // State Filter
    if (selectedState !== "All States") {
      const stState = (st.state || "").toLowerCase();
      const selState = selectedState.toLowerCase();
      if (!stState.includes(selState) && !st.address?.toLowerCase().includes(selState) && !st.city?.toLowerCase().includes(selState)) {
        return false;
      }
    }

    // Charging Type Filter
    if (selectedChargingType === "DC Fast Charging" && !st.isFast) return false;
    if (selectedChargingType === "AC Charging" && st.isFast) return false;

    // Connector Filter
    if (selectedConnector !== "ALL") {
      const hasConnector = (st.chargers || []).some(
        (c) => (c.type || "").toUpperCase().includes(selectedConnector) || (c.connector || "").toUpperCase().includes(selectedConnector)
      );
      if (!hasConnector) return false;
    }

    // Power Rating Filter
    if (selectedPower !== "ALL") {
      const maxKw = Math.max(...(st.chargers || []).map((c) => c.powerKw || 0), 0);
      if (selectedPower === "<7" && maxKw >= 7) return false;
      if (selectedPower === "7-22" && (maxKw < 7 || maxKw > 22)) return false;
      if (selectedPower === "22-50" && (maxKw < 22 || maxKw > 50)) return false;
      if (selectedPower === "50+" && maxKw < 50) return false;
    }

    // Status Filter
    if (selectedStatus !== "ALL") {
      if (selectedStatus === "Operational" && st.status === "Non-operational") return false;
      if (selectedStatus === "Non-operational" && st.status !== "Non-operational") return false;
    }

    // Search Box Filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = st.name.toLowerCase().includes(q);
      const matchAddress = st.address.toLowerCase().includes(q);
      const matchCity = (st.city || "").toLowerCase().includes(q);
      const matchState = (st.state || "").toLowerCase().includes(q);
      const matchOperator = (st.operator || "").toLowerCase().includes(q);
      const matchPincode = (st.pincode || "").includes(q);
      if (!matchName && !matchAddress && !matchCity && !matchState && !matchOperator && !matchPincode) return false;
    }

    return true;
  });

  // Sort logic
  filteredStations.sort((a, b) => {
    if (sortBy === "distance") {
      return getDistanceToStation(a) - getDistanceToStation(b);
    }
    if (sortBy === "rating") {
      return (b.rating || 0) - (a.rating || 0);
    }
    return 0;
  });

  return (
    <div className="space-y-6 font-inter">
      {/* Header & Main Search Toolbar */}
      <div className="bg-[#0B132B] p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded border border-emerald-500/30">
                REAL INDIA MAP
              </span>
              <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2.5 py-0.5 rounded border border-cyan-500/30">
                OPEN CHARGE MAP & OPENSTREETMAP
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white font-grotesk flex items-center gap-2">
              <MapPin size={26} className="text-emerald-400" /> Interactive India EV Charging Finder
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Live geographic POI search across Tata Power, Jio-bp, Zeon, Ather, Shell Recharge, and highway networks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={detectLocation}
              disabled={isLocating}
              className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 font-bold text-xs hover:bg-slate-800 transition flex items-center gap-1.5"
            >
              <Navigation size={14} className={isLocating ? "animate-spin" : ""} /> 📍 Use My Location
            </button>
            <span className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-extrabold text-xs rounded-xl">
              {filteredStations.length} Chargers Loaded
            </span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs font-bold pt-2">
          {/* State Filter */}
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
          >
            {INDIAN_STATES.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          {/* Charging Type Filter */}
          <select
            value={selectedChargingType}
            onChange={(e) => setSelectedChargingType(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Charging Types</option>
            <option value="DC Fast Charging">DC Fast Charging</option>
            <option value="AC Charging">AC Charging</option>
          </select>

          {/* Connector Filter */}
          <select
            value={selectedConnector}
            onChange={(e) => setSelectedConnector(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Connectors</option>
            <option value="CCS2">CCS2 (DC Fast)</option>
            <option value="Type 2">Type 2 (AC)</option>
            <option value="CHAdeMO">CHAdeMO</option>
          </select>

          {/* Power Rating Filter */}
          <select
            value={selectedPower}
            onChange={(e) => setSelectedPower(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Power Ratings</option>
            <option value="<7">&lt; 7 kW (Slow)</option>
            <option value="7-22">7 – 22 kW (AC Fast)</option>
            <option value="22-50">22 – 50 kW (DC Fast)</option>
            <option value="50+">50+ kW (Ultra Fast)</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Operational Statuses</option>
            <option value="Operational">Operational Only</option>
            <option value="Non-operational">Non-operational</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
          >
            <option value="distance">Sort by Distance</option>
            <option value="rating">Sort by Rating</option>
          </select>
        </div>
      </div>

      {/* Split-Screen Desktop Layout (List 5 Cols + Real India Map 7 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-230px)] min-h-[640px]">
        
        {/* Left Column: Station Cards List (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar">
          
          {/* Prominent Search Input */}
          <div className="relative mb-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search city, area, station or pincode (e.g. Madurai, Chennai, Bengaluru, 600001)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0B132B] border border-slate-800 text-white text-xs rounded-2xl pl-10 pr-4 py-3.5 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {loadingExternal && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center justify-center gap-2">
              <RefreshCw size={16} className="animate-spin" /> Querying Open Charge Map India POIs...
            </div>
          )}

          {filteredStations.length === 0 ? (
            <div className="p-8 rounded-3xl bg-[#0B132B] border border-slate-800 text-center space-y-3">
              <MapPin size={32} className="text-slate-500 mx-auto" />
              <h4 className="font-bold text-white text-sm font-grotesk">No charging stations matched your filter</h4>
              <p className="text-xs text-slate-400">
                Try searching another city or clearing status/connector filters.
              </p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedState("All States");
                  setSelectedChargingType("ALL");
                  setSelectedConnector("ALL");
                  setSelectedPower("ALL");
                  setSelectedStatus("ALL");
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs font-grotesk"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredStations.map((st) => {
              const distance = getDistanceToStation(st) || 2.4;
              const eta = estimateTravelTimeMinutes(distance);
              const isSelected = selectedStation?.id === st.id;
              const isPlatform = !st.isExternal;
              const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${st.latitude},${st.longitude}`;

              return (
                <div
                  key={st.id}
                  onClick={() => setSelectedStation(st)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                    isSelected
                      ? "bg-[#0F1D3D] border-emerald-500/60 shadow-lg shadow-emerald-500/10"
                      : "bg-[#0B132B] border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        isPlatform
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                      }`}>
                        {isPlatform ? "⚡ VOLTCHARGE NETWORK" : st.operator || "EV Network"}
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-amber-400 text-xs font-bold font-mono">
                      <Star size={12} className="fill-amber-400" /> {st.rating || 4.8}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-white text-base font-grotesk leading-snug">{st.name}</h3>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">📍 {st.address}, {st.city}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Distance</span>
                      <span className="font-bold text-white">{distance} km</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Status</span>
                      <span className={`font-bold ${st.status === "Non-operational" ? "text-rose-400" : "text-emerald-400"}`}>
                        {st.status || "Operational"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Live Availability</span>
                      <span className="font-bold text-slate-300">
                        {isPlatform ? `${(st.chargers || []).filter(c => c.status === "Available").length} Bays` : "Not provided"}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1 font-grotesk">
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1"
                    >
                      <Compass size={14} className="text-cyan-400" /> Get Directions
                    </a>

                    {isPlatform ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/customer/book?stationId=${st.id}`);
                        }}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1 shadow-md shadow-emerald-500/20"
                      >
                        <Zap size={14} className="fill-slate-950" /> Book Now
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStation(st);
                        }}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs rounded-xl transition border border-slate-700"
                      >
                        View Details
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Real Interactive Leaflet India Map (7 Cols) */}
        <div className="lg:col-span-7 h-full rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
          <InteractiveMap
            stations={filteredStations}
            selectedStation={selectedStation}
            onSelectStation={(st) => setSelectedStation(st)}
          />
        </div>

      </div>
    </div>
  );
}
