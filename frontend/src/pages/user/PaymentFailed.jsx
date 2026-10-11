import { useLocation, useNavigate, useSearchParams, Link } from "react-router-dom";
import { XCircle, RefreshCw, ArrowLeft, Calendar, AlertTriangle, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

export default function PaymentFailed() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const stateData = location.state || {};
  const reason = stateData.reason || searchParams.get("reason") || "The payment transaction could not be completed or was cancelled.";
  const bookingId = stateData.bookingId || searchParams.get("bookingId") || null;
  const amount = stateData.amount || searchParams.get("amount") || null;
  const stationName = stateData.stationName || stateData.station?.station_name || "EV Charging Station";

  return (
    <div className="max-w-xl mx-auto py-12 px-4 space-y-6 text-center animate-fade-in pb-16">
      {/* Animated Error Circle */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="w-20 h-20 bg-rose-500/10 text-rose-500 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto border-2 border-rose-500/30 shadow-2xl shadow-rose-500/20"
      >
        <XCircle size={44} className="stroke-[2.5]" />
      </motion.div>

      {/* Failure Title */}
      <div className="space-y-1.5">
        <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
          Payment Failed
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
          Your charging reservation was not confirmed because payment was unsuccessful.
        </p>
      </div>

      {/* Failure Details Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="theme-card p-6 rounded-3xl space-y-4 text-left border border-rose-500/30 shadow-xl bg-[var(--bg-surface)] text-[var(--text-primary)]"
      >
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium leading-relaxed">
          <ShieldAlert size={18} className="shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-xs">Failure Reason:</div>
            <div>{reason}</div>
          </div>
        </div>

        {bookingId && (
          <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Booking Reference</span>
              <span className="font-mono font-bold text-[var(--text-primary)]">{bookingId}</span>
            </div>
            {amount && (
              <div className="p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Amount</span>
                <span className="font-mono font-bold text-[var(--text-primary)]">₹{amount}</span>
              </div>
            )}
          </div>
        )}

        <div className="text-[11px] text-[var(--text-muted)] leading-relaxed">
          No funds were captured for this session. You may retry payment or pick another charging slot at any time.
        </div>
      </motion.div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <button
          onClick={() => {
            if (bookingId) {
              navigate(`/payment/${bookingId}`, { state: stateData });
            } else {
              navigate("/book-slot");
            }
          }}
          className="w-full py-3 px-4 rounded-2xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw size={14} /> Try Again
        </button>

        <button
          onClick={() => navigate("/book-slot")}
          className="w-full py-3 px-4 rounded-2xl bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Booking
        </button>

        <button
          onClick={() => navigate("/my-bookings")}
          className="w-full py-3 px-4 rounded-2xl bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Calendar size={14} /> My Bookings
        </button>
      </div>
    </div>
  );
}
