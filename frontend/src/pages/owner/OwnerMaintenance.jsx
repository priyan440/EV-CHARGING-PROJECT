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
  X,
} from "lucide-react";
import {
  getOwnerMaintenanceTickets,
  createMaintenanceTicket,
  updateMaintenanceTicket,
  getOwnerFaults,
  resolveOwnerFault,
  getOwnerStations,
  getOwnerChargers,
} from "../../services/ownerService";
import { getSocket } from "../../services/socketService";

export default function OwnerMaintenance() {
  const [tickets, setTickets] = useState([]);
  const [faults, setFaults] = useState([]);
  const [stations, setStations] = useState([]);
  const [chargers, setChargers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("TICKETS"); // TICKETS | FAULTS
  const [showAddTicketModal, setShowAddTicketModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const [ticketForm, setTicketForm] = useState({
    stationId: "",
    chargerId: "",
    issueType: "Thermal Sensor Overheat",
    problem: "Hardware Sensor Overheat",
    description: "Charger temperature sensor reporting anomalous readings.",
    priority: "MEDIUM",
    assignedTechnician: "Vikram Nathan",
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [tData, fData, stnData, chgData] = await Promise.all([
        getOwnerMaintenanceTickets(),
        getOwnerFaults(),
        getOwnerStations(),
        getOwnerChargers(),
      ]);
      setTickets(tData);
      setFaults(fData);
      setStations(stnData);
      setChargers(chgData);
      if (!ticketForm.stationId && stnData.length > 0) {
        setTicketForm((prev) => ({
          ...prev,
          stationId: stnData[0].stationId,
          chargerId: chgData[0]?.chargerId || "CHG0001",
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
        getOwnerMaintenanceTickets().then(setTickets).catch(() => {});
        getOwnerFaults().then(setFaults).catch(() => {});
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
    setSubmitting(true);
    try {
      const res = await createMaintenanceTicket(ticketForm);
      showToast(`Ticket created in MySQL! ID: ${res.data?.ticketId || "MT"}`);
      setShowAddTicketModal(false);
      loadData();
    } catch (err) {
      showToast("Error creating ticket: " + (err.message || "Failed"));
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

  const handleCloseTicket = async (ticketId) => {
    try {
      await updateMaintenanceTicket(ticketId, { status: "RESOLVED", resolvedAt: new Date() });
      showToast(`Ticket ${ticketId} resolved.`);
      loadData();
    } catch (err) {
      showToast("Error updating ticket: " + (err.message || "Failed"));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in text-slate-100">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-blue-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-blue-400/30 animate-bounce">
          <Sparkles className="w-5 h-5 text-yellow-300" />
          <span className="text-sm font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Wrench className="w-7 h-7 text-rose-400" />
            Maintenance & Hardware Fault Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track equipment tickets, assign field technicians, resolve OCPP critical fault alerts, and log preventative service.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddTicketModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-all shadow-lg shadow-rose-500/25 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Create Ticket
          </button>
          <button
            onClick={loadData}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-rose-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("TICKETS")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
            activeTab === "TICKETS"
              ? "bg-rose-600 text-white shadow-lg shadow-rose-500/25"
              : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          Tickets ({tickets.length})
        </button>
        <button
          onClick={() => setActiveTab("FAULTS")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
            activeTab === "FAULTS"
              ? "bg-rose-600 text-white shadow-lg shadow-rose-500/25"
              : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          Active Faults ({faults.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-400 text-sm animate-pulse">Loading maintenance records from MySQL...</p>
        </div>
      ) : activeTab === "TICKETS" ? (
        tickets.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/60 rounded-3xl border border-slate-800">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Zero Maintenance Tickets</h3>
            <p className="text-slate-400 text-xs">All network chargers and stations are operating at 100% health.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((t) => {
              const isOpen = ["OPEN", "Open", "ASSIGNED", "IN_PROGRESS"].includes(t.status);

              return (
                <div
                  key={t.ticketId || t._id}
                  className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-rose-400 text-sm px-2.5 py-0.5 bg-rose-500/10 rounded-lg border border-rose-500/20">
                        {t.ticketId}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          t.priority === "CRITICAL"
                            ? "bg-rose-500/20 text-rose-300"
                            : t.priority === "HIGH"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-blue-500/20 text-blue-300"
                        }`}
                      >
                        {t.priority} Priority
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          isOpen ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white">{t.problem || t.issueType}</h3>
                    <p className="text-xs text-slate-300 max-w-2xl">{t.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                      <span>Station: <strong className="text-slate-200">{t.stationId}</strong></span>
                      <span>Charger: <strong className="text-slate-200">{t.chargerId || "General"}</strong></span>
                      <span>Technician: <strong className="text-slate-200">{t.assignedTechnician || "Vikram Nathan"}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    {isOpen && (
                      <button
                        onClick={() => handleCloseTicket(t.ticketId)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all active:scale-95"
                      >
                        Mark Resolved
                      </button>
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
          <div className="text-center py-16 bg-slate-900/60 rounded-3xl border border-slate-800">
            <ShieldAlert className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Active Hardware Faults</h3>
            <p className="text-slate-400 text-xs">All OCPP heartbeats and telemetry sensors are healthy.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {faults.map((f) => {
              const isActive = f.status === "ACTIVE";

              return (
                <div
                  key={f.faultId || f._id}
                  className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 hover:border-rose-500/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-rose-400 text-sm px-2.5 py-0.5 bg-rose-500/10 rounded-lg border border-rose-500/20">
                        {f.faultId}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] bg-rose-500/20 text-rose-300">
                        {f.severity} SEVERITY
                      </span>
                      <span className="font-mono text-xs text-amber-400 font-bold">{f.faultCode}</span>
                    </div>

                    <h3 className="text-base font-bold text-white">{f.faultType}</h3>
                    <p className="text-xs text-slate-300 max-w-2xl">{f.description}</p>
                    <div className="text-xs text-slate-400">
                      Charger: <strong className="text-slate-200">{f.chargerId}</strong> at Station <strong className="text-slate-200">{f.stationId}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    {isActive ? (
                      <button
                        onClick={() => handleResolveFault(f.faultId)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all"
                      >
                        Resolve & Clear
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-400 font-semibold">Resolved</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Create Maintenance Ticket Modal */}
      {showAddTicketModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-rose-400" />
                Create Maintenance Ticket
              </h2>
              <button
                onClick={() => setShowAddTicketModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Station *</label>
                  <select
                    value={ticketForm.stationId}
                    onChange={(e) => setTicketForm({ ...ticketForm, stationId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                    required
                  >
                    {stations.map((st) => (
                      <option key={st.stationId} value={st.stationId}>
                        {st.stationId} - {st.stationName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Charger Unit</label>
                  <select
                    value={ticketForm.chargerId}
                    onChange={(e) => setTicketForm({ ...ticketForm, chargerId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    {chargers.map((c) => (
                      <option key={c.chargerId} value={c.chargerId}>
                        {c.chargerId} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Problem Title *</label>
                <input
                  type="text"
                  value={ticketForm.problem}
                  onChange={(e) => setTicketForm({ ...ticketForm, problem: e.target.value, issueType: e.target.value })}
                  placeholder="e.g. Type 2 Mechanical Latch Defect"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Detailed Description *</label>
                <textarea
                  rows={3}
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  required
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                  <select
                    value={ticketForm.priority}
                    onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Technician</label>
                  <input
                    type="text"
                    value={ticketForm.assignedTechnician}
                    onChange={(e) => setTicketForm({ ...ticketForm, assignedTechnician: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddTicketModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-500/25 transition-all active:scale-95 disabled:opacity-50"
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
