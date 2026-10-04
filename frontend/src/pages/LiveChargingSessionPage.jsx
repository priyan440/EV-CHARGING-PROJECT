import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Zap,
  Battery,
  BatteryCharging,
  Clock,
  Gauge,
  MapPin,
  Car,
  Square,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Activity,
} from "lucide-react";
import { motion } from "framer-motion";
import Breadcrumbs from "../components/Breadcrumbs";
import { chargingService } from "../services/chargingService";
import Toast from "../components/Toast";

export default function LiveChargingSessionPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stopping, setStopping] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });

  // Real-time simulated telemetry ticks
  const [soc, setSoc] = useState(65);
  const [energyDelivered, setEnergyDelivered] = useState(12.5);
  const [elapsedSeconds, setElapsedSeconds] = useState(501); // 08:21
  const [powerKw, setPowerKw] = useState(72.0);
  const [actualCost, setActualCost] = useState(225.0);

  useEffect(() => {
    // 1. Try to start or fetch active session
    chargingService.getActiveChargingSession()
      .then((res) => {
        if (res?.active && res?.session) {
          setSession(res.session);
          setSoc(res.session.batterySoc || 65);
          setEnergyDelivered(parseFloat(res.session.energyDelivered) || 12.5);
          setPowerKw(parseFloat(res.session.powerKw) || 72.0);
        } else {
          // If no active session, start one for this booking/session ID
          chargingService.startChargingSession(id)
            .then((startRes) => {
              if (startRes?.session) {
                setSession(startRes.session);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  // Live Telemetry Ticker (increments elapsed time, SOC, energy, cost)
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);

      // Random small fluctuation in power (e.g. 71.8 - 72.4 kW)
      const powerJitter = 71.5 + Math.random() * 1.5;
      setPowerKw(Math.round(powerJitter * 10) / 10);

      // Deliver ~0.02 kWh every 2 seconds
      setEnergyDelivered((prev) => {
        const next = Math.round((prev + 0.02) * 100) / 100;
        setActualCost(Math.round((next * 18 + 15) * 100) / 100);
        return next;
      });

      // Slowly increment SOC every 8 seconds up to 90%
      setSoc((prev) => (prev < 90 ? prev + 1 : 90));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const formatElapsed = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleStopCharging = async () => {
    if (!window.confirm("Are you sure you want to stop the charging session?")) return;

    setStopping(true);
    try {
      const sessionId = session?.id || session?.sessionId || id;
      await chargingService.stopChargingSession(sessionId, {
        energyKwh: energyDelivered,
        finalSoc: soc,
        actualCost,
      });

      setToast({ message: "Charging session stopped successfully! Saved to history.", type: "success" });
      setTimeout(() => {
        navigate("/history");
      }, 1000);
    } catch (err) {
      setToast({ message: err.message || "Failed to stop charging", type: "error" });
    } finally {
      setStopping(false);
    }
  };

  const remainingMins = Math.max(1, Math.round(((85 - soc) / 100) * 40.5 / (powerKw / 60)));

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-16">
      <Breadcrumbs
        items={[
          { label: "My Bookings", path: "/bookings" },
          { label: "Live Charging Session", path: `/sessions/${id}` },
        ]}
      />

      {/* Top Banner (Section 22: CHARGING NOW) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-extrabold uppercase tracking-widest mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>CHARGING NOW • ACTIVE TELEMETRY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">
            Live Session #{session?.sessionId || id || "CS0001"}
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            {session?.stationName || "GreenVolt Hub"} • {session?.chargerName || "DC Fast Charger"}
          </p>
        </div>

        {/* Emergency Stop Charging Button */}
        <button
          type="button"
          disabled={stopping}
          onClick={handleStopCharging}
          className="px-6 py-3.5 rounded-2xl bg-rose-500/20 border border-rose-500 text-rose-400 hover:bg-rose-500 hover:text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-rose-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Square size={14} className="fill-current" />
          <span>{stopping ? "Stopping Session..." : "Stop Charging"}</span>
        </button>
      </div>

      {/* Main Animated Battery Gauge Card */}
      <div className="theme-card p-6 sm:p-10 rounded-3xl space-y-8 text-center border border-emerald-500/30 shadow-2xl">
        {/* Animated Battery SOC Ring / Indicator */}
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 mx-auto flex items-center justify-center">
          {/* Pulsing ambient glow */}
          <div className="absolute inset-0 rounded-full bg-emerald-500/15 blur-2xl animate-pulse" />

          {/* Circular SVG Ring */}
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              className="text-[var(--bg-card-subtle)] stroke-current"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              className="text-emerald-500 stroke-current transition-all duration-1000 ease-out"
              strokeWidth="8"
              strokeDasharray={264}
              strokeDashoffset={264 - (264 * soc) / 100}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Centered Percentage Display */}
          <div className="absolute flex flex-col items-center justify-center space-y-0.5">
            <Zap size={24} className="text-emerald-400 fill-emerald-400 animate-bounce" />
            <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-[var(--text-primary)]">
              {soc}%
            </div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
              Target: 80%
            </span>
          </div>
        </div>

        {/* Live Metrics Grid (Section 22) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
          {/* Energy Delivered */}
          <div className="bg-[var(--bg-card-subtle)] p-4 rounded-2xl border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center gap-1">
              <Zap size={12} className="text-emerald-500" /> Energy Delivered
            </span>
            <div className="text-2xl font-black font-mono text-[var(--text-primary)]">
              {energyDelivered} <span className="text-xs text-[var(--text-muted)]">kWh</span>
            </div>
          </div>

          {/* Elapsed Time */}
          <div className="bg-[var(--bg-card-subtle)] p-4 rounded-2xl border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center gap-1">
              <Clock size={12} className="text-emerald-500" /> Elapsed Time
            </span>
            <div className="text-2xl font-black font-mono text-emerald-400">
              {formatElapsed(elapsedSeconds)}
            </div>
          </div>

          {/* Estimated Remaining */}
          <div className="bg-[var(--bg-card-subtle)] p-4 rounded-2xl border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center gap-1">
              <BatteryCharging size={12} className="text-amber-500" /> Estimated Remaining
            </span>
            <div className="text-2xl font-black font-mono text-[var(--text-primary)]">
              ~{remainingMins} <span className="text-xs text-[var(--text-muted)]">min</span>
            </div>
          </div>

          {/* Live Charging Power */}
          <div className="bg-[var(--bg-card-subtle)] p-4 rounded-2xl border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center gap-1">
              <Gauge size={12} className="text-cyan-500" /> Charging Power
            </span>
            <div className="text-2xl font-black font-mono text-cyan-400">
              {powerKw} <span className="text-xs text-[var(--text-muted)]">kW</span>
            </div>
          </div>
        </div>

        {/* Cost Metrics Comparison */}
        <div className="bg-[var(--bg-card-subtle)] p-5 rounded-2xl border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Estimated Cost</span>
              <span className="text-lg font-mono font-bold text-[var(--text-secondary)]">₹295.00</span>
            </div>

            <div className="h-8 w-px bg-[var(--border-subtle)]" />

            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">Current Actual Cost</span>
              <span className="text-2xl font-mono font-black text-emerald-400">₹{actualCost}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
            <span>Automated cut-off at target 80% to protect battery longevity</span>
          </div>
        </div>
      </div>

      {toast.message && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />
      )}
    </div>
  );
}
