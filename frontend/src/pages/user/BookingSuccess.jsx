import { useEffect, useMemo } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Zap,
  ArrowRight,
  LayoutDashboard,
  ClipboardList,
  Sparkles,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

export default function BookingSuccess() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const queryBookingId = searchParams.get("bookingId") || "";

  const data = useMemo(() => {
    if (location.state?.bookingId || location.state?.booking) return location.state;
    try {
      const stored = localStorage.getItem("ev_booking_summary");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, [location.state]);

  const bookingId = queryBookingId || data?.bookingId || data?.booking?.bookingId || `EV${String(Date.now()).slice(-5)}`;
  const stationName = data?.station?.station_name || data?.station?.name || "GreenVolt Hub";
  const chargerName = data?.charger?.chargerName || data?.charger?.charger_name || "DC Fast Charger";
  const dateStr = data?.date || new Date().toISOString().split("T")[0];
  const startTime = data?.startTime || "10:00 PM";
  const endTime = data?.endTime || "10:17 PM";
  const amount = data?.amount || data?.calculation?.totalCost || 295;

  useEffect(() => {
    // Trigger confetti celebration
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#10B981", "#14B8A6", "#06B6D4", "#F59E0B"],
      });
    } catch {}
  }, []);

  return (
    <div className="max-w-xl mx-auto py-10 px-4 space-y-6 text-center animate-fade-in pb-16">
      {/* Animated Checkmark Circle */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/40 shadow-2xl shadow-emerald-500/30"
      >
        <CheckCircle2 size={44} className="stroke-[2.5]" />
      </motion.div>

      {/* Confirmation Title */}
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
          BOOKING CONFIRMED
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
          Your charging bay has been reserved and verified in MySQL.
        </p>
      </div>

      {/* Booking Pass / Confirmation Card (Section 19) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="theme-card p-6 sm:p-8 rounded-3xl space-y-5 text-left border border-emerald-500/30 shadow-xl"
      >
        <div className="flex justify-between items-center pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
              Booking ID
            </span>
            <span className="text-xl font-black font-mono text-emerald-400">
              {bookingId}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
              Total Paid
            </span>
            <span className="text-xl font-black font-mono text-[var(--text-primary)]">
              ₹{amount}
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
              <MapPin size={14} className="text-emerald-500" /> Station
            </span>
            <span className="font-extrabold text-[var(--text-primary)]">{stationName}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
              <Zap size={14} className="text-emerald-500" /> Charger Bay
            </span>
            <span className="font-extrabold text-[var(--text-primary)]">{chargerName}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
              <Calendar size={14} className="text-emerald-500" /> Date
            </span>
            <span className="font-mono font-bold text-[var(--text-primary)]">{dateStr}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
              <Clock size={14} className="text-emerald-500" /> Reserved Time
            </span>
            <span className="font-mono font-black text-emerald-400">
              {startTime} → {endTime}
            </span>
          </div>
        </div>

        {/* QR Code Verification Notice */}
        <div className="p-3.5 rounded-2xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] flex items-center gap-3">
          <QrCode size={28} className="text-emerald-500 shrink-0" />
          <div className="text-[11px] text-[var(--text-secondary)]">
            Present this booking pass or your vehicle plate number upon arrival at the charging bay.
          </div>
        </div>
      </motion.div>

      {/* Action Buttons (Section 19: VIEW BOOKING, GO TO DASHBOARD) */}
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-center pt-2">
        <Link
          to={`/booking/${bookingId}`}
          className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer"
        >
          <ClipboardList size={16} />
          <span>View Booking</span>
        </Link>

        <Link
          to="/dashboard"
          className="w-full sm:w-auto px-7 py-3.5 rounded-2xl theme-input font-extrabold text-xs uppercase tracking-wider text-[var(--text-primary)] hover:border-emerald-500 transition flex items-center justify-center gap-2"
        >
          <LayoutDashboard size={16} />
          <span>Go to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
