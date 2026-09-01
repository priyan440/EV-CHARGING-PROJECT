import { createContext, useContext, useState, useEffect } from "react";
import {
  getStations,
  saveStation,
  getBookings,
  saveBooking,
  updateBooking,
  getPayments,
  savePayment,
  getStationOwners,
  getCustomers,
  getAuditLogs,
  saveAuditLog,
} from "../utils/storage";
import { getNextBookingId, getNextPaymentId, getNextInvoiceId, getNextStationId, getNextChargerId } from "../utils/idGenerator";
import { apiService } from "../services/apiService";

const SystemStateContext = createContext();

export function SystemStateProvider({ children }) {
  const [stations, setStations] = useState(() => getStations());
  const [bookings, setBookings] = useState(() => getBookings());
  const [payments, setPayments] = useState(() => getPayments());
  const [owners, setOwners] = useState(() => getStationOwners());
  const [customers, setCustomers] = useState(() => getCustomers());
  const [auditLogs, setAuditLogs] = useState(() => getAuditLogs());

  // Customer Wallet State
  const [wallet, setWallet] = useState(() => {
    const saved = localStorage.getItem("ev_wallet");
    return saved
      ? JSON.parse(saved)
      : {
          balance: 850,
          transactions: [
            { id: "TXN_W01", type: "CREDIT", amount: 1000, description: "Initial Wallet Top-Up", date: new Date(Date.now() - 86400000 * 3).toISOString() },
            { id: "TXN_W02", type: "DEBIT", amount: 150, description: "Payment for Booking BK000002", date: new Date(Date.now() - 86400000).toISOString() },
          ],
        };
  });

  // Loyalty Points State
  const [loyaltyPoints, setLoyaltyPoints] = useState(() => {
    const saved = localStorage.getItem("ev_loyalty_points");
    return saved ? parseInt(saved, 10) : 340;
  });

  // Coupons State
  const [coupons, setCoupons] = useState([
    { code: "EVFIRST50", discountType: "FLAT", discountValue: 50, minAmount: 200, description: "₹50 FLAT off on first EV charge booking" },
    { code: "GREEN20", discountType: "PERCENTAGE", discountValue: 20, maxDiscount: 100, minAmount: 300, description: "20% off on DC Fast Chargers" },
  ]);

  // Admin System Settings State
  const [systemSettings, setSystemSettings] = useState(() => {
    const saved = localStorage.getItem("ev_system_settings");
    return saved
      ? JSON.parse(saved)
      : {
          taxPercentage: 18,
          serviceFee: 20,
          platformCommissionPercent: 5,
          bookingHoldMinutes: 10,
          noShowGraceMinutes: 15,
          peakPricingRateMultiplier: 1.25,
          cancellationPolicy: {
            moreThan2Hours: 100,
            oneToTwoHours: 75,
            lessThan1Hour: 50,
          },
        };
  });

  // Station Owner Settlements
  const [settlements, setSettlements] = useState(() => {
    const saved = localStorage.getItem("ev_settlements");
    return saved
      ? JSON.parse(saved)
      : [
          {
            settlementId: "SET000001",
            ownerCounterId: "OWNER0001",
            ownerName: "Kumar Owners",
            grossRevenue: 82500,
            platformCommission: 4125,
            taxesDeducted: 7425,
            refundsDeducted: 1500,
            netPayout: 69450,
            status: "PAID",
            payoutDate: new Date(Date.now() - 86400000 * 5).toISOString(),
            isSimulation: true,
          },
          {
            settlementId: "SET000002",
            ownerCounterId: "OWNER0001",
            ownerName: "Kumar Owners",
            grossRevenue: 34200,
            platformCommission: 1710,
            taxesDeducted: 3078,
            refundsDeducted: 0,
            netPayout: 29412,
            status: "PENDING",
            payoutDate: new Date(Date.now() + 86400000 * 2).toISOString(),
            isSimulation: true,
          },
        ];
  });

  // Payment Disputes
  const [disputes, setDisputes] = useState(() => {
    const saved = localStorage.getItem("ev_disputes");
    return saved
      ? JSON.parse(saved)
      : [
          {
            disputeId: "DISPUTE000001",
            paymentId: "PAY000002",
            bookingId: "BK000002",
            counterId: "CUS0001",
            reason: "Double charged during network disconnect",
            status: "RESOLVED",
            adminNotes: "Refund of ₹250 issued to Customer Wallet.",
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          },
        ];
  });

  // Active Charging Sessions
  const [activeSessions, setActiveSessions] = useState(() => {
    const saved = localStorage.getItem("ev_active_sessions");
    return saved
      ? JSON.parse(saved)
      : [
          {
            sessionId: "SES000001",
            bookingId: "BK000001",
            counterId: "CUS0001",
            customerName: "Priyan",
            stationId: "STA001",
            stationName: "EV Power Hub Chennai Central",
            chargerId: "CHG0001",
            connectorType: "CCS2",
            powerKw: 60,
            vehicleNumber: "TN58AB1234",
            startTime: new Date(Date.now() - 1440000).toISOString(),
            elapsedMinutes: 24,
            batteryStart: 35,
            batteryCurrent: 67,
            batteryTarget: 90,
            energyConsumedKwh: 18.4,
            currentPowerKw: 42.7,
            currentCost: 331,
            estimatedRemainingMins: 18,
            status: "CHARGING",
            isSimulationMode: true,
          },
        ];
  });

  // Maintenance Tickets
  const [maintenanceTickets, setMaintenanceTickets] = useState(() => {
    const saved = localStorage.getItem("ev_maintenance");
    return saved
      ? JSON.parse(saved)
      : [
          {
            ticketId: "MT000001",
            stationId: "STA005",
            stationName: "GreenCharge Highway Station OMR",
            chargerId: "CHG0013",
            ownerCounterId: "OWNER0001",
            problem: "Connector Latch Damage & Power Fluctuation",
            priority: "High",
            status: "In Progress",
            assignedTechnician: "Vijay Technician (TECH0001)",
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          },
        ];
  });

  // Complaints
  const [complaints, setComplaints] = useState(() => {
    const saved = localStorage.getItem("ev_complaints");
    return saved
      ? JSON.parse(saved)
      : [
          {
            complaintId: "CMP000001",
            counterId: "CUS0001",
            customerName: "Priyan",
            category: "Charger Problem",
            stationId: "STA001",
            stationName: "EV Power Hub Chennai Central",
            description: "Charger CHG0003 connector cable had a loose lock.",
            status: "In Review",
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
        ];
  });

  // Reviews
  const [reviews, setReviews] = useState(() => {
    const saved = localStorage.getItem("ev_reviews");
    return saved
      ? JSON.parse(saved)
      : [
          {
            reviewId: "REV001",
            stationId: "STA001",
            counterId: "CUS0001",
            customerName: "Priyan",
            rating: 5,
            comment: "Excellent high-speed 150 kW CCS2 charging! Clean coffee lounge.",
            date: new Date(Date.now() - 86400000 * 3).toISOString(),
          },
        ];
  });

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem("ev_wallet", JSON.stringify(wallet));
  }, [wallet]);

  useEffect(() => {
    localStorage.setItem("ev_loyalty_points", loyaltyPoints.toString());
  }, [loyaltyPoints]);

  useEffect(() => {
    localStorage.setItem("ev_system_settings", JSON.stringify(systemSettings));
  }, [systemSettings]);

  useEffect(() => {
    localStorage.setItem("ev_settlements", JSON.stringify(settlements));
  }, [settlements]);

  useEffect(() => {
    localStorage.setItem("ev_disputes", JSON.stringify(disputes));
  }, [disputes]);

  useEffect(() => {
    localStorage.setItem("ev_active_sessions", JSON.stringify(activeSessions));
  }, [activeSessions]);

  useEffect(() => {
    localStorage.setItem("ev_maintenance", JSON.stringify(maintenanceTickets));
  }, [maintenanceTickets]);

  useEffect(() => {
    localStorage.setItem("ev_complaints", JSON.stringify(complaints));
  }, [complaints]);

  useEffect(() => {
    localStorage.setItem("ev_reviews", JSON.stringify(reviews));
  }, [reviews]);

  /**
   * Wallet Operations
   */
  const topUpWallet = (amount) => {
    const addAmt = parseFloat(amount);
    if (isNaN(addAmt) || addAmt <= 0) return;
    const newTxn = {
      id: `TXN_W_${Date.now()}`,
      type: "CREDIT",
      amount: addAmt,
      description: "Wallet Top-Up (Razorpay Test Mode)",
      date: new Date().toISOString(),
    };
    setWallet((prev) => ({
      balance: prev.balance + addAmt,
      transactions: [newTxn, ...prev.transactions],
    }));
  };

  const deductWallet = (amount, description) => {
    const dedAmt = parseFloat(amount);
    if (wallet.balance < dedAmt) return false;
    const newTxn = {
      id: `TXN_W_${Date.now()}`,
      type: "DEBIT",
      amount: dedAmt,
      description: description || "Payment for Booking",
      date: new Date().toISOString(),
    };
    setWallet((prev) => ({
      balance: prev.balance - dedAmt,
      transactions: [newTxn, ...prev.transactions],
    }));
    return true;
  };

  /**
   * Station Operations
   */
  const addStation = (stationData, ownerCounterId) => {
    const newStationId = getNextStationId();
    const newStation = {
      id: newStationId,
      ownerCounterId: ownerCounterId || "OWNER0001",
      name: stationData.name,
      address: stationData.address,
      city: stationData.city,
      state: stationData.state || "Tamil Nadu",
      pincode: stationData.pincode,
      latitude: parseFloat(stationData.latitude) || 13.0827,
      longitude: parseFloat(stationData.longitude) || 80.2707,
      contactNumber: stationData.contactNumber,
      openingHours: stationData.openingHours || "24/7 Open",
      status: "Pending Approval",
      operationalStatus: "Available",
      rating: 5.0,
      image: stationData.image || "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=600&q=80",
      amenities: stationData.amenities || ["Free WiFi", "Restroom", "Cafe"],
      chargers: stationData.chargers || [],
      peakRate: 22,
      offPeakRate: 14,
    };

    saveStation(newStation);
    setStations(getStations());
    saveAuditLog({
      user: ownerCounterId || "OWNER0001",
      role: "STATION_OWNER",
      action: "STATION_CREATED",
      description: `Created new station ${newStationId} (${newStation.name}). Pending Admin Approval.`,
    });
    setAuditLogs(getAuditLogs());
    return newStation;
  };

  const updateStationStatus = (stationId, status, adminUser = "ADM0001") => {
    const current = getStations();
    const updated = current.map((s) => (s.id === stationId ? { ...s, status } : s));
    localStorage.setItem("ev_stations", JSON.stringify(updated));
    setStations(updated);
    saveAuditLog({
      user: adminUser,
      role: "ADMIN",
      action: "STATION_STATUS_CHANGED",
      description: `Updated status of station ${stationId} to ${status}.`,
    });
    setAuditLogs(getAuditLogs());
  };

  /**
   * Charger Operations
   */
  const addChargerToStation = (stationId, chargerData) => {
    const newChargerId = getNextChargerId();
    const newCharger = {
      id: newChargerId,
      connector: chargerData.connector || "CCS2",
      powerKw: parseFloat(chargerData.powerKw) || 60,
      pricePerKwh: parseFloat(chargerData.pricePerKwh) || 18,
      status: "Available",
    };

    const current = getStations();
    const updated = current.map((s) => {
      if (s.id === stationId) {
        return {
          ...s,
          chargers: [...(s.chargers || []), newCharger],
        };
      }
      return s;
    });

    localStorage.setItem("ev_stations", JSON.stringify(updated));
    setStations(updated);
    return newCharger;
  };

  const toggleChargerStatus = (stationId, chargerId, newStatus) => {
    const current = getStations();
    const updated = current.map((s) => {
      if (s.id === stationId) {
        return {
          ...s,
          chargers: (s.chargers || []).map((ch) =>
            ch.id === chargerId ? { ...ch, status: newStatus } : ch
          ),
        };
      }
      return s;
    });
    localStorage.setItem("ev_stations", JSON.stringify(updated));
    setStations(updated);
  };

  /**
   * Booking Operations (Holds, Payments & Confirmations)
   */
  const createBookingHold = (bookingData) => {
    const newBookingId = getNextBookingId();
    const newInvoiceId = getNextInvoiceId();
    const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const newBooking = {
      bookingId: newBookingId,
      invoiceId: newInvoiceId,
      counterId: bookingData.counterId || "CUS0001",
      customerName: bookingData.customerName || "Priyan",
      stationId: bookingData.stationId,
      stationName: bookingData.stationName,
      chargerId: bookingData.chargerId || "CHG0001",
      connectorType: bookingData.connectorType || "CCS2",
      vehicleNumber: bookingData.vehicleNumber || "TN58AB1234",
      vehicleModel: bookingData.vehicleModel || "Tata Nexon EV",
      date: bookingData.date,
      time: bookingData.time,
      duration: bookingData.duration || "45 min",
      currentBattery: bookingData.currentBattery || 30,
      targetBattery: bookingData.targetBattery || 85,
      estimatedKwh: bookingData.estimatedKwh || 18.5,
      chargingCost: bookingData.chargingCost || 333,
      serviceFee: bookingData.serviceFee || 20,
      tax: bookingData.tax || 63,
      discountAmount: bookingData.discountAmount || 0,
      totalAmount: bookingData.totalAmount || 416,
      status: "PAYMENT_PENDING",
      paymentStatus: "PENDING",
      paymentMethod: bookingData.paymentMethod || "Razorpay Test Mode",
      reservationExpiresAt: holdExpiresAt,
      qrToken: `QR_TOK_${Date.now()}_${newBookingId}`,
      createdAt: new Date().toISOString(),
    };

    saveBooking(newBooking);
    setBookings(getBookings());
    return newBooking;
  };

  const confirmBookingPayment = (bookingId, razorpayPaymentId, razorpayOrderId, signature) => {
    const newPaymentId = getNextPaymentId();
    const currentBookings = getBookings();
    const targetBooking = currentBookings.find((b) => b.bookingId === bookingId);

    const updatedBookings = currentBookings.map((b) =>
      b.bookingId === bookingId
        ? { ...b, status: "CONFIRMED", paymentStatus: "Paid" }
        : b
    );
    localStorage.setItem("ev_bookings", JSON.stringify(updatedBookings));
    setBookings(updatedBookings);

    // Save Payment Record with Granular State CAPTURED
    const newPayment = {
      paymentId: newPaymentId,
      bookingId,
      counterId: targetBooking ? targetBooking.counterId : "CUS0001",
      invoiceId: targetBooking ? targetBooking.invoiceId : getNextInvoiceId(),
      customerName: targetBooking ? targetBooking.customerName : "Priyan",
      stationName: targetBooking ? targetBooking.stationName : "EV Power Hub",
      amount: targetBooking ? targetBooking.totalAmount : 416,
      platformFee: 20.0,
      ownerAmount: parseFloat(((targetBooking ? targetBooking.totalAmount : 416) - 20).toFixed(2)),
      paymentMethod: "Razorpay Standard Checkout",
      transactionId: razorpayPaymentId || `pay_test_${Date.now()}`,
      razorpayOrderId: razorpayOrderId || `order_test_${Date.now()}`,
      razorpayPaymentId: razorpayPaymentId || `pay_test_${Date.now()}`,
      status: "CAPTURED",
      date: new Date().toISOString(),
    };
    savePayment(newPayment);
    setPayments(getPayments());

    // Earn Loyalty Points (10 points per ₹100 spent)
    const pointsEarned = Math.floor((targetBooking ? targetBooking.totalAmount : 400) / 10);
    setLoyaltyPoints((prev) => prev + pointsEarned);

    // Save Audit Log
    saveAuditLog({
      user: targetBooking ? targetBooking.counterId : "CUS0001",
      role: "CUSTOMER",
      action: "PAYMENT_CAPTURED",
      description: `Razorpay payment verified for ${bookingId}. Amount: ₹${newPayment.amount}. Status: CAPTURED.`,
    });
    setAuditLogs(getAuditLogs());

    return newPayment;
  };

  const cancelBooking = async (bookingId, reason = "Customer cancelled booking") => {
    const res = await apiService.requestRefund({ bookingId, reason });
    
    const currentBookings = getBookings();
    const updated = currentBookings.map((b) =>
      b.bookingId === bookingId
        ? { ...b, status: "CANCELLED", paymentStatus: "REFUNDED" }
        : b
    );
    localStorage.setItem("ev_bookings", JSON.stringify(updated));
    setBookings(updated);

    // Add Refund Log
    const refundId = res?.refundId || `RFD${Date.now().toString().slice(-6)}`;
    saveAuditLog({
      user: "CUS0001",
      role: "CUSTOMER",
      action: "BOOKING_CANCELLED_REFUNDED",
      description: `Booking ${bookingId} cancelled. Refund ${refundId} issued. Reason: ${reason}`,
    });
    setAuditLogs(getAuditLogs());
    return res;
  };

  const checkInBooking = (bookingId) => {
    const current = getBookings();
    const updated = current.map((b) =>
      b.bookingId === bookingId
        ? { ...b, status: "CHECKED_IN", checkedInAt: new Date().toISOString() }
        : b
    );
    localStorage.setItem("ev_bookings", JSON.stringify(updated));
    setBookings(updated);

    saveAuditLog({
      user: "CUS0001",
      role: "CUSTOMER",
      action: "QR_CHECK_IN_SUCCESS",
      description: `Checked in successfully at station for booking ${bookingId}.`,
    });
    setAuditLogs(getAuditLogs());
  };

  /**
   * Station Owner Approval
   */
  const updateOwnerStatus = (ownerCounterId, status) => {
    const current = getStationOwners();
    const updated = current.map((o) => (o.counterId === ownerCounterId ? { ...o, status } : o));
    localStorage.setItem("ev_station_owners", JSON.stringify(updated));
    setOwners(updated);
    saveAuditLog({
      user: "ADM0001",
      role: "ADMIN",
      action: "OWNER_STATUS_CHANGED",
      description: `Updated status of Station Owner ${ownerCounterId} to ${status}.`,
    });
    setAuditLogs(getAuditLogs());
  };

  /**
   * Maintenance Operations
   */
  const addMaintenanceTicket = (ticketData) => {
    const newTicketId = `MT${Date.now().toString().slice(-6)}`;
    const newTicket = {
      ticketId: newTicketId,
      createdAt: new Date().toISOString(),
      status: "Open",
      assignedTechnician: "Vijay Technician (TECH0001)",
      ...ticketData,
    };
    setMaintenanceTickets((prev) => [newTicket, ...prev]);
    return newTicket;
  };

  /**
   * Complaint Operations
   */
  const addComplaint = (complaintData) => {
    const newId = `CMP${Date.now().toString().slice(-6)}`;
    const newComplaint = {
      complaintId: newId,
      createdAt: new Date().toISOString(),
      status: "Open",
      ...complaintData,
    };
    setComplaints((prev) => [newComplaint, ...prev]);
    return newComplaint;
  };

  /**
   * Review Operations
   */
  const addReview = (reviewData) => {
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
