import { useState } from "react";
import { AlertTriangle, Plus, CheckCircle2, ShieldAlert } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useSystemState } from "../contexts/SystemStateContext";

export default function Complaints() {
  const { currentUser } = useAuth();
  const { stations, complaints, addComplaint } = useSystemState();

  const [category, setCategory] = useState("Charger Problem");
  const [selectedStationId, setSelectedStationId] = useState(stations[0]?.id || "STA001");
  const [description, setDescription] = useState("");
  const [submittedId, setSubmittedId] = useState(null);

  const myComplaints = complaints.filter(
    (c) => c.counterId?.toUpperCase() === (currentUser?.counterId || "CUS0002").toUpperCase()
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    const st = stations.find((s) => s.id === selectedStationId);

    const newComp = addComplaint({
      counterId: currentUser?.counterId || "CUS0002",
      customerName: currentUser?.name || "Priyan",
      category,
      stationId: selectedStationId,
      stationName: st?.name || "EV Power Hub",
      description: description.trim(),
    });

    setSubmittedId(newComp.complaintId);
    setDescription("");
    setTimeout(() => setSubmittedId(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-2xl">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
          <AlertTriangle size={28} className="text-red-400" /> Helpdesk & Complaints Ticketing
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Report technical charger faults, payment discrepancies, or station issues.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* New Ticket Form (5 Cols) */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2">
            Log New Ticket (CMP Counter ID)
          </h3>

          {submittedId && (
            <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={16} /> Ticket <span className="font-mono">{submittedId}</span> logged successfully.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-300 uppercase tracking-wider mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white font-bold p-3 rounded-xl"
              >
                <option value="Charger Problem">Charger Hardware / Connector Fault</option>
                <option value="Payment Issue">Payment / Billing Discrepancy</option>
                <option value="Booking Issue">Booking Collision / Slot Lock</option>
                <option value="Station Issue">Station Premises / Security Issue</option>
                <option value="Other">Other Query</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-300 uppercase tracking-wider mb-2">Target Station</label>
              <select
                value={selectedStationId}
                onChange={(e) => setSelectedStationId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white font-bold p-3 rounded-xl"
              >
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-300 uppercase tracking-wider mb-2">Detailed Issue Description</label>
              <textarea
                rows="4"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the problem encountered..."
                className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-xl"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white font-extrabold uppercase tracking-wider"
            >
              Submit Ticket
            </button>
          </form>
        </div>

        {/* Complaints History (7 Cols) */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2">
            My Logged Tickets ({myComplaints.length})
          </h3>

          <div className="space-y-3">
            {myComplaints.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No active complaint tickets.</p>
            ) : (
              myComplaints.map((c) => (
                <div key={c.complaintId} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-red-400 bg-red-500/20 px-2.5 py-0.5 rounded border border-red-500/30">
                      {c.complaintId}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {c.status}
                    </span>
                  </div>

                  <div className="font-bold text-white text-sm">{c.category} - {c.stationName}</div>
                  <p className="text-slate-300 leading-relaxed">{c.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
