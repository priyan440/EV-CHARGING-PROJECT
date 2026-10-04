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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { useLocation as useGeoLocation } from "../contexts/LocationContext";
import { stationService } from "../services/stationService";
import { vehicleService } from "../services/vehicleService";
import { bookingService } from "../services/bookingService";
import { paymentService } from "../services/paymentService";
import { walletService } from "../services/walletService";
import Toast from "../components/Toast";
import Breadcrumbs from "../components/Breadcrumbs";
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

// Calculate End Time given start time (HH:MM or HH:MM:SS) and duration in minutes
const calculateEndTime = (startStr, durationMins) => {
  if (!startStr) return "11:00";
  const parts = String(startStr).split(":");
  const h = parseInt(parts[0], 10) || 10;
  const m = parseInt(parts[1], 10) || 0;
  const totalMins = h * 60 + m + Math.max(1, Math.round(durationMins));
  const endH = Math.floor(totalMins / 60) % 24;
  const endM = totalMins % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
};

// Realistic Piecewise Battery Charging Time & Energy Calculation
// Factors: 0-50%: 95%, 50-80%: 90%, 80-90%: 75%, 90-100%: 50%
export const getChargingEfficiency = (curSoc, tgtSoc) => {
  const cur = Math.max(0, Math.min(100, parseFloat(curSoc) || 0));
  const tgt = Math.max(0, Math.min(100, parseFloat(tgtSoc) || 100));
  const socDiff = Math.max(0, tgt - cur);
  if (socDiff <= 0) return 0.90;

  const intervals = [
    { start: 0, end: 50, factor: 0.95 },
    { start: 50, end: 80, factor: 0.90 },
    { start: 80, end: 90, factor: 0.75 },
    { start: 90, end: 100, factor: 0.50 },
  ];

  let weightedFactor = 0;
  for (const seg of intervals) {
    const segStart = Math.max(cur, seg.start);
    const segEnd = Math.min(tgt, seg.end);
    if (segEnd > segStart) {
      const segDelta = segEnd - segStart;
      weightedFactor += seg.factor * (segDelta / socDiff);
    }
  }
  return parseFloat((weightedFactor || 0.90).toFixed(2));
};

export const calculateRealisticCharging = (batteryCapacityKwh, currentSoc, targetSoc, chargerPowerKw, vehicleMaxPowerKw) => {
  const cap = parseFloat(batteryCapacityKwh) || 60.0;
  const cur = Math.max(0, Math.min(100, parseFloat(currentSoc) || 0));
  const tgt = Math.max(0, Math.min(100, parseFloat(targetSoc) || 80));

  if (tgt <= cur) {
    return {
      isValid: false,
      socDifference: 0,
      energyRequiredKwh: 0,
      chargingEfficiency: 0.90,
      chargingEfficiencyPercent: 90,
      estimatedMinutes: 0,
      effectivePowerKw: 0,
      error: "Target battery must be greater than current battery.",
    };
  }

  const socDiff = tgt - cur;
  const energyRequiredKwh = Math.round((cap * (socDiff / 100)) * 10) / 10;
  const chargingEfficiency = getChargingEfficiency(cur, tgt);
  const chargingEfficiencyPercent = Math.round(chargingEfficiency * 100);

  const maxPower = Math.min(
    parseFloat(chargerPowerKw) || 60,
    parseFloat(vehicleMaxPowerKw) || 150
  );

  const intervals = [
    { start: 0, end: 50, factor: 0.95 },
    { start: 50, end: 80, factor: 0.90 },
    { start: 80, end: 90, factor: 0.75 },
    { start: 90, end: 100, factor: 0.50 },
  ];

  let totalHours = 0;
  let totalWeightedFactor = 0;

  for (const seg of intervals) {
    const segStart = Math.max(cur, seg.start);
    const segEnd = Math.min(tgt, seg.end);
    if (segEnd > segStart) {
      const segDelta = segEnd - segStart;
      const segEnergy = cap * (segDelta / 100);
      const segPower = maxPower * seg.factor;
      totalHours += segPower > 0 ? segEnergy / segPower : 0;
      totalWeightedFactor += seg.factor * (segDelta / socDiff);
    }
  }

  const estimatedMinutes = Math.max(1, Math.round(totalHours * 60));
  const effectivePowerKw = Math.round((maxPower * (totalWeightedFactor || 0.9)) * 10) / 10;

  return {
    isValid: true,
    socDifference: socDiff,
    energyRequiredKwh,
    chargingEfficiency,
    chargingEfficiencyPercent,
    estimatedMinutes,
    effectivePowerKw,
    error: null,
  };
};

// Check connector compatibility between a slot and vehicle
export const isConnectorCompatible = (slot, vehicle) => {
  if (!slot || !vehicle) return true;
  const vConn = (vehicle.connector_type || vehicle.connectorType || vehicle.connector_name || "").toLowerCase().replace(/[\s-_]/g, "");
  const sConn = (slot.connector_name || slot.connectorType || slot.connector_type || slot.chargerType || "").toLowerCase().replace(/[\s-_]/g, "");

  if (!vConn || !sConn) return true;
  return vConn === sConn || sConn.includes(vConn) || vConn.includes(sConn);
};

export default function BookSlot() {
  const navigate = useNavigate();
  const routeParams = useParams();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { getDistanceToStation } = useGeoLocation();

  // Read stationId from route param (:stationId) or URL query (?stationId=...)
  const initialStationId = routeParams.stationId || searchParams.get("stationId") || "";

  // Progress steps: 1: Station, 2: Vehicle, 3: Slot, 4: Time & Battery, 5: Review, 6: Payment, 7: Confirmation
  const [currentStep, setCurrentStep] = useState(1);

  // Core Data
  const [stations, setStations] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [slots, setSlots] = useState([]);
  const [existingSlotBookings, setExistingSlotBookings] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });

  // Selections
  const [selectedStationId, setSelectedStationId] = useState(initialStationId);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("10:00");
  const [targetBattery, setTargetBattery] = useState(80);

  // Station search filter
  const [stationSearch, setStationSearch] = useState("");

  // Payment & Confirmation State
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("RAZORPAY");
  const [walletBalance, setWalletBalance] = useState(0);
  const [isProcessingWalletPayment, setIsProcessingWalletPayment] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("500");
  const [isToppingUp, setIsToppingUp] = useState(false);

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

  // 1. Fetch user vehicles and approved stations
  useEffect(() => {
    Promise.all([
      stationService.getApprovedStations().catch(() => ({ data: [] })),
      vehicleService.fetchVehicles().catch(() => []),
    ]).then(([stnsRes, vehs]) => {
      const stnList = stnsRes?.data && Array.isArray(stnsRes.data) ? stnsRes.data : [];
      setStations(stnList);

      const vehList = Array.isArray(vehs) ? vehs : [];
      setVehicles(vehList);

      if (vehList.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(vehList[0].id);
      }

      if (initialStationId) {
        setSelectedStationId(initialStationId);
      } else if (stnList.length > 0 && !selectedStationId) {
        setSelectedStationId(stnList[0].id);
      }

      setLoadingInitial(false);
    });
  }, [initialStationId]);

  // 2. Fetch connectors/slots when station changes
  useEffect(() => {
    if (!selectedStationId) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    stationService.getStationConnectors(selectedStationId)
      .then((res) => {
        let list = [];
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          list = res.data;
        } else {
          // If no specific connectors, fallback to station's configured capacity
          const stn = stations.find((s) => String(s.id) === String(selectedStationId));
          const p = stn?.maxPower || stn?.maximumPower || 120;
          list = [
            { id: 1, connector_number: "Slot A01", connector_name: "CCS2", power_kw: p, status: "AVAILABLE", pricePerKwh: stn?.pricePerKwh || 18 },
            { id: 2, connector_number: "Slot A02", connector_name: "CCS2", power_kw: p, status: "AVAILABLE", pricePerKwh: stn?.pricePerKwh || 18 },
            { id: 3, connector_number: "Slot B01", connector_name: "Type 2", power_kw: 22, status: "AVAILABLE", pricePerKwh: stn?.pricePerKwh || 15 },
          ];
        }
        setSlots(list);
      })
      .catch(() => {
        setSlots([]);
      })
      .finally(() => {
        setLoadingSlots(false);
      });
  }, [selectedStationId, stations]);

  // 3. Fetch existing bookings for selected slot & date to identify conflict intervals
  useEffect(() => {
    if (!selectedSlotId || !selectedDate) {
      setExistingSlotBookings([]);
      return;
    }
    bookingService.getSlotBookings({
      station_id: selectedStationId,
      connector_id: selectedSlotId,
      date: selectedDate,
    }).then((res) => {
      if (res?.success && Array.isArray(res.data)) {
        setExistingSlotBookings(res.data);
      } else {
        setExistingSlotBookings([]);
      }
    }).catch(() => {
      setExistingSlotBookings([]);
    });
  }, [selectedStationId, selectedSlotId, selectedDate]);

  // Resolved Active Objects
  const selectedStation = useMemo(() => {
    return stations.find((s) => String(s.id) === String(selectedStationId)) || null;
  }, [stations, selectedStationId]);

  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => String(v.id) === String(selectedVehicleId)) || vehicles[0] || null;
  }, [vehicles, selectedVehicleId]);

  const selectedSlot = useMemo(() => {
    return slots.find((s) => String(s.id) === String(selectedSlotId)) || null;
  }, [slots, selectedSlotId]);

  // Current battery percentage of selected vehicle
  const currentBattery = useMemo(() => {
    if (!selectedVehicle) return 50;
    const soc = selectedVehicle.current_soc_percent ?? selectedVehicle.batteryPercentage ?? 50;
    return Math.max(0, Math.min(100, parseInt(soc, 10) || 50));
  }, [selectedVehicle]);

  // Realistic Charging Calculation
  const chargingCalc = useMemo(() => {
    const batteryCap = selectedVehicle?.battery_capacity_kwh || selectedVehicle?.batteryCapacity || 60;
    const chargerPower = selectedSlot?.power_kw || selectedSlot?.max_power_kw || selectedStation?.maxPower || 120;
    const vehicleMaxPower = selectedVehicle?.max_charging_power_kw || selectedVehicle?.maxChargingPower || 150;

    return calculateRealisticCharging(
      batteryCap,
      currentBattery,
      targetBattery,
      chargerPower,
      vehicleMaxPower
    );
  }, [selectedVehicle, selectedSlot, selectedStation, currentBattery, targetBattery]);

  const durationMinutes = chargingCalc.estimatedMinutes || 30;
  const endTime = useMemo(() => {
    return calculateEndTime(startTime, durationMinutes);
  }, [startTime, durationMinutes]);

  // Dynamic Pricing Breakdown
  const pricing = useMemo(() => {
    const tariff = parseFloat(selectedStation?.pricePerKwh || selectedSlot?.pricePerKwh || 18.0);
    const energyKwh = chargingCalc.energyRequiredKwh || 0;
    const chargingFee = Math.round(energyKwh * tariff * 100) / 100;
    const serviceFee = 20.0;
    const gst = Math.round((chargingFee + serviceFee) * 0.18 * 100) / 100;
    const total = Math.round((chargingFee + serviceFee + gst) * 100) / 100;

    return {
      tariff,
      energyKwh,
      chargingFee,
      serviceFee,
      gst,
      total,
    };
  }, [selectedStation, selectedSlot, chargingCalc]);

  // Check if a specific time slot (e.g. "10:00") conflicts with existing bookings for this slot & date
  const isTimeSlotBooked = useCallback((slotStartTime) => {
    if (!existingSlotBookings || existingSlotBookings.length === 0) return false;
    const candidateStart = slotStartTime.length === 5 ? `${slotStartTime}:00` : slotStartTime;
    const candidateEnd = `${calculateEndTime(slotStartTime, durationMinutes)}:00`;

    return existingSlotBookings.some((b) => {
      const bStart = String(b.start_time).slice(0, 8);
      const bEnd = String(b.end_time).slice(0, 8);
      // Conflict: candidateStart < bEnd && candidateEnd > bStart
      return candidateStart < bEnd && candidateEnd > bStart;
    });
  }, [existingSlotBookings, durationMinutes]);

  // Available candidate start times from 06:00 to 22:30 (30-min increments)
  const candidateTimeSlots = useMemo(() => {
    const list = [];
    for (let h = 6; h <= 22; h++) {
      for (const m of ["00", "30"]) {
        const timeStr = `${String(h).padStart(2, "0")}:${m}`;
        const booked = isTimeSlotBooked(timeStr);
        list.push({
          time: timeStr,
          label: formatTime12h(timeStr),
          isBooked: booked,
        });
      }
    }
    return list;
  }, [isTimeSlotBooked]);

  // Compatibility checking for slot list
  const evaluatedSlots = useMemo(() => {
    return slots.map((s) => {
      const compatible = isConnectorCompatible(s, selectedVehicle);
      const rawStatus = (s.status || "AVAILABLE").toUpperCase();
      const isOccupied = rawStatus === "OCCUPIED" || rawStatus === "RESERVED" || rawStatus === "IN_USE";
      const isAvailable = rawStatus === "AVAILABLE" && compatible;

      let badge = "Available";
      let badgeStyle = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";

      if (!compatible) {
        badge = "Not Compatible";
        badgeStyle = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
      } else if (isOccupied) {
        badge = "Currently Booked";
        badgeStyle = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
      }

      return {
        ...s,
        isCompatible: compatible,
        isAvailable,
        badge,
        badgeStyle,
      };
    });
  }, [slots, selectedVehicle]);

  // Step 1 -> Step 2
  const handleProceedFromStation = () => {
    if (!selectedStation) {
      setToast({ message: "Please select a charging station to proceed.", type: "error" });
      return;
    }
    setCurrentStep(2);
  };

  // Step 2 -> Step 3
  const handleProceedFromVehicle = () => {
    if (!selectedVehicle) {
      setToast({ message: "Please select your vehicle.", type: "error" });
      return;
    }
    setCurrentStep(3);
  };

  // Step 3 -> Step 4
  const handleProceedFromSlot = () => {
    if (!selectedSlot) {
      setToast({ message: "Please select a charging slot.", type: "error" });
      return;
    }
    const evaluated = evaluatedSlots.find((s) => String(s.id) === String(selectedSlot.id));
    if (!evaluated?.isCompatible) {
      setToast({
        message: `Incompatible connector: ${selectedVehicle?.model} requires ${selectedVehicle?.connector_type || 'CCS2'}, but this slot is ${selectedSlot?.connector_name || selectedSlot?.connector_type}.`,
        type: "error",
      });
      return;
    }
    if ((selectedSlot.status || "AVAILABLE").toUpperCase() !== "AVAILABLE") {
      setToast({ message: "Selected slot is currently occupied. Please choose an available slot.", type: "error" });
      return;
    }
    setCurrentStep(4);
  };

  // Step 4 -> Step 5
  const handleProceedFromSchedule = async () => {
    if (!chargingCalc.isValid) {
      setToast({ message: chargingCalc.error || "Invalid battery target.", type: "error" });
      return;
    }

    // Check conflict in real-time
    setCheckingAvailability(true);
    try {
      const cleanStart = startTime.length === 5 ? `${startTime}:00` : startTime;
      const cleanEnd = `${endTime}:00`;
      const availRes = await bookingService.checkAvailability({
        station_id: selectedStation?.id,
        connector_id: selectedSlot?.id,
        booking_date: selectedDate,
        start_time: cleanStart,
        end_time: cleanEnd,
      });

      if (!availRes?.isAvailable && !availRes?.available) {
        setToast({
          message: availRes?.message || "Charging slot is already booked for the selected time.",
          type: "error",
        });
        return;
      }

      setCurrentStep(5);
    } catch (err) {
      setToast({ message: err.message || "Error validating slot availability", type: "error" });
    } finally {
      setCheckingAvailability(false);
    }
  };

  // Step 5 -> Step 6 (Initialize Booking & Open Payment Gateway)
  const handleProceedToPayment = async () => {
    setIsCreatingBooking(true);
    try {
      // Create initial PENDING_PAYMENT booking
      const cleanStart = startTime.length === 5 ? `${startTime}:00` : startTime;
      const bookingPayload = {
        station_id: selectedStation?.id,
        stationId: selectedStation?.id,
        connector_id: selectedSlot?.id,
        connectorId: selectedSlot?.id,
        vehicle_id: selectedVehicle?.id,
        vehicleId: selectedVehicle?.id,
        booking_date: selectedDate,
        bookingDate: selectedDate,
        start_time: cleanStart,
        startTime: cleanStart,
        duration_minutes: durationMinutes,
        durationMinutes: durationMinutes,
        current_soc_percent: currentBattery,
        target_soc_percent: targetBattery,
        energy_kwh: pricing.energyKwh,
        amount: pricing.total,
        totalAmount: pricing.total,
        status: "PENDING_PAYMENT",
        payment_status: "PENDING",
      };

      const bRes = await bookingService.createBooking(bookingPayload);
      if (!bRes?.success) {
        if (bRes.statusCode === 409) {
          throw new Error("Charging slot is already booked for the selected time.");
        }
        throw new Error(bRes?.message || "Failed to reserve slot. It may be currently occupied.");
      }

      const bookedObj = bRes.booking || bRes.data;
      const bCode = bookedObj?.booking_id || bookedObj?.bookingId || bRes.bookingId || `EVB${Date.now().toString().slice(-8)}`;

      const enrichedBooking = {
        ...bookedObj,
        bookingId: bCode,
        bookingCode: bCode,
        stationName: selectedStation?.station_name || selectedStation?.name,
        stationAddress: selectedStation?.address,
        vehicleModel: `${selectedVehicle?.brand || ""} ${selectedVehicle?.model || ""}`.trim(),
        vehicleNumber: selectedVehicle?.registration_number || selectedVehicle?.vehicleNumber,
        connectorNumber: selectedSlot?.connector_number || "Slot A01",
        powerKw: selectedSlot?.power_kw || 120,
        startTime,
        endTime,
        durationMinutes,
        currentBattery,
        targetBattery,
        energyKwh: pricing.energyKwh,
        totalAmount: pricing.total,
        ratePerKwh: pricing.tariff,
        serviceFee: pricing.serviceFee,
        gst: pricing.gst,
      };

      setCreatedBooking(enrichedBooking);
      setCurrentStep(6);
      fetchWallet();
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setIsCreatingBooking(false);
    }
  };

  // Top Up EV Wallet Balance
  const handleTopUpWallet = async () => {
    const amt = parseFloat(topUpAmount);
    if (isNaN(amt) || amt <= 0) {
      setToast({ message: "Please enter a valid top-up amount.", type: "error" });
      return;
    }
    setIsToppingUp(true);
    try {
      const res = await walletService.topUpWallet(amt, "Top-Up for EV Slot Booking");
      if (res?.success) {
        const newBal = parseFloat(res.data?.balance ?? (walletBalance + amt));
        setWalletBalance(newBal);
        setShowTopUpModal(false);
        setToast({ message: `Successfully added ₹${amt.toFixed(2)} to your EV Wallet!`, type: "success" });
      } else {
        setToast({ message: res?.message || "Failed to top up wallet", type: "error" });
      }
    } catch (err) {
      setToast({ message: err.message || "Failed to top up wallet", type: "error" });
    } finally {
      setIsToppingUp(false);
    }
  };

  // Pay using EV Wallet (Atomic MySQL Transaction)
  const handleExecuteWalletPayment = async () => {
    if (!createdBooking) {
      setToast({ message: "No active reservation found to pay.", type: "error" });
      return;
    }
    const dueAmount = pricing.total;
    if (walletBalance < dueAmount) {
      setToast({
        message: `Insufficient wallet balance (₹${walletBalance.toFixed(2)}). Required: ₹${dueAmount.toFixed(2)}`,
        type: "error",
      });
      return;
    }

    setIsProcessingWalletPayment(true);
    try {
      const res = await walletService.payWithWallet({
        bookingId: createdBooking.bookingId || createdBooking.bookingCode,
        booking_id: createdBooking.bookingId || createdBooking.bookingCode,
        amount: dueAmount,
        stationId: selectedStation?.id,
      });

      if (res && res.success) {
        const payId = res.data?.paymentId || res.paymentId || `PAY_W_${Date.now().toString().slice(-6)}`;
        setWalletBalance((prev) => Math.max(0, prev - dueAmount));
        handlePaymentSuccess({ paymentId: payId, method: "WALLET" });
      } else {
        throw new Error(res?.message || "Wallet payment could not be processed.");
      }
    } catch (err) {
      setToast({ message: err.message || "Wallet payment failed.", type: "error" });
    } finally {
      setIsProcessingWalletPayment(false);
    }
  };

  // Handle successful payment verification
  const handlePaymentSuccess = async (paymentResult) => {
    setShowRazorpayModal(false);
    const finalBooking = {
      ...createdBooking,
      paymentId: paymentResult?.paymentId || paymentResult?.razorpay_payment_id || `PAY${Date.now().toString().slice(-6)}`,
      status: "CONFIRMED",
      paymentStatus: "PAID",
      confirmedAt: new Date().toISOString(),
    };
    setConfirmedBooking(finalBooking);
    setCurrentStep(7);
    setToast({ message: "Booking confirmed successfully!", type: "success" });
  };

  const stepsList = [
    { num: 1, title: "Station", label: "Station" },
    { num: 2, title: "Vehicle", label: "Vehicle" },
    { num: 3, title: "Slot", label: "Slot" },
    { num: 4, title: "Schedule", label: "Time" },
    { num: 5, title: "Review", label: "Review" },
    { num: 6, title: "Payment", label: "Payment" },
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto font-sans pb-16 text-[var(--text-primary)]">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />

      <Breadcrumbs
        items={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Stations", path: "/stations" },
          { label: "Book Charging", path: "/book-slot" },
        ]}
      />

      {/* Progress Stepper Indicator */}
      <div className="bg-[var(--bg-surface)] p-3 sm:p-4 rounded-3xl border border-[var(--border-subtle)] shadow-xs">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {stepsList.map((st, idx) => {
            const isDone = currentStep > st.num || currentStep === 7;
            const isCurrent = currentStep === st.num;
            return (
              <React.Fragment key={st.num}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-all duration-200 ${
                      isDone
                        ? "bg-emerald-500 text-white shadow-sm"
                        : isCurrent
                        ? "bg-[var(--accent-primary)] text-white ring-4 ring-blue-500/20 shadow-md"
                        : "bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-muted)]"
                    }`}
                  >
                    {isDone ? <Check size={14} className="stroke-[3]" /> : st.num}
                  </div>
                  <span
                    className={`text-[11px] font-semibold mt-1 tracking-tight hidden sm:block ${
                      isCurrent
                        ? "text-[var(--text-primary)] font-bold"
                        : isDone
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {st.title}
                  </span>
                </div>
                {idx < stepsList.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 rounded-full transition-all duration-300 ${
                      currentStep > st.num ? "bg-emerald-500" : "bg-[var(--border-subtle)]"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Two-Column Viewport Layout */}
      {currentStep < 7 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Interactive Step Configuration */}
          <div className="lg:col-span-7 space-y-4">
            {/* STEP 1: CHOOSE STATION */}
            {currentStep === 1 && (
              <div className="bg-[var(--bg-surface)] p-5 sm:p-6 rounded-3xl border border-[var(--border-subtle)] shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <MapPin size={20} className="text-emerald-500" />
                      1. Select Charging Station
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Choose an active charging station verified in our live network.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    {stations.length} Available
                  </span>
                </div>

                {/* Station Search Filter */}
                <input
                  type="text"
                  placeholder="Search station by name, city, address..."
                  value={stationSearch}
                  onChange={(e) => setStationSearch(e.target.value)}
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                />

                {/* Station Selection Cards List */}
                <div className="max-h-[380px] overflow-y-auto pr-1 space-y-3">
                  {stations
                    .filter((s) => {
                      if (!stationSearch.trim()) return true;
                      const q = stationSearch.toLowerCase();
                      return (
                        (s.station_name || s.name || "").toLowerCase().includes(q) ||
                        (s.address || "").toLowerCase().includes(q) ||
                        (s.city || "").toLowerCase().includes(q)
                      );
                    })
                    .map((s) => {
                      const isSelected = String(s.id) === String(selectedStationId);
                      const dist = getDistanceToStation ? getDistanceToStation(s) : null;
                      const totalSlots = s.total_slots || s.totalSlots || 4;
                      const availSlots = s.available_slots || s.availableSlots || totalSlots;

                      return (
                        <div
                          key={s.id}
                          onClick={() => setSelectedStationId(s.id)}
                          className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-blue-500/10 border-[var(--accent-primary)] ring-2 ring-blue-500/20 shadow-md"
                              : "bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] hover:border-slate-400 dark:hover:border-slate-600"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                                {s.station_name || s.name}
                              </h3>
                              {isSelected && (
                                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-primary)] text-white text-[10px] font-bold">
                                  Selected
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[var(--text-muted)] line-clamp-1">
                              📍 {s.address || "Vadapalani, Chennai"}
                            </p>
                            <div className="flex items-center gap-3 text-[11px] pt-1 font-mono text-[var(--text-secondary)]">
                              <span>⚡ {s.maxPower || s.maximumPower || 120} kW DC</span>
                              <span>•</span>
                              <span>₹{s.pricePerKwh || 18}/kWh</span>
                              {dist && (
                                <>
                                  <span>•</span>
                                  <span>{dist.toFixed(1)} km</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-mono font-bold px-2 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              {availSlots}/{totalSlots} Slots
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className="flex justify-end pt-3 border-t border-[var(--border-subtle)]">
                  <button
                    onClick={handleProceedFromStation}
                    className="px-6 py-2.5 rounded-2xl bg-[var(--accent-primary)] hover:opacity-90 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <span>Next: Select Vehicle</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: CHOOSE VEHICLE */}
            {currentStep === 2 && (
              <div className="bg-[var(--bg-surface)] p-5 sm:p-6 rounded-3xl border border-[var(--border-subtle)] shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Car size={20} className="text-blue-500" />
                      2. Choose Your Vehicle
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Select your registered EV to automatically verify connector compatibility and charging speed.
                    </p>
                  </div>
                  <Link
                    to="/vehicles"
                    className="text-xs font-bold text-[var(--accent-primary)] hover:underline flex items-center gap-1"
                  >
                    <Plus size={13} /> Add Vehicle
                  </Link>
                </div>

                <div className="max-h-[380px] overflow-y-auto pr-1 space-y-3">
                  {vehicles.length === 0 ? (
                    <div className="p-8 text-center space-y-2 border border-dashed border-[var(--border-subtle)] rounded-2xl">
                      <Car size={32} className="mx-auto text-[var(--text-muted)]" />
                      <p className="text-xs font-semibold">No vehicles registered yet.</p>
                      <button
                        onClick={() => navigate("/vehicles")}
                        className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-bold"
                      >
                        Register Vehicle
                      </button>
                    </div>
                  ) : (
                    vehicles.map((v) => {
                      const isSelected = String(v.id) === String(selectedVehicleId);
                      const soc = v.current_soc_percent ?? v.batteryPercentage ?? 50;

                      return (
                        <div
                          key={v.id}
                          onClick={() => setSelectedVehicleId(v.id)}
                          className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 ${
                            isSelected
                              ? "bg-blue-500/10 border-[var(--accent-primary)] ring-2 ring-blue-500/20 shadow-md"
                              : "bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] hover:border-slate-400 dark:hover:border-slate-600"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                                {v.brand} {v.model}
                              </h3>
                              <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                                {v.registration_number || v.vehicleNumber}
                              </span>
                              {isSelected && (
                                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-primary)] text-white text-[10px] font-bold">
                                  Selected
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[var(--text-secondary)] pt-1">
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                                Connector: {v.connector_type || v.connectorType || "CCS2"}
                              </span>
                              <span>Battery: {v.battery_capacity_kwh || v.batteryCapacity || 60} kWh</span>
                              <span>Max Power: {v.max_charging_power_kw || 120} kW</span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="block text-[10px] uppercase font-mono text-[var(--text-muted)]">Battery Level</span>
                            <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                              {soc}%
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="px-4 py-2 rounded-2xl border border-[var(--border-subtle)] text-xs font-bold hover:bg-[var(--bg-surface-raised)] flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    onClick={handleProceedFromVehicle}
                    className="px-6 py-2.5 rounded-2xl bg-[var(--accent-primary)] hover:opacity-90 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <span>Next: Select Compatible Slot</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: CHOOSE COMPATIBLE SLOT */}
            {currentStep === 3 && (
              <div className="bg-[var(--bg-surface)] p-5 sm:p-6 rounded-3xl border border-[var(--border-subtle)] shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Zap size={20} className="text-amber-500 fill-amber-500" />
                      3. Select Charging Slot & Connector
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Slots are filtered against your vehicle's connector (
                      <span className="font-mono font-bold text-emerald-500">
                        {selectedVehicle?.connector_type || "CCS2"}
                      </span>
                      ). Incompatible slots cannot be booked.
                    </p>
                  </div>
                </div>

                <div className="max-h-[380px] overflow-y-auto pr-1 space-y-3">
                  {loadingSlots ? (
                    <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                      Loading station slots and live telemetry...
                    </div>
                  ) : evaluatedSlots.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-2xl">
                      No slots configured for this station.
                    </div>
                  ) : (
                    evaluatedSlots.map((s) => {
                      const isSelected = String(s.id) === String(selectedSlotId);
                      const isClickable = s.isAvailable;

                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            if (isClickable) setSelectedSlotId(s.id);
                          }}
                          className={`p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-4 ${
                            !s.isCompatible
                              ? "bg-slate-500/5 border-slate-500/20 opacity-60 cursor-not-allowed"
                              : !s.isAvailable
                              ? "bg-amber-500/5 border-amber-500/20 opacity-70 cursor-not-allowed"
                              : isSelected
                              ? "bg-blue-500/10 border-[var(--accent-primary)] ring-2 ring-blue-500/20 shadow-md cursor-pointer"
                              : "bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] hover:border-slate-400 dark:hover:border-slate-600 cursor-pointer"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                                {s.connector_number || `Slot #${s.id}`}
                              </h3>
                              <span
                                className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-bold ${s.badgeStyle}`}
                              >
                                {s.badge}
                              </span>
                              {isSelected && (
                                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-primary)] text-white text-[10px] font-bold">
                                  Selected
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--text-secondary)] pt-1">
                              <span>Connector: {s.connector_name || s.connector_type || "CCS2"}</span>
                              <span>•</span>
                              <span>Power: {s.power_kw || 120} kW</span>
                              <span>•</span>
                              <span>₹{s.pricePerKwh || selectedStation?.pricePerKwh || 18}/kWh</span>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            {s.isCompatible && s.isAvailable ? (
                              <button
                                type="button"
                                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
                                  isSelected
                                    ? "bg-emerald-500 text-white"
                                    : "bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                                }`}
                              >
                                {isSelected ? "Selected" : "Select Slot"}
                              </button>
                            ) : (
                              <span className="text-[11px] font-mono text-rose-500 font-bold">
                                {!s.isCompatible ? "Incompatible" : "Occupied"}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-2 rounded-2xl border border-[var(--border-subtle)] text-xs font-bold hover:bg-[var(--bg-surface-raised)] flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    onClick={handleProceedFromSlot}
                    disabled={!selectedSlot}
                    className="px-6 py-2.5 rounded-2xl bg-[var(--accent-primary)] hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <span>Next: Schedule & Battery</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: SCHEDULE & TARGET BATTERY */}
            {currentStep === 4 && (
              <div className="bg-[var(--bg-surface)] p-5 sm:p-6 rounded-3xl border border-[var(--border-subtle)] shadow-xs space-y-5">
                <div className="border-b border-[var(--border-subtle)] pb-3">
                  <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Clock size={20} className="text-cyan-500" />
                    4. Charging Schedule & Target Battery
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Charging duration is calculated automatically based on your battery's non-linear charging curve.
                  </p>
                </div>

                {/* Target Battery Selection Buttons */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider font-mono text-[var(--text-secondary)]">
                    Target Battery Level (% SOC)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[80, 90, 100].map((socVal) => {
                      const isSel = targetBattery === socVal;
                      return (
                        <button
                          key={socVal}
                          type="button"
                          onClick={() => setTargetBattery(socVal)}
                          className={`py-2.5 rounded-2xl font-mono text-xs font-bold border transition cursor-pointer flex flex-col items-center justify-center ${
                            isSel
                              ? "bg-emerald-500 text-white border-emerald-500 shadow-md"
                              : "bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-emerald-500"
                          }`}
                        >
                          <span className="text-sm font-extrabold">{socVal}%</span>
                          <span className="text-[10px] opacity-80">{socVal === 80 ? "Recommended" : socVal === 100 ? "Full Range" : "Optimal"}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Validation Error banner if current >= target */}
                  {currentBattery >= targetBattery && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 font-semibold">
                      <AlertCircle size={16} className="shrink-0" />
                      <span>Target battery must be greater than current battery ({currentBattery}%).</span>
                    </div>
                  )}
                </div>

                {/* Calculated Dynamic Telemetry Card */}
                {chargingCalc.isValid && (
                  <div className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div>
                      <span className="block text-[10px] font-mono uppercase text-[var(--text-muted)]">Current SOC</span>
                      <span className="font-mono font-bold text-sm text-[var(--text-primary)]">{currentBattery}%</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-mono uppercase text-[var(--text-muted)]">Target SOC</span>
                      <span className="font-mono font-bold text-sm text-emerald-500">{targetBattery}%</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-mono uppercase text-[var(--text-muted)]">Energy Required</span>
                      <span className="font-mono font-bold text-sm text-blue-500">{chargingCalc.energyRequiredKwh} kWh</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-mono uppercase text-[var(--text-muted)]">Est. Charging Time</span>
                      <span className="font-mono font-bold text-sm text-amber-500">{chargingCalc.estimatedMinutes} mins</span>
                    </div>
                  </div>
                )}

                {/* Date Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider font-mono text-[var(--text-secondary)]">
                    Reservation Date
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>

                {/* Available Start Time Slots Grid (Double Booking Prevention) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider font-mono text-[var(--text-secondary)]">
                      Select Start Time Slot
                    </label>
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                      End Time: <strong className="text-[var(--text-primary)]">{formatTime12h(endTime)}</strong>
                    </span>
                  </div>

                  <div className="max-h-[160px] overflow-y-auto pr-1 grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {candidateTimeSlots.map((ts) => {
                      const isSelected = startTime === ts.time;
                      return (
                        <button
                          key={ts.time}
                          type="button"
                          disabled={ts.isBooked}
                          onClick={() => setStartTime(ts.time)}
                          className={`py-2 px-1 rounded-xl text-xs font-mono font-bold border transition cursor-pointer flex flex-col items-center justify-center ${
                            ts.isBooked
                              ? "bg-rose-500/10 border-rose-500/30 text-rose-500 line-through opacity-60 cursor-not-allowed"
                              : isSelected
                              ? "bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-sm"
                              : "bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--accent-primary)]"
                          }`}
                        >
                          <span>{ts.time}</span>
                          <span className="text-[9px] opacity-75">{ts.isBooked ? "BOOKED" : ts.label.split(" ")[1]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Estimation Explanation Disclaimer */}
                <p className="text-[11px] text-[var(--text-muted)] italic flex items-center gap-1.5">
                  <Info size={13} className="shrink-0 text-blue-500" />
                  Estimated time is calculated using charger power, battery capacity and an approximate charging efficiency curve.
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="px-4 py-2 rounded-2xl border border-[var(--border-subtle)] text-xs font-bold hover:bg-[var(--bg-surface-raised)] flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    onClick={handleProceedFromSchedule}
                    disabled={!chargingCalc.isValid || checkingAvailability}
                    className="px-6 py-2.5 rounded-2xl bg-[var(--accent-primary)] hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <span>{checkingAvailability ? "Validating..." : "Review Estimate"}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: REVIEW CHARGING ESTIMATE & DETAILS */}
            {currentStep === 5 && (
              <div className="bg-[var(--bg-surface)] p-5 sm:p-6 rounded-3xl border border-[var(--border-subtle)] shadow-xs space-y-4">
                <div className="border-b border-[var(--border-subtle)] pb-3">
                  <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-emerald-500" />
                    5. Review Reservation Details
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Please verify all specifications before proceeding to secure payment.
                  </p>
                </div>

                <div className="space-y-3 bg-[var(--bg-surface-raised)] p-4 rounded-2xl border border-[var(--border-subtle)] text-xs">
                  <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                    <span className="text-[var(--text-muted)]">Station:</span>
                    <span className="font-bold text-[var(--text-primary)]">{selectedStation?.station_name || selectedStation?.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                    <span className="text-[var(--text-muted)]">Address:</span>
                    <span className="font-semibold text-right max-w-[200px] truncate">{selectedStation?.address}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                    <span className="text-[var(--text-muted)]">Vehicle:</span>
                    <span className="font-bold text-[var(--text-primary)]">{selectedVehicle?.brand} {selectedVehicle?.model} ({selectedVehicle?.registration_number})</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                    <span className="text-[var(--text-muted)]">Slot & Connector:</span>
                    <span className="font-bold text-emerald-500">{selectedSlot?.connector_number} • {selectedSlot?.connector_name || "CCS2"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                    <span className="text-[var(--text-muted)]">Date & Time:</span>
                    <span className="font-bold font-mono">{selectedDate} • {formatTime12h(startTime)} - {formatTime12h(endTime)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                    <span className="text-[var(--text-muted)]">Energy Requirement:</span>
                    <span className="font-bold font-mono text-blue-500">{currentBattery}% → {targetBattery}% ({pricing.energyKwh} kWh)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[var(--text-muted)]">Estimated Charging Duration:</span>
                    <span className="font-bold font-mono text-amber-500">{durationMinutes} minutes</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="px-4 py-2 rounded-2xl border border-[var(--border-subtle)] text-xs font-bold hover:bg-[var(--bg-surface-raised)] flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    onClick={handleProceedToPayment}
                    disabled={isCreatingBooking}
                    className="px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    <Lock size={14} />
                    <span>{isCreatingBooking ? "Reserving Slot..." : `Proceed to Pay ₹${pricing.total}`}</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 6: PAYMENT CHECKOUT */}
            {currentStep === 6 && (
              <div className="bg-[var(--bg-surface)] p-5 sm:p-6 rounded-3xl border border-[var(--border-subtle)] shadow-xs space-y-5">
                <div className="border-b border-[var(--border-subtle)] pb-3">
                  <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <CreditCard size={20} className="text-emerald-500" />
                    6. Complete Payment
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Booking: <span className="font-mono font-bold text-[var(--accent-primary)]">{createdBooking?.bookingId || createdBooking?.bookingCode}</span> • Reservation held pending payment.
                  </p>
                </div>

                {/* Amount Due Card */}
                <div className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-[var(--text-muted)]">Total Amount Due</span>
                    <div className="text-2xl font-black font-mono text-emerald-500">₹{pricing.total}</div>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-[var(--text-muted)] block">{selectedStation?.station_name || selectedStation?.name}</span>
                    <span className="font-mono text-blue-500 font-bold">{selectedSlot?.connector_number} • {pricing.energyKwh} kWh</span>
                  </div>
                </div>

                {/* Payment Method Selector (Part 18) */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                    Select Payment Method
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Razorpay Option */}
                    <div
                      onClick={() => setSelectedPaymentMethod("RAZORPAY")}
                      className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between gap-3 ${
                        selectedPaymentMethod === "RAZORPAY"
                          ? "bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/20"
                          : "bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] hover:border-emerald-500/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={selectedPaymentMethod === "RAZORPAY"}
                            onChange={() => setSelectedPaymentMethod("RAZORPAY")}
                            className="accent-emerald-500"
                          />
                          <span className="font-bold text-xs text-[var(--text-primary)]">Razorpay Checkout</span>
                        </div>
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          POPULAR
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        UPI (GPay, PhonePe, Paytm), Credit & Debit Cards, Net Banking
                      </p>
                    </div>

                    {/* EV Wallet Option */}
                    <div
                      onClick={() => setSelectedPaymentMethod("WALLET")}
                      className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between gap-3 ${
                        selectedPaymentMethod === "WALLET"
                          ? "bg-cyan-500/10 border-cyan-500 ring-2 ring-cyan-500/20"
                          : "bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] hover:border-cyan-500/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={selectedPaymentMethod === "WALLET"}
                            onChange={() => setSelectedPaymentMethod("WALLET")}
                            className="accent-cyan-500"
                          />
                          <span className="font-bold text-xs text-[var(--text-primary)]">EV Customer Wallet</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400">
                          Balance: ₹{walletBalance.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Instant 1-click atomic debit from your pre-loaded EV Charge Pro wallet
                      </p>
                    </div>
                  </div>
                </div>

                {/* Insufficient Wallet Warning */}
                {selectedPaymentMethod === "WALLET" && walletBalance < pricing.total && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle size={15} /> Insufficient Wallet Balance
                      </div>
                      <div className="text-[var(--text-muted)]">
                        Required: <span className="font-mono font-bold text-rose-500">₹{pricing.total}</span> • Available: <span className="font-mono font-bold text-amber-500">₹{walletBalance.toFixed(2)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowTopUpModal(true)}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Plus size={14} /> Add Money
                    </button>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[var(--border-subtle)]">
                  <button
                    onClick={() => setCurrentStep(5)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-2xl border border-[var(--border-subtle)] text-xs font-bold hover:bg-[var(--bg-surface-raised)] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft size={14} /> Modify Details
                  </button>

                  {selectedPaymentMethod === "RAZORPAY" ? (
                    <button
                      onClick={() => setShowRazorpayModal(true)}
                      className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 cursor-pointer"
                    >
                      <ShieldCheck size={16} /> Pay ₹{pricing.total} via Razorpay Checkout
                    </button>
                  ) : (
                    <button
                      onClick={handleExecuteWalletPayment}
                      disabled={walletBalance < pricing.total || isProcessingWalletPayment}
                      className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 cursor-pointer"
                    >
                      {isProcessingWalletPayment ? (
                        <span>Processing Atomic Payment...</span>
                      ) : (
                        <>
                          <Lock size={15} /> Pay ₹{pricing.total} with EV Wallet
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Sticky Booking Summary */}
          <div className="lg:col-span-5 sticky top-24 space-y-4">
            <div className="bg-[var(--bg-surface)] p-5 rounded-3xl border border-[var(--border-subtle)] shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <h3 className="font-extrabold text-sm uppercase tracking-wider font-mono text-[var(--text-primary)] flex items-center gap-1.5">
                  <FileText size={16} className="text-[var(--accent-primary)]" />
                  Booking Summary
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold">
                  LIVE ESTIMATE
                </span>
              </div>

              {/* Station & Vehicle Summary */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="block text-[10px] uppercase font-mono text-[var(--text-muted)]">Station</span>
                  <span className="font-bold text-[var(--text-primary)]">{selectedStation?.station_name || selectedStation?.name || "Select station"}</span>
                  <span className="block text-[11px] text-[var(--text-muted)] truncate">{selectedStation?.address || "Address"}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <div>
                    <span className="block text-[10px] uppercase font-mono text-[var(--text-muted)]">Vehicle</span>
                    <span className="font-bold text-[var(--text-primary)]">{selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : "Select vehicle"}</span>
                    <span className="block text-[10px] text-emerald-500 font-mono font-bold">{selectedVehicle?.connector_type || "CCS2"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-mono text-[var(--text-muted)]">Slot</span>
                    <span className="font-bold text-[var(--text-primary)]">{selectedSlot?.connector_number || "Select slot"}</span>
                    <span className="block text-[10px] text-blue-500 font-mono font-bold">{selectedSlot?.power_kw || 120} kW</span>
                  </div>
                </div>

                {/* Charging Specs & Duration */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-subtle)] font-mono text-[11px]">
                  <div>
                    <span className="block text-[10px] uppercase text-[var(--text-muted)]">Battery SOC</span>
                    <span className="font-bold text-[var(--text-primary)]">{currentBattery}% → {targetBattery}%</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-[var(--text-muted)]">Energy Required</span>
                    <span className="font-bold text-blue-500">{pricing.energyKwh} kWh</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-[var(--text-muted)]">Schedule</span>
                    <span className="font-bold text-[var(--text-primary)]">{selectedDate}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-[var(--text-muted)]">Time & Duration</span>
                    <span className="font-bold text-amber-500">{formatTime12h(startTime)} ({durationMinutes}m)</span>
                  </div>
                </div>

                {/* Dynamic Price Breakdown */}
                <div className="pt-3 border-t border-[var(--border-subtle)] space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Charging Fee ({pricing.energyKwh} kWh @ ₹{pricing.tariff})</span>
                    <span className="font-semibold">₹{pricing.chargingFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Service Fee</span>
                    <span className="font-semibold">₹{pricing.serviceFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">GST (18%)</span>
                    <span className="font-semibold">₹{pricing.gst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-[var(--border-subtle)] text-sm font-bold text-[var(--text-primary)]">
                    <span>Total Amount</span>
                    <span className="text-emerald-500">₹{pricing.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* STEP 7: BOOKING CONFIRMATION */
        <div className="max-w-2xl mx-auto bg-[var(--bg-surface)] p-6 sm:p-8 rounded-3xl border border-[var(--border-subtle)] shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10 animate-scale-up">
            <CheckCircle2 size={36} />
          </div>

          <div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wider">
              RESERVATION CONFIRMED
            </span>
            <h2 className="text-2xl font-extrabold text-[var(--text-primary)] mt-3">
              Charging Slot Reserved Successfully!
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Your bay has been locked and guaranteed. Present your digital pass or QR upon arrival.
            </p>
          </div>

          {/* Ticket Card */}
          <div className="bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-2xl p-5 text-left space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
              <div>
                <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">Booking Reference ID</span>
                <span className="block font-mono font-extrabold text-sm text-[var(--accent-primary)]">
                  {confirmedBooking?.bookingId || confirmedBooking?.bookingCode}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-mono font-bold border border-emerald-500/20">
                STATUS: CONFIRMED
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">Station</span>
                <span className="block font-bold">{confirmedBooking?.stationName}</span>
                <span className="text-[11px] text-[var(--text-muted)] truncate block">{confirmedBooking?.stationAddress}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">Bay / Slot</span>
                <span className="block font-bold">{confirmedBooking?.connectorNumber}</span>
                <span className="text-[11px] text-blue-500 font-mono font-bold">{confirmedBooking?.powerKw} kW Fast Charger</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">Vehicle</span>
                <span className="block font-bold">{confirmedBooking?.vehicleModel}</span>
                <span className="font-mono text-[11px] text-[var(--text-muted)]">{confirmedBooking?.vehicleNumber}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">Time & Energy</span>
                <span className="block font-bold font-mono">{confirmedBooking?.startTime} - {confirmedBooking?.endTime}</span>
                <span className="font-mono text-[11px] text-emerald-500 font-bold">{confirmedBooking?.energyKwh} kWh ({confirmedBooking?.durationMinutes} mins)</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate("/my-bookings")}
              className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-[var(--accent-primary)] text-white font-bold text-xs shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <span>View My Bookings</span>
              <ArrowRight size={14} />
            </button>
            <button
              onClick={() => {
                setCurrentStep(1);
                setConfirmedBooking(null);
                setCreatedBooking(null);
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-2xl border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)] font-bold text-xs cursor-pointer"
            >
              Book Another Session
            </button>
          </div>
        </div>
      )}

      {/* Razorpay Checkout Modal */}
      {showRazorpayModal && createdBooking && (
        <RazorpayCheckoutModal
          isOpen={showRazorpayModal}
          booking={createdBooking}
          bookingData={createdBooking}
          onClose={() => setShowRazorpayModal(false)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Top Up EV Wallet Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                <Wallet className="text-cyan-500" size={18} /> Top Up EV Wallet
              </h3>
              <button
                type="button"
                onClick={() => setShowTopUpModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              Current balance: <span className="font-mono font-bold text-cyan-400">₹{walletBalance.toFixed(2)}</span>. Add funds instantly to confirm your charging slot.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase">Top-Up Amount (₹)</label>
              <input
                type="number"
                min="100"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono font-bold text-base rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500"
              />
              <div className="flex gap-2 pt-1">
                {[250, 500, 1000, 2000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopUpAmount(String(amt))}
                    className="flex-1 py-1 text-xs font-mono font-bold rounded-lg border border-[var(--border-subtle)] hover:border-cyan-500 text-[var(--text-secondary)] cursor-pointer"
                  >
                    +₹{amt}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleTopUpWallet}
              disabled={isToppingUp}
              className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              {isToppingUp ? "Crediting Wallet..." : `Add ₹${topUpAmount} to Wallet`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
