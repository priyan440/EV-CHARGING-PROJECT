import { useState, useEffect } from "react";
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
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useSystemState } from "../contexts/SystemStateContext";
import { useNotifications } from "../contexts/NotificationContext";
import RazorpayCheckoutModal from "../components/RazorpayCheckoutModal";
import BookingPassModal from "../components/BookingPassModal";
import InvoiceModal from "../components/InvoiceModal";
import { stationService } from "../services/stationService";

const TIME_SLOTS = [
  { time: "08:00 AM", label: "08:00 AM (Morning)" },
  { time: "10:00 AM", label: "10:00 AM (Standard)" },
  { time: "12:00 PM", label: "12:00 PM (Standard)" },
  { time: "02:00 PM", label: "02:00 PM (Standard)" },
  { time: "04:00 PM", label: "04:00 PM (Afternoon)" },
  { time: "06:00 PM", label: "06:00 PM (Peak Surge +15%)" },
  { time: "08:00 PM", label: "08:00 PM (Peak Surge +15%)" },
  { time: "11:30 PM", label: "11:30 PM (Off-Peak Saver -10%)" },
];

export default function Booking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedStationId = searchParams.get("stationId") || "";
  const preSelectedChargerId = searchParams.get("chargerId") || "";
  const preSelectedStationName = searchParams.get("stationName") || "";
  const preSelectedPower = searchParams.get("power") || "";
  const preSelectedConnector = searchParams.get("connector") || "";

  const { currentUser } = useAuth();
  const { stations, bookings, coupons, createBookingHold } = useSystemState();
  const { addNotification } = useNotifications();

  // Seamlessly integrate map-selected station if not already in system stations
  const displayStations = [
    ...(preSelectedStationId && !stations.some((s) => s.id === preSelectedStationId)
      ? [
          {
            id: preSelectedStationId,
            name: decodeURIComponent(preSelectedStationName) || "Selected EV Charging Station",
            city: "OpenStreetMap Network",
            address: "Verified EV Location",
            state: "India",
            isExternal: true,
            chargers: [
              {
                id: `CHG_${preSelectedStationId}`,
                connector: decodeURIComponent(preSelectedConnector) || "CCS2",
                powerKw: parseFloat(preSelectedPower) || 60,
                pricePerKwh: 18,
                status: "Available",
              },
            ],
          },
        ]
      : []),
    ...stations,
  ];

  // Stepper state: Step 1 (Station & Bay) | Step 2 (Schedule & Energy) | Step 3 (Review & Pay)
  const [currentStep, setCurrentStep] = useState(1);

  // Customer Vehicle details & connector type
  const vehicle = currentUser?.vehicles?.[0] || currentUser?.vehicle || {
    number: "TN58AB1234",
    brand: "Tata",
    model: "Nexon EV",
    connectorType: "CCS2",
    batteryCapacity: 40.5,
    batteryPercentage: 35,
  };

  const [selectedStationId, setSelectedStationId] = useState(
    preSelectedStationId || displayStations[0]?.id || "STA001"
  );
  const [selectedChargerId, setSelectedChargerId] = useState(preSelectedChargerId || "");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("02:00 PM");
  const [currentBattery, setCurrentBattery] = useState(vehicle.batteryPercentage || 35);
  const [targetBattery, setTargetBattery] = useState(80);
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [connectorMismatchError, setConnectorMismatchError] = useState("");

  // Modal State for Razorpay Checkout & Digital Pass
  const [activeBookingHold, setActiveBookingHold] = useState(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Reservation Countdown Timer
  const [holdTimeLeft, setHoldTimeLeft] = useState(600);

  const selectedStation = displayStations.find((s) => s.id === selectedStationId) || displayStations[0];
  const chargers = selectedStation?.chargers || [];

  // If station changes and charger is not selected or invalid, select first available
  useEffect(() => {
    if (!selectedChargerId && chargers.length > 0) {
      const avail = chargers.find((c) => c.status === "Available") || chargers[0];
      setSelectedChargerId(avail.id);
    }
  }, [selectedStationId, chargers, selectedChargerId]);

  const selectedCharger = chargers.find((c) => c.id === selectedChargerId) || chargers[0] || {
    id: "CHG0001",
    connector: "CCS2",
    powerKw: 60,
    pricePerKwh: 18,
  };

  // Connector Compatibility check
  useEffect(() => {
    const vehicleConn = (vehicle.connectorType || "CCS2").toUpperCase();
    const chargerConn = (selectedCharger.connector || "CCS2").toUpperCase();

    if (vehicleConn !== chargerConn) {
      setConnectorMismatchError(
        `Incompatible Connector! Your vehicle uses ${vehicleConn}, but this bay is equipped with ${chargerConn}. Please select a ${vehicleConn} bay.`
      );
    } else {
      setConnectorMismatchError("");
    }
  }, [vehicle.connectorType, selectedCharger.connector]);

  // Reservation countdown ticker
  useEffect(() => {
    let timer = null;
    if (showCheckoutModal && holdTimeLeft > 0) {
      timer = setInterval(() => {
        setHoldTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showCheckoutModal, holdTimeLeft]);

  // Dynamic Price Quote State
  const [dynamicQuote, setDynamicQuote] = useState(null);

  // Calculations
  const batteryCapacity = vehicle.batteryCapacity || 40.5;
  const batteryDelta = Math.max(0, targetBattery - currentBattery);
  const estimatedKwh = parseFloat(((batteryDelta / 100) * batteryCapacity).toFixed(1));
  const ratePerKwh = dynamicQuote?.effectivePricePerKwh ?? (selectedCharger.pricePerKwh || 18);
  const chargingCost = parseFloat((estimatedKwh * ratePerKwh).toFixed(2));
  const serviceFee = 20;
  const subtotalBeforeTax = Math.max(0, chargingCost + serviceFee - discountAmount);
  const tax = parseFloat((subtotalBeforeTax * 0.18).toFixed(2));
  const totalAmount = parseFloat((subtotalBeforeTax + tax).toFixed(2));

  // Smart duration calculation
  const recommendedDurationMins = Math.max(
    15,
    Math.round((estimatedKwh / (selectedCharger.powerKw || 60)) * 60)
  );

  // Fetch dynamic price quote on station or time change
  useEffect(() => {
    let isMounted = true;
    if (!selectedStation?.id) return;

    stationService
      .getPriceQuote(selectedStation.id, { start: time, duration: recommendedDurationMins })
      .then((res) => {
        if (isMounted && res && res.success && res.data) {
          setDynamicQuote(res.data);
        }
      })
      .catch((err) => console.warn("Dynamic price quote notice:", err.message));

    return () => {
      isMounted = false;
    };
  }, [selectedStation?.id, time, recommendedDurationMins]);

  const handleApplyCoupon = () => {
    setCouponError("");
    const matched = coupons.find((c) => c.code.toUpperCase() === couponCode.trim().toUpperCase());
    if (!matched) {
      setCouponError("Invalid promo coupon code.");
      return;
    }
    if (chargingCost < matched.minAmount) {
      setCouponError(`Minimum charging amount of ₹${matched.minAmount} required for this coupon.`);
      return;
    }
    const dist = matched.discountType === "FLAT" ? matched.discountValue : Math.min(matched.maxDiscount || 100, Math.round(chargingCost * (matched.discountValue / 100)));
    setDiscountAmount(dist);
    setAppliedCoupon(matched);
  };

  // Step 1 -> Step 2 validation
  const handleProceedToStep2 = () => {
    setErrorMsg("");
    if (connectorMismatchError) {
      setErrorMsg("Please select a charger bay that is compatible with your EV vehicle connector.");
      return;
    }
    setCurrentStep(2);
  };

  // Step 2 -> Step 3 validation
  const handleProceedToStep3 = () => {
    setErrorMsg("");
    if (currentBattery >= targetBattery) {
      setErrorMsg("Target battery percentage must be higher than current battery level.");
      return;
    }

    // Check double-booking slot collision
    const collision = bookings.find(
      (b) =>
        b.stationId === selectedStationId &&
        b.chargerId === selectedChargerId &&
        b.date === date &&
        b.time === time &&
        b.status !== "CANCELLED"
    );

    if (collision) {
      setErrorMsg(`Charger ${selectedChargerId} is already reserved for ${date} at ${time}. Please choose another time slot or charger bay.`);
      return;
    }

    setCurrentStep(3);
  };

  const handleInitiateBooking = (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (connectorMismatchError) {
      setErrorMsg("Cannot proceed. Selected charger connector is incompatible with your EV vehicle.");
      return;
    }

    // Create 10-Minute Hold Booking Reservation
    const holdData = {
      counterId: currentUser?.counterId || "CUS0001",
      customerName: currentUser?.name || "EV Driver",
      stationId: selectedStation.id,
      stationName: selectedStation.name,
      chargerId: selectedCharger.id,
      connectorType: selectedCharger.connector || "CCS2",
      vehicleNumber: vehicle.number,
      vehicleModel: `${vehicle.brand} ${vehicle.model}`,
      date,
      time,
      duration: `${recommendedDurationMins} min`,
      currentBattery,
      targetBattery,
      estimatedKwh,
      chargingCost,
      serviceFee,
      tax,
      discountAmount,
      couponCode: appliedCoupon?.code,
      totalAmount,
      ratePerKwh,
      dynamicPricing: dynamicQuote,
      priceBadge: dynamicQuote?.badge,
      paymentMethod: "Razorpay Test Mode",
    };

    const newHold = createBookingHold(holdData);
    setActiveBookingHold(newHold);
    setHoldTimeLeft(600); // 10 minutes timer
    setShowCheckoutModal(true);
  };

  const handlePaymentSuccess = () => {
    addNotification({
      title: "Razorpay Payment Verified! ⚡",
      message: `Booking ${activeBookingHold?.bookingId} confirmed at ${selectedStation.name}. Download tax invoice or view QR check-in pass.`,
      type: "Payment Successful",
      targetRole: "CUSTOMER",
      counterId: currentUser?.counterId || "CUS0001",
    });
    setShowCheckoutModal(false);
    setShowPassModal(true);
  };

  const stepTitles = [
    { num: 1, title: "Station & Bay", desc: "Select port" },
    { num: 2, title: "Schedule & Energy", desc: "Time & battery" },
    { num: 3, title: "Review & Pay", desc: "Confirm & Hold" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans text-[var(--text-primary)]">
      {/* Top Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold bg-[var(--accent-light)] text-[var(--accent-primary)] px-3 py-1 rounded-full border border-[var(--accent-primary)]/30">
                10-MINUTE RESERVATION HOLD
              </span>
              <span className="text-xs font-mono bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 px-3 py-1 rounded-full border border-cyan-500/30">
                RAZORPAY SECURE
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold font-grotesk tracking-tight text-[var(--text-primary)] flex items-center gap-2.5">
              <CalendarCheck size={28} className="text-[var(--accent-primary)]" />
              Book EV Charging Slot
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 flex items-center gap-2 flex-wrap">
              <span>Vehicle: <strong className="text-[var(--text-primary)]">{vehicle.brand} {vehicle.model} ({vehicle.number})</strong></span>
              <span>•</span>
              <span>Connector: <strong className="text-[var(--accent-primary)]">{vehicle.connectorType || "CCS2"}</strong></span>
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
                disabled={step.num > currentStep}
                className={`p-3 rounded-2xl border text-left transition-all duration-200 flex items-center gap-3 ${
                  isCurrent
                    ? "bg-[var(--accent-light)] border-[var(--accent-primary)] text-[var(--text-primary)] shadow-xs"
                    : isCompleted
                    ? "bg-[var(--bg-surface-raised)] border-emerald-500/40 text-[var(--text-primary)] hover:border-[var(--accent-primary)] cursor-pointer"
                    : "bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] text-[var(--text-muted)] opacity-60 cursor-not-allowed"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                    isCurrent
                      ? "bg-[var(--accent-primary)] text-white"
                      : isCompleted
                      ? "bg-emerald-500 text-white"
                      : "bg-[var(--border-subtle)] text-[var(--text-muted)]"
                  }`}
                >
                  {isCompleted ? <Check size={16} /> : step.num}
                </div>
                <div className="overflow-hidden hidden sm:block">
                  <div className="text-xs font-bold font-grotesk truncate">{step.title}</div>
                  <div className="text-[11px] text-[var(--text-muted)] truncate">{step.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm font-semibold flex items-center gap-2.5 animate-fade-in">
          <AlertCircle size={18} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: Station & Bay Selection */}
      {currentStep === 1 && (
        <div className="p-6 md:p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs space-y-6 animate-fade-in">
          <div className="border-b border-[var(--border-subtle)] pb-4">
            <h2 className="text-lg font-bold font-grotesk text-[var(--text-primary)] flex items-center gap-2">
              <MapPin size={20} className="text-[var(--accent-primary)]" />
              Step 1: Choose Station & Charging Bay
            </h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Select an available station and click a compatible charger bay that matches your vehicle connector.
            </p>
          </div>

          {/* Station Selection Dropdown */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Charging Station Location
            </label>
            <select
              value={selectedStationId}
              onChange={(e) => {
                setSelectedStationId(e.target.value);
                setSelectedChargerId("");
              }}
              className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-semibold rounded-2xl px-4 py-3.5 focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] cursor-pointer transition"
            >
              {displayStations.map((st) => (
                <option key={st.id} value={st.id} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                  {st.name} — {st.city} ({st.address})
                </option>
              ))}
            </select>
          </div>

          {/* Compatible Charger Bays Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Select Charging Bay
              </label>
              <span className="text-xs text-[var(--text-muted)] font-medium">
                Required: <strong className="text-[var(--accent-primary)]">{vehicle.connectorType || "CCS2"}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {chargers.map((ch) => {
                const isSelected = selectedChargerId === ch.id;
                const isCompatible = (ch.connector || "CCS2").toUpperCase() === (vehicle.connectorType || "CCS2").toUpperCase();
                const isAvailable = ch.status === "Available";

                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setSelectedChargerId(ch.id)}
                    className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 ${
                      isSelected
                        ? "bg-[var(--bg-surface-raised)] border-[var(--accent-primary)] shadow-md shadow-blue-500/10 ring-1 ring-[var(--accent-primary)]/50"
                        : isCompatible
                        ? "bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/50"
                        : "bg-rose-500/5 border-rose-500/20 opacity-70"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-[var(--text-primary)]">{ch.id}</span>
                        {isSelected && (
                          <span className="text-xs font-bold text-[var(--accent-primary)] bg-[var(--accent-light)] px-2 py-0.2 rounded-full">
                            Selected
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        ₹{ch.pricePerKwh}/kWh
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-base font-bold text-[var(--text-primary)] font-grotesk flex items-center gap-1.5">
                          <Zap size={16} className="text-amber-500" />
                          {ch.connector}
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                            isAvailable
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          }`}
                        >
                          {ch.status}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-1">
                        {ch.powerKw} kW Fast DC Output
                      </div>
                    </div>

                    {!isCompatible && (
                      <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                        <AlertTriangle size={13} /> Connector incompatible with your EV
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {connectorMismatchError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm font-semibold flex items-center gap-2.5">
              <AlertTriangle size={18} className="shrink-0" />
              <span>{connectorMismatchError}</span>
            </div>
          )}

          {/* Step 1 Footer Action */}
          <div className="flex justify-end pt-4 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={handleProceedToStep2}
              disabled={!selectedChargerId || !!connectorMismatchError}
              className="px-6 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white font-bold text-sm rounded-xl transition flex items-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <span>Continue to Schedule</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Date, Time & Battery Slider */}
      {currentStep === 2 && (
        <div className="p-6 md:p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs space-y-6 animate-fade-in">
          <div className="border-b border-[var(--border-subtle)] pb-4">
            <h2 className="text-lg font-bold font-grotesk text-[var(--text-primary)] flex items-center gap-2">
              <Clock size={20} className="text-[var(--accent-primary)]" />
              Step 2: Schedule & Energy Requirement
            </h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Select your reservation date, time slot, and specify current vs target battery goal.
            </p>
          </div>

          {/* Date & Time Slot Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Booking Date
              </label>
              <input
                type="date"
                value={date}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-semibold rounded-2xl px-4 py-3 focus:outline-none focus:border-[var(--accent-primary)] transition cursor-pointer"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Start Time Slot
              </label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-semibold rounded-2xl px-4 py-3 focus:outline-none focus:border-[var(--accent-primary)] transition cursor-pointer"
              >
                {TIME_SLOTS.map((s) => (
                  <option key={s.time} value={s.time} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Tariff Callout */}
          {dynamicQuote && (
            <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)] font-medium">Dynamic Tariff Rate for {time}:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[var(--text-primary)] font-mono">₹{ratePerKwh.toFixed(2)} / kWh</span>
                {dynamicQuote.badge && dynamicQuote.badgeType !== "standard" && (
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                      dynamicQuote.badgeType === "peak"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    }`}
                  >
                    {dynamicQuote.badge}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Battery Target Sliders */}
          <div className="space-y-4 bg-[var(--bg-surface-raised)] p-5 rounded-3xl border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-grotesk text-[var(--text-primary)] flex items-center gap-2">
                <BatteryCharging size={18} className="text-[var(--accent-primary)]" />
                Battery Charge Calculator
              </h3>
              <span className="text-xs font-mono font-bold text-[var(--text-muted)]">
                Capacity: {batteryCapacity} kWh
              </span>
            </div>

            {/* Current Battery */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-[var(--text-muted)]">Current Battery Level</span>
                <span className="font-mono font-bold text-amber-500">{currentBattery}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="95"
                value={currentBattery}
                onChange={(e) => setCurrentBattery(parseInt(e.target.value, 10))}
                className="w-full accent-[var(--accent-primary)] cursor-pointer h-2 bg-[var(--border-subtle)] rounded-lg"
              />
            </div>

            {/* Target Battery */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-[var(--text-muted)]">Target Battery Goal</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{targetBattery}%</span>
              </div>
              <input
                type="range"
                min={currentBattery + 5}
                max="100"
                value={targetBattery}
                onChange={(e) => setTargetBattery(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-500 cursor-pointer h-2 bg-[var(--border-subtle)] rounded-lg"
              />
            </div>

            {/* Energy & Duration Output Line */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--border-subtle)] text-xs font-medium">
              <div className="bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)] block">Required Energy:</span>
                <span className="text-base font-bold font-mono text-[var(--accent-primary)]">{estimatedKwh} kWh</span>
              </div>
              <div className="bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)] block">Estimated Time:</span>
                <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">~{recommendedDurationMins} Mins</span>
              </div>
            </div>
          </div>

          {/* Step 2 Footer Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-5 py-3 border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-raised)] text-[var(--text-primary)] font-bold text-sm rounded-xl transition flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={handleProceedToStep3}
              className="px-6 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-bold text-sm rounded-xl transition flex items-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <span>Review Order & Tariff</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Review & Tariff Calculator & Razorpay Trigger */}
      {currentStep === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Left: Summary Breakdown (7 Cols) */}
          <div className="lg:col-span-7 p-6 md:p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs space-y-5">
            <div className="border-b border-[var(--border-subtle)] pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold font-grotesk text-[var(--text-primary)] flex items-center gap-2">
                  <ShieldCheck size={20} className="text-emerald-500" />
                  Step 3: Review Reservation
                </h2>
                <p className="text-sm text-[var(--text-muted)]">Verify your appointment details before proceeding.</p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs text-[var(--accent-primary)] font-bold hover:underline cursor-pointer"
              >
                Change Bay
              </button>
            </div>

            {/* Selected Station & Bay Card */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--text-primary)] text-base font-grotesk">{selectedStation.name}</span>
                <span className="text-xs font-mono font-bold text-[var(--accent-primary)] bg-[var(--accent-light)] px-2 py-0.5 rounded-md">
                  Bay: {selectedCharger.id}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">📍 {selectedStation.address}, {selectedStation.city}</p>
              <div className="flex items-center gap-3 pt-1 text-xs text-[var(--text-muted)] font-medium">
                <span>Date: <strong className="text-[var(--text-primary)]">{date}</strong></span>
                <span>•</span>
                <span>Time: <strong className="text-[var(--text-primary)]">{time}</strong></span>
                <span>•</span>
                <span>Port: <strong className="text-[var(--text-primary)]">{selectedCharger.connector} ({selectedCharger.powerKw}kW)</strong></span>
              </div>
            </div>

            {/* Promo Coupon Box */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Apply Promo Coupon
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Enter code (e.g. EVFIRST50)"
                  className="flex-1 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-mono font-bold uppercase rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--accent-primary)] transition"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="py-2.5 px-4 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-bold text-sm rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Tag className="w-4 h-4" /> Apply
                </button>
              </div>
              {couponError && <p className="text-xs text-rose-500 font-semibold">{couponError}</p>}
              {appliedCoupon && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Coupon {appliedCoupon.code} applied! Saved ₹{discountAmount}
                </p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft size={16} /> Back to Schedule
              </button>
            </div>
          </div>

          {/* Right: Transparent Price Breakdown & Razorpay Trigger (5 Cols) */}
          <div className="lg:col-span-5 p-6 md:p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h3 className="text-base font-bold font-grotesk text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-3 flex items-center gap-2">
                <Zap size={18} className="text-[var(--accent-primary)]" />
                Tariff Breakdown
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>Required Energy:</span>
                  <span className="font-bold text-[var(--text-primary)] font-mono">{estimatedKwh} kWh</span>
                </div>

                <div className="flex justify-between items-center text-[var(--text-muted)]">
                  <span>Unit Rate:</span>
                  <span className="font-bold text-[var(--text-primary)] font-mono">₹{ratePerKwh.toFixed(2)}/kWh</span>
                </div>

                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>Base Energy Cost:</span>
                  <span className="font-mono">₹{chargingCost.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>Platform & Station Fee:</span>
                  <span className="font-mono">₹{serviceFee.toFixed(2)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                    <span>Promo Discount:</span>
                    <span className="font-mono">-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>GST (18%):</span>
                  <span className="font-mono">₹{tax.toFixed(2)}</span>
                </div>

                <hr className="border-[var(--border-subtle)] my-2" />

                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-base font-bold text-[var(--text-primary)] font-grotesk">Total Amount:</span>
                  <span className="text-2xl font-bold font-mono text-[var(--accent-primary)]">
                    ₹{totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Pay Button Trigger */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleInitiateBooking}
                disabled={!!connectorMismatchError}
                className="w-full py-3.5 px-4 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white font-bold text-sm tracking-wide shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <CreditCard size={18} />
                <span>Hold Slot & Pay ₹{totalAmount.toFixed(2)}</span>
              </button>

              <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--text-muted)] text-center">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>10-min reservation hold • Razorpay Test Mode</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Razorpay Standard Checkout Modal */}
      {showCheckoutModal && activeBookingHold && (
        <RazorpayCheckoutModal
          booking={activeBookingHold}
          onClose={() => setShowCheckoutModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Real QR Code Digital Booking Pass Modal */}
      {showPassModal && activeBookingHold && (
        <BookingPassModal
          booking={activeBookingHold}
          onClose={() => setShowPassModal(false)}
          onOpenInvoice={() => {
            setShowPassModal(false);
            setShowInvoiceModal(true);
          }}
        />
      )}

      {/* PDF Tax Invoice Modal */}
      {showInvoiceModal && activeBookingHold && (
        <InvoiceModal
          booking={activeBookingHold}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}
    </div>
  );
}