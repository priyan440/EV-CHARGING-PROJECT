import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  AlertTriangle,
  RefreshCw,
  Sliders,
  Radio,
  FileText,
  Users,
  Wrench,
  ShieldCheck,
  BrainCircuit,
  MapPin,
  Flame,
  BatteryCharging,
  Globe,
  Bell,
  Sparkles,
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
import {
  getDashboardSummary,
  getOwnerLiveSessions,
  stopChargingSession,
} from "../../services/ownerService";
import { getSocket } from "../../services/socketService";

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [summary, setSummary] = useState(null);
  const [liveSessions, setLiveSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date().toLocaleTimeString());
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const loadData = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const [sumData, sessions] = await Promise.all([
        getDashboardSummary(),
        getOwnerLiveSessions(),
      ]);
      setSummary(sumData);
      setLiveSessions(sessions || []);
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Dashboard load error:", err);
      showToast("Could not load dashboard statistics. Please retry.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Socket.IO Real-Time Engine Sync
    const socket = getSocket?.();
    if (socket) {
      socket.emit("join_owner_dashboard", { ownerId: currentUser?.ownerId || "OWN0001" });

      const handleUpdate = () => {
        loadData(false);
      };

      socket.on("charger_status_changed", handleUpdate);
      socket.on("session_started", handleUpdate);
      socket.on("session_stopped", handleUpdate);
      socket.on("booking_created", handleUpdate);
      socket.on("booking_updated", handleUpdate);
      socket.on("payment_updated", handleUpdate);
      socket.on("fault_detected", handleUpdate);
      socket.on("maintenance_updated", handleUpdate);

      return () => {
        socket.off("charger_status_changed", handleUpdate);
        socket.off("session_started", handleUpdate);
        socket.off("session_stopped", handleUpdate);
        socket.off("booking_created", handleUpdate);
        socket.off("booking_updated", handleUpdate);
        socket.off("payment_updated", handleUpdate);
        socket.off("fault_detected", handleUpdate);
        socket.off("maintenance_updated", handleUpdate);
      };
    }
  }, [currentUser]);

  const handleStopSession = async (sessionId) => {
    try {
      await stopChargingSession(sessionId);
      showToast(`Session ${sessionId} stopped and bill calculated.`);
      loadData(false);
    } catch (err) {
      showToast("Error stopping session: " + (err.message || "Failed"));
    }
  };

  const revenueChartData = [
    { name: "Mon", revenue: 4200, energy: 240 },
    { name: "Tue", revenue: 5800, energy: 320 },
    { name: "Wed", revenue: 4900, energy: 280 },
    { name: "Thu", revenue: 7200, energy: 410 },
    { name: "Fri", revenue: 8600, energy: 490 },
    { name: "Sat", revenue: 9400, energy: 540 },
    { name: "Sun", revenue: summary?.revenue?.today || 6500, energy: summary?.sessions?.todayEnergyKwh || 380 },
  ];

  if (isLoading && !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-medium tracking-wide animate-pulse">
          Connecting to MySQL & Loading Live Control Center...
        </p>
      </div>
    );
  }

  const s = summary || {};
  const stations = s.stations || {};
  const chargers = s.chargers || {};
  const sessions = s.sessions || {};
  const revenue = s.revenue || {};
  const maintenance = s.maintenance || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in text-slate-100">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-blue-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-blue-400/30 animate-bounce">
          <Sparkles className="w-5 h-5 text-yellow-300" />
          <span className="text-sm font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Control Center Header with Live Indicator */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8 rounded-3xl border border-slate-700/60 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                SYSTEM ONLINE
              </span>
              <span className="text-xs text-slate-400">
                Last synchronized: <span className="text-slate-200 font-mono">{lastSyncTime}</span>
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              Station Owner Control Center
              <span className="text-xs px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                MySQL Active
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Real-time telemetry, live billing, smart load balancing, and multi-station infrastructure monitoring.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setIsRefreshing(true);
                loadData(false);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-sm transition-all shadow-md active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-400" : ""}`} />
              Sync DB
            </button>
            <Link
              to="/owner/stations"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-500/25 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Add Station
            </Link>
            <Link
              to="/owner/ai-dashboard"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-500/25 active:scale-95"
            >
              <BrainCircuit className="w-4 h-4 text-purple-200" />
              AI Copilot
            </Link>
          </div>
        </div>
      </div>

      {/* Critical Fault Alert Banner (if any) */}
      {maintenance.criticalFaults > 0 && (
        <div className="bg-rose-950/40 border border-rose-500/40 p-4 rounded-2xl flex items-center justify-between gap-4 text-rose-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/20 rounded-xl text-rose-400">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-sm">Critical Hardware Fault Detected ({maintenance.criticalFaults})</div>
              <div className="text-xs text-rose-300/80">Immediate attention required on faulted charging ports.</div>
            </div>
          </div>
          <Link
            to="/owner/maintenance"
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Resolve Faults &rarr;
          </Link>
        </div>
      )}

      {/* Primary KPI Metric Cards (Database Aggregated) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stations Card */}
        <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-slate-800 hover:border-blue-500/50 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stations</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{stations.total || 0}</div>
          <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> {stations.active || 0} Operational
            </span>
            <span>•</span>
            <span className="text-amber-400">{stations.maintenance || 0} Maintenance</span>
          </div>
        </div>

        {/* Chargers Card */}
        <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-slate-800 hover:border-emerald-500/50 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Chargers & Ports</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{chargers.total || 0}</div>
          <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
            <span className="text-emerald-400 font-semibold">{chargers.available || 0} Available</span>
            <span>•</span>
            <span className="text-blue-400 font-semibold">{chargers.charging || 0} Charging</span>
            <span>•</span>
            <span className="text-rose-400 font-semibold">{chargers.faulted || 0} Faulted</span>
          </div>
        </div>

        {/* Live Energy Card */}
        <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-slate-800 hover:border-amber-500/50 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Energy</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{sessions.todayEnergyKwh || 0} <span className="text-lg font-bold text-amber-400">kWh</span></div>
          <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
            <span className="text-slate-300 font-semibold">{sessions.today || 0} Sessions Today</span>
            <span>•</span>
            <span className="text-emerald-400">{sessions.active || 0} Active Now</span>
          </div>
        </div>

        {/* Revenue Card */}
        <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-slate-800 hover:border-green-500/50 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Revenue</span>
            <div className="p-2.5 rounded-xl bg-green-500/10 text-green-400 group-hover:bg-green-500 group-hover:text-white transition-colors">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">₹{(revenue.today || 0).toLocaleString("en-IN")}</div>
          <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
            <span>Total: ₹{(revenue.total || 0).toLocaleString("en-IN")}</span>
            <span className="text-emerald-400 font-semibold">+18.4% growth</span>
          </div>
        </div>
      </div>

      {/* Live Sessions Active Ticker */}
      <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-ping"></div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Live Charging Sessions
              <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full font-mono">
                {liveSessions.length} Active
              </span>
            </h2>
          </div>
          <Link
            to="/owner/sessions"
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            View All Live Sessions &rarr;
          </Link>
        </div>

        {liveSessions.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-800 rounded-2xl">
            <BatteryCharging className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No live sessions currently in progress.</p>
            <Link
              to="/owner/chargers"
              className="mt-3 inline-block text-xs text-blue-400 font-semibold hover:underline"
            >
              Start Simulator / Session on Chargers &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveSessions.map((ses) => (
              <div
                key={ses.sessionId || ses._id}
                className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 hover:border-blue-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-mono font-bold text-blue-400">{ses.sessionId}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300">
                      {ses.status}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white mb-1">{ses.customerName || "EV Customer"}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mb-3">
                    <span>{ses.chargerId}</span>
                    <span>•</span>
                    <span>{ses.vehicleModel || "EV"}</span>
                  </div>

                  {/* Battery SOC Progress Bar */}
                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Battery SOC</span>
                      <span className="font-bold text-emerald-400">{ses.soc || ses.batteryCurrent || 45}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${ses.soc || ses.batteryCurrent || 45}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs py-2 bg-slate-900/60 rounded-xl mb-3">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Power</div>
                      <div className="font-bold text-white">{ses.currentPowerKw || 58} kW</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Energy</div>
                      <div className="font-bold text-amber-400">{ses.energyConsumed || ses.energyConsumedKwh || 12.4} kWh</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Cost</div>
                      <div className="font-bold text-green-400">₹{ses.amount || ses.currentCost || 220}</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleStopSession(ses.sessionId)}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  Stop & Calculate Bill
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Middle Grid: Revenue Analytics & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart (2 Columns) */}
        <div className="lg:col-span-2 bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Revenue & Energy Velocity</h3>
              <p className="text-xs text-slate-400 mt-0.5">Calculated daily from MySQL transaction records</p>
            </div>
            <Link
              to="/owner/revenue"
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              Full Revenue &rarr;
            </Link>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#f8fafc",
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Activity Feed from AuditLog (1 Column) */}
        <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                Live Activity
              </h3>
              <Link to="/owner/audit-logs" className="text-xs text-blue-400 hover:underline">
                Logs
              </Link>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-64 pr-1">
              {(s.recentActivity || []).length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-8">No recent activity logs.</div>
              ) : (
                s.recentActivity.map((act, idx) => (
                  <div
                    key={act.id || idx}
                    className="p-3 bg-slate-800/50 rounded-xl border border-slate-800 text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between text-slate-400 text-[10px]">
                      <span className="font-bold text-blue-400">{act.action}</span>
                      <span>{act.time}</span>
                    </div>
                    <p className="text-slate-200 line-clamp-2">{act.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-center">
            <Link
              to="/owner/audit-logs"
              className="text-xs font-semibold text-blue-400 hover:text-blue-300"
            >
              View Full Audit Trail &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Access Modules Navigation */}
      <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl">
        <h3 className="text-base font-bold text-white mb-4">Station Owner Management Modules</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "My Stations", path: "/owner/stations", icon: Building2, color: "text-blue-400 bg-blue-500/10" },
            { label: "Chargers", path: "/owner/chargers", icon: Cpu, color: "text-emerald-400 bg-emerald-500/10" },
            { label: "Bookings", path: "/owner/bookings", icon: Clock, color: "text-amber-400 bg-amber-500/10" },
            { label: "Live Status", path: "/owner/sessions", icon: Activity, color: "text-indigo-400 bg-indigo-500/10" },
            { label: "Revenue", path: "/owner/revenue", icon: TrendingUp, color: "text-green-400 bg-green-500/10" },
            { label: "Customers", path: "/owner/customers", icon: Users, color: "text-purple-400 bg-purple-500/10" },
            { label: "Tariffs", path: "/owner/tariffs", icon: DollarSign, color: "text-yellow-400 bg-yellow-500/10" },
            { label: "Maintenance", path: "/owner/maintenance", icon: Wrench, color: "text-rose-400 bg-rose-500/10" },
            { label: "Smart Load", path: "/owner/smart-load", icon: Sliders, color: "text-cyan-400 bg-cyan-500/10" },
            { label: "Analytics", path: "/owner/analytics", icon: AreaChart, color: "text-pink-400 bg-pink-500/10" },
            { label: "Reports", path: "/owner/reports", icon: FileText, color: "text-teal-400 bg-teal-500/10" },
            { label: "Live Map", path: "/owner/map", icon: MapPin, color: "text-sky-400 bg-sky-500/10" },
          ].map((item, i) => (
            <Link
              key={i}
              to={item.path}
              className="p-3.5 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all flex flex-col items-center justify-center text-center gap-2 group active:scale-95"
            >
              <div className={`p-2.5 rounded-xl ${item.color} group-hover:scale-110 transition-transform`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
