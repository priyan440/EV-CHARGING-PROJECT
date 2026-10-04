import { useState, useEffect } from "react";
import {
  Clock,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Play,
  Square,
  AlertTriangle,
  Car,
  User,
  MapPin,
  DollarSign,
  Eye,
  Trash2,
  Edit2,
  Calendar,
  Zap,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { adminService } from "../../services/adminService";
import { socketService } from "../../services/socketService";

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Add Form State
  const [formData, setFormData] = useState({
    customerId: "1",
    stationId: "1",
    chargerId: "1",
    bookingDate: new Date().toISOString().split("T")[0],
    startTime: "10:00:00",
    durationMinutes: 60,
    amount: 400.0,
    bookingStatus: "CONFIRMED",
    paymentStatus: "SUCCESS",
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const loadBookings = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminService.getBookings({ status: activeTab, search: searchTerm });
      if (res?.success && Array.isArray(res.data)) {
        setBookings(res.data);
      } else {
        setBookings([]);
      }
    } catch (err) {
      console.error("loadBookings error:", err);
      setError("Unable to load bookings from MySQL database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();

    const socket = socketService?.getSocket?.();
    if (socket) {
      const handleSync = () => loadBookings();
      socket.on("booking_created", handleSync);
      socket.on("booking_updated", handleSync);
      socket.on("booking_cancelled", handleSync);

      return () => {
        socket.off("booking_created", handleSync);
        socket.off("booking_updated", handleSync);
        socket.off("booking_cancelled", handleSync);
      };
    }
  }, [activeTab]);

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      await adminService.updateBooking(bookingId, { bookingStatus: newStatus });
      showToast(`Booking ${bookingId} marked as ${newStatus}`);
      loadBookings();
    } catch (err) {
      alert("Error updating booking: " + (err.message || "Failed"));
    }
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await adminService.createBooking(formData);
      if (res?.success) {
        showToast(res.message || "Booking created successfully in MySQL!");
        setShowAddModal(false);
        loadBookings();
      } else {
        alert(res?.message || "Failed to create booking");
      }
    } catch (err) {
      alert(err?.response?.data?.message || err.message || "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    setSubmitting(true);
    try {
      await adminService.deleteBooking(selectedBooking.id || selectedBooking.bookingId);
      showToast(`Booking ${selectedBooking.bookingId} cancelled and slot released.`);
      setShowCancelModal(false);
      loadBookings();
    } catch (err) {
      alert("Error cancelling booking: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered & Paginated
  const filtered = bookings.filter((b) => {
    const status = (b.bookingStatus || b.status || "CONFIRMED").toUpperCase();
    if (activeTab !== "ALL" && status !== activeTab) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (b.bookingId || "").toLowerCase().includes(q) ||
      (b.customerName || "").toLowerCase().includes(q) ||
      (b.customerEmail || "").toLowerCase().includes(q) ||
      (b.vehicleNumber || "").toLowerCase().includes(q) ||
      (b.stationName || "").toLowerCase().includes(q) ||
      (b.chargerName || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12 text-[var(--text-primary)]">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-400/30 animate-bounce">
          <CheckCircle2 size={18} />
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="theme-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-mono font-bold border border-blue-500/20">
              CENTRAL DISPATCH • MYSQL
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2.5">
            <Clock size={28} className="text-blue-500" /> Booking & Reservation Dispatch
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Real-time customer bookings stream. Dispatch bays, confirm arrivals, update statuses, and monitor live charging.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition cursor-pointer"
          >
            <Plus size={16} />
            <span>Create Booking</span>
          </button>

          <button
            onClick={loadBookings}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-bold transition cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-blue-500" : ""} />
            <span>Sync Bookings</span>
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {["ALL", "CONFIRMED", "PENDING", "CHARGING", "COMPLETED", "CANCELLED", "NO_SHOW"].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase transition cursor-pointer ${
                activeTab === tab
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                  : "bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
              }`}
            >
              {tab.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search EV ID, user, vehicle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Main Bookings Table */}
      <div className="theme-card overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw size={32} className="mx-auto animate-spin text-blue-500" />
            <p className="text-xs text-[var(--text-muted)] font-medium">Loading bookings from MySQL...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center space-y-3">
            <AlertTriangle size={36} className="mx-auto text-rose-500" />
            <p className="text-sm font-bold text-rose-500">{error}</p>
            <button
              onClick={loadBookings}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Clock size={36} className="mx-auto text-[var(--text-muted)] opacity-50" />
            <p className="text-sm font-bold text-[var(--text-primary)]">No bookings found</p>
            <p className="text-xs text-[var(--text-muted)]">No booking records found in MySQL for this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] text-[var(--text-muted)] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Booking ID</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Vehicle</th>
                  <th className="py-3.5 px-4">Station & Charger</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] font-medium">
                {paginated.map((b) => {
                  const status = (b.bookingStatus || b.status || "CONFIRMED").toUpperCase();
                  return (
                    <tr key={b.id || b.bookingId} className="hover:bg-[var(--bg-surface-raised)] transition">
                      <td className="py-4 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {b.bookingId || `EV${String(b.id).padStart(6, "0")}`}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-[var(--text-primary)] block text-sm">{b.customerName || "Customer"}</span>
                        <span className="text-[11px] text-[var(--text-muted)]">{b.customerEmail}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                          {b.vehicleNumber || b.registrationNumber || "TN01EV0001"}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)]">{b.vehicleModel || "Electric Vehicle"}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-[var(--text-primary)] block">{b.stationName || "EV Power Hub"}</span>
                        <span className="text-[11px] text-blue-600 dark:text-blue-400 font-mono">
                          {b.chargerName || "Bay 01 (CCS2)"}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono text-[var(--text-secondary)]">
                        <span className="block font-bold text-[var(--text-primary)]">{b.bookingDate}</span>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          {b.startTime?.slice(0, 5)} - {b.endTime?.slice(0, 5)} ({b.durationMinutes || b.duration || 60}m)
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm block">
                          ₹{b.amount}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono">{b.paymentStatus || "SUCCESS"}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            status === "CHARGING"
                              ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30"
                              : status === "CONFIRMED"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                              : status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {status === "CONFIRMED" && (
                            <button
                              onClick={() => handleStatusUpdate(b.bookingId || b.id, "CHARGING")}
                              title="Start Charging"
                              className="p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 transition cursor-pointer"
                            >
                              <Play size={13} />
                            </button>
                          )}
                          {status === "CHARGING" && (
                            <button
                              onClick={() => handleStatusUpdate(b.bookingId || b.id, "COMPLETED")}
                              title="Complete Charging"
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition cursor-pointer"
                            >
                              <Square size={13} />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedBooking(b);
                              setShowViewModal(true);
                            }}
                            title="View Details"
                            className="p-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-blue-500 transition cursor-pointer"
                          >
                            <Eye size={13} />
                          </button>
                          {status !== "CANCELLED" && status !== "COMPLETED" && (
                            <button
                              onClick={() => {
                                setSelectedBooking(b);
                                setShowCancelModal(true);
                              }}
                              title="Cancel Booking"
                              className="p-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-rose-500 transition cursor-pointer"
                            >
                              <XCircle size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filtered.length > itemsPerPage && (
          <div className="p-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} bookings
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-[var(--border-subtle)] disabled:opacity-40 cursor-pointer hover:bg-[var(--bg-surface-raised)]"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="font-bold px-2">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-[var(--border-subtle)] disabled:opacity-40 cursor-pointer hover:bg-[var(--bg-surface-raised)]"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================== */}
      {/* 1. ADD BOOKING MODAL                                 */}
      {/* ==================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="theme-card max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <h2 className="text-base font-extrabold flex items-center gap-2 text-[var(--text-primary)]">
                <Plus size={18} className="text-blue-500" /> Create Manual Booking (Admin)
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Booking Date</label>
                  <input
                    type="date"
                    required
                    value={formData.bookingDate}
                    onChange={(e) => setFormData({ ...formData, bookingDate: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Estimated Amount (₹)</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--bg-surface-raised)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/25 cursor-pointer"
                >
                  {submitting ? "Saving..." : "Create Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. VIEW BOOKING MODAL                                */}
      {/* ==================================================== */}
      {showViewModal && selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="theme-card max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h2 className="text-base font-extrabold flex items-center gap-2 text-[var(--text-primary)]">
                  <Zap size={18} className="text-blue-500" /> Booking Details
                </h2>
                <span className="text-xs font-mono text-blue-600 dark:text-blue-400 font-bold">{selectedBooking.bookingId}</span>
              </div>
              <button onClick={() => setShowViewModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                <span className="text-[11px] text-[var(--text-muted)] block">Customer</span>
                <span className="font-bold text-[var(--text-primary)]">{selectedBooking.customerName}</span>
                <span className="text-[11px] text-[var(--text-muted)] block">{selectedBooking.customerEmail}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                <span className="text-[11px] text-[var(--text-muted)] block">Vehicle</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{selectedBooking.vehicleNumber}</span>
                <span className="text-[11px] text-[var(--text-muted)] block">{selectedBooking.vehicleModel}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                <span className="text-[11px] text-[var(--text-muted)] block">Station & Charger</span>
                <span className="font-bold text-[var(--text-primary)]">{selectedBooking.stationName}</span>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-mono block">{selectedBooking.chargerName}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                <span className="text-[11px] text-[var(--text-muted)] block">Date & Time</span>
                <span className="font-bold text-[var(--text-primary)]">{selectedBooking.bookingDate}</span>
                <span className="text-[11px] text-[var(--text-muted)] block">{selectedBooking.startTime}</span>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-[var(--border-subtle)]">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. CANCEL BOOKING MODAL                              */}
      {/* ==================================================== */}
      {showCancelModal && selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="theme-card max-w-sm w-full p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center border border-rose-500/20">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-base font-extrabold text-[var(--text-primary)]">Cancel Reservation?</h3>
            <p className="text-xs text-[var(--text-muted)]">
              Are you sure you want to cancel booking <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{selectedBooking.bookingId}</span>? This will release the charger slot back to AVAILABLE immediately.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--bg-surface-raised)] cursor-pointer"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-lg shadow-rose-600/25 cursor-pointer"
              >
                {submitting ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
