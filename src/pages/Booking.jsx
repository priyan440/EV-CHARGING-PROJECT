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
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useSystemState } from "../contexts/SystemStateContext";
import { useNotifications } from "../contexts/NotificationContext";
import RazorpayCheckoutModal from "../components/RazorpayCheckoutModal";
import BookingPassModal from "../components/BookingPassModal";
import InvoiceModal from "../components/InvoiceModal";

export default function Booking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedStationId = searchParams.get("stationId") || "";
  const preSelectedChargerId = searchParams.get("chargerId") || "";

  const { currentUser } = useAuth();
  const { stations, bookings, coupons, createBookingHold } = useSystemState();
  const { addNotification } = useNotifications();

  // Customer Vehicle details & connector type
  const vehicle = currentUser?.vehicles?.[0] || currentUser?.vehicle || {
    number: "TN58AB1234",
    brand: "Tata",
    model: "Nexon EV",
    connectorType: "CCS2",
    batteryCapacity: 40.5,
    batteryPercentage: 35,
  };

  const [selectedStationId, setSelectedStationId] = useState(preSelectedStationId || stations[0]?.id || "STA001");
  const [selectedChargerId, setSelectedChargerId] = useState(preSelectedChargerId || "");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("02:00 PM");
  const [duration, setDuration] = useState("45 Mins");
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

  // 10-Minute Reservation Countdown Timer (09:42 format)
  const [holdTimeLeft, setHoldTimeLeft] = useState(600); // 600 seconds = 10 mins

  const selectedStation = stations.find((s) => s.id === selectedStationId) || stations[0];
  const chargers = selectedStation?.chargers || [];

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
        `Connector Incompatible! Vehicle connector (${vehicleConn}) does not match charger connector (${chargerConn}). Booking blocked.`
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

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Calculations
  const batteryCapacity = vehicle.batteryCapacity || 40.5;
  const batteryDelta = Math.max(0, targetBattery - currentBattery);
  const estimatedKwh = parseFloat(((batteryDelta / 100) * batteryCapacity).toFixed(1));
  const ratePerKwh = selectedCharger.pricePerKwh || 18;
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

  const handleInitiateBooking = (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (connectorMismatchError) {
      setErrorMsg("Cannot proceed. Selected charger connector is incompatible with your EV vehicle.");
      return;
    }

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
      setErrorMsg(`Charger ${selectedChargerId} is already booked for ${date} at ${time}. Select another slot or charger.`);
      return;
    }

    // Create 10-Minute Hold Booking Reservation
    const holdData = {
      counterId: currentUser?.counterId || "CUS0001",
      customerName: currentUser?.name || "Priyan",
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
      paymentMethod: "Razorpay Test Mode",
    };

    const newHold = createBookingHold(holdData);
    setActiveBookingHold(newHold);
    setHoldTimeLeft(600); // 10 minutes timer
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-xl border border-emerald-500/30">
            REAL-TIME SLOT HOLD & CALCULATOR
          </span>
          <span className="text-xs font-mono bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-xl border border-cyan-500/30">
            RAZORPAY TEST MODE
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
          <CalendarCheck size={28} className="text-emerald-400" /> Book EV Charging Slot
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Vehicle Connector: <span className="text-white font-bold">{vehicle.connectorType || "CCS2"}</span> • Vehicle: <span className="text-emerald-400 font-bold">{vehicle.brand} {vehicle.model} ({vehicle.number})</span>
        </p>
      </div>

      {/* Error Banners */}
      {connectorMismatchError && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-bold flex items-center gap-3 animate-fade-in">
          <AlertTriangle size={20} className="text-rose-400 shrink-0" />
          <span>{connectorMismatchError}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleInitiateBooking} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Selection Form (7 Cols) */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl space-y-5">
          
          {/* Station Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Select Charging Station
            </label>
            <select
              value={selectedStationId}
              onChange={(e) => {
                setSelectedStationId(e.target.value);
                setSelectedChargerId("");
              }}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500"
            >
              {stations.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.id} - {st.name} ({st.city})
                </option>
              ))}
            </select>
          </div>

          {/* Charger Bay Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Select Compatible Charger Bay
            </label>
            <div className="grid grid-cols-2 gap-2">
              {chargers.map((ch) => {
                const isSelected = selectedChargerId === ch.id;
                const isCompatible = (ch.connector || "CCS2").toUpperCase() === (vehicle.connectorType || "CCS2").toUpperCase();
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setSelectedChargerId(ch.id)}
                    className={`p-3 rounded-xl border text-left transition ${
                      isSelected
                        ? "bg-emerald-500/20 border-emerald-500/60 text-white font-bold"
                        : isCompatible
                        ? "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                        : "bg-rose-950/20 border-rose-900/50 text-rose-400 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span>{ch.id}</span>
                      <span className="text-[10px] text-cyan-400 font-bold">₹{ch.pricePerKwh}/kWh</span>
                    </div>
                    <div className="text-sm font-bold text-white mt-1 flex items-center justify-between">
                      <span>{ch.connector}</span>
                      {!isCompatible && <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1 rounded">INCOMPATIBLE</span>}
                    </div>
                    <div className="text-[10px] text-slate-400">{ch.powerKw} kW Fast Power</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Time Slot */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Date</label>
              <input
                type="date"
                value={date}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Start Time Slot</label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500"
              >
                <option value="08:00 AM">08:00 AM</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="12:00 PM">12:00 PM</option>
                <option value="02:00 PM">02:00 PM</option>
                <option value="04:00 PM">04:00 PM</option>
                <option value="06:00 PM">06:00 PM (Peak Surge)</option>
                <option value="08:00 PM">08:00 PM (Peak Surge)</option>
              </select>
            </div>
          </div>

          {/* Battery Target Sliders */}
          <div className="space-y-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
            <div className="flex justify-between text-xs font-bold text-slate-200">
              <span>Current Battery State</span>
              <span className="font-mono text-emerald-400">{currentBattery}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="95"
              value={currentBattery}
              onChange={(e) => setCurrentBattery(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500 cursor-pointer"
            />

            <div className="flex justify-between text-xs font-bold text-slate-200 pt-2">
              <span>Target Battery Goal</span>
              <span className="font-mono text-cyan-400">{targetBattery}%</span>
            </div>
            <input
              type="range"
              min={currentBattery + 5}
              max="100"
              value={targetBattery}
              onChange={(e) => setTargetBattery(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-500 cursor-pointer"
            />

            <div className="text-[11px] text-slate-400 font-mono text-right pt-1">
              Estimated Duration: <span className="text-emerald-400 font-bold">{recommendedDurationMins} minutes</span>
            </div>
          </div>

          {/* Promo Coupon Box */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Apply Promo Coupon</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Enter coupon code (e.g. EVFIRST50)"
                className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono font-bold uppercase rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5"
              >
                <Tag className="w-3.5 h-3.5" /> Apply
              </button>
            </div>
            {couponError && <p className="text-[11px] text-rose-400">{couponError}</p>}
            {appliedCoupon && (
              <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Coupon {appliedCoupon.code} applied! Saved ₹{discountAmount}
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Calculator Summary & Pay Trigger (5 Cols) */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
              <Zap size={18} className="text-emerald-400" /> Tariff & Energy Calculator
            </h3>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex justify-between text-slate-400 font-sans">
                <span>Vehicle Model:</span>
                <span className="font-bold text-slate-200">{vehicle.brand} {vehicle.model}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Battery Capacity:</span>
                <span className="font-bold text-slate-200">{batteryCapacity} kWh</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Required Energy:</span>
                <span className="font-bold text-emerald-400">{estimatedKwh} kWh</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Charging Rate:</span>
                <span>₹{ratePerKwh}/kWh</span>
              </div>

              <hr className="border-slate-800 my-2" />

              <div className="flex justify-between text-slate-400">
                <span>Base Energy Cost:</span>
                <span>₹{chargingCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Service & Station Fee:</span>
                <span>₹{serviceFee.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Coupon Discount:</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>GST Tax (18%):</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>

              <hr className="border-slate-800 my-2" />

              <div className="flex justify-between items-center text-sm font-extrabold pt-1 font-sans">
                <span className="text-white">Total Booking Amount:</span>
                <span className="text-xl font-mono text-emerald-400 font-black">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <button
              type="submit"
              disabled={!!connectorMismatchError}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
            >
              <CreditCard size={18} className="fill-slate-950" /> Hold Slot & Pay ₹{totalAmount.toFixed(2)} via Razorpay
            </button>
            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 text-center">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>10-Minute Hold Reservation • Razorpay Server Order Creation</span>
            </div>
          </div>
        </div>
      </form>

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