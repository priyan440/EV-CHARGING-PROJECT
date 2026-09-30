import { useState, useEffect, useCallback, useRef } from "react";
import socketService from "../services/socketService";
import { bookingService } from "../services/bookingService";

export function useRealtimeBookings() {
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    todayBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    inProgressBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    noShowBookings: 0,
    upcomingBookings: 0,
    todayRevenue: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [recentToast, setRecentToast] = useState(null);
  const [newBookingIds, setNewBookingIds] = useState(new Set());

  const toastTimerRef = useRef(null);

  const showToast = useCallback((toastData) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setRecentToast(toastData);
    toastTimerRef.current = setTimeout(() => {
      setRecentToast(null);
    }, 7000);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setRecentToast(null);
  }, []);

  // Fetch initial authentic bookings and stats from MySQL database
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [bookingsRes, statsRes] = await Promise.all([
        bookingService.getBookings(),
        bookingService.getDashboardStats(),
      ]);

      if (bookingsRes?.success && Array.isArray(bookingsRes.data)) {
        setBookings(bookingsRes.data);
      }

      if (statsRes?.success && statsRes.stats) {
        setStats(statsRes.stats);
      } else if (bookingsRes?.data) {
        // Fallback local calculation
        const allB = bookingsRes.data;
        const todayStr = new Date().toISOString().split("T")[0];
        const todayB = allB.filter((b) => b.date === todayStr);
        setStats({
          totalBookings: allB.length,
          todayBookings: todayB.length,
          pendingBookings: allB.filter((b) => b.status === "PENDING").length,
          confirmedBookings: allB.filter((b) => b.status === "CONFIRMED").length,
          inProgressBookings: allB.filter((b) => ["IN_PROGRESS", "CHARGING"].includes(b.status)).length,
          completedBookings: allB.filter((b) => b.status === "COMPLETED").length,
          cancelledBookings: allB.filter((b) => b.status === "CANCELLED").length,
          noShowBookings: allB.filter((b) => b.status === "NO_SHOW").length,
          upcomingBookings: allB.filter((b) => b.date >= todayStr && ["CONFIRMED", "PENDING"].includes(b.status)).length,
          todayRevenue: todayB.filter((b) => b.status !== "CANCELLED").reduce((sum, b) => sum + (b.totalAmount || b.amount || 0), 0),
          totalRevenue: allB.filter((b) => b.status !== "CANCELLED").reduce((sum, b) => sum + (b.totalAmount || b.amount || 0), 0),
        });
      }
    } catch (err) {
      console.error("Error loading bookings initial data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();

    // Connect to real-time socket server
    socketService.connect();

    const unsubStatus = socketService.onStatusChange((status) => {
      setConnectionStatus(status);
    });

    // Real-Time Event: Booking Created
    const unsubCreated = socketService.onBookingCreated((payload) => {
      const newBooking = payload?.booking;
      if (!newBooking) return;

      console.log("⚡ [Real-Time] Booking Created Event received:", newBooking);

      setBookings((prev) => {
        // Deduplicate using bookingId or id
        const exists = prev.some(
          (b) =>
            (b.bookingId && b.bookingId === newBooking.bookingId) ||
            (b.id && b.id === newBooking.id)
        );
        if (exists) {
          return prev.map((b) =>
            b.bookingId === newBooking.bookingId || b.id === newBooking.id ? { ...b, ...newBooking } : b
          );
        }
        // Prepend to top
        return [newBooking, ...prev];
      });

      // Highlight new booking ID
      const bKey = newBooking.bookingId || newBooking.id;
      setNewBookingIds((prev) => new Set([...prev, bKey]));
      setTimeout(() => {
        setNewBookingIds((prev) => {
          const next = new Set(prev);
          next.delete(bKey);
          return next;
        });
      }, 8000);

      // Update real-time statistics
      if (payload.stats) {
        setStats(payload.stats);
      } else {
        setStats((prev) => ({
          ...prev,
          totalBookings: prev.totalBookings + 1,
          todayBookings: prev.todayBookings + 1,
          confirmedBookings: newBooking.status === "CONFIRMED" ? prev.confirmedBookings + 1 : prev.confirmedBookings,
          pendingBookings: newBooking.status === "PENDING" ? prev.pendingBookings + 1 : prev.pendingBookings,
          todayRevenue: prev.todayRevenue + (newBooking.amount || newBooking.totalAmount || 0),
          totalRevenue: prev.totalRevenue + (newBooking.amount || newBooking.totalAmount || 0),
        }));
      }

      // Show small toast notification
      showToast({
        type: "new_booking",
        title: "🔔 New Booking Received",
        message: `Booking #${newBooking.bookingId || newBooking.id} received from ${newBooking.customerName || "Customer"} for ${newBooking.timeSlot || newBooking.time || "Selected Time"}.`,
        booking: newBooking,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    });

    // Real-Time Event: Booking Updated
    const unsubUpdated = socketService.onBookingUpdated((payload) => {
      const updated = payload?.booking;
      if (!updated) return;

      console.log("⚡ [Real-Time] Booking Updated Event received:", updated);

      setBookings((prev) =>
        prev.map((b) =>
          b.bookingId === updated.bookingId || b.id === updated.id ? { ...b, ...updated } : b
        )
      );

      if (payload.stats) {
        setStats(payload.stats);
      }

      showToast({
        type: "booking_updated",
        title: "⚡ Booking Status Updated",
        message: `Booking #${updated.bookingId || updated.id} status changed to ${updated.status}.`,
        booking: updated,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    });

    // Real-Time Event: Booking Cancelled
    const unsubCancelled = socketService.onBookingCancelled((payload) => {
      const cancelled = payload?.booking;
      if (!cancelled) return;

      console.log("⚡ [Real-Time] Booking Cancelled Event received:", cancelled);

      setBookings((prev) =>
        prev.map((b) =>
          b.bookingId === cancelled.bookingId || b.id === cancelled.id
            ? { ...b, ...cancelled, status: "CANCELLED", paymentStatus: "REFUNDED" }
            : b
        )
      );

      if (payload.stats) {
        setStats(payload.stats);
      }

      showToast({
        type: "booking_cancelled",
        title: "⚠️ Booking Cancelled",
        message: `Booking #${cancelled.bookingId || cancelled.id} was cancelled. Slot capacity released.`,
        booking: cancelled,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    });

    // Real-Time Event: Booking Completed
    const unsubCompleted = socketService.onBookingCompleted((payload) => {
      const completed = payload?.booking;
      if (!completed) return;

      setBookings((prev) =>
        prev.map((b) =>
          b.bookingId === completed.bookingId || b.id === completed.id
            ? { ...b, ...completed, status: "COMPLETED" }
            : b
        )
      );

      if (payload.stats) {
        setStats(payload.stats);
      }

      showToast({
        type: "booking_completed",
        title: "✅ Charging Session Completed",
        message: `Booking #${completed.bookingId || completed.id} marked as completed.`,
        booking: completed,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    });

    // Real-Time Event: Dashboard Stats Updated
    const unsubStats = socketService.onStatsUpdated((payload) => {
      if (payload?.stats) {
        setStats(payload.stats);
      }
    });

    return () => {
      unsubStatus();
      unsubCreated();
      unsubUpdated();
      unsubCancelled();
      unsubCompleted();
      unsubStats();
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [loadInitialData, showToast]);

  // Update status handler (calls backend API, backend broadcasts to all connected owners)
  const updateStatus = async (bookingId, newStatus) => {
    try {
      const res = await bookingService.updateBookingStatus(bookingId, newStatus);
      if (res?.success) {
        if (res.booking) {
          setBookings((prev) =>
            prev.map((b) =>
              b.bookingId === res.booking.bookingId || b.id === res.booking.id
                ? { ...b, ...res.booking }
                : b
            )
          );
        }
        if (res.stats) {
          setStats(res.stats);
        }
        return { success: true, message: res.message || "Status updated" };
      }
      return { success: false, message: res?.message || "Failed to update status" };
    } catch (err) {
      return { success: false, message: err.message || "Network error" };
    }
  };

  // Cancel booking handler
  const cancelBooking = async (bookingId) => {
    try {
      const res = await bookingService.cancelBooking(bookingId);
      if (res?.success) {
        setBookings((prev) =>
          prev.map((b) =>
            b.bookingId === bookingId || b.id === bookingId
              ? { ...b, status: "CANCELLED", paymentStatus: "REFUNDED" }
              : b
          )
        );
        return { success: true, message: res.message || "Booking cancelled" };
      }
      return { success: false, message: res?.message || "Failed to cancel booking" };
    } catch (err) {
      return { success: false, message: err.message || "Network error" };
    }
  };

  // Create Offline / Walk-in Booking
  const createOfflineBooking = async (payload) => {
    try {
      const res = await bookingService.createOfflineBooking(payload);
      if (res?.success) {
        if (res.booking || res.data) {
          const newB = res.booking || res.data;
          setBookings((prev) => [newB, ...prev.filter((b) => b.bookingId !== newB.bookingId)]);
        }
        if (res.stats) {
          setStats(res.stats);
        }
        return { success: true, booking: res.booking || res.data, message: res.message };
      }
      return { success: false, message: res?.message || "Failed to create booking" };
    } catch (err) {
      return { success: false, message: err.message || "Network error" };
    }
  };

  return {
    bookings,
    stats,
    loading,
    connectionStatus,
    isLive: connectionStatus === "connected",
    recentToast,
    dismissToast,
    newBookingIds,
    refreshBookings: loadInitialData,
    updateStatus,
    cancelBooking,
    createOfflineBooking,
  };
}

export default useRealtimeBookings;
