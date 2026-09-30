import { useState, useEffect } from "react";
import { ShieldCheck, Search, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Check, X } from "lucide-react";
import { adminService } from "../../services/adminService";

export default function AdminOwners() {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actionMsg, setActionMsg] = useState("");

  const loadOwners = async () => {
    setLoading(true);
    try {
      const res = await adminService.getOwners();
      if (res?.success && Array.isArray(res.data)) {
        setOwners(res.data);
      }
    } catch (err) {
      console.warn("Failed to load owners:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOwners();
  }, []);

  const handleApprove = async (ownerId) => {
    const res = await adminService.approveOwner(ownerId);
    if (res?.success) {
      setActionMsg("Station Owner approved successfully.");
      setTimeout(() => setActionMsg(""), 2000);
      loadOwners();
    }
  };

  const handleReject = async (ownerId) => {
    const res = await adminService.rejectOwner(ownerId);
    if (res?.success) {
      setActionMsg("Station Owner registration rejected.");
      setTimeout(() => setActionMsg(""), 2000);
      loadOwners();
    }
  };

  const filtered = owners.filter((o) => {
    const status = (o.owner_status || o.status || "APPROVED").toUpperCase();
    if (statusFilter === "PENDING" && status !== "PENDING") return false;
    if (statusFilter === "APPROVED" && status !== "APPROVED") return false;
    if (statusFilter === "REJECTED" && status !== "REJECTED") return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        (o.counter_id || "").toLowerCase().includes(q) ||
        (o.name || "").toLowerCase().includes(q) ||
        (o.company_name || o.businessName || "").toLowerCase().includes(q) ||
        (o.network_name || "").toLowerCase().includes(q) ||
        (o.email || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header Banner */}
      <div className="theme-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-mono font-bold border border-purple-500/20">
              OWNER VERIFICATION
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
            <ShieldCheck size={28} className="text-purple-500" /> Station Owner Approvals & Management
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Verify EV Network operators and station owners, review business credentials, and grant access to publish stations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="theme-input font-bold text-xs cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <div className="relative w-full md:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search name, network..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full theme-input pl-8"
            />
          </div>

          <button
            onClick={loadOwners}
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

      {/* Owners Table */}
      <div className="theme-card p-6 overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] text-[var(--text-muted)] font-bold uppercase tracking-wider">
              <th className="py-3 px-3 rounded-l-xl">Owner ID</th>
              <th className="py-3 px-3">Owner & Company</th>
              <th className="py-3 px-3">EV Network</th>
              <th className="py-3 px-3">Contact Email & Phone</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right rounded-r-xl">Approval Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)] font-medium">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
                  Loading station owners...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
                  No station owners found.
                </td>
              </tr>
            ) : (
              filtered.map((o) => {
                const status = (o.owner_status || o.status || "APPROVED").toUpperCase();
                const isApproved = status === "APPROVED";
                const isPending = status === "PENDING";

                return (
                  <tr key={o.id || o.counter_id} className="hover:bg-[var(--bg-surface-raised)]/60 transition">
                    <td className="py-4 px-3 font-mono font-bold text-purple-600 dark:text-purple-400">
                      {o.counter_id || `OWNER#${o.id}`}
                    </td>
                    <td className="py-4 px-3">
                      <span className="font-bold text-[var(--text-primary)] text-sm block">{o.name}</span>
                      <span className="text-[11px] text-[var(--text-muted)]">{o.company_name || o.businessName || "EV Charging Operator"}</span>
                    </td>
                    <td className="py-4 px-3 font-semibold text-[var(--accent-primary)]">
                      {o.network_name || "GreenCharge"}
                    </td>
                    <td className="py-4 px-3">
                      <div className="text-[var(--text-primary)]">{o.email}</div>
                      <div className="font-mono text-[var(--text-muted)] text-[11px]">{o.phone || "+91 98401 23456"}</div>
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
                        {isApproved ? "Approved" : isPending ? "Pending Review" : "Rejected"}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-right">
                      <div className="flex gap-1.5 justify-end items-center">
                        {isPending && (
                          <>
                            <button
                              onClick={() => handleApprove(o.id)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm cursor-pointer flex items-center gap-1"
                            >
                              <Check size={13} /> Approve
                            </button>
                            <button
                              onClick={() => handleReject(o.id)}
                              className="px-3 py-1.5 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold text-[11px] cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {isApproved && (
                          <button
                            onClick={() => handleReject(o.id)}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold text-[11px] cursor-pointer"
                          >
                            Suspend
                          </button>
                        )}
                        {!isApproved && !isPending && (
                          <button
                            onClick={() => handleApprove(o.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm cursor-pointer"
                          >
                            Re-approve
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
