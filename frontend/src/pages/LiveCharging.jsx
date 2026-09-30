import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Zap,
  Activity,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Clock,
  BatteryCharging,
  Gauge,
  MapPin,
  Car,
  CreditCard,
  X,
  Power,
  ShieldAlert,
  ArrowRight,
  Download,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  getActiveChargingSession,
  updateLiveTelemetry,
  stopChargingSession,
} from "../services/chargingService";
import InvoiceModal from "../components/InvoiceModal";

export default function LiveCharging() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [activeSession, setActiveSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStopping, setIsStopping] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [completedSummary, setCompletedSummary] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Live telemetry state
  const [batteryLevel, setBatteryLevel] = useState(20);
  const [energyDelivered, setEnergyDelivered] = useState(0);
  const [currentCost, setCurrentCost] = useState(0);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [chargingPower, setChargingPower] = useState(50);

  // Fetch active session from backend
  const fetchActiveSession = async () => {
    try {
      const res = await getActiveChargingSession();
      if (res?.active && res.session) {
        setActiveSession(res.session);
        setBatteryLevel(res.session.currentBattery || res.session.startingBattery || 20);
        setEnergyDelivered(parseFloat(res.session.energyDelivered) || 0);
        setCurrentCost(parseFloat(res.session.currentCost) || 0);
        setElapsedMinutes(res.session.durationMinutes || 0);
        setChargingPower(parseFloat(res.session.chargingPower) || 50);
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.error("fetchActiveSession error:", err);
      setActiveSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveSession();
  }, [currentUser]);

  // Live simulation & telemetry synchronization interval
  useEffect(() => {
    if (!activeSession || activeSession.status !== "ACTIVE" || completedSummary) return;

    const interval = setInterval(() => {
      setBatteryLevel((prev) => {
        const target = activeSession.targetBattery || 80;
        if (prev >= target) return target;
        return prev + 1;
      });

      setEnergyDelivered((prev) => {
        const nextEnergy = parseFloat((prev + 0.35).toFixed(2));
        return nextEnergy;
      });

      setElapsedMinutes((prev) => prev + 1);

      setCurrentCost((prev) => {
        const nextCost = Math.round((prev + 5.25) * 100) / 100;
        return nextCost;
      });

      // Fluctuate charging power realistically between 46.5 kW and 50.0 kW
      setChargingPower(parseFloat((47.0 + Math.random() * 3.0).toFixed(1)));
    }, 2500);

    return () => clearInterval(interval);
  }, [activeSession, completedSummary]);

  // Periodically persist telemetry to backend
  useEffect(() => {
    if (!activeSession || activeSession.status !== "ACTIVE" || completedSummary) return;

    const syncInterval = setInterval(() => {
      updateLiveTelemetry(activeSession.sessionId, {
        current_battery: batteryLevel,
        energy_delivered: energyDelivered,
        current_cost: currentCost,
        duration_minutes: elapsedMinutes,
      }).catch(() => {});
    }, 10000);

    return () => clearInterval(syncInterval);
  }, [activeSession, batteryLevel, energyDelivered, currentCost, elapsedMinutes, completedSummary]);

  // Handle Stop Charging Confirmation & Atomic Backend Execution
  const handleConfirmStop = async () => {
    if (!activeSession) return;
    setIsStopping(true);
    try {
      const res = await stopChargingSession(activeSession.sessionId, {
        final_battery: batteryLevel,
        energy_delivered: energyDelivered,
        duration_minutes: Math.max(1, elapsedMinutes),
        current_cost: currentCost,
      });

      if (res.success && res.summary) {
        setShowStopModal(false);
        setActiveSession(null);
        setCompletedSummary(res.summary);
      } else {
        alert(res.message || "Failed to stop charging session.");
      }
    } catch (err) {
      alert(err.message || "Error finalizing charging session.");
    } finally {
      setIsStopping(false);
    }
  };

  // Remaining minutes estimation
  const targetBat = activeSession?.targetBattery || 80;
  const remainingPercent = Math.max(0, targetBat - batteryLevel);
  const remainingMins = Math.max(1, Math.round((remainingPercent / 60) * 45));

  if (isLoading) {
    return (
      <div className="bg-[#0B132B] border border-slate-800 p-16 rounded-3xl text-center space-y-3 max-w-3xl mx-auto shadow-xl">
        <Activity size={32} className="animate-spin text-blue-400 mx-auto" />
        <p className="text-sm font-bold text-slate-300">Checking active charging telemetry...</p>
      </div>
    );
  }

  // Completion Receipt Screen
  if (completedSummary) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in font-inter">
        <div className="bg-[#0B132B] border border-slate-800 p-8 rounded-3xl text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <CheckCircle2 size={36} />
          </div>

          <div>
            <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 uppercase">
              SESSION FINALIZED & CONNECTOR RELEASED
            </span>
            <h2 className="text-2xl font-extrabold text-white mt-2">CHARGING COMPLETED</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Your EV charging session has finished successfully. Your booking is updated to COMPLETED and invoice is ready.
            </p>
          </div>

          {/* Metrics summary card */}
          <div className="grid grid-cols-3 gap-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Energy Delivered</span>
              <span className="text-lg font-black text-white font-mono">{completedSummary.energyDelivered} kWh</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Duration</span>
              <span className="text-lg font-black text-white font-mono">{completedSummary.durationMinutes} min</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Amount</span>
              <span className="text-lg font-black text-emerald-400 font-mono">₹{completedSummary.finalAmount}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setSelectedInvoice(completedSummary)}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition"
            >
              <FileText size={15} /> VIEW INVOICE
            </button>
            <button
              onClick={() => navigate("/customer/bookings")}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              MY BOOKINGS <ArrowRight size={15} />
            </button>
          </div>
        </div>

        {selectedInvoice && (
          <InvoiceModal
            booking={selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
          />
        )}
      </div>
    );
  }

  // Empty State (No Active Session)
  if (!activeSession) {
    return (
      <div className="max-w-2xl mx-auto p-12 rounded-3xl bg-[#0B132B] border border-slate-800 text-center space-y-5 shadow-2xl font-inter">
        <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto shadow-inner">
          <Zap size={32} className="text-blue-400 fill-blue-400/20" />
        </div>
        <div>
          <h3 className="text-xl font-extrabold text-white">NO ACTIVE CHARGING SESSION</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1.5">
            You don't have an active charging session right now. Check in for an upcoming reservation to start live charging.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate("/customer/stations")}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition"
          >
            <MapPin size={15} /> FIND A STATION
          </button>
          <button
            onClick={() => navigate("/customer/bookings")}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            <Activity size={15} /> VIEW MY BOOKINGS
          </button>
        </div>
      </div>
    );
  }

  // Active Live Charging Screen
  return (
    <div className="max-w-3xl mx-auto space-y-6 font-inter">
      {/* Header Banner */}
      <div className="bg-[#0B132B] border border-slate-800 p-6 md:p-8 rounded-3xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded border border-emerald-500/30 uppercase tracking-widest">
              LIVE CHARGING ACTIVE
            </span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {activeSession.sessionId}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">LIVE CHARGING</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor your active EV charging session in real time with live battery and power telemetry.
          </p>
        </div>

        <div>
          <button
            onClick={() => setShowStopModal(true)}
            className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-lg shadow-rose-600/30"
          >
            <Power size={16} /> STOP CHARGING
          </button>
        </div>
      </div>

      {/* Main Charging Telemetry Card */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
        {/* Station & Vehicle Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-[10px] font-mono text-blue-400 uppercase font-bold tracking-wider">Charging Station</span>
            <h2 className="text-lg font-bold text-white uppercase">{activeSession.stationName || "GreenCharge Central"}</h2>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin size={13} className="text-slate-500 shrink-0" />
              <span>{activeSession.stationAddress || "183 Arcot Road, Vadapalani, Chennai"}</span>
            </p>
          </div>

          <div className="sm:text-right">
            <span className="text-[10px] font-mono text-blue-400 uppercase font-bold tracking-wider">Vehicle & Connector</span>
            <p className="text-xs font-bold text-white mt-0.5">{activeSession.vehicleModel || "Tata Motors Nexon EV Max"}</p>
            <div className="flex sm:justify-end items-center gap-2 mt-1">
              <span className="text-[10px] font-mono font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                {activeSession.vehicleNumber || "TN58AB1234"}
              </span>
              <span className="text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">
                {activeSession.connectorId || "STA001-C01"}
              </span>
            </div>
          </div>
        </div>

        {/* Animated Battery Visualization */}
        <div className="bg-slate-950/80 p-6 rounded-3xl border border-slate-800/80 space-y-4">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <BatteryCharging className="w-5 h-5 text-emerald-400 animate-pulse" />
              <span className="font-bold text-slate-300">Battery Level</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-2xl font-black text-emerald-400">{batteryLevel}%</span>
              <span className="text-xs text-slate-500">/ Target {targetBat}%</span>
            </div>
          </div>

          {/* Battery Progress Bar with Glow Animation */}
          <div className="relative h-6 bg-slate-900 rounded-full overflow-hidden p-1 border border-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-400 transition-all duration-500 relative shadow-lg shadow-emerald-500/40"
              style={{ width: `${Math.min(100, (batteryLevel / targetBat) * 100)}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full"></div>
            </div>
          </div>

          <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-1">
            <span>Start: {activeSession.startingBattery || 20}%</span>
            <span className="text-emerald-400 font-bold">Charging @ {chargingPower} kW</span>
            <span>Target: {targetBat}%</span>
          </div>
        </div>

        {/* 6-Grid Real-Time Telemetry Data */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Energy Delivered</span>
            <div className="text-xl font-black text-white mt-1 font-mono">{energyDelivered} kWh</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Delivered into battery</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Charging Power</span>
            <div className="text-xl font-black text-cyan-400 mt-1 font-mono">{chargingPower} kW</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">DC Fast Charging</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Elapsed Time</span>
            <div className="text-xl font-black text-white mt-1 font-mono">{elapsedMinutes} min</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Since session start</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Estimated Remaining</span>
            <div className="text-xl font-black text-amber-400 mt-1 font-mono">{remainingMins} min</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">To reach {targetBat}% target</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Current Cost</span>
            <div className="text-xl font-black text-emerald-400 mt-1 font-mono">₹{currentCost.toFixed(2)}</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">@ ₹15 / kWh + fees</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Connector Status</span>
            <div className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              CHARGING
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">{activeSession.connectorType || "CCS2"}</span>
          </div>
        </div>

        {/* Bottom Stop Button & Safety Notice */}
        <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldAlert size={14} className="text-amber-400 shrink-0" />
            <span>Stopping the session will release the connector bay and generate your final invoice.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowStopModal(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30"
            >
              <Power size={16} /> STOP CHARGING
            </button>
          </div>
        </div>
      </div>

      {/* Stop Charging Confirmation Modal */}
      {showStopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#0B132B] border border-slate-700/80 w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-5 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-extrabold text-base">
                <AlertTriangle size={20} />
                <span>Stop Charging?</span>
              </div>
              <button
                onClick={() => setShowStopModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to stop this charging session? This will finalize your energy consumption and calculate your final invoice.
            </p>

            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Current Battery:</span>
                <span className="font-bold text-white font-mono">{batteryLevel}%</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Energy Delivered:</span>
                <span className="font-bold text-white font-mono">{energyDelivered} kWh</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Charging Duration:</span>
                <span className="font-bold text-white font-mono">{elapsedMinutes} minutes</span>
              </div>
              <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-1.5 font-bold text-emerald-400">
                <span>Estimated Amount:</span>
                <span className="font-mono text-sm">₹{currentCost.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowStopModal(false)}
                disabled={isStopping}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                CANCEL
              </button>
              <button
                onClick={handleConfirmStop}
                disabled={isStopping}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold transition shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5"
              >
                {isStopping ? "Finalizing..." : "STOP & COMPLETE"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
