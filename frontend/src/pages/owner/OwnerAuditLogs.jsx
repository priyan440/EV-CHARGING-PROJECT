import { useState, useEffect } from "react";
import {
  FileText,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Activity,
  ArrowRight,
  Database,
  Layers
} from "lucide-react";
import { getOwnerAuditLogs } from "../../services/ownerService";

export default function OwnerAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await getOwnerAuditLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getActionBadgeClass = (action = "") => {
    const act = action.toUpperCase();
    if (act.includes("CREATE") || act.includes("START") || act.includes("ADD")) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    }
    if (act.includes("UPDATE") || act.includes("CHANGE") || act.includes("ASSIGN")) {
      return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    }
    if (act.includes("STOP") || act.includes("DELETE") || act.includes("CANCEL") || act.includes("DISABLE")) {
      return "bg-rose-500/10 text-rose-400 border-rose-500/30";
    }
    return "bg-slate-500/10 text-slate-400 border-slate-500/30";
  };

  const filteredLogs = logs.filter((log) => {
    const matchesEntity =
      entityFilter === "ALL" ||
      (log.entity && log.entity.toUpperCase() === entityFilter.toUpperCase());

    const matchesSearch =
      !searchTerm ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesEntity && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShieldCheck className="w-6 h-6" />
            </span>
            System Audit Trail
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Immutable, database-recorded log of all administrative, configuration, and charging operations.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-2 self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-purple-500" : ""}`} />
          Refresh Logs
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by action, entity ID, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          {["ALL", "STATION", "CHARGER", "BOOKING", "SESSION", "TARIFF", "PAYMENT", "MAINTENANCE"].map((ent) => (
            <button
              key={ent}
              onClick={() => setEntityFilter(ent)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition ${
                entityFilter === ent
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              {ent}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
            <p className="text-slate-400 text-sm font-medium">Loading audit records from MySQL...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <Database className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-40" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Audit Records Found</h3>
            <p className="text-slate-500 text-xs mt-1">Audit entries are automatically generated upon database mutation events.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Entity ID</th>
                  <th className="py-3 px-4">Initiated By</th>
                  <th className="py-3 px-4">Details / Changes</th>
                  <th className="py-3 px-4 text-right">View Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredLogs.map((log) => {
                  const id = log._id || log.id;
                  return (
                    <tr
                      key={id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : new Date().toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border ${getActionBadgeClass(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                        {log.entity || "SYSTEM"}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-purple-600 dark:text-purple-400">
                        {log.entityId || "N/A"}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.userId?.name || log.userId || log.role || "OWNER"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {log.details || (log.newValue ? JSON.stringify(log.newValue) : "Standard operation")}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {(log.oldValue || log.newValue) && (
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold text-[10px] uppercase tracking-wider transition"
                          >
                            Inspect
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Diff Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-500" />
                <h3 className="font-bold text-slate-900 dark:text-white">Audit Entry Details</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Action</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedLog.action}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Entity ID</span>
                <span className="font-mono font-bold text-purple-400">{selectedLog.entityId || "N/A"}</span>
              </div>
            </div>

            {selectedLog.oldValue && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Previous State (Old)</h4>
                <pre className="p-3 rounded-xl bg-slate-900 text-rose-300 font-mono text-xs overflow-x-auto border border-rose-500/20">
                  {typeof selectedLog.oldValue === "object"
                    ? JSON.stringify(selectedLog.oldValue, null, 2)
                    : selectedLog.oldValue}
                </pre>
              </div>
            )}

            {selectedLog.newValue && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Applied State (New)</h4>
                <pre className="p-3 rounded-xl bg-slate-900 text-emerald-300 font-mono text-xs overflow-x-auto border border-emerald-500/20">
                  {typeof selectedLog.newValue === "object"
                    ? JSON.stringify(selectedLog.newValue, null, 2)
                    : selectedLog.newValue}
                </pre>
              </div>
            )}

            <button
              onClick={() => setSelectedLog(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-purple-600 text-white font-bold text-xs transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
