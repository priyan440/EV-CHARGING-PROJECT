import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  Zap,
  MapPin,
  Car,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Lock,
  Plus,
  Info,
  Check,
  BatteryCharging,
  QrCode,
  Gauge,
  Navigation,
  FileText,
  Wallet,
  X,
  ChevronLeft,
  ChevronRight,
  Phone,
  Coffee,
  Wifi,
  Users,
  Compass,
  CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { useLocation as useGeoLocation } from "../contexts/LocationContext";
import { stationService } from "../services/stationService";
import { vehicleService } from "../services/vehicleService";
import { bookingService } from "../services/bookingService";
import { paymentService } from "../services/paymentService";
import { walletService } from "../services/walletService";
import { socketService } from "../services/socketService";
import { calculateChargingPrice } from "../services/pricingService";
import Toast from "../components/Toast";
import RazorpayCheckoutModal from "../components/RazorpayCheckoutModal";

// 12-hour AM/PM time formatter
const formatTime12h = (timeStr) => {
  if (!timeStr) return "";
  const parts = String(timeStr).split(":");
  let h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  h = h ? h : 12;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
};

// Add minutes to HH:MM string and return HH:MM
const addMinutesToTime = (timeStr, minutesToAdd) => {
  if (!timeStr) return "10:20";
  const parts = String(timeStr).split(":");
  const h = parseInt(parts[0], 10) || 10;
  const m = parseInt(parts[1], 10) || 0;
  const totalMins = h * 60 + m + Math.round(minutesToAdd);
  const endH = Math.floor(totalMins / 60) % 24;
  const endM = totalMins % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
};

// Helper for local YYYY-MM-DD
const getLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Format Date for Display e.g. "Today, 23 Apr 2025"
const formatDateDisplay = (dateStr) => {
  if (!dateStr) return "Today";
  const todayStr = getLocalDateStr(new Date());
  const d = new Date(dateStr + "T00:00:00");
  const formatted = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  if (dateStr === todayStr) {
    return `Today, ${formatted}`;
  }
  return formatted;
};

export default function BookSlot() {
  const navigate = useNavigate();
  const routeParams = useParams();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { getDistanceToStation } = useGeoLocation();

  // Read stationId from route param (:stationId) or URL query (?stationId=...)
  const initialStationId = routeParams.stationId || searchParams.get("stationId") || "";

  // Core Data State
  const [stations, setStations] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [toast, setToast] = useState({ message: "", type: "success" });

  // 1. Vehicle Details State
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [currentBatteryPercent, setCurrentBatteryPercent] = useState(30);
  const [targetBatteryPercent, setTargetBatteryPercent] = useState(80);

  // 2. Station & Date State
  const [selectedStationId, setSelectedStationId] = useState(initialStationId);
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateStr(new Date()));
  const [chargerFilter, setChargerFilter] = useState("ALL"); // ALL, AVAILABLE, DC_FAST, AC

  // 3. Charger & Dynamic Slot State
  const [timelineData, setTimelineData] = useState(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [selectedChargerId, setSelectedChargerId] = useState(null);
  const [selectedSlotTime, setSelectedSlotTime] = useState("10:00");

  // Step Workflow for Routing Type Execution (Step 1: Selection, Step 2: Summary Review, Step 3: Payment Checkout, Step 4: Confirmation Success)
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(1);

  // Payment & Confirmation State
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("RAZORPAY"); // RAZORPAY or WALLET
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isProcessingWallet, setIsProcessingWallet] = useState(false);

  // Fetch Wallet Balance
  const fetchWallet = useCallback(async () => {
    try {
      const res = await walletService.getWallet();
      if (res?.success && res.data) {
        setWalletBalance(parseFloat(res.data.balance || 0));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  // Initial Fetch: Vehicles & Approved Stations
  useEffect(() => {
    Promise.all([
      stationService.getApprovedStations().catch(() => ({ data: [] })),
      vehicleService.fetchVehicles().catch(() => []),
    ]).then(([stnsRes, vehs]) => {
      const stnList = stnsRes?.data && Array.isArray(stnsRes.data) ? stnsRes.data : [];
      setStations(stnList);

      const vehList = Array.isArray(vehs) ? vehs : [];
      setVehicles(vehList);

      if (vehList.length > 0) {
        setSelectedVehicleId(vehList[0].id);
        const vSoc = vehList[0].current_soc_percent ?? vehList[0].batteryPercentage ?? 30;
        setCurrentBatteryPercent(Math.min(95, Math.max(5, parseInt(vSoc, 10) || 30)));
      }

      if (initialStationId) {
        setSelectedStationId(initialStationId);
      } else if (stnList.length > 0) {
        setSelectedStationId(stnList[0].id);
      }

      setLoadingInitial(false);
    });
  }, [initialStationId]);

  // Active Selected Vehicle
  const activeVehicle = useMemo(() => {
    return vehicles.find((v) => String(v.id) === String(selectedVehicleId)) || vehicles[0] || {
      brand: "Tesla",
      model: "Model 3",
      battery_capacity: 60,
      battery_capacity_kwh: 60,
      connector_type: "CCS2",
    };
  }, [vehicles, selectedVehicleId]);

  // Active Selected Station
  const activeStation = useMemo(() => {
    return stations.find((s) => String(s.id) === String(selectedStationId)) || stations[0] || {
      id: 1,
      station_name: "EV Station - Coimbatore",
      address: "Avinashi Road, Coimbatore, TN - 641014",
      contact_number: "+91 98765 43210",
      opening_time: "Open 24 Hours",
      pricePerKwh: 8.0,
      energy_tariff_per_kwh: 8.0,
      rating: 4.5,
      reviewCount: 120,
      amenities: "Restroom,Café,WiFi,Waiting Area",
      image: "https://images.unsplash.com/photo-1558441719-573255e1b6c0?auto=format&fit=crop&w=600&q=80",
    };
  }, [stations, selectedStationId]);

  // Selected Charger (from timelineData or fallback)
  const activeCharger = useMemo(() => {
    if (!timelineData?.chargers || timelineData.chargers.length === 0) {
      return {
        id: selectedChargerId || 1,
        chargerId: "CHG000001",
        chargerName: "Charger 1",
        chargerType: "DC_FAST",
        powerKw: 150,
        ratePerKwh: activeStation?.pricePerKwh || 8.0,
      };
    }
    return timelineData.chargers.find((c) => String(c.id) === String(selectedChargerId)) || timelineData.chargers[0];
  }, [timelineData, selectedChargerId, activeStation]);

  // ====================================================
  // DYNAMIC CHARGING SLOT CALCULATION ENGINE
  // ====================================================
  const chargingCalculation = useMemo(() => {
    const batteryCapacity = parseFloat(activeVehicle?.battery_capacity_kwh || activeVehicle?.battery_capacity || 60.0);
    const curSoc = Math.max(0, Math.min(100, parseInt(currentBatteryPercent, 10) || 30));
    const tgtSoc = Math.max(curSoc + 5, Math.min(100, parseInt(targetBatteryPercent, 10) || 80));

    // 1. Required Energy = Battery Capacity × (Target SOC - Current SOC) / 100
    const socDiff = tgtSoc - curSoc;
    const batteryRequiredKwh = Math.round((batteryCapacity * (socDiff / 100)) * 10) / 10;

    // 2. Charger Power (kW)
    const chargerPowerKw = parseFloat(activeCharger?.powerKw || activeCharger?.power_kw || 150.0);

    // 3. Theoretical Charging Time (hours) = Required Energy / Charger Power -> convert to minutes
    const theoreticalHours = chargerPowerKw > 0 ? (batteryRequiredKwh / chargerPowerKw) : 0;
    const theoreticalMinutes = Math.max(1, Math.round(theoreticalHours * 60));

    // 4. Apply Realistic Charging Efficiency Factor (Default: 90% / 0.90)
    const efficiency = 0.90;
    const estimatedMinutes = Math.max(1, Math.round(theoreticalMinutes / efficiency));

    // 5. Round UP to the Nearest 5-Minute Interval
    const recommendedDurationMinutes = Math.max(5, Math.ceil(estimatedMinutes / 5) * 5);

    // 6. Safety Buffer (Configurable: 5 minutes)
    const safetyBufferMinutes = 5;

    // 7. Total Reserved Charger Duration = Recommended Duration + Safety Buffer
    const reservedDurationMinutes = recommendedDurationMinutes + safetyBufferMinutes;

    // 8. Expected Completion Time = Start Time + Reserved Duration
    const expectedCompletionTime = addMinutesToTime(selectedSlotTime, reservedDurationMinutes);

    // 9. Centralized Pricing Calculation Service
    const ratePerKwh = parseFloat(activeStation?.pricePerKwh || activeStation?.energy_tariff_per_kwh || activeCharger?.ratePerKwh || 18.0);
    const pricing = calculateChargingPrice({
      ratePerKwh,
      batteryCapacityKwh: batteryCapacity,
      currentSoc: curSoc,
      targetSoc: tgtSoc,
      energyKwh: batteryRequiredKwh,
      durationMinutes: reservedDurationMinutes,
      serviceFee: 20.0,
      taxPercent: 18.0,
      discount: 0.0,
    });

    return {
      batteryCapacity,
      currentSoc: curSoc,
      targetSoc: tgtSoc,
      socDiff,
      batteryRequiredKwh,
      chargerPowerKw,
      theoreticalMinutes,
      efficiencyPercent: 90,
      estimatedMinutes,
      recommendedDurationMinutes,
      safetyBufferMinutes,
      reservedDurationMinutes,
      startTime: selectedSlotTime,
      expectedCompletionTime,
      expectedCompletionFormatted: formatTime12h(expectedCompletionTime),
      startTimeFormatted: formatTime12h(selectedSlotTime),
      estimatedCost: pricing.totalAmount,
      totalAmount: pricing.totalAmount,
      subtotal: pricing.subtotal,
      serviceFee: pricing.serviceFee,
      tax: pricing.tax,
      taxPercent: pricing.taxPercent,
      discount: pricing.discount,
      ratePerKwh: pricing.chargingRate,
      pricing,
    };
  }, [activeVehicle, currentBatteryPercent, targetBatteryPercent, activeCharger, activeStation, selectedSlotTime]);

  // Fetch Multi-Charger Real-Time Station Timeline
  const fetchStationTimeline = useCallback(async () => {
    if (!selectedStationId) return;
    setLoadingTimeline(true);
    try {
      const res = await bookingService.getStationTimeline({
        stationId: selectedStationId,
        date: selectedDate,
        durationMinutes: chargingCalculation.reservedDurationMinutes,
      });

      if (res?.success && Array.isArray(res.chargers)) {
        setTimelineData(res);
        if (!selectedChargerId && res.chargers.length > 0) {
          const recId = res.recommendedCharger?.chargerId || res.chargers[0].id;
          setSelectedChargerId(recId);
          if (res.recommendedCharger?.earliestSlot?.startTime) {
            setSelectedSlotTime(res.recommendedCharger.earliestSlot.startTime);
          }
        }
      }
    } catch (err) {
      console.warn("Timeline fetch notice:", err.message);
    } finally {
      setLoadingTimeline(false);
    }
  }, [selectedStationId, selectedDate, chargingCalculation.reservedDurationMinutes, selectedChargerId]);

  useEffect(() => {
    fetchStationTimeline();
  }, [fetchStationTimeline]);

  // Real-Time Socket.IO Subscriptions for instant charger and booking sync
  useEffect(() => {
    const handleRealtimeUpdate = (payload) => {
      console.log("⚡ [Real-Time Socket Event Received]", payload?.event);
      fetchStationTimeline();
    };

    socketService.on("charger_status_changed", handleRealtimeUpdate);
    socketService.on("chargerAvailable", handleRealtimeUpdate);
    socketService.on("bookingCreated", handleRealtimeUpdate);
    socketService.on("booking_created", handleRealtimeUpdate);
    socketService.on("session_started", handleRealtimeUpdate);
    socketService.on("session_stopped", handleRealtimeUpdate);
    socketService.on("chargingStarted", handleRealtimeUpdate);
    socketService.on("chargingCompleted", handleRealtimeUpdate);

    return () => {
      socketService.off("charger_status_changed", handleRealtimeUpdate);
      socketService.off("chargerAvailable", handleRealtimeUpdate);
      socketService.off("bookingCreated", handleRealtimeUpdate);
      socketService.off("booking_created", handleRealtimeUpdate);
      socketService.off("session_started", handleRealtimeUpdate);
      socketService.off("session_stopped", handleRealtimeUpdate);
      socketService.off("chargingStarted", handleRealtimeUpdate);
      socketService.off("chargingCompleted", handleRealtimeUpdate);
    };
  }, [fetchStationTimeline]);

  // Date Navigation Handlers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    const today = new Date().toISOString().split("T")[0];
    const newDateStr = d.toISOString().split("T")[0];
    if (newDateStr >= today) {
      setSelectedDate(newDateStr);
    }
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  // Filter Chargers
  const filteredChargers = useMemo(() => {
    if (!timelineData?.chargers) return [];
    return timelineData.chargers.filter((c) => {
      if (chargerFilter === "AVAILABLE") return c.isAvailable;
      if (chargerFilter === "DC_FAST") return (c.chargerType || "").includes("DC") || c.powerKw >= 50;
      if (chargerFilter === "AC") return (c.chargerType || "").includes("AC") || c.powerKw < 50;
      return true;
    });
  }, [timelineData, chargerFilter]);

  // Count summaries for filter pills
  const filterCounts = useMemo(() => {
    if (!timelineData?.chargers) return { all: 0, available: 0, dc: 0, ac: 0 };
    const all = timelineData.chargers.length;
    const available = timelineData.chargers.filter((c) => c.isAvailable).length;
    const dc = timelineData.chargers.filter((c) => (c.chargerType || "").includes("DC") || c.powerKw >= 50).length;
    const ac = timelineData.chargers.filter((c) => (c.chargerType || "").includes("AC") || c.powerKw < 50).length;
    return { all, available, dc, ac };
  }, [timelineData]);

  // Dynamic Time Slot Selection on Grid
  const handleSelectSlot = (chargerId, startTimeStr) => {
    setSelectedChargerId(chargerId);
    setSelectedSlotTime(startTimeStr);
  };

  // Step 1 -> Step 2: Proceed to Summary / Confirmation Routing
  const handleProceedToSummary = async () => {
    if (!selectedChargerId || !selectedSlotTime) {
      setToast({ message: "Please select an available charger time slot to proceed.", type: "error" });
      return;
    }

    // Perform double-booking validation on backend
    try {
      const cleanStart = selectedSlotTime.length === 5 ? `${selectedSlotTime}:00` : selectedSlotTime;
      const cleanEnd = `${chargingCalculation.expectedCompletionTime}:00`;

      const checkRes = await bookingService.checkAvailability({
        station_id: activeStation.id,
        connector_id: selectedChargerId,
        charger_id: selectedChargerId,
        booking_date: selectedDate,
        start_time: cleanStart,
        end_time: cleanEnd,
        duration_minutes: chargingCalculation.reservedDurationMinutes,
      });

      if (!checkRes?.isAvailable && !checkRes?.available) {
        setToast({
          message: checkRes?.message || "Selected slot interval is already reserved. Please pick another available slot.",
          type: "error",
        });
        return;
      }

      // Transition to Step 2 (Dedicated Summary View without messy scrolling)
      setActiveWorkflowStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setToast({ message: err.message || "Error validating slot availability", type: "error" });
    }
  };

  // Step 2 -> Create Booking & Proceed to Payment Gateway
  const handleCreateBookingAndPay = async (paymentMethod = "RAZORPAY") => {
    setIsSubmitting(true);
    try {
      const cleanStart = selectedSlotTime.length === 5 ? `${selectedSlotTime}:00` : selectedSlotTime;
      const payload = {
        station_id: activeStation.id,
        stationId: activeStation.id,
        charger_id: selectedChargerId,
        chargerId: selectedChargerId,
        connector_id: selectedChargerId,
        connectorId: selectedChargerId,
        vehicle_id: activeVehicle.id,
        vehicleId: activeVehicle.id,
        booking_date: selectedDate,
        bookingDate: selectedDate,
        start_time: cleanStart,
        startTime: cleanStart,
        duration_minutes: chargingCalculation.reservedDurationMinutes,
        durationMinutes: chargingCalculation.reservedDurationMinutes,
        estimated_charging_minutes: chargingCalculation.estimatedMinutes,
        recommended_duration_minutes: chargingCalculation.recommendedDurationMinutes,
        buffer_minutes: chargingCalculation.safetyBufferMinutes,
        reserved_duration_minutes: chargingCalculation.reservedDurationMinutes,
        current_soc_percent: chargingCalculation.currentSoc,
        target_soc_percent: chargingCalculation.targetSoc,
        energy_kwh: chargingCalculation.batteryRequiredKwh,
        amount: chargingCalculation.estimatedCost,
        totalAmount: chargingCalculation.estimatedCost,
        status: "PENDING_PAYMENT",
        payment_status: "PENDING",
      };

      const res = await bookingService.createBooking(payload);
      if (!res?.success) {
        throw new Error(res?.message || "Failed to reserve charging slot.");
      }

      const bookedObj = res.data || res.booking;
      const bCode = bookedObj?.booking_id || bookedObj?.bookingId || res.bookingId || `EV${Date.now().toString().slice(-6)}`;

      const enriched = {
        ...bookedObj,
        bookingId: bCode,
        bookingCode: bCode,
        stationName: activeStation.station_name || activeStation.name,
        stationAddress: activeStation.address,
        vehicleModel: `${activeVehicle.brand || ""} ${activeVehicle.model || ""}`.trim(),
        vehicleNumber: activeVehicle.registration_number || activeVehicle.vehicleNumber || "EV 2025",
        chargerName: activeCharger.chargerName || `Charger ${selectedChargerId}`,
        powerKw: activeCharger.powerKw || 150,
        startTime: selectedSlotTime,
        endTime: chargingCalculation.expectedCompletionTime,
        date: selectedDate,
        batteryRequiredKwh: chargingCalculation.batteryRequiredKwh,
        estimatedChargingMinutes: chargingCalculation.estimatedMinutes,
        recommendedDurationMinutes: chargingCalculation.recommendedDurationMinutes,
        safetyBufferMinutes: chargingCalculation.safetyBufferMinutes,
        reservedDurationMinutes: chargingCalculation.reservedDurationMinutes,
        totalAmount: chargingCalculation.estimatedCost,
      };

      setCreatedBooking(enriched);

      if (paymentMethod === "WALLET") {
        await executeWalletPayment(enriched);
      } else {
        setShowRazorpayModal(true);
      }
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Wallet Payment Execution
  const executeWalletPayment = async (booking) => {
    setIsProcessingWallet(true);
    try {
      const bId = booking.id || booking.booking_id;
      const amount = booking.totalAmount;
      if (walletBalance < amount) {
        setToast({ message: "Insufficient EV Wallet balance. Please use Razorpay or top up your wallet.", type: "error" });
        setShowRazorpayModal(true);
        return;
      }

      const payRes = await walletService.payWithWallet({
        bookingId: bId,
        booking_id: bId,
        amount: amount,
        stationId: activeStation.id,
      });

      if (payRes?.success) {
        await fetchWallet();
        setActiveWorkflowStep(4); // Success Confirmation Step
        setToast({ message: "Payment successful via EV Wallet! Charging slot confirmed.", type: "success" });
      } else {
        throw new Error(payRes?.message || "Wallet payment failed");
      }
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setIsProcessingWallet(false);
    }
  };

  // Razorpay Payment Success Handler
  const handleRazorpaySuccess = (paymentResult) => {
    setShowRazorpayModal(false);
    fetchWallet();
    setActiveWorkflowStep(4); // Success Confirmation Step
    setToast({ message: "Payment verified successfully! Your dynamic charging slot is confirmed.", type: "success" });
  };

  if (loadingInitial) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <Zap className="w-6 h-6 text-emerald-500 absolute inset-0 m-auto animate-pulse" />
        </div>
        <p className="mt-4 text-slate-600 dark:text-slate-400 font-medium">Initializing Dynamic EV Charging Platform...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-fade-in pb-12 font-sans">
      {/* Toast Notification */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "success" })}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-1">
            <Zap className="w-4 h-4 fill-emerald-500" />
            <span>Dynamic EV Slot System</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Book Charging Slot
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/stations"
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-500" /> Find Stations
          </Link>
          <Link
            to="/my-bookings"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" /> My Bookings
          </Link>
        </div>
      </div>

      <div className="w-full">
        {/* ==================================================== */}
        {/* WORKFLOW STEP 1: DYNAMIC CHARGING SLOT SELECTION     */}
        {/* ==================================================== */}
        {activeWorkflowStep === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: 4 INTERACTIVE AUTO-CALCULATED SECTIONS (Approx 70% / 8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* 1. SELECT YOUR VEHICLE */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                    1
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Select Your Vehicle</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Vehicle Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Vehicle
                    </label>
                    <div className="relative">
                      <select
                        value={selectedVehicleId}
                        onChange={(e) => {
                          setSelectedVehicleId(e.target.value);
                          const veh = vehicles.find((v) => String(v.id) === String(e.target.value));
                          if (veh) {
                            const soc = veh.current_soc_percent ?? veh.batteryPercentage ?? 30;
                            setCurrentBatteryPercent(parseInt(soc, 10) || 30);
                          }
                        }}
                        className="w-full pl-10 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        {vehicles.length > 0 ? (
                          vehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.brand} {v.model} ({v.battery_capacity_kwh || v.battery_capacity || 60} kWh)
                            </option>
                          ))
                        ) : (
                          <option value="1">Tesla Model 3 (60 kWh)</option>
                        )}
                      </select>
                      <Car className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    </div>
                  </div>

                  {/* Current Battery % */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Current Battery (%)
                    </label>
                    <div className="relative">
                      <select
                        value={currentBatteryPercent}
                        onChange={(e) => setCurrentBatteryPercent(parseInt(e.target.value, 10))}
                        className="w-full pl-10 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        {[10, 20, 25, 30, 35, 40, 50, 60, 70].map((val) => (
                          <option key={val} value={val}>{val}%</option>
                        ))}
                      </select>
                      <BatteryCharging className="w-4 h-4 text-emerald-500 absolute left-3 top-3.5" />
                    </div>
                  </div>

                  {/* Target Battery % */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Target Battery (%)
                    </label>
                    <div className="relative">
                      <select
                        value={targetBatteryPercent}
                        onChange={(e) => setTargetBatteryPercent(parseInt(e.target.value, 10))}
                        className="w-full pl-10 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        {[50, 60, 70, 75, 80, 85, 90, 95, 100].map((val) => (
                          <option key={val} value={val} disabled={val <= currentBatteryPercent}>
                            {val}%
                          </option>
                        ))}
                      </select>
                      <Zap className="w-4 h-4 text-emerald-500 absolute left-3 top-3.5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. CHARGING CALCULATION (AUTO CALCULATED) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                    2
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Charging Calculation <span className="text-emerald-500 text-sm font-semibold">(Auto Calculated)</span>
                  </h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  {/* Battery Required */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Battery Required
                    </span>
                    <div className="flex items-center gap-2">
                      <BatteryCharging className="w-5 h-5 text-emerald-500" />
                      <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                        {chargingCalculation.batteryRequiredKwh} kWh
                      </span>
                    </div>
                  </div>

                  {/* Charger Power */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Charger Power
                    </span>
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-blue-500" />
                      <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                        {chargingCalculation.chargerPowerKw} kW <span className="text-xs font-bold text-slate-400">(DC)</span>
                      </span>
                    </div>
                  </div>

                  {/* Estimated Charging Time */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Estimated Charging Time
                    </span>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-sky-500" />
                      <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                        {chargingCalculation.estimatedMinutes} minutes
                      </span>
                    </div>
                  </div>

                  {/* Recommended Duration */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Recommended Duration
                    </span>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-emerald-500" />
                      <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                        {chargingCalculation.recommendedDurationMinutes} minutes
                      </span>
                    </div>
                  </div>

                  {/* Safety Buffer */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Safety Buffer
                    </span>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-amber-500" />
                      <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                        {chargingCalculation.safetyBufferMinutes} minutes
                      </span>
                    </div>
                  </div>

                  {/* Total Reserved Duration */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Total Reserved Duration
                    </span>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-indigo-500" />
                      <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                        {chargingCalculation.reservedDurationMinutes} minutes
                      </span>
                    </div>
                  </div>

                  {/* Expected Completion */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Expected Completion
                    </span>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                        {chargingCalculation.expectedCompletionFormatted}
                      </span>
                    </div>
                  </div>

                  {/* Estimated Cost */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Estimated Cost
                    </span>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-emerald-500" />
                      <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                        ₹ {chargingCalculation.estimatedCost}
                      </span>
                      <Info className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Charging time is calculated based on your vehicle and charger power with 90% efficiency and a 5-minute buffer.
                </p>
              </div>

              {/* 3. SELECT CHARGING STATION */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                    3
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Select Charging Station</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Station
                    </label>
                    <div className="relative">
                      <select
                        value={selectedStationId}
                        onChange={(e) => setSelectedStationId(e.target.value)}
                        className="w-full pl-10 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        {stations.map((stn) => (
                          <option key={stn.id} value={stn.id}>
                            {stn.station_name || stn.name} - {stn.city || "Tamil Nadu"}
                          </option>
                        ))}
                      </select>
                      <MapPin className="w-4 h-4 text-emerald-500 absolute left-3 top-3.5" />
                    </div>
                  </div>

                  {/* Preview Card */}
                  <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                    <img
                      src={activeStation.image || "https://images.unsplash.com/photo-1558441719-573255e1b6c0?auto=format&fit=crop&w=200&q=80"}
                      alt={activeStation.station_name}
                      className="w-16 h-14 object-cover rounded-lg shadow-sm"
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {activeStation.station_name || activeStation.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {activeStation.address || "Avinashi Road, Coimbatore, Tamil Nadu"}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-amber-500 font-semibold">
                        <span>⭐ 4.5</span>
                        <span className="text-slate-400 font-normal">(120 reviews)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. SELECT CHARGER AND AVAILABLE SLOT */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                      4
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Select Charger and Available Slot</h2>
                  </div>

                  {/* Date Selector */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 shadow-sm">
                    <Calendar className="w-4 h-4 text-slate-500 ml-1" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 px-2">
                      {formatDateDisplay(selectedDate)}
                    </span>
                    <button
                      onClick={handlePrevDay}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
                      title="Previous Day"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleNextDay}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
                      title="Next Day"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setChargerFilter("ALL")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      chargerFilter === "ALL"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    All ({filterCounts.all})
                  </button>
                  <button
                    onClick={() => setChargerFilter("AVAILABLE")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      chargerFilter === "AVAILABLE"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    Available ({filterCounts.available})
                  </button>
                  <button
                    onClick={() => setChargerFilter("DC_FAST")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      chargerFilter === "DC_FAST"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    DC Fast ({filterCounts.dc})
                  </button>
                  <button
                    onClick={() => setChargerFilter("AC")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      chargerFilter === "AC"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    AC ({filterCounts.ac})
                  </button>
                </div>

                {/* VISUAL CHARGER TIMELINE GRID */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
                  {/* Timeline Hour Headers */}
                  <div className="grid grid-cols-12 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-400 py-2.5 px-3">
                    <div className="col-span-3 text-left">Charger</div>
                    <div className="col-span-9 grid grid-cols-6 text-center">
                      <span>09:00</span>
                      <span>10:00</span>
                      <span>11:00</span>
                      <span>12:00</span>
                      <span>01:00</span>
                      <span>02:00</span>
                    </div>
                  </div>

                  {/* Charger Rows */}
                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredChargers.length > 0 ? (
                      filteredChargers.map((charger) => {
                        const isSelectedCharger = String(charger.id) === String(selectedChargerId);
                        return (
                          <div
                            key={charger.id}
                            className={`grid grid-cols-12 p-3 items-center transition-colors ${
                              isSelectedCharger ? "bg-emerald-500/5 dark:bg-emerald-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                            }`}
                          >
                            {/* Charger Identity Column */}
                            <div className="col-span-3 flex items-center gap-2.5">
                              <input
                                type="radio"
                                name="selectedCharger"
                                checked={isSelectedCharger}
                                onChange={() => setSelectedChargerId(charger.id)}
                                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                              />
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <Zap className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {charger.chargerName}
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                  {charger.chargerType} {charger.powerKw} kW • ₹{charger.ratePerKwh}/kWh
                                </div>
                              </div>
                            </div>

                            {/* Dynamic Slot Timeline Blocks */}
                            <div className="col-span-9 flex flex-wrap items-center gap-1.5 pl-2">
                              {/* Booked Intervals (Red/Pink badges) */}
                              {charger.bookedIntervals && charger.bookedIntervals.length > 0 && (
                                charger.bookedIntervals.map((b, bIdx) => (
                                  <span
                                    key={`b-${bIdx}`}
                                    className="px-2 py-1 rounded-md text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300/60 dark:border-rose-800/60 shadow-xs"
                                    title={`Booked: ${b.startTimeFormatted} - ${b.endTimeFormatted}`}
                                  >
                                    {b.startTime}-{b.endTime}
                                  </span>
                                ))
                              )}

                              {/* Dynamic Available Slots (All valid slots based on estimated duration e.g. 15 or 20 min) */}
                              <div className="flex flex-wrap items-center gap-1.5 max-h-32 overflow-y-auto pr-1">
                                {charger.availableSlots && charger.availableSlots.length > 0 ? (
                                  charger.availableSlots.map((slot, sIdx) => {
                                    const isSelectedSlot = isSelectedCharger && slot.startTime === selectedSlotTime;
                                    return (
                                      <button
                                        key={`s-${sIdx}`}
                                        type="button"
                                        onClick={() => handleSelectSlot(charger.id, slot.startTime)}
                                        className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold transition-all cursor-pointer ${
                                          isSelectedSlot
                                            ? "bg-emerald-500 text-white ring-2 ring-emerald-600 ring-offset-1 shadow-md shadow-emerald-500/30 scale-105"
                                            : "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/60 hover:bg-emerald-200 dark:hover:bg-emerald-900"
                                        }`}
                                      >
                                        {slot.startTime}-{slot.endTime}
                                      </button>
                                    );
                                  })
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">No slots available</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                        No chargers match the selected filter on this station.
                      </div>
                    )}
                  </div>
                </div>

                {/* Visual Legend */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-rose-400 inline-block"></span>
                    <span>Booked</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-slate-400 inline-block"></span>
                    <span>Charging in Progress</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-700 inline-block"></span>
                    <span>Not available</span>
                  </div>
                </div>

                {/* Golden Informational Callout Box */}
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                  <span className="font-bold">⚡ Green slots show exact available time based on estimated duration.</span> If your estimated time is 15 minutes, the system shows 15-minute slots (e.g. 10:00–10:15, 10:20–10:35, etc.).
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: STATION DETAILS & SELECTED SLOT SUMMARY (Approx 30% / 4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Station Details Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="relative h-40">
                  <img
                    src={activeStation.image || "https://images.unsplash.com/photo-1558441719-573255e1b6c0?auto=format&fit=crop&w=600&q=80"}
                    alt={activeStation.station_name}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow-md">
                    Available
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {activeStation.station_name || activeStation.name}
                  </h3>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{activeStation.address || "Avinashi Road, Coimbatore, TN - 641014"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{activeStation.contact_number || "+91 98765 43210"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{activeStation.opening_time || "Open 24 Hours"}</span>
                    </div>
                  </div>

                  {/* Amenities */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-4 gap-2 text-center text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-1 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <Users className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Restroom</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <Coffee className="w-3.5 h-3.5 text-amber-500" />
                      <span>Café</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <Wifi className="w-3.5 h-3.5 text-blue-500" />
                      <span>WiFi</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <Compass className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Waiting</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected Slot Summary Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
                  Selected Slot Summary
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 dark:text-slate-400">Charger</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {activeCharger.chargerName || `Charger ${selectedChargerId}`} (DC {activeCharger.powerKw || 150} kW)
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 dark:text-slate-400">Date</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatDateDisplay(selectedDate)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 dark:text-slate-400">Start Time</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {chargingCalculation.startTimeFormatted}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 dark:text-slate-400">Estimated Charging</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {chargingCalculation.estimatedMinutes} minutes
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 dark:text-slate-400">Recommended Duration</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {chargingCalculation.recommendedDurationMinutes} minutes
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 dark:text-slate-400">Safety Buffer</span>
                    <span className="font-bold text-amber-500">
                      {chargingCalculation.safetyBufferMinutes} minutes
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 dark:text-slate-400">Reserved Duration</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {chargingCalculation.reservedDurationMinutes} minutes
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 dark:text-slate-400">Expected End Time</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {chargingCalculation.expectedCompletionFormatted}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-sm">
                    <span className="font-bold text-slate-900 dark:text-white">Estimated Cost</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-base">
                      ₹ {chargingCalculation.estimatedCost}
                    </span>
                  </div>
                </div>

                {/* Primary Action Button */}
                <button
                  onClick={handleProceedToSummary}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
                >
                  <span>Proceed to Confirm Booking</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* View on Map Secondary Button */}
                <Link
                  to="/map"
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors text-xs"
                >
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span>View on Map</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* WORKFLOW STEP 2: SUMMARY REVIEW & CONFIRMATION       */}
        {/* ==================================================== */}
        {activeWorkflowStep === 2 && (
          <div className="max-w-3xl mx-auto space-y-6">
            <button
              onClick={() => setActiveWorkflowStep(1)}
              className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-500 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Slot Selector
            </button>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Confirm Booking Summary</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Review your dynamic charging slot parameters before initiating payment.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-500/20">
                  Dynamic Duration Optimized
                </span>
              </div>

              {/* Specs Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2 text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-wider block">Station & Charger</span>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{activeStation.station_name || activeStation.name}</div>
                  <div className="text-slate-500">{activeStation.address}</div>
                  <div className="pt-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                    {activeCharger.chargerName} • {activeCharger.powerKw} kW DC Fast Charger
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2 text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-wider block">Vehicle & Requirement</span>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {activeVehicle.brand} {activeVehicle.model} ({activeVehicle.battery_capacity_kwh || 60} kWh)
                  </div>
                  <div className="text-slate-500">Target: {chargingCalculation.currentSoc}% → {chargingCalculation.targetSoc}%</div>
                  <div className="pt-2 text-blue-600 dark:text-blue-400 font-semibold">
                    Energy Required: {chargingCalculation.batteryRequiredKwh} kWh
                  </div>
                </div>
              </div>

              {/* Dynamic Timing Card */}
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 space-y-3">
                <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  ⚡ Dynamic Slot Allocation
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Start Time</span>
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm">{chargingCalculation.startTimeFormatted}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Estimated Charging</span>
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm">{chargingCalculation.estimatedMinutes} min</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Safety Buffer</span>
                    <span className="font-extrabold text-amber-500 text-sm">{chargingCalculation.safetyBufferMinutes} min</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Expected End</span>
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm">{chargingCalculation.expectedCompletionFormatted}</span>
                  </div>
                </div>
              </div>

              {/* Pricing breakdown */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Charging Tariff Rate</span>
                  <span className="font-mono font-bold">₹ {chargingCalculation.ratePerKwh.toFixed(2)} / kWh</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Reserved Slot Duration</span>
                  <span className="font-mono font-bold">{chargingCalculation.reservedDurationMinutes} minutes</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Energy Subtotal ({chargingCalculation.batteryRequiredKwh} kWh)</span>
                  <span className="font-mono font-bold">₹ {chargingCalculation.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Service Connection Fee</span>
                  <span className="font-mono font-bold">₹ {chargingCalculation.serviceFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Tax (18% GST)</span>
                  <span className="font-mono font-bold">₹ {chargingCalculation.tax.toFixed(2)}</span>
                </div>
                {chargingCalculation.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Discount Applied</span>
                    <span className="font-mono font-bold">- ₹ {chargingCalculation.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-sm text-slate-900 dark:text-white pt-2.5 border-t border-slate-200 dark:border-slate-700">
                  <span className="uppercase font-mono">TOTAL AMOUNT</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-lg font-mono">₹ {chargingCalculation.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Methods selection */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Choose Payment Method</h4>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Click to select method</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Razorpay Gateway Card */}
                  <div
                    onClick={() => setSelectedPaymentMethod("RAZORPAY")}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative ${
                      selectedPaymentMethod === "RAZORPAY"
                        ? "border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 shadow-md shadow-emerald-500/10 ring-2 ring-emerald-500/30"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          selectedPaymentMethod === "RAZORPAY" ? "border-emerald-500 bg-emerald-500" : "border-slate-400"
                        }`}>
                          {selectedPaymentMethod === "RAZORPAY" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-emerald-500" />
                          Razorpay Gateway
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        RECOMMENDED
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6">
                      Cards, UPI, QR & NetBanking with instant HMAC-SHA256 test verification
                    </p>
                  </div>

                  {/* EV Wallet Card */}
                  <div
                    onClick={() => {
                      if (walletBalance >= chargingCalculation.estimatedCost) {
                        setSelectedPaymentMethod("WALLET");
                      }
                    }}
                    className={`p-4 rounded-xl border text-left transition-all relative ${
                      walletBalance < chargingCalculation.estimatedCost
                        ? "border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/30 opacity-70 cursor-not-allowed"
                        : selectedPaymentMethod === "WALLET"
                        ? "border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 shadow-md shadow-emerald-500/10 ring-2 ring-emerald-500/30 cursor-pointer"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          selectedPaymentMethod === "WALLET" ? "border-emerald-500 bg-emerald-500" : "border-slate-400"
                        }`}>
                          {selectedPaymentMethod === "WALLET" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Wallet className="w-4 h-4 text-emerald-500" />
                          EV Wallet (₹{walletBalance.toFixed(2)})
                        </span>
                      </div>
                      {walletBalance < chargingCalculation.estimatedCost && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          LOW BAL
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6">
                      {walletBalance >= chargingCalculation.estimatedCost
                        ? "Instant 1-click debit from EV Wallet balance"
                        : `Insufficient balance. Need ₹${chargingCalculation.estimatedCost.toFixed(2)}`}
                    </p>
                  </div>
                </div>

                {/* Primary Proceed Button */}
                <button
                  onClick={() => handleCreateBookingAndPay(selectedPaymentMethod)}
                  disabled={isSubmitting || (selectedPaymentMethod === "WALLET" && walletBalance < chargingCalculation.estimatedCost)}
                  className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
                >
                  {isSubmitting || isProcessingWallet ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>Reserving Slot & Launching Payment...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      <span>
                        Pay ₹{chargingCalculation.totalAmount.toFixed(2)} via{" "}
                        {selectedPaymentMethod === "WALLET" ? "EV Customer Wallet" : "Razorpay Gateway"}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* WORKFLOW STEP 4: SUCCESS CONFIRMATION                */}
        {/* ==================================================== */}
        {activeWorkflowStep === 4 && (
          <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Booking Confirmed!</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Your dynamic charging slot has been successfully scheduled.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500">Booking Reference</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {createdBooking?.bookingId || "EV20250001"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500">Station & Charger</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {activeStation.station_name || activeStation.name} • {activeCharger.chargerName}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500">Reserved Interval</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {chargingCalculation.startTimeFormatted} → {chargingCalculation.expectedCompletionFormatted} ({chargingCalculation.reservedDurationMinutes} min)
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Status</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold">
                  CONFIRMED
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                to="/my-bookings"
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 text-xs"
              >
                View in My Bookings
              </Link>
              <Link
                to={`/sessions/${createdBooking?.id || 1}`}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs"
              >
                Go to Live Session
              </Link>
            </div>
          </div>
        )}

        {/* Razorpay / Wallet Checkout Modal */}
        {showRazorpayModal && createdBooking && (
          <RazorpayCheckoutModal
            isOpen={showRazorpayModal}
            booking={createdBooking}
            bookingData={createdBooking}
            onClose={() => setShowRazorpayModal(false)}
            onSuccess={handleRazorpaySuccess}
            onPaymentSuccess={handleRazorpaySuccess}
          />
        )}
      </div>
    </div>
  );
}
