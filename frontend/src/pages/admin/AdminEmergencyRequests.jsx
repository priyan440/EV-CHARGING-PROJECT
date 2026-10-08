import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Truck,
  MapPin,
  Clock,
  PhoneCall,
  CheckCircle,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  User,
  Car,
  Zap,
} from "lucide-react";
import { emergencyService } from "../../services/emergencyService";

export default function AdminEmergencyRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await emergencyService.getAllEmergencyRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Error loading emergency requests:", err);
      showToast("Error retrieving emergency requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleUpdateStatus = async (requestId, newStatus) => {
    try {
      await emergencyService.updateEmergencyStatus(requestId, newStatus, "Rescue Unit Alpha");
      showToast(`Emergency request ${requestId} marked as ${newStatus}`);
      loadRequests();
    } catch (err) {
      showToast("Error updating status: " + err.message);
    }
  };

  const filtered = requests.filter((r) => {
    const matchSearch =
      r.request_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.vehicle_model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.location_address?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12 text-[var(--text-primary)]">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-red-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-red-400/30 animate-fade-in font-bold text-xs">
          <ShieldAlert className="w-4 h-4 text-yellow-300" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="theme-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-red-500/30">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-red-500/10 text-red-500 border border-red-500/20">
              EMERGENCY DISPATCH CONSOLE
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] flex items-center gap-3 font-mono">
            <ShieldAlert className="w-7 h-7 text-red-500" />
            Emergency Roadside Assistance
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Real-time management and dispatch operations for stranded EV drivers with depleted batteries and breakdowns.
          </p>
        </div>

        <button
          onClick={loadRequests}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] flex items-center gap-2 hover:border-red-500 transition cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-red-500" : ""}`} />
          Refresh Requests
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by Request ID, Driver, Vehicle, or Location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl pl-9 pr-4 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-red-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1">
          {["ALL", "PENDING", "DISPATCHED", "IN_PROGRESS", "RESOLVED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 border ${
                statusFilter === st
                  ? "bg-red-600 text-white border-red-600 shadow"
                  : "bg-[var(--bg-surface-raised)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="p-16 text-center bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-subtle)]">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-[var(--text-muted)] font-mono animate-pulse">Loading emergency tickets from MySQL...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-16 text-center bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-subtle)] space-y-3">
          <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-[var(--text-primary)] font-mono">No Emergency Requests Found</h3>
          <p className="text-xs text-[var(--text-muted)]">All submitted driver roadside assistance requests will appear here for operational dispatch.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((req) => (
            <div
              key={req.request_id || req.id}
              className="bg-[var(--bg-surface)] p-6 rounded-3xl border border-[var(--border-subtle)] hover:border-red-500/40 transition shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-red-500 text-xs px-2.5 py-0.5 rounded-lg bg-red-500/10 border border-red-500/20">
                  {req.request_id || `EMG00000${req.id}`}
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
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  {String(req.emergency_type || "BATTERY_DEPLETED").replace(/_/g, " ")}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1.5">
                  <MapPin size={13} className="text-red-500 shrink-0" />
                  <span className="truncate">{req.location_address || "GPS Coordinates Pinpoint"}</span>
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-[var(--bg-surface-raised)] p-3.5 rounded-2xl text-xs border border-[var(--border-subtle)]">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase block font-bold">Driver</span>
                  <span className="font-bold text-[var(--text-primary)] truncate block">{req.user_name || "EV Driver"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase block font-bold">Battery SOC</span>
                  <span className="font-mono font-black text-red-500 text-sm">{req.current_soc || 8}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase block font-bold">Vehicle</span>
                  <span className="font-bold text-[var(--text-primary)] truncate block">{req.vehicle_model || "Electric 4W"}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <div className="text-[10px] text-[var(--text-muted)] font-mono">
                  ETA: ~{req.eta_minutes || 15} mins • Unit: {req.assigned_unit || "Rescue Van #04"}
                </div>

                <div className="flex items-center gap-1.5">
                  {req.status !== "RESOLVED" && (
                    <button
                      onClick={() => handleUpdateStatus(req.request_id || req.id, "RESOLVED")}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer shadow-sm"
                    >
                      Resolve
                    </button>
                  )}
                  {req.status === "PENDING" && (
                    <button
                      onClick={() => handleUpdateStatus(req.request_id || req.id, "DISPATCHED")}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer shadow-sm"
                    >
                      Dispatch
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
