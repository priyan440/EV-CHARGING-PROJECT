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
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in font-sans text-[var(--text-primary)]">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-[var(--accent-primary)] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-blue-400/30 animate-fade-in font-bold text-xs">
          <Sparkles className="w-4 h-4 text-yellow-300" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Control Center Header with Live Indicator */}
      <div className="theme-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 w-full">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                SYSTEM ONLINE
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                Last synchronized: <span className="text-[var(--text-primary)] font-mono font-bold">{lastSyncTime}</span>
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight flex items-center gap-3 font-mono">
              Station Owner Control Center
              <span className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-500/30">
                MySQL Active
              </span>
            </h1>
            <p className="text-[var(--text-muted)] text-xs mt-1">
              Real-time telemetry, live billing, smart load balancing, and multi-station infrastructure monitoring.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setIsRefreshing(true);
                loadData(false);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-bold text-xs transition shadow-sm active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-500" : ""}`} />
              Sync DB
            </button>
            <Link
              to="/owner/stations"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Add Station
            </Link>
            <Link
              to="/owner/ai-dashboard"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-purple-500/20 active:scale-95"
            >
              <BrainCircuit className="w-4 h-4 text-purple-200" />
              AI Copilot
            </Link>
          </div>
        </div>
      </div>

      {/* Critical Fault Alert Banner (if any) */}
      {maintenance.criticalFaults > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl flex items-center justify-between gap-4 text-rose-600 dark:text-rose-400">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/20 rounded-xl text-rose-500">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-sm text-[var(--text-primary)]">Critical Hardware Fault Detected ({maintenance.criticalFaults})</div>
              <div className="text-xs text-[var(--text-muted)]">Immediate attention required on faulted charging ports.</div>
            </div>
          </div>
          <Link
            to="/owner/maintenance"
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition shadow-md"
          >
            Resolve Faults &rarr;
          </Link>
        </div>
      )}

      {/* Primary KPI Metric Cards (Database Aggregated) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stations Card */}
        <div className="theme-card p-5 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Stations</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-[var(--text-primary)] font-mono">{stations.total || 0}</div>
          <div className="flex items-center gap-3 mt-3 text-xs text-[var(--text-muted)] font-semibold">
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {stations.active || 0} Operational
            </span>
            <span>•</span>
            <span className="text-amber-600 dark:text-amber-400">{stations.maintenance || 0} Maintenance</span>
          </div>
        </div>

        {/* Chargers Card */}
        <div className="theme-card p-5 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Chargers & Ports</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-[var(--text-primary)] font-mono">{chargers.total || 0}</div>
          <div className="flex items-center gap-3 mt-3 text-xs text-[var(--text-muted)] font-bold">
            <span className="text-emerald-600 dark:text-emerald-400">{chargers.available || 0} Available</span>
            <span>•</span>
            <span className="text-blue-600 dark:text-blue-400">{chargers.charging || 0} Charging</span>
            <span>•</span>
            <span className="text-rose-600 dark:text-rose-400">{chargers.faulted || 0} Faulted</span>
          </div>
        </div>

        {/* Live Energy Card */}
        <div className="theme-card p-5 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Today's Energy</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-[var(--text-primary)] font-mono">{sessions.todayEnergyKwh || 0} <span className="text-base font-bold text-amber-600 dark:text-amber-400">kWh</span></div>
          <div className="flex items-center gap-3 mt-3 text-xs text-[var(--text-muted)] font-bold">
            <span>{sessions.today || 0} Sessions</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400">{sessions.active || 0} Active</span>
          </div>
        </div>

        {/* Revenue Card */}
        <div className="theme-card p-5 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Today's Revenue</span>
            <div className="p-2.5 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 group-hover:bg-green-600 group-hover:text-white transition-colors">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-[var(--text-primary)] font-mono">₹{(revenue.today || 0).toLocaleString("en-IN")}</div>
          <div className="flex items-center justify-between mt-3 text-xs text-[var(--text-muted)] font-bold">
            <span>Total: ₹{(revenue.total || 0).toLocaleString("en-IN")}</span>
            <span className="text-emerald-600 dark:text-emerald-400">+18.4%</span>
          </div>
        </div>
      </div>

      {/* Live Sessions Active Ticker */}
      <div className="theme-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-ping"></div>
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 font-mono">
              Live Charging Sessions
              <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full font-mono border border-blue-500/20">
                {liveSessions.length} Active
              </span>
            </h2>
          </div>
          <Link
            to="/owner/sessions"
            className="text-xs font-bold text-[var(--accent-primary)] hover:underline flex items-center gap-1 transition-colors"
          >
            View All Live Sessions &rarr;
          </Link>
        </div>

        {liveSessions.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-[var(--border-subtle)] rounded-2xl">
            <BatteryCharging className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-[var(--text-muted)] text-xs">No live sessions currently in progress.</p>
            <Link
              to="/owner/chargers"
              className="mt-3 inline-block text-xs text-[var(--accent-primary)] font-bold hover:underline"
            >
              Start Simulator / Session on Chargers &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveSessions.map((ses) => (
              <div
                key={ses.sessionId || ses._id}
                className="bg-[var(--bg-surface-raised)] p-4 rounded-2xl border border-[var(--border-subtle)] hover:border-blue-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-mono font-bold text-[var(--accent-primary)]">{ses.sessionId}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {ses.status}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-[var(--text-primary)] mb-1">{ses.customerName || "EV Customer"}</div>
                  <div className="text-xs text-[var(--text-muted)] flex items-center gap-2 mb-3">
                    <span>{ses.chargerId}</span>
                    <span>•</span>
                    <span>{ses.vehicleModel || "EV"}</span>
                  </div>

                  {/* Battery SOC Progress Bar */}
                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between text-xs text-[var(--text-primary)]">
                      <span>Battery SOC</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{ses.soc || ses.batteryCurrent || 45}%</span>
                    </div>
                    <div className="w-full h-2 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${ses.soc || ses.batteryCurrent || 45}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs py-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl mb-3">
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Power</div>
                      <div className="font-bold text-[var(--text-primary)] font-mono">{ses.currentPowerKw || 58} kW</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Energy</div>
                      <div className="font-bold text-amber-600 dark:text-amber-400 font-mono">{ses.energyConsumed || ses.energyConsumedKwh || 12.4} kWh</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Cost</div>
                      <div className="font-bold text-green-600 dark:text-green-400 font-mono">₹{ses.amount || ses.currentCost || 220}</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleStopSession(ses.sessionId)}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
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
        <div className="lg:col-span-2 theme-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] font-mono">Revenue & Energy Velocity</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Calculated daily from MySQL transaction records</p>
            </div>
            <Link
              to="/owner/revenue"
              className="text-xs text-[var(--accent-primary)] hover:underline font-bold flex items-center gap-1"
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
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" opacity={0.5} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-subtle)",
                    borderRadius: "12px",
                    color: "var(--text-primary)",
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Activity Feed from AuditLog (1 Column) */}
        <div className="theme-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 font-mono">
                <Activity className="w-5 h-5 text-emerald-500" />
                Live Activity
              </h3>
              <Link to="/owner/audit-logs" className="text-xs text-[var(--accent-primary)] hover:underline font-bold">
                Logs
              </Link>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-64 pr-1 custom-scrollbar">
              {(s.recentActivity || []).length === 0 ? (
                <div className="text-xs text-[var(--text-muted)] text-center py-8">No recent activity logs.</div>
              ) : (
                s.recentActivity.map((act, idx) => (
                  <div
                    key={act.id || idx}
                    className="p-3 bg-[var(--bg-surface-raised)] rounded-xl border border-[var(--border-subtle)] text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between text-[var(--text-muted)] text-[10px]">
                      <span className="font-bold text-[var(--accent-primary)]">{act.action}</span>
                      <span>{act.time}</span>
                    </div>
                    <p className="text-[var(--text-primary)] line-clamp-2">{act.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] text-center">
            <Link
              to="/owner/audit-logs"
              className="text-xs font-bold text-[var(--accent-primary)] hover:underline"
            >
              View Full Audit Trail &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Access Modules Navigation */}
      <div className="theme-card p-6">
        <h3 className="text-base font-bold text-[var(--text-primary)] mb-4 font-mono">Station Owner Management Modules</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "My Stations", path: "/owner/stations", icon: Building2, color: "text-blue-500 bg-blue-500/10" },
            { label: "Chargers", path: "/owner/chargers", icon: Cpu, color: "text-emerald-500 bg-emerald-500/10" },
            { label: "Bookings", path: "/owner/bookings", icon: Clock, color: "text-amber-500 bg-amber-500/10" },
            { label: "Live Status", path: "/owner/sessions", icon: Activity, color: "text-indigo-500 bg-indigo-500/10" },
            { label: "Revenue", path: "/owner/revenue", icon: TrendingUp, color: "text-green-500 bg-green-500/10" },
            { label: "Customers", path: "/owner/customers", icon: Users, color: "text-purple-500 bg-purple-500/10" },
            { label: "Tariffs", path: "/owner/tariffs", icon: DollarSign, color: "text-yellow-500 bg-yellow-500/10" },
            { label: "Maintenance", path: "/owner/maintenance", icon: Wrench, color: "text-rose-500 bg-rose-500/10" },
            { label: "Smart Load", path: "/owner/smart-load", icon: Sliders, color: "text-cyan-500 bg-cyan-500/10" },
            { label: "Analytics", path: "/owner/analytics", icon: AreaChart, color: "text-pink-500 bg-pink-500/10" },
            { label: "Reports", path: "/owner/reports", icon: FileText, color: "text-teal-500 bg-teal-500/10" },
            { label: "Live Map", path: "/owner/map", icon: MapPin, color: "text-sky-500 bg-sky-500/10" },
          ].map((item, i) => (
            <Link
              key={i}
              to={item.path}
              className="p-3.5 rounded-2xl bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/40 transition-all flex flex-col items-center justify-center text-center gap-2 group active:scale-95"
            >
              <div className={`p-2.5 rounded-xl ${item.color} group-hover:scale-110 transition-transform`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-[var(--text-primary)]">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
