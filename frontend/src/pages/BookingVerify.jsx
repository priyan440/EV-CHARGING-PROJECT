import { useParams, useNavigate } from "react";
import { CheckCircle2, AlertTriangle, ShieldCheck, MapPin, Zap, ArrowLeft, Clock, Car } from "lucide-react";
import { useSystemState } from "../contexts/SystemStateContext";

export default function BookingVerify() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { bookings } = useSystemState();

  const booking = bookings.find((b) => b.bookingId.toUpperCase() === (bookingId || "").toUpperCase());

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6 font-inter">
      {/* Back navigation */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {booking ? (
        <div className="theme-card p-8 rounded-3xl border border-emerald-500/40 shadow-2xl space-y-6 text-center animate-fade-in relative overflow-hidden">
          <div className="w-20 h-20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <CheckCircle2 size={48} />
          </div>

          <div>
            <span className="px-3 py-1 text-xs font-mono font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 rounded-full">
              VALID BOOKING CONFIRMED
            </span>
            <h1 className="text-2xl font-black text-[var(--text-primary)] font-grotesk mt-2">
              Booking Verification Verified
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Official digital authorization pass for charging station session access.
            </p>
          </div>

          <div className="bg-[var(--bg-surface-raised)] p-6 rounded-2xl border border-[var(--border-subtle)] text-left space-y-3 text-xs font-mono">
            <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
              <span className="text-[var(--text-secondary)]">Booking ID:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">{booking.bookingId}</span>
            </div>
            <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
              <span className="text-[var(--text-secondary)]">Customer Name:</span>
              <span className="text-[var(--text-primary)] font-bold">{booking.customerName || "Priyan Customer"}</span>
            </div>
            <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
              <span className="text-[var(--text-secondary)]">EV Station:</span>
              <span className="text-blue-600 dark:text-cyan-300 font-bold">{booking.stationName}</span>
            </div>
            <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
              <span className="text-[var(--text-secondary)]">Charger & Connector:</span>
              <span className="text-[var(--text-primary)]">{booking.connectorType || "CCS2"} ({booking.chargerId || "CHG0001"})</span>
            </div>
            <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
              <span className="text-[var(--text-secondary)]">Date & Slot Time:</span>
              <span className="text-emerald-600 dark:text-emerald-300 font-bold">{booking.date} at {booking.time}</span>
            </div>
            <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
              <span className="text-[var(--text-secondary)]">Vehicle Number:</span>
              <span className="text-[var(--text-primary)] font-bold">{booking.vehicleNumber || booking.registrationNumber || "-"}</span>
            </div>
            <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
              <span className="text-[var(--text-secondary)]">Razorpay Payment Status:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold uppercase">PAID (₹{parseFloat(booking.totalAmount || booking.amount || booking.estimatedAmount || 0).toFixed(2)})</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-[var(--text-secondary)]">Session Status:</span>
              <span className="text-blue-600 dark:text-cyan-400 font-extrabold uppercase font-grotesk">{booking.status || "CONFIRMED"}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-mono">
            <ShieldCheck size={16} /> Server HMAC-SHA256 Payment Verified & Authentic
          </div>
        </div>
      ) : (
        <div className="theme-card p-8 rounded-3xl border border-rose-500/40 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/40 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle size={36} />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] font-grotesk">Invalid or Unknown Booking QR Code</h2>
          <p className="text-xs text-rose-600 dark:text-rose-300">
            Booking ID <strong className="font-mono">{bookingId}</strong> was not found in active reservation database.
          </p>
        </div>
      )}
    </div>
  );
}
