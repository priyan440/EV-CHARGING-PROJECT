import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Zap,
  DollarSign,
  Layers,
  Activity,
  AlertTriangle,
  Wrench,
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  ShieldAlert
} from "lucide-react";
import { getOwnerStations } from "../../services/ownerService";

// Helper component to center map when station selected
function MapCenterController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || 13, { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

// Function to generate custom color-coded Leaflet DivIcons
const createStationIcon = (status) => {
  let color = "#10B981"; // Green (Operational)
  let shadowColor = "rgba(16, 185, 129, 0.4)";

  const st = (status || "").toUpperCase();
  if (st === "DEGRADED" || st === "BUSY") {
    color = "#F59E0B"; // Yellow/Amber
    shadowColor = "rgba(245, 158, 11, 0.4)";
  } else if (st === "OFFLINE" || st === "INACTIVE" || st === "FAULTED") {
    color = "#EF4444"; // Red
    shadowColor = "rgba(239, 68, 68, 0.4)";
  } else if (st === "MAINTENANCE") {
    color = "#3B82F6"; // Blue
    shadowColor = "rgba(59, 130, 246, 0.4)";
  }

  const html = `
    <div style="
      position: relative;
      width: 32px;
      height: 32px;
      background: ${color};
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px ${shadowColor};
      border: 2px solid #ffffff;
      cursor: pointer;
    ">
      <div style="
        width: 12px;
        height: 12px;
        background: #ffffff;
        border-radius: 50%;
        transform: rotate(45deg);
      "></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-station-pin",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

export default function OwnerMap() {
  const navigate = useNavigate();
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStation, setSelectedStation] = useState(null);
  const [mapCenter, setMapCenter] = useState([13.0827, 80.2707]); // Default Chennai

  const loadStations = async () => {
    try {
      setLoading(true);
      const data = await getOwnerStations();
      const list = Array.isArray(data) ? data : [];
      setStations(list);

      // Center around first valid station if available
      const firstValid = list.find((s) => {
        const lat = Number(s.latitude || s.location?.latitude || s.location?.lat || (s.location?.coordinates && s.location.coordinates[1]));
        const lng = Number(s.longitude || s.location?.longitude || s.location?.lng || (s.location?.coordinates && s.location.coordinates[0]));
        return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
      });

      if (firstValid) {
        const lat = Number(firstValid.latitude || firstValid.location?.latitude || firstValid.location?.lat || (firstValid.location?.coordinates && firstValid.location.coordinates[1]));
        const lng = Number(firstValid.longitude || firstValid.location?.longitude || firstValid.location?.lng || (firstValid.location?.coordinates && firstValid.location.coordinates[0]));
        setMapCenter([lat, lng]);
      }
    } catch (err) {
      console.error("Failed to load map stations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStations();
  }, []);

  const getStationCoordinates = (station) => {
    let lat = Number(station.latitude || station.location?.latitude || station.location?.lat);
    let lng = Number(station.longitude || station.location?.longitude || station.location?.lng);

    if ((!lat || !lng) && station.location?.coordinates && Array.isArray(station.location.coordinates)) {
      lng = station.location.coordinates[0];
      lat = station.location.coordinates[1];
    }

    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
      // Fallback default coordinates within India
      return [13.0827 + (Math.random() - 0.5) * 0.05, 80.2707 + (Math.random() - 0.5) * 0.05];
    }
    return [lat, lng];
  };

  const filteredStations = stations.filter((s) => {
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "OPERATIONAL" && (s.status === "ACTIVE" || s.status === "Available" || s.status === "OPERATIONAL")) ||
      (statusFilter === "OFFLINE" && (s.status === "OFFLINE" || s.status === "INACTIVE")) ||
      (statusFilter === "MAINTENANCE" && s.status === "MAINTENANCE");

    const matchesSearch =
      !searchQuery ||
      s.stationName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.stationId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.address?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <MapPin className="w-6 h-6" />
            </span>
            Geographic Station Map
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Real-time geospatial layout of your charging infrastructure mapped directly from MySQL coordinates.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 p-2.5 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 text-xs font-bold">
          <span className="text-slate-400 text-[11px] uppercase tracking-wider font-extrabold mr-1">Status:</span>
          <div className="flex items-center gap-1.5 text-emerald-500">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
            Operational
          </div>
          <div className="flex items-center gap-1.5 text-amber-500">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>
            Degraded / Busy
          </div>
          <div className="flex items-center gap-1.5 text-rose-500">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></span>
            Offline / Fault
          </div>
          <div className="flex items-center gap-1.5 text-blue-500">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span>
            Maintenance
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search stations by name, city, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {["ALL", "OPERATIONAL", "OFFLINE", "MAINTENANCE"].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                statusFilter === filter
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              {filter}
            </button>
          ))}

          <button
            onClick={loadStations}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition shrink-0"
            title="Reload Map Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* Map & Station Selector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Stations Sidebar Selector */}
        <div className="lg:col-span-1 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 p-4 max-h-[620px] overflow-y-auto space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Stations ({filteredStations.length})
            </span>
          </div>

          {filteredStations.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No matching stations found.</p>
          ) : (
            filteredStations.map((st) => {
              const id = st._id || st.id;
              const coords = getStationCoordinates(st);
              const isSelected = selectedStation && (selectedStation._id === id || selectedStation.id === id);

              return (
                <div
                  key={id}
                  onClick={() => {
                    setSelectedStation(st);
                    setMapCenter(coords);
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-emerald-500/10 border-emerald-500 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                        {st.stationName}
                      </h4>
                      <p className="text-[11px] font-mono text-emerald-500 font-bold">{st.stationId}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                        st.status === "ACTIVE" || st.status === "Available"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : st.status === "MAINTENANCE"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-rose-500/20 text-rose-400"
                      }`}
                    >
                      {st.status || "ACTIVE"}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                    {st.address}, {st.city}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-emerald-500" />
                      {st.chargersCount || st.totalChargers || 2} Guns
                    </span>
                    <span className="flex items-center gap-1 text-purple-400 font-bold">
                      {st.parkingCapacity || 4} Bays
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Leaflet Map Canvas */}
        <div className="lg:col-span-3 h-[620px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md relative z-0">
          <MapContainer
            center={mapCenter}
            zoom={12}
            scrollWheelZoom={true}
            className="w-full h-full"
            style={{ background: "#0F172A" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapCenterController center={mapCenter} zoom={13} />

            {filteredStations.map((station) => {
              const coords = getStationCoordinates(station);
              const id = station._id || station.id;

              return (
                <Marker
                  key={id}
                  position={coords}
                  icon={createStationIcon(station.status)}
                  eventHandlers={{
                    click: () => {
                      setSelectedStation(station);
                    },
                  }}
                >
                  <Popup className="ev-station-leaflet-popup">
                    <div className="p-3 space-y-2 min-w-[220px]">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                        <h4 className="font-extrabold text-sm text-slate-900">{station.stationName}</h4>
                        <span className="font-mono text-xs font-bold text-emerald-600">{station.stationId}</span>
                      </div>

                      <p className="text-xs text-slate-600">
                        {station.address}, {station.city}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-xs py-1">
                        <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 font-semibold text-center">
                          <span className="block text-[10px] uppercase font-bold text-emerald-600">Status</span>
                          {station.status || "Operational"}
                        </div>
                        <div className="p-1.5 rounded-lg bg-blue-50 text-blue-800 font-semibold text-center">
                          <span className="block text-[10px] uppercase font-bold text-blue-600">Capacity</span>
                          {station.parkingCapacity || 4} Slots
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between pt-1 border-t border-slate-100">
                        <span>Available: {station.availableChargers || 2}</span>
                        <span className="text-rose-500">Fault: {station.faultedChargers || 0}</span>
                      </div>

                      <button
                        onClick={() => navigate("/owner/chargers")}
                        className="w-full mt-2 py-1.5 rounded-lg bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
                      >
                        <span>Manage Chargers</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
