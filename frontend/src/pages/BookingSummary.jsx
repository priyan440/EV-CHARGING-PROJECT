import { useState, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  ShieldCheck,
  Zap,
  Car,
  MapPin,
  Clock,
  Calendar,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import Breadcrumbs from "../components/Breadcrumbs";
import Toast from "../components/Toast";

// Format 12h time
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

export default function BookingSummary() {
  const navigate = useNavigate();
  const location = useLocation();

  // Load state from location.state or localStorage
  const bookingData = useMemo(() => {
    if (location.state?.calculation) return location.state;
    try {
      const stored = localStorage.getItem("ev_booking_summary") || localStorage.getItem("ev_active_estimate");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, [location.state]);

  const [toast, setToast] = useState({ message: "", type: "success" });

  if (!bookingData) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <AlertCircle size={48} className="text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Booking Summary Unavailable</h2>
        <p className="text-xs text-[var(--text-secondary)]">
          Please select your vehicle and charging slot before reviewing the booking summary.
        </p>
        <Link
          to="/charging/estimate"
          className="inline-flex px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider"
        >
          Start Smart Booking
        </Link>
      </div>
    );
  }

  const {
    vehicle,
    station,
    charger,
    calculation,
    currentSoc = 50,
    targetSoc = 80,
    date = new Date().toISOString().split("T")[0],
    startTime = "10:00",
    endTime = "10:17",
    durationMinutes = 17,
  } = bookingData;

  const handleProceedToPayment = () => {
    localStorage.setItem("ev_active_checkout", JSON.stringify(bookingData));
    navigate("/payment", {
      state: bookingData,
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-16">
      <Breadcrumbs
        items={[
          { label: "Smart Calculator", path: "/charging/estimate" },
          { label: "Slots", path: "/charging/slots" },
          { label: "Booking Summary", path: "/charging/summary" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
            <ShieldCheck className="text-emerald-500" /> Booking Summary
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Review your electric vehicle reservation details before proceeding to Razorpay payment.
          </p>
        </div>

        <Link
          to="/charging/slots"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-emerald-500 font-semibold"
        >
          <ArrowLeft size={14} /> Back to Slots
        </Link>
      </div>

      {/* Main Professional Summary Card (Section 17) */}
      <div className="theme-card p-6 sm:p-8 rounded-3xl space-y-6">
        {/* Top Summary Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)]">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
              SMART EV RESERVATION
            </span>
            <h2 className="text-xl font-extrabold text-[var(--text-primary)]">
              {station?.station_name || station?.name || "EV Charging Station"}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
              <MapPin size={13} className="text-emerald-500" /> {station?.address || "Station Address"}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Total Payable</span>
            <div className="text-3xl font-black font-mono text-emerald-400">
              ₹{calculation?.totalCost || 295}
            </div>
          </div>
        </div>

        {/* Vehicle & Charger Specifications Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Vehicle Box */}
          <div className="bg-[var(--bg-card-subtle)] p-4 rounded-2xl border border-[var(--border-subtle)] space-y-2">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center gap-1.5">
              <Car size={13} className="text-emerald-500" /> Vehicle Information
            </span>
            <div className="font-extrabold text-sm text-[var(--text-primary)]">
              {vehicle?.brand} {vehicle?.model}
            </div>
            <div className="text-xs text-[var(--text-secondary)] font-mono">
              Reg: {vehicle?.registration_number || vehicle?.registrationNumber || "TN01EV2026"} • <span className="text-emerald-400 font-bold">{vehicle?.connector_type || vehicle?.connectorType || "CCS2"}</span>
            </div>
            <div className="text-xs text-amber-400 font-bold font-mono">
              Battery: {currentSoc}% → {targetSoc}% (+{targetSoc - currentSoc}%)
            </div>
          </div>

          {/* Charger Box */}
          <div className="bg-[var(--bg-card-subtle)] p-4 rounded-2xl border border-[var(--border-subtle)] space-y-2">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center gap-1.5">
              <Zap size={13} className="text-emerald-500" /> Charger & Bay
            </span>
            <div className="font-extrabold text-sm text-[var(--text-primary)]">
              {charger?.connector_number || charger?.connector_id || charger?.chargerName || charger?.charger_name || "EV Charging Bay"}
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              Power: <b className="text-emerald-400">{charger?.power_kw || charger?.max_power_kw || charger?.powerKw || 60} kW</b> ({charger?.connector_name || charger?.connector_type || charger?.connectorType || "CCS2"})
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              Efficiency: 90% • Tariff: ₹{calculation?.tariffRate || 18}/kWh
            </div>
          </div>
        </div>

        {/* Schedule & Duration */}
        <div className="bg-[var(--bg-card-subtle)] p-4 rounded-2xl border border-[var(--border-subtle)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-emerald-500" />
              <span className="font-bold text-[var(--text-primary)]">Date: {date}</span>
            </div>

            <div className="flex items-center gap-2 font-mono">
              <Clock size={15} className="text-emerald-500" />
              <span className="font-extrabold text-emerald-400">
                {formatTime12h(startTime)} → {formatTime12h(endTime)}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[11px]">
                {durationMinutes} min
              </span>
            </div>
          </div>
        </div>

        {/* Itemized Pricing Breakdown (Section 17) */}
        <div className="space-y-3 pt-4 border-t border-[var(--border-subtle)] text-xs">
          <h4 className="font-bold uppercase tracking-wider text-[var(--text-secondary)] text-[11px]">
            Pricing Breakdown
          </h4>

          <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)]">
              Grid Energy Charge ({calculation?.adjustedGridEnergyKwh || calculation?.requiredEnergyKwh} kWh @ ₹{calculation?.tariffRate || 18}/kWh)
            </span>
            <span className="font-mono font-bold text-[var(--text-primary)]">
              ₹{calculation?.energyCost || 270}
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)]">Platform & Connectivity Fee</span>
            <span className="font-mono font-bold text-[var(--text-primary)]">
              ₹{calculation?.platformFee || 15}
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)]">GST (18%)</span>
            <span className="font-mono font-bold text-[var(--text-primary)]">
              ₹{calculation?.gstTax || 51}
            </span>
          </div>

          <div className="flex justify-between py-2 text-sm">
            <span className="font-extrabold text-[var(--text-primary)]">TOTAL PAYABLE AMOUNT</span>
            <span className="font-mono font-black text-xl text-emerald-400">
              ₹{calculation?.totalCost || 295}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[var(--border-subtle)]">
          <Link
            to="/charging/slots"
            className="w-full sm:w-auto px-6 py-3 rounded-xl theme-input text-xs font-bold text-center hover:bg-[var(--border-subtle)] transition"
          >
            ← Modify Slot
          </Link>

          <button
            type="button"
            onClick={handleProceedToPayment}
            className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2.5 cursor-pointer hover:scale-[1.02]"
          >
            <CreditCard size={16} />
            <span>Proceed to Payment (₹{calculation?.totalCost || 295})</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {toast.message && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />
      )}
    </div>
  );
}
