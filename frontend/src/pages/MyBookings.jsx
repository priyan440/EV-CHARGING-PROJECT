import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarCheck,
  Zap,
  XCircle,
  Play,
  QrCode,
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Search,
  RefreshCw,
  BatteryCharging,
  Gauge,
  MapPin,
  Car,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  Download,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { bookingService } from "../services/bookingService";
import { startChargingSession } from "../services/chargingService";
import { socketService } from "../services/socketService";
import QRCodeModal from "../components/QRCodeModal";
import InvoiceModal from "../components/InvoiceModal";

export default function MyBookings() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [myBookings, setMyBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [startingId, setStartingId] = useState(null);
  const [checkingInId, setCheckingInId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQRBooking, setSelectedQRBooking] = useState(null);
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState(null);

  // Fetch current customer's authentic bookings only
  const fetchMyBookings = async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    setErrorMsg("");
    try {
      const res = await bookingService.getMyBookings();
      if (res?.success && Array.isArray(res.data)) {
        setMyBookings(res.data);
      } else {
        setMyBookings([]);
      }
    } catch (err) {
      console.error("fetchMyBookings error:", err);
      setErrorMsg("Failed to load your reservations. Please refresh the page.");
    } finally {
      setIsLoading(false);
      if (showSpinner) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyBookings();

    const onBookingChanged = () => {
      fetchMyBookings(false);
    };

    socketService.on("bookingCreated", onBookingChanged);
    socketService.on("booking_created", onBookingChanged);
    socketService.on("bookingUpdated", onBookingChanged);
    socketService.on("booking_updated", onBookingChanged);
    socketService.on("booking:updated", onBookingChanged);
    socketService.on("booking_completed", onBookingChanged);
    socketService.on("booking:completed", onBookingChanged);
    socketService.on("bookingCancelled", onBookingChanged);
    socketService.on("booking_cancelled", onBookingChanged);
    socketService.on("session_started", onBookingChanged);
    socketService.on("session_stopped", onBookingChanged);

    window.addEventListener("booking_updated", onBookingChanged);
    window.addEventListener("focus", onBookingChanged);

    // 4-second polling safeguard to keep MySQL and browser perfectly in sync
    const interval = setInterval(() => {
      fetchMyBookings(false);
    }, 4000);

    return () => {
      clearInterval(interval);
      socketService.off("bookingCreated", onBookingChanged);
      socketService.off("booking_created", onBookingChanged);
      socketService.off("bookingUpdated", onBookingChanged);
      socketService.off("booking_updated", onBookingChanged);
      socketService.off("booking:updated", onBookingChanged);
      socketService.off("booking_completed", onBookingChanged);
      socketService.off("booking:completed", onBookingChanged);
      socketService.off("bookingCancelled", onBookingChanged);
      socketService.off("booking_cancelled", onBookingChanged);
      socketService.off("session_started", onBookingChanged);
      socketService.off("session_stopped", onBookingChanged);
      window.removeEventListener("booking_updated", onBookingChanged);
      window.removeEventListener("focus", onBookingChanged);
    };
  }, [currentUser]);

  // Handle Check-In Action
  const handleCheckIn = async (booking) => {
    setCheckingInId(booking.bookingId);
    try {
      const res = await bookingService.updateBooking(booking.bookingId, "CHECKED_IN");
      if (res.success) {
        await fetchMyBookings(false);
      } else {
        alert(res.message || "Check-in failed. Please try again.");
      }
    } catch (err) {
      alert("Error checking in for booking.");
    } finally {
      setCheckingInId(null);
    }
  };

  // Handle Proceed to Live Charging
  const handleProceedToCharging = async (booking) => {
    setStartingId(booking.bookingId);
    try {
      await startChargingSession(booking.bookingId);
      await fetchMyBookings(false);
      navigate(`/sessions/${booking.bookingId}`, { state: { booking } });
    } catch (err) {
      alert(err.message || "Failed to start charging session.");
    } finally {
      setStartingId(null);
    }
  };

  // Handle Cancel Booking via Backend API
  const handleCancelBooking = async (bookingId) => {
    const confirmCancel = window.confirm(
      `Are you sure you want to cancel reservation ${bookingId}? This will release the reserved connector bay and refund your payment.`
    );
    if (!confirmCancel) return;

    setCancellingId(bookingId);
    try {
      const res = await bookingService.cancelBooking(bookingId);
      if (res.success) {
        await fetchMyBookings(false);
      } else {
        alert(res.message || "Failed to cancel booking.");
      }
    } catch (err) {
      alert("Error processing booking cancellation.");
    } finally {
      setCancellingId(null);
    }
  };

  // KPI calculations strictly from myBookings
  const totalCount = myBookings.length;
  const upcomingCount = myBookings.filter((b) =>
    ["CONFIRMED", "PROTECTED", "PENDING", "PAYMENT_PENDING"].includes((b.status || "").toUpperCase())
  ).length;
  const checkedInCount = myBookings.filter((b) =>
    ["CHECKED_IN", "CHECK_IN_WINDOW"].includes((b.status || "").toUpperCase())
  ).length;
  const activeCount = myBookings.filter((b) =>
    ["ACTIVE", "CHARGING", "IN_PROGRESS"].includes((b.status || "").toUpperCase())
  ).length;
  const completedCount = myBookings.filter((b) =>
    ["COMPLETED"].includes((b.status || "").toUpperCase())
  ).length;
  const cancelledCount = myBookings.filter((b) =>
    ["CANCELLED", "NO_SHOW", "EXPIRED"].includes((b.status || "").toUpperCase())
  ).length;

  // Filter tabs
  const tabFiltered = myBookings.filter((b) => {
    const st = (b.status || "").toUpperCase();
    if (activeTab === "Upcoming") return ["CONFIRMED", "PROTECTED", "PENDING", "PAYMENT_PENDING"].includes(st);
    if (activeTab === "Checked-In") return ["CHECKED_IN", "CHECK_IN_WINDOW"].includes(st);
    if (activeTab === "Active") return ["ACTIVE", "CHARGING", "IN_PROGRESS"].includes(st);
    if (activeTab === "Completed") return st === "COMPLETED";
    if (activeTab === "Cancelled") return ["CANCELLED", "NO_SHOW", "EXPIRED"].includes(st);
    return true;
  });

  // Search filter
  const filteredBookings = tabFiltered.filter((b) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toUpperCase();
    return (
      (b.bookingId || "").toUpperCase().includes(term) ||
      (b.stationName || "").toUpperCase().includes(term) ||
      (b.stationAddress || "").toUpperCase().includes(term) ||
      (b.vehicleNumber || "").toUpperCase().includes(term) ||
      (b.connectorId || "").toUpperCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans text-[var(--text-primary)]">
      {/* Page Header */}
      <div className="theme-card p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-card">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full border border-blue-500/20 uppercase tracking-wider">
                CUSTOMER PORTAL • {currentUser?.counterId || "CUS0001"}
              </span>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">
                USER-OWNED SESSIONS ONLY
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-3 font-heading">
              <CalendarCheck size={28} className="text-blue-600 dark:text-blue-400" /> MY BOOKINGS
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xl">
              Manage your EV charging reservations, check in for scheduled slots, view charging QR codes, and download tax invoices.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchMyBookings(true)}
              className="p-3 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500/40 transition flex items-center gap-2 text-xs font-bold shadow-sm cursor-pointer"
              title="Sync reservations"
            >
              <RefreshCw size={15} className={isRefreshing ? "animate-spin text-blue-600 dark:text-blue-400" : ""} />
              <span>Sync</span>
            </button>

            <button
              onClick={() => navigate("/customer/book")}
              className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              <Zap size={16} className="fill-current" /> + NEW BOOKING
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle size={16} className="text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 4 Top Summary KPI Cards (Strictly Current User's Data) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="theme-card p-4 rounded-2xl">
          <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">Total Bookings</span>
          <div className="text-2xl font-black text-[var(--text-primary)] mt-1 font-mono">{totalCount}</div>
          <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">Your reservations</span>
        </div>

        <div className="theme-card p-4 rounded-2xl border-blue-500/30">
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">Upcoming</span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 font-mono">{upcomingCount}</div>
          <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">Confirmed slots</span>
        </div>

        <div className="theme-card p-4 rounded-2xl border-amber-500/30">
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Checked-In</span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">{checkedInCount}</div>
          <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">Ready to charge</span>
        </div>

        <div className="theme-card p-4 rounded-2xl border-emerald-500/30">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Completed</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">{completedCount}</div>
          <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">Past sessions</span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { label: "All", count: totalCount },
            { label: "Upcoming", count: upcomingCount },
            { label: "Checked-In", count: checkedInCount },
            { label: "Completed", count: completedCount },
            { label: "Cancelled", count: cancelledCount },
          ].map((tab) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab.label)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                activeTab === tab.label
                  ? "bg-blue-600/15 text-blue-600 dark:text-blue-400 border border-blue-500/40 shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)]"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className="relative flex-1 sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search Booking ID, Station, Vehicle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="theme-input w-full pl-9 pr-3 py-2 text-xs"
          />
        </div>
      </div>

      {/* Bookings List Display */}
      {isLoading ? (
        <div className="theme-card p-16 rounded-3xl text-center space-y-3 shadow-card">
          <RefreshCw size={32} className="animate-spin text-blue-600 dark:text-blue-400 mx-auto" />
          <p className="text-sm font-bold text-[var(--text-primary)]">Retrieving your reservations...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="theme-card p-16 rounded-3xl text-center space-y-4 shadow-card">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-muted)] flex items-center justify-center mx-auto">
            <CalendarCheck size={32} />
          </div>
          <h4 className="font-extrabold text-[var(--text-primary)] text-lg">
            {searchTerm ? "No Matching Reservations" : "No Bookings Yet"}
          </h4>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
            {searchTerm
              ? `No reservations matching "${searchTerm}". Try adjusting your search query.`
              : "You haven't reserved a charging slot yet. Reserve your connector bay in advance."}
          </p>
          <button
            onClick={() => navigate("/customer/book")}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition cursor-pointer"
          >
            BOOK YOUR FIRST CHARGING SLOT
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredBookings.map((b) => {
            const st = (b.status || "").toUpperCase();
            const isConfirmed = ["CONFIRMED", "PROTECTED", "PENDING", "PAYMENT_PENDING"].includes(st);
            const isCheckedIn = ["CHECKED_IN", "CHECK_IN_WINDOW"].includes(st);
            const isActive = ["ACTIVE", "CHARGING", "IN_PROGRESS"].includes(st);
            const isCompleted = st === "COMPLETED";
            const isCancelled = ["CANCELLED", "EXPIRED", "NO_SHOW"].includes(st);

            return (
              <div
                key={b.bookingId || b.id}
                className="theme-card rounded-3xl p-6 space-y-4 shadow-card hover:border-blue-500/40 transition"
              >
                {/* Card Top: Booking ID & Status Badge */}
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-extrabold text-blue-600 dark:text-blue-400">
                      {b.bookingId || `EV${String(b.id).padStart(4, "0")}`}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--bg-surface-raised)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                      {b.counterId || "CUS0001"}
                    </span>
                  </div>

                  <div>
                    {isConfirmed && (
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                        CONFIRMED
                      </span>
                    )}
                    {isCheckedIn && (
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        CHECKED IN
                      </span>
                    )}
                    {isActive && (
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        CHARGING ACTIVE
                      </span>
                    )}
                    {isCompleted && (
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        ✓ COMPLETED
                      </span>
                    )}
                    {isCancelled && (
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                        {st === "NO_SHOW" ? "NO-SHOW" : "CANCELLED"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Station & Schedule Details */}
                <div>
                  <h3 className="font-bold text-[var(--text-primary)] text-base">{b.stationName || "Station Unavailable"}</h3>
                  <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1 mt-0.5">
                    <MapPin size={13} className="text-[var(--text-muted)] shrink-0" />
                    <span className="truncate">{b.stationAddress || "Address not provided"}</span>
                  </p>
                </div>

                {/* Schedule, Vehicle & Connector Grid */}
                <div className="grid grid-cols-2 gap-3 bg-[var(--bg-surface-raised)] p-3.5 rounded-2xl border border-[var(--border-subtle)] text-xs">
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold tracking-wider">Date & Time</span>
                    <span className="font-bold text-[var(--text-primary)] mt-0.5 block">{b.date || b.bookingDate || "N/A"}</span>
                    <span className="text-[var(--text-secondary)] text-[11px]">{b.timeSlot || `${b.startTime || "N/A"} - ${b.endTime || "N/A"}`}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold tracking-wider">Vehicle</span>
                    <span className="font-bold text-[var(--text-primary)] mt-0.5 block truncate">{b.vehicleModel || "Standard EV"}</span>
                    <span className="text-[var(--text-secondary)] font-mono text-[11px]">{b.vehicleNumber || "N/A"}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold tracking-wider">Connector</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 mt-0.5 block font-mono">
                      {b.connectorNumber || b.connector_number || b.connectorId || `Connector 01`}
                    </span>
                    <span className="text-[var(--text-secondary)] text-[11px] font-mono">
                      {b.connectorType || b.connector_type || "CCS2"} • {b.power || (b.powerKw ? `${b.powerKw} kW` : `${b.power_kw || 150} kW`)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold tracking-wider">
                      {isCompleted ? "Energy Transfer" : "Battery SOC Target"}
                    </span>
                    <div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block font-mono">
                        {b.currentSoc ?? b.current_soc_percent ?? 60}% → {b.targetSoc ?? b.target_soc_percent ?? 80}%
                      </span>
                      <span className="text-[var(--text-secondary)] text-[11px] font-mono">
                        Est. {b.energyRequiredKwh || b.estimatedGridEnergyKwh || b.energyRequired || 0} kWh (@ ₹{b.tariffPerKwh || b.tariffRate || 15}/kWh)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Amount & Payment Info */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div>
                    <span className="text-[var(--text-muted)] text-[11px] block">{isCompleted ? "Final Amount:" : "Estimated Amount:"}</span>
                    <span className="font-mono font-extrabold text-[var(--text-primary)] text-sm">
                      ₹{parseFloat(b.finalAmount || b.amount || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {b.paymentStatus || "PAID"}
                    </span>
                  </div>
                </div>

                {/* Action Buttons Based on Status */}
                <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-2">
                  {isConfirmed && (
                    <>
                      <button
                        onClick={() => handleCheckIn(b)}
                        disabled={checkingInId === b.bookingId}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
                      >
                        <ShieldCheck size={14} />
                        <span>{checkingInId === b.bookingId ? "Checking In..." : "CHECK IN NOW"}</span>
                      </button>

                      <button
                        onClick={() => setSelectedQRBooking(b)}
                        className="px-3 py-2 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] hover:border-blue-500/40 text-[var(--text-primary)] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <QrCode size={14} /> View QR
                      </button>

                      <button
                        onClick={() => handleCancelBooking(b.bookingId)}
                        disabled={cancellingId === b.bookingId}
                        className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold transition ml-auto cursor-pointer"
                      >
                        {cancellingId === b.bookingId ? "Cancelling..." : "Cancel"}
                      </button>
                    </>
                  )}

                  {isCheckedIn && (
                    <>
                      <button
                        onClick={() => handleProceedToCharging(b)}
                        disabled={startingId === b.bookingId}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                      >
                        <Zap size={14} className="fill-current" />
                        <span>{startingId === b.bookingId ? "Starting..." : "PROCEED TO LIVE CHARGING"}</span>
                      </button>

                      <button
                        onClick={() => setSelectedQRBooking(b)}
                        className="px-3 py-2 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] hover:border-blue-500/40 text-[var(--text-primary)] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <QrCode size={14} /> View QR
                      </button>
                    </>
                  )}

                  {isActive && (
                    <button
                      onClick={() => navigate(`/sessions/${b.bookingId}`, { state: { booking: b } })}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 cursor-pointer"
                    >
                      <Zap size={15} className="fill-current" /> VIEW LIVE CHARGING <ArrowRight size={14} />
                    </button>
                  )}

                  {isCompleted && (
                    <div className="flex items-center gap-2 w-full">
                      <button
                        onClick={() => setSelectedInvoiceBooking(b)}
                        className="flex-1 py-2 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <FileText size={14} /> VIEW INVOICE
                      </button>
                      <button
                        onClick={() => setSelectedInvoiceBooking(b)}
                        className="px-3 py-2 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] hover:border-blue-500/40 text-[var(--text-primary)] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download size={14} /> PDF
                      </button>
                    </div>
                  )}

                  {isCancelled && (
                    <div className="text-[11px] text-[var(--text-secondary)] italic">
                      {st === "NO_SHOW"
                        ? "Slot released due to no-show past arrival window."
                        : "Reservation cancelled. Payment refunded to original payment method."}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR Code Modal for Station Check-in */}
      {selectedQRBooking && (
        <QRCodeModal
          booking={selectedQRBooking}
          onClose={() => setSelectedQRBooking(null)}
        />
      )}

      {/* Official Tax Invoice Modal with PDF Download */}
      {selectedInvoiceBooking && (
        <InvoiceModal
          booking={selectedInvoiceBooking}
          onClose={() => setSelectedInvoiceBooking(null)}
        />
      )}
    </div>
  );
}