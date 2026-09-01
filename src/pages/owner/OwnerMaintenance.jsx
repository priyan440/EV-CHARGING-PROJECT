import { useState } from "react";
import { Wrench, Plus, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useSystemState } from "../../contexts/SystemStateContext";

export default function OwnerMaintenance() {
  const { currentUser } = useAuth();
  const { stations, maintenanceTickets, addMaintenanceTicket } = useSystemState();
  const [showAddModal, setShowAddModal] = useState(false);

  const ownerCounterId = currentUser?.counterId || "OWNER0001";
  const myStations = stations.filter((s) => s.ownerCounterId === ownerCounterId);

  const [selectedStationId, setSelectedStationId] = useState(myStations[0]?.id || "STA001");
  const [chargerId, setChargerId] = useState("CHG0001");
  const [problem, setProblem] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [assignedTechnician, setAssignedTechnician] = useState("Vijay Technician");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!problem.trim()) return;

    const st = stations.find((s) => s.id === selectedStationId);

    addMaintenanceTicket({
      stationId: selectedStationId,
      stationName: st?.name || "GreenCharge Station",
      chargerId,
      ownerCounterId,
      problem: problem.trim(),
      priority,
      assignedTechnician,
    });

    setShowAddModal(false);
    setProblem("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
            <Wrench size={28} className="text-amber-400" /> Charger Maintenance Ticketing
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Log technical charger maintenance tickets (MT Counter IDs), assign technicians, and track resolution.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-2"
        >
          <Plus size={16} /> Log Maintenance Ticket
        </button>
      </div>

      {/* Maintenance List */}
      <div className="p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider">
              <th className="py-3 px-3 rounded-l-xl">Ticket ID</th>
              <th className="py-3 px-3">Station & Charger</th>
              <th className="py-3 px-3">Issue Description</th>
              <th className="py-3 px-3">Priority</th>
              <th className="py-3 px-3">Technician</th>
              <th className="py-3 px-3 rounded-r-xl">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-200 font-medium">
            {maintenanceTickets.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                  No active maintenance tickets logged.
                </td>
              </tr>
            ) : (
              maintenanceTickets.map((t) => (
                <tr key={t.ticketId} className="hover:bg-slate-900/60 transition">
                  <td className="py-4 px-3 font-mono font-bold text-amber-400">{t.ticketId}</td>
                  <td className="py-4 px-3 font-bold text-white">
                    {t.stationName} ({t.chargerId})
                  </td>
                  <td className="py-4 px-3 text-slate-300 max-w-xs">{t.problem}</td>
                  <td className="py-4 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        t.priority === "Critical"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td className="py-4 px-3 text-slate-300 font-bold">{t.assignedTechnician}</td>
                  <td className="py-4 px-3">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Ticket Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0B1329] border border-slate-800 p-6 rounded-3xl shadow-2xl text-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
              Log Maintenance Ticket (MT Counter ID)
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">Target Station</label>
                <select
                  value={selectedStationId}
                  onChange={(e) => setSelectedStationId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white font-bold p-2.5 rounded-xl"
                >
                  {myStations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">Charger Unit</label>
                  <input
                    type="text"
                    value={chargerId}
                    onChange={(e) => setChargerId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white font-bold p-2.5 rounded-xl"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">Problem Description</label>
                <textarea
                  rows="3"
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  placeholder="Describe hardware/voltage defect..."
                  className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl"
                  required
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold"
                >
                  Log Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
