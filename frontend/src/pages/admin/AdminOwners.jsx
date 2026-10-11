import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Check,
  X,
  Building2,
  UserCheck,
  Ban,
  RotateCcw,
  Clock,
  Eye,
  DollarSign,
  Zap,
} from "lucide-react";
import { adminService } from "../../services/adminService";
import { getOwnerStatusBadge } from "../../utils/statusUtils";
import Pagination from "../../components/Pagination";

export default function AdminOwners() {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actionMsg, setActionMsg] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Reason Modal for Reject / Suspend
  const [activeModal, setActiveModal] = useState(null); // { type: 'REJECT' | 'SUSPEND', owner: Object, reason: string }
  const [modalReason, setModalReason] = useState("");

  const loadOwners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getOwners({
        page,
        limit,
        status: statusFilter,
        search: searchTerm,
      });
      if (res?.success && Array.isArray(res.data)) {
        setOwners(res.data);
        setTotalCount(res.total || res.data.length);
      }
    } catch (err) {
      console.warn("Failed to load owners:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, searchTerm]);

  useEffect(() => {
    loadOwners();
  }, [loadOwners]);

  const showNotification = (msg) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 3500);
  };

  const handleApprove = async (owner) => {
    const res = await adminService.approveOwner(owner.id);
    if (res?.success) {
      showNotification(`Station Owner "${owner.name}" verified & approved!`);
      loadOwners();
    } else {
      alert(res?.message || "Failed to approve owner");
    }
  };

  const handleReactivate = async (owner) => {
    const res = await adminService.reactivateOwner(owner.id);
    if (res?.success) {
      showNotification(`Station Owner "${owner.name}" reactivated successfully.`);
      loadOwners();
    } else {
      alert(res?.message || "Failed to reactivate owner");
    }
  };

  const handleConfirmModalAction = async () => {
    if (!activeModal) return;
    const { type, owner } = activeModal;
    const reason = modalReason.trim() || (type === "REJECT" ? "Credentials rejected by administrator" : "Suspended by administrator");

    if (type === "REJECT") {
      const res = await adminService.rejectOwner(owner.id, reason);
      if (res?.success) {
        showNotification(`Station Owner "${owner.name}" registration rejected.`);
        loadOwners();
      } else {
        alert(res?.message || "Failed to reject owner");
      }
    } else if (type === "SUSPEND") {
      const res = await adminService.suspendOwner(owner.id, reason);
      if (res?.success) {
        showNotification(`Station Owner "${owner.name}" suspended.`);
        loadOwners();
      } else {
        alert(res?.message || "Failed to suspend owner");
      }
    }

    setActiveModal(null);
    setModalReason("");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header Banner */}
      <div className="theme-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-mono font-bold border border-purple-500/20">
              VERIFICATION CENTER
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
            <ShieldCheck size={28} className="text-purple-500" /> Station Owner Verification & Access
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Audit EV station operators, verify business registrations, approve new network owners, and manage suspensions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="theme-input font-bold text-xs cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Verification</option>
            <option value="VERIFIED">Verified / Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <button
            onClick={() => loadOwners()}
            className="theme-btn-secondary p-2.5 rounded-xl text-xs font-bold flex items-center gap-2"
            title="Refresh list"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-sm font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={18} />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="theme-card p-4 flex items-center gap-3">
        <Search size={18} className="text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Search by owner ID, business name, operator contact, or email..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          className="bg-transparent border-none outline-none text-sm w-full text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2"
          >
            Clear
          </button>
        )}
      </div>

      {/* Owners Table */}
      <div className="theme-card overflow-hidden shadow-lg border border-[var(--border-subtle)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs md:text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-muted)] font-mono uppercase text-[11px] tracking-wider">
                <th className="p-4">Owner Profile</th>
                <th className="p-4">Company & Location</th>
                <th className="p-4">Infrastructure</th>
                <th className="p-4">Revenue</th>
                <th className="p-4">Verification Status</th>
                <th className="p-4 text-right">Verification Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-purple-500" />
                    Loading station owners from MySQL database...
                  </td>
                </tr>
              ) : owners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">
                    No station owners match the current filter or search criteria.
                  </td>
                </tr>
              ) : (
                owners.map((owner) => {
                  const badge = getOwnerStatusBadge(owner.verificationStatus || owner.owner_status || owner.status);
                  const isPending = (owner.verificationStatus || owner.owner_status || owner.status) === "PENDING";
                  const isSuspended = (owner.verificationStatus || owner.owner_status || owner.status) === "SUSPENDED";
                  const isRejected = (owner.verificationStatus || owner.owner_status || owner.status) === "REJECTED";
                  const isVerified = (owner.verificationStatus || owner.owner_status || owner.status) === "VERIFIED" || owner.status === "ACTIVE";

                  return (
                    <tr
                      key={owner.id}
                      className="hover:bg-[var(--bg-hover)] transition-colors duration-150"
                    >
                      {/* Owner Profile */}
                      <td className="p-4">
                        <div className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
                          <Building2 size={16} className="text-purple-400" />
                          <span>{owner.name}</span>
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                          ID: {owner.counterId || owner.user_id}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          {owner.email} • {owner.phone}
                        </div>
                      </td>

                      {/* Company & Location */}
                      <td className="p-4">
                        <div className="font-semibold text-[var(--text-primary)]">
                          {owner.companyName || owner.businessName || "—"}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          {owner.city || "Chennai"}, {owner.address || "Tamil Nadu"}
                        </div>
                      </td>

                      {/* Infrastructure */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                            <span className="text-xs font-bold text-[var(--text-primary)]">{owner.stationCount || 0}</span>
                            <span className="text-[10px] text-[var(--text-muted)] ml-1">Stations</span>
                          </div>
                          <div className="px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                            <span className="text-xs font-bold text-[var(--text-primary)]">{owner.chargerCount || 0}</span>
                            <span className="text-[10px] text-[var(--text-muted)] ml-1">Bays</span>
                          </div>
                        </div>
                      </td>

                      {/* Revenue */}
                      <td className="p-4">
                        <div className="font-mono font-bold text-emerald-500 flex items-center gap-1">
                          <span>₹{(owner.totalRevenue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                        {owner.rejectionReason && (
                          <div className="text-[10px] text-rose-400 mt-1 max-w-xs truncate" title={owner.rejectionReason}>
                            Reason: {owner.rejectionReason}
                          </div>
                        )}
                        {owner.suspensionReason && (
                          <div className="text-[10px] text-orange-400 mt-1 max-w-xs truncate" title={owner.suspensionReason}>
                            Reason: {owner.suspensionReason}
                          </div>
                        )}
                        {owner.reviewedByName && (
                          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                            By {owner.reviewedByName}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApprove(owner)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-xs font-bold flex items-center gap-1 transition"
                                title="Approve & Grant Public Access"
                              >
                                <Check size={14} /> Approve
                              </button>
                              <button
                                onClick={() => {
                                  setActiveModal({ type: "REJECT", owner });
                                  setModalReason("");
                                }}
                                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs font-bold flex items-center gap-1 transition"
                                title="Reject registration"
                              >
                                <X size={14} /> Reject
                              </button>
                            </>
                          )}

                          {isVerified && (
                            <button
                              onClick={() => {
                                setActiveModal({ type: "SUSPEND", owner });
                                setModalReason("");
                              }}
                              className="px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/30 text-xs font-bold flex items-center gap-1 transition"
                              title="Suspend Owner Account"
                            >
                              <Ban size={14} /> Suspend
                            </button>
                          )}

                          {(isSuspended || isRejected) && (
                            <button
                              onClick={() => handleReactivate(owner)}
                              className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/30 text-xs font-bold flex items-center gap-1 transition"
                              title="Reactivate Account"
                            >
                              <RotateCcw size={14} /> Reactivate
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

        {totalCount > limit && (
          <div className="p-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of {totalCount} operators
            </span>
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(totalCount / limit)}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        )}
      </div>

      {/* Rejection / Suspension Reason Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="theme-card max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  activeModal.type === "REJECT" ? "bg-rose-500/20 text-rose-500" : "bg-orange-500/20 text-orange-500"
                }`}
              >
                {activeModal.type === "REJECT" ? <XCircle size={24} /> : <Ban size={24} />}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                  {activeModal.type === "REJECT" ? "Reject Station Owner" : "Suspend Station Owner"}
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {activeModal.owner.name} ({activeModal.owner.counterId})
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              {activeModal.type === "REJECT"
                ? "Please record the administrative reason for rejecting this operator's registration. This will be logged in the immutable audit trail."
                : "Suspending this owner will immediately restrict them from creating stations, adding chargers, or altering tariffs."}
            </p>

            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1">
                Reason / Audit Justification
              </label>
              <textarea
                value={modalReason}
                onChange={(e) => setModalReason(e.target.value)}
                placeholder={
                  activeModal.type === "REJECT"
                    ? "e.g., Incomplete business license or invalid electrical authorization..."
                    : "e.g., Temporary suspension pending electrical safety compliance review..."
                }
                rows={3}
                className="theme-input w-full text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="theme-btn-secondary px-4 py-2 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmModalAction}
                className={`px-4 py-2 text-xs font-bold rounded-xl text-white shadow-lg ${
                  activeModal.type === "REJECT"
                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
                    : "bg-orange-600 hover:bg-orange-700 shadow-orange-500/20"
                }`}
              >
                Confirm {activeModal.type === "REJECT" ? "Rejection" : "Suspension"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
