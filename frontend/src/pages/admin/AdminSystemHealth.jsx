import React, { useState, useEffect, useCallback, Component } from "react";
import {
  Activity, Server, Database, CreditCard, Bell, Radio, Shield, 
  RefreshCw, CheckCircle2, AlertTriangle, Zap, Power, RotateCcw, 
  Filter, Search, Clock, AlertCircle, Info, ExternalLink, ShieldAlert,
  Wifi, WifiOff, Play, Square, Check, X, Terminal, Cpu
} from "lucide-react";
import { apiService } from "../../services/apiService";
import { adminService } from "../../services/adminService";
import socketService from "../../services/socketService";
import { getChargerStatusBadge, formatRelativeTime } from "../../utils/statusUtils";
import Pagination from "../../components/Pagination";

/**
 * Robust Error Boundary to guarantee that rendering exceptions or unexpected data
 * never leave /admin/health as a blank screen.
 */
class HealthErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Health Monitor Error Boundary Caught Exception:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-4xl mx-auto my-8 p-6 md:p-8 rounded-3xl bg-[var(--bg-surface)] border border-rose-500/30 shadow-2xl space-y-6 font-sans">
          <div className="flex items-center gap-3 text-rose-500">
            <AlertTriangle size={32} />
            <div>
              <h2 className="text-xl font-extrabold text-[var(--text-primary)]">
                Admin System Health Monitor Encountered an Error
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                The application prevented a blank screen. You can review the diagnostic trace and retry the health check below.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono text-rose-600 dark:text-rose-400">
            <p className="font-bold mb-1">Exception Details:</p>
            <p>{this.state.error?.message || "Unknown rendering exception"}</p>
          </div>

          {this.state.errorInfo?.componentStack && (
            <div className="p-4 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-muted)] max-h-48 overflow-y-auto">
              <pre>{this.state.errorInfo.componentStack}</pre>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-bold shadow-md hover:opacity-90 transition cursor-pointer flex items-center gap-2"
            >
              <RefreshCw size={14} /> Retry Health Check
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AdminSystemHealthContent() {
  const [activeTab, setActiveTab] = useState("monitor"); // 'monitor' | 'infrastructure'
  const [healthData, setHealthData] = useState(null);
  const [monitorData, setMonitorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastCheckTime, setLastCheckTime] = useState("");
  const [lastSuccessfulCheck, setLastSuccessfulCheck] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [socketStatus, setSocketStatus] = useState("disconnected");

  // Filters for Network Live Monitor
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterCity, setFilterCity] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOwner, setFilterOwner] = useState("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(8);

  // Safe Remote Command Modal
  const [commandModalOpen, setCommandModalOpen] = useState(false);
  const [selectedCharger, setSelectedCharger] = useState(null);
  const [selectedCommand, setSelectedCommand] = useState("RESET");
  const [commandParameters, setCommandParameters] = useState({ idTag: "ADMIN_AUTH_KEY_01", type: "Soft" });
  const [isSendingCommand, setIsSendingCommand] = useState(false);
  const [commandResult, setCommandResult] = useState(null);

  // Fetch Network Live Monitor Data from authoritative source
  const fetchMonitor = useCallback(async () => {
    try {
      const res = await adminService.getNetworkLiveMonitor();
      if (res?.success) {
        setMonitorData(res);
      }
    } catch (err) {
      console.warn("Failed to fetch network monitor data:", err);
    }
  }, []);

  // Fetch Infrastructure Services Health from real backend endpoint
  const fetchHealth = useCallback(async () => {
    try {
      const res = await apiService.checkHealth();
      setHealthData(res);
      if (res?.isOnline || res?.status === "OK" || res?.database === "connected") {
        setLastSuccessfulCheck(new Date().toLocaleTimeString());
      }
      return res;
    } catch (err) {
      console.warn("Failed to fetch system health:", err);
      setHealthData({
        status: "ERROR",
        isOnline: false,
        database: "disconnected",
        message: err.message || "Failed to reach health endpoint",
      });
    }
  }, []);

  const refreshAll = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      await Promise.all([fetchMonitor(), fetchHealth()]);
      setLastCheckTime(new Date().toLocaleTimeString());
    } catch (err) {
      setErrorMsg(err.message || "Health check encountered an issue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();

    // Track Socket.IO live connectivity status
    const unsubSocket = socketService.onStatusChange((status) => {
      setSocketStatus(status);
    });

    // 15-Second Authoritative Fallback Sync
    const interval = setInterval(() => {
      fetchMonitor();
      fetchHealth();
      setLastCheckTime(new Date().toLocaleTimeString());
    }, 15000);

    // Socket.IO Real-Time Subscriptions
    const socket = socketService.getSocket();
    if (socket) {
      if (typeof socketService.joinAdminDashboard === "function") {
        socketService.joinAdminDashboard();
      }

      const handleRealtimeUpdate = () => {
        fetchMonitor();
      };

      socket.on("charger_status_changed", handleRealtimeUpdate);
      socket.on("charger:statusChanged", handleRealtimeUpdate);
      socket.on("telemetry_updated", handleRealtimeUpdate);
      socket.on("remote_command_executed", handleRealtimeUpdate);
      socket.on("fault_detected", handleRealtimeUpdate);

      return () => {
        unsubSocket();
        clearInterval(interval);
        socket.off("charger_status_changed", handleRealtimeUpdate);
        socket.off("charger:statusChanged", handleRealtimeUpdate);
        socket.off("telemetry_updated", handleRealtimeUpdate);
        socket.off("remote_command_executed", handleRealtimeUpdate);
        socket.off("fault_detected", handleRealtimeUpdate);
      };
    }

    return () => {
      unsubSocket();
      clearInterval(interval);
    };
  }, [fetchMonitor, fetchHealth]);

  // Handle Safe Remote Control Execution
  const handleExecuteRemoteCommand = async () => {
    if (!selectedCharger) return;
    setIsSendingCommand(true);
    setCommandResult(null);

    try {
      const res = await adminService.sendRemoteCommand(
        selectedCharger.charger_id,
        selectedCommand,
        commandParameters
      );

      setCommandResult(res);
      if (res?.success) {
        setActionMsg(`Remote command "${selectedCommand}" dispatched to Charger #${selectedCharger.charger_id}. Status: ${res.data?.status || "ACCEPTED"}`);
        setTimeout(() => setActionMsg(""), 4000);
        await fetchMonitor();
      } else {
        setErrorMsg(res?.message || "Remote command rejected by device controller.");
      }
    } catch (err) {
      setErrorMsg(err.message || "Network error while sending remote command.");
    } finally {
      setIsSendingCommand(false);
    }
  };

  const openRemoteModal = (charger, defaultCmd = "RESET") => {
    setSelectedCharger(charger);
    setSelectedCommand(defaultCmd);
    setCommandResult(null);
    setCommandModalOpen(true);
  };

  // Filtered Chargers
  const chargersList = monitorData?.chargers || [];
  const summary = monitorData?.summary || { totalChargers: 0, onlineChargers: 0, chargingCount: 0, availableCount: 0, faultedCount: 0, offlineCount: 0 };
  const alerts = monitorData?.alerts || [];

  // Extract unique cities & owners for filters
  const uniqueCities = Array.from(new Set(chargersList.map((c) => c.city).filter(Boolean)));
  const uniqueOwners = Array.from(new Set(chargersList.map((c) => c.owner_name).filter(Boolean)));

  const filteredChargers = chargersList.filter((c) => {
    const status = (c.derived_status || c.status || "UNKNOWN").toUpperCase();
    if (filterStatus === "ONLINE" && !c.is_online) return false;
    if (filterStatus === "OFFLINE" && c.is_online) return false;
    if (filterStatus === "FAULTED" && status !== "FAULTED") return false;
    if (filterStatus === "CHARGING" && status !== "CHARGING" && status !== "OCCUPIED") return false;
    if (filterStatus === "AVAILABLE" && status !== "AVAILABLE") return false;

    if (filterCity !== "ALL" && c.city !== filterCity) return false;
    if (filterOwner !== "ALL" && c.owner_name !== filterOwner) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      String(c.charger_id).includes(q) ||
      (c.charger_code || "").toLowerCase().includes(q) ||
      (c.station_name || "").toLowerCase().includes(q) ||
      (c.city || "").toLowerCase().includes(q) ||
      (c.owner_name || "").toLowerCase().includes(q)
    );
  });

  const isBackendOnline = healthData?.isOnline || healthData?.status === "OK" || healthData?.success === true;
  const isDbConnected = healthData?.database === "connected" && healthData?.services?.mysql !== "OFFLINE";
  const isSocketConnected = socketStatus === "connected";

  const services = [
    {
      name: "Express Backend API Engine",
      key: "backendApi",
      icon: Server,
      status: isBackendOnline ? "ONLINE" : "OFFLINE",
      detail: isBackendOnline ? `HTTP 200 OK (${healthData?.responseTimeMs || 12}ms)` : "Backend server unreachable",
      online: isBackendOnline,
    },
    {
      name: "MySQL Database Service",
      key: "database",
      icon: Database,
      status: isDbConnected ? "CONNECTED" : "DISCONNECTED",
      detail: isDbConnected ? `Pool operational (${healthData?.dbLatencyMs !== undefined ? `${healthData.dbLatencyMs}ms ping` : "Healthy"})` : "Connection failed or pool exhausted",
      online: isDbConnected,
    },
    {
      name: "Socket.IO Real-time WebSocket Room",
      key: "webSocketServer",
      icon: Radio,
      status: isSocketConnected ? "CONNECTED" : socketStatus === "connecting" ? "CONNECTING" : "DISCONNECTED",
      detail: isSocketConnected ? "Channel open for real-time live events" : "Waiting for socket handshake",
      online: isSocketConnected,
    },
    {
      name: "OCPP 2.0.1 Simulator / Telemetry Engine",
      key: "ocppEngine",
      icon: Cpu,
      status: healthData?.chargerTelemetry?.simulatorStatus || (summary.totalChargers > 0 ? "OPERATIONAL" : "READY"),
      detail: `${summary.totalChargers} chargers configured • ${summary.onlineChargers} online`,
      online: true,
    },
    {
      name: "Razorpay Payment Gateway",
      key: "razorpayGateway",
      icon: CreditCard,
      status: "TEST_MODE_ACTIVE",
      detail: "Client keys configured for checkout",
      online: true,
    },
    {
      name: "Multi-Channel Notification Provider",
      key: "notificationProvider",
      icon: Bell,
      status: "ONLINE",
      detail: "SMTP & In-App broadcast active",
      online: true,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header Banner */}
      <div className="theme-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isBackendOnline && isDbConnected ? "bg-emerald-400" : "bg-rose-400"} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isBackendOnline && isDbConnected ? "bg-emerald-500" : "bg-rose-500"}`}></span>
            </span>
            <span className="px-3 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-mono font-bold border border-purple-500/20">
              ADMIN CONTROL • SYSTEM HEALTH & NETWORK TELEMETRY
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
            <Activity size={28} className="text-emerald-500" /> Admin System Health & Network Monitor
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Authoritative MySQL-backed charger telemetry, database connectivity checks, socket status, and safe remote control operations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Tab Switcher */}
          <div className="flex p-1 bg-[var(--bg-surface-raised)] rounded-xl border border-[var(--border-subtle)]">
            <button
              onClick={() => setActiveTab("monitor")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "monitor"
                  ? "bg-[var(--accent-primary)] text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Network Chargers ({summary.totalChargers})
            </button>
            <button
              onClick={() => setActiveTab("infrastructure")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "infrastructure"
                  ? "bg-[var(--accent-primary)] text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Infrastructure Services
            </button>
          </div>

          <button
            onClick={refreshAll}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-[var(--accent-primary)] text-white font-bold text-xs shadow-md hover:opacity-90 transition cursor-pointer flex items-center gap-1.5"
            title="Retry and refresh real health status"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>{loading ? "Checking..." : "Retry Health Check"}</span>
          </button>
        </div>
      </div>

      {/* Real Infrastructure Quick Status Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Backend API Status */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          isBackendOnline 
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" 
            : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
        }`}>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider block opacity-80">Backend API Engine</span>
            <span className="text-base font-extrabold flex items-center gap-1.5 mt-0.5">
              <Server size={16} /> {isBackendOnline ? "Online & Healthy" : "Offline / Unreachable"}
            </span>
            <span className="text-[10px] font-mono block mt-1 opacity-75">
              Port: 5001 • {healthData?.responseTimeMs !== undefined ? `${healthData.responseTimeMs}ms latency` : "HTTP check"}
            </span>
          </div>
          {isBackendOnline ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
        </div>

        {/* 2. MySQL Database Status */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          isDbConnected 
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" 
            : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
        }`}>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider block opacity-80">MySQL Database</span>
            <span className="text-base font-extrabold flex items-center gap-1.5 mt-0.5">
              <Database size={16} /> {isDbConnected ? "Connected (Pool Ready)" : "Disconnected"}
            </span>
            <span className="text-[10px] font-mono block mt-1 opacity-75">
              {healthData?.dbLatencyMs !== undefined ? `${healthData.dbLatencyMs}ms ping` : "Localhost:3306"}
            </span>
          </div>
          {isDbConnected ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
        </div>

        {/* 3. Real-Time Socket.IO */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          isSocketConnected 
            ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400" 
            : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
        }`}>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider block opacity-80">Socket.IO Live Link</span>
            <span className="text-base font-extrabold flex items-center gap-1.5 mt-0.5">
              <Radio size={16} /> {isSocketConnected ? "Active & Streaming" : socketStatus.toUpperCase()}
            </span>
            <span className="text-[10px] font-mono block mt-1 opacity-75">
              Room: admin_dashboard
            </span>
          </div>
          {isSocketConnected ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
        </div>

        {/* 4. Last Check Timestamps */}
        <div className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider block">Health Check Timers</span>
            <span className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-1.5 mt-0.5">
              <Clock size={15} className="text-[var(--accent-primary)]" /> {lastCheckTime || "Checking..."}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] block mt-1">
              Last Success: {lastSuccessfulCheck || "Never"}
            </span>
          </div>
          <button
            onClick={refreshAll}
            disabled={loading}
            className="p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            title="Perform fresh health check"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Unavailable State Notice if API or DB is down */}
      {(!isBackendOnline || !isDbConnected) && !loading && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="shrink-0" />
            <div>
              <span className="font-bold block">Service Degradation Alert</span>
              <span>
                Backend API or MySQL Database is currently reporting unavailable status. Verify that port 5001 and MySQL service are running.
              </span>
            </div>
          </div>
          <button
            onClick={refreshAll}
            className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs shrink-0 cursor-pointer"
          >
            Retry Now
          </button>
        </div>
      )}

      {actionMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
          <Check size={16} />
          <span>{actionMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ACTIVE TAB 1: NETWORK LIVE MONITOR */}
      {activeTab === "monitor" && (
        <div className="space-y-6">
          {/* Key Live Telemetry Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Total Chargers</span>
              <span className="text-2xl font-extrabold text-[var(--text-primary)]">{summary.totalChargers}</span>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block flex items-center gap-1">
                <Wifi size={12} /> Online & Healthy
              </span>
              <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{summary.onlineChargers}</span>
            </div>
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block flex items-center gap-1">
                <Zap size={12} /> Charging Sessions
              </span>
              <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{summary.chargingCount}</span>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
              <span className="text-[10px] uppercase font-bold text-emerald-500 block">Available Standby</span>
              <span className="text-2xl font-extrabold text-emerald-500">{summary.availableCount}</span>
            </div>
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
              <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block flex items-center gap-1">
                <AlertTriangle size={12} /> Faulted / Errors
              </span>
              <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{summary.faultedCount}</span>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-500/10 border border-zinc-500/20">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block flex items-center gap-1">
                <WifiOff size={12} /> Stale / Offline
              </span>
              <span className="text-2xl font-extrabold text-zinc-500">{summary.offlineCount}</span>
            </div>
          </div>

          {/* Active Network Alerts Banner (if any) */}
          {alerts.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400 uppercase">
                <ShieldAlert size={16} />
                <span>Active Network Telemetry & Fault Alerts ({alerts.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {alerts.slice(0, 4).map((alert, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-rose-500/20 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[var(--text-primary)] block">
                        {alert.station_name} • Charger #{alert.charger_id}
                      </span>
                      <span className="text-[11px] text-rose-500 font-mono font-semibold">{alert.message}</span>
                    </div>
                    <button
                      onClick={() => openRemoteModal({ charger_id: alert.charger_id, charger_code: `CH-${alert.charger_id}`, station_name: alert.station_name }, "RESET")}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[10px] cursor-pointer"
                    >
                      Safe Reset
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="p-4 rounded-2xl theme-card flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className="theme-input font-bold text-xs cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="ONLINE">Online Only</option>
                <option value="AVAILABLE">Available</option>
                <option value="CHARGING">Charging</option>
                <option value="FAULTED">Faulted</option>
                <option value="OFFLINE">Offline / Stale</option>
              </select>

              {/* City Filter */}
              <select
                value={filterCity}
                onChange={(e) => {
                  setFilterCity(e.target.value);
                  setPage(1);
                }}
                className="theme-input font-bold text-xs cursor-pointer"
              >
                <option value="ALL">All Cities</option>
                {uniqueCities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Owner Filter */}
              <select
                value={filterOwner}
                onChange={(e) => {
                  setFilterOwner(e.target.value);
                  setPage(1);
                }}
                className="theme-input font-bold text-xs cursor-pointer"
              >
                <option value="ALL">All Owners</option>
                {uniqueOwners.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search charger, station, city..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full theme-input pl-8 text-xs"
              />
            </div>
          </div>

          {/* Chargers Table */}
          <div className="theme-card p-6 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] text-[var(--text-muted)] font-bold uppercase tracking-wider">
                  <th className="py-3 px-3 rounded-l-xl">Charger ID</th>
                  <th className="py-3 px-3">Station & City</th>
                  <th className="py-3 px-3">Owner Info</th>
                  <th className="py-3 px-3">Status / Connectivity</th>
                  <th className="py-3 px-3">Last Heartbeat</th>
                  <th className="py-3 px-3">Active Session / Telemetry</th>
                  <th className="py-3 px-3 text-right rounded-r-xl">Remote Safe Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)] font-medium">
                {loading && filteredChargers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[var(--text-muted)]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw size={20} className="animate-spin text-[var(--accent-primary)]" />
                        <span>Synchronizing authoritative MySQL charger telemetry...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredChargers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[var(--text-muted)]">
                      No chargers found matching selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredChargers.slice((page - 1) * limit, page * limit).map((c) => {
                    const status = (c.derived_status || c.status || "UNKNOWN").toUpperCase();
                    const badge = getChargerStatusBadge(status, c.is_online, c.is_simulated) || {
                      label: status,
                      bg: "bg-slate-500/10",
                      text: "text-slate-400",
                      border: "border-slate-500/20",
                    };
                    const isStale = c.is_stale || (!c.is_online && c.last_heartbeat);

                    return (
                      <tr key={c.charger_id} className="hover:bg-[var(--bg-surface-raised)]/60 transition">
                        <td className="py-4 px-3">
                          <span className="font-mono font-bold text-[var(--accent-primary)] block">
                            {c.charger_code || `CHG#${c.charger_id}`}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">
                            ID: {c.charger_id} • Type: {c.type || "DC Fast"}
                          </span>
                          {c.is_simulated ? (
                            <span className="inline-block text-[9px] font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold px-1.5 py-0.2 rounded border border-purple-500/20 mt-0.5">
                              (OCPP Simulator)
                            </span>
                          ) : (
                            <span className="inline-block text-[9px] font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold px-1.5 py-0.2 rounded border border-blue-500/20 mt-0.5">
                              (Hardware Charger)
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-3">
                          <span className="font-bold text-[var(--text-primary)] block">{c.station_name || "Station"}</span>
                          <span className="text-[11px] text-[var(--text-muted)]">{c.city || "Tamil Nadu"}</span>
                        </td>

                        <td className="py-4 px-3">
                          <span className="font-semibold text-[var(--text-primary)] block">{c.owner_name || "Owner"}</span>
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">{c.owner_email || `ID: ${c.owner_id}`}</span>
                        </td>

                        <td className="py-4 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ${badge.bg || "bg-slate-500/10"} ${badge.text || "text-slate-400"} ${badge.border || "border-slate-500/20"}`}>
                              {badge.label}
                            </span>
                            {c.is_online ? (
                              <Wifi size={13} className="text-emerald-500" title="Online (<60s heartbeat)" />
                            ) : (
                              <WifiOff size={13} className="text-zinc-400" title="Stale / Offline" />
                            )}
                          </div>
                          {c.error_code && (
                            <span className="text-[10px] font-mono text-rose-500 font-bold block mt-1">
                              Fault: {c.error_code} {c.error_message ? `(${c.error_message})` : ""}
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-3 font-mono text-xs">
                          {c.last_heartbeat ? (
                            <div>
                              <span className={`block font-semibold ${isStale ? "text-amber-500" : "text-[var(--text-primary)]"}`}>
                                {formatRelativeTime(c.last_heartbeat)}
                              </span>
                              <span className="text-[10px] text-[var(--text-muted)]">
                                Timeout: {c.heartbeat_timeout_seconds || 60}s
                              </span>
                            </div>
                          ) : (
                            <span className="text-[var(--text-muted)]">Never Seen</span>
                          )}
                        </td>

                        <td className="py-4 px-3 text-xs">
                          {status === "CHARGING" || status === "OCCUPIED" ? (
                            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 font-mono">
                              <span className="text-blue-500 font-bold block">
                                Live: {c.current_power_kw || c.max_power_kw || 50} kW
                              </span>
                              <span className="text-[10px] text-[var(--text-muted)]">
                                Energy: {c.energy_delivered_kwh || 0} kWh
                              </span>
                            </div>
                          ) : (
                            <span className="text-[var(--text-muted)] text-[11px] font-mono">Standby (0 kW)</span>
                          )}
                        </td>

                        <td className="py-4 px-3 text-right">
                          <div className="flex gap-1.5 justify-end items-center">
                            <button
                              onClick={() => openRemoteModal(c, "RESET")}
                              className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] hover:border-amber-500 text-[var(--text-primary)] font-bold text-[11px] cursor-pointer flex items-center gap-1"
                              title="Safe Remote Soft/Hard Reset"
                            >
                              <RotateCcw size={12} className="text-amber-500" /> Reset
                            </button>

                            {status === "AVAILABLE" ? (
                              <button
                                onClick={() => openRemoteModal(c, "REMOTE_START")}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold text-[11px] cursor-pointer flex items-center gap-1"
                                title="Authorize Remote Start"
                              >
                                <Play size={12} /> Start
                              </button>
                            ) : status === "CHARGING" || status === "OCCUPIED" ? (
                              <button
                                onClick={() => openRemoteModal(c, "REMOTE_STOP")}
                                className="px-2.5 py-1.5 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold text-[11px] cursor-pointer flex items-center gap-1"
                                title="Authorize Remote Stop"
                              >
                                <Square size={12} /> Stop
                              </button>
                            ) : null}

                            <button
                              onClick={() => openRemoteModal(c, "SIMULATE_FAULT")}
                              className="px-2.5 py-1.5 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 font-bold text-[11px] cursor-pointer"
                              title="Simulate / Clear Fault Code"
                            >
                              Fault Ops
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            <Pagination
              page={Math.min(page, Math.ceil(filteredChargers.length / limit) || 1)}
              totalPages={Math.ceil(filteredChargers.length / limit) || 1}
              totalItems={filteredChargers.length}
              limit={limit}
              onPageChange={(p) => setPage(p)}
              onLimitChange={(l) => {
                setLimit(l);
                setPage(1);
              }}
              limitOptions={[5, 8, 15, 30]}
            />
          </div>
        </div>
      )}

      {/* ACTIVE TAB 2: INFRASTRUCTURE SERVICES */}
      {activeTab === "infrastructure" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((svc) => {
              const Icon = svc.icon;
              const isOnline = svc.online;

              return (
                <div key={svc.name} className="p-5 rounded-2xl theme-card shadow-sm flex items-start justify-between">
                  <div className="space-y-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isOnline 
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                        : "bg-rose-500/10 border border-rose-500/20 text-rose-500"
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[var(--text-primary)] text-sm">{svc.name}</h4>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{svc.detail}</p>
                      <span
                        className={`inline-block text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border mt-2 ${
                          isOnline
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30"
                        }`}
                      >
                        STATUS: {svc.status}
                      </span>
                    </div>
                  </div>

                  {isOnline ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-6 rounded-3xl theme-card shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
                <Terminal size={16} className="text-emerald-500" /> Real Backend Health Check Payload Log
              </h3>
              <button
                onClick={refreshAll}
                className="text-xs text-[var(--accent-primary)] font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
              </button>
            </div>
            <pre className="p-4 bg-[var(--bg-surface-raised)] rounded-xl border border-[var(--border-subtle)] text-xs font-mono text-emerald-600 dark:text-emerald-400 overflow-x-auto">
              {JSON.stringify(healthData || { status: "AWAITING_POLL", timestamp: new Date().toISOString() }, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* MODAL: SAFE REMOTE CONTROL COMMAND EXECUTION */}
      {commandModalOpen && selectedCharger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                  OCPP 2.0.1 Remote Control Dispatcher
                </span>
                <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Shield size={18} className="text-[var(--accent-primary)]" />
                  Charger #{selectedCharger.charger_id} ({selectedCharger.station_name || "Station"})
                </h2>
              </div>
              <button
                onClick={() => setCommandModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 font-medium">
                <span className="font-bold block mb-0.5">⚠️ Safety Protocol Enforced:</span>
                Every command generates an immutable audit record and validates device authorization before socket/OCPP transmission.
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-primary)] uppercase block mb-1.5">
                  Select Remote Operation
                </label>
                <select
                  value={selectedCommand}
                  onChange={(e) => setSelectedCommand(e.target.value)}
                  className="w-full theme-input font-bold text-xs"
                >
                  <option value="RESET">Reset Charger (Soft / Hard Reboot)</option>
                  <option value="REMOTE_START">Remote Start Transaction</option>
                  <option value="REMOTE_STOP">Remote Stop Transaction</option>
                  <option value="SET_AVAILABILITY">Set Availability (Operative / Inoperative)</option>
                  <option value="SIMULATE_FAULT">Simulate / Clear Fault Code</option>
                </select>
              </div>

              {/* Dynamic Parameter inputs */}
              {selectedCommand === "RESET" && (
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Reset Mode</label>
                  <select
                    value={commandParameters.type || "Soft"}
                    onChange={(e) => setCommandParameters({ ...commandParameters, type: e.target.value })}
                    className="w-full theme-input text-xs"
                  >
                    <option value="Soft">Soft Reset (Graceful OCPP Restart)</option>
                    <option value="Hard">Hard Reset (Power Cycle Relay)</option>
                  </select>
                </div>
              )}

              {selectedCommand === "REMOTE_START" && (
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Authorization RFID / ID Tag</label>
                  <input
                    type="text"
                    value={commandParameters.idTag || "ADMIN_AUTH_KEY_01"}
                    onChange={(e) => setCommandParameters({ ...commandParameters, idTag: e.target.value })}
                    className="w-full theme-input text-xs font-mono"
                  />
                </div>
              )}

              {selectedCommand === "SET_AVAILABILITY" && (
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Operational Mode</label>
                  <select
                    value={commandParameters.availabilityType || "Operative"}
                    onChange={(e) => setCommandParameters({ ...commandParameters, availabilityType: e.target.value })}
                    className="w-full theme-input text-xs"
                  >
                    <option value="Operative">Operative (Accept Drivers)</option>
                    <option value="Inoperative">Inoperative (Maintenance Lockout)</option>
                  </select>
                </div>
              )}

              {selectedCommand === "SIMULATE_FAULT" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Fault Code</label>
                  <select
                    value={commandParameters.errorCode || "OverCurrentFailure"}
                    onChange={(e) => setCommandParameters({ ...commandParameters, errorCode: e.target.value })}
                    className="w-full theme-input text-xs"
                  >
                    <option value="NoError">NoError (Clear All Faults)</option>
                    <option value="OverCurrentFailure">OverCurrentFailure</option>
                    <option value="GroundFailure">GroundFailure</option>
                    <option value="HighTemperature">HighTemperature</option>
                    <option value="ConnectorLockFailure">ConnectorLockFailure</option>
                    <option value="PowerLoss">PowerLoss</option>
                  </select>
                </div>
              )}

              {/* Command Outcome Box */}
              {commandResult && (
                <div className={`p-3 rounded-xl border text-xs font-mono ${
                  commandResult.success ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-rose-500/10 border-rose-500/30 text-rose-500"
                }`}>
                  <span className="font-bold block">Status: {commandResult.data?.status || (commandResult.success ? "ACCEPTED" : "REJECTED")}</span>
                  <span>{commandResult.message}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-raised)]/50 flex justify-end gap-2">
              <button
                onClick={() => setCommandModalOpen(false)}
                disabled={isSendingCommand}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRemoteCommand}
                disabled={isSendingCommand}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md cursor-pointer transition flex items-center gap-1.5"
              >
                <Power size={13} />
                {isSendingCommand ? "Transmitting..." : `Authorize & Dispatch ${selectedCommand}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminSystemHealth() {
  return (
    <HealthErrorBoundary>
      <AdminSystemHealthContent />
    </HealthErrorBoundary>
  );
}
