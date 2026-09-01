import { useState } from "react";
import { ClipboardList, Search, ShieldCheck } from "lucide-react";
import { useSystemState } from "../../contexts/SystemStateContext";

export default function AdminAuditLogs() {
  const { auditLogs } = useSystemState();
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = auditLogs.filter((log) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (log.user || "").toLowerCase().includes(q) ||
      (log.action || "").toLowerCase().includes(q) ||
      (log.description || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="p-6 md:p-8 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
            <ClipboardList size={28} className="text-purple-400" /> Security & Operational Audit Trail
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            System-wide activity log tracking logins, approvals, station status updates, and bookings.
          </p>
        </div>

        <div className="relative w-full md:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search user, action..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider">
              <th className="py-3 px-3 rounded-l-xl">Timestamp</th>
              <th className="py-3 px-3">User ID</th>
              <th className="py-3 px-3">Role</th>
              <th className="py-3 px-3">Action</th>
              <th className="py-3 px-3 rounded-r-xl">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-200 font-medium">
            {filtered.map((log) => (
              <tr key={log.id} className="hover:bg-slate-900/60 transition">
                <td className="py-4 px-3 font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                <td className="py-4 px-3 font-mono font-bold text-purple-400">{log.user}</td>
                <td className="py-4 px-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                    {log.role}
                  </span>
                </td>
                <td className="py-4 px-3 font-bold text-white">{log.action}</td>
                <td className="py-4 px-3 text-slate-300">{log.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
