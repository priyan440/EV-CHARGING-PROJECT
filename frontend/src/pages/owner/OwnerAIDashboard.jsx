import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BrainCircuit,
  Zap,
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Cpu,
  DollarSign,
  BarChart3,
  Calendar,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useSystemState } from "../../contexts/SystemStateContext";
import { stationIntelligenceService } from "../../services/stationIntelligenceService";

export default function OwnerAIDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { stations, bookings, payments, maintenance } = useSystemState();

  const [loading, setLoading] = useState(true);
  const [intelligence, setIntelligence] = useState(null);
  const [toast, setToast] = useState("");

  const ownerCounterId = currentUser?.counterId || "OWNER0001";

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await stationIntelligenceService.fetchOwnerIntelligence(ownerCounterId, {
        stations,
        bookings,
        payments,
        maintenance,
      });
      setIntelligence(data);
    } catch {
      const data = stationIntelligenceService.getOwnerIntelligence(ownerCounterId, {
        stations,
        bookings,
        payments,
        maintenance,
      });
      setIntelligence(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [stations, bookings, payments, maintenance]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        <p className="text-xs font-mono text-slate-500 uppercase tracking-wider font-semibold">
          Synthesizing AI Station Intelligence & Telemetry...
        </p>
      </div>
    );
  }

  if (!intelligence) {
    return (
      <div className="p-8 text-center rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <AlertTriangle size={36} className="mx-auto text-amber-500 mb-2" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Unable to load station intelligence</h3>
        <p className="text-xs text-slate-500 mt-1">Please ensure your station data is properly registered.</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const { todayIntelligence, revenueIntelligence, recommendations, healthScore } = intelligence;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#0B1329] via-[#0F1D3D] to-[#0A2234] border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 text-[10px] font-extrabold uppercase font-mono tracking-wider bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
              <Sparkles size={12} className="animate-pulse text-emerald-400" />
              AI STATION INTELLIGENCE
            </span>
            <span className="px-3 py-1 text-[10px] font-extrabold font-mono tracking-wider bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/30">
              ID: {ownerCounterId}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            AI Operations & Optimization Hub
          </h1>

          <p className="text-xs text-slate-300 mt-1">
            Real-time heuristic analysis of charger usage, queue patterns, revenue yield, and preventative maintenance needs.
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => {
              loadData();
              setToast("Refreshed real-time telemetry analysis!");
              setTimeout(() => setToast(""), 3000);
            }}
            className="px-4 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 border border-slate-700 cursor-pointer"
          >
            <RefreshCw size={14} /> Refresh AI
          </button>
          <button
            onClick={() => navigate("/owner/demand-forecast")}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <TrendingUp size={16} /> Demand Forecast
          </button>
        </div>
      </div>

      {/* 1. Today's Intelligence Grid */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Activity size={16} className="text-emerald-500" /> Today's Real-Time Intelligence
          </h2>
          <span className="text-[10px] font-mono text-slate-500">Live Telemetry Sync</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Demand</span>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-1 flex items-center gap-1.5 font-mono">
              <span className={`w-2 h-2 rounded-full ${todayIntelligence.currentDemand === "High" ? "bg-amber-500 animate-ping" : "bg-emerald-500"}`} />
              {todayIntelligence.currentDemand}
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 block">
              {todayIntelligence.estimatedUpcomingDemand}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Peak Period</span>
            <div className="text-base font-black text-amber-500 font-mono mt-1">
              {todayIntelligence.peakPeriod}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block font-medium">Surge hours</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Low-Demand Window</span>
            <div className="text-base font-black text-cyan-500 font-mono mt-1">
              {todayIntelligence.lowDemandPeriod}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block font-medium">Ideal for maintenance</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Most-Used Charger</span>
            <div className="text-xs font-black text-slate-900 dark:text-white mt-1 truncate font-mono">
              {todayIntelligence.mostUsedCharger}
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 block">
              {todayIntelligence.mostUsedChargerSessions} sessions today
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Least-Used Charger</span>
            <div className="text-xs font-black text-slate-900 dark:text-white mt-1 truncate font-mono">
              {todayIntelligence.leastUsedCharger}
            </div>
            <span className="text-[10px] text-slate-400 font-bold mt-1 block">
              {todayIntelligence.leastUsedChargerSessions} sessions today
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Charger Availability</span>
            <div className="text-lg font-black text-emerald-500 font-mono mt-1">
              {intelligence.availableChargers} / {intelligence.totalChargers}
            </div>
            <span className="text-[10px] text-slate-500 font-medium mt-1 block">
              {intelligence.utilizationRate}% utilized
            </span>
          </div>
        </div>
      </div>

      {/* 2. Station Health Score & Revenue Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Station Health Score Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-emerald-500" /> Station Health Score
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                {intelligence.healthStatus}
              </span>
            </div>

            <div className="my-6 text-center">
              <div className="inline-flex items-baseline justify-center">
                <span className="text-6xl font-black font-mono text-emerald-500 dark:text-emerald-400">
                  {healthScore}
                </span>
                <span className="text-2xl font-bold font-mono text-slate-400 ml-1">/100</span>
              </div>
              <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto">
                Computed from live availability, thermal uptime, queue throughput, and maintenance tickets.
              </p>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-4 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Hardware Availability (30%)</span>
              <span className="font-bold text-emerald-500">28 / 30</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Session Utilization Health (25%)</span>
              <span className="font-bold text-emerald-500">23 / 25</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Preventative Maintenance (25%)</span>
              <span className="font-bold text-emerald-500">24 / 25</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Customer Satisfaction (20%)</span>
              <span className="font-bold text-emerald-500">18 / 20</span>
            </div>
          </div>
        </div>

        {/* Revenue Intelligence */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <DollarSign size={16} className="text-cyan-500" /> Revenue Intelligence
              </span>
              <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold font-mono">
                Peak: {revenueIntelligence.highestRevenuePeriod}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Today's Revenue</span>
                <div className="text-xl font-black text-emerald-500 font-mono mt-1">
                  ₹{revenueIntelligence.todayRevenue.toLocaleString()}
                </div>
                <span className="text-[10px] text-emerald-500 font-semibold">+12% vs last week</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Weekly Revenue</span>
                <div className="text-xl font-black text-cyan-500 font-mono mt-1">
                  ₹{revenueIntelligence.weeklyRevenue.toLocaleString()}
                </div>
                <span className="text-[10px] text-cyan-500 font-semibold">7-day active volume</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Monthly Projection</span>
                <div className="text-xl font-black text-purple-500 font-mono mt-1">
                  ₹{revenueIntelligence.monthlyRevenue.toLocaleString()}
                </div>
                <span className="text-[10px] text-purple-500 font-semibold">On target (+8.4%)</span>
              </div>
            </div>

            {/* Charger Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2">Charger Gun</th>
                    <th className="py-2">Type</th>
                    <th className="py-2">Power</th>
                    <th className="py-2">Today's Sessions</th>
                    <th className="py-2 text-right">Revenue Yield</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {revenueIntelligence.chargerPerformance.map((ch) => (
                    <tr key={ch.chargerId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Cpu size={14} className="text-emerald-500 shrink-0" />
                        {ch.name}
                      </td>
                      <td className="py-2.5 text-slate-500">{ch.type}</td>
                      <td className="py-2.5 font-mono text-cyan-600 dark:text-cyan-400 font-bold">{ch.powerKw} kW</td>
                      <td className="py-2.5 font-mono">{ch.sessions}</td>
                      <td className="py-2.5 font-mono font-bold text-emerald-500 text-right">₹{ch.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 3. AI Smart Recommendations Cards */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <BrainCircuit size={16} className="text-purple-500" /> Prescriptive AI Action Cards
          </h2>
          <span className="text-[10px] font-mono text-emerald-500 font-bold">4 High-Yield Directives</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec) => {
            const isHigh = rec.priority === "HIGH";
            const isMed = rec.priority === "MEDIUM";

            return (
              <div
                key={rec.id}
                className="p-5 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-500/50 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase tracking-wider border ${
                        isHigh
                          ? "bg-red-500/10 text-red-500 border-red-500/30"
                          : isMed
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                          : "bg-blue-500/10 text-blue-500 border-blue-500/30"
                      }`}
                    >
                      {rec.priority} PRIORITY
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">{rec.category}</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {rec.title}
                  </h3>

                  <div className="p-2.5 my-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    📊 {rec.expectedMetric}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {rec.explanation}
                  </p>

                  <div className="mt-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300">
                    <strong className="block text-[10px] uppercase tracking-wider font-extrabold text-emerald-600 dark:text-emerald-400 mb-0.5">
                      Recommendation:
                    </strong>
                    {rec.recommendedAction}
                  </div>
                </div>

                <button
                  onClick={() => navigate(rec.actionRoute)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer group"
                >
                  <span>{rec.actionLabel}</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
