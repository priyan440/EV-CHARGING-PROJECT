import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, MessageSquare } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { complaintService } from "../services/complaintService";
import { stationService } from "../services/stationService";

export default function Complaints() {
  const { currentUser } = useAuth();
  const [stations, setStations] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [category, setCategory] = useState("Charger Problem");
  const [selectedStationId, setSelectedStationId] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [submittedId, setSubmittedId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [compList, stList] = await Promise.all([
        complaintService.getComplaints(),
        stationService.getStations(),
      ]);

      const validStations = Array.isArray(stList?.data) ? stList.data : (Array.isArray(stList) ? stList : []);
      setStations(validStations);
      if (validStations.length > 0 && !selectedStationId) {
        setSelectedStationId(String(validStations[0].id));
      }

      setComplaints(Array.isArray(compList) ? compList : []);
    } catch (err) {
      console.warn("Error loading complaints data:", err);
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg("Please provide an issue description.");
      return;
    }
    setErrorMsg("");
    setSubmitting(true);

    try {
      const payload = {
        subject: category,
        category,
        description: description.trim(),
        stationId: selectedStationId || null,
        priority,
      };

      const res = await complaintService.createComplaint(payload);
      if (res && res.success) {
        setSubmittedId(res.data?.complaintId || res.data?.complaintCode || "CMP");
        setDescription("");
        loadData();
        setTimeout(() => setSubmittedId(null), 5000);
      } else {
        setErrorMsg(res?.message || "Failed to submit ticket.");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || "Failed to submit complaint.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="theme-card p-6 md:p-8 rounded-3xl">
        <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
          <AlertTriangle size={28} className="text-red-500" /> Helpdesk & Complaints Ticketing
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Report technical charger faults, payment discrepancies, or station issues. Directly persisted in MySQL.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* New Ticket Form (5 Cols) */}
        <div className="lg:col-span-5 theme-card p-6 rounded-3xl space-y-4">
          <h3 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2 flex items-center gap-2">
            <MessageSquare size={18} className="text-red-500" /> Log New Ticket
          </h3>

          {submittedId && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={16} /> Ticket <span className="font-mono">{submittedId}</span> logged successfully in MySQL.
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="theme-input w-full font-bold p-3 rounded-xl"
              >
                <option value="Charger Problem">Charger Hardware / Connector Fault</option>
                <option value="Payment Issue">Payment / Billing Discrepancy</option>
                <option value="Booking Issue">Booking Collision / Slot Lock</option>
                <option value="Station Issue">Station Premises / Security Issue</option>
                <option value="Other">Other Query</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="theme-input w-full font-bold p-3 rounded-xl"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Target Station</label>
              {stations.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] italic p-2 bg-[var(--bg-surface-raised)] rounded-xl border border-[var(--border-subtle)]">
                  No stations found in database.
                </p>
              ) : (
                <select
                  value={selectedStationId}
                  onChange={(e) => setSelectedStationId(e.target.value)}
                  className="theme-input w-full font-bold p-3 rounded-xl"
                >
                  <option value="">-- General / No Station --</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.station_name || s.name || `Station #${s.id}`} ({s.city || "Tamil Nadu"})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Detailed Issue Description *</label>
              <textarea
                rows="4"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the problem encountered in detail..."
                className="theme-input w-full p-3 rounded-xl"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold uppercase tracking-wider cursor-pointer shadow-md shadow-red-500/20 disabled:opacity-50 transition-all active:scale-[0.99]"
            >
              {submitting ? "Submitting to MySQL..." : "Submit Ticket"}
            </button>
          </form>
        </div>

        {/* Complaints History (7 Cols) */}
        <div className="lg:col-span-7 theme-card p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              My Logged Tickets ({complaints.length})
            </h3>
            <button
              onClick={loadData}
              disabled={loading}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="py-12 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
                <RefreshCw size={16} className="animate-spin text-red-500" />
                Loading complaints from MySQL...
              </div>
            ) : complaints.length === 0 ? (
              <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                No complaints found
              </div>
            ) : (
              complaints.map((c) => (
                <div key={c.id || c.complaintId} className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-red-600 dark:text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded border border-red-500/30">
                      {c.complaintCode || c.complaintId}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-500/10 text-slate-500">
                        {c.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        c.status === "RESOLVED" || c.status === "CLOSED"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : c.status === "IN_PROGRESS"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      }`}>
                        {c.status}
                      </span>
                    </div>
                  </div>

                  <div className="font-bold text-[var(--text-primary)] text-sm">
                    {c.subject || c.category} {c.stationName ? `— ${c.stationName}` : ""}
                  </div>
                  <p className="text-[var(--text-secondary)] leading-relaxed">{c.description || c.message}</p>
                  
                  {c.resolution && (
                    <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs">
                      <strong>Resolution:</strong> {c.resolution}
                    </div>
                  )}

                  <div className="text-[10px] text-[var(--text-muted)] font-mono">
                    Logged: {c.createdAt ? new Date(c.createdAt).toLocaleString() : "Recently"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
