import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BatteryCharging,
  Gauge,
  Activity,
  Zap,
  Clock,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Car,
  ChevronDown,
  Sparkles,
  Info,
  ArrowRight,
  History,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useAuth } from "../contexts/AuthContext";
import { vehicleService } from "../services/vehicleService";
import { vehicleHealthService } from "../services/vehicleHealthService";
import UpdateBatteryModal from "../components/UpdateBatteryModal";

export default function VehicleHealth() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [socHistory, setSocHistory] = useState([]);
  const [healthProfile, setHealthProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUpdateBatteryModal, setShowUpdateBatteryModal] = useState(false);

  const customerId = currentUser?.counterId || "CUS0001";

  const loadAllVehicles = async () => {
    try {
      const list = await vehicleService.fetchVehicles();
      if (Array.isArray(list) && list.length > 0) {
        setVehicles(list);
        if (!selectedVehicleId) {
          const primary = list.find((v) => v.isPrimary) || list[0];
          setSelectedVehicleId(primary.id);
          setSelectedVehicle(primary);
        } else {
          const matched = list.find((v) => String(v.id) === String(selectedVehicleId));
          if (matched) setSelectedVehicle(matched);
        }
      }
    } catch (err) {
      console.warn("Error loading vehicles in VehicleHealth:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllVehicles();
  }, [customerId, currentUser]);

  useEffect(() => {
    if (!selectedVehicleId || vehicles.length === 0) return;
    const veh = vehicles.find((v) => String(v.id) === String(selectedVehicleId));
    if (veh) {
      setSelectedVehicle(veh);
      const profile = vehicleHealthService.getVehicleHealthProfile(veh);
      setHealthProfile(profile);

      // Load SOC History
      vehicleService.getVehicleSocHistory(veh.id).then((history) => {
        setSocHistory(Array.isArray(history) ? history : []);
      }).catch(() => {});
    }
  }, [selectedVehicleId, vehicles]);

  const handleSocUpdated = (updatedVeh) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === updatedVeh.id ? { ...v, ...updatedVeh } : v))
    );
    setSelectedVehicle(updatedVeh);
    vehicleService.getVehicleSocHistory(updatedVeh.id).then((history) => {
      setSocHistory(Array.isArray(history) ? history : []);
    }).catch(() => {});
  };

  const formatLastUpdated = (dateStr) => {
    if (!dateStr) return "Just now";
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now - d;
      if (diffMs < 60000) return "Just now";
      if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
      const isToday = d.toDateString() === now.toDateString();
      const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      if (isToday) return `Today, ${timeStr}`;
      return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${timeStr}`;
    } catch {
      return "Recent";
    }
  };

  if (loading && vehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        <p className="text-xs font-mono text-slate-500 uppercase tracking-wider font-semibold">
          Loading Vehicle Battery Status & Health Profile...
        </p>
      </div>
    );
  }

  const currentSoc = selectedVehicle?.current_soc_percent !== undefined && selectedVehicle?.current_soc_percent !== null
    ? Number(selectedVehicle.current_soc_percent)
    : (selectedVehicle?.batteryPercentage !== undefined ? Number(selectedVehicle.batteryPercentage) : 75);

  const batteryCapacity = selectedVehicle?.batteryCapacityKwh || selectedVehicle?.batteryCapacity || selectedVehicle?.battery_capacity || 40.5;
  const socTimestamp = selectedVehicle?.soc_updated_at || selectedVehicle?.updated_at;
  const isCritical = currentSoc <= 20;

  const {
    batteryHealthPercentage = 98,
    estimatedRangeKm = Math.round((currentSoc / 100) * batteryCapacity * 7.5),
    totalMaxRangeKm = Math.round(batteryCapacity * 7.5),
    connectorType = selectedVehicle?.connectorType || "CCS2",
    lastSession = "Recent",
    totalSessions = 12,
    acSessions = 4,
    dcSessions = 8,
    totalKwhCharged = 248.5,
    avgChargingTimeMinutes = 42,
    avgCostPerSession = 210,
    healthTrend = [
      { month: "May", health: 99.8 },
      { month: "Jun", health: 99.5 },
      { month: "Jul", health: 99.1 },
      { month: "Aug", health: 98.8 },
      { month: "Sep", health: 98.4 },
      { month: "Oct", health: 98.0 },
    ],
    behavior = {
      temperatureStatus: "Normal (31°C)",
      cellVoltageDelta: "0.012V (Optimal)",
      fastChargingRatio: "66% DC Fast",
      avgDepthOfDischarge: "48%",
      estimatedCyclesCompleted: 42,
    },
    recommendations = [
      { id: 1, title: "Optimal Charging Range (20% - 80%)", badge: "Longevity Tip", advice: "Maintain battery between 20% and 80% for routine daily commutes to minimize lithium-ion degradation." },
      { id: 2, title: "AC Slow Charging Preservation", badge: "Best Practice", advice: "Use Type 2 AC charging periodically to allow battery management system (BMS) cell balancing." },
      { id: 3, title: "Avoid Storing at 0% or 100%", badge: "Safety", advice: "Do not leave the vehicle parked in extreme heat with 100% or below 10% SOC for extended days." },
    ],
  } = healthProfile || {};

  return (
    <div className="space-y-6">
      {/* Update Battery Modal */}
      {selectedVehicle && (
        <UpdateBatteryModal
          isOpen={showUpdateBatteryModal}
          onClose={() => setShowUpdateBatteryModal(false)}
          vehicle={selectedVehicle}
          onSuccess={handleSocUpdated}
        />
      )}

      {/* Header Banner */}
      <div className="theme-card p-6 md:p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 text-[10px] font-extrabold uppercase font-mono tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
              <Sparkles size={12} className="text-emerald-500" /> BATTERY HEALTH & STATUS
            </span>
            <span className="px-3 py-1 text-[10px] font-extrabold font-mono tracking-wider bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-full border border-cyan-500/30">
              SOH: {batteryHealthPercentage}%
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)]">
            EV Vehicle Health Profile
          </h1>

          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl">
            Latest known battery state of charge, pack capacity diagnostics, charging degradation analysis, and longevity recommendations.
          </p>
        </div>

        {/* Vehicle Selector Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <div className="relative">
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="theme-input appearance-none w-full sm:w-64 text-xs font-bold py-3 pl-4 pr-10 rounded-2xl cursor-pointer"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.brand || v.manufacturer} {v.model} ({v.registrationNumber || v.vehicleNumber})
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-3.5 text-[var(--text-muted)] pointer-events-none" />
          </div>

          <button
            onClick={() => setShowUpdateBatteryModal(true)}
            className="px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20 shrink-0"
          >
            <BatteryCharging size={15} /> Update Battery Level
          </button>
        </div>
      </div>

      {/* Telemetry Transparency Notice */}
      <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info size={16} className="shrink-0 text-amber-500" />
          <span>
            <strong>Battery Telemetry Notice:</strong> Battery level is based on your latest user update or completed charging session. Live vehicle telemetry is not connected.
          </span>
        </div>
        <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 shrink-0">
          LATEST KNOWN SOC
        </span>
      </div>

      {/* Low Battery Alert Trigger if SOC <= 20% */}
      {isCritical && (
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse ${
          currentSoc <= 10
            ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
            : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
        }`}>
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={22} className={currentSoc <= 10 ? "text-rose-500 shrink-0" : "text-amber-500 shrink-0"} />
            <div>
              <h4 className="font-extrabold text-xs font-mono uppercase">
                {currentSoc <= 10 ? "CRITICALLY LOW BATTERY" : "LOW BATTERY WARNING"} ({currentSoc}%)
              </h4>
              <p className="text-[11px] mt-0.5">
                Your latest recorded battery level is <strong>{currentSoc}%</strong>. {currentSoc <= 10 ? "Charging is strongly recommended." : "Consider planning your next charging session."}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/customer/book")}
            className={`px-4 py-2 rounded-xl text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer self-start sm:self-auto shrink-0 shadow ${
              currentSoc <= 10 ? "bg-rose-600 hover:bg-rose-500" : "bg-amber-600 hover:bg-amber-500"
            }`}
          >
            Find Charging Station
          </button>
        </div>
      )}

      {/* 1. Core Battery Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Battery SOC */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Latest Known Battery</span>
              <div className="text-3xl font-black text-amber-500 font-mono mt-1 flex items-baseline gap-1">
                {currentSoc}
                <span className="text-base text-slate-400 font-normal">%</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <BatteryCharging size={20} />
            </div>
          </div>

          <div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  currentSoc <= 20 ? "bg-red-500" : currentSoc <= 50 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${currentSoc}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-2 text-[10px] font-mono text-slate-400">
              <span>Updated: {formatLastUpdated(socTimestamp)}</span>
              <button
                onClick={() => setShowUpdateBatteryModal(true)}
                className="text-amber-500 hover:underline font-bold cursor-pointer"
              >
                Update
              </button>
            </div>
          </div>
        </div>

        {/* State of Health (SOH) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Battery Health (SOH)</span>
            <div className="text-3xl font-black text-cyan-500 font-mono mt-1 flex items-baseline gap-1">
              {batteryHealthPercentage}
              <span className="text-base text-slate-400 font-normal">%</span>
            </div>
            <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold mt-2 block">
              Optimal Pack Condition
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500">
            <ShieldCheck size={24} />
          </div>
        </div>

        {/* Estimated Range */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimated Range</span>
            <div className="text-3xl font-black text-slate-900 dark:text-white font-mono mt-1 flex items-baseline gap-1">
              {estimatedRangeKm}
              <span className="text-base text-slate-400 font-normal">km</span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium mt-2 block">
              Max capacity: {totalMaxRangeKm} km
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <Gauge size={24} />
          </div>
        </div>

        {/* Battery Capacity & Specs */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pack Capacity</span>
            <div className="text-3xl font-black text-purple-500 font-mono mt-1 flex items-baseline gap-1">
              {batteryCapacity}
              <span className="text-base text-slate-400 font-normal">kWh</span>
            </div>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-2 block">
              Port: {connectorType}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
            <Zap size={24} />
          </div>
        </div>
      </div>

      {/* 2. Degradation Trend Chart & SOC History Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Battery Health Trend Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-500" /> Battery Health Degradation History (6 Months)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Observed capacity retention over time with driving and charging cycles.
              </p>
            </div>
            <span className="text-[10px] font-mono text-emerald-500 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              Low Degradation: -0.5%/qtr
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={healthTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="month" stroke="#64748B" fontSize={11} />
                <YAxis domain={[90, 100]} stroke="#64748B" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0B1329",
                    borderColor: "#1E293B",
                    borderRadius: "1rem",
                    fontSize: "12px",
                    color: "#F8FAFC",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="health"
                  name="Health (SOH %)"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ fill: "#10B981", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Battery SOC History Log */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <History size={16} className="text-amber-500" /> Known SOC History
              </h3>
              <button
                onClick={() => setShowUpdateBatteryModal(true)}
                className="text-[10px] font-mono text-amber-500 hover:underline font-bold cursor-pointer"
              >
                + Update
              </button>
            </div>

            {socHistory.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                No manual updates or completed charges recorded yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {socHistory.slice(0, 6).map((h, idx) => (
                  <div
                    key={h.id || idx}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">
                        {h.previous_soc_percent !== null ? `${h.previous_soc_percent}% → ` : ""}{h.new_soc_percent}%
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {h.source === "CHARGING_COMPLETED" ? "⚡ Charging Completed" : "👤 User Reading"}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {formatLastUpdated(h.recorded_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-3 text-[11px] text-slate-400">
            Source: MySQL <code>vehicle_soc_history</code>
          </div>
        </div>
      </div>

      {/* 3. Charging Statistics & Smart Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Statistics Summary */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Clock size={16} className="text-emerald-500" /> Historical Session Statistics
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Total Sessions</span>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">{totalSessions}</div>
              <span className="text-[10px] text-slate-500 font-medium">{dcSessions} DC / {acSessions} AC</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Total Energy</span>
              <div className="text-xl font-black text-emerald-500 font-mono mt-1">{totalKwhCharged} <span className="text-xs">kWh</span></div>
              <span className="text-[10px] text-emerald-500 font-medium">Delivered to pack</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Avg Duration</span>
              <div className="text-xl font-black text-cyan-500 font-mono mt-1">{avgChargingTimeMinutes} <span className="text-xs">mins</span></div>
              <span className="text-[10px] text-slate-500 font-medium">Per session</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Avg Session Cost</span>
              <div className="text-xl font-black text-purple-500 font-mono mt-1">₹{avgCostPerSession}</div>
              <span className="text-[10px] text-slate-500 font-medium">Standard tariff</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex justify-between items-center">
            <span>Last Active Session:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{lastSession}</span>
          </div>
        </div>

        {/* Smart Recommendations */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-lg">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-purple-500" /> Battery Longevity Preservation Tips
          </h3>

          <div className="space-y-3">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    {rec.title}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    {rec.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 pl-5 leading-relaxed">
                  {rec.advice}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
