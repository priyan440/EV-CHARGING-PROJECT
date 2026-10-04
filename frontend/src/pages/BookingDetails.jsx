import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Calendar,
  Zap,
  MapPin,
  Car,
  QrCode,
  ArrowLeft,
  AlertTriangle,
  Play,
  FileText,
  CreditCard,
  RefreshCw,
} from "lucide-react";
import Breadcrumbs from "../components/Breadcrumbs";
import { bookingService } from "../services/bookingService";
import Toast from "../components/Toast";

// Format seconds into HH:MM:SS
const formatCountdown = (totalSeconds) => {
  if (totalSeconds <= 0) return "00:00:00";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export default function BookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(1122); // initial countdown ~18 mins 42 secs
  const [toast, setToast] = useState({ message: "", type: "success" });

  useEffect(() => {
    bookingService.getBookingById(id)
      .then((res) => {
        if (res?.success && res.data) {
          setBooking(res.data);
          // Calculate seconds until booking start time if today
          const b = res.data;
          if (b.date && b.startTime) {
            const startDateTime = new Date(`${b.date}T${b.startTime}`);
            const now = new Date();
            const diffSec = Math.max(0, Math.floor((startDateTime - now) / 1000));
            setCountdown(diffSec > 0 ? diffSec : 1122);
          }
        } else {
          setToast({ message: "Booking not found in database", type: "error" });
        }
      })
      .catch((err) => {
        setToast({ message: err.message || "Failed to load booking details", type: "error" });
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Live Countdown Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs uppercase font-bold tracking-widest text-[var(--text-secondary)]">
          Fetching booking information from MySQL...
        </p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <AlertTriangle size={48} className="text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Booking Not Found</h2>
        <p className="text-xs text-[var(--text-secondary)]">Could not retrieve booking #{id} from the database.</p>
        <Link to="/bookings" className="inline-flex px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider">
          Go to My Bookings
        </Link>
      </div>
    );
  }

  const status = (booking.status || booking.booking_status || "CONFIRMED").toUpperCase();
  const isUpcoming = status === "CONFIRMED" || status === "PENDING" || status === "PROTECTED";
  const isCharging = status === "CHARGING" || status === "IN_PROGRESS" || status === "ACTIVE";

  const timelineSteps = [
    { label: "Booked", completed: true },
    { label: "Payment Successful", completed: true },
    { label: "Confirmed", completed: true },
    { label: "Charging", completed: isCharging || status === "COMPLETED" },
    { label: "Completed", completed: status === "COMPLETED" },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-16">
      <Breadcrumbs
        items={[
          { label: "My Bookings", path: "/bookings" },
          { label: `Booking #${booking.bookingId || id}`, path: `/booking/${id}` },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/bookings"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-emerald-500 font-semibold mb-2 transition"
          >
            <ArrowLeft size={14} /> Back to My Bookings
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
              Booking #{booking.bookingId || id}
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {status}
            </span>
          </div>
        </div>

        {/* Start Charging Now CTA */}
        <button
          onClick={() => navigate(`/sessions/${booking.id || id}`)}
          className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition hover:scale-105 cursor-pointer"
        >
          <Play size={16} className="fill-current" /> Start Live Charging
        </button>
      </div>

      {/* Section 21: Live Countdown Timer if Upcoming */}
      {isUpcoming && (
        <div className="theme-card p-6 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-transparent to-cyan-500/10 border border-emerald-500/30 text-center space-y-2">
          <span className="text-[11px] uppercase font-extrabold tracking-widest text-[var(--text-muted)] flex items-center justify-center gap-1.5">
            <Clock size={14} className="text-emerald-500 animate-spin" /> CHARGING STARTS IN
          </span>
          <div className="text-4xl sm:text-5xl font-black font-mono tracking-widest text-emerald-400">
            {formatCountdown(countdown)}
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Slot: {booking.startTimeFormatted || booking.startTime} → {booking.endTimeFormatted || booking.endTime} ({booking.date})
          </p>
        </div>
      )}

      {/* Section 21: Booking Timeline Progress Bar */}
      <div className="theme-card p-6 sm:p-8 rounded-3xl space-y-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Booking Lifecycle Timeline
        </h3>

        <div className="relative flex items-center justify-between">
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 bg-[var(--border-subtle)] z-0" />
          {timelineSteps.map((step, idx) => (
            <div key={idx} className="relative z-10 flex flex-col items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  step.completed
                    ? "bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/20"
                    : "bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] text-[var(--text-muted)]"
                }`}
              >
                {step.completed ? <CheckCircle2 size={16} /> : idx + 1}
              </div>
              <span className={`text-[10px] sm:text-xs font-semibold text-center whitespace-nowrap ${
                step.completed ? "text-emerald-400 font-bold" : "text-[var(--text-muted)]"
              }`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Reservation Specifications Grid */}
      <div className="theme-card p-6 sm:p-8 rounded-3xl space-y-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Reservation Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-[var(--bg-card-subtle)] p-4 rounded-2xl border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center gap-1.5">
              <MapPin size={13} className="text-emerald-500" /> Station
            </span>
            <div className="font-extrabold text-sm text-[var(--text-primary)]">
              {booking.stationName || "GreenVolt Central Station"}
            </div>
            <div className="text-[var(--text-secondary)]">{booking.stationAddress || "Chennai, Tamil Nadu"}</div>
          </div>

          <div className="bg-[var(--bg-card-subtle)] p-4 rounded-2xl border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center gap-1.5">
              <Zap size={13} className="text-emerald-500" /> Charger Bay
            </span>
            <div className="font-extrabold text-sm text-[var(--text-primary)]">
              {booking.chargerName || "DC Fast Charger"}
            </div>
            <div className="text-[var(--text-secondary)]">
              Connector: {booking.vehicleConnectorType || "CCS2"} • {booking.connectorPowerKw || 60} kW
            </div>
          </div>

          <div className="bg-[var(--bg-card-subtle)] p-4 rounded-2xl border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center gap-1.5">
              <Car size={13} className="text-emerald-500" /> Vehicle
            </span>
            <div className="font-extrabold text-sm text-[var(--text-primary)]">
              {booking.vehicleModel || "EV Car"}
            </div>
            <div className="font-mono text-[var(--text-secondary)]">
              {booking.vehicleNumber || booking.registrationNumber || "TN01EV2026"}
            </div>
          </div>

          <div className="bg-[var(--bg-card-subtle)] p-4 rounded-2xl border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center gap-1.5">
              <CreditCard size={13} className="text-emerald-500" /> Payment & Billing
            </span>
            <div className="font-extrabold text-sm text-[var(--text-primary)]">
              Total Amount: ₹{booking.totalAmount || booking.amount || 295}
            </div>
            <div className="text-emerald-400 font-mono">
              Status: {booking.paymentStatus || "PAID"} (Razorpay Test Mode)
            </div>
          </div>
        </div>

        {/* QR Pass */}
        <div className="p-4 rounded-2xl border border-dashed border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <QrCode size={36} className="text-emerald-500" />
            <div>
              <div className="font-bold text-xs text-[var(--text-primary)]">Digital Station Check-In Pass</div>
              <div className="text-[10px] text-[var(--text-muted)]">Show this code upon arriving at the station scanner</div>
            </div>
          </div>
          <span className="font-mono text-xs font-black text-emerald-400">{booking.bookingId || id}</span>
        </div>
      </div>

      {toast.message && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />
      )}
    </div>
  );
}
