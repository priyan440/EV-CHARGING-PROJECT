import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Cpu,
  Zap,
  TrendingUp,
  DollarSign,
  Activity,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { useAuth } from "../../contexts/AuthContext";
import { useSystemState } from "../../contexts/SystemStateContext";

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { stations, bookings, activeSessions } = useSystemState();

  const ownerCounterId = currentUser?.counterId || "OWNER0001";
  const ownerStations = stations.filter((s) => s.ownerCounterId === ownerCounterId);

  const totalChargers = ownerStations.reduce(
    (sum, s) => sum + ((s.chargers || []).length || 4),
    0
  );

  const availableChargers = ownerStations.reduce(
    (sum, s) =>
      sum + (s.chargers || []).filter((c) => c.status === "Available").length,
    0
  );

  const occupiedChargers = totalChargers - availableChargers;
  const utilizationRate = totalChargers > 0 ? Math.round((occupiedChargers / totalChargers) * 100) : 72;

  const revenueData = [
    { day: "Mon", revenue: 12400 },
    { day: "Tue", revenue: 14800 },
    { day: "Wed", revenue: 13200 },
    { day: "Thu", revenue: 16500 },
    { day: "Fri", revenue: 18450 },
    { day: "Sat", revenue: 21000 },
    { day: "Sun", revenue: 19500 },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#0B1329] via-[#0F1D3D] to-[#0A2234] border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 text-[10px] font-extrabold uppercase font-mono tracking-wider bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/30">
              STATION OWNER PORTAL
            </span>
            <span className="px-3 py-1 text-[10px] font-extrabold font-mono tracking-wider bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
              ID: {ownerCounterId}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            {currentUser?.businessName || "GreenCharge Infrastructure"} Dashboard
          </h1>

          <p className="text-xs text-slate-300 mt-1">
            Monitor station operational status, charger utilization, live charging sessions, and daily revenue streams.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigate("/owner/stations")}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs tracking-wider uppercase transition flex items-center gap-2"
          >
            <Plus size={16} /> Add Station
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0B1329] border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Today's Revenue</span>
            <h3 className="text-2xl font-black text-emerald-400 font-mono mt-1">₹18,450</h3>
            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-1">
              <TrendingUp size={12} /> +14.2% vs yesterday
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0B1329] border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Chargers Available</span>
            <h3 className="text-2xl font-black text-white font-mono mt-1">{availableChargers} / {totalChargers || 32}</h3>
            <span className="text-[10px] text-cyan-400 font-bold mt-1 block">Utilization: {utilizationRate}%</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
            <Cpu size={24} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0B1329] border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Today's Sessions</span>
            <h3 className="text-2xl font-black text-white font-mono mt-1">64 Sessions</h3>
            <span className="text-[10px] text-slate-400 mt-1 block">Avg duration: 38 mins</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
            <Activity size={24} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0B1329] border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Active Stations</span>
            <h3 className="text-2xl font-black text-white font-mono mt-1">{ownerStations.length || 3} Stations</h3>
            <span className="text-[10px] text-emerald-400 font-bold mt-1 block">Approved & Operational</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <Building2 size={24} />
          </div>
        </div>
      </div>

      {/* Revenue & Utilization Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Weekly Revenue Trend (8 Cols) */}
        <div className="lg:col-span-8 p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-400" /> Weekly Revenue Trend (₹)
            </h3>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded border border-emerald-500/30">
              Total: ₹113,600
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="day" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155", borderRadius: "12px", color: "#FFF" }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Management Links (4 Cols) */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">
            Station Owner Controls
          </h3>

          <div className="space-y-2.5 text-xs">
            <button
              onClick={() => navigate("/owner/stations")}
              className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition flex items-center justify-between text-slate-200 font-bold"
            >
              <span>Manage Stations & Hours</span>
              <ArrowRight size={14} className="text-emerald-400" />
            </button>

            <button
              onClick={() => navigate("/owner/chargers")}
              className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition flex items-center justify-between text-slate-200 font-bold"
            >
              <span>Manage Chargers & Rates</span>
              <ArrowRight size={14} className="text-cyan-400" />
            </button>

            <button
              onClick={() => navigate("/owner/bookings")}
              className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition flex items-center justify-between text-slate-200 font-bold"
            >
              <span>View Customer Bookings</span>
              <ArrowRight size={14} className="text-purple-400" />
            </button>

            <button
              onClick={() => navigate("/owner/maintenance")}
              className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition flex items-center justify-between text-slate-200 font-bold"
            >
              <span>Charger Maintenance Tickets</span>
              <ArrowRight size={14} className="text-amber-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
