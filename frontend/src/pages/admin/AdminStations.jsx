import { useState, useEffect } from "react";
import { 
  Building2, Search, CheckCircle2, XCircle, AlertTriangle, 
  RefreshCw, Check, X, ShieldAlert, Eye, Image as ImageIcon,
  Zap, MapPin, User, Calendar, FileText
} from "lucide-react";
import { adminService } from "../../services/adminService";
import { getStationApprovalBadge } from "../../utils/statusUtils";
import Pagination from "../../components/Pagination";

export default function AdminStations() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [actionMsg, setActionMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(8);

  // Modals state
  const [selectedStation, setSelectedStation] = useState(null);
  const [modalType, setModalType] = useState(null); // 'VIEW' | 'REJECT' | 'SUSPEND' | 'APPROVE'
  const [reasonText, setReasonText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadStations = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await adminService.getStations();
      if (res?.success && Array.isArray(res.data)) {
        setStations(res.data);
      } else {
        setStations([]);
        if (res?.message) setErrorMsg(res.message);
      }
    } catch (err) {
      console.warn("Failed to load admin stations:", err);
      setErrorMsg(err.message || "Failed to load stations database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStations();
  }, []);

  const openActionModal = (station, type) => {
    setSelectedStation(station);
    setModalType(type);
    setReasonText("");
  };

  const closeModal = () => {
    setSelectedStation(null);
    setModalType(null);
    setReasonText("");
    setIsSubmitting(false);
  };

  const handleConfirmAction = async () => {
    if (!selectedStation) return;
    setIsSubmitting(true);
    try {
      let res;
      if (modalType === "APPROVE") {
        res = await adminService.approveStation(selectedStation.id, reasonText);
      } else if (modalType === "REJECT") {
        if (!reasonText.trim()) {
          alert("Please provide a reason for rejecting the station.");
          setIsSubmitting(false);
          return;
        }
        res = await adminService.rejectStation(selectedStation.id, reasonText);
      } else if (modalType === "SUSPEND") {
        if (!reasonText.trim()) {
          alert("Please provide a reason for suspending the station.");
          setIsSubmitting(false);
          return;
        }
        res = await adminService.suspendStation(selectedStation.id, reasonText);
      }

      if (res?.success) {
        setActionMsg(res.message || "Station status updated successfully.");
        setTimeout(() => setActionMsg(""), 3500);
        closeModal();
        await loadStations();
      } else {
        alert(res?.message || "Action failed.");
      }
    } catch (err) {
      alert(err.message || "Network error while updating station.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = stations.filter((s) => {
    const approval = (s.approval_status || "UNKNOWN").toUpperCase();
    if (filterStatus === "PENDING" && approval !== "PENDING") return false;
    if (filterStatus === "APPROVED" && approval !== "APPROVED") return false;
    if (filterStatus === "REJECTED" && approval !== "REJECTED") return false;
    if (filterStatus === "SUSPENDED" && approval !== "SUSPENDED") return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      String(s.id).includes(q) ||
      (s.station_name || s.name || "").toLowerCase().includes(q) ||
      (s.network_name || "").toLowerCase().includes(q) ||
      (s.city || "").toLowerCase().includes(q) ||
      (s.owner_name || "").toLowerCase().includes(q) ||
      (s.address || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header Banner */}
      <div className="theme-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-mono font-bold border border-purple-500/20">
              MODULE A • VERIFICATION CENTER
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
            <Building2 size={28} className="text-purple-500" /> Station Approvals & Verification
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Inspect physical location, photographs, power specs, and approve or suspend public EV station listings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="theme-input font-bold text-xs cursor-pointer"
          >
            <option value="ALL">All Approvals</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved & Live</option>
            <option value="REJECTED">Rejected</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          {/* Search Box */}
          <div className="relative w-full md:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search station, city, owner..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full theme-input pl-8 text-xs"
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

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Stations Table */}
      <div className="theme-card p-6 overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] text-[var(--text-muted)] font-bold uppercase tracking-wider">
              <th className="py-3 px-3 rounded-l-xl">ID</th>
              <th className="py-3 px-3">Station & Network</th>
              <th className="py-3 px-3">Owner Details</th>
              <th className="py-3 px-3">Location & GPS</th>
              <th className="py-3 px-3">Capacity / Price</th>
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
                  No stations found matching the selected filters.
                </td>
              </tr>
            ) : (
              filtered.slice((page - 1) * limit, page * limit).map((s) => {
                const approvalStatus = (s.approval_status || "UNKNOWN").toUpperCase();
                const badge = getStationApprovalBadge(approvalStatus);
                const isPending = approvalStatus === "PENDING";
                const isApproved = approvalStatus === "APPROVED";

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
                      {s.image_url && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 font-semibold mt-0.5">
                          <ImageIcon size={11} /> Photo Attached
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-3">
                      <span className="font-semibold text-[var(--text-primary)] block">{s.owner_name || "Owner #" + s.owner_id}</span>
                      <span className="text-[11px] font-mono text-[var(--text-muted)]">{s.owner_email || s.owner_counter_id || `ID: ${s.owner_id}`}</span>
                    </td>
                    <td className="py-4 px-3">
                      <span className="font-bold text-[var(--text-primary)] block">{s.city || "Tamil Nadu"}</span>
                      <span className="text-[11px] text-[var(--text-muted)] line-clamp-1">{s.address}</span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">
                        Lat: {parseFloat(s.latitude || 0).toFixed(4)}, Lng: {parseFloat(s.longitude || 0).toFixed(4)}
                      </span>
                    </td>
                    <td className="py-4 px-3 font-mono text-xs">
                      <span className="text-blue-600 dark:text-blue-400 font-bold block">{s.max_power || 120} kW</span>
                      <span className="text-[var(--text-muted)] text-[10px]">{s.total_slots || 4} Bays • ₹{s.charging_price || 18}/kWh</span>
                    </td>
                    <td className="py-4 px-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ${badge.className}`}>
                        {badge.label}
                      </span>
                      {s.reviewed_at && (
                        <span className="text-[9px] text-[var(--text-muted)] block mt-1 font-mono">
                          Rev: {new Date(s.reviewed_at).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-3 text-right">
                      <div className="flex gap-1.5 justify-end items-center">
                        <button
                          onClick={() => openActionModal(s, "VIEW")}
                          className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] text-[var(--text-primary)] font-bold text-[11px] cursor-pointer flex items-center gap-1"
                          title="Inspect Details & Photo"
                        >
                          <Eye size={12} /> View
                        </button>

                        {isPending && (
                          <>
                            <button
                              onClick={() => openActionModal(s, "APPROVE")}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm cursor-pointer flex items-center gap-1"
                              title="Approve & Publish to Map"
                            >
                              <Check size={12} /> Approve
                            </button>
                            <button
                              onClick={() => openActionModal(s, "REJECT")}
                              className="px-3 py-1.5 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold text-[11px] cursor-pointer"
                              title="Reject Registration"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {isApproved && (
                          <button
                            onClick={() => openActionModal(s, "SUSPEND")}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold text-[11px] cursor-pointer"
                            title="Suspend Station"
                          >
                            Suspend
                          </button>
                        )}

                        {!isApproved && !isPending && (
                          <button
                            onClick={() => openActionModal(s, "APPROVE")}
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

        <Pagination
          page={Math.min(page, Math.ceil(filtered.length / limit) || 1)}
          totalPages={Math.ceil(filtered.length / limit) || 1}
          totalItems={filtered.length}
          limit={limit}
          onPageChange={(p) => setPage(p)}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
          limitOptions={[5, 8, 15, 30]}
        />
      </div>

      {/* MODAL: View / Review / Action */}
      {modalType && selectedStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                  Station Verification Review
                </span>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {selectedStation.station_name || selectedStation.name} (STA{String(selectedStation.id).padStart(3, "0")})
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
              {/* Photo Display if available */}
              {selectedStation.image_url ? (
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2 block">Submitted Station Photo</label>
                  <div className="rounded-xl overflow-hidden border border-[var(--border-subtle)] max-h-64 bg-black/20 flex items-center justify-center">
                    <img
                      src={selectedStation.image_url}
                      alt={selectedStation.station_name}
                      className="w-full h-full object-cover max-h-64"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&q=80&w=800";
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] flex items-center gap-2">
                  <ImageIcon size={16} /> No photo uploaded for this station.
                </div>
              )}

              {/* Station Parameters Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">Network</span>
                  <span className="font-bold text-[var(--text-primary)]">{selectedStation.network_name || "GreenCharge"}</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">Max Capacity</span>
                  <span className="font-bold text-blue-500">{selectedStation.max_power || 120} kW</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">Tariff Rate</span>
                  <span className="font-bold text-emerald-500">₹{selectedStation.charging_price || 18}/kWh</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">Bays / Slots</span>
                  <span className="font-bold text-[var(--text-primary)]">{selectedStation.total_slots || 4} Ports</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">Operating Hours</span>
                  <span className="font-bold text-[var(--text-primary)]">{selectedStation.operating_hours || "24/7"}</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">Current Approval</span>
                  <span className="font-bold uppercase text-[var(--accent-primary)]">{selectedStation.approval_status || "PENDING"}</span>
                </div>
              </div>

              {/* Location & GPS */}
              <div className="p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                  <MapPin size={14} className="text-[var(--accent-primary)]" />
                  <span>{selectedStation.address || "Address unspecified"}, {selectedStation.city || ""}</span>
                </div>
                <div className="text-[11px] font-mono text-[var(--text-muted)] pl-5">
                  Coordinates: Lat {selectedStation.latitude || 0}, Lng {selectedStation.longitude || 0}
                </div>
              </div>

              {/* Prior Review Notes if existing */}
              {selectedStation.approval_notes && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                  <span className="font-bold text-amber-600 dark:text-amber-400 block mb-1">Previous Review Notes:</span>
                  <p className="text-[var(--text-primary)]">{selectedStation.approval_notes}</p>
                </div>
              )}

              {/* Reason / Notes Input for Action */}
              {(modalType === "REJECT" || modalType === "SUSPEND" || modalType === "APPROVE") && (
                <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                    <span>
                      {modalType === "APPROVE" ? "Approval Notes (Optional):" : "Reason / Administrative Note (Required):"}
                    </span>
                    {modalType !== "APPROVE" && (
                      <span className="text-[10px] text-rose-500 font-bold uppercase">* Required for Audit</span>
                    )}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={
                      modalType === "APPROVE"
                        ? "E.g., Physical location verified, grid sanction documents checked."
                        : modalType === "REJECT"
                        ? "E.g., Incomplete electrical safety compliance documents, invalid GPS coordinates."
                        : "E.g., Temporary grid outage, safety inspection requested."
                    }
                    value={reasonText}
                    onChange={(e) => setReasonText(e.target.value)}
                    className="w-full theme-input p-3 text-xs resize-none"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-raised)]/50 flex justify-end gap-2">
              <button
                onClick={closeModal}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                {modalType === "VIEW" ? "Close" : "Cancel"}
              </button>

              {modalType === "VIEW" && (
                <div className="flex gap-2">
                  {selectedStation.approval_status !== "APPROVED" && (
                    <button
                      onClick={() => setModalType("APPROVE")}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                    >
                      Approve Station
                    </button>
                  )}
                  {selectedStation.approval_status !== "REJECTED" && (
                    <button
                      onClick={() => setModalType("REJECT")}
                      className="px-4 py-2 rounded-xl bg-rose-600/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-600/20 font-bold text-xs"
                    >
                      Reject
                    </button>
                  )}
                  {selectedStation.approval_status === "APPROVED" && (
                    <button
                      onClick={() => setModalType("SUSPEND")}
                      className="px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-500 font-bold text-xs"
                    >
                      Suspend
                    </button>
                  )}
                </div>
              )}

              {(modalType === "APPROVE" || modalType === "REJECT" || modalType === "SUSPEND") && (
                <button
                  onClick={handleConfirmAction}
                  disabled={isSubmitting}
                  className={`px-5 py-2 rounded-xl font-bold text-xs text-white shadow-md cursor-pointer transition ${
                    modalType === "APPROVE"
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-rose-600 hover:bg-rose-500"
                  }`}
                >
                  {isSubmitting
                    ? "Processing..."
                    : modalType === "APPROVE"
                    ? "Confirm Approval & Publish"
                    : modalType === "REJECT"
                    ? "Confirm Rejection"
                    : "Confirm Suspension"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
