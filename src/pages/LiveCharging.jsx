import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Zap,
  Activity,
  Play,
  Pause,
  CheckCircle2,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useSystemState } from "../contexts/SystemStateContext";
import InvoiceModal from "../components/InvoiceModal";

export default function LiveCharging() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { activeSessions, setActiveSessions } = useSystemState();

  const userCounterId = currentUser?.counterId || "CUS0001";
  const currentSession = activeSessions.find(
    (s) => (s.counterId?.toUpperCase() === userCounterId.toUpperCase() || !s.counterId) && (s.status === "CHARGING" || s.status === "Charging")
  ) || activeSessions[0];

  const [batteryLevel, setBatteryLevel] = useState(currentSession?.batteryCurrent || 67);
  const [energyAdded, setEnergyAdded] = useState(currentSession?.energyConsumedKwh || 18.4);
  const [cost, setCost] = useState(currentSession?.currentCost || 331);
  const [elapsedMins, setElapsedMins] = useState(currentSession?.elapsedMinutes || 24);
  const [isPaused, setIsPaused] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Live simulation tick every 2 seconds
  useEffect(() => {
    if (isPaused || !currentSession || currentSession.status === "COMPLETED") return;

    const interval = setInterval(() => {
      setBatteryLevel((prev) => {
        if (prev >= (currentSession.batteryTarget || 90)) {
          clearInterval(interval);
          return currentSession.batteryTarget || 90;
        }
        return prev + 1;
      });

      setEnergyAdded((prev) => parseFloat((prev + 0.3).toFixed(1)));
      setCost((prev) => prev + 5);
      setElapsedMins((prev) => prev + 1);
    }, 2000);

    return () => clearInterval(interval);
  }, [isPaused, currentSession]);

  const handleCompleteSession = () => {
    if (currentSession) {
      const updated = activeSessions.map((s) =>
        s.sessionId === currentSession.sessionId ? { ...s, status: "COMPLETED" } : s
      );
      setActiveSessions(updated);
    }
    setShowInvoiceModal(true);
  };

  if (!currentSession) {
    return (
      <div className="max-w-2xl mx-auto p-12 rounded-3xl bg-[#0B1329] border border-slate-800 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto">
          <Activity size={32} />
        </div>
        <h3 className="text-lg font-bold text-white">No Active Live Charging Session</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          To start a live telemetry session, book a slot and click "Start Charging" in My Bookings.
        </p>
        <button
          onClick={() => navigate("/customer/bookings")}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
        >
          Go to My Bookings
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded border border-emerald-500/30 uppercase tracking-widest">
              LIVE CHARGING STREAM
            </span>
            <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
              SIMULATION MODE
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Charging Session Telemetry</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Station: <span className="text-slate-200 font-bold">{currentSession.stationName}</span> | Session ID: <span className="font-mono text-emerald-400">{currentSession.sessionId}</span>
          </p>
        </div>

        <span className="text-xs font-mono font-bold bg-cyan-500/20 text-cyan-400 px-3 py-1.5 rounded-xl border border-cyan-500/30">
          Bay: {currentSession.chargerId} ({currentSession.connectorType || "CCS2"})
        </span>
      </div>

      {/* Main Animated Battery Circular Display */}
      <div className="p-8 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-2xl space-y-8 text-center">
        
        {/* Simulation Notice Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Development Simulation Telemetry Engine Active</span>
        </div>

        {/* Animated Battery Gauge */}
        <div className="relative inline-flex items-center justify-center p-8 bg-slate-900/90 rounded-3xl border border-slate-800 w-full max-w-md mx-auto shadow-2xl">
          <div className="w-full flex flex-col items-center space-y-4">
            <div className="flex items-center gap-2">
              <Zap size={28} className="text-emerald-400 fill-emerald-400 animate-pulse" />
              <span className="text-4xl font-black font-mono text-white tracking-tight">
                {batteryLevel}%
              </span>
            </div>

            {/* Battery Level Progress Bar */}
            <div className="w-full bg-slate-800 h-6 rounded-2xl border border-slate-700 p-1 relative overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 h-full rounded-xl transition-all duration-500 relative"
                style={{ width: `${batteryLevel}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>

            <div className="flex justify-between w-full text-xs font-mono text-slate-400 pt-1">
              <span>Start: {currentSession.batteryStart || 35}%</span>
              <span>Target Goal: {currentSession.batteryTarget || 90}%</span>
            </div>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Charging Power</span>
            <span className="text-lg font-black font-mono text-emerald-400">{currentSession.currentPowerKw || 42.7} kW</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Energy Consumed</span>
            <span className="text-lg font-black font-mono text-cyan-400">{energyAdded} kWh</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Elapsed Time</span>
            <span className="text-lg font-black font-mono text-white">{elapsedMins} mins</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Current Cost</span>
            <span className="text-lg font-black font-mono text-amber-400">₹{cost}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-3 justify-center max-w-md mx-auto pt-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex-1 py-3 rounded-2xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
              isPaused
                ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                : "bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
            }`}
          >
            {isPaused ? <Play size={16} /> : <Pause size={16} />}
            {isPaused ? "Resume Charging" : "Pause Session"}
          </button>

          <button
            onClick={handleCompleteSession}
            className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs tracking-wider uppercase transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50"
          >
            <CheckCircle2 size={16} /> Complete & Get Invoice
          </button>
        </div>
      </div>

      {/* Tax Invoice Modal */}
      {showInvoiceModal && (
        <InvoiceModal
          booking={{
            bookingId: currentSession.bookingId || "BK000001",
            invoiceId: `INV${Date.now().toString().slice(-6)}`,
            customerName: currentSession.customerName || "Priyan",
            counterId: currentSession.counterId || "CUS0001",
            stationName: currentSession.stationName,
            connectorType: currentSession.connectorType || "CCS2",
            vehicleNumber: currentSession.vehicleNumber || "TN58AB1234",
            estimatedKwh: energyAdded,
            chargingCost: cost,
            serviceFee: 20,
            tax: Math.round((cost + 20) * 0.18),
            totalAmount: cost + 20 + Math.round((cost + 20) * 0.18),
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
          }}
          onClose={() => {
            setShowInvoiceModal(false);
            navigate("/customer/history");
          }}
        />
      )}
    </div>
  );
}
