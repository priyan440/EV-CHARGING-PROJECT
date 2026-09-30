import { useState, useEffect } from "react";
import { Building2, Search, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Check, X, ShieldAlert } from "lucide-react";
import { adminService } from "../../services/adminService";

export default function AdminStations() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [actionMsg, setActionMsg] = useState("");

  const loadStations = async () => {
    setLoading(true);
    try {
      const res = await adminService.getStations();
      if (res?.success && Array.isArray(res.data)) {
        setStations(res.data);
      }
    } catch (err) {
      console.warn("Failed to load admin stations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStations();
  }, []);

  const handleApprove = async (stationId) => {
    const res = await adminService.approveStation(stationId);
    if (res?.success) {
      setActionMsg(`Station approved and published to Live EV Map!`);
      setTimeout(() => setActionMsg(""), 2000);
      loadStations();
    }
  };

  const handleReject = async (stationId) => {
    const res = await adminService.rejectStation(stationId);
    if (res?.success) {
      setActionMsg(`Station registration rejected.`);
      setTimeout(() => setActionMsg(""), 2000);
      loadStations();
    }
  };

  const handleSuspend = async (stationId) => {
    const res = await adminService.suspendStation(stationId);
    if (res?.success) {
      setActionMsg(`Station suspended from public map view.`);
      setTimeout(() => setActionMsg(""), 2000);
      loadStations();
    }
  };

  const filtered = stations.filter((s) => {
    const status = (s.approval_status || s.status || "APPROVED").toUpperCase();
    if (filterStatus === "PENDING" && status !== "PENDING") return false;
    if (filterStatus === "APPROVED" && status !== "APPROVED" && s.status !== "ACTIVE") return false;
    if (filterStatus === "SUSPENDED" && status !== "SUSPENDED" && status !== "REJECTED") return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      String(s.id).includes(q) ||
      (s.station_name || s.name || "").toLowerCase().includes(q) ||
      (s.network_name || "").toLowerCase().includes(q) ||
      (s.city || "").toLowerCase().includes(q) ||
      (s.owner_name || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header Banner */}
      <div className="theme-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-mono font-bold border border-purple-500/20">
              ADMIN COMMAND
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
            <Building2 size={28} className="text-purple-500" /> EV Station Approvals & Management
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Review newly submitted charging stations, verify location & electrical parameters, and publish to Live EV Map.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="theme-input font-bold text-xs cursor-pointer"
          >
            <option value="ALL">All Stations</option>
            <option value="PENDING">Pending Approvals</option>
            <option value="APPROVED">Approved & Active</option>
            <option value="SUSPENDED">Suspended / Rejected</option>
          </select>

          {/* Search Box */}
          <div className="relative w-full md:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search station, city, owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full theme-input pl-8"
            />
          </div>

          <button
            onClick={loadStations}
            disabled={loading}
            className="p-2.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
          <Check size={16} />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Stations Table */}
      <div className="theme-card p-6 overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] text-[var(--text-muted)] font-bold uppercase tracking-wider">
              <th className="py-3 px-3 rounded-l-xl">ID</th>
              <th className="py-3 px-3">Network & Name</th>
              <th className="py-3 px-3">Owner Info</th>
              <th className="py-3 px-3">Location & GPS</th>
              <th className="py-3 px-3">Specs</th>
              <th className="py-3 px-3">Approval Status</th>
              <th className="py-3 px-3 text-right rounded-r-xl">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)] font-medium">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--text-muted)]">
                  Loading station database...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--text-muted)]">
                  No stations found matching filters.
                </td>
              </tr>
            ) : (
              filtered.map((s) => {
                const status = (s.approval_status || s.status || "APPROVED").toUpperCase();
                const isApproved = status === "APPROVED" || s.status === "ACTIVE";
                const isPending = status === "PENDING";

                return (
                  <tr key={s.id} className="hover:bg-[var(--bg-surface-raised)]/60 transition">
                    <td className="py-4 px-3 font-mono font-bold text-[var(--accent-primary)]">
                      STA{String(s.id).padStart(3, "0")}
                    </td>
                    <td className="py-4 px-3">
                      <span className="text-[10px] font-mono text-[var(--accent-primary)] font-bold uppercase block">
                        {s.network_name || "GreenCharge"}
                      </span>
                      <span className="font-bold text-[var(--text-primary)] text-sm block">{s.station_name || s.name}</span>
                    </td>
                    <td className="py-4 px-3">
                      <span className="font-semibold text-[var(--text-primary)] block">{s.owner_name || "Station Owner"}</span>
                      <span className="text-[11px] font-mono text-[var(--text-muted)]">{s.owner_counter_id || `OWNER#${s.owner_id}`}</span>
                    </td>
                    <td className="py-4 px-3">
                      <span className="font-bold text-[var(--text-primary)] block">{s.city || "Chennai"}</span>
                      <span className="text-[11px] text-[var(--text-muted)] line-clamp-1">{s.address}</span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">
                        Lat: {parseFloat(s.latitude).toFixed(4)}, Lng: {parseFloat(s.longitude).toFixed(4)}
                      </span>
                    </td>
                    <td className="py-4 px-3 font-mono text-xs">
                      <span className="text-blue-600 dark:text-blue-400 font-bold block">{s.max_power || 120} kW</span>
                      <span className="text-[var(--text-muted)] text-[10px]">{s.total_slots || 4} Bays • ₹{s.charging_price || 18}/kWh</span>
                    </td>
                    <td className="py-4 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                          isApproved
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : isPending
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                        }`}
                      >
                        {isApproved ? "Approved & Live" : isPending ? "Pending Review" : "Suspended"}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-right">
                      <div className="flex gap-1.5 justify-end items-center">
                        {isPending && (
                          <>
                            <button
                              onClick={() => handleApprove(s.id)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm cursor-pointer flex items-center gap-1"
                              title="Approve & Publish to Map"
                            >
                              <Check size={13} /> Approve
                            </button>
                            <button
                              onClick={() => handleReject(s.id)}
                              className="px-3 py-1.5 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold text-[11px] cursor-pointer"
                              title="Reject Registration"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {isApproved && (
                          <button
                            onClick={() => handleSuspend(s.id)}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold text-[11px] cursor-pointer"
                            title="Suspend Station"
                          >
                            Suspend
                          </button>
                        )}
                        {!isApproved && !isPending && (
                          <button
                            onClick={() => handleApprove(s.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm cursor-pointer"
                          >
                            Re-activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
