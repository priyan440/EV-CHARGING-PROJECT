import React, { useState, useEffect } from "react";
import {
  Sliders,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Building2,
  Cpu,
  Save,
} from "lucide-react";
import {
  getOwnerStations,
  getStationLoadProfile,
  updateSmartLoadCapacity,
} from "../../services/ownerService";
import { getSocket } from "../../services/socketService";

export default function OwnerSmartLoad() {
  const [stations, setStations] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState("");
  const [loadProfile, setLoadProfile] = useState(null);
  const [gridCapacityInput, setGridCapacityInput] = useState(120);
  const [loadBalancingMode, setLoadBalancingMode] = useState("DYNAMIC_AI");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const loadStationsAndProfile = async () => {
    setLoading(true);
    try {
      const stns = await getOwnerStations();
      setStations(stns);
      const activeStn = selectedStationId || stns[0]?.stationId || "STN0001";
      if (!selectedStationId && stns.length > 0) {
        setSelectedStationId(activeStn);
      }

      if (activeStn) {
        const profile = await getStationLoadProfile(activeStn);
        setLoadProfile(profile);
        setGridCapacityInput(profile?.maxStationCapacityKw || 120);
        setLoadBalancingMode(profile?.loadBalancingMode || "DYNAMIC_AI");
      }
    } catch (err) {
      console.error(err);
      showToast("Error loading smart load management profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStationsAndProfile();

    const socket = getSocket?.();
    if (socket) {
      socket.on("load_balanced", (data) => {
        if (data.profile?.stationId === selectedStationId) {
          setLoadProfile(data.profile);
        }
      });
      return () => socket.off("load_balanced");
    }
  }, [selectedStationId]);

  const handleSaveCapacity = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateSmartLoadCapacity(selectedStationId, {
        maxStationCapacityKw: Number(gridCapacityInput),
        loadBalancingMode,
      });
      setLoadProfile(res.data);
      showToast(`Grid capacity updated to ${gridCapacityInput} kW with automated load throttling.`);
    } catch (err) {
      showToast("Error updating load capacity: " + (err.message || "Failed"));
    } finally {
      setSaving(false);
    }
  };

  const p = loadProfile || {};
  const maxCap = p.maxStationCapacityKw || gridCapacityInput || 120;
  const currDemand = p.currentDemandKw || 0;
  const availCap = Math.max(0, maxCap - currDemand);
  const demandPercent = Math.min(100, Math.round((currDemand / maxCap) * 100));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in font-sans text-[var(--text-primary)]">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-[var(--accent-primary)] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-blue-400/30 animate-fade-in font-bold text-xs">
          <Sparkles className="w-4 h-4 text-yellow-300" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="theme-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-3 font-mono">
            <Sliders className="w-7 h-7 text-cyan-500" />
            Smart Grid Load Management
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Dynamic power throttling and peak-shaving algorithms prevent transformer overloads when multiple fast chargers operate simultaneously.
          </p>
        </div>

        <select
          value={selectedStationId}
          onChange={(e) => setSelectedStationId(e.target.value)}
          className="bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none font-bold cursor-pointer"
        >
          {stations.map((st) => (
            <option key={st.stationId || st.id} value={st.stationId || st.id}>
              {st.stationId || st.id} - {st.stationName || st.name}
            </option>
          ))}
        </select>
      </div>

      {/* Power Gauge Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="theme-card p-5">
          <span className="text-xs font-bold text-[var(--text-muted)] uppercase">Max Grid Capacity Limit</span>
          <div className="text-3xl font-black text-[var(--text-primary)] font-mono mt-1">{maxCap} <span className="text-base font-bold text-cyan-600 dark:text-cyan-400">kW</span></div>
          <div className="text-xs text-[var(--text-muted)] mt-2">Transformer Safety Limit</div>
        </div>

        <div className="theme-card p-5">
          <span className="text-xs font-bold text-[var(--text-muted)] uppercase">Active Charging Demand</span>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1">{currDemand} <span className="text-base font-bold text-amber-500">kW</span></div>
          <div className="text-xs text-[var(--text-muted)] mt-2">{demandPercent}% utilization of grid limit</div>
        </div>

        <div className="theme-card p-5">
          <span className="text-xs font-bold text-[var(--text-muted)] uppercase">Headroom Available</span>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">{availCap} <span className="text-base font-bold text-emerald-500">kW</span></div>
          <div className="text-xs text-[var(--text-muted)] mt-2">Available for next vehicle</div>
        </div>
      </div>

      {/* Load Balancing Progress Visualizer */}
      <div className="theme-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-[var(--text-primary)]">Live Grid Capacity Saturation</span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${demandPercent > 85 ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"}`}>
            {p.status || "BALANCED"}
          </span>
        </div>

        <div className="w-full h-4 bg-[var(--bg-surface-raised)] rounded-full overflow-hidden p-0.5 border border-[var(--border-subtle)]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              demandPercent > 85 ? "bg-gradient-to-r from-amber-500 to-rose-500" : "bg-gradient-to-r from-cyan-500 to-emerald-400"
            }`}
            style={{ width: `${demandPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Configuration & Port Allocation Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Set Grid Limit Form */}
        <div className="theme-card p-6 space-y-4">
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 font-mono">
            <Zap className="w-5 h-5 text-cyan-500" />
            Grid Capacity Settings
          </h2>

          <form onSubmit={handleSaveCapacity} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Max Grid Ceiling (kW)</label>
              <input
                type="number"
                value={gridCapacityInput}
                onChange={(e) => setGridCapacityInput(e.target.value)}
                className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] font-mono font-bold focus:outline-none"
                required
              />
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Enter your sanctioned grid connection limit (e.g. 100 kW or 240 kW).
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Load Balancing Algorithm</label>
              <select
                value={loadBalancingMode}
                onChange={(e) => setLoadBalancingMode(e.target.value)}
                className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] font-bold focus:outline-none"
              >
                <option value="DYNAMIC_AI">Dynamic AI Equal Distribution</option>
                <option value="PROPORTIONAL">Proportional State-of-Charge</option>
                <option value="FIRST_COME_FIRST_SERVE">First-Come Priority (FCFS)</option>
                <option value="PEAK_SHAVING">Peak Shaving Eco Mode</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {saving ? "Updating..." : "Save Grid Limits"}
            </button>
          </form>
        </div>

        {/* Dynamic Port Allocations */}
        <div className="lg:col-span-2 theme-card p-6 space-y-4">
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 font-mono">
            <Cpu className="w-5 h-5 text-cyan-500" />
            Dynamic Charger Power Allocations
          </h2>

          {(p.allocations || []).length === 0 ? (
            <div className="text-xs text-[var(--text-muted)] text-center py-10">No charger power allocations mapped.</div>
          ) : (
            <div className="space-y-3">
              {p.allocations.map((a, i) => (
                <div
                  key={a.chargerId || i}
                  className="p-4 bg-[var(--bg-surface-raised)] rounded-2xl border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400 text-xs px-2 py-0.5 bg-cyan-500/10 rounded-md">
                        {a.chargerId}
                      </span>
                      <span className="font-bold text-[var(--text-primary)] text-xs">{a.chargerName || "Charger Unit"}</span>
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      Requested: {a.requestedKw || 60} kW | Priority Level: #{a.priority}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Allocated Power</div>
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">{a.allocatedKw} kW</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations Block */}
          {(p.recommendations || []).length > 0 && (
            <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl space-y-1.5">
              <div className="text-xs font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> AI Load Balancing Recommendation
              </div>
              {p.recommendations.map((rec, idx) => (
                <p key={idx} className="text-xs text-[var(--text-primary)]">• {rec}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
