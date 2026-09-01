import { Activity, Zap } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useSystemState } from "../../contexts/SystemStateContext";

export default function OwnerSessions() {
  const { currentUser } = useAuth();
  const { activeSessions } = useSystemState();

  return (
    <div className="space-y-6">
      <div className="p-6 md:p-8 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-2xl">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
          <Activity size={28} className="text-emerald-400" /> Live Station Sessions Monitor
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Monitor real-time telemetry stream for active charging sessions across all chargers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeSessions.map((s) => (
          <div key={s.sessionId} className="p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-xl border border-emerald-500/30">
                {s.sessionId}
              </span>
              <span className="animate-pulse px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {s.status}
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">{s.stationName}</h3>
              <p className="text-xs text-slate-400">Customer: <strong className="text-white">{s.customerName}</strong> ({s.counterId})</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900/90 p-3 rounded-2xl border border-slate-800 font-mono">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Power Output</span>
                <span className="font-bold text-emerald-400">{s.currentPowerKw || 42.7} kW</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Energy Consumed</span>
                <span className="font-bold text-cyan-400">{s.energyConsumedKwh || 18.4} kWh</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Battery Level</span>
                <span className="font-bold text-white">{s.batteryCurrent}%</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Live Cost</span>
                <span className="font-bold text-amber-400">₹{s.currentCost || 331}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
