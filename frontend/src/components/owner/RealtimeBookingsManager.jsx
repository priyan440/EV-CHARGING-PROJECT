import React, { useState, useMemo } from "react";
import {
  CalendarCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  TrendingUp,
  DollarSign,
  Filter,
  Eye,
  RefreshCw,
  Plus,
  AlertTriangle,
  User,
  Phone,
  Car,
  Check,
  X,
  Radio,
  Wifi,
  WifiOff,
  Copy,
  QrCode,
  Shield,
  FileText,
  Building2,
  ChevronDown,
  Download,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useRealtimeBookings } from "../../hooks/useRealtimeBookings";

export default function RealtimeBookingsManager({ compact = false, showStats = true, title = "Real-Time Booking Management System" }) {
  const {
    bookings,
    stats,
    loading,
    connectionStatus,
    isLive,
    recentToast,
    dismissToast,
    newBookingIds,
    refreshBookings,
    updateStatus,
    cancelBooking,
    createOfflineBooking,
  } = useRealtimeBookings();

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("newest");

  // Modals & Selected items
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [isCancelLoading, setIsCancelLoading] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Offline Booking Form State
  const [offlineForm, setOfflineForm] = useState({
    customerName: "",
    customerPhone: "",
    vehicleNumber: "",
    stationId: "1",
    slotId: "1",
    connectorType: "CCS2",
    batteryStartPct: 20,
    batteryTargetPct: 80,
    startTime: "10:00",
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "Cash / POS",
    amount: 550,
  });
  const [offlineLoading, setOfflineLoading] = useState(false);
  const [offlineError, setOfflineError] = useState("");

  // Copy helper
  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered & Sorted Bookings
  const filteredBookings = useMemo(() => {
    return bookings
      .filter((b) => {
        // Search Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match =
            (b.bookingId && b.bookingId.toLowerCase().includes(q)) ||
            (b.customerName && b.customerName.toLowerCase().includes(q)) ||
            (b.customerPhone && b.customerPhone.toLowerCase().includes(q)) ||
            (b.vehicleNumber && b.vehicleNumber.toLowerCase().includes(q)) ||
            (b.stationName && b.stationName.toLowerCase().includes(q));
          if (!match) return false;
        }

        // Status Filter
        if (statusFilter !== "ALL" && b.status !== statusFilter) {
          return false;
        }

        // Payment Filter
        if (paymentFilter !== "ALL" && b.paymentStatus !== paymentFilter) {
          return false;
        }

        // Source Filter
        if (sourceFilter !== "ALL") {
          if (sourceFilter === "OFFLINE" && !b.isOffline) return false;
          if (sourceFilter === "ONLINE" && b.isOffline) return false;
        }

        // Date Filter
        const todayStr = new Date().toISOString().split("T")[0];
        if (dateFilter === "TODAY" && b.date !== todayStr) return false;
        if (dateFilter === "UPCOMING" && b.date < todayStr) return false;
        if (dateFilter === "PAST" && b.date >= todayStr) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === "newest") {
          return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
        }
        if (sortOrder === "oldest") {
          return new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date);
        }
        if (sortOrder === "amount_high") {
          return (b.amount || 0) - (a.amount || 0);
        }
        return 0;
      });
  }, [bookings, searchQuery, statusFilter, dateFilter, paymentFilter, sourceFilter, sortOrder]);

  // Status Badge Helper
  const getStatusBadge = (status) => {
    const s = (status || "PENDING").toUpperCase();
    switch (s) {
      case "CONFIRMED":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      case "IN_PROGRESS":
      case "CHARGING":
      case "CHECKED_IN":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 animate-pulse";
      case "COMPLETED":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30";
      case "CANCELLED":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
      case "NO_SHOW":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  // Payment Badge Helper
  const getPaymentBadge = (status) => {
    const s = (status || "PENDING").toUpperCase();
    switch (s) {
      case "PAID":
      case "SUCCESS":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "REFUNDED":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      default:
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    }
  };

  // Status Change Handler
  const handleStatusChange = async (bookingId, newStatus) => {
    const res = await updateStatus(bookingId, newStatus);
    if (!res.success) {
      alert(res.message || "Failed to update booking status");
    }
  };

  // Cancel Confirmation Handler
  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return;
    setIsCancelLoading(true);
    try {
      const res = await cancelBooking(cancellingBooking.bookingId || cancellingBooking.id);
      if (res.success) {
        setCancellingBooking(null);
      } else {
        alert(res.message || "Failed to cancel booking");
      }
    } finally {
      setIsCancelLoading(false);
    }
  };

  // Create Offline Booking Handler
  const handleCreateOffline = async (e) => {
    e.preventDefault();
    setOfflineLoading(true);
    setOfflineError("");
    try {
      const res = await createOfflineBooking({
        ...offlineForm,
        stationId: parseInt(offlineForm.stationId, 10),
        slotId: parseInt(offlineForm.slotId, 10),
        battery_start_pct: parseInt(offlineForm.batteryStartPct, 10),
        battery_target_pct: parseInt(offlineForm.batteryTargetPct, 10),
        amount: parseFloat(offlineForm.amount),
        booking_date: offlineForm.date,
        start_time: `${offlineForm.startTime}:00`,
      });
      if (res.success) {
        setShowOfflineModal(false);
        setOfflineForm({
          customerName: "",
          customerPhone: "",
          vehicleNumber: "",
          stationId: "1",
          slotId: "1",
          connectorType: "CCS2",
          batteryStartPct: 20,
          batteryTargetPct: 80,
          startTime: "10:00",
          date: new Date().toISOString().split("T")[0],
          paymentMethod: "Cash / POS",
          amount: 550,
        });
      } else {
        setOfflineError(res.message || "Failed to create offline booking.");
      }
    } catch (err) {
      setOfflineError(err.message || "Server error.");
    } finally {
      setOfflineLoading(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredBookings.length === 0) return;
    const headers = [
      "Booking ID",
      "Customer Name",
      "Phone",
      "Station",
      "Connector",
      "Vehicle",
      "Date",
      "Time",
      "Amount (INR)",
      "Status",
      "Payment Status",
      "Source",
    ];
    const rows = filteredBookings.map((b) => [
      b.bookingId || b.id,
      `"${b.customerName || "Customer"}"`,
      `"${b.customerPhone || ""}"`,
      `"${b.stationName || ""}"`,
      `"${b.connectorId || b.chargerId || ""}"`,
      `"${b.vehicleNumber || ""}"`,
      b.date,
      b.time,
      b.amount || b.totalAmount || 0,
      b.status,
      b.paymentStatus,
      b.bookingSource || (b.isOffline ? "Offline" : "Online"),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `VoltCharge_Bookings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification for Real-Time Events */}
      {recentToast && (
        <div className="fixed top-20 right-6 z-50 max-w-md w-full animate-bounce-short">
          <div className="p-4 rounded-2xl bg-[#0F172A] border border-blue-500/40 shadow-2xl shadow-blue-500/20 text-white flex items-start justify-between gap-3 backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <Zap size={20} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-sm text-blue-400">{recentToast.title}</h4>
                  <span className="text-[10px] font-mono text-slate-400">{recentToast.timestamp}</span>
                </div>
                <p className="text-xs text-slate-200 mt-0.5 leading-relaxed font-medium">
                  {recentToast.message}
                </p>
              </div>
            </div>
            <button
              onClick={dismissToast}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Main Header & Live Indicator Bar */}
      <div className="theme-card p-6 md:p-8 rounded-3xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 text-[10px] font-extrabold font-mono uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full border border-purple-500/20 flex items-center gap-1.5">
                <CalendarCheck size={12} /> OWNER DISPATCH SYSTEM
              </span>

              {/* LIVE WEBSOCKET INDICATOR */}
              <div
                className={`px-3 py-1 rounded-full text-[10px] font-extrabold font-mono tracking-wider flex items-center gap-1.5 border transition-all ${
                  isLive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-500/10"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse"
                }`}
              >
                {isLive ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 -ml-3.5"></span>
                    <span>🟢 Live Updates Active</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={12} className="animate-spin text-rose-500" />
                    <span>🔴 Connection Lost – Reconnecting...</span>
                  </>
                )}
              </div>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <CalendarCheck size={28} className="text-purple-500" /> {title}
            </h1>

            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Instant real-time synchronization of customer bookings, cancellations, walk-ins, and slot allocations.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowOfflineModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs tracking-wider uppercase transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <Plus size={16} /> Create Walk-in / Offline
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
              title="Export Bookings to CSV"
            >
              <Download size={14} /> Export CSV
            </button>

            <button
              onClick={refreshBookings}
              disabled={loading}
              className="px-3 py-2.5 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Manual Sync"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* 5. DASHBOARD STATISTICS CARDS (Real-Time Synchronized) */}
      {showStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3 font-mono">
          {/* Total Bookings */}
          <div className="theme-card p-4 rounded-2xl space-y-1">
            <span className="text-[10px] text-[var(--text-secondary)] font-extrabold uppercase tracking-wider block">Total</span>
            <h3 className="text-xl font-black text-[var(--text-primary)]">{stats.totalBookings}</h3>
            <span className="text-[9px] text-[var(--text-muted)] block">All Time</span>
          </div>

          {/* Today's Bookings */}
          <div className="theme-card p-4 rounded-2xl space-y-1 border-blue-500/20 bg-blue-500/5">
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-wider block">Today</span>
            <h3 className="text-xl font-black text-blue-600 dark:text-blue-400">{stats.todayBookings}</h3>
            <span className="text-[9px] text-blue-500/80 block">Today's Total</span>
          </div>

          {/* Pending Bookings */}
          <div className="theme-card p-4 rounded-2xl space-y-1 border-amber-500/20 bg-amber-500/5">
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-wider block">Pending</span>
            <h3 className="text-xl font-black text-amber-600 dark:text-amber-400">{stats.pendingBookings}</h3>
            <span className="text-[9px] text-amber-500/80 block">Awaiting Approval</span>
          </div>

          {/* Confirmed Bookings */}
          <div className="theme-card p-4 rounded-2xl space-y-1 border-emerald-500/20 bg-emerald-500/5">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wider block">Confirmed</span>
            <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400">{stats.confirmedBookings}</h3>
            <span className="text-[9px] text-emerald-500/80 block">Reserved Bays</span>
          </div>

          {/* In Progress Bookings */}
          <div className="theme-card p-4 rounded-2xl space-y-1 border-cyan-500/20 bg-cyan-500/5">
            <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-extrabold uppercase tracking-wider block">In Progress</span>
            <h3 className="text-xl font-black text-cyan-600 dark:text-cyan-400">{stats.inProgressBookings}</h3>
            <span className="text-[9px] text-cyan-500/80 block">Actively Charging</span>
          </div>

          {/* Completed Bookings */}
          <div className="theme-card p-4 rounded-2xl space-y-1 border-purple-500/20 bg-purple-500/5">
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-extrabold uppercase tracking-wider block">Completed</span>
            <h3 className="text-xl font-black text-purple-600 dark:text-purple-400">{stats.completedBookings}</h3>
            <span className="text-[9px] text-purple-500/80 block">Finished</span>
          </div>

          {/* Cancelled Bookings */}
          <div className="theme-card p-4 rounded-2xl space-y-1 border-rose-500/20 bg-rose-500/5">
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-extrabold uppercase tracking-wider block">Cancelled</span>
            <h3 className="text-xl font-black text-rose-600 dark:text-rose-400">{stats.cancelledBookings}</h3>
            <span className="text-[9px] text-rose-500/80 block">Capacity Released</span>
          </div>

          {/* Today's Revenue */}
          <div className="theme-card p-4 rounded-2xl space-y-1 border-emerald-500/30 bg-emerald-500/10">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wider block">Today's Rev</span>
            <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400">₹{Math.round(stats.todayRevenue).toLocaleString()}</h3>
            <span className="text-[9px] text-emerald-500/80 block">Net Collected</span>
          </div>
        </div>
      )}

      {/* 7. SEARCH & FILTER TOOLBAR */}
      <div className="theme-card p-4 md:p-5 rounded-2xl space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search Booking ID, Customer, Phone, Vehicle, Station..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="theme-input w-full pl-9 pr-4 py-2 text-xs rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="theme-input px-3 py-2 rounded-xl font-bold"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress / Charging</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="NO_SHOW">No Show</option>
            </select>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="theme-input px-3 py-2 rounded-xl font-bold"
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today's Bookings</option>
              <option value="UPCOMING">Upcoming Bookings</option>
              <option value="PAST">Past Bookings</option>
            </select>

            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="theme-input px-3 py-2 rounded-xl font-bold"
            >
              <option value="ALL">All Payments</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending Payment</option>
              <option value="REFUNDED">Refunded</option>
            </select>

            {/* Source Filter */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="theme-input px-3 py-2 rounded-xl font-bold"
            >
              <option value="ALL">All Sources</option>
              <option value="ONLINE">Online Customer</option>
              <option value="OFFLINE">Offline / Walk-in</option>
            </select>

            {/* Sort Order */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="theme-input px-3 py-2 rounded-xl font-bold"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount_high">Highest Amount</option>
            </select>
          </div>
        </div>

        {/* Results summary & Active filter tags */}
        <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] font-mono border-t border-[var(--border-subtle)] pt-2.5">
          <span>Showing {filteredBookings.length} of {bookings.length} reservations</span>
          {(statusFilter !== "ALL" || dateFilter !== "ALL" || paymentFilter !== "ALL" || sourceFilter !== "ALL" || searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter("ALL");
                setDateFilter("ALL");
                setPaymentFilter("ALL");
                setSourceFilter("ALL");
                setSearchQuery("");
              }}
              className="text-purple-600 dark:text-purple-400 hover:underline font-bold"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 7. RESPONSIVE REAL-TIME BOOKING TABLE */}
      <div className="theme-card rounded-3xl overflow-hidden shadow-xl border border-[var(--border-subtle)]">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] text-[var(--text-secondary)] font-extrabold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Booking ID</th>
                <th className="py-3.5 px-4">Customer & Contact</th>
                <th className="py-3.5 px-4">Station & Bay</th>
                <th className="py-3.5 px-4">Vehicle Plate</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
              {loading && bookings.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[var(--text-muted)]">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-purple-400" />
                    <span>Loading real-time bookings from database...</span>
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[var(--text-muted)]">
                    <CalendarCheck size={28} className="mx-auto mb-2 text-slate-500 opacity-50" />
                    <p className="font-bold">No bookings match the selected criteria.</p>
                    <p className="text-[11px] mt-1">Try adjusting search query or filter options.</p>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                  const bKey = b.bookingId || b.id;
                  const isNewlyAdded = newBookingIds.has(bKey);

                  return (
                    <tr
                      key={bKey}
                      className={`hover:bg-[var(--bg-surface-raised)]/70 transition duration-150 ${
                        isNewlyAdded ? "bg-emerald-500/10 border-l-4 border-l-emerald-500 animate-pulse" : ""
                      }`}
                    >
                      {/* Booking ID */}
                      <td className="py-4 px-4 font-mono font-extrabold text-purple-600 dark:text-purple-400">
                        <div className="flex items-center gap-1.5">
                          <span>{b.bookingId || `EV${String(b.id).padStart(3, "0")}`}</span>
                          <button
                            onClick={() => handleCopy(b.bookingId || `EV${String(b.id).padStart(3, "0")}`, bKey)}
                            className="text-slate-400 hover:text-white transition"
                            title="Copy ID"
                          >
                            {copiedId === bKey ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] font-normal block mt-0.5">
                          Created: {b.createdAt ? new Date(b.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Today"}
                        </span>
                      </td>

                      {/* Customer Info */}
                      <td className="py-4 px-4">
                        <span className="font-bold text-[var(--text-primary)] block text-xs">{b.customerName}</span>
                        <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] mt-0.5 font-mono">
                          <Phone size={10} />
                          <span>{b.customerPhone || "N/A"}</span>
                        </div>
                      </td>

                      {/* Station & Bay */}
                      <td className="py-4 px-4">
                        <span className="font-bold text-[var(--text-primary)] block truncate max-w-[140px]">{b.stationName}</span>
                        <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                          <Zap size={10} />
                          <span>{b.chargerId || b.slotNumber} ({b.connectorType || "CCS2"})</span>
                        </div>
                      </td>

                      {/* Vehicle Plate */}
                      <td className="py-4 px-4 font-mono">
                        <div className="px-2 py-0.5 rounded bg-[var(--bg-app)] border border-[var(--border-subtle)] text-[11px] font-bold text-[var(--text-primary)] inline-block">
                          {b.vehicleNumber}
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">{b.vehicleModel || "Car"}</span>
                      </td>

                      {/* Date & Time */}
                      <td className="py-4 px-4">
                        <span className="font-bold text-[var(--text-primary)] block">{b.date}</span>
                        <span className="text-[11px] text-[var(--text-secondary)] font-mono">{b.timeSlot || b.time}</span>
                      </td>

                      {/* Source Badge */}
                      <td className="py-4 px-4">
                        {b.isOffline ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            🏢 Walk-in
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                            🌐 Online
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4 font-mono font-black text-sm text-[var(--text-primary)]">
                        ₹{b.totalAmount || b.amount || 0}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <div className="relative inline-block">
                          <select
                            value={b.status}
                            onChange={(e) => handleStatusChange(b.bookingId || b.id, e.target.value)}
                            className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase tracking-wider border cursor-pointer appearance-none pr-6 font-mono ${getStatusBadge(
                              b.status
                            )}`}
                          >
                            <option value="PENDING">Pending</option>
                            <option value="CONFIRMED">Confirmed</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="CANCELLED">Cancelled</option>
                            <option value="NO_SHOW">No Show</option>
                          </select>
                          <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                        </div>
                      </td>

                      {/* Payment Status */}
                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider border ${getPaymentBadge(b.paymentStatus)}`}>
                          {b.paymentStatus || "PENDING"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedBooking(b)}
                            className="p-1.5 rounded-lg bg-[var(--bg-card-subtle)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
                            title="View Full Details"
                          >
                            <Eye size={15} />
                          </button>

                          {b.status !== "CANCELLED" && b.status !== "COMPLETED" && (
                            <button
                              onClick={() => setCancellingBooking(b)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition"
                              title="Cancel Reservation"
                            >
                              <XCircle size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: VIEW BOOKING DETAILS */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="theme-card max-w-lg w-full rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl border border-[var(--border-subtle)] max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
              <div>
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-purple-500 block">
                  BOOKING RECEIPT BREAKDOWN
                </span>
                <h3 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                  #{selectedBooking.bookingId || selectedBooking.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Customer & Vehicle Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">Customer Info</span>
                <span className="font-bold text-[var(--text-primary)] block">{selectedBooking.customerName}</span>
                <span className="text-[11px] text-[var(--text-secondary)] block font-mono">{selectedBooking.customerPhone}</span>
                <span className="text-[11px] text-[var(--text-muted)] block truncate">{selectedBooking.customerEmail}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">Vehicle Details</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block">{selectedBooking.vehicleNumber}</span>
                <span className="text-[11px] text-[var(--text-primary)] block">{selectedBooking.vehicleModel}</span>
                <span className="text-[10px] text-[var(--text-muted)] block">Type: {selectedBooking.vehicleType || "Car"}</span>
              </div>
            </div>

            {/* Station & Charger Bay Info */}
            <div className="p-4 rounded-2xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[var(--text-primary)]">{selectedBooking.stationName}</span>
                <span className="font-mono text-purple-400 font-bold">{selectedBooking.stationIdCode}</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">{selectedBooking.stationAddress}</p>
              <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
                <span className="px-2 py-0.5 rounded bg-[var(--bg-app)] border border-[var(--border-subtle)] text-emerald-400">
                  Bay: {selectedBooking.slotNumber || selectedBooking.chargerId}
                </span>
                <span className="px-2 py-0.5 rounded bg-[var(--bg-app)] border border-[var(--border-subtle)] text-blue-400">
                  Connector: {selectedBooking.connectorType}
                </span>
                <span className="px-2 py-0.5 rounded bg-[var(--bg-app)] border border-[var(--border-subtle)] text-amber-400">
                  Power: {selectedBooking.chargingPower || 30} kW
                </span>
              </div>
            </div>

            {/* Battery & Charging Metrics */}
            <div className="p-4 rounded-2xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Battery Transition:</span>
                <span className="font-bold text-[var(--text-primary)]">{selectedBooking.batteryTransition || "20% → 80%"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Estimated Energy:</span>
                <span className="font-bold text-emerald-400">{selectedBooking.energyRequired || 36.0} kWh</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Time Slot:</span>
                <span className="font-bold text-[var(--text-primary)]">{selectedBooking.date} ({selectedBooking.timeSlot || selectedBooking.time})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Estimated Duration:</span>
                <span className="font-bold text-[var(--text-primary)]">{selectedBooking.duration || "1 hr"}</span>
              </div>
            </div>

            {/* Payment & Invoice Breakdown */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between font-mono">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Total Amount</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₹{selectedBooking.totalAmount || selectedBooking.amount || 0}</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5">{selectedBooking.paymentMethod}</span>
              </div>
              <div className="text-right">
                <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase tracking-wider border ${getPaymentBadge(selectedBooking.paymentStatus)}`}>
                  {selectedBooking.paymentStatus}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">Source: {selectedBooking.bookingSource || "Online"}</span>
              </div>
            </div>

            {/* QR Token Display */}
            <div className="p-3.5 rounded-2xl bg-[var(--bg-app)] border border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-[10px] text-[var(--text-muted)] block">Check-in QR Token:</span>
                <span className="font-bold text-[var(--text-primary)] truncate max-w-[200px] block">{selectedBooking.qrToken}</span>
              </div>
              <button
                onClick={() => handleCopy(selectedBooking.qrToken, "modal_qr")}
                className="px-3 py-1.5 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold text-[11px] flex items-center gap-1"
              >
                {copiedId === "modal_qr" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>Copy Token</span>
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-5 py-2.5 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CANCEL BOOKING CONFIRMATION */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="theme-card max-w-md w-full rounded-3xl p-6 md:p-8 space-y-4 shadow-2xl border border-rose-500/30">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>

            <h3 className="text-lg font-extrabold text-[var(--text-primary)]">
              Cancel Booking #{cancellingBooking.bookingId || cancellingBooking.id}?
            </h3>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Are you sure you want to cancel this reservation for{" "}
              <strong className="text-[var(--text-primary)]">{cancellingBooking.customerName}</strong> ({cancellingBooking.vehicleNumber})?
              The station slot and power capacity will be immediately released for other drivers.
            </p>

            <div className="flex items-center justify-end gap-2 pt-4">
              <button
                onClick={() => setCancellingBooking(null)}
                className="px-4 py-2 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold text-xs"
              >
                Keep Booking
              </button>
              <button
                disabled={isCancelLoading}
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs transition flex items-center gap-1.5 shadow-md shadow-rose-600/25 disabled:opacity-50"
              >
                {isCancelLoading ? <RefreshCw size={14} className="animate-spin" /> : <XCircle size={14} />}
                <span>Confirm Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE WALK-IN / OFFLINE BOOKING */}
      {showOfflineModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="theme-card max-w-lg w-full rounded-3xl p-6 md:p-8 space-y-5 shadow-2xl border border-[var(--border-subtle)] max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
              <div>
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-emerald-500 block">
                  WALK-IN DISPATCH DESK
                </span>
                <h3 className="text-xl font-extrabold text-[var(--text-primary)]">
                  Create Walk-in / Offline Booking
                </h3>
              </div>
              <button
                onClick={() => setShowOfflineModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
              >
                <X size={20} />
              </button>
            </div>

            {offlineError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-mono">
                {offlineError}
              </div>
            )}

            <form onSubmit={handleCreateOffline} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Arun Kumar"
                    value={offlineForm.customerName}
                    onChange={(e) => setOfflineForm({ ...offlineForm, customerName: e.target.value })}
                    className="theme-input w-full px-3 py-2 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98765 43210"
                    value={offlineForm.customerPhone}
                    onChange={(e) => setOfflineForm({ ...offlineForm, customerPhone: e.target.value })}
                    className="theme-input w-full px-3 py-2 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block mb-1">Vehicle Plate</label>
                  <input
                    type="text"
                    required
                    placeholder="TN58AB1234"
                    value={offlineForm.vehicleNumber}
                    onChange={(e) => setOfflineForm({ ...offlineForm, vehicleNumber: e.target.value.toUpperCase() })}
                    className="theme-input w-full px-3 py-2 rounded-xl text-xs font-mono font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block mb-1">Connector Type</label>
                  <select
                    value={offlineForm.connectorType}
                    onChange={(e) => setOfflineForm({ ...offlineForm, connectorType: e.target.value })}
                    className="theme-input w-full px-3 py-2 rounded-xl text-xs font-bold"
                  >
                    <option value="CCS2">CCS2 (DC Fast Charger)</option>
                    <option value="Type 2">Type 2 (AC Normal)</option>
                    <option value="CHAdeMO">CHAdeMO (DC Fast)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block mb-1">Current Battery %</label>
                  <input
                    type="number"
                    min="5"
                    max="95"
                    value={offlineForm.batteryStartPct}
                    onChange={(e) => setOfflineForm({ ...offlineForm, batteryStartPct: e.target.value })}
                    className="theme-input w-full px-3 py-2 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block mb-1">Target Battery %</label>
                  <input
                    type="number"
                    min="20"
                    max="100"
                    value={offlineForm.batteryTargetPct}
                    onChange={(e) => setOfflineForm({ ...offlineForm, batteryTargetPct: e.target.value })}
                    className="theme-input w-full px-3 py-2 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={offlineForm.startTime}
                    onChange={(e) => setOfflineForm({ ...offlineForm, startTime: e.target.value })}
                    className="theme-input w-full px-3 py-2 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block mb-1">Payment Method</label>
                  <select
                    value={offlineForm.paymentMethod}
                    onChange={(e) => setOfflineForm({ ...offlineForm, paymentMethod: e.target.value })}
                    className="theme-input w-full px-3 py-2 rounded-xl text-xs font-bold"
                  >
                    <option value="Cash">Cash Collected</option>
                    <option value="POS Terminal">POS Card Swipe</option>
                    <option value="UPI QR">Direct UPI Scan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block mb-1">Calculated Total (₹)</label>
                <input
                  type="number"
                  min="50"
                  step="10"
                  value={offlineForm.amount}
                  onChange={(e) => setOfflineForm({ ...offlineForm, amount: e.target.value })}
                  className="theme-input w-full px-3 py-2 rounded-xl text-xs font-mono font-extrabold text-emerald-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setShowOfflineModal(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={offlineLoading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs tracking-wider uppercase transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {offlineLoading ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                  <span>Confirm Walk-in Booking</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
