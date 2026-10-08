import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
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
  FileText,
  RotateCcw,
  QrCode,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import Breadcrumbs from "../components/Breadcrumbs";
import { chargingService } from "../services/chargingService";
import { bookingService } from "../services/bookingService";
import { socketService } from "../services/socketService";
import Toast from "../components/Toast";
import InvoiceModal from "../components/InvoiceModal";

export default function LiveChargingSessionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Booking passed via React Router navigation state (if any)
  const navBooking = location.state?.booking || null;

  const [session, setSession] = useState(null);
  const [bookingData, setBookingData] = useState(navBooking);
  const [loading, setLoading] = useState(true);
  const [stopping, setStopping] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });

  // Extract starting SOC & target SOC from booking or active session
  const initialSoc = useMemo(() => {
    if (navBooking?.currentSoc !== undefined) return parseInt(navBooking.currentSoc, 10);
    if (navBooking?.current_soc_percent !== undefined) return parseInt(navBooking.current_soc_percent, 10);
    if (bookingData?.currentSoc !== undefined) return parseInt(bookingData.currentSoc, 10);
    if (bookingData?.current_soc_percent !== undefined) return parseInt(bookingData.current_soc_percent, 10);
    if (session?.startSoc !== undefined) return parseInt(session.startSoc, 10);
    if (session?.startingBattery !== undefined) return parseInt(session.startingBattery, 10);
    if (session?.batterySoc !== undefined) return parseInt(session.batterySoc, 10);
    return 50; // default start from 50% as requested
  }, [navBooking, bookingData, session]);

  const targetSoc = useMemo(() => {
    if (navBooking?.targetSoc !== undefined) return parseInt(navBooking.targetSoc, 10);
    if (navBooking?.target_soc_percent !== undefined) return parseInt(navBooking.target_soc_percent, 10);
    if (bookingData?.targetSoc !== undefined) return parseInt(bookingData.targetSoc, 10);
    if (bookingData?.target_soc_percent !== undefined) return parseInt(bookingData.target_soc_percent, 10);
    if (session?.targetSoc !== undefined) return parseInt(session.targetSoc, 10);
    if (session?.targetBattery !== undefined) return parseInt(session.targetBattery, 10);
    return 100; // default target to 100% as requested
  }, [navBooking, bookingData, session]);

  const stationName =
    bookingData?.stationName ||
    session?.stationName ||
    "VoltCharge Hub Anna Nagar #6667";

  const stationAddress =
    bookingData?.stationAddress ||
    session?.stationAddress ||
    "2nd Avenue, Anna Nagar West";

  const vehicleModel =
    bookingData?.vehicleModel ||
    session?.vehicleModel ||
    "Tata Motors Nexon EV Max";

  const vehicleNumber =
    bookingData?.vehicleNumber ||
    session?.vehicleNumber ||
    "TN69AB1234";

  const connectorLabel =
    bookingData?.connectorNumber ||
    bookingData?.connectorId ||
    session?.connectorId ||
    "Connector 01";

  const connectorType =
    bookingData?.connectorType ||
    session?.connectorType ||
    "CCS2";

  const maxPowerKw = parseFloat(
    bookingData?.powerKw ||
    bookingData?.power ||
    session?.powerKw ||
    60.0
  );

  const tariffRate = parseFloat(
    bookingData?.tariffPerKwh ||
    bookingData?.tariffRate ||
    session?.tariffRate ||
    18.0
  );

  const estimatedAmount = parseFloat(
    bookingData?.finalAmount ||
    bookingData?.amount ||
    session?.estimatedAmount ||
    441.91
  );

  const batteryCapacityKwh = parseFloat(
    bookingData?.batteryCapacity ||
    bookingData?.battery_capacity_kwh ||
    40.5
  );

  // Real-time simulated telemetry ticks starting precisely from initialSoc
  const [soc, setSoc] = useState(initialSoc);
  const [energyDelivered, setEnergyDelivered] = useState(0.0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [powerKw, setPowerKw] = useState(maxPowerKw);
  const [actualCost, setActualCost] = useState(0.0);

  // Synchronize initial SOC when data loads
  useEffect(() => {
    setSoc(initialSoc);
  }, [initialSoc]);

  // Initial Fetch: Active Session & Booking Details
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        // Try to get active session from backend
        const activeRes = await chargingService.getActiveChargingSession().catch(() => null);
        if (activeRes?.active && activeRes.session && isMounted) {
          setSession(activeRes.session);
          if (activeRes.session.startSoc !== undefined) {
            setSoc(parseInt(activeRes.session.batterySoc || activeRes.session.startSoc, 10));
          }
        } else if (id) {
          // If a booking ID or session ID was given, start/ensure session
          const startRes = await chargingService.startChargingSession(id).catch(() => null);
          if (startRes?.session && isMounted) {
            setSession(startRes.session);
          }
        }

        // Also fetch booking details if not provided via route state
        if (!navBooking && id) {
          try {
            const myBookingsRes = await bookingService.getMyBookings();
            if (myBookingsRes?.success && Array.isArray(myBookingsRes.data)) {
              const matched = myBookingsRes.data.find(
                (b) => String(b.bookingId) === String(id) || String(b.id) === String(id)
              );
              if (matched && isMounted) {
                setBookingData(matched);
              }
            }
          } catch {}
        }
      } catch (err) {
        console.warn("Live Charging initialization notice:", err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [id, navBooking]);

  // Real-Time Demo Simulation Engine (Smooth Progression from initialSoc to targetSoc)
  useEffect(() => {
    if (loading || isCompleted) return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 2);

      // Power fluctuation: realistic ±1.5 kW around maxPowerKw
      const powerJitter = maxPowerKw + (Math.random() * 2.4 - 1.2);
      setPowerKw(Math.round(powerJitter * 10) / 10);

      setSoc((prevSoc) => {
        if (prevSoc >= targetSoc) {
          return targetSoc;
        }

        // Increment SOC smoothly (+0.6% - 1.0% per tick)
        const increment = Math.round((0.6 + Math.random() * 0.4) * 10) / 10;
        const nextSoc = Math.min(targetSoc, Math.round((prevSoc + increment) * 10) / 10);

        // Required energy from initialSoc to nextSoc
        const socProgress = Math.max(0, nextSoc - initialSoc);
        const totalSocRange = Math.max(1, targetSoc - initialSoc);
        const totalEnergyEstimated = (batteryCapacityKwh * (totalSocRange / 100));
        const currentEnergy = Math.round((totalEnergyEstimated * (socProgress / totalSocRange)) * 100) / 100;
        setEnergyDelivered(currentEnergy);

        // Calculate Cost proportionally
        const serviceFee = 20.0;
        const subtotal = currentEnergy * tariffRate;
        const tax = (subtotal + serviceFee) * 0.18;
        const totalCostCalc = Math.round((subtotal + serviceFee + tax) * 100) / 100;
        setActualCost(totalCostCalc);

        // Check for completion
        if (nextSoc >= targetSoc) {
          const bookingCode = bookingData?.bookingId || bookingData?.booking_id || session?.bookingId || session?.booking_id || id;
          const sessionId = session?.id || session?.sessionId || id || "CS000001";

          chargingService
            .stopChargingSession(sessionId, {
              bookingId: bookingCode,
              session_id: sessionId,
              energyKwh: currentEnergy,
              finalSoc: targetSoc,
              actualCost: totalCostCalc,
            })
            .catch((err) => console.warn("Auto-complete sync notice:", err.message));

          if (bookingCode) {
            bookingService.updateBooking(bookingCode, "COMPLETED").catch(() => null);
            try {
              window.dispatchEvent(
                new CustomEvent("booking_updated", {
                  detail: { bookingId: bookingCode, status: "COMPLETED" },
                })
              );
            } catch {}
          }

          setTimeout(() => {
            setIsCompleted(true);
            try {
              confetti({
                particleCount: 120,
                spread: 80,
                origin: { y: 0.6 },
                colors: ["#10b981", "#3b82f6", "#06b6d4", "#f59e0b"],
              });
            } catch {}
          }, 600);
        }

        return nextSoc;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [loading, isCompleted, initialSoc, targetSoc, maxPowerKw, tariffRate, batteryCapacityKwh, bookingData, session, id]);

  const formatElapsed = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Estimated Remaining Minutes based on SOC distance and power
  const remainingMins = useMemo(() => {
    if (soc >= targetSoc) return 0;
    const socRemaining = Math.max(0, targetSoc - soc);
    const energyNeeded = batteryCapacityKwh * (socRemaining / 100);
    const hoursNeeded = powerKw > 0 ? (energyNeeded / powerKw) : 0;
    return Math.max(1, Math.round(hoursNeeded * 60));
  }, [soc, targetSoc, batteryCapacityKwh, powerKw]);

  // Handle Stop Charging Action
  const handleStopCharging = async () => {
    if (!window.confirm("Are you sure you want to stop this charging session?")) return;

    setStopping(true);
    try {
      const bookingCode = bookingData?.bookingId || bookingData?.booking_id || session?.bookingId || session?.booking_id || id;
      const sessionId = session?.id || session?.sessionId || id || "CS000001";

      await chargingService
        .stopChargingSession(sessionId, {
          bookingId: bookingCode,
          session_id: sessionId,
          energyKwh: energyDelivered,
          finalSoc: soc,
          actualCost,
        })
        .catch(() => null);

      if (bookingCode) {
        await bookingService.updateBooking(bookingCode, "COMPLETED").catch(() => null);
        try {
          window.dispatchEvent(
            new CustomEvent("booking_updated", {
              detail: { bookingId: bookingCode, status: "COMPLETED" },
            })
          );
        } catch {}
      }

      setIsCompleted(true);
      setToast({ message: "Charging session concluded successfully!", type: "success" });
    } catch (err) {
      setToast({ message: err.message || "Failed to stop charging", type: "error" });
    } finally {
      setStopping(false);
    }
  };

  const bookingForInvoice = {
    bookingId: id || session?.bookingId || bookingData?.bookingId || "EV000041",
    customerName: session?.customerName || "EV Driver",
    stationName,
    stationAddress,
    vehicleModel,
    vehicleNumber,
    connectorNumber: connectorLabel,
    connectorType,
    date: bookingData?.date || new Date().toISOString().split("T")[0],
    startTime: bookingData?.startTime || "22:50",
    endTime: bookingData?.endTime || "23:20",
    energyDelivered: energyDelivered || (batteryCapacityKwh * (targetSoc - initialSoc) / 100),
    tariffPerKwh: tariffRate,
    durationMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
    finalAmount: actualCost || estimatedAmount,
    amount: actualCost || estimatedAmount,
    paymentStatus: "PAID",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-16 font-sans text-[var(--text-primary)]">
      <Breadcrumbs
        items={[
          { label: "My Bookings", path: "/my-bookings" },
          { label: "Live Charging Session", path: `/sessions/${id || "active"}` },
        ]}
      />

      {/* COMPLETED BANNER / MODAL STATE */}
      {isCompleted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="theme-card p-8 md:p-10 rounded-3xl text-center space-y-6 border-2 border-emerald-500/50 shadow-2xl shadow-emerald-500/20"
        >
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/40 shadow-xl shadow-emerald-500/30">
            <CheckCircle2 size={46} className="stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <span className="px-3.5 py-1 text-[11px] font-black font-mono tracking-widest uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/30">
              ● CHARGING COMPLETED • TARGET {targetSoc}% REACHED
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)]">
              Vehicle Fully Charged!
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto">
              Your session at <strong className="text-[var(--text-primary)]">{stationName}</strong> has completed successfully.
            </p>
          </div>

          {/* Final Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            <div className="bg-[var(--bg-surface-raised)] p-4 rounded-2xl border border-[var(--border-subtle)] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Battery SOC</span>
              <span className="text-2xl font-black font-mono text-emerald-500">
                {initialSoc}% → {soc}%
              </span>
            </div>

            <div className="bg-[var(--bg-surface-raised)] p-4 rounded-2xl border border-[var(--border-subtle)] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Energy Delivered</span>
              <span className="text-2xl font-black font-mono text-[var(--text-primary)]">
                {energyDelivered} <span className="text-xs text-[var(--text-muted)]">kWh</span>
              </span>
            </div>

            <div className="bg-[var(--bg-surface-raised)] p-4 rounded-2xl border border-[var(--border-subtle)] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Total Duration</span>
              <span className="text-2xl font-black font-mono text-cyan-400">
                {formatElapsed(elapsedSeconds)}
              </span>
            </div>

            <div className="bg-[var(--bg-surface-raised)] p-4 rounded-2xl border border-[var(--border-subtle)] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Final Amount</span>
              <span className="text-2xl font-black font-mono text-emerald-400">
                ₹{actualCost > 0 ? actualCost.toFixed(2) : estimatedAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText size={16} /> VIEW TAX INVOICE
            </button>

            <button
              onClick={() => navigate("/my-bookings")}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer"
            >
              MY BOOKINGS <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Top Banner (Active Telemetry Header) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-mono font-extrabold uppercase tracking-widest mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>LIVE CHARGING ACTIVE • REAL-TIME DEMO</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">
                {stationName}
              </h1>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {stationAddress} • {connectorLabel} ({connectorType} • {maxPowerKw} kW)
              </p>
            </div>

            {/* Stop Charging Button */}
            <button
              type="button"
              disabled={stopping}
              onClick={handleStopCharging}
              className="px-6 py-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-rose-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Square size={14} className="fill-current" />
              <span>{stopping ? "Stopping..." : "STOP CHARGING"}</span>
            </button>
          </div>

          {/* Vehicle & Reservation Context Card */}
          <div className="theme-card p-4.5 rounded-2xl border border-[var(--border-subtle)] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Vehicle</span>
              <span className="font-bold text-[var(--text-primary)] block truncate mt-0.5">{vehicleModel}</span>
              <span className="font-mono text-[11px] text-[var(--text-secondary)]">{vehicleNumber}</span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">SOC Target</span>
              <span className="font-bold font-mono text-emerald-500 block mt-0.5">
                {initialSoc}% → {targetSoc}%
              </span>
              <span className="text-[11px] text-[var(--text-secondary)]">Charging to {targetSoc}%</span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Connector Bay</span>
              <span className="font-bold font-mono text-blue-500 block mt-0.5">{connectorLabel}</span>
              <span className="text-[11px] font-mono text-[var(--text-secondary)]">{connectorType} • {maxPowerKw} kW</span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Tariff Rate</span>
              <span className="font-bold font-mono text-[var(--text-primary)] block mt-0.5">₹{tariffRate.toFixed(2)}/kWh</span>
              <span className="text-[11px] text-emerald-500 font-bold">Estimated: ₹{estimatedAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Main Animated Battery Gauge Card */}
          <div className="theme-card p-6 sm:p-10 rounded-3xl space-y-8 text-center border border-emerald-500/30 shadow-2xl relative overflow-hidden">
            {/* Animated Battery Ring */}
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/15 blur-2xl animate-pulse" />

              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="text-[var(--bg-surface-raised)] stroke-current"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="text-emerald-500 stroke-current transition-all duration-700 ease-out"
                  strokeWidth="8"
                  strokeDasharray={264}
                  strokeDashoffset={264 - (264 * soc) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>

              <div className="absolute flex flex-col items-center justify-center space-y-0.5">
                <Zap size={26} className="text-emerald-400 fill-emerald-400 animate-bounce" />
                <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-[var(--text-primary)]">
                  {Math.round(soc)}%
                </div>
                <span className="text-[10px] uppercase font-bold text-emerald-500 dark:text-emerald-400 tracking-wider">
                  Target: {targetSoc}%
                </span>
              </div>
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
              {/* Energy Delivered */}
              <div className="bg-[var(--bg-surface-raised)] p-4 rounded-2xl border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center gap-1">
                  <Zap size={12} className="text-emerald-500" /> Energy Delivered
                </span>
                <div className="text-2xl font-black font-mono text-[var(--text-primary)]">
                  {energyDelivered} <span className="text-xs text-[var(--text-muted)]">kWh</span>
                </div>
              </div>

              {/* Elapsed Time */}
              <div className="bg-[var(--bg-surface-raised)] p-4 rounded-2xl border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center gap-1">
                  <Clock size={12} className="text-emerald-500" /> Elapsed Time
                </span>
                <div className="text-2xl font-black font-mono text-emerald-500 dark:text-emerald-400">
                  {formatElapsed(elapsedSeconds)}
                </div>
              </div>

              {/* Estimated Remaining */}
              <div className="bg-[var(--bg-surface-raised)] p-4 rounded-2xl border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center gap-1">
                  <BatteryCharging size={12} className="text-amber-500" /> Est. Remaining
                </span>
                <div className="text-2xl font-black font-mono text-[var(--text-primary)]">
                  ~{remainingMins} <span className="text-xs text-[var(--text-muted)]">min</span>
                </div>
              </div>

              {/* Live Power */}
              <div className="bg-[var(--bg-surface-raised)] p-4 rounded-2xl border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center gap-1">
                  <Gauge size={12} className="text-cyan-500" /> Live Power
                </span>
                <div className="text-2xl font-black font-mono text-cyan-500 dark:text-cyan-400">
                  {powerKw} <span className="text-xs text-[var(--text-muted)]">kW</span>
                </div>
              </div>
            </div>

            {/* Cost Progression Comparison */}
            <div className="bg-[var(--bg-surface-raised)] p-5 rounded-2xl border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Estimated Amount</span>
                  <span className="text-lg font-mono font-bold text-[var(--text-secondary)]">₹{estimatedAmount.toFixed(2)}</span>
                </div>

                <div className="h-8 w-px bg-[var(--border-subtle)]" />

                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Current Accumulation</span>
                  <span className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400">
                    ₹{actualCost.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                <span>Automated cut-off upon reaching {targetSoc}% target</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tax Invoice Modal */}
      {showInvoiceModal && (
        <InvoiceModal
          booking={bookingForInvoice}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}

      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "success" })}
        />
      )}
    </div>
  );
}
