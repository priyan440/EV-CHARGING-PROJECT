import { createContext, useContext, useState, useEffect } from "react";
import { stationService } from "../services/stationService";
import { bookingService } from "../services/bookingService";
import { paymentService } from "../services/paymentService";
import { complaintService } from "../services/complaintService";
import { walletService } from "../services/walletService";
import { apiService } from "../services/apiService";

const SystemStateContext = createContext();

export function SystemStateProvider({ children }) {
  const [stations, setStations] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [owners, setOwners] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);

  // Customer Wallet State
  const [wallet, setWallet] = useState({
    balance: 850,
    transactions: [],
  });

  // Loyalty Points State
  const [loyaltyPoints, setLoyaltyPoints] = useState(340);

  // Promotional Coupons
  const [coupons, setCoupons] = useState([
    { code: "EVFIRST50", discountType: "FLAT", discountValue: 50, minAmount: 200, description: "₹50 FLAT off on EV charge booking", active: true },
    { code: "GREEN20", discountType: "PERCENTAGE", discountValue: 20, maxDiscount: 100, minAmount: 300, description: "20% off on DC Fast Chargers", active: true },
  ]);

  // System Settings
  const [systemSettings, setSystemSettings] = useState({
    taxPercentage: 18,
    serviceFee: 20,
    platformCommissionPercent: 5,
    bookingHoldMinutes: 10,
    noShowGraceMinutes: 15,
    peakPricingRateMultiplier: 1.25,
  });

  const [settlements, setSettlements] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [maintenanceTickets, setMaintenanceTickets] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [reviews, setReviews] = useState([]);

  // Real-time synchronization with MySQL Backend
  const refreshAllState = async () => {
    const token = localStorage.getItem("ev_token");
    if (!token) {
      setStations([]);
      setBookings([]);
      setPayments([]);
      setOwners([]);
      setCustomers([]);
      setAuditLogs([]);
      setActiveSessions([]);
      return;
    }

    try {
      const [stRes, bkRes, pmRes, cpRes, wlRes] = await Promise.allSettled([
        stationService.getStations(),
        bookingService.getBookings(),
        paymentService.getPayments(),
        complaintService.getComplaints(),
        walletService.getWallet(),
      ]);

      if (stRes.status === "fulfilled" && stRes.value?.success) {
        setStations(Array.isArray(stRes.value.data) ? stRes.value.data : []);
      }
      if (bkRes.status === "fulfilled" && bkRes.value?.success) {
        setBookings(Array.isArray(bkRes.value.data) ? bkRes.value.data : []);
      }
      if (pmRes.status === "fulfilled" && pmRes.value?.success) {
        setPayments(Array.isArray(pmRes.value.data) ? pmRes.value.data : []);
      }
      if (cpRes.status === "fulfilled") {
        setComplaints(Array.isArray(cpRes.value) ? cpRes.value : (Array.isArray(cpRes.value?.data) ? cpRes.value.data : []));
      }
      if (wlRes.status === "fulfilled" && wlRes.value?.success && wlRes.value?.data) {
        setWallet({
          balance: parseFloat(wlRes.value.data.balance) || 0,
          transactions: Array.isArray(wlRes.value.data.transactions) ? wlRes.value.data.transactions : [],
        });
      }
    } catch (err) {
      console.warn("Could not sync with MySQL backend:", err.message);
    }
  };

  useEffect(() => {
    refreshAllState();
  }, []);

  /**
   * Wallet Operations (Backed by MySQL database)
   */
  const topUpWallet = async (amount) => {
    const addAmt = parseFloat(amount);
    if (isNaN(addAmt) || addAmt <= 0) return;
    try {
      const res = await walletService.topUpWallet(addAmt);
      if (res?.success && res.data) {
        setWallet((prev) => ({
          balance: res.data.balance,
          transactions: [res.data.transaction, ...(prev.transactions || [])],
        }));
        await refreshAllState();
        return res;
      }
    } catch (err) {
      console.error("topUpWallet error:", err);
    }
  };

  const deductWallet = async (amount, description, bookingId, stationId) => {
    const dedAmt = parseFloat(amount);
    if (wallet.balance < dedAmt) return false;
    try {
      const res = await walletService.payWithWallet({
        bookingId,
        amount: dedAmt,
        stationId,
      });
      if (res?.success) {
        await refreshAllState();
        return res;
      }
      return false;
    } catch (err) {
      console.error("deductWallet error:", err);
      return false;
    }
  };

  /**
   * Station Operations
   */
  const addStation = async (stationData) => {
    try {
      const res = await stationService.createStation(stationData);
      if (res?.success) {
        await refreshAllState();
      }
      return res?.data;
    } catch (err) {
      console.error("addStation error:", err);
      throw err;
    }
  };

  const updateStationStatus = async (stationId, status) => {
    try {
      await apiService.updateStationStatus(stationId, status);
      await refreshAllState();
    } catch (err) {
      console.error("updateStationStatus error:", err);
    }
  };

  const addChargerToStation = async (stationId, chargerData) => {
    try {
      const res = await apiService.addCharger(stationId, chargerData);
      await refreshAllState();
      return res?.data;
    } catch (err) {
      console.error("addChargerToStation error:", err);
      throw err;
    }
  };

  const toggleChargerStatus = async (stationId, chargerId, newStatus) => {
    try {
      await apiService.updateChargerStatus(chargerId, newStatus);
      await refreshAllState();
    } catch (err) {
      console.error("toggleChargerStatus error:", err);
    }
  };

  /**
   * Booking Operations (Pure MySQL Flow)
   */
  const createBookingHold = async (bookingData) => {
    try {
      const res = await bookingService.createBooking(bookingData);
      if (res?.success && res.data) {
        setBookings((prev) => [res.data, ...prev.filter((b) => b.bookingId !== res.data.bookingId)]);
        return res.data;
      }
      throw new Error(res?.message || "Failed to create booking on backend.");
    } catch (err) {
      console.error("createBookingHold error:", err);
      throw err;
    }
  };

  const confirmBookingPayment = async (bookingId, razorpayPaymentId, razorpayOrderId, signature, amount) => {
    try {
      const res = await paymentService.verifyPayment({
        bookingId,
        razorpayPaymentId,
        razorpayOrderId,
        razorpaySignature: signature,
        amount,
      });
      await refreshAllState();
      return res;
    } catch (err) {
      console.error("confirmBookingPayment error:", err);
      throw err;
    }
  };

  const cancelBooking = async (bookingId, reason = "Customer cancelled booking") => {
    try {
      const res = await bookingService.cancelBooking(bookingId);
      await refreshAllState();
      return res;
    } catch (err) {
      console.error("cancelBooking error:", err);
      throw err;
    }
  };

  const checkInBooking = async (bookingId) => {
    try {
      const res = await bookingService.updateBookingStatus(bookingId, "CHECKED_IN");
      await refreshAllState();
      return res;
    } catch (err) {
      console.error("checkInBooking error:", err);
      throw err;
    }
  };

  const updateOwnerStatus = async (ownerId, status) => {
    try {
      await apiService.updateOwnerStatus(ownerId, status);
      await refreshAllState();
    } catch (err) {
      console.error("updateOwnerStatus error:", err);
    }
  };

  const addMaintenanceTicket = async (ticketData) => {
    const newTicketId = `MT${Date.now().toString().slice(-6)}`;
    const newTicket = {
      ticketId: newTicketId,
      createdAt: new Date().toISOString(),
      status: "Open",
      assignedTechnician: "Field Technician",
      ...ticketData,
    };
    setMaintenanceTickets((prev) => [newTicket, ...prev]);
    return newTicket;
  };

  const addComplaint = async (complaintData) => {
    try {
      const res = await complaintService.createComplaint({
        subject: complaintData.category || complaintData.subject || "Station Issue",
        category: complaintData.category || "General",
        description: complaintData.description || complaintData.message || "",
        stationId: complaintData.stationId || null,
        bookingId: complaintData.bookingId || null,
        priority: complaintData.priority || "MEDIUM",
      });
      await refreshAllState();
      return res?.data || res;
    } catch (err) {
      console.error("addComplaint error:", err);
      throw err;
    }
  };

  const updateFeedbackStatus = async (complaintId, status) => {
    try {
      await complaintService.updateComplaint(complaintId, {
        status: status === "Resolved" ? "RESOLVED" : status,
        resolution: "Updated by Admin/Staff",
      });
      await refreshAllState();
    } catch (err) {
      console.error("updateFeedbackStatus error:", err);
    }
  };

  const addReview = async (reviewData) => {
    const newReview = {
      reviewId: `REV${Date.now()}`,
      date: new Date().toISOString(),
      ...reviewData,
    };
    setReviews((prev) => [newReview, ...prev]);
  };

  return (
    <SystemStateContext.Provider
      value={{
        stations,
        bookings,
        payments,
        owners,
        customers,
        auditLogs,
        wallet,
        loyaltyPoints,
        coupons,
        systemSettings,
        settlements,
        disputes,
        activeSessions,
        maintenanceTickets,
        complaints,
        reviews,
        refreshAllState,
        topUpWallet,
        deductWallet,
        addStation,
        updateStationStatus,
        addChargerToStation,
        toggleChargerStatus,
        createBookingHold,
        confirmBookingPayment,
        cancelBooking,
        checkInBooking,
        updateOwnerStatus,
        addMaintenanceTicket,
        addComplaint,
        updateFeedbackStatus,
        addReview,
        setActiveSessions,
        setSystemSettings,
        setDisputes,
      }}
    >
      {children}
    </SystemStateContext.Provider>
  );
}

export function useSystemState() {
  return useContext(SystemStateContext);
}
