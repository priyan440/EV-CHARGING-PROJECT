import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Cpu,
  Zap,
  TrendingUp,
  DollarSign,
  Activity,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  Gauge,
  Sliders,
  AlertTriangle,
  RefreshCw,
  Save,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { useAuth } from "../../contexts/AuthContext";
import { stationService } from "../../services/stationService";
import { bookingService } from "../../services/bookingService";
import RealtimeBookingsManager from "../../components/owner/RealtimeBookingsManager";

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [stations, setStations] = useState([]);
  const [selectedStationIndex, setSelectedStationIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingPower, setIsUpdatingPower] = useState(false);
  const [powerSaveMsg, setPowerSaveMsg] = useState("");

  // Power configuration inputs for active station
  const [customMaxPower, setCustomMaxPower] = useState(100);
  const [customMaxCurrent, setCustomMaxCurrent] = useState(150);

  const loadOwnerStations = async () => {
    try {
      const res = await stationService.getMyStations();
      if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
        setStations(res.data);
        const activeSt = res.data[selectedStationIndex] || res.data[0];
        setCustomMaxPower(activeSt.maxPower || activeSt.maximumPower || 100);
        setCustomMaxCurrent(activeSt.maxCurrent || activeSt.maximumCurrent || 150);
      } else {
        const allRes = await stationService.getStations();
        if (allRes?.success && Array.isArray(allRes.data)) {
          setStations(allRes.data);
          const activeSt = allRes.data[selectedStationIndex] || allRes.data[0];
          setCustomMaxPower(activeSt?.maxPower || 100);
          setCustomMaxCurrent(activeSt?.maxCurrent || 150);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOwnerStations();
  }, []);

  const activeStation = stations[selectedStationIndex] || stations[0] || {
    id: 1,
    name: "GreenCharge Central",
    maxPower: 100,
    currentLoad: 62,
    availablePower: 38,
    maxCurrent: 150,
    currentCurrent: 93,
    activeSessions: 3,
    availableConnectors: 1,
    totalSlots: 4,
    loadPercentage: 62,
    connectors: [],
  };

  const handleStationChange = (idx) => {
    setSelectedStationIndex(idx);
    const target = stations[idx];
    if (target) {
      setCustomMaxPower(target.maxPower || target.maximumPower || 100);
      setCustomMaxCurrent(target.maxCurrent || target.maximumCurrent || 150);
      setPowerSaveMsg("");
    }
  };

  const handleSavePowerConfig = async () => {
    if (!activeStation?.id) return;
    setIsUpdatingPower(true);
    setPowerSaveMsg("");
    try {
      const res = await stationService.updateStationPower(activeStation.id, {
        maxPower: parseFloat(customMaxPower),
        maxCurrent: parseFloat(customMaxCurrent),
      });
      if (res?.success) {
        setPowerSaveMsg(`✓ Power limit updated to ${customMaxPower} kW & ${customMaxCurrent} A!`);
        await loadOwnerStations();
      } else {
        alert(res?.message || "Failed to update power configuration.");
      }
    } catch (err) {
      alert("Error saving power limits.");
    } finally {
      setIsUpdatingPower(false);
    }
  };

  const totalChargers = stations.reduce((sum, s) => sum + (s.totalSlots || s.total_slots || 4), 0);
  const availableChargers = stations.reduce((sum, s) => sum + (s.availableSlots || s.available_slots || 0), 0);
  const occupiedChargers = Math.max(0, totalChargers - availableChargers);
  const utilizationRate = totalChargers > 0 ? Math.round((occupiedChargers / totalChargers) * 100) : 62;

  const totalSystemPower = stations.reduce((sum, s) => sum + (parseFloat(s.maxPower) || 100), 0);
  const totalActiveLoad = stations.reduce((sum, s) => sum + (parseFloat(s.currentLoad) || 0), 0);
  const totalAvailablePower = Math.max(0, totalSystemPower - totalActiveLoad);

  const revenueData = [
    { day: "Mon", revenue: 12400 },
    { day: "Tue", revenue: 14800 },
    { day: "Wed", revenue: 13200 },
    { day: "Thu", revenue: 16500 },
    { day: "Fri", revenue: 18450 },
    { day: "Sat", revenue: 21000 },
    { day: "Sun", revenue: 19500 },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="theme-card p-6 md:p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 text-[10px] font-extrabold uppercase font-mono tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full border border-blue-500/20">
              STATION OWNER PORTAL
            </span>
            <span className="px-3 py-1 text-[10px] font-extrabold font-mono tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
              ID: {currentUser?.counterId || "OWNER0001"}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)]">
            {currentUser?.businessName || currentUser?.name || "GreenCharge Infrastructure"} Dashboard
          </h1>

          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Dynamic station power management, capacity limit controls, and real-time charger load monitoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/owner/control-center")}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-extrabold text-xs tracking-wider uppercase transition flex items-center gap-2 shadow-lg shadow-blue-500/25 cursor-pointer hover:scale-102"
          >
            <Activity size={16} /> Live Control Center
          </button>
          <button
            onClick={() => navigate("/owner/stations")}
            className="px-5 py-3 rounded-2xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] font-extrabold text-xs tracking-wider uppercase transition flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} /> Manage Stations
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="theme-card p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[var(--text-secondary)] font-extrabold uppercase tracking-wider block">Today's Revenue</span>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">₹18,450</h3>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-1">
              <TrendingUp size={12} /> +14.2% vs yesterday
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="theme-card p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[var(--text-secondary)] font-extrabold uppercase tracking-wider block">Chargers Available</span>
            <h3 className="text-2xl font-black text-[var(--text-primary)] font-mono mt-1">{availableChargers} / {totalChargers}</h3>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-1 block">Utilization: {utilizationRate}%</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center">
            <Cpu size={24} />
          </div>
        </div>

        <div className="theme-card p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[var(--text-secondary)] font-extrabold uppercase tracking-wider block">Grid Power Load</span>
            <h3 className="text-2xl font-black text-amber-500 font-mono mt-1">{totalActiveLoad.toFixed(1)} kW</h3>
            <span className="text-[10px] text-[var(--text-secondary)] mt-1 block">Available: {totalAvailablePower.toFixed(1)} kW</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
            <Zap size={24} />
          </div>
        </div>

        <div className="theme-card p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[var(--text-secondary)] font-extrabold uppercase tracking-wider block">Active Stations</span>
            <h3 className="text-2xl font-black text-[var(--text-primary)] font-mono mt-1">{stations.length} Stations</h3>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 block">Operational & Protected</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center">
            <Building2 size={24} />
          </div>
        </div>
      </div>

      {/* 4. STATION OWNER POWER MANAGEMENT SECTION */}
      <div className="theme-card p-6 md:p-8 rounded-3xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded">
                REAL-TIME GRID MONITOR
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-[var(--text-primary)] flex items-center gap-2">
              <Zap size={24} className="text-amber-500 fill-amber-500" /> POWER MANAGEMENT
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Configurable electrical limit enforcement preventing overload across station bays.
            </p>
          </div>

          {/* Station Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--text-secondary)] font-bold uppercase shrink-0">Station:</label>
            <select
              value={selectedStationIndex}
              onChange={(e) => handleStationChange(parseInt(e.target.value, 10))}
              className="theme-input px-3.5 py-2 rounded-xl text-xs font-bold"
            >
              {stations.map((st, idx) => (
                <option key={st.id} value={idx}>
                  {st.name || st.stationName} (Cap: {st.maxPower || 100} kW)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Power Gauge Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          <div className="p-4 rounded-2xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)]">
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">Maximum Capacity</span>
            <span className="text-2xl font-black text-[var(--text-primary)] block mt-1">{activeStation.maxPower || 100} kW</span>
            <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">Max Current: {activeStation.maxCurrent || 150} A</span>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)]">
            <span className="text-[10px] text-amber-500 uppercase font-bold block">Current Consumption</span>
            <span className="text-2xl font-black text-amber-500 block mt-1">{activeStation.currentLoad || 0} kW</span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-0.5">Active Current: {activeStation.currentCurrent || 0} A</span>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)]">
            <span className="text-[10px] text-emerald-500 uppercase font-bold block">Available Capacity</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block mt-1">{activeStation.availablePower || 100} kW</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5">Grid Reserve: {100 - (activeStation.loadPercentage || 0)}%</span>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)]">
            <span className="text-[10px] text-blue-500 uppercase font-bold block">Bays & Sessions</span>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400 block mt-1">
              {activeStation.activeSessions || 0} Active / {activeStation.availableConnectors ?? (activeStation.totalSlots || 4)} Free
            </span>
            <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">Total Connectors: {activeStation.totalSlots || 4}</span>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="p-5 rounded-2xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] space-y-3">
          <div className="flex items-center justify-between text-xs font-mono font-bold">
            <span className="text-[var(--text-primary)] flex items-center gap-1.5">
              <Gauge size={14} className="text-amber-500" /> Station Power Monitor ({activeStation.name})
            </span>
            <span className={activeStation.loadPercentage > 85 ? "text-rose-500" : activeStation.loadPercentage > 60 ? "text-amber-500" : "text-emerald-500"}>
              {activeStation.loadPercentage || 0}% Grid Load
            </span>
          </div>

          <div className="w-full bg-[var(--bg-app)] h-4 rounded-full overflow-hidden p-0.5 border border-[var(--border-subtle)]">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                activeStation.loadPercentage > 85
                  ? "bg-rose-500 animate-pulse"
                  : activeStation.loadPercentage > 60
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, activeStation.loadPercentage || 0)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)] pt-1">
            <span>0 kW</span>
            <span>Current: {activeStation.currentLoad || 0} kW</span>
            <span>Max: {activeStation.maxPower || 100} kW</span>
          </div>
        </div>

        {/* Owner Power Configuration Panel */}
        <div className="p-5 rounded-2xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-bold text-[var(--text-primary)] text-sm">Configure Electrical Power Limit</h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Adjust the station's transformer limit. The system will automatically reject any bookings that exceed this value.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block font-mono">Max Power (kW)</label>
              <input
                type="number"
                min="30"
                max="500"
                value={customMaxPower}
                onChange={(e) => setCustomMaxPower(e.target.value)}
                className="theme-input w-28 px-3 py-2 rounded-xl text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block font-mono">Max Current (A)</label>
              <input
                type="number"
                min="50"
                max="800"
                value={customMaxCurrent}
                onChange={(e) => setCustomMaxCurrent(e.target.value)}
                className="theme-input w-28 px-3 py-2 rounded-xl text-xs font-mono font-bold"
              />
            </div>

            <button
              disabled={isUpdatingPower}
              onClick={handleSavePowerConfig}
              className="mt-4 sm:mt-0 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs tracking-wider uppercase transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              {isUpdatingPower ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>Save Limits</span>
            </button>
          </div>
        </div>

        {powerSaveMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-mono">
            {powerSaveMsg}
          </div>
        )}
      </div>

      {/* Revenue & Utilization Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 theme-card p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-[var(--text-primary)] text-base">Weekly Revenue Analytics (₹)</h3>
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
              Total: ₹1,15,850
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-subtle)", borderRadius: "12px", color: "var(--text-primary)" }}
                  formatter={(val) => [`₹${val}`, "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 theme-card p-6 rounded-3xl space-y-4">
          <h3 className="font-extrabold text-[var(--text-primary)] text-base">Operational Bay Status</h3>
          <div className="space-y-3">
            {stations.slice(0, 4).map((st) => {
              const av = st.availableSlots || st.available_slots || 2;
              const tot = st.totalSlots || st.total_slots || 4;
              const pct = tot > 0 ? Math.round(((tot - av) / tot) * 100) : 50;
              return (
                <div key={st.id} className="p-3.5 rounded-2xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="font-bold text-[var(--text-primary)] truncate max-w-[150px]">{st.name || st.stationName}</span>
                    <span className="text-blue-600 dark:text-blue-400">{av} / {tot} Free</span>
                  </div>
                  <div className="w-full bg-[var(--bg-app)] h-2 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. REAL-TIME BOOKING MANAGEMENT SYSTEM */}
      <div className="pt-2">
        <RealtimeBookingsManager
          showStats={true}
          title="Live Customer Bookings & Dispatch"
        />
      </div>
    </div>
  );
}
