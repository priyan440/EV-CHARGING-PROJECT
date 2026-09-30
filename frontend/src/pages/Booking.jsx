import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Zap,
  CalendarCheck,
  Clock,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Tag,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Check,
  MapPin,
  Car,
  BatteryCharging,
  Sliders,
  ChevronRight,
  RefreshCw,
  Gauge,
  Info,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useSystemState } from "../contexts/SystemStateContext";
import { useNotifications } from "../contexts/NotificationContext";
import RazorpayCheckoutModal from "../components/RazorpayCheckoutModal";
import BookingPassModal from "../components/BookingPassModal";
import InvoiceModal from "../components/InvoiceModal";
import ConflictModal from "../components/ConflictModal";
import { stationService } from "../services/stationService";
import { bookingService } from "../services/bookingService";
import smartReservationService from "../services/smartReservationService";

const TIME_SLOTS = [
  { time: "08:00:00", label: "08:00 AM (Morning)" },
  { time: "10:00:00", label: "10:00 AM (Standard)" },
  { time: "12:00:00", label: "12:00 PM (Standard)" },
  { time: "14:00:00", label: "02:00 PM (Standard)" },
  { time: "16:00:00", label: "04:00 PM (Afternoon)" },
  { time: "18:00:00", label: "06:00 PM (Peak Surge +25%)" },
  { time: "20:00:00", label: "08:00 PM (Peak Surge +25%)" },
  { time: "22:00:00", label: "10:00 PM (Off-Peak Saver -15%)" },
];

export default function Booking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedStationId = searchParams.get("stationId") || "";
  const preSelectedChargerId = searchParams.get("chargerId") || "";

  const { currentUser } = useAuth();
  const { coupons } = useSystemState();
  const { addNotification } = useNotifications();

  const [dbStations, setDbStations] = useState([]);
  const [loadingStations, setLoadingStations] = useState(true);

  // Stepper state: Step 1 (Station & Bay) | Step 2 (Schedule & Energy) | Step 3 (Review & Pay)
  const [currentStep, setCurrentStep] = useState(1);

  // Customer Vehicle details
  const userVehicles = currentUser?.vehicles || [];
  const primaryVehicle = userVehicles[0] || currentUser?.vehicle || {
    id: 1,
    number: "TN58AB1234",
    vehicleNumber: "TN58AB1234",
    brand: "Tata Motors",
    model: "Nexon EV Max",
    connectorType: "CCS2",
    batteryCapacity: 40.5,
    maxChargingPower: 50.0,
    currentBatteryPct: 20,
    targetBatteryPct: 80,
  };

  const [selectedVehicle, setSelectedVehicle] = useState(primaryVehicle);
  const [selectedStationId, setSelectedStationId] = useState(preSelectedStationId || "");
  const [selectedConnectorId, setSelectedConnectorId] = useState(preSelectedChargerId || "");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("10:00:00");
  const [currentBattery, setCurrentBattery] = useState(primaryVehicle.currentBatteryPct || 20);
  const [targetBattery, setTargetBattery] = useState(primaryVehicle.targetBatteryPct || 80);
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [capacityWarning, setCapacityWarning] = useState("");

  // Modal State for Razorpay Checkout & Digital Pass
  const [activeBookingHold, setActiveBookingHold] = useState(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [confirmedBookingData, setConfirmedBookingData] = useState(null);

  // Smart Reservation Conflict State
  const [conflictData, setConflictData] = useState(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [isValidatingConflict, setIsValidatingConflict] = useState(false);

  // Load only approved and active stations from database (No hardcoded stations!)
  useEffect(() => {
    stationService.getApprovedStations().then((res) => {
      if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
        setDbStations(res.data);
        if (!selectedStationId) {
          const match = preSelectedStationId
            ? res.data.find(
                (s) =>
                  String(s.id) === String(preSelectedStationId) ||
                  s.stationId === preSelectedStationId
              )
            : res.data[0];
          if (match) setSelectedStationId(match.id);
          else setSelectedStationId(res.data[0].id);
        }
      }
      setLoadingStations(false);
    });
  }, [preSelectedStationId, selectedStationId]);

  const selectedStation = useMemo(() => {
    if (!dbStations || dbStations.length === 0) return null;
    return (
      dbStations.find(
        (s) =>
          String(s.id) === String(selectedStationId) ||
          s.stationId === String(selectedStationId).toUpperCase()
      ) || dbStations[0]
    );
  }, [dbStations, selectedStationId]);

  const connectors = selectedStation?.connectors || selectedStation?.chargers || [];

  // Default select first available connector
  useEffect(() => {
    if (connectors.length > 0) {
      const match = connectors.find(
        (c) => String(c.id) === String(selectedConnectorId) || c.connectorId === selectedConnectorId
      );
      if (!match || (match.status !== "Available" && match.rawStatus !== "AVAILABLE")) {
        const avail = connectors.find(
          (c) => c.status === "Available" || c.rawStatus === "AVAILABLE"
        ) || connectors[0];
        if (avail) {
          setSelectedConnectorId(avail.connectorId || avail.id);
        }
      }
    }
  }, [selectedStation, connectors, selectedConnectorId]);

  const selectedConnector = useMemo(() => {
    return (
      connectors.find(
        (c) =>
          String(c.id) === String(selectedConnectorId) ||
          c.connectorId === selectedConnectorId ||
          c.slotNumber === selectedConnectorId
      ) ||
      connectors[0] || {
        id: 1,
        connectorId: "BAY-01",
        connector: "CCS2",
        connectorType: "CCS2",
        powerKw: 60,
        maxPower: 60,
        pricePerKwh: 18,
        status: "Available",
      }
    );
  }, [connectors, selectedConnectorId]);

  // Master Formulas for Charging Time, Power & Capacity
  const vehicleBatteryCapacity =
    parseFloat(selectedVehicle.batteryCapacity || selectedVehicle.battery_capacity) || 40.5;
  const vehicleMaxPower =
    parseFloat(selectedVehicle.maxChargingPower || selectedVehicle.max_charging_power) || 50.0;
  const connectorMaxPower =
    parseFloat(selectedConnector.powerKw || selectedConnector.maxPower) || 60.0;
  const stationMaxPower =
    parseFloat(selectedStation?.maxPower || selectedStation?.maximumPower) || 120.0;
  const stationCurrentLoad =
    parseFloat(selectedStation?.currentLoad || selectedStation?.currentPower) || 0.0;
  const stationAvailablePower = Math.max(
    0,
    parseFloat(selectedStation?.availablePower ?? stationMaxPower - stationCurrentLoad)
  );

  // Effective Charging Power = min(Vehicle Max Power, Connector Max Power, Available Station Power)
  const effectiveChargingPower = Math.min(
    vehicleMaxPower,
    connectorMaxPower,
    Math.max(10, stationAvailablePower)
  );

  // Energy Required = Battery Capacity * (Target % - Current %) / 100
  const batteryDelta = Math.max(0, targetBattery - currentBattery);
  const rawEnergyRequired = parseFloat(((batteryDelta / 100) * vehicleBatteryCapacity).toFixed(2));

  // Charging Efficiency Buffer (90%)
  const chargingEfficiency = 0.9;
  const adjustedEnergyRequired = parseFloat((rawEnergyRequired / chargingEfficiency).toFixed(2));

  // Estimated Duration = Adjusted Energy / Effective Charging Power (Minutes)
  const estimatedDurationMinutes = Math.max(
    15,
    Math.round((adjustedEnergyRequired / Math.max(1, effectiveChargingPower)) * 60)
  );

  const formatDurationDisplay = (mins) => {
    const hours = Math.floor(mins / 60);
    const remainder = mins % 60;
    if (hours === 0) return `${remainder} Mins`;
    if (remainder === 0) return `${hours} Hour${hours > 1 ? "s" : ""}`;
    return `${hours} hr ${remainder} min`;
  };

  // Base Rate & Dynamic Calculations
  const ratePerKwh = parseFloat(
    selectedConnector?.pricePerKwh || selectedStation?.pricePerKwh || 18.0
  );
  const energyCost = parseFloat((adjustedEnergyRequired * ratePerKwh).toFixed(2));
  const serviceFee = 20.0;
  const subTotal = Math.max(0, energyCost + serviceFee - discountAmount);
  const gstTax = parseFloat((subTotal * 0.18).toFixed(2));
  const totalAmount = parseFloat((subTotal + gstTax).toFixed(2));

  // Coupon handling
  const handleApplyCoupon = (e) => {
    e.preventDefault();
    setCouponError("");
    const found = (coupons || []).find(
      (c) => c.code.toUpperCase() === couponCode.trim().toUpperCase()
    );
    if (found) {
      const discount = Math.min(energyCost, parseFloat(found.discount || 50));
      setDiscountAmount(discount);
      setAppliedCoupon(found);
    } else {
      setCouponError("Invalid coupon code. Try 'FIRST50' or 'EVGREEN'");
    }
  };

  // Validate Step 1
  const handleProceedToStep2 = () => {
    setErrorMsg("");
    if (!selectedStation) {
      setErrorMsg("Please select a valid charging station.");
      return;
    }
    const isAvail =
      selectedConnector?.status === "Available" || selectedConnector?.rawStatus === "AVAILABLE";
    if (!isAvail) {
      setErrorMsg("The selected charging bay is currently occupied. Please choose an available bay.");
      return;
    }
    setCurrentStep(2);
  };

  // Validate Step 2
  const handleProceedToStep3 = () => {
    setErrorMsg("");
    if (targetBattery <= currentBattery) {
      setErrorMsg("Target battery level must be higher than current battery level.");
      return;
    }
    setCurrentStep(3);
  };

  // Initialize Razorpay Test Checkout with Server Conflict Check
  const handleInitiateBooking = async () => {
    if (!selectedStation || !selectedConnector) return;

    setIsValidatingConflict(true);
    setErrorMsg("");

    try {
      const conflictRes = await smartReservationService.checkConflict({
        stationId: selectedStation.id || selectedStation.stationId,
        slotId: selectedConnector.id,
        requestedDate: date,
        requestedStartTime: time,
        durationMinutes: estimatedDurationMinutes,
        customerType: "ONLINE",
      });

      if (conflictRes.conflict) {
        setConflictData(conflictRes);
        setShowConflictModal(true);
        setIsValidatingConflict(false);
        return;
      }
    } catch (err) {
      console.warn("Pre-check conflict error:", err);
    } finally {
      setIsValidatingConflict(false);
    }

    const holdData = {
      stationId: selectedStation.id || selectedStation.stationId,
      stationName: selectedStation.stationName || selectedStation.name,
      networkName: selectedStation.networkName || "GreenCharge",
      connectorId: selectedConnector.connectorId || selectedConnector.id,
      slotId: selectedConnector.id,
      connectorType: selectedConnector.connectorType || selectedConnector.connector,
      vehicleId: selectedVehicle.id,
      vehicleNumber: selectedVehicle.vehicleNumber || selectedVehicle.number,
      vehicleModel: `${selectedVehicle.brand} ${selectedVehicle.model}`,
      date,
      time,
      currentBattery,
      targetBattery,
      batteryDelta,
      energyRequired: rawEnergyRequired,
      adjustedEnergy: adjustedEnergyRequired,
      chargingPower: effectiveChargingPower,
      durationMinutes: estimatedDurationMinutes,
      durationDisplay: formatDurationDisplay(estimatedDurationMinutes),
      energyCost,
      serviceFee,
      tax: gstTax,
      discountAmount,
      couponCode: appliedCoupon?.code,
      totalAmount,
      ratePerKwh,
      paymentMethod: "Razorpay Test Mode",
    };

    setActiveBookingHold(holdData);
    setShowCheckoutModal(true);
  };

  const handleSelectAlternativeFromConflict = (alt) => {
    setShowConflictModal(false);
    if (alt.connectorId || alt.id || alt.slotId) {
      setSelectedConnectorId(alt.connectorId || alt.id || alt.slotId);
    }
  };

  // On Razorpay Payment Success, create booking in MySQL/Backend
  const handlePaymentSuccess = async (paymentRes) => {
    setShowCheckoutModal(false);
    try {
      const payload = {
        station_id: selectedStation.id,
        slot_id: selectedConnector.id,
        connector_id: selectedConnector.connectorId,
        vehicle_id: selectedVehicle.id,
        vehicleNumber: selectedVehicle.vehicleNumber || selectedVehicle.number,
        vehicleType: selectedVehicle.vehicleType || "Car",
        charging_type:
          selectedConnector.connectorType === "Type 2" ? "AC Charging" : "DC Fast Charging",
        current_battery: currentBattery,
        target_battery: targetBattery,
        duration: estimatedDurationMinutes,
        booking_date: date,
        start_time: time,
        amount: totalAmount,
        transactionId:
          paymentRes?.paymentId ||
          paymentRes?.razorpayPaymentId ||
          `pay_test_${Date.now()}`,
        razorpayPaymentId:
          paymentRes?.razorpayPaymentId ||
          paymentRes?.razorpay_payment_id ||
          paymentRes?.paymentId ||
          `pay_rzp_${Date.now()}`,
        razorpayOrderId:
          paymentRes?.razorpayOrderId ||
          paymentRes?.razorpay_order_id ||
          `order_${Date.now()}`,
        payment_method: "Razorpay Test Mode",
      };

      const res = await bookingService.createBooking(payload);
      if (res?.success && res.data) {
        setConfirmedBookingData(res.data);
        addNotification({
          title: "Booking Confirmed! ⚡",
          message: `Booking ${res.data.bookingId} confirmed at ${selectedStation.stationName || selectedStation.name}. Bay: ${selectedConnector.connectorId}.`,
          type: "Payment Successful",
          targetRole: "CUSTOMER",
          counterId: currentUser?.counterId || "CUS0001",
        });
        setShowPassModal(true);
      } else {
        alert(res?.message || "Booking creation failed.");
      }
    } catch (err) {
      alert("Error finalizing booking with server.");
    }
  };

  const stepTitles = [
    { num: 1, title: "Station & Bay", desc: "Select live bay" },
    { num: 2, title: "Schedule & Battery", desc: "Duration & %" },
    { num: 3, title: "Review & Confirm", desc: "Razorpay Checkout" },
  ];

  if (loadingStations) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center theme-card space-y-4 font-sans">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-[var(--accent-primary)] flex items-center justify-center mx-auto animate-pulse">
          <Zap size={24} />
        </div>
        <h3 className="font-bold text-base text-[var(--text-primary)]">Loading Approved Stations...</h3>
        <p className="text-xs text-[var(--text-muted)]">Connecting to EV Charging Network Database</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans text-[var(--text-primary)] pb-12">
      {/* Top Banner - Fully Responsive to Light/Dark Mode */}
      <div className="theme-card p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">
                DYNAMIC CAPACITY ENGINE
              </span>
              <span className="text-xs font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full border border-blue-500/20">
                RAZORPAY TEST MODE
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
              <CalendarCheck size={28} className="text-[var(--accent-primary)]" /> Book EV Charging Bay
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Real-time bay availability, automatic battery duration calculation, and instant slot reservation.
            </p>
          </div>
        </div>

        {/* 3-Step Interactive Stepper Bar */}
        <div className="grid grid-cols-3 gap-2 md:gap-4 mt-6 pt-5 border-t border-[var(--border-subtle)]">
          {stepTitles.map((step) => {
            const isCompleted = currentStep > step.num;
            const isCurrent = currentStep === step.num;
            return (
              <button
                key={step.num}
                type="button"
                onClick={() => {
                  if (step.num < currentStep) setCurrentStep(step.num);
                }}
                className={`flex items-center gap-3 p-3 rounded-2xl transition-all text-left cursor-pointer ${
                  isCurrent
                    ? "bg-[var(--accent-light)] border border-[var(--accent-primary)] text-[var(--accent-primary)] shadow-sm font-bold"
                    : isCompleted
                    ? "bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                    : "bg-[var(--bg-surface-raised)]/50 border border-[var(--border-subtle)]/50 text-[var(--text-muted)] opacity-60"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono text-xs font-black shrink-0 ${
                    isCurrent
                      ? "bg-[var(--accent-primary)] text-white"
                      : isCompleted
                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-[var(--border-subtle)] text-[var(--text-muted)]"
                  }`}
                >
                  {isCompleted ? <Check size={14} /> : step.num}
                </div>
                <div className="hidden sm:block">
                  <span className="block text-xs font-bold leading-tight">{step.title}</span>
                  <span className="text-[10px] text-[var(--text-muted)] leading-tight">{step.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {capacityWarning && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2.5">
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold text-amber-800 dark:text-amber-200">Station Grid Notice</strong>
            <span>{capacityWarning}</span>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: Select Station & Connector Bay */}
      {currentStep === 1 && (
        <div className="theme-card p-6 md:p-8 space-y-6">
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <MapPin size={20} className="text-[var(--accent-primary)]" /> Step 1: Select Charging Station & Connector Bay
          </h2>

          {/* Vehicle Selector */}
          <div>
            <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-2">
              Select Your Vehicle
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(userVehicles.length > 0 ? userVehicles : [primaryVehicle]).map((veh) => {
                const isSelected =
                  (selectedVehicle?.vehicleNumber || selectedVehicle?.number) ===
                  (veh.vehicleNumber || veh.number);
                return (
                  <div
                    key={veh.id || veh.vehicleNumber}
                    onClick={() => setSelectedVehicle(veh)}
                    className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? "bg-[var(--accent-light)] border-[var(--accent-primary)] shadow-sm"
                        : "bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-[var(--accent-primary)]">
                        <Car size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[var(--text-primary)]">
                          {veh.brand} {veh.model}
                        </h4>
                        <p className="text-xs text-[var(--text-muted)] font-mono">
                          {veh.vehicleNumber || veh.number}
                        </p>
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold block">
                        {veh.batteryCapacity || 40.5} kWh
                      </span>
                      <span className="text-[var(--text-muted)] text-[10px]">
                        Max {veh.maxChargingPower || 50} kW
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Station Selector - Dynamic from DB */}
          <div>
            <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-2">
              Select Charging Station
            </label>
            <select
              value={selectedStation?.id || ""}
              onChange={(e) => setSelectedStationId(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] font-medium cursor-pointer"
            >
              {dbStations.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.stationName || st.name} ({st.networkName || "EV Network"}) — {st.city} (Cap: {st.maxPower || 120} kW, Avail: {st.availablePower || 100} kW)
                </option>
              ))}
            </select>
          </div>

          {/* Station Power Monitor Banner */}
          {selectedStation && (
            <div className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div>
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Max Station Power</span>
                <span className="font-extrabold text-[var(--text-primary)] text-sm">{stationMaxPower} kW</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Current Grid Load</span>
                <span className="font-extrabold text-amber-500 text-sm">{stationCurrentLoad} kW</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Available Power</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">{stationAvailablePower} kW</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Grid Load %</span>
                <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">{selectedStation.loadPercentage || 0}%</span>
              </div>
            </div>
          )}

          {/* Connectors / Bays List */}
          <div>
            <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-2">
              Select Charging Bay (Smart Availability)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {connectors.map((c) => {
                const isSelected =
                  (selectedConnector?.connectorId || selectedConnector?.id) === (c.connectorId || c.id);
                const isAvail = c.status === "Available" || c.rawStatus === "AVAILABLE";

                return (
                  <div
                    key={c.connectorId || c.id}
                    onClick={() => {
                      if (isAvail) {
                        setSelectedConnectorId(c.connectorId || c.id);
                        setErrorMsg("");
                      } else {
                        setErrorMsg(`Bay ${c.slotNumber || c.connectorId} is occupied. Please select an available bay.`);
                      }
                    }}
                    className={`p-4 rounded-2xl border transition flex items-center justify-between ${
                      !isAvail
                        ? "opacity-60 bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] cursor-not-allowed"
                        : isSelected
                        ? "bg-[var(--accent-light)] border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)] cursor-pointer"
                        : "bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/50 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-[var(--accent-primary)] font-mono font-bold text-xs">
                        {c.slotNumber || "BAY"}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[var(--text-primary)]">{c.connectorId || "Connector"}</h4>
                        <p className="text-xs text-[var(--text-muted)]">
                          {c.connectorType || c.connector || "CCS2"} • {c.powerKw || 60} kW
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border block mb-1 ${
                          isAvail
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                        }`}
                      >
                        {isAvail ? "🟢 Available" : "🔴 Occupied"}
                      </span>
                      <span className="font-mono text-xs text-[var(--accent-primary)] font-bold">
                        ₹{c.pricePerKwh || 18}/kWh
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)] flex justify-end">
            <button
              onClick={handleProceedToStep2}
              className="px-6 py-3 rounded-2xl bg-[var(--accent-primary)] hover:opacity-90 text-white font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer"
            >
              Continue to Schedule <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Battery Requirements & Schedule */}
      {currentStep === 2 && (
        <div className="theme-card p-6 md:p-8 space-y-6">
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Clock size={20} className="text-[var(--accent-primary)]" /> Step 2: Battery Requirements & Charging Schedule
          </h2>

          {/* Battery Sliders */}
          <div className="space-y-4 bg-[var(--bg-surface-raised)] p-5 rounded-2xl border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)]">Current Battery Level</span>
              <span className="text-sm font-mono font-extrabold text-amber-500">{currentBattery}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="95"
              value={currentBattery}
              onChange={(e) => setCurrentBattery(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer"
            />

            <div className="flex items-center justify-between pt-3">
              <span className="text-xs font-bold text-[var(--text-primary)]">Target Battery Level</span>
              <span className="text-sm font-mono font-extrabold text-emerald-600 dark:text-emerald-400">{targetBattery}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={targetBattery}
              onChange={(e) => setTargetBattery(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Automatic Dynamic Calculation Display Card */}
          <div className="p-5 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)] flex items-center gap-1.5 font-mono">
              <Gauge size={14} /> Live Charging-Time & Power Calculation
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Battery Capacity</span>
                <span className="font-extrabold text-[var(--text-primary)] text-sm">{vehicleBatteryCapacity} kWh</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Energy Required</span>
                <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">{rawEnergyRequired} kWh</span>
                <span className="text-[10px] text-[var(--text-muted)] block">Adj: {adjustedEnergyRequired} kWh</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Effective Power</span>
                <span className="font-extrabold text-amber-500 text-sm">{effectiveChargingPower} kW</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Est. Charging Time</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">{formatDurationDisplay(estimatedDurationMinutes)}</span>
              </div>
            </div>
          </div>

          {/* Date & Time Slot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-2">Charging Date</label>
              <input
                type="date"
                value={date}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3.5 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-2">Start Time Slot</label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full p-3.5 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] font-medium cursor-pointer"
              >
                {TIME_SLOTS.map((s) => (
                  <option key={s.time} value={s.time}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-5 py-3 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold text-xs uppercase transition flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft size={16} /> Back
            </button>

            <button
              onClick={handleProceedToStep3}
              className="px-6 py-3 rounded-2xl bg-[var(--accent-primary)] hover:opacity-90 text-white font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer"
            >
              Review & Pay <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Review & Razorpay Payment */}
      {currentStep === 3 && (
        <div className="theme-card p-6 md:p-8 space-y-6">
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <CreditCard size={20} className="text-[var(--accent-primary)]" /> Step 3: Review Reservation & Razorpay Checkout
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Booking Summary Card */}
            <div className="p-5 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-3 text-xs font-mono">
              <h4 className="font-bold text-[var(--text-primary)] text-sm font-sans">Reservation Summary</h4>
              <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                <span className="text-[var(--text-muted)]">Station:</span>
                <span className="font-bold text-[var(--text-primary)]">{selectedStation?.stationName || selectedStation?.name}</span>
              </div>
              <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                <span className="text-[var(--text-muted)]">Connector Bay:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedConnector?.connectorId} ({selectedConnector?.connectorType})
                </span>
              </div>
              <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                <span className="text-[var(--text-muted)]">Vehicle:</span>
                <span className="font-bold text-[var(--text-primary)]">
                  {selectedVehicle?.brand} {selectedVehicle?.model} ({selectedVehicle?.vehicleNumber || selectedVehicle?.number})
                </span>
              </div>
              <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                <span className="text-[var(--text-muted)]">Battery Goal:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{currentBattery}% → {targetBattery}%</span>
              </div>
              <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                <span className="text-[var(--text-muted)]">Energy Required:</span>
                <span className="font-bold text-[var(--text-primary)]">{rawEnergyRequired} kWh</span>
              </div>
              <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                <span className="text-[var(--text-muted)]">Charging Power:</span>
                <span className="font-bold text-amber-500">{effectiveChargingPower} kW</span>
              </div>
              <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                <span className="text-[var(--text-muted)]">Estimated Duration:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{formatDurationDisplay(estimatedDurationMinutes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Schedule:</span>
                <span className="font-bold text-[var(--text-primary)]">{date} at {time.slice(0, 5)}</span>
              </div>
            </div>

            {/* Financials & Promo Card */}
            <div className="p-5 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-3 text-xs font-mono flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-[var(--text-primary)] text-sm font-sans mb-3">Cost Breakdown</h4>
                <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                  <span className="text-[var(--text-muted)]">Energy ({adjustedEnergyRequired} kWh @ ₹{ratePerKwh}/kWh):</span>
                  <span className="font-bold text-[var(--text-primary)]">₹{energyCost}</span>
                </div>
                <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                  <span className="text-[var(--text-muted)]">Platform Service Fee:</span>
                  <span className="font-bold text-[var(--text-primary)]">₹{serviceFee}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2 text-emerald-600 dark:text-emerald-400">
                    <span>Promo Discount ({appliedCoupon?.code}):</span>
                    <span>-₹{discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                  <span className="text-[var(--text-muted)]">GST (18%):</span>
                  <span className="font-bold text-[var(--text-primary)]">₹{gstTax}</span>
                </div>
                <div className="flex justify-between pt-2 text-sm font-extrabold">
                  <span className="text-[var(--text-primary)]">Total Payable:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-base">₹{totalAmount}</span>
                </div>
              </div>

              {/* Coupon Input */}
              <div className="pt-3 border-t border-[var(--border-subtle)]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Coupon (e.g. FIRST50)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] uppercase focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-white font-bold text-xs cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
                {couponError && <p className="text-[10px] text-rose-500 mt-1">{couponError}</p>}
                {appliedCoupon && <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">✓ Coupon {appliedCoupon.code} applied!</p>}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-5 py-3 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold text-xs uppercase transition flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft size={16} /> Back
            </button>

            <button
              onClick={handleInitiateBooking}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-500/25 transition flex items-center gap-2 cursor-pointer"
            >
              <CreditCard size={18} /> Pay ₹{totalAmount} with Razorpay
            </button>
          </div>
        </div>
      )}

      {/* Razorpay Test Checkout Modal */}
      {showCheckoutModal && activeBookingHold && (
        <RazorpayCheckoutModal
          booking={activeBookingHold}
          onClose={() => setShowCheckoutModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Booking Pass Modal */}
      {showPassModal && confirmedBookingData && (
        <BookingPassModal
          booking={confirmedBookingData}
          onClose={() => {
            setShowPassModal(false);
            navigate("/customer/bookings");
          }}
          onViewInvoice={() => setShowInvoiceModal(true)}
        />
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && confirmedBookingData && (
        <InvoiceModal
          booking={confirmedBookingData}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}

      {/* Conflict Modal */}
      {showConflictModal && conflictData && (
        <ConflictModal
          isOpen={showConflictModal}
          onClose={() => setShowConflictModal(false)}
          conflictData={conflictData}
          onSelectAlternative={handleSelectAlternativeFromConflict}
          userRole="CUSTOMER"
        />
      )}
    </div>
  );
}