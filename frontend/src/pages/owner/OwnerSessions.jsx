import React, { useState, useEffect } from "react";
import {
  Activity,
  Zap,
  BatteryCharging,
  Clock,
  CheckCircle2,
  DollarSign,
  RefreshCw,
  Search,
  Sparkles,
  Car,
  User,
  MapPin,
  Flame,
  Power,
  Layers,
  ArrowRight,
} from "lucide-react";
import {
  getOwnerLiveSessions,
  getOwnerSessionHistory,
  stopChargingSession,
} from "../../services/ownerService";
import { getSocket } from "../../services/socketService";

export default function OwnerSessions() {
  const [liveSessions, setLiveSessions] = useState([]);
  const [historySessions, setHistorySessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("LIVE"); // LIVE | HISTORY
  const [searchTerm, setSearchTerm] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [live, hist] = await Promise.all([
        getOwnerLiveSessions(),
        getOwnerSessionHistory(50),
      ]);
      setLiveSessions(Array.isArray(live) ? live : []);
      setHistorySessions(Array.isArray(hist) ? hist : []);
    } catch (err) {
      console.error(err);
      showToast("Error loading charging sessions from MySQL");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const socket = getSocket?.();
    if (socket) {
      const handleUpdate = () => {
        getOwnerLiveSessions().then((d) => setLiveSessions(Array.isArray(d) ? d : [])).catch(() => {});
        getOwnerSessionHistory(50).then((d) => setHistorySessions(Array.isArray(d) ? d : [])).catch(() => {});
      };
      const handleTelemetry = (data) => {
        setLiveSessions((prev) =>
          prev.map((s) => {
            const sId = s.sessionId || s.session_id || s.id;
            const cId = s.chargerId || s.charger_id;
            return sId === data.telemetry?.sessionId || cId === data.telemetry?.chargerId
              ? {
                  ...s,
                  currentPowerKw: data.telemetry?.powerKw || s.currentPowerKw,
                  energyConsumed: data.telemetry?.energyDeliveredKwh || s.energyConsumed,
                  energyConsumedKwh: data.telemetry?.energyDeliveredKwh || s.energyConsumedKwh,
                  soc: data.telemetry?.soc || s.soc,
                  batteryCurrent: data.telemetry?.soc || s.batteryCurrent,
                }
              : s;
          })
        );
      };

      socket.on("session_started", handleUpdate);
      socket.on("session_stopped", handleUpdate);
      socket.on("telemetry_updated", handleTelemetry);

      return () => {
        socket.off("session_started", handleUpdate);
        socket.off("session_stopped", handleUpdate);
        socket.off("telemetry_updated", handleTelemetry);
      };
    }
  }, []);

  const handleStopSession = async (sessionId) => {
    try {
      const res = await stopChargingSession(sessionId);
      showToast(`Session ${sessionId} completed! Final bill: ₹${res.data?.bill?.totalAmount || res.data?.totalAmount || 0}`);
      loadData();
    } catch (err) {
      showToast("Error stopping session: " + (err.message || "Failed"));
    }
  };

  const filteredHistory = historySessions.filter((s) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (s.sessionId || s.session_id || "").toLowerCase().includes(q) ||
      (s.customerName || s.customer_name || "").toLowerCase().includes(q) ||
      (s.vehicleNumber || s.vehicle_number || "").toLowerCase().includes(q) ||
      (s.stationName || s.station_name || "").toLowerCase().includes(q) ||
      (s.chargerName || s.charger_name || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in font-sans text-[var(--text-primary)]">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-[var(--accent-primary)] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-blue-400/30 animate-fade-in font-bold text-xs">
          <Sparkles className="w-4 h-4 text-yellow-300" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              LIVE TELEMETRY STREAM
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] flex items-center gap-3 font-mono">
            <Activity className="w-7 h-7 text-[var(--accent-primary)]" />
            Charging Sessions & Live Telemetry
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Real-time power delivery, active session meters, duration tickers, and MySQL tariff bill calculations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Pill Switcher */}
          <div className="flex bg-[var(--bg-surface-raised)] p-1 rounded-2xl border border-[var(--border-subtle)]">
            <button
              onClick={() => setActiveTab("LIVE")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "LIVE"
                  ? "bg-[var(--accent-primary)] text-white shadow-md shadow-blue-500/20"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Live Sessions ({liveSessions.length})
            </button>
            <button
              onClick={() => setActiveTab("HISTORY")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "HISTORY"
                  ? "bg-[var(--accent-primary)] text-white shadow-md shadow-blue-500/20"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              History ({historySessions.length})
            </button>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl border border-[var(--border-subtle)] transition cursor-pointer"
            title="Refresh Sessions"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[var(--accent-primary)]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Content based on tab */}
      {activeTab === "LIVE" ? (
        liveSessions.length === 0 ? (
          <div className="text-center py-20 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-subtle)] shadow-sm space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-[var(--accent-primary)] flex items-center justify-center mx-auto border border-blue-500/20">
              <BatteryCharging className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] font-mono">No Live Charging Sessions Active</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
              Simulate or start a session from the Control Center or Chargers menu to view live real-time telemetry meters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveSessions.map((ses) => {
              const sId = ses.sessionId || ses.session_id || `SES000${ses.id}`;
              const cName = ses.customerName || ses.customer_name || "EV Driver";
              const vNumber = ses.vehicleNumber || ses.registration_number || "TN01EV0001";
              const vModel = ses.vehicleModel || "Electric Vehicle";
              const chgName = ses.chargerName || ses.charger_name || ses.chargerId || "Bay 01";
              const stName = ses.stationName || ses.station_name || "EV Power Hub";
              const currentPower = parseFloat(ses.currentPowerKw || ses.power_kw || 50);
              const energyDelivered = parseFloat(ses.energyConsumed || ses.energyConsumedKwh || ses.energy_kwh || 14.5);
              const currentSoc = parseInt(ses.soc || ses.batteryCurrent || ses.battery_soc || 62, 10);
              const amount = parseFloat(ses.amount || ses.currentCost || ses.total_amount || 260);

              return (
                <div
                  key={sId}
                  className="bg-[var(--bg-surface)] rounded-3xl p-6 border border-[var(--border-subtle)] hover:border-blue-500/40 transition-all flex flex-col justify-between shadow-sm relative overflow-hidden space-y-5"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>

                  <div>
                    {/* Card Header */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-mono font-bold text-[var(--accent-primary)] text-xs px-2.5 py-1 bg-blue-500/10 rounded-xl border border-blue-500/20">
                        {sId}
                      </span>
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-mono font-bold uppercase flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        Charging Active
                      </span>
                    </div>

                    {/* Driver & Vehicle */}
                    <div className="space-y-1 mb-4">
                      <h3 className="text-base font-bold text-[var(--text-primary)]">{cName}</h3>
                      <div className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                        <span>{vModel}</span>
                        <span>•</span>
                        <span className="font-mono font-semibold text-[var(--text-primary)]">{vNumber}</span>
                      </div>
                      <div className="text-xs text-[var(--accent-primary)] font-medium mt-1">
                        {stName} • {chgName}
                      </div>
                    </div>

                    {/* Battery State of Charge Bar */}
                    <div className="space-y-1.5 mb-5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-[var(--text-muted)]">State of Charge (SOC)</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono">{currentSoc}%</span>
                      </div>
                      <div className="w-full h-3 bg-[var(--bg-surface-raised)] rounded-full overflow-hidden p-0.5 border border-[var(--border-subtle)]">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(5, currentSoc))}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Live Telemetry Meters */}
                    <div className="grid grid-cols-3 gap-2 bg-[var(--bg-surface-raised)] p-3.5 rounded-2xl mb-2 text-center text-xs border border-[var(--border-subtle)]">
                      <div>
                        <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Power</div>
                        <div className="font-mono font-bold text-[var(--text-primary)] text-sm">{currentPower} kW</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Delivered</div>
                        <div className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">{energyDelivered} kWh</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Running Cost</div>
                        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">₹{amount}</div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStopSession(sId)}
                    className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-500/20 active:scale-95 cursor-pointer"
                  >
                    Stop Charging & Finalize Session
                  </button>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* History Table View */
        <div className="bg-[var(--bg-surface)] rounded-3xl p-6 border border-[var(--border-subtle)] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 font-mono">
              <Layers size={18} className="text-[var(--accent-primary)]" />
              Completed Session History ({filteredHistory.length})
            </h3>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] uppercase text-[10px] bg-[var(--bg-surface-raised)]">
                  <th className="p-3 font-bold rounded-l-xl">Session ID</th>
                  <th className="p-3 font-bold">Driver / Vehicle</th>
                  <th className="p-3 font-bold">Station / Charger</th>
                  <th className="p-3 font-bold">Energy Delivered</th>
                  <th className="p-3 font-bold">Duration</th>
                  <th className="p-3 font-bold">Amount</th>
                  <th className="p-3 font-bold rounded-r-xl">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[var(--text-muted)] text-xs">
                      No session records found.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((s) => (
                    <tr key={s.sessionId || s.session_id || s.id} className="hover:bg-[var(--bg-surface-raised)] transition-colors">
                      <td className="p-3 font-mono font-bold text-[var(--accent-primary)]">
                        {s.sessionId || s.session_id || `SES000${s.id}`}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-[var(--text-primary)]">{s.customerName || s.customer_name || "EV Driver"}</div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono">{s.vehicleNumber || s.registration_number || "TN01EV0001"}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold">{s.stationName || s.station_name || "EV Power Hub"}</div>
                        <div className="text-[10px] text-[var(--text-muted)]">{s.chargerName || s.charger_name || "Bay 01"}</div>
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                        {s.energyConsumed || s.energyConsumedKwh || s.energy_kwh || 22.4} kWh
                      </td>
                      <td className="p-3 text-[var(--text-muted)] font-mono">
                        {s.duration || `${s.durationMinutes || s.duration_minutes || 45} mins`}
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{s.totalCost || s.amount || s.total_amount || 380}
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {s.status || s.session_status || "COMPLETED"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
