import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  Clock,
  Calendar,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Check,
  Search,
  BatteryCharging,
  Sliders,
} from "lucide-react";
import { motion } from "framer-motion";
import Breadcrumbs from "../components/Breadcrumbs";
import { bookingService } from "../services/bookingService";
import Toast from "../components/Toast";

// Helper to format 24h time to 12h AM/PM
const formatTime12h = (timeStr) => {
  if (!timeStr) return "";
  const parts = String(timeStr).split(":");
  let h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  h = h ? h : 12;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
};

// Helper to calculate end time string
const calculateEndTime = (startStr, durationMins) => {
  const parts = (startStr || "10:00").split(":");
  const h = parseInt(parts[0], 10) || 10;
  const m = parseInt(parts[1], 10) || 0;
  const totalMins = h * 60 + m + Math.round(durationMins);
  const endH = Math.floor(totalMins / 60) % 24;
  const endM = totalMins % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
};

export default function SlotSelection() {
  const navigate = useNavigate();
  const location = useLocation();

  // Load estimate state from navigation state or localStorage
  const savedState = useMemo(() => {
    if (location.state?.calculation) return location.state;
    try {
      const stored = localStorage.getItem("ev_active_estimate");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, [location.state]);

  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [timelineData, setTimelineData] = useState(null);
  const [loadingTimeline, setLoadingTimeline] = useState(true);
  const [toast, setToast] = useState({ message: "", type: "success" });

  // Selected slot state
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [customStartTime, setCustomStartTime] = useState("10:00");

  const durationMinutes = savedState?.calculation?.estimatedMinutes || 17;
  const stationId = savedState?.stationId || 1;
  const chargerId = savedState?.chargerId || 1;

  // Fetch 24-Hour Timeline from backend MySQL
  const loadTimeline = async () => {
    setLoadingTimeline(true);
    try {
      const res = await bookingService.getChargerTimeline({
        stationId,
        chargerId,
        date,
        durationMinutes,
      });

      if (res?.success) {
        setTimelineData(res);
        // Pre-select earliest slot if available
        if (res.earliestSlot && !selectedSlot) {
          setSelectedSlot(res.earliestSlot);
          setCustomStartTime(res.earliestSlot.startTime);
        }
      } else {
        setToast({ message: res?.message || "Failed to load timeline", type: "error" });
      }
    } catch (err) {
      setToast({ message: err.message || "Error connecting to server", type: "error" });
    } finally {
      setLoadingTimeline(false);
    }
  };

  useEffect(() => {
    loadTimeline();
  }, [date, stationId, chargerId, durationMinutes]);

  // "FIND EARLIEST AVAILABLE SLOT" Action
  const handleFindEarliest = async () => {
    try {
      const res = await bookingService.getEarliestSlot({
        stationId,
        chargerId,
        date,
        durationMinutes,
      });

      if (res?.earliestSlot) {
        setSelectedSlot(res.earliestSlot);
        setCustomStartTime(res.earliestSlot.startTime);
        setToast({
          message: `Earliest slot found: ${res.earliestSlot.startTimeFormatted} → ${res.earliestSlot.endTimeFormatted}!`,
          type: "success",
        });
      } else {
        setToast({ message: "No slot available on this date for this duration.", type: "error" });
      }
    } catch (err) {
      setToast({ message: "Error searching for earliest slot", type: "error" });
    }
  };

  // Handle custom start time change
  const handleCustomStartTimeChange = (val) => {
    setCustomStartTime(val);
    const endStr = calculateEndTime(val, durationMinutes);
    const candidate = {
      startTime: val,
      endTime: endStr,
      startTimeFormatted: formatTime12h(val),
      endTimeFormatted: formatTime12h(endStr),
      durationMinutes,
    };
    setSelectedSlot(candidate);
  };

  // Confirm slot and proceed to summary
  const handleConfirmSlot = () => {
    if (!selectedSlot) {
      setToast({ message: "Please select an available charging slot.", type: "error" });
      return;
    }

    const summaryPayload = {
      ...savedState,
      date,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      durationMinutes,
      slotLabel: `${selectedSlot.startTimeFormatted} → ${selectedSlot.endTimeFormatted}`,
    };

    localStorage.setItem("ev_booking_summary", JSON.stringify(summaryPayload));

    navigate("/charging/summary", {
      state: summaryPayload,
    });
  };

  if (!savedState) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <Zap size={48} className="text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Estimate Required</h2>
        <p className="text-xs text-[var(--text-secondary)]">
          Please run the Smart Charging Calculator first to determine your required battery charging time.
        </p>
        <Link
          to="/charging/estimate"
          className="inline-flex px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider"
        >
          Go to Charging Calculator
        </Link>
      </div>
    );
  }

  const { vehicle, station, charger, calculation, currentSoc, targetSoc } = savedState;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-16">
      <Breadcrumbs
        items={[
          { label: "Smart Calculator", path: "/charging/estimate" },
          { label: "24-Hour Slot Selection", path: "/charging/slots" },
        ]}
      />

      {/* Header & Smart Estimate Summary Pill */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
            <Clock className="text-emerald-500" /> 24-Hour Charging Slot Selection
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Continuous timeline scheduling tailored to your exact <b>{durationMinutes}-minute</b> estimated charging window.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-[var(--bg-card-subtle)] p-2 rounded-2xl border border-[var(--border-subtle)]">
          <Calendar size={16} className="text-emerald-500 ml-2" />
          <input
            type="date"
            min={new Date().toISOString().split("T")[0]}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="theme-input px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
          />
        </div>
      </div>

      {/* Estimation Summary Strip (Section 12) */}
      <div className="theme-card p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-transparent to-teal-500/10 border border-emerald-500/30">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[var(--text-primary)]">{vehicle?.brand} {vehicle?.model}</span>
            <span className="text-[var(--text-muted)]">•</span>
            <span className="font-mono text-emerald-400 font-bold">{vehicle?.batteryCapacityKwh || 40.5} kWh</span>
            <span className="text-[var(--text-muted)]">•</span>
            <span className="text-amber-400 font-bold">{currentSoc}% → {targetSoc}%</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-[var(--text-primary)]">Req: <b>{calculation?.requiredEnergyKwh} kWh</b></span>
            <span className="text-[var(--text-muted)]">•</span>
            <span className="font-mono font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
              Est: {durationMinutes} mins
            </span>
            <span className="text-[var(--text-muted)]">•</span>
            <span className="font-mono font-extrabold text-[var(--text-primary)]">₹{calculation?.totalCost}</span>
          </div>
        </div>
      </div>

      {/* Section 15: Find Earliest Available Slot CTA Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-xs font-semibold">
          {/* Status Legends */}
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500" /> Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500" /> Booked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500" /> Selected
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-zinc-600" /> Maintenance
          </span>
        </div>

        <button
          type="button"
          onClick={handleFindEarliest}
          className="px-5 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Sparkles size={14} /> Find Earliest Available Slot
        </button>
      </div>

      {/* Section 13: 24-Hour Visual Timeline */}
      <div className="theme-card p-6 rounded-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            24-Hour Charging Timeline ({date})
          </h3>
          <span className="text-[11px] text-[var(--text-muted)] font-mono">
            {charger?.chargerName || charger?.charger_name || "Bay #1"} • {charger?.powerKw || 60} kW
          </span>
        </div>

        {loadingTimeline ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)] animate-pulse">
            Analyzing 24-hour timeline and checking MySQL booking conflicts...
          </div>
        ) : (
          <div className="space-y-4">
            {/* 24-Hour Hourly Grid View */}
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2 overflow-x-auto pb-2">
              {timelineData?.hourlyTimeline?.map((slot) => {
                const isSelected = selectedSlot && parseInt(selectedSlot.startTime?.split(":")[0], 10) === slot.hour;

                let colorClasses = "bg-emerald-500/20 border-emerald-500/40 text-emerald-400";
                if (slot.status === "BOOKED") colorClasses = "bg-rose-500/20 border-rose-500/40 text-rose-400";
                if (slot.status === "MAINTENANCE") colorClasses = "bg-zinc-800 border-zinc-700 text-zinc-500";
                if (slot.status === "PAST") colorClasses = "bg-zinc-900 border-zinc-800 text-zinc-600";
                if (isSelected) colorClasses = "bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/30 scale-105";

                return (
                  <button
                    key={slot.hour}
                    type="button"
                    disabled={slot.status === "BOOKED" || slot.status === "MAINTENANCE" || slot.status === "PAST"}
                    onClick={() => handleCustomStartTimeChange(slot.startTime)}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer disabled:cursor-not-allowed ${colorClasses}`}
                  >
                    <div className="text-[11px] font-extrabold font-mono">{slot.label}</div>
                    <div className="text-[9px] uppercase tracking-wider opacity-80 mt-0.5">
                      {isSelected ? "SELECTED" : slot.status}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Continuous 24-Hour Linear Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono px-1">
                <span>12 AM</span>
                <span>6 AM</span>
                <span>12 PM</span>
                <span>6 PM</span>
                <span>12 AM</span>
              </div>
              <div className="h-4 rounded-full bg-zinc-900 border border-[var(--border-subtle)] flex overflow-hidden">
                {timelineData?.granularBlocks?.map((blk, i) => {
                  let bg = "bg-emerald-500/60";
                  if (blk.status === "BOOKED") bg = "bg-rose-500";
                  if (blk.status === "MAINTENANCE") bg = "bg-zinc-700";
                  if (blk.status === "PAST") bg = "bg-zinc-900";

                  // Check if inside selectedSlot
                  if (selectedSlot) {
                    const startM = parseInt(selectedSlot.startTime.split(":")[0], 10) * 60 + parseInt(selectedSlot.startTime.split(":")[1], 10);
                    const endM = startM + durationMinutes;
                    if (blk.minutes >= startM && blk.minutes < endM) {
                      bg = "bg-blue-500";
                    }
                  }

                  return (
                    <div
                      key={i}
                      title={`${blk.formatted} - ${blk.status}`}
                      className={`flex-1 h-full ${bg} border-r border-black/10`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Available Intervals Grid (Section 14) */}
      <div className="theme-card p-6 rounded-3xl space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Recommended Intervals Fitting Your {durationMinutes}-Min Charge
        </h3>

        {timelineData?.availableSlots && timelineData.availableSlots.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
            {timelineData.availableSlots.map((slot, idx) => {
              const isSelected = selectedSlot?.startTime === slot.startTime;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                    isSelected
                      ? "border-blue-500 bg-blue-500/20 text-blue-400 font-black shadow-md shadow-blue-500/20"
                      : "border-[var(--border-subtle)] bg-[var(--bg-card-subtle)] hover:border-emerald-500/50 text-[var(--text-primary)]"
                  }`}
                >
                  <div className="text-xs font-mono font-bold">{slot.startTimeFormatted}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">to {slot.endTimeFormatted}</div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-muted)]">No available slots match this duration on this date.</p>
        )}
      </div>

      {/* Manual Slot Customization & Selection Card */}
      <div className="theme-card p-6 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
              Exact Selected Interval
            </span>
            {selectedSlot ? (
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 flex items-center gap-2">
                <span>{selectedSlot.startTimeFormatted || formatTime12h(selectedSlot.startTime)}</span>
                <span className="text-sm font-normal text-[var(--text-muted)]">→</span>
                <span>{selectedSlot.endTimeFormatted || formatTime12h(selectedSlot.endTime)}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  {durationMinutes} min
                </span>
              </div>
            ) : (
              <span className="text-sm text-[var(--text-muted)]">Please select a time slot above</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/charging/estimate"
              className="px-5 py-3 rounded-xl theme-input text-xs font-bold hover:bg-[var(--border-subtle)] transition"
            >
              Back to Calculator
            </Link>

            <button
              type="button"
              onClick={handleConfirmSlot}
              disabled={!selectedSlot}
              className="px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>Confirm Slot</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {toast.message && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />
      )}
    </div>
  );
}
