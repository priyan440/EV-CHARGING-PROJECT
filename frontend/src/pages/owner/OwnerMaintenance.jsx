import React, { useState, useEffect } from "react";
import {
  Wrench,
  AlertTriangle,
  Plus,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Sparkles,
  ShieldAlert,
  Cpu,
  Building2,
  UserCheck,
  X,
  Send,
} from "lucide-react";
import {
  getOwnerMaintenanceTickets,
  createMaintenanceTicket,
  updateMaintenanceTicket,
  getOwnerFaults,
  resolveOwnerFault,
  getOwnerStations,
  getOwnerChargers,
  getOwnerTechnicians,
} from "../../services/ownerService";
import { getSocket } from "../../services/socketService";

export default function OwnerMaintenance() {
  const [tickets, setTickets] = useState([]);
  const [faults, setFaults] = useState([]);
  const [stations, setStations] = useState([]);
  const [chargers, setChargers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("TICKETS"); // TICKETS | FAULTS
  const [showAddTicketModal, setShowAddTicketModal] = useState(false);
  const [assigningTicket, setAssigningTicket] = useState(null);
  const [selectedTechId, setSelectedTechId] = useState("");
  const [resolutionModalTicket, setResolutionModalTicket] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const [ticketForm, setTicketForm] = useState({
    stationId: "",
    chargerId: "",
    issueType: "Thermal Sensor Overheat",
    problem: "Hardware Sensor Overheat",
    description: "Charger temperature sensor reporting anomalous readings.",
    priority: "MEDIUM",
    technicianId: "",
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [tData, fData, stnData, chgData, techData] = await Promise.all([
        getOwnerMaintenanceTickets(),
        getOwnerFaults(),
        getOwnerStations(),
        getOwnerChargers(),
        getOwnerTechnicians(),
      ]);
      setTickets(Array.isArray(tData) ? tData : []);
      setFaults(Array.isArray(fData) ? fData : []);
      setStations(Array.isArray(stnData) ? stnData : []);
      setChargers(Array.isArray(chgData) ? chgData : []);
      setTechnicians(Array.isArray(techData) ? techData : []);

      if (!ticketForm.stationId && stnData && stnData.length > 0) {
        setTicketForm((prev) => ({
          ...prev,
          stationId: stnData[0].stationId || stnData[0].id,
          chargerId: chgData[0]?.chargerId || chgData[0]?.id || "",
          technicianId: techData[0]?.id || "",
        }));
      }
    } catch (err) {
      console.error(err);
      showToast("Error loading maintenance records from MySQL");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const socket = getSocket?.();
    if (socket) {
      const handleUpdate = () => {
        getOwnerMaintenanceTickets().then((data) => setTickets(Array.isArray(data) ? data : [])).catch(() => {});
        getOwnerFaults().then((data) => setFaults(Array.isArray(data) ? data : [])).catch(() => {});
      };

      socket.on("maintenance_updated", handleUpdate);
      socket.on("fault_detected", handleUpdate);

      return () => {
        socket.off("maintenance_updated", handleUpdate);
        socket.off("fault_detected", handleUpdate);
      };
    }
  }, []);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!ticketForm.stationId) {
      showToast("Please select a valid station.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createMaintenanceTicket({
        stationId: ticketForm.stationId,
        chargerId: ticketForm.chargerId || null,
        technicianId: ticketForm.technicianId || null,
        issueType: ticketForm.problem || ticketForm.issueType,
        description: ticketForm.description,
        priority: ticketForm.priority,
      });
      showToast(`Maintenance ticket logged in MySQL! ID: ${res.data?.ticket_id || res.data?.ticketId || "TKT"}`);
      setShowAddTicketModal(false);
      loadData();
    } catch (err) {
      showToast("Error creating ticket: " + (err.message || "Failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignTechnician = async (e) => {
    e.preventDefault();
    if (!assigningTicket || !selectedTechId) return;
    setSubmitting(true);
    try {
      await updateMaintenanceTicket(assigningTicket.ticket_id || assigningTicket.ticketId || assigningTicket.id, {
        technicianId: parseInt(selectedTechId, 10),
        status: "ASSIGNED",
      });
      showToast(`Technician assigned to ticket ${assigningTicket.ticket_id || assigningTicket.ticketId}!`);
      setAssigningTicket(null);
      setSelectedTechId("");
      loadData();
    } catch (err) {
      showToast("Error assigning technician: " + (err.message || "Failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (ticketId, nextStatus) => {
    try {
      await updateMaintenanceTicket(ticketId, { status: nextStatus });
      showToast(`Ticket status updated to ${nextStatus}.`);
      loadData();
    } catch (err) {
      showToast("Error updating status: " + (err.message || "Failed"));
    }
  };

  const handleResolveTicket = async (e) => {
    e.preventDefault();
    if (!resolutionModalTicket) return;
    setSubmitting(true);
    try {
      await updateMaintenanceTicket(resolutionModalTicket.ticket_id || resolutionModalTicket.ticketId || resolutionModalTicket.id, {
        status: "RESOLVED",
        resolutionNotes: resolutionNotes || "Resolved and verified by Station Owner.",
      });
      showToast(`Ticket resolved! Charger restored to AVAILABLE in MySQL.`);
      setResolutionModalTicket(null);
      setResolutionNotes("");
      loadData();
    } catch (err) {
      showToast("Error resolving ticket: " + (err.message || "Failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveFault = async (faultId) => {
    try {
      await resolveOwnerFault(faultId, "Resolved by Station Owner");
      showToast(`Fault ${faultId} marked resolved and charger restored to Available.`);
      loadData();
    } catch (err) {
      showToast("Error resolving fault: " + (err.message || "Failed"));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in font-sans text-[var(--text-primary)]">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-[var(--accent-primary)] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-blue-400/30 animate-fade-in font-bold text-xs">
          <Sparkles className="w-4 h-4 text-yellow-300" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="theme-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-3 font-mono">
            <Wrench className="w-7 h-7 text-rose-500" />
            Maintenance & Hardware Fault Management
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Track equipment tickets, assign field technicians, resolve OCPP critical fault alerts, and log preventative service.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddTicketModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-lg shadow-rose-500/25 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Ticket
          </button>
          <button
            onClick={loadData}
            className="p-2.5 bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl border border-[var(--border-subtle)] transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-rose-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("TICKETS")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
            activeTab === "TICKETS"
              ? "bg-rose-600 text-white shadow-lg shadow-rose-500/25"
              : "bg-[var(--bg-surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
          }`}
        >
          Tickets ({tickets.length})
        </button>
        <button
          onClick={() => setActiveTab("FAULTS")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
            activeTab === "FAULTS"
              ? "bg-rose-600 text-white shadow-lg shadow-rose-500/25"
              : "bg-[var(--bg-surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
          }`}
        >
          Active Faults ({faults.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 theme-card">
          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-[var(--text-muted)] text-xs font-mono animate-pulse">Loading maintenance records from MySQL...</p>
        </div>
      ) : activeTab === "TICKETS" ? (
        tickets.length === 0 ? (
          <div className="text-center py-16 theme-card">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">Zero Maintenance Tickets</h3>
            <p className="text-[var(--text-muted)] text-xs">All network chargers and stations are operating at 100% health.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((t) => {
              const status = (t.status || "OPEN").toUpperCase();
              const isResolved = status === "RESOLVED" || status === "CLOSED";
              const ticketId = t.ticket_id || t.ticketId || t.id;

              return (
                <div
                  key={ticketId}
                  className="theme-card p-5 hover:border-rose-500/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-rose-500 text-xs px-2.5 py-0.5 bg-rose-500/10 rounded-lg border border-rose-500/20">
                        {ticketId}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          t.priority === "CRITICAL"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            : t.priority === "HIGH"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                        }`}
                      >
                        {t.priority || "MEDIUM"} Priority
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          status === "OPEN"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            : status === "ASSIGNED"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                            : status === "IN_PROGRESS"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[var(--text-primary)]">{t.problem || t.issueType || t.issue_type}</h3>
                    <p className="text-xs text-[var(--text-muted)] max-w-2xl">{t.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)] pt-1">
                      <span>Station: <strong className="text-[var(--text-primary)]">{t.station_name || t.stationName || t.stationId}</strong></span>
                      <span>Charger: <strong className="text-[var(--text-primary)]">{t.charger_name || t.chargerName || t.chargerId || "General"}</strong></span>
                      <span className="flex items-center gap-1.5">
                        <UserCheck size={13} className="text-blue-500" />
                        Technician: <strong className="text-[var(--text-primary)]">{t.technician_name || t.technicianName || t.assignedTechnician || "Unassigned"}</strong>
                      </span>
                    </div>

                    {t.resolution_notes && (
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        Resolution Notes: {t.resolution_notes}
                      </div>
                    )}
                  </div>

                  {/* Actions Lifecycle */}
                  <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
                    {!isResolved && (
                      <>
                        <button
                          onClick={() => {
                            setAssigningTicket(t);
                            setSelectedTechId(technicians[0]?.id ? String(technicians[0].id) : "");
                          }}
                          className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                        >
                          <UserCheck size={13} />
                          {t.technician_name || t.technicianId ? "Reassign Tech" : "Assign Tech"}
                        </button>

                        {status === "ASSIGNED" && (
                          <button
                            onClick={() => handleUpdateStatus(ticketId, "IN_PROGRESS")}
                            className="px-3 py-1.5 bg-amber-600/10 hover:bg-amber-600/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold rounded-xl transition cursor-pointer"
                          >
                            Start Work
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setResolutionModalTicket(t);
                            setResolutionNotes("");
                          }}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                        >
                          Resolve & Close
                        </button>
                      </>
                    )}

                    {isResolved && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 size={14} /> Completed & Restored
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Faults List */
        faults.length === 0 ? (
          <div className="text-center py-16 theme-card">
            <ShieldAlert className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">No Active Hardware Faults</h3>
            <p className="text-[var(--text-muted)] text-xs">All OCPP heartbeats and telemetry sensors are healthy.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {faults.map((f) => {
              const isActive = f.status === "ACTIVE";

              return (
                <div
                  key={f.faultId || f._id}
                  className="theme-card p-5 hover:border-rose-500/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-rose-500 text-xs px-2.5 py-0.5 bg-rose-500/10 rounded-lg border border-rose-500/20">
                        {f.faultId}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        {f.severity} SEVERITY
                      </span>
                      <span className="font-mono text-xs text-amber-600 dark:text-amber-400 font-bold">{f.faultCode}</span>
                    </div>

                    <h3 className="text-base font-bold text-[var(--text-primary)]">{f.faultType}</h3>
                    <p className="text-xs text-[var(--text-muted)] max-w-2xl">{f.description}</p>
                    <div className="text-xs text-[var(--text-muted)]">
                      Charger: <strong className="text-[var(--text-primary)]">{f.chargerId}</strong> at Station <strong className="text-[var(--text-primary)]">{f.stationId}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    {isActive ? (
                      <button
                        onClick={() => handleResolveFault(f.faultId)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                      >
                        Resolve & Clear
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Resolved</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Assign Technician Modal */}
      {assigningTicket && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl max-w-md w-full p-6 shadow-2xl animate-fade-in text-[var(--text-primary)]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-4">
              <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 font-mono">
                <UserCheck className="w-5 h-5 text-blue-500" />
                Assign Certified Field Technician
              </h2>
              <button onClick={() => setAssigningTicket(null)} className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignTechnician} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Target Maintenance Ticket</label>
                <input
                  type="text"
                  disabled
                  value={`${assigningTicket.ticket_id || assigningTicket.ticketId || "TKT"} - ${assigningTicket.problem || assigningTicket.issueType}`}
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2 text-xs font-mono opacity-80"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Select Available Field Technician (MySQL) *</label>
                <select
                  value={selectedTechId}
                  onChange={(e) => setSelectedTechId(e.target.value)}
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] font-bold focus:outline-none"
                  required
                >
                  <option value="">-- Choose Field Technician --</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name} ({tech.email} • {tech.phone || "Active"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)] mt-4">
                <button
                  type="button"
                  onClick={() => setAssigningTicket(null)}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-surface-raised)] text-[var(--text-primary)] text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedTechId}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Send size={13} /> {submitting ? "Assigning in MySQL..." : "Confirm Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolution Notes Modal */}
      {resolutionModalTicket && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl max-w-md w-full p-6 shadow-2xl animate-fade-in text-[var(--text-primary)]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-4">
              <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 font-mono">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Resolve Ticket & Restore Charger
              </h2>
              <button onClick={() => setResolutionModalTicket(null)} className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Ticket Reference</label>
                <input
                  type="text"
                  disabled
                  value={`${resolutionModalTicket.ticket_id || resolutionModalTicket.ticketId || "TKT"} - ${resolutionModalTicket.problem || resolutionModalTicket.issueType}`}
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2 text-xs font-mono opacity-80"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Resolution & Service Notes *</label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Replaced faulty communication board, verified full 60kW DC fast charge output."
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ Marking this ticket resolved will automatically restore charger status to <strong>AVAILABLE</strong> in MySQL for user bookings.
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)] mt-4">
                <button
                  type="button"
                  onClick={() => setResolutionModalTicket(null)}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-surface-raised)] text-[var(--text-primary)] text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Saving in MySQL..." : "Resolve & Restore Charger"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Maintenance Ticket Modal */}
      {showAddTicketModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-fade-in text-[var(--text-primary)]">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] mb-4">
              <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 font-mono">
                <Wrench className="w-5 h-5 text-rose-500" />
                Create Maintenance Ticket
              </h2>
              <button
                onClick={() => setShowAddTicketModal(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Station *</label>
                  <select
                    value={ticketForm.stationId}
                    onChange={(e) => setTicketForm({ ...ticketForm, stationId: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
                    required
                  >
                    {stations.map((st) => (
                      <option key={st.stationId || st.id} value={st.stationId || st.id}>
                        {st.stationId || st.id} - {st.stationName || st.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Charger Unit</label>
                  <select
                    value={ticketForm.chargerId}
                    onChange={(e) => setTicketForm({ ...ticketForm, chargerId: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="">General Station Hardware</option>
                    {chargers.map((c) => (
                      <option key={c.chargerId || c.id} value={c.chargerId || c.id}>
                        {c.charger_name || c.chargerId || c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Problem Title *</label>
                <input
                  type="text"
                  value={ticketForm.problem}
                  onChange={(e) => setTicketForm({ ...ticketForm, problem: e.target.value, issueType: e.target.value })}
                  placeholder="e.g. CCS2 Connector Lock Stucked / Thermal Fault"
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Detailed Description *</label>
                <textarea
                  rows={3}
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
                  required
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Priority</label>
                  <select
                    value={ticketForm.priority}
                    onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Assign Technician (Optional)</label>
                  <select
                    value={ticketForm.technicianId}
                    onChange={(e) => setTicketForm({ ...ticketForm, technicianId: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="">-- Assign Later --</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.name} ({tech.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)] mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddTicketModal(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-surface-raised)] text-[var(--text-primary)] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-500/25 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Saving to MySQL..." : "Create Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
