import { useState } from "react";
import { ShieldCheck, Search, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useSystemState } from "../../contexts/SystemStateContext";

export default function AdminOwners() {
  const { owners, updateOwnerStatus } = useSystemState();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filtered = owners.filter((o) => {
    if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        (o.counterId || "").toLowerCase().includes(q) ||
        (o.ownerName || "").toLowerCase().includes(q) ||
        (o.businessName || "").toLowerCase().includes(q) ||
        (o.email || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
            <ShieldCheck size={28} className="text-purple-400" /> Station Owner Management & Approvals
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review registered station owners (OWNER Counter IDs), verify business details, and manage access status.
          </p>
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 font-bold"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Owners Table */}
      <div className="p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider">
              <th className="py-3 px-3 rounded-l-xl">Owner Counter ID</th>
              <th className="py-3 px-3">Business Name & Owner</th>
              <th className="py-3 px-3">Email / Mobile</th>
              <th className="py-3 px-3">City & Address</th>
              <th className="py-3 px-3">GST Number</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right rounded-r-xl">Approval Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-200 font-medium">
            {filtered.map((o) => (
              <tr key={o.counterId} className="hover:bg-slate-900/60 transition">
                <td className="py-4 px-3 font-mono font-bold text-purple-400">{o.counterId}</td>
                <td className="py-4 px-3">
                  <span className="font-bold text-white block">{o.businessName}</span>
                  <span className="text-slate-400 text-[11px]">{o.ownerName}</span>
                </td>
                <td className="py-4 px-3 text-slate-300">
                  <div>{o.email}</div>
                  <div className="font-mono text-slate-500">{o.phone}</div>
                </td>
                <td className="py-4 px-3 text-slate-300">
                  <span className="font-bold text-white block">{o.city}</span>
                  <span className="text-[11px] text-slate-500 line-clamp-1">{o.businessAddress}</span>
                </td>
                <td className="py-4 px-3 font-mono text-slate-300">{o.gstNumber || "33AAAAA0000A1Z5"}</td>
                <td className="py-4 px-3">
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      o.status === "Approved"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : o.status === "Pending Approval"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-red-500/20 text-red-400 border border-red-500/30"
                    }`}
                  >
                    {o.status}
                  </span>
                </td>
                <td className="py-4 px-3 text-right">
                  <div className="flex gap-1 justify-end">
                    {o.status !== "Approved" && (
                      <button
                        onClick={() => updateOwnerStatus(o.counterId, "Approved")}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px]"
                      >
                        Approve
                      </button>
                    )}
                    {o.status !== "Suspended" && (
                      <button
                        onClick={() => updateOwnerStatus(o.counterId, "Suspended")}
                        className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold text-[11px]"
                      >
                        Suspend
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
