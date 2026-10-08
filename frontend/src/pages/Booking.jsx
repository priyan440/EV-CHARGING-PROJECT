import { useState, useEffect, useMemo, useCallback } from "react";
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
  Plus,
  X,
  FileText,
  QrCode,
  CheckCircle,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useSystemState } from "../contexts/SystemStateContext";
import { useNotifications } from "../contexts/NotificationContext";
import RazorpayCheckoutModal from "../components/RazorpayCheckoutModal";
import BookingPassModal from "../components/BookingPassModal";
import InvoiceModal from "../components/InvoiceModal";
import { stationService } from "../services/stationService";
import { bookingService } from "../services/bookingService";
import { vehicleService } from "../services/vehicleService";

// Helper for local YYYY-MM-DD
const getLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Generate dynamic 15-minute interval time slots across 24 hours
export const generateDynamicTimeSlots = () => {
  const slots = [];
  for (let m = 0; m < 1440; m += 15) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const time24 = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    const ampm = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const time12 = `${String(displayH).padStart(2, "0")}:${String(min).padStart(2, "0")} ${ampm}`;

    let tag = "Standard";
    if (h >= 6 && h < 11) tag = "Morning";
    else if (h >= 11 && h < 17) tag = "Standard";
    else if (h >= 17 && h < 21) tag = "Peak Surge +25%";
    else tag = "Off-Peak Saver -15%";

    slots.push({
      time: time24,
      label: `${time12} (${tag})`,
      minutes: m,
    });
  }
  return slots;
};

const TIME_SLOTS = generateDynamicTimeSlots();

const DURATION_OPTIONS = [
  { value: 0.25, label: "15 Minutes", minutes: 15 },
  { value: 0.33, label: "20 Minutes", minutes: 20 },
  { value: 0.5, label: "30 Minutes", minutes: 30 },
  { value: 0.75, label: "45 Minutes", minutes: 45 },
  { value: 1, label: "1 Hour", minutes: 60 },
  { value: 1.5, label: "1.5 Hours", minutes: 90 },
  { value: 2, label: "2 Hours", minutes: 120 },
  { value: 3, label: "3 Hours", minutes: 180 },
];

export default function Booking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedStationId = searchParams.get("stationId") || "";

  const { currentUser } = useAuth();
  const { coupons } = useSystemState();
  const { addNotification } = useNotifications();

  // 7-Step Sequential Booking Flow
  // Step 1: Vehicle & Auto-Connector | Step 2: Station | Step 3: Schedule (Date, Time, Duration)
  // Step 4: Compatible Connectors | Step 5: Review & Summary | Step 6: Payment | Step 7: Confirmation
  const [currentStep, setCurrentStep] = useState(1);

  // Dynamic Data from MySQL Database
  const [userVehicles, setUserVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [dbStations, setDbStations] = useState([]);
  const [loadingStations, setLoadingStations] = useState(true);

  // Selections
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedStationId, setSelectedStationId] = useState(preSelectedStationId || "");
  const [selectedStation, setSelectedStation] = useState(null);

  // Date, Time & Duration Configuration
  const [date, setDate] = useState(() => getLocalDateStr(new Date()));
  const [startTime, setStartTime] = useState("10:00");
  const [durationHours, setDurationHours] = useState(1);
  const [currentBattery, setCurrentBattery] = useState(60);
  const [targetBattery, setTargetBattery] = useState(80);

  // Real-Time Compatible Connectors from Backend
  const [compatibleConnectors, setCompatibleConnectors] = useState([]);
  const [allStationConnectors, setAllStationConnectors] = useState([]);
  const [loadingConnectors, setLoadingConnectors] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState(null);

  // Financials & Discounts
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [conflictError, setConflictError] = useState("");

  // Quick Add Vehicle Modal
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [connectorTypesList, setConnectorTypesList] = useState([]);
  const [newVehicleForm, setNewVehicleForm] = useState({
    manufacturer: "Tata Motors",
    model: "Nexon EV Max",
    vehicleNumber: "TN01EV" + Math.floor(1000 + Math.random() * 9000),
    vehicleType: "Car",
    batteryCapacity: 40.5,
    connectorType: "CCS2",
  });
  const [addingVehicle, setAddingVehicle] = useState(false);

  // Modal State for Razorpay Checkout, Digital Pass & Invoices
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [confirmedBookingData, setConfirmedBookingData] = useState(null);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // 1. Load User's Vehicles from MySQL
  const loadUserVehicles = async () => {
    setLoadingVehicles(true);
    try {
      const liveVehicles = await vehicleService.fetchVehicles();
      if (Array.isArray(liveVehicles) && liveVehicles.length > 0) {
        setUserVehicles(liveVehicles);
        if (!selectedVehicle) {
          setSelectedVehicle(liveVehicles[0]);
          setCurrentBattery(liveVehicles[0].batteryPercentage || 60);
        }
      } else {
        setUserVehicles([]);
      }
    } catch (err) {
      console.warn("Error loading vehicles from backend:", err);
      setUserVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  };

  useEffect(() => {
    loadUserVehicles();
  }, [currentUser]);

  // Load Connector Types for add vehicle modal
  useEffect(() => {
    vehicleService.getConnectorTypes().then((types) => {
      setConnectorTypesList(Array.isArray(types) ? types : []);
    });
  }, []);

  // 2. Load Approved Stations from MySQL
  useEffect(() => {
    stationService.getApprovedStations().then((res) => {
      if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
        setDbStations(res.data);
        const match = preSelectedStationId
          ? res.data.find(
              (s) =>
                String(s.id) === String(preSelectedStationId) ||
                s.stationId === preSelectedStationId
            )
          : res.data[0];
        if (match) {
          setSelectedStationId(match.id);
          setSelectedStation(match);
        } else {
          setSelectedStationId(res.data[0].id);
          setSelectedStation(res.data[0]);
        }
      }
      setLoadingStations(false);
    });
  }, [preSelectedStationId]);

  // Sync selectedStation when selectedStationId changes
  useEffect(() => {
    if (dbStations.length > 0 && selectedStationId) {
      const found = dbStations.find(
        (s) => String(s.id) === String(selectedStationId) || s.stationId === String(selectedStationId).toUpperCase()
      );
      if (found) setSelectedStation(found);
    }
  }, [selectedStationId, dbStations]);

  // 3. Calculated End Time & Duration
  const durationMinutes = useMemo(() => {
    return Math.round(durationHours * 60);
  }, [durationHours]);

  const calculatedEndTime = useMemo(() => {
    try {
      const parts = (startTime || "10:00").split(":");
      const hrs = parseInt(parts[0], 10) || 10;
      const mins = parseInt(parts[1], 10) || 0;
      const totalMins = hrs * 60 + mins + durationMinutes;
      const endH = Math.floor(totalMins / 60) % 24;
      const endM = totalMins % 60;
      return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    } catch {
      return "11:00";
    }
  }, [startTime, durationMinutes]);

  const formatTimeDisplay = (time24) => {
    if (!time24) return "10:00 AM";
    const parts = time24.split(":");
    let h = parseInt(parts[0], 10);
    const m = parts[1] || "00";
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    h = h ? h : 12;
    return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
  };

  // 4. Fetch Real-time Available Connectors from MySQL
  const fetchAvailableConnectors = useCallback(async () => {
    if (!selectedVehicle?.id || !selectedStation?.id) return;
    setLoadingConnectors(true);
    setConflictError("");
    setErrorMsg("");

    try {
      const res = await bookingService.getAvailableConnectors({
        vehicleId: selectedVehicle.id,
        stationId: selectedStation.id,
        date,
        startTime,
        duration: durationHours,
      });

      if (res?.success) {
        setCompatibleConnectors(res.connectors || []);
        setAllStationConnectors(res.allStationConnectors || []);

        // Auto-select first available compatible connector if none selected or if previous is unavailable
        const availableOnes = (res.connectors || []).filter((c) => c.isAvailable);
        if (availableOnes.length > 0) {
          setSelectedConnector((prev) => {
            const currentValid = prev
              ? availableOnes.find((c) => c.id === prev.id || c.connectorId === prev.connectorId)
              : null;
            return currentValid || availableOnes[0];
          });
        } else {
          setSelectedConnector(null);
        }
      } else {
        setCompatibleConnectors([]);
        setSelectedConnector(null);
        setErrorMsg(res.message || "Failed to check connector availability.");
      }
    } catch (err) {
      console.error("fetchAvailableConnectors error:", err);
      setCompatibleConnectors([]);
      setSelectedConnector(null);
    } finally {
      setLoadingConnectors(false);
    }
  }, [selectedVehicle?.id, selectedStation?.id, date, startTime, durationHours]);

  // Refetch available connectors whenever step 4 is reached or vehicle/station/time changes
  useEffect(() => {
    if (currentStep >= 4 && selectedVehicle?.id && selectedStation?.id) {
      fetchAvailableConnectors();
    }
  }, [currentStep, selectedVehicle?.id, selectedStation?.id, date, startTime, durationHours, fetchAvailableConnectors]);

  // 5. Dynamic Authoritative SOC, Energy, Power & Pricing Calculations
  const vehicleBatteryCapacity = parseFloat(selectedVehicle?.batteryCapacityKwh || selectedVehicle?.batteryCapacity || selectedVehicle?.battery_capacity) || 40.5;
  const vehicleConnectorType = selectedVehicle?.connectorType || selectedVehicle?.connector_type || "CCS2";
  const vehicleMaxPower = parseFloat(selectedVehicle?.max_charging_power_kw) || 150.0;
  const connectorPower = parseFloat(selectedConnector?.powerKw || selectedConnector?.power_kw) || 150.0;
  const stationMaxPower = parseFloat(selectedStation?.maxPower || 150.0);

  // SOC Business Validation Rule
  const socValidationError = useMemo(() => {
    if (isNaN(currentBattery) || currentBattery < 0 || currentBattery > 100) {
      return "Current battery level must be between 0% and 100%.";
    }
    if (isNaN(targetBattery) || targetBattery < 0 || targetBattery > 100) {
      return "Target battery level must be between 0% and 100%.";
    }
    if (currentBattery === 100) {
      return "Vehicle battery is already fully charged.";
    }
    if (targetBattery === currentBattery) {
      return "No additional charging is required.";
    }
    if (targetBattery < currentBattery) {
      return "Target battery level must be greater than the current battery level.";
    }
    return "";
  }, [currentBattery, targetBattery]);

  const socDifference = useMemo(() => {
    return Math.max(0, targetBattery - currentBattery);
  }, [targetBattery, currentBattery]);

  // Required Energy (kWh) = Battery Capacity × (Target SOC - Current SOC) / 100
  const energyRequiredKwh = useMemo(() => {
    if (targetBattery <= currentBattery) return 0;
    return parseFloat(((vehicleBatteryCapacity * (targetBattery - currentBattery)) / 100).toFixed(2));
  }, [vehicleBatteryCapacity, targetBattery, currentBattery]);

  // Charging Efficiency (Default 90%)
  const chargingEfficiency = 0.90;
  const estimatedGridEnergyKwh = useMemo(() => {
    if (energyRequiredKwh <= 0) return 0;
    return parseFloat((energyRequiredKwh / chargingEfficiency).toFixed(2));
  }, [energyRequiredKwh]);

  // Station Tariff (e.g. ₹15/kWh from MySQL)
  const tariffPerKwh = parseFloat(selectedStation?.energy_tariff_per_kwh || selectedStation?.pricePerKwh || selectedStation?.chargingPrice || 15.0);

  // Estimated Energy Cost = Estimated Grid Energy × Tariff
  const estimatedEnergyCost = useMemo(() => {
    return parseFloat((estimatedGridEnergyKwh * tariffPerKwh).toFixed(2));
  }, [estimatedGridEnergyKwh, tariffPerKwh]);

  // Effective Power = MIN(Vehicle Max Charging Power, Connector Power, Station Charger Power)
  const effectivePowerKw = useMemo(() => {
    return Math.min(vehicleMaxPower, connectorPower, stationMaxPower);
  }, [vehicleMaxPower, connectorPower, stationMaxPower]);

  // Estimated Duration Calculation
  const estimatedChargingMinutes = useMemo(() => {
    if (energyRequiredKwh <= 0 || effectivePowerKw <= 0) return 15;
    const hours = energyRequiredKwh / effectivePowerKw;
    return Math.max(15, Math.round(hours * 60));
  }, [energyRequiredKwh, effectivePowerKw]);

  const estimatedChargingTimeStr = useMemo(() => {
    if (estimatedChargingMinutes >= 60) {
      const h = Math.floor(estimatedChargingMinutes / 60);
      const m = estimatedChargingMinutes % 60;
      return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
    }
    return `${estimatedChargingMinutes} minutes`;
  }, [estimatedChargingMinutes]);

  // Separated Billing Components
  const platformFee = 10.0;
  const parkingFee = 0.0;
  const subtotal = estimatedEnergyCost + platformFee + parkingFee;
  const gstAmount = parseFloat((subtotal * 0.18).toFixed(2));
  const preDiscountTotal = parseFloat((subtotal + gstAmount).toFixed(2));
  const totalAmount = Math.max(0, parseFloat((preDiscountTotal - discountAmount).toFixed(2)));

  // Apply Coupon
  const handleApplyCoupon = (e) => {
    e.preventDefault();
    setCouponError("");
    const trimmed = couponCode.trim().toUpperCase();
    if (!trimmed) return;

    const matched = coupons.find((c) => c.code.toUpperCase() === trimmed && c.active);
    if (!matched) {
      setCouponError("Invalid or expired coupon code.");
      return;
    }
    if (subtotal < (matched.minAmount || 0)) {
      setCouponError(`Minimum order amount of ₹${matched.minAmount} required.`);
      return;
    }

    let disc = 0;
    if (matched.discountType === "PERCENTAGE") {
      disc = (subtotal * matched.discountValue) / 100;
      if (matched.maxDiscount) disc = Math.min(disc, matched.maxDiscount);
    } else {
      disc = matched.discountValue;
    }

    setDiscountAmount(parseFloat(disc.toFixed(2)));
    setAppliedCoupon(matched);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode("");
  };

  // Quick Add Vehicle Handler
  const handleAddVehicleSubmit = async (e) => {
    e.preventDefault();
    if (!newVehicleForm.vehicleNumber || !newVehicleForm.model) return;

    setAddingVehicle(true);
    try {
      const added = await vehicleService.addVehicle({
        vehicleNumber: newVehicleForm.vehicleNumber.toUpperCase(),
        vehicleType: newVehicleForm.vehicleType,
        brand: newVehicleForm.manufacturer,
        manufacturer: newVehicleForm.manufacturer,
        model: newVehicleForm.model,
        batteryCapacity: parseFloat(newVehicleForm.batteryCapacity),
        connectorType: newVehicleForm.connectorType,
      });

      await loadUserVehicles();
      setSelectedVehicle(added);
      setShowAddVehicleModal(false);
      setErrorMsg("");
    } catch (err) {
      setErrorMsg(err.message || "Failed to add vehicle.");
    } finally {
      setAddingVehicle(false);
    }
  };

  // Step Navigations
  const handleProceedToStep2 = () => {
    if (!selectedVehicle || !selectedVehicle.id) {
      setErrorMsg("Please select your vehicle to continue.");
      return;
    }
    setErrorMsg("");
    setCurrentStep(2);
  };

  const handleProceedToStep3 = () => {
    if (!selectedStation) {
      setErrorMsg("Please select a charging station.");
      return;
    }
    setErrorMsg("");
    setCurrentStep(3);
  };

  const handleProceedToStep4 = () => {
    // Validate date & time
    const today = new Date().toISOString().split("T")[0];
    if (date < today) {
      setErrorMsg("Booking date cannot be in the past.");
      return;
    }
    setErrorMsg("");
    setCurrentStep(4);
  };

  const handleProceedToStep5 = () => {
    if (!selectedConnector || !selectedConnector.isAvailable) {
      setErrorMsg("Please select an available compatible connector.");
      return;
    }
    setErrorMsg("");
    setCurrentStep(5);
  };

  const handleProceedToStep6 = () => {
    setErrorMsg("");
    setCurrentStep(6);
  };

  // Final Availability Validation & Atomic Booking Creation
  const handleFinalBookingCreation = async (paymentRef) => {
    setIsSubmittingBooking(true);
    setErrorMsg("");
    setConflictError("");

    try {
      const payload = {
        station_id: Number(selectedStation.id),
        stationId: Number(selectedStation.id),
        connector_id: Number(selectedConnector.id),
        connectorId: Number(selectedConnector.id),
        charger_id: Number(selectedConnector.chargerId || selectedConnector.id),
        chargerId: Number(selectedConnector.chargerId || selectedConnector.id),
        vehicle_id: Number(selectedVehicle.id),
        vehicleId: Number(selectedVehicle.id),
        vehicleNumber: selectedVehicle.vehicleNumber || selectedVehicle.registrationNumber,
        vehicleType: selectedVehicle.vehicleType || "4W",
        booking_date: date,
        bookingDate: date,
        start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
        duration_minutes: durationMinutes,
        durationMinutes,
        duration: durationHours,
        current_soc_percent: currentBattery,
        currentSoc: currentBattery,
        target_soc_percent: targetBattery,
        targetSoc: targetBattery,
        energy_kwh: estimatedGridEnergyKwh,
        amount: totalAmount,
        totalAmount,
        payment_id: paymentRef?.paymentId || paymentRef?.payment_id || `PAY_${Date.now()}`,
        paymentId: paymentRef?.paymentId || paymentRef?.payment_id || `PAY_${Date.now()}`,
        payment_method: paymentRef?.paymentMethod || paymentRef?.method || "ONLINE",
        paymentMethod: paymentRef?.paymentMethod || paymentRef?.method || "ONLINE",
        payment_status: "PAID",
        status: "CONFIRMED",
      };

      const res = await bookingService.createBooking(payload);

      if (res?.success && res.data) {
        setConfirmedBookingData(res.data);
        addNotification({
          title: "Booking Confirmed! ⚡",
          message: `Booking ${res.data.bookingId} confirmed at ${selectedStation.stationName}. Connector: ${selectedConnector.connectorNumber || "Connector 01"} (${selectedConnector.connectorType}).`,
          type: "Payment Successful",
          targetRole: "CUSTOMER",
          counterId: currentUser?.counterId || "CUS0001",
        });
        setCurrentStep(7); // Move to Step 7: Confirmation
      } else {
        // Handle double booking conflict
        if (res?.statusCode === 409 || res?.message?.toLowerCase().includes("booked") || res?.message?.toLowerCase().includes("conflict")) {
          setConflictError(res.message || "Sorry, this connector was just booked by another user. Please select another connector.");
          setCurrentStep(4); // Redirect back to step 4 to pick another available connector
          await fetchAvailableConnectors();
        } else {
          setErrorMsg(res?.message || "Booking creation failed. Please verify your selected slot.");
          setCurrentStep(5);
        }
      }
    } catch (err) {
      console.error("Booking submission error:", err);
      setErrorMsg(err.message || "Error finalizing reservation with server.");
      setCurrentStep(5);
    } finally {
      setIsSubmittingBooking(false);
      setShowCheckoutModal(false);
    }
  };

  const stepTitles = [
    { num: 1, title: "Vehicle", desc: "Select EV" },
    { num: 2, title: "Station", desc: "Select Station" },
    { num: 3, title: "Schedule", desc: "Date & Time" },
    { num: 4, title: "Connector", desc: "Compatible Bay" },
    { num: 5, title: "Review", desc: "Price Breakdown" },
    { num: 6, title: "Payment", desc: "Checkout" },
    { num: 7, title: "Confirmation", desc: "Digital Receipt" },
  ];

  if (loadingStations || loadingVehicles) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center theme-card space-y-4 font-sans">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-[var(--accent-primary)] flex items-center justify-center mx-auto animate-pulse shadow-md">
          <Zap size={28} />
        </div>
        <h3 className="font-extrabold text-base text-[var(--text-primary)]">Loading Booking System...</h3>
        <p className="text-xs text-[var(--text-muted)]">Verifying real-time MySQL database & connector compatibility engine</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans text-[var(--text-primary)] pb-12">
      {/* Top Banner & Multi-Step Progress Header */}
      <div className="theme-card p-6 md:p-8 rounded-3xl shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                CONNECTOR COMPATIBILITY ENGINE
              </span>
              <span className="text-xs font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full border border-blue-500/20">
                REAL-TIME MYSQL SLOTS
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] flex items-center gap-2.5">
              <CalendarCheck size={30} className="text-blue-600 dark:text-blue-400" /> Book Charging Slot
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Select vehicle → auto-detect connector → pick station & time → reserve available compatible port.
            </p>
          </div>
        </div>

        {/* 7-Step Interactive Stepper Bar */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 md:gap-2 mt-6 pt-5 border-t border-[var(--border-subtle)]">
          {stepTitles.map((step) => {
            const isCompleted = currentStep > step.num;
            const isCurrent = currentStep === step.num;
            return (
              <button
                key={step.num}
                type="button"
                onClick={() => {
                  if (step.num < currentStep && currentStep !== 7) setCurrentStep(step.num);
                }}
                disabled={step.num > currentStep || currentStep === 7}
                className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all text-center ${
                  isCurrent
                    ? "bg-blue-600/15 border border-blue-500/40 text-blue-600 dark:text-blue-400 font-bold shadow-sm"
                    : isCompleted
                    ? "bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] cursor-pointer"
                    : "bg-[var(--bg-surface-raised)]/40 border border-[var(--border-subtle)]/40 text-[var(--text-muted)] opacity-50 cursor-not-allowed"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono text-[11px] font-black shrink-0 mb-1 ${
                    isCurrent
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                      : isCompleted
                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-[var(--border-subtle)] text-[var(--text-muted)]"
                  }`}
                >
                  {isCompleted ? <Check size={12} /> : step.num}
                </div>
                <span className="block text-[10px] font-bold leading-tight truncate w-full">{step.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conflict / Error Alerts */}
      {conflictError && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5 animate-bounce">
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold">Slot Occupied Notice:</strong>
            <span>{conflictError}</span>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: VEHICLE SELECTION & AUTOMATIC CONNECTOR DETECTION                 */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="theme-card p-6 md:p-8 rounded-3xl space-y-6 animate-fade-in shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                <Car size={22} className="text-blue-600 dark:text-blue-400" /> Step 1: Select Your Registered Vehicle
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                The system automatically detects your vehicle connector type from MySQL. No manual connector selection needed.
              </p>
            </div>
            <button
              onClick={() => setShowAddVehicleModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Add EV
            </button>
          </div>

          {userVehicles.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-[var(--border-subtle)] text-center space-y-3 bg-[var(--bg-surface-raised)]/50">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Car size={24} />
              </div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">No Registered Vehicle Found</h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                Please add your electric vehicle so we can automatically match compatible chargers.
              </p>
              <button
                onClick={() => setShowAddVehicleModal(true)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer"
              >
                + Register Vehicle
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {userVehicles.map((veh) => {
                  const isSelected = selectedVehicle?.id === veh.id;
                  const connName = veh.connectorType || veh.connector_type || "CCS2";

                  return (
                    <div
                      key={veh.id}
                      onClick={() => {
                        setSelectedVehicle(veh);
                        setErrorMsg("");
                      }}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                        isSelected
                          ? "bg-blue-600/10 border-blue-500 ring-2 ring-blue-500/40 shadow-md"
                          : "bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] hover:border-blue-500/40 hover:bg-[var(--bg-surface-raised)]/80"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
                              isSelected
                                ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                                : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            }`}
                          >
                            <Car size={24} />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-sm text-[var(--text-primary)]">
                              {veh.brand || veh.manufacturer} {veh.model}
                            </h4>
                            <span className="text-xs font-mono font-bold text-[var(--text-secondary)] block mt-0.5">
                              {veh.registrationNumber || veh.vehicleNumber}
                            </span>
                          </div>
                        </div>

                        {isSelected ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-black bg-emerald-500 text-white shadow-sm flex items-center gap-1">
                            <Check size={12} /> SELECTED
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--text-muted)] font-mono border border-[var(--border-subtle)] px-2 py-0.5 rounded-md">
                            Click to select
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--border-subtle)]/50 text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] block uppercase font-medium">Battery</span>
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                            {veh.batteryCapacity || 40.5} kWh
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] block uppercase font-medium">Type</span>
                          <span className="font-extrabold text-[var(--text-primary)]">
                            {veh.vehicleType || "4W"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] block uppercase font-medium">Connector</span>
                          <span className="font-extrabold text-blue-600 dark:text-blue-400">
                            {connName}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* AUTOMATIC CONNECTOR DETECTION CARD (Exact Requirement) */}
              {selectedVehicle && (
                <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-emerald-600/10 border border-blue-500/30 flex items-start gap-3.5 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/20">
                    <Zap size={20} className="fill-current" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        🔌 Compatible Connector
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono">
                        AUTO-DETECTED
                      </span>
                    </div>
                    <div className="text-xl font-black text-[var(--text-primary)] mt-0.5 font-mono">
                      {vehicleConnectorType}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      Automatically detected from your registered vehicle ({selectedVehicle.brand || selectedVehicle.manufacturer} {selectedVehicle.model} • {selectedVehicle.registrationNumber || selectedVehicle.vehicleNumber}).
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)] font-mono">
              Selected Vehicle: <strong className="text-[var(--text-primary)]">{selectedVehicle ? `${selectedVehicle.brand || selectedVehicle.manufacturer} ${selectedVehicle.model}` : "None"}</strong>
            </span>
            <button
              onClick={handleProceedToStep2}
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-lg shadow-blue-600/25 cursor-pointer"
            >
              Continue to Station <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: CHARGING STATION SELECTION                                        */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="theme-card p-6 md:p-8 rounded-3xl space-y-6 animate-fade-in shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                <MapPin size={22} className="text-blue-600 dark:text-blue-400" /> Step 2: Select Charging Station
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Choose an active charging station near your destination.
              </p>
            </div>
            <button
              onClick={() => setCurrentStep(1)}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 font-bold cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Vehicle
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {dbStations.map((st) => {
              const isSelected = String(selectedStation?.id) === String(st.id);
              return (
                <div
                  key={st.id}
                  onClick={() => {
                    setSelectedStationId(st.id);
                    setSelectedStation(st);
                    setErrorMsg("");
                  }}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    isSelected
                      ? "bg-blue-600/10 border-blue-500 ring-2 ring-blue-500/40 shadow-md"
                      : "bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] hover:border-blue-500/40"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-wider block">
                        EV Station Hub
                      </span>
                      <h4 className="font-extrabold text-sm text-[var(--text-primary)] mt-0.5">
                        {st.stationName || st.name}
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1">
                        <MapPin size={12} className="shrink-0" /> <span className="truncate">{st.address || st.city}</span>
                      </p>
                    </div>
                    {isSelected ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-black bg-emerald-500 text-white shadow-sm flex items-center gap-1 shrink-0">
                        <Check size={12} /> SELECTED
                      </span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--border-subtle)]/50 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block uppercase">Capacity</span>
                      <span className="font-bold text-[var(--text-primary)]">{st.maxPower || 150} kW</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block uppercase">Base Rate</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{st.pricePerKwh || 18}/kWh</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block uppercase">Status</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">ACTIVE</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-5 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface-raised)]/80 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={handleProceedToStep3}
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-lg shadow-blue-600/25 cursor-pointer"
            >
              Configure Schedule <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: SELECT DATE, START TIME & CHARGING DURATION                       */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="theme-card p-6 md:p-8 rounded-3xl space-y-6 animate-fade-in shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                <Clock size={22} className="text-blue-600 dark:text-blue-400" /> Step 3: Date, Time & Charging Duration
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Specify your booking schedule. The system calculates the exact charging window.
              </p>
            </div>
            <button
              onClick={() => setCurrentStep(2)}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 font-bold cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Station
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Booking Date */}
            <div>
              <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-2 font-mono">
                Booking Date
              </label>
              <input
                type="date"
                value={date}
                min={getLocalDateStr(new Date())}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3.5 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-2 font-mono">
                Start Time
              </label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-3.5 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500 font-mono cursor-pointer"
              >
                {TIME_SLOTS.map((s) => {
                  const now = new Date();
                  const todayStr = getLocalDateStr(now);
                  const isToday = date === todayStr;
                  const currentMins = now.getHours() * 60 + now.getMinutes();
                  const isPast = isToday && s.minutes < currentMins;
                  return (
                    <option key={s.time} value={s.time} disabled={isPast}>
                      {s.label} {isPast ? "• (Past)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Charging Duration */}
            <div>
              <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-2 font-mono">
                Charging Duration
              </label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(parseFloat(e.target.value))}
                className="w-full p-3.5 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500 font-mono cursor-pointer"
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label} ({d.minutes} mins)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Automatic Calculation Preview Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[var(--bg-surface-raised)] to-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <Sparkles size={14} /> Calculated Time Slot Window
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block uppercase">Date</span>
                <span className="font-extrabold text-[var(--text-primary)] text-sm">{date}</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block uppercase">Start Time</span>
                <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">{formatTimeDisplay(startTime)}</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block uppercase">Duration</span>
                <span className="font-extrabold text-amber-500 text-sm">{durationHours} {durationHours === 1 ? "Hour" : "Hours"}</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block uppercase">Calculated End</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">{formatTimeDisplay(calculatedEndTime)}</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CHARGING REQUIREMENTS: USER-ENTERED CURRENT & TARGET SOC (0-100%)         */}
          {/* ========================================================================= */}
          <div className="space-y-4 bg-[var(--bg-surface-raised)] p-6 rounded-3xl border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                  🔋 Charging Requirements
                </span>
                <h4 className="text-sm font-extrabold text-[var(--text-primary)] mt-0.5">
                  Vehicle Battery State of Charge (SOC)
                </h4>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                PACK: {vehicleBatteryCapacity} kWh
              </span>
            </div>

            {/* Current SOC Input & Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <span>Current Battery Level (Starting SOC)</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={currentBattery}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setCurrentBattery(isNaN(val) ? 0 : Math.min(100, Math.max(0, val)));
                    }}
                    className="w-16 p-1.5 text-center font-mono font-black text-sm rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-amber-500 focus:outline-none focus:border-amber-500"
                  />
                  <span className="font-mono font-bold text-xs text-[var(--text-secondary)]">%</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={currentBattery}
                onChange={(e) => setCurrentBattery(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 cursor-pointer h-2 bg-[var(--bg-surface)] rounded-lg"
              />
              <div className="flex justify-between text-[10px] font-mono text-[var(--text-muted)]">
                <span>0% (Empty)</span>
                <span>50%</span>
                <span>100% (Full)</span>
              </div>
            </div>

            {/* Target SOC Input & Slider */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <span>Target Battery Level (Desired SOC)</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={targetBattery}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setTargetBattery(isNaN(val) ? 0 : Math.min(100, Math.max(0, val)));
                    }}
                    className="w-16 p-1.5 text-center font-mono font-black text-sm rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="font-mono font-bold text-xs text-[var(--text-secondary)]">%</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={targetBattery}
                onChange={(e) => setTargetBattery(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-500 cursor-pointer h-2 bg-[var(--bg-surface)] rounded-lg"
              />
              <div className="flex justify-between text-[10px] font-mono text-[var(--text-muted)]">
                <span>0%</span>
                <span>Recommended 80% (Fast DC)</span>
                <span>100%</span>
              </div>
            </div>

            {/* Real-Time Validation Alert */}
            {socValidationError && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2.5">
                <AlertCircle size={16} className="text-amber-500 shrink-0" />
                <span className="font-bold">{socValidationError}</span>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* CHARGING ESTIMATE CARD (Authoritative SOC Calculation)                    */}
          {/* ========================================================================= */}
          {!socValidationError && (
            <div className="p-6 rounded-3xl bg-gradient-to-br from-[var(--bg-surface-raised)] to-[var(--bg-surface)] border border-blue-500/30 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-blue-500/30">
                    ⚡
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-[var(--text-primary)]">
                      Charging Energy & Cost Estimate
                    </h4>
                    <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                      Calculated from entered {currentBattery}% → {targetBattery}% ({vehicleBatteryCapacity} kWh Pack)
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  ESTIMATE
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-[var(--text-muted)] block uppercase font-medium">SOC Delta</span>
                  <span className="font-black text-amber-500 text-sm">+{socDifference}%</span>
                  <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">{currentBattery}% → {targetBattery}%</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-[var(--text-muted)] block uppercase font-medium">Energy Required</span>
                  <span className="font-black text-[var(--text-primary)] text-sm">{energyRequiredKwh.toFixed(2)} kWh</span>
                  <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">{vehicleBatteryCapacity} × {socDifference}%</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-[var(--text-muted)] block uppercase font-medium">Est. Grid Energy</span>
                  <span className="font-black text-blue-600 dark:text-blue-400 text-sm">{estimatedGridEnergyKwh.toFixed(2)} kWh</span>
                  <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">@ 90% Efficiency</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-[var(--text-muted)] block uppercase font-medium">Est. Energy Cost</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">₹{estimatedEnergyCost.toFixed(2)}</span>
                  <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">@ ₹{tariffPerKwh}/kWh</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-xs">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="text-[var(--text-secondary)]">
                    Est. Duration ({effectivePowerKw} kW max): <strong className="text-[var(--text-primary)] font-mono">{estimatedChargingTimeStr}</strong>
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                  Session window: {durationHours} hr ({durationMinutes}m slot)
                </span>
              </div>

              {/* Required DOE / Transparency Notice */}
              <div className="p-3 rounded-xl bg-[var(--bg-surface-raised)]/70 border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] flex items-start gap-2 leading-relaxed">
                <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Notice:</strong> Charging cost is an estimate because live vehicle/charger energy telemetry is not connected.
                </span>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-5 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface-raised)]/80 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={handleProceedToStep4}
              disabled={!!socValidationError}
              className={`px-6 py-3 rounded-2xl font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-lg ${
                !socValidationError
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25 cursor-pointer"
                  : "bg-[var(--bg-surface-raised)] text-[var(--text-muted)] opacity-50 cursor-not-allowed shadow-none"
              }`}
            >
              Check Available Connectors <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: REAL-TIME COMPATIBLE AVAILABLE CONNECTORS                         */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <div className="theme-card p-6 md:p-8 rounded-3xl space-y-6 animate-fade-in shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                <Zap size={22} className="text-blue-600 dark:text-blue-400" /> Step 4: Available Compatible Connectors
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Showing compatible <strong className="text-blue-600 dark:text-blue-400 font-mono">{vehicleConnectorType}</strong> connectors for {date} ({formatTimeDisplay(startTime)} - {formatTimeDisplay(calculatedEndTime)}).
              </p>
            </div>
            <button
              onClick={fetchAvailableConnectors}
              disabled={loadingConnectors}
              className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={14} className={loadingConnectors ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          {/* Connectors Grid */}
          {loadingConnectors ? (
            <div className="p-12 text-center theme-card space-y-3">
              <RefreshCw size={28} className="animate-spin text-blue-600 dark:text-blue-400 mx-auto" />
              <p className="text-xs font-bold text-[var(--text-primary)]">Checking real-time MySQL connector availability & overlap records...</p>
            </div>
          ) : compatibleConnectors.length === 0 ? (
            /* NO COMPATIBLE CONNECTOR STATE */
            <div className="p-8 rounded-3xl border border-dashed border-rose-500/40 bg-rose-500/5 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                <AlertCircle size={28} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                  No compatible connectors are available for your selected time.
                </h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto mt-1">
                  Your vehicle requires a <strong className="font-mono text-blue-600 dark:text-blue-400">{vehicleConnectorType}</strong> connector. No operational matching connector is free at this station for the requested window.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Change Time
                </button>
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold text-xs hover:bg-[var(--bg-surface-raised)]/80 cursor-pointer"
                >
                  Change Station
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {compatibleConnectors.map((c) => {
                const isSelected = selectedConnector?.id === c.id;
                const isAvail = c.isAvailable && c.status === "AVAILABLE";
                const isOccupied = c.status === "OCCUPIED";
                const isMaintenance = c.status === "MAINTENANCE";
                const isFault = c.status === "FAULT";
                const isOffline = c.status === "OFFLINE";

                return (
                  <div
                    key={c.id || c.connectorId}
                    className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                      !isAvail
                        ? "bg-[var(--bg-surface-raised)]/60 border-[var(--border-subtle)] opacity-75"
                        : isSelected
                        ? "bg-blue-600/10 border-blue-500 ring-2 ring-blue-500/40 shadow-lg"
                        : "bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] hover:border-blue-500/40"
                    }`}
                  >
                    {/* Top Row: Connector Number & Operational Indicator */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">
                          {isAvail ? "🟢" : isMaintenance ? "🟠" : isOffline ? "⚫" : "🔴"}
                        </span>
                        <h4 className="font-extrabold text-sm text-[var(--text-primary)] font-mono">
                          {c.connectorNumber || `Connector ${c.connectorId}`}
                        </h4>
                      </div>

                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full border ${
                          isAvail
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : isMaintenance
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            : isOffline
                            ? "bg-slate-500/10 text-slate-500 border-slate-500/30"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                        }`}
                      >
                        {isAvail ? "AVAILABLE" : isMaintenance ? "MAINTENANCE" : isFault ? "FAULT" : isOffline ? "OFFLINE" : "OCCUPIED"}
                      </span>
                    </div>

                    {/* Specs Grid */}
                    <div className="space-y-1.5 text-xs font-mono bg-[var(--bg-surface)] p-3 rounded-2xl border border-[var(--border-subtle)]">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Type:</span>
                        <span className="font-extrabold text-blue-600 dark:text-blue-400">{c.connectorType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Power:</span>
                        <span className="font-extrabold text-[var(--text-primary)]">{c.powerKw} kW</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Status:</span>
                        <span className={`font-bold ${isAvail ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                          {isAvail ? "Available" : isMaintenance ? "Maintenance" : isFault ? "Fault" : isOffline ? "Offline" : "Occupied"}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div>
                      {isAvail ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedConnector(c);
                            setErrorMsg("");
                          }}
                          className={`w-full py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
                            isSelected
                              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30"
                              : "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20"
                          }`}
                        >
                          {isSelected ? <Check size={14} /> : null}
                          {isSelected ? "CONNECTOR SELECTED" : "SELECT CONNECTOR"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="w-full py-2.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-muted)] font-bold text-xs uppercase tracking-wider cursor-not-allowed opacity-60"
                        >
                          UNAVAILABLE
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-5 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface-raised)]/80 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={handleProceedToStep5}
              disabled={!selectedConnector || !selectedConnector.isAvailable}
              className={`px-6 py-3 rounded-2xl font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-2 ${
                selectedConnector && selectedConnector.isAvailable
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 cursor-pointer"
                  : "bg-[var(--bg-surface-raised)] text-[var(--text-muted)] opacity-50 cursor-not-allowed"
              }`}
            >
              Review Booking Summary <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: REVIEW BOOKING & PRICING BREAKDOWN                                */}
      {/* ========================================================================= */}
      {currentStep === 5 && (
        <div className="theme-card p-6 md:p-8 rounded-3xl space-y-6 animate-fade-in shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                <ShieldCheck size={22} className="text-blue-600 dark:text-blue-400" /> Step 5: Review Booking Summary
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Verify your complete charging reservation details and estimated cost breakdown.
              </p>
            </div>
            <button
              onClick={() => setCurrentStep(4)}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 font-bold cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Connectors
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Summary details */}
            <div className="p-5 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center justify-between">
                <span>Reservation Details</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                  {currentBattery}% → {targetBattery}%
                </span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Vehicle:</span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {selectedVehicle?.brand} {selectedVehicle?.model} ({selectedVehicle?.registrationNumber || selectedVehicle?.vehicleNumber})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Battery Capacity:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{vehicleBatteryCapacity} kWh</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Current / Target SOC:</span>
                  <span className="font-mono font-bold text-amber-500">{currentBattery}% → {targetBattery}% (+{socDifference}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Energy Required:</span>
                  <span className="font-mono font-bold text-[var(--text-primary)]">{energyRequiredKwh.toFixed(2)} kWh</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Est. Grid Energy (@ 90%):</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{estimatedGridEnergyKwh.toFixed(2)} kWh</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Charging Station:</span>
                  <span className="font-bold text-[var(--text-primary)]">{selectedStation?.stationName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Connector:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {selectedConnector?.connectorNumber || `Connector ${selectedConnector?.id}`} ({selectedConnector?.connectorType})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Effective Power:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{effectivePowerKw} kW</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Date & Window:</span>
                  <span className="font-mono font-bold text-[var(--text-primary)]">
                    {date} • {formatTimeDisplay(startTime)} - {formatTimeDisplay(calculatedEndTime)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Est. Charging Time:</span>
                  <span className="font-mono font-bold text-amber-500">{estimatedChargingTimeStr}</span>
                </div>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="p-5 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3">
                  Estimated Cost Breakdown
                </h3>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Estimated Energy Cost ({estimatedGridEnergyKwh.toFixed(2)} kWh @ ₹{tariffPerKwh}/kWh):</span>
                    <span className="font-bold text-[var(--text-primary)]">₹{estimatedEnergyCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Platform Fee:</span>
                    <span className="font-bold text-[var(--text-primary)]">₹{platformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Parking Fee:</span>
                    <span className="font-bold text-[var(--text-primary)]">₹{parkingFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">GST (18%):</span>
                    <span className="font-bold text-[var(--text-primary)]">₹{gstAmount.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                      <span>Coupon Discount ({appliedCoupon?.code}):</span>
                      <span>-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-[var(--border-subtle)] flex justify-between text-sm font-black">
                    <span>Total Estimated Amount:</span>
                    <span className="text-blue-600 dark:text-blue-400">₹{totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Coupon input */}
                <div className="pt-3">
                  {appliedCoupon ? (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-mono">
                      <span>Coupon {appliedCoupon.code} Applied!</span>
                      <button onClick={handleRemoveCoupon} className="text-rose-500 font-bold hover:underline cursor-pointer">Remove</button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Coupon Code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="flex-1 p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs uppercase font-mono focus:outline-none"
                      />
                      <button type="submit" className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer">
                        Apply
                      </button>
                    </form>
                  )}
                  {couponError && <p className="text-[11px] text-rose-500 mt-1">{couponError}</p>}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-secondary)] leading-relaxed mt-3">
                <strong>Notice:</strong> Final energy consumed may differ from this estimate because live vehicle/charger telemetry is not connected.
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(4)}
              className="px-5 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface-raised)]/80 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={handleProceedToStep6}
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-lg shadow-blue-600/25 cursor-pointer"
            >
              Proceed to Payment <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 6: PAYMENT VIA RAZORPAY / TEST GATEWAY                               */}
      {/* ========================================================================= */}
      {currentStep === 6 && (
        <div className="theme-card p-6 md:p-8 rounded-3xl space-y-6 animate-fade-in text-center max-w-xl mx-auto shadow-card">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
            <CreditCard size={32} />
          </div>

          <div>
            <h2 className="text-xl font-black text-[var(--text-primary)]">Secure Payment & Final Availability Check</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Test mode active. Final database lock verification will occur on payment submission.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs font-mono space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Station:</span>
              <span className="font-bold">{selectedStation?.stationName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Connector:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {selectedConnector?.connectorNumber || "Connector 01"} ({selectedConnector?.connectorType})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Time Slot:</span>
              <span className="font-bold">{date} • {formatTimeDisplay(startTime)} - {formatTimeDisplay(calculatedEndTime)}</span>
            </div>
            <div className="flex justify-between border-t border-[var(--border-subtle)] pt-2">
              <span className="text-[var(--text-muted)]">Total Payable:</span>
              <span className="font-black text-blue-600 dark:text-blue-400 text-sm">₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setCurrentStep(5)}
              className="flex-1 py-3 rounded-2xl bg-[var(--bg-surface-raised)] font-bold text-xs cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={() => setShowCheckoutModal(true)}
              disabled={isSubmittingBooking}
              className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmittingBooking ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />}
              Pay & Confirm ₹{totalAmount.toFixed(2)}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 7: BOOKING CONFIRMED (Exact Display Requirement)                      */}
      {/* ========================================================================= */}
      {currentStep === 7 && confirmedBookingData && (
        <div className="theme-card p-6 md:p-8 rounded-3xl space-y-6 animate-fade-in text-center max-w-xl mx-auto shadow-card">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
            <CheckCircle2 size={38} />
          </div>

          <div>
            <span className="text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">
              BOOKING PERSISTED IN MYSQL
            </span>
            <h2 className="text-2xl font-black text-[var(--text-primary)] mt-3">Booking Confirmed ✅</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Your connector slot is reserved. Present your Digital QR Pass on arrival.
            </p>
          </div>

          {/* EXACT FORMATTED CONFIRMATION CARD */}
          <div className="p-5 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs font-mono space-y-2.5 text-left">
            <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
              <span className="text-[var(--text-muted)]">Booking ID:</span>
              <span className="font-black text-blue-600 dark:text-blue-400 text-sm">
                {confirmedBookingData.bookingId || confirmedBookingData.bookingCode || "EV001"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Vehicle:</span>
              <span className="font-bold">{confirmedBookingData.vehicleModel || `${selectedVehicle?.brand} ${selectedVehicle?.model}`}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Vehicle Number:</span>
              <span className="font-bold text-[var(--text-primary)]">{confirmedBookingData.vehicleNumber || selectedVehicle?.registrationNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Connector:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {confirmedBookingData.connectorNumber || selectedConnector?.connectorNumber || "Connector 01"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Connector Type:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {confirmedBookingData.connectorType || selectedConnector?.connectorType || vehicleConnectorType}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Charging Station:</span>
              <span className="font-bold">{confirmedBookingData.stationName || selectedStation?.stationName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Date:</span>
              <span className="font-bold">{confirmedBookingData.date || date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Time:</span>
              <span className="font-bold">
                {confirmedBookingData.timeSlot || `${formatTimeDisplay(startTime)} - ${formatTimeDisplay(calculatedEndTime)}`}
              </span>
            </div>
            <div className="flex justify-between border-t border-[var(--border-subtle)] pt-2">
              <span className="text-[var(--text-muted)]">Status:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Confirmed ✅</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowPassModal(true)}
              className="py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <QrCode size={16} /> View Digital Pass
            </button>
            <button
              onClick={() => navigate("/customer/bookings")}
              className="py-3 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[var(--bg-surface-raised)]/80 cursor-pointer"
            >
              <CalendarCheck size={16} /> My Bookings
            </button>
          </div>

          <button
            onClick={() => navigate("/user/dashboard")}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold cursor-pointer"
          >
            ← Back to Dashboard
          </button>
        </div>
      )}

      {/* QUICK ADD VEHICLE MODAL */}
      {showAddVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-[var(--text-primary)] flex items-center gap-2">
                <Car size={18} className="text-blue-600 dark:text-blue-400" /> Register New EV
              </h3>
              <button
                onClick={() => setShowAddVehicleModal(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddVehicleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[var(--text-secondary)] mb-1">Manufacturer / Brand</label>
                <input
                  type="text"
                  required
                  value={newVehicleForm.manufacturer}
                  onChange={(e) => setNewVehicleForm({ ...newVehicleForm, manufacturer: e.target.value })}
                  placeholder="e.g. Tata Motors, MG, Nissan, Hyundai"
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--text-secondary)] mb-1">Model Name</label>
                <input
                  type="text"
                  required
                  value={newVehicleForm.model}
                  onChange={(e) => setNewVehicleForm({ ...newVehicleForm, model: e.target.value })}
                  placeholder="e.g. Nexon EV, ZS EV, Leaf"
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--text-secondary)] mb-1">Vehicle License / Reg Number</label>
                <input
                  type="text"
                  required
                  value={newVehicleForm.vehicleNumber}
                  onChange={(e) => setNewVehicleForm({ ...newVehicleForm, vehicleNumber: e.target.value.toUpperCase() })}
                  placeholder="e.g. TN01AB1234"
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] font-mono focus:outline-none uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[var(--text-secondary)] mb-1">Battery (kWh)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newVehicleForm.batteryCapacity}
                    onChange={(e) => setNewVehicleForm({ ...newVehicleForm, batteryCapacity: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[var(--text-secondary)] mb-1">Connector Type</label>
                  <select
                    value={newVehicleForm.connectorType}
                    onChange={(e) => setNewVehicleForm({ ...newVehicleForm, connectorType: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] font-mono focus:outline-none cursor-pointer"
                  >
                    <option value="CCS2">CCS2 (DC Fast / Combo)</option>
                    <option value="Type 2">Type 2 (AC Mennekes)</option>
                    <option value="CHAdeMO">CHAdeMO</option>
                    <option value="GB/T">GB/T</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddVehicleModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingVehicle}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  {addingVehicle ? "Saving..." : "Save EV"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RAZORPAY CHECKOUT MODAL */}
      {showCheckoutModal && (
        <RazorpayCheckoutModal
          isOpen={showCheckoutModal}
          onClose={() => setShowCheckoutModal(false)}
          booking={{
            stationId: selectedStation?.id,
            stationName: selectedStation?.stationName,
            connectorId: selectedConnector?.connectorNumber || selectedConnector?.connectorId,
            date,
            time: startTime,
            totalAmount,
            bookingId: `TEMP_${Date.now()}`,
          }}
          onSuccess={handleFinalBookingCreation}
          onPaymentSuccess={handleFinalBookingCreation}
        />
      )}

      {/* DIGITAL PASS MODAL */}
      {showPassModal && confirmedBookingData && (
        <BookingPassModal
          booking={confirmedBookingData}
          onClose={() => setShowPassModal(false)}
          onOpenInvoice={() => setShowInvoiceModal(true)}
        />
      )}

      {/* INVOICE MODAL */}
      {showInvoiceModal && confirmedBookingData && (
        <InvoiceModal
          booking={confirmedBookingData}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}
    </div>
  );
}