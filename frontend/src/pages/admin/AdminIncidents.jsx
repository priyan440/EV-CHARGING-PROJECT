import React, { useState, useEffect, useCallback } from "react";
import {
  Wrench, AlertTriangle, ShieldAlert, Plus, CheckCircle2, Clock, 
  RefreshCw, Search, Check, X, User, Building2, Cpu, Filter, Send
} from "lucide-react";
import { adminService } from "../../services/adminService";
import Pagination from "../../components/Pagination";

export default function AdminIncidents() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [toastMsg, setToastMsg] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(8);

  // Create Incident Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    station_id: "",
    charger_id: "",
    issue_type: "OverCurrentFailure",
    severity: "HIGH",
    priority: "HIGH",
    description: "",
    assigned_to: "",
  });

  // Assign / Resolution Modal
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [actionType, setActionType] = useState(null); // 'ASSIGN' | 'RESOLVE'
  const [assigneeId, setAssigneeId] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getIncidents({ status: filterStatus, severity: filterSeverity });
      if (res?.success && Array.isArray(res.data)) {
        setIncidents(res.data);
      } else {
        setIncidents([]);
      }
    } catch (err) {
      console.warn("Error loading incidents:", err);
      showToast("Error retrieving incident records");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterSeverity]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  const handleCreateIncident = async (e) => {
    e.preventDefault();
    if (!createForm.station_id) {
      alert("Station ID is required.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await adminService.createIncident(createForm);
      if (res?.success) {
        showToast(res.message || "Incident ticket created successfully.");
        setShowCreateModal(false);
        setCreateForm({
          station_id: "",
          charger_id: "",
          issue_type: "OverCurrentFailure",
          severity: "HIGH",
          priority: "HIGH",
          description: "",
          assigned_to: "",
        });
        loadIncidents();
      } else {
        alert(res?.message || "Failed to create incident");
      }
    } catch (err) {
      alert(err.message || "Network error while creating incident");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateIncident = async () => {
    if (!selectedIncident) return;
    setIsSubmitting(true);
    try {
      const payload = {};
      if (actionType === "ASSIGN") {
        if (!assigneeId) {
          alert("Please enter a technician or owner user ID to assign.");
          setIsSubmitting(false);
          return;
        }
        payload.assigned_to = assigneeId;
        payload.status = "ASSIGNED";
      } else if (actionType === "RESOLVE") {
        if (!resolutionNotes.trim()) {
          alert("Please enter resolution notes describing the fix.");
          setIsSubmitting(false);
          return;
        }
        payload.status = "RESOLVED";
        payload.resolution_notes = resolutionNotes;
      }

      const res = await adminService.updateIncident(selectedIncident.id, payload);
      if (res?.success) {
        showToast(res.message || "Incident updated successfully.");
        setSelectedIncident(null);
        setActionType(null);
        setAssigneeId("");
        setResolutionNotes("");
        loadIncidents();
      } else {
        alert(res?.message || "Failed to update incident.");
      }
    } catch (err) {
      alert(err.message || "Error updating incident.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = incidents.filter((inc) => {
    const st = (inc.status || "UNKNOWN").toUpperCase();
    const sev = (inc.severity || "MEDIUM").toUpperCase();

    if (filterStatus !== "ALL" && st !== filterStatus) return false;
    if (filterSeverity !== "ALL" && sev !== filterSeverity) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      String(inc.id).includes(q) ||
      (inc.issue_type || "").toLowerCase().includes(q) ||
      (inc.station_name || "").toLowerCase().includes(q) ||
      (inc.description || "").toLowerCase().includes(q) ||
      (inc.assigned_technician_name || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Toast */}
      {toastMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
          <Check size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="theme-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-mono font-bold border border-purple-500/20">
              MODULE C • INCIDENT & MAINTENANCE CENTER
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
            <Wrench size={28} className="text-amber-500" /> Network Incident & Maintenance Center
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Track hardware alerts, assign field technicians, manage repair lifecycles, and prevent duplicate faults.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer transition"
          >
            <Plus size={15} /> Create Incident Ticket
          </button>

          <button
            onClick={loadIncidents}
            disabled={loading}
            className="p-2.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
            title="Refresh Incidents"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

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
            <option value="PENDING">Pending Triage</option>
            <option value="ASSIGNED">Assigned / In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          {/* Severity Filter */}
          <select
            value={filterSeverity}
            onChange={(e) => {
              setFilterSeverity(e.target.value);
              setPage(1);
            }}
            className="theme-input font-bold text-xs cursor-pointer"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search incident, station, fault..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full theme-input pl-8 text-xs"
          />
        </div>
      </div>

      {/* Incidents Table */}
      <div className="theme-card p-6 overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] text-[var(--text-muted)] font-bold uppercase tracking-wider">
              <th className="py-3 px-3 rounded-l-xl">Ticket ID</th>
              <th className="py-3 px-3">Station & Location</th>
              <th className="py-3 px-3">Fault / Issue Type</th>
              <th className="py-3 px-3">Severity / Priority</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Assigned Tech</th>
              <th className="py-3 px-3 text-right rounded-r-xl">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)] font-medium">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--text-muted)]">
                  Loading incident logs from MySQL...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--text-muted)]">
                  No maintenance incidents found matching filters.
                </td>
              </tr>
            ) : (
              filtered.slice((page - 1) * limit, page * limit).map((inc) => {
                const status = (inc.status || "PENDING").toUpperCase();
                const severity = (inc.severity || "MEDIUM").toUpperCase();

                const sevBadgeColor =
                  severity === "CRITICAL"
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                    : severity === "HIGH"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";

                const stBadgeColor =
                  status === "RESOLVED" || status === "CLOSED"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : status === "ASSIGNED"
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse";

                return (
                  <tr key={inc.id} className="hover:bg-[var(--bg-surface-raised)]/60 transition">
                    <td className="py-4 px-3 font-mono font-bold text-[var(--accent-primary)]">
                      INC{String(inc.id).padStart(4, "0")}
                      <span className="block text-[9px] text-[var(--text-muted)]">
                        {new Date(inc.created_at || Date.now()).toLocaleDateString()}
                      </span>
                    </td>

                    <td className="py-4 px-3">
                      <span className="font-bold text-[var(--text-primary)] block">{inc.station_name || `Station #${inc.station_id}`}</span>
                      <span className="text-[11px] text-[var(--text-muted)]">{inc.city || "Tamil Nadu"}</span>
                      {inc.charger_id && (
                        <span className="text-[10px] font-mono text-[var(--accent-primary)] block">Charger #{inc.charger_id}</span>
                      )}
                    </td>

                    <td className="py-4 px-3">
                      <span className="font-bold text-[var(--text-primary)] block">{inc.issue_type || "Hardware Fault"}</span>
                      <span className="text-[11px] text-[var(--text-muted)] line-clamp-1">{inc.description || "No description provided."}</span>
                    </td>

                    <td className="py-4 px-3 font-mono">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${sevBadgeColor}`}>
                        {severity}
                      </span>
                    </td>

                    <td className="py-4 px-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ${stBadgeColor}`}>
                        {status}
                      </span>
                    </td>

                    <td className="py-4 px-3">
                      {inc.assigned_technician_name ? (
                        <div>
                          <span className="font-semibold text-[var(--text-primary)] block">{inc.assigned_technician_name}</span>
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">ID: {inc.assigned_to}</span>
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)] italic text-[11px]">Unassigned</span>
                      )}
                    </td>

                    <td className="py-4 px-3 text-right">
                      <div className="flex gap-1.5 justify-end items-center">
                        {status !== "RESOLVED" && status !== "CLOSED" && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedIncident(inc);
                                setActionType("ASSIGN");
                                setAssigneeId(inc.assigned_to || "");
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-bold text-[11px] cursor-pointer"
                            >
                              Assign
                            </button>
                            <button
                              onClick={() => {
                                setSelectedIncident(inc);
                                setActionType("RESOLVE");
                                setResolutionNotes("");
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm cursor-pointer"
                            >
                              Resolve
                            </button>
                          </>
                        )}
                        {(status === "RESOLVED" || status === "CLOSED") && (
                          <span className="text-emerald-500 font-bold text-[11px] flex items-center gap-1">
                            <CheckCircle2 size={13} /> Completed
                          </span>
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

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                <Wrench size={18} className="text-amber-500" /> Log Maintenance / Incident Ticket
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateIncident} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[var(--text-muted)] uppercase block mb-1">Station ID *</label>
                  <input
                    type="number"
                    required
                    placeholder="E.g. 1"
                    value={createForm.station_id}
                    onChange={(e) => setCreateForm({ ...createForm, station_id: e.target.value })}
                    className="w-full theme-input p-2.5 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-[var(--text-muted)] uppercase block mb-1">Charger ID (Optional)</label>
                  <input
                    type="number"
                    placeholder="E.g. 2"
                    value={createForm.charger_id}
                    onChange={(e) => setCreateForm({ ...createForm, charger_id: e.target.value })}
                    className="w-full theme-input p-2.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[var(--text-muted)] uppercase block mb-1">Issue / Fault Type</label>
                  <select
                    value={createForm.issue_type}
                    onChange={(e) => setCreateForm({ ...createForm, issue_type: e.target.value })}
                    className="w-full theme-input font-bold"
                  >
                    <option value="OverCurrentFailure">OverCurrentFailure</option>
                    <option value="GroundFailure">GroundFailure</option>
                    <option value="HighTemperature">HighTemperature</option>
                    <option value="ConnectorLockFailure">ConnectorLockFailure</option>
                    <option value="PowerLoss">PowerLoss</option>
                    <option value="PhysicalDamage">Physical Damage / Vandalism</option>
                    <option value="PaymentTerminalError">Payment Terminal Error</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[var(--text-muted)] uppercase block mb-1">Severity</label>
                  <select
                    value={createForm.severity}
                    onChange={(e) => setCreateForm({ ...createForm, severity: e.target.value })}
                    className="w-full theme-input font-bold"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[var(--text-muted)] uppercase block mb-1">Problem Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe observed physical or electrical symptoms..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full theme-input p-2.5 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold"
                >
                  {isSubmitting ? "Creating..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN / RESOLVE MODAL */}
      {selectedIncident && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="font-bold text-base text-[var(--text-primary)]">
                {actionType === "ASSIGN" ? "Assign Field Technician / Owner" : "Resolve Incident Ticket"}
              </h3>
              <button
                onClick={() => {
                  setSelectedIncident(null);
                  setActionType(null);
                }}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X size={18} />
              </button>
            </div>

            {actionType === "ASSIGN" && (
              <div className="space-y-3 text-xs">
                <label className="font-bold text-[var(--text-muted)] uppercase block">Assigned User / Technician ID</label>
                <input
                  type="number"
                  placeholder="Enter User ID of Technician..."
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full theme-input p-2.5 font-mono"
                />
              </div>
            )}

            {actionType === "RESOLVE" && (
              <div className="space-y-3 text-xs">
                <label className="font-bold text-[var(--text-muted)] uppercase block">Resolution Notes / Action Taken *</label>
                <textarea
                  rows={3}
                  placeholder="E.g. Replaced faulty contactor relay, verified 50kW test charging."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full theme-input p-2.5 resize-none"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-subtle)] text-xs">
              <button
                onClick={() => {
                  setSelectedIncident(null);
                  setActionType(null);
                }}
                className="px-4 py-2 rounded-xl text-[var(--text-muted)]"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateIncident}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                {isSubmitting ? "Updating..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
