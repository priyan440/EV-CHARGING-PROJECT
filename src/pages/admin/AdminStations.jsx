import { useState } from "react";
import { Building2, Search, CheckCircle2, XCircle } from "lucide-react";
import { useSystemState } from "../../contexts/SystemStateContext";

export default function AdminStations() {
  const { stations, updateStationStatus } = useSystemState();
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = stations.filter((s) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (s.id || "").toLowerCase().includes(q) ||
      (s.name || "").toLowerCase().includes(q) ||
      (s.city || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="p-6 md:p-8 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
            <Building2 size={28} className="text-cyan-400" /> Global Station Approval & Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Approve public station listings, edit status, and view owner assignments.
          </p>
        </div>

        <div className="relative w-full md:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search station ID, name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider">
              <th className="py-3 px-3 rounded-l-xl">Station ID</th>
              <th className="py-3 px-3">Owner ID</th>
              <th className="py-3 px-3">Station Name</th>
              <th className="py-3 px-3">City & Address</th>
              <th className="py-3 px-3">Chargers</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right rounded-r-xl">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-200 font-medium">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-slate-900/60 transition">
                <td className="py-4 px-3 font-mono font-bold text-cyan-400">{s.id}</td>
                <td className="py-4 px-3 font-mono text-purple-400">{s.ownerCounterId}</td>
                <td className="py-4 px-3 font-bold text-white">{s.name}</td>
                <td className="py-4 px-3 text-slate-300">
                  <span className="font-bold text-white block">{s.city}</span>
                  <span className="text-[11px] text-slate-500 line-clamp-1">{s.address}</span>
                </td>
                <td className="py-4 px-3 font-mono text-emerald-400">{(s.chargers || []).length} Ports</td>
                <td className="py-4 px-3">
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      s.status === "Approved"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="py-4 px-3 text-right">
                  <div className="flex gap-1 justify-end">
                    {s.status !== "Approved" && (
                      <button
                        onClick={() => updateStationStatus(s.id, "Approved")}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-extrabold text-[11px]"
                      >
                        Approve
                      </button>
                    )}
                    {s.status !== "Suspended" && (
                      <button
                        onClick={() => updateStationStatus(s.id, "Suspended")}
                        className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 font-bold text-[11px]"
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
