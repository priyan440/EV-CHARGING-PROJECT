import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, RefreshCw, MessageSquare, Clock, Filter, Check } from "lucide-react";
import { complaintService } from "../../services/complaintService";

export default function OwnerComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [resolvingId, setResolvingId] = useState(null);
  const [resolutionText, setResolutionText] = useState("");
  const [newStatus, setNewStatus] = useState("RESOLVED");
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
  };

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const data = await complaintService.getComplaints();
      setComplaints(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Error loading owner complaints:", err);
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, []);

  const handleUpdateComplaint = async (id) => {
    if (!resolutionText.trim() && newStatus === "RESOLVED") {
      showToast("Please provide resolution notes before resolving.", "error");
      return;
    }
    setUpdating(true);
    try {
      await complaintService.updateComplaint(id, {
        status: newStatus,
        resolution: resolutionText.trim(),
      });
      showToast(`Complaint status updated to ${newStatus} in MySQL!`);
      setResolvingId(null);
      setResolutionText("");
      loadComplaints();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Failed to update complaint", "error");
    } finally {
      setUpdating(false);
    }
  };

  const filtered = complaints.filter((c) => {
    if (statusFilter === "ALL") return true;
    return (c.status || "").toUpperCase() === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`p-4 rounded-2xl fixed top-4 right-4 z-50 shadow-xl border text-xs font-bold flex items-center gap-2 ${
          toast.type === "error"
            ? "bg-rose-500/10 border-rose-500/30 text-rose-500 bg-white dark:bg-slate-900"
            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 bg-white dark:bg-slate-900"
        }`}>
          {toast.type === "error" ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <AlertTriangle className="w-7 h-7 text-rose-500" />
            Station Complaints & Feedback
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Customer reported tickets regarding your charging stations, retrieved directly from MySQL.
          </p>
        </div>

        <button
          onClick={loadComplaints}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-rose-500" : ""}`} />
          Refresh MySQL
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === st
                ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                : "bg-white dark:bg-[#0B1329] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300"
            }`}
          >
            {st} ({st === "ALL" ? complaints.length : complaints.filter((c) => (c.status || "").toUpperCase() === st).length})
          </button>
        ))}
      </div>

      {/* Complaints List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw size={18} className="animate-spin text-rose-500" />
            Loading complaints from MySQL...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
            No complaints found
          </div>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id || c.complaintId}
              className="p-6 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold px-3 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    {c.complaintCode || c.complaintId}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Station: <strong className="text-slate-900 dark:text-white">{c.stationName || "Your Station"}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500">
                    Priority: {c.priority}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      c.status === "RESOLVED" || c.status === "CLOSED"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : c.status === "IN_PROGRESS"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {c.subject || c.category}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {c.description || c.message}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
                <div>
                  Customer: <span className="text-slate-600 dark:text-slate-200 font-semibold">{c.customerName || "Customer"}</span> ({c.customerEmail || "-"})
                </div>
                <div>
                  Logged: {c.createdAt ? new Date(c.createdAt).toLocaleString() : "Recently"}
                </div>
              </div>

              {c.resolution && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
                  <strong className="block mb-0.5">Resolution Notes:</strong>
                  {c.resolution}
                </div>
              )}

              {/* Action buttons */}
              {resolvingId === (c.id || c.complaintId) ? (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Update Status:</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="text-xs font-bold p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                    >
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="CLOSED">CLOSED</option>
                      <option value="OPEN">OPEN</option>
                    </select>
                  </div>

                  <textarea
                    rows="3"
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    placeholder="Enter resolution notes for customer..."
                    className="w-full text-xs p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  />

                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setResolvingId(null)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handleUpdateComplaint(c.id || c.complaintId)}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                    >
                      {updating ? "Saving to MySQL..." : "Save Status & Resolution"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setResolvingId(c.id || c.complaintId);
                      setResolutionText(c.resolution || "");
                      setNewStatus(c.status === "OPEN" ? "IN_PROGRESS" : "RESOLVED");
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                  >
                    Respond / Update Status
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
