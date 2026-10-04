import React, { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  Calendar,
  Search,
  RefreshCw,
  Sparkles,
  Car,
  MapPin,
  DollarSign,
  AlertCircle,
  User,
  Zap,
} from "lucide-react";
import {
  getOwnerBookings,
  updateBookingStatus,
  startChargingSession,
} from "../../services/ownerService";
import { getSocket } from "../../services/socketService";

export default function OwnerBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL"); // ALL, PENDING, CONFIRMED, CHARGING, COMPLETED, CANCELLED
  const [searchTerm, setSearchTerm] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await getOwnerBookings();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showToast("Error loading bookings from MySQL");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();

    const socket = getSocket?.();
    if (socket) {
      const handleBookingChange = () => {
        getOwnerBookings().then((d) => setBookings(Array.isArray(d) ? d : [])).catch(() => {});
      };

      socket.on("booking_created", handleBookingChange);
      socket.on("booking_updated", handleBookingChange);

      return () => {
        socket.off("booking_created", handleBookingChange);
        socket.off("booking_updated", handleBookingChange);
      };
    }
  }, []);

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      await updateBookingStatus(bookingId, newStatus);
      showToast(`Booking ${bookingId} status updated to ${newStatus}`);
      loadBookings();
    } catch (err) {
      showToast("Failed to update status: " + (err.message || "Error"));
    }
  };

  const handleStartSession = async (booking) => {
    try {
      await startChargingSession({
        bookingId: booking.bookingId || booking.id,
        chargerId: booking.chargerId || booking.charger_id,
        userId: booking.userId || booking.user_id,
        vehicleId: booking.vehicleId || booking.vehicle_id,
      });
      showToast(`Charging session initiated for ${booking.bookingId || booking.id}`);
      loadBookings();
    } catch (err) {
      showToast("Failed to start session: " + (err.message || "Error"));
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const bStatus = (b.status || b.booking_status || "").toUpperCase();
    const statusMatch = activeTab === "ALL" || bStatus === activeTab;
    const searchMatch =
      !searchTerm.trim() ||
      (b.bookingId || b.booking_id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.customerName || b.customer_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.vehicleNumber || b.registration_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.stationName || b.station_name || "").toLowerCase().includes(searchTerm.toLowerCase());
    return statusMatch && searchMatch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in font-sans text-[var(--text-primary)]">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-[var(--accent-primary)] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-blue-400/30 animate-fade-in font-bold text-xs">
          <Sparkles className="w-4 h-4 text-yellow-300" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="p-6 md:p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              DISPATCH QUEUE
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] flex items-center gap-3 font-mono">
            <Clock className="w-7 h-7 text-amber-500" />
            Booking & Reservation Dispatch
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Real-time MySQL customer bookings stream. Confirm arrivals, dispatch bays, and trigger live charging sessions.
          </p>
        </div>

        <button
          onClick={loadBookings}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-bold transition self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
          Sync Bookings
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2">
          {["ALL", "CONFIRMED", "CHARGING", "COMPLETED", "CANCELLED"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                activeTab === tab
                  ? "bg-[var(--accent-primary)] text-white shadow-md shadow-blue-500/20"
                  : "bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search booking ID, customer, vehicle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
          />
        </div>
      </div>

      {/* Bookings Table / Cards */}
      {loading ? (
        <div className="text-center py-16 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-subtle)]">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-[var(--text-muted)] text-xs font-mono animate-pulse">Loading bookings from MySQL...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-16 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-subtle)] shadow-sm space-y-3">
          <Clock className="w-12 h-12 text-[var(--text-muted)] mx-auto" />
          <h3 className="text-base font-bold text-[var(--text-primary)] font-mono">No Bookings Found</h3>
          <p className="text-xs text-[var(--text-muted)]">Customer bookings will appear here automatically via Socket.IO from MySQL.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((b) => {
            const bId = b.bookingId || b.booking_id || `EV000${b.id}`;
            const cName = b.customerName || b.customer_name || "Customer";
            const vNumber = b.vehicleNumber || b.registration_number || "TN01EV0001";
            const stName = b.stationName || b.station_name || "EV Power Hub";
            const bDate = b.bookingDate || b.booking_date || "Today";
            const sTime = b.startTime || b.start_time || "14:00";
            const estAmount = parseFloat(b.estimatedAmount || b.totalAmount || b.amount || 250);
            const status = (b.status || b.booking_status || "CONFIRMED").toUpperCase();

            const isConfirmed = status === "CONFIRMED";
            const isCharging = status === "CHARGING" || status === "ACTIVE" || status === "IN_PROGRESS";
            const isCompleted = status === "COMPLETED";

            return (
              <div
                key={bId}
                className="bg-[var(--bg-surface)] rounded-3xl p-5 border border-[var(--border-subtle)] hover:border-blue-500/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm"
              >
                {/* Left: Info */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-[var(--accent-primary)] text-xs px-2.5 py-1 bg-blue-500/10 rounded-xl border border-blue-500/20">
                      {bId}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-mono font-bold uppercase text-[10px] ${
                        isConfirmed
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : isCharging
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                          : isCompleted
                          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
                    <div>
                      <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Driver</span>
                      <strong className="text-[var(--text-primary)]">{cName}</strong>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono">{vNumber}</div>
                    </div>

                    <div>
                      <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Station & Bay</span>
                      <strong className="text-[var(--text-primary)] truncate block max-w-[150px]">{stName}</strong>
                      <div className="text-[10px] text-[var(--accent-primary)] font-medium">{b.chargerId || b.charger_id || "Bay 01"}</div>
                    </div>

                    <div>
                      <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Slot Time</span>
                      <strong className="text-[var(--text-primary)]">{bDate}</strong>
                      <div className="text-[10px] text-[var(--text-muted)]">{sTime}</div>
                    </div>

                    <div>
                      <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Estimated Cost</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">₹{estAmount}</strong>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-[var(--border-subtle)]">
                  {isConfirmed && (
                    <button
                      onClick={() => handleStartSession(b)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-emerald-500/20 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      Start Charging
                    </button>
                  )}

                  {!isCompleted && status !== "CANCELLED" && (
                    <button
                      onClick={() => handleStatusChange(bId, "CANCELLED")}
                      className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl text-xs font-bold transition border border-rose-500/20 cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
