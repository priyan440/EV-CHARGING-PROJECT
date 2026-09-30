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
  Flame,
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

export default function VehicleHealth() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [healthProfile, setHealthProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const customerId = currentUser?.counterId || "CUS0001";

  useEffect(() => {
    const list = vehicleService.getVehicles(customerId);
    setVehicles(list);
    if (list.length > 0) {
      const primary = list.find((v) => v.isPrimary) || list[0];
      setSelectedVehicleId(primary.id);
    }
  }, [customerId]);

  useEffect(() => {
    if (!selectedVehicleId) return;
    setLoading(true);
    const vehicle = vehicleService.getVehicleById(selectedVehicleId);
    if (vehicle) {
      const profile = vehicleHealthService.getVehicleHealthProfile(vehicle);
      setHealthProfile(profile);
    }
    setLoading(false);
  }, [selectedVehicleId]);

  if (loading || !healthProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        <p className="text-xs font-mono text-slate-500 uppercase tracking-wider font-semibold">
          Reading OBD-II Telemetry & Battery Telematics...
        </p>
      </div>
    );
  }

  const {
    vehicleName,
    vehicleNumber,
    currentBatteryPercentage,
    batteryHealthPercentage,
    estimatedRangeKm,
    totalMaxRangeKm,
    batteryCapacityKwh,
    connectorType,
    lastSession,
    totalSessions,
    acSessions,
    dcSessions,
    totalKwhCharged,
    avgChargingTimeMinutes,
    avgCostPerSession,
    healthTrend,
    behavior,
    recommendations,
    isCriticalBattery,
    telemetryDisclaimer,
  } = healthProfile;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#0B1329] via-[#0E2238] to-[#0A2F2B] border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 text-[10px] font-extrabold uppercase font-mono tracking-wider bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
              <Sparkles size={12} className="text-emerald-400" /> BATTERY HEALTH & TELEMATICS
            </span>
            <span className="px-3 py-1 text-[10px] font-extrabold font-mono tracking-wider bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/30">
              SOH: {batteryHealthPercentage}%
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            EV Vehicle Health Profile
          </h1>

          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Real-time battery pack diagnostics, charging degradation analysis, range estimations, and health longevity recommendations.
          </p>
        </div>

        {/* Vehicle Selector Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <div className="relative">
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="appearance-none w-full sm:w-60 bg-slate-900 border border-slate-700 text-white text-xs font-bold py-3 pl-4 pr-10 rounded-2xl cursor-pointer hover:border-emerald-500 transition"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.brand || v.manufacturer} {v.model} ({v.vehicleNumber})
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
          </div>

          <button
            onClick={() => navigate("/emergency-assistance")}
            className="px-4 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-red-500/20 shrink-0"
          >
            <AlertTriangle size={15} /> 🚨 Emergency SOS
          </button>
        </div>
      </div>

      {/* Telemetry Transparency Notice */}
      <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info size={16} className="shrink-0 text-emerald-500" />
          <span>
            <strong>Telematics Source:</strong> {telemetryDisclaimer}
          </span>
        </div>
        <span className="text-[10px] font-mono text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
          OBD-II CAN BUS SYNC
        </span>
      </div>

      {/* Low Battery Alert Trigger if SOC <= 20 */}
      {isCriticalBattery && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={22} className="shrink-0 text-red-500" />
            <div>
              <h4 className="font-extrabold text-xs">CRITICAL BATTERY LEVEL ({currentBatteryPercentage}%)</h4>
              <p className="text-[11px] text-red-700/80 dark:text-red-300/80">
                Remaining range is only {estimatedRangeKm} km. Reach a fast charging station immediately or request assistance.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/emergency-assistance")}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer self-start sm:self-auto shrink-0 shadow"
          >
            Find Emergency Station
          </button>
        </div>
      )}

      {/* 1. Core Battery Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Battery SOC */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Battery</span>
            <div className="text-3xl font-black text-emerald-500 font-mono mt-1 flex items-baseline gap-1">
              {currentBatteryPercentage}
              <span className="text-base text-slate-400 font-normal">%</span>
            </div>
            <div className="w-28 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full ${
                  currentBatteryPercentage <= 20 ? "bg-red-500" : currentBatteryPercentage <= 50 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${currentBatteryPercentage}%` }}
              />
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <BatteryCharging size={24} />
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
              {batteryCapacityKwh}
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

      {/* 2. Degradation Trend Chart & Charging Behavior */}
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
              Low Degradation Rate: -0.5% / quarter
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

        {/* Telematics Diagnostic Metrics */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-4">
              <Activity size={16} className="text-cyan-500" /> Telematics Metrics
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex justify-between">
                <span className="text-slate-500">Pack Temperature:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{behavior.temperatureStatus}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex justify-between">
                <span className="text-slate-500">Cell Voltage Balance:</span>
                <span className="font-bold text-emerald-500">{behavior.cellVoltageDelta}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex justify-between">
                <span className="text-slate-500">Fast/Slow Ratio:</span>
                <span className="font-bold text-cyan-500">{behavior.fastChargingRatio}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex justify-between">
                <span className="text-slate-500">Avg Depth of Discharge:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{behavior.avgDepthOfDischarge}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex justify-between">
                <span className="text-slate-500">Charging Cycles:</span>
                <span className="font-mono font-bold text-purple-500">{behavior.estimatedCyclesCompleted} Full Cycles</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
            <button
              onClick={() => navigate("/charging-simulator")}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <Zap size={15} /> Simulate Charging Curve
            </button>
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
