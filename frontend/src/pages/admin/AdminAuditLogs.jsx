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
      <div className="p-6 md:p-8 rounded-3xl theme-card shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <ClipboardList size={28} className="text-purple-500" /> Security & Operational Audit Trail
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            System-wide activity log tracking logins, approvals, station status updates, and bookings.
          </p>
        </div>

        <div className="relative w-full md:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search user, action..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      <div className="p-6 rounded-3xl theme-card shadow-xl overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] text-[var(--text-muted)] font-bold uppercase tracking-wider">
              <th className="py-3 px-3 rounded-l-xl">Timestamp</th>
              <th className="py-3 px-3">User ID</th>
              <th className="py-3 px-3">Role</th>
              <th className="py-3 px-3">Action</th>
              <th className="py-3 px-3 rounded-r-xl">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)] font-medium">
            {filtered.map((log) => (
              <tr key={log.id} className="hover:bg-[var(--bg-surface-raised)] transition">
                <td className="py-4 px-3 font-mono text-[var(--text-muted)]">{new Date(log.timestamp).toLocaleString()}</td>
                <td className="py-4 px-3 font-mono font-bold text-purple-600 dark:text-purple-400">{log.user}</td>
                <td className="py-4 px-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--bg-surface-raised)] text-[var(--text-primary)] border border-[var(--border-subtle)]">
                    {log.role}
                  </span>
                </td>
                <td className="py-4 px-3 font-bold text-[var(--text-primary)]">{log.action}</td>
                <td className="py-4 px-3 text-[var(--text-muted)]">{log.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
