import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Navigation,
  BatteryCharging,
  Clock,
  MapPin,
  Truck,
  PhoneCall,
  CheckCircle2,
  X,
  Compass,
  Zap,
  ArrowRight,
  ShieldAlert,
  Info,
  Sliders,
  Radio,
  History,
  AlertOctagon,
  Wrench,
  Car,
  CheckCircle,
  RefreshCw,
  LocateFixed,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useAuth } from "../contexts/AuthContext";
import { useSystemState } from "../contexts/SystemStateContext";
import { useLocation as useGeoLocation } from "../contexts/LocationContext";
import { useTheme } from "../contexts/ThemeContext";
import { vehicleService } from "../services/vehicleService";
import { emergencyService } from "../services/emergencyService";
import { stationService } from "../services/stationService";

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function EmergencyAssistance() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { stations: contextStations } = useSystemState();
  const { currentLocation, refreshLocation } = useGeoLocation();
  const { isDark } = useTheme();

  // Active Tab: ASSISTANCE or HISTORY
  const [activeTab, setActiveTab] = useState("ASSISTANCE");

  // Emergency Form State
  const [emergencyType, setEmergencyType] = useState("BATTERY_DEPLETED");
  const [customNotes, setCustomNotes] = useState("");
  const [simulatedSoc, setSimulatedSoc] = useState(8);
  const [activeVehicle, setActiveVehicle] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  // Request History State
  const [myRequests, setMyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Modals
  const [showNavModal, setShowNavModal] = useState(false);
  const [navTarget, setNavTarget] = useState(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchedTicket, setDispatchedTicket] = useState(null);
  const [isDispatching, setIsDispatching] = useState(false);

  const customerId = currentUser?.counterId || currentUser?.user_id || "CUS0001";
  const userLat = currentLocation?.latitude || 13.0827;
  const userLng = currentLocation?.longitude || 80.2707;

  const showNotification = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  // Load Vehicles and Stations
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [vehs, stnsRes] = await Promise.all([
        vehicleService.fetchVehicles().catch(() => []),
        stationService.getApprovedStations().catch(() => ({ data: [] })),
      ]);

      const vehList = Array.isArray(vehs) ? vehs : [];
      if (vehList.length > 0) {
        setActiveVehicle(vehList[0]);
        const vSoc = vehList[0].current_soc_percent ?? vehList[0].batteryPercentage ?? 8;
        setSimulatedSoc(Math.min(30, Math.max(2, parseInt(vSoc, 10) || 8)));
      }

      const stnList = stnsRes?.data && Array.isArray(stnsRes.data) && stnsRes.data.length > 0
        ? stnsRes.data
        : contextStations && contextStations.length > 0
        ? contextStations
        : [];
      setStations(stnList);
    } catch (err) {
      console.warn("Error loading emergency context:", err);
    } finally {
      setLoading(false);
    }
  }, [contextStations]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Evaluate Emergency Range Matrix
  useEffect(() => {
    if (stations && stations.length > 0) {
      const evalData = emergencyService.evaluateEmergency(
        currentLocation,
        stations,
        activeVehicle,
        simulatedSoc
      );
      setEvaluation(evalData);
    }
  }, [currentLocation, stations, activeVehicle, simulatedSoc]);

  // Load Past Emergency Requests
  const loadMyEmergencyRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const reqs = await emergencyService.getDispatchesForUser(customerId);
      setMyRequests(Array.isArray(reqs) ? reqs : []);
    } catch (err) {
      console.warn("Failed to fetch emergency requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (activeTab === "HISTORY") {
      loadMyEmergencyRequests();
    }
  }, [activeTab, loadMyEmergencyRequests]);

  // Handle Emergency Request Submission
  const handleSubmitEmergency = async (e) => {
    if (e) e.preventDefault();
    setIsDispatching(true);

    try {
      const ticket = await emergencyService.requestRoadsideAssistance({
        counterId: customerId,
        customerName: currentUser?.name || "EV Driver",
        customerPhone: currentUser?.mobile || currentUser?.phone || "+91 1800-EV-RESCUE",
        vehicleModel: activeVehicle
          ? `${activeVehicle.brand || ""} ${activeVehicle.model || ""}`.trim()
          : "EV Vehicle",
        vehicleNumber: activeVehicle?.registration_number || activeVehicle?.vehicleNumber || "TN-01-EV-2026",
        currentSoc: simulatedSoc,
        emergencyType,
        location: currentLocation?.address || "Current GPS Location, Chennai",
        latitude: userLat,
        longitude: userLng,
        notes: customNotes || `Emergency request for ${emergencyType.replace(/_/g, " ")}. Critical assistance required.`,
      });

      setDispatchedTicket(ticket);
      setIsDispatching(false);
      setShowDispatchModal(true);
      showNotification(`🚨 Emergency Request ${ticket.requestId || ticket.ticketId} Dispatched!`);
      loadMyEmergencyRequests();
    } catch (err) {
      setIsDispatching(false);
      showNotification("Failed to submit request: " + (err.message || "Network error"));
    }
  };

  const handleStartNavigation = (stn) => {
    setNavTarget(stn);
    setShowNavModal(true);
  };

  const emergencyOptions = [
    {
      id: "BATTERY_DEPLETED",
      title: "Battery Depleted / Critical Low SOC",
      desc: "Vehicle battery under 10%, cannot reach standard charging station.",
      icon: BatteryCharging,
      badgeColor: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
    },
    {
      id: "VEHICLE_BREAKDOWN",
      title: "Vehicle Breakdown / Motor Fault",
      desc: "Mechanical, electrical, or motor failure preventing mobility.",
      icon: Wrench,
      badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    },
    {
      id: "CHARGING_FAILURE",
      title: "Charger Gun Jammed / Charging Failure",
      desc: "Gun locked in vehicle port or station system error during fast charge.",
      icon: Zap,
      badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    },
    {
      id: "ACCIDENT",
      title: "Accident / Critical Incident",
      desc: "Collision, tire blowout, or high-voltage battery safety hazard.",
      icon: AlertOctagon,
      badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
    },
  ];

  if (loading || !evaluation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-red-500 border-t-transparent animate-spin" />
        <p className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider font-semibold">
          Triangulating GPS Coordinates & Nearby Rescue Nodes...
        </p>
      </div>
    );
  }

  const { primaryStation, alternativeStation, nearbyStations, remainingRangeKm, isCritical, safetyNotice } = evaluation;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans text-[var(--text-primary)]">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl bg-red-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 border border-red-400/30 animate-fade-in">
          <ShieldAlert size={18} />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="theme-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-red-500/30">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 text-[10px] font-black uppercase font-mono tracking-wider bg-red-500/10 text-red-600 dark:text-red-400 rounded-full border border-red-500/30 flex items-center gap-1.5 animate-pulse">
              <ShieldAlert size={12} className="text-red-500" /> 24/7 EMERGENCY ASSISTANCE PROTOCOL
            </span>
            <span className="px-3 py-1 text-[10px] font-extrabold font-mono tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full border border-amber-500/30">
              PRIORITY: CRITICAL
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
            <AlertTriangle className="text-red-500 shrink-0" size={28} /> Emergency Low Battery & Rescue
          </h1>

          <p className="text-xs text-[var(--text-muted)] mt-1 max-w-2xl">
            Real-time GPS routing to nearest operational fast chargers, emergency service nodes, and 24/7 mobile rapid-charge roadside assistance dispatch.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 shrink-0 bg-[var(--bg-surface-raised)] p-1.5 rounded-2xl border border-[var(--border-subtle)]">
          <button
            onClick={() => setActiveTab("ASSISTANCE")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "ASSISTANCE"
                ? "bg-red-600 text-white shadow-md"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Truck size={14} /> Request Rescue
          </button>
          <button
            onClick={() => setActiveTab("HISTORY")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "HISTORY"
                ? "bg-[var(--accent-primary)] text-white shadow-md"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <History size={14} /> Request History ({myRequests.length})
          </button>
        </div>
      </div>

      {activeTab === "HISTORY" ? (
        /* REQUEST HISTORY TAB */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2 font-mono">
              <History className="w-5 h-5 text-[var(--accent-primary)]" />
              Emergency Request Log (Database Stored)
            </h2>
            <button
              onClick={loadMyEmergencyRequests}
              disabled={loadingRequests}
              className="p-2 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingRequests ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {loadingRequests ? (
            <div className="p-12 text-center bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-subtle)]">
              <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-[var(--text-muted)] font-mono">Retrieving emergency dispatches from MySQL...</p>
            </div>
          ) : myRequests.length === 0 ? (
            <div className="p-12 text-center bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-subtle)] space-y-3">
              <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-[var(--text-primary)]">No Active or Past Emergency Dispatches</h3>
              <p className="text-xs text-[var(--text-muted)]">All emergency rescue tickets submitted from this portal will appear here with live status updates.</p>
              <button
                onClick={() => setActiveTab("ASSISTANCE")}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                + Create Emergency Request
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myRequests.map((req, idx) => (
                <div
                  key={req.request_id || req.requestId || req.id || idx}
                  className="bg-[var(--bg-surface)] p-5 rounded-3xl border border-[var(--border-subtle)] hover:border-red-500/30 transition shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-red-500 text-xs px-2.5 py-0.5 rounded-lg bg-red-500/10 border border-red-500/20">
                      {req.request_id || req.requestId || `EMG00000${req.id}`}
                    </span>
                    <span
                      className={`text-[10px] font-bold font-mono uppercase px-2.5 py-0.5 rounded-full border ${
                        req.status === "RESOLVED"
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : req.status === "DISPATCHED" || req.status === "IN_PROGRESS"
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse"
                          : "bg-red-500/10 text-red-500 border-red-500/20"
                      }`}
                    >
                      {req.status || "DISPATCHED"}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">
                      {String(req.emergency_type || req.emergencyType || "Battery Depleted").replace(/_/g, " ")}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-1">
                      <MapPin size={12} className="text-red-500 shrink-0" />
                      <span className="truncate">{req.location_address || req.location || "Current Location"}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-[var(--bg-surface-raised)] p-3 rounded-2xl text-xs text-center border border-[var(--border-subtle)]">
                    <div>
                      <span className="text-[9px] text-[var(--text-muted)] uppercase block">Battery SOC</span>
                      <span className="font-mono font-black text-red-500">{req.current_soc ?? req.currentSoc ?? 8}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[var(--text-muted)] uppercase block">Assigned Unit</span>
                      <span className="font-mono font-bold text-xs truncate max-w-[90px] block mx-auto">
                        {req.assigned_unit || req.assignedUnit || "Rescue Van"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[var(--text-muted)] uppercase block">ETA</span>
                      <span className="font-mono font-bold text-emerald-500">~{req.eta_minutes || req.etaMinutes || 15}m</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-2 border-t border-[var(--border-subtle)]">
                    <span>Logged: {new Date(req.created_at || req.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="font-bold text-emerald-500 flex items-center gap-1">
                      <PhoneCall size={10} /> +91 1800-EV-RESCUE
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* EMERGENCY ASSISTANCE SUBMISSION & MAP SECTION */
        <div className="space-y-6">
          {/* Safety Advisory */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2.5">
            <Info size={16} className="shrink-0 text-amber-500" />
            <span>
              <strong>Safety Advisory:</strong> {safetyNotice}
            </span>
          </div>

          {/* Interactive GPS Location & Live Leaflet Map */}
          <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5 font-mono">
                  <MapPin size={14} className="text-red-500" /> GPS TRIANGULATION & REACHABLE RADIUS
                </span>
                <h3 className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                  Current Coordinates: {userLat.toFixed(4)}° N, {userLng.toFixed(4)}° E
                </h3>
              </div>

              <button
                onClick={refreshLocation}
                className="px-3 py-1.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 hover:border-red-500 transition cursor-pointer self-start sm:self-auto"
              >
                <LocateFixed size={14} className="text-red-500" /> Refresh GPS Lock
              </button>
            </div>

            {/* Embedded Map */}
            <div className="h-64 w-full rounded-2xl overflow-hidden border border-[var(--border-subtle)] relative">
              <MapContainer
                key={`${userLat}-${userLng}`}
                center={[userLat, userLng]}
                zoom={13}
                style={{ width: "100%", height: "100%" }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  url={
                    isDark
                      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      : "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  }
                />
                {/* User Current Position */}
                <Marker position={[userLat, userLng]}>
                  <Popup>
                    <div className="text-xs p-1">
                      <strong className="text-red-600 block">Your Current Location</strong>
                      <span>Estimated SOC: {simulatedSoc}%</span>
                    </div>
                  </Popup>
                </Marker>

                {/* Reachable Safe Radius Circle */}
                <Circle
                  center={[userLat, userLng]}
                  radius={Math.min(25000, remainingRangeKm * 1000)}
                  pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.1 }}
                />

                {/* Nearby Stations Markers */}
                {nearbyStations.map((stn, idx) => (
                  <Marker
                    key={stn.id || idx}
                    position={[parseFloat(stn.latitude) || userLat, parseFloat(stn.longitude) || userLng]}
                  >
                    <Popup>
                      <div className="text-xs p-1 space-y-1">
                        <strong className="block text-blue-600">{stn.name}</strong>
                        <p className="text-[10px] text-slate-500">{stn.address}</p>
                        <div className="font-bold text-[10px]">
                          Distance: {stn.distanceKm} km • {stn.availableCount} Guns Free
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>

          {/* Battery Status & Simulation Slider */}
          <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5 font-mono">
                  <BatteryCharging size={16} className="text-red-500" /> Active Vehicle Telemetry
                </span>
                <h3 className="text-lg font-black text-[var(--text-primary)] mt-1 font-mono">
                  {activeVehicle ? `${activeVehicle.brand || ""} ${activeVehicle.model || ""}`.trim() : "EV Vehicle"} (
                  {activeVehicle?.registration_number || activeVehicle?.vehicleNumber || "TN-01-EV-2026"})
                </h3>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase block">Safe Range</span>
                  <span className="text-2xl font-black font-mono text-red-500">{remainingRangeKm} km</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase block">Current Battery</span>
                  <span className="text-2xl font-black font-mono text-red-500">{simulatedSoc}%</span>
                </div>
              </div>
            </div>

            {/* Slider */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Sliders size={14} className="text-emerald-500" /> Test Low-Battery SOC Scenarios:
                </span>
                <div className="flex gap-1.5">
                  {[4, 8, 12, 18].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSimulatedSoc(val)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                        simulatedSoc === val
                          ? "bg-red-600 text-white shadow"
                          : "bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                      }`}
                    >
                      {val}% {val <= 10 ? "Critical" : "Warning"}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="range"
                min={1}
                max={30}
                value={simulatedSoc}
                onChange={(e) => setSimulatedSoc(parseInt(e.target.value, 10))}
                className="w-full accent-red-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Emergency Category Selection Grid */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[var(--text-primary)] font-mono uppercase tracking-wider">
              Select Assistance Emergency Type
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {emergencyOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = emergencyType === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setEmergencyType(opt.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                      isSelected
                        ? "bg-red-500/10 border-red-500 shadow-md shadow-red-500/10"
                        : "bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-red-500/40"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${opt.badgeColor}`}
                    >
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[var(--text-primary)]">{opt.title}</h4>
                        {isSelected && <CheckCircle size={14} className="text-red-500 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{opt.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase font-mono">
              Additional Emergency Notes / Landmarks
            </label>
            <input
              type="text"
              placeholder="e.g. Near Gemini Flyover, vehicle in roadside breakdown lane..."
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-xl px-4 py-3 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Nearest Stations Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PRIMARY STATION */}
            <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border-2 border-emerald-500/50 shadow-md flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono">
                    ⭐ RECOMMENDED NEAREST STATION
                  </span>
                  <span className="text-xs font-mono font-black text-emerald-500">
                    {primaryStation.distanceKm} km away
                  </span>
                </div>

                <h2 className="text-lg font-black text-[var(--text-primary)]">{primaryStation.name}</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-1.5">
                  <MapPin size={14} className="text-emerald-500 shrink-0" /> {primaryStation.address}
                </p>

                <div className="grid grid-cols-3 gap-2.5 my-4 text-center">
                  <div className="p-3 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                    <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase block">Travel Time</span>
                    <span className="text-base font-black text-[var(--text-primary)] font-mono mt-0.5 block">
                      ~{primaryStation.travelTimeMins} mins
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                    <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase block">Charger Speed</span>
                    <span className="text-xs font-black text-cyan-500 font-mono mt-0.5 block">
                      {primaryStation.recommendedChargerType}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                    <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase block">Time to 80%</span>
                    <span className="text-base font-black text-emerald-500 font-mono mt-0.5 block">
                      {primaryStation.chargingTimeMins} mins
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                  <span>
                    Available Chargers: <strong>{primaryStation.availableCount} of {primaryStation.totalCount} Guns Free</strong>
                  </span>
                  <span className="font-bold font-mono text-[10px]">OPERATIONAL</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleStartNavigation(primaryStation)}
                  className="w-1/2 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <Navigation size={15} /> Navigate Now
                </button>
                <button
                  onClick={() => navigate(`/book-slot/${primaryStation.stationId || primaryStation.id || 1}`)}
                  className="w-1/2 py-3 rounded-2xl bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer border border-[var(--border-subtle)]"
                >
                  <Zap size={15} /> Instant Slot Book
                </button>
              </div>
            </div>

            {/* BACKUP ALTERNATIVE STATION */}
            <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-md flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 font-mono">
                    ALTERNATIVE BACKUP OPTION
                  </span>
                  <span className="text-xs font-mono font-black text-cyan-500">
                    {alternativeStation.distanceKm} km away
                  </span>
                </div>

                <h2 className="text-lg font-black text-[var(--text-primary)]">{alternativeStation.name}</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-1.5">
                  <MapPin size={14} className="text-cyan-500 shrink-0" /> {alternativeStation.address}
                </p>

                <div className="grid grid-cols-3 gap-2.5 my-4 text-center">
                  <div className="p-3 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                    <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase block">Travel Time</span>
                    <span className="text-base font-black text-[var(--text-primary)] font-mono mt-0.5 block">
                      ~{alternativeStation.travelTimeMins} mins
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                    <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase block">Charger Speed</span>
                    <span className="text-xs font-black text-cyan-500 font-mono mt-0.5 block">
                      {alternativeStation.recommendedChargerType}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                    <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase block">Time to 80%</span>
                    <span className="text-base font-black text-emerald-500 font-mono mt-0.5 block">
                      {alternativeStation.chargingTimeMins} mins
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-700 dark:text-cyan-300 flex items-center justify-between">
                  <span>
                    Available Chargers: <strong>{alternativeStation.availableCount || 2} Guns Available</strong>
                  </span>
                  <span className="font-bold font-mono text-[10px]">Est. Queue: {alternativeStation.queueMinutes}m</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleStartNavigation(alternativeStation)}
                  className="w-full py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Navigation size={15} /> Navigate to Alternative
                </button>
              </div>
            </div>
          </div>

          {/* Roadside Assistance Dispatch Button Banner */}
          <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-red-950/80 via-slate-900 to-[#120B20] text-white border border-red-500/40 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-3xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0">
                <Truck size={32} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Can't Make It to a Charging Station?</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  Dispatch our 24/7 Mobile Quick-Charge Van directly to your GPS coordinates ({userLat.toFixed(4)}, {userLng.toFixed(4)}). Equipped with a 30kW rapid DC pod to give you 50 km range in 15 minutes.
                </p>
              </div>
            </div>

            <button
              onClick={handleSubmitEmergency}
              disabled={isDispatching}
              className="w-full md:w-auto px-7 py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-red-600/30 shrink-0 active:scale-95 disabled:opacity-50"
            >
              {isDispatching ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <PhoneCall size={16} />
              )}
              <span>Submit & Dispatch Emergency Rescue</span>
            </button>
          </div>
        </div>
      )}

      {/* NAVIGATION MODAL */}
      {showNavModal && navTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-6 shadow-2xl space-y-4 text-[var(--text-primary)] animate-fade-in">
            <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-3">
              <h3 className="font-extrabold text-sm text-[var(--text-primary)] flex items-center gap-2 font-mono">
                <Compass size={18} className="text-emerald-500" /> Active Route to {navTarget.name}
              </h3>
              <button
                onClick={() => setShowNavModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[var(--text-muted)]">Total Distance:</span>
                <span className="font-bold text-emerald-500">{navTarget.distanceKm} km</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[var(--text-muted)]">Estimated Travel Time:</span>
                <span className="font-bold text-cyan-500">~{navTarget.travelTimeMins} mins</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[var(--text-muted)]">Destination:</span>
                <span className="font-bold truncate max-w-xs">{navTarget.address}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  window.open(
                    `https://www.google.com/maps/dir/?api=1&destination=${navTarget.latitude || userLat},${navTarget.longitude || userLng}`,
                    "_blank"
                  );
                }}
                className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition cursor-pointer shadow-md"
              >
                Open in Google Maps Navigation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISPATCH CONFIRMATION MODAL */}
      {showDispatchModal && dispatchedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--bg-surface)] border border-red-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-[var(--text-primary)] animate-fade-in">
            <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-3">
              <h3 className="font-extrabold text-sm text-red-500 flex items-center gap-2 font-mono">
                <Truck size={18} /> Roadside Rescue Van Dispatched!
              </h3>
              <button
                onClick={() => setShowDispatchModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 font-mono">
                Emergency Request Identifier
              </span>
              <div className="text-2xl font-black font-mono text-[var(--text-primary)]">
                {dispatchedTicket.requestId || dispatchedTicket.ticketId || `EMG00000${dispatchedTicket.id}`}
              </div>
              <span className="text-xs text-red-600 dark:text-red-400 font-bold block font-mono">
                Estimated Arrival: ~{dispatchedTicket.etaMinutes || 15} Minutes
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>Dispatched Unit:</span>
                <span className="font-bold text-[var(--text-primary)]">{dispatchedTicket.dispatchedUnit || dispatchedTicket.assignedUnit}</span>
              </div>
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>Vehicle:</span>
                <span className="font-bold text-[var(--text-primary)]">{dispatchedTicket.vehicleModel}</span>
              </div>
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>Location:</span>
                <span className="font-bold text-[var(--text-primary)] truncate max-w-[200px]">{dispatchedTicket.location}</span>
              </div>
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>24/7 Helpline:</span>
                <span className="font-bold text-emerald-500 font-mono">+91 1800-EV-RESCUE</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setShowDispatchModal(false);
                  setActiveTab("HISTORY");
                }}
                className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg"
              >
                View in Request History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
