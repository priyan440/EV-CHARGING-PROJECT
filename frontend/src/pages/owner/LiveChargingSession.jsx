import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react";
import { Zap, Clock, ShieldCheck, Square, CheckCircle2, BatteryCharging, AlertCircle } from "lucide-react";
import { useSystemState } from "../../contexts/SystemStateContext";

export default function LiveChargingSession() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { bookings, updateBookingStatus, addNotification } = useSystemState();

  const booking = bookings.find((b) => b.bookingId.toUpperCase() === (bookingId || "").toUpperCase());

  const [elapsedSeconds, setElapsedSeconds] = useState(120);
  const [currentBattery, setCurrentBattery] = useState(42);
  const [kwhDelivered, setKwhDelivered] = useState(8.4);
  const [chargingKw, setChargingKw] = useState(50.2);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (isCompleted) return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      setKwhDelivered((prev) => +(prev + 0.05).toFixed(2));
      setCurrentBattery((prev) => (prev < 80 ? +(prev + 0.1).toFixed(1) : 80));
    }, 1000);

    return () => clearInterval(interval);
  }, [isCompleted]);

  const handleStopCharging = () => {
    setIsCompleted(true);
    if (booking) {
      updateBookingStatus(booking.bookingId, "COMPLETED");
    }
    addNotification({
      title: "Charging Session Completed! ⚡",
      message: `Delivered ${kwhDelivered} kWh to vehicle. Total: ₹${booking?.totalAmount || 416}`,
      type: "SUCCESS",
    });
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-inter">
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0B132B] border border-[#10B981]/40 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded border ${
              isCompleted
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 animate-pulse"
            }`}>
              {isCompleted ? "SESSION COMPLETED" : "LIVE CHARGING IN PROGRESS ⚡"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white font-grotesk flex items-center gap-2">
            <BatteryCharging size={32} className="text-emerald-400" /> EV Charging Controller
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time session diagnostics: power output (kW), energy delivered (kWh), vehicle battery percentage, and timer.
          </p>
        </div>

        <div className="px-5 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Booking Reference</span>
          <span className="text-xl font-black text-emerald-400 font-mono">{bookingId || "EVB000001"}</span>
        </div>
      </div>

      {/* Main Diagnostic Gauge Panel */}
      <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl space-y-6 text-center">
        {/* Ring Battery Display */}
        <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              className="text-slate-900 stroke-current"
              strokeWidth="10"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              className="text-emerald-400 stroke-current transition-all duration-500"
              strokeWidth="10"
              strokeDasharray="263.89"
              strokeDashoffset={263.89 - (263.89 * currentBattery) / 100}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center font-grotesk">
            <span className="text-3xl font-black text-white font-mono">{currentBattery}%</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">EV Battery</span>
          </div>
        </div>

        {/* Live Gauges Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-4 rounded-2xl bg-[#0B132B] border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Elapsed Time</span>
            <span className="text-lg font-black text-white mt-1 block">{formatTime(elapsedSeconds)}</span>
          </div>
          <div className="p-4 rounded-2xl bg-[#0B132B] border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Power Output</span>
            <span className="text-lg font-black text-cyan-300 mt-1 block">{chargingKw} kW</span>
          </div>
          <div className="p-4 rounded-2xl bg-[#0B132B] border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Energy Delivered</span>
            <span className="text-lg font-black text-emerald-400 mt-1 block">{kwhDelivered} kWh</span>
          </div>
          <div className="p-4 rounded-2xl bg-[#0B132B] border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Session Tariff</span>
            <span className="text-lg font-black text-amber-300 mt-1 block">₹{booking?.totalAmount || 416}</span>
          </div>
        </div>

        {/* Customer & Vehicle Specs */}
        <div className="bg-[#0B132B] p-4 rounded-2xl border border-slate-800 text-left grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Customer & Driver</span>
            <span className="font-extrabold text-white text-sm">{booking?.customerName || "Priyan Customer"}</span>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">Vehicle: <strong className="text-emerald-400">{booking?.vehicleNumber || "TN58AB1234"}</strong></div>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Station & Charger</span>
            <span className="font-extrabold text-white text-sm">{booking?.stationName || "EV Power Hub"}</span>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">Connector: <strong className="text-cyan-300">{booking?.connectorType || "CCS2"} (DC Fast)</strong></div>
          </div>
        </div>

        {/* Control Button */}
        {!isCompleted ? (
          <button
            onClick={handleStopCharging}
            className="w-full py-4 px-6 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs uppercase tracking-wider font-grotesk rounded-2xl transition shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2"
          >
            <Square size={16} className="fill-white" /> Stop & Complete Charging Session
          </button>
        ) : (
          <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
            <CheckCircle2 size={18} /> Charging Session Completed. Billing Finalized.
          </div>
        )}
      </div>
    </div>
  );
}
