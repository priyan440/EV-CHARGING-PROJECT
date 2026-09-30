import { useState } from "react";
import { Users, Search, ShieldCheck } from "lucide-react";
import { useSystemState } from "../../contexts/SystemStateContext";

export default function AdminUsers() {
  const { customers } = useSystemState();
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = customers.filter((c) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (c.counterId || "").toLowerCase().includes(q) ||
      (c.name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="p-6 md:p-8 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
            <Users size={28} className="text-emerald-400" /> Customer User Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Search customers, inspect Counter IDs (`CUS0001`), vehicles, and account status.
          </p>
        </div>

        <div className="relative w-full md:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Counter ID, name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider">
              <th className="py-3 px-3 rounded-l-xl">Counter ID</th>
              <th className="py-3 px-3">Name & Email</th>
              <th className="py-3 px-3">Mobile</th>
              <th className="py-3 px-3">City</th>
              <th className="py-3 px-3">Primary Vehicle</th>
              <th className="py-3 px-3 rounded-r-xl">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-200 font-medium">
            {filtered.map((c) => (
              <tr key={c.counterId} className="hover:bg-slate-900/60 transition">
                <td className="py-4 px-3 font-mono font-bold text-emerald-400">{c.counterId}</td>
                <td className="py-4 px-3">
                  <span className="font-bold text-white block">{c.name}</span>
                  <span className="text-slate-400 text-[11px]">{c.email}</span>
                </td>
                <td className="py-4 px-3 font-mono text-slate-300">{c.mobile || "9876543210"}</td>
                <td className="py-4 px-3 text-slate-300 font-bold">{c.city || "Madurai"}</td>
                <td className="py-4 px-3 font-mono text-cyan-400">
                  {c.vehicle?.number || c.vehicles?.[0]?.number || "TN58AB1234"} ({c.vehicle?.brand || "Tata"})
                </td>
                <td className="py-4 px-3">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Active
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
