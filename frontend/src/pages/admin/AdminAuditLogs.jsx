import { useState, useEffect, useCallback } from "react";
import {
  ClipboardList, Search, ShieldCheck, RefreshCw, Filter, ShieldAlert,
  Eye, X, Calendar, User, Database, Lock
} from "lucide-react";
import { adminService } from "../../services/adminService";
import Pagination from "../../components/Pagination";

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getAuditLogs({
        entity: entityFilter,
        search: searchTerm,
        limit: 100
      });
      if (res?.success && Array.isArray(res.data)) {
        setLogs(res.data);
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.warn("Error fetching audit logs from MySQL:", err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [entityFilter, searchTerm]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filtered = logs.filter((log) => {
    if (entityFilter !== "ALL" && (log.entity_type || log.entity || "").toUpperCase() !== entityFilter) {
      return false;
    }
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      String(log.id).includes(q) ||
      (log.user_name || "").toLowerCase().includes(q) ||
      (log.user_email || "").toLowerCase().includes(q) ||
      (log.action || "").toLowerCase().includes(q) ||
      (log.details || "").toLowerCase().includes(q) ||
      (log.entity_type || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header Banner */}
      <div className="theme-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-mono font-bold border border-purple-500/20">
              MODULE E • SECURITY & AUDIT CENTER
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
            <ShieldCheck size={28} className="text-purple-500" /> Security & Operational Audit Trail
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Immutable MySQL event vault recording administrator approvals, owner status shifts, remote commands, tariffs, and authentication.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
            className="theme-input font-bold text-xs cursor-pointer"
          >
            <option value="ALL">All Entity Types</option>
            <option value="OWNER">Station Owners</option>
            <option value="STATION">EV Stations</option>
            <option value="CHARGER">Chargers</option>
            <option value="REMOTE_COMMAND">Remote Commands</option>
            <option value="PAYMENT">Payment Reconciliation</option>
            <option value="MAINTENANCE">Maintenance Tickets</option>
            <option value="USER">User & Auth</option>
          </select>

          <div className="relative w-full md:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full theme-input pl-8 text-xs"
            />
          </div>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
            title="Refresh Logs"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="theme-card p-6 overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] text-[var(--text-muted)] font-bold uppercase tracking-wider">
              <th className="py-3 px-3 rounded-l-xl">Log ID & Timestamp</th>
              <th className="py-3 px-3">Actor / Admin</th>
              <th className="py-3 px-3">Role</th>
              <th className="py-3 px-3">Action Executed</th>
              <th className="py-3 px-3">Target Entity</th>
              <th className="py-3 px-3">IP Address</th>
              <th className="py-3 px-3 text-right rounded-r-xl">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)] font-medium">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--text-muted)]">
                  Loading immutable audit records from MySQL...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--text-muted)]">
                  No audit logs found matching criteria.
                </td>
              </tr>
            ) : (
              filtered.slice((page - 1) * limit, page * limit).map((log) => {
                return (
                  <tr key={log.id} className="hover:bg-[var(--bg-surface-raised)]/60 transition">
                    <td className="py-4 px-3 font-mono">
                      <span className="font-bold text-[var(--accent-primary)] block">AUD#{String(log.id).padStart(5, "0")}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">{new Date(log.created_at || log.timestamp).toLocaleString()}</span>
                    </td>

                    <td className="py-4 px-3">
                      <span className="font-bold text-[var(--text-primary)] block">{log.user_name || "System"}</span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">{log.user_email || `UID: ${log.user_id || "N/A"}`}</span>
                    </td>

                    <td className="py-4 px-3 font-mono">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--bg-surface-raised)] text-[var(--text-primary)] border border-[var(--border-subtle)]">
                        {log.user_role || log.role || "SYSTEM"}
                      </span>
                    </td>

                    <td className="py-4 px-3 font-bold font-mono text-purple-600 dark:text-purple-400">
                      {log.action}
                    </td>

                    <td className="py-4 px-3 font-mono">
                      <span className="font-semibold block">{log.entity_type || "SYSTEM"}</span>
                      {log.entity_id && (
                        <span className="text-[10px] text-[var(--text-muted)]">ID: #{log.entity_id}</span>
                      )}
                    </td>

                    <td className="py-4 px-3 font-mono text-[11px] text-[var(--text-muted)]">
                      {log.ip_address || "127.0.0.1"}
                    </td>

                    <td className="py-4 px-3 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] text-[var(--text-primary)] font-bold text-[11px] cursor-pointer inline-flex items-center gap-1"
                      >
                        <Eye size={12} /> Inspect
                      </button>
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
          limitOptions={[5, 10, 20, 50]}
        />
      </div>

      {/* INSPECT LOG MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                <ShieldCheck size={18} className="text-purple-500" /> Audit Log Event #AUD{String(selectedLog.id).padStart(5, "0")}
              </h3>
              <button onClick={() => setSelectedLog(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase block font-semibold">Action</span>
                  <span className="font-bold text-[var(--text-primary)] font-mono">{selectedLog.action}</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase block font-semibold">Entity Target</span>
                  <span className="font-bold text-[var(--text-primary)] font-mono">{selectedLog.entity_type} #{selectedLog.entity_id || "N/A"}</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-[var(--text-muted)] uppercase block mb-1">Payload / Details</label>
                <pre className="p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--text-primary)] overflow-x-auto whitespace-pre-wrap max-h-48">
                  {selectedLog.details || "No metadata recorded."}
                </pre>
              </div>

              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 font-medium">
                <Lock size={12} className="inline mr-1" />
                Sanitization guarantee: All passwords, authentication tokens, and card CVVs are omitted prior to database write.
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[var(--border-subtle)]">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 rounded-xl bg-[var(--accent-primary)] text-white font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
