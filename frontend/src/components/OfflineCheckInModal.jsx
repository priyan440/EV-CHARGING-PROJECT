import { useState, useEffect } from "react";
import {
  UserPlus,
  Zap,
  Car,
  Phone,
  Clock,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowRight,
  ShieldCheck,
  Receipt,
  Users,
} from "lucide-react";
import smartReservationService from "../services/smartReservationService";
import ConflictModal from "./ConflictModal";

export default function OfflineCheckInModal({
  isOpen,
  onClose,
  stationId,
  stationName = "Charging Station",
  availableChargers = [],
  onSuccess,
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("Car");
  const [chargingType, setChargingType] = useState("DC Fast Charging");
  const [connectorType, setConnectorType] = useState("CCS2");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [selectedSlotId, setSelectedSlotId] = useState(
    availableChargers[0]?.id || availableChargers[0]?.slotId || ""
  );
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [amount, setAmount] = useState(350);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Conflict Modal State
  const [conflictData, setConflictData] = useState(null);
  const [showConflictModal, setShowConflictModal] = useState(false);

  // Success Receipt State
  const [successBooking, setSuccessBooking] = useState(null);

  useEffect(() => {
    if (availableChargers.length > 0 && !selectedSlotId) {
      setSelectedSlotId(availableChargers[0]?.id || availableChargers[0]?.slotId || "");
    }
  }, [availableChargers]);

  if (!isOpen) return null;

  // Handle Offline Check-In Form Submit
  const handleSubmit = async (e) => {
    e?.preventDefault();
    setErrorMsg("");

    if (!customerName || !customerPhone || !vehicleNumber || !selectedSlotId) {
      setErrorMsg("Please complete all required fields: Name, Phone, Vehicle Number, and Charger.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        vehicleType,
        chargingType,
        connectorType,
        durationMinutes: parseInt(durationMinutes, 10),
        stationId: parseInt(stationId, 10),
        slotId: parseInt(selectedSlotId, 10),
        paymentMethod,
        paymentStatus: "PAID",
        amount: parseFloat(amount) || 350,
      };

      const res = await smartReservationService.createOfflineBooking(payload);

      if (res.conflict) {
        // Show Conflict Modal with recommendations
        setConflictData(res);
        setShowConflictModal(true);
      } else if (res.success) {
        setSuccessBooking(res.data || res.booking);
        if (onSuccess) onSuccess(res.data || res.booking);
      } else {
        setErrorMsg(res.message || "Failed to process offline customer arrival.");
      }
    } catch (err) {
      setErrorMsg(err.message || "An error occurred during offline customer check-in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Alternative Selection Handler from Conflict Modal
  const handleSelectAlternative = async (alternativeSlot) => {
    setShowConflictModal(false);
    setSelectedSlotId(alternativeSlot.id || alternativeSlot.slotId);

    // Immediately re-submit with recommended slot
    setIsSubmitting(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        vehicleType,
        chargingType: alternativeSlot.chargerType === "AC" ? "AC Charging" : "DC Fast Charging",
        connectorType: alternativeSlot.connectorType || "CCS2",
        durationMinutes: parseInt(durationMinutes, 10),
        stationId: parseInt(stationId, 10),
        slotId: alternativeSlot.id || alternativeSlot.slotId,
        paymentMethod,
        paymentStatus: "PAID",
        amount: parseFloat(amount) || 350,
      };

      const res = await smartReservationService.createOfflineBooking(payload);
      if (res.success) {
        setSuccessBooking(res.data || res.booking);
        if (onSuccess) onSuccess(res.data || res.booking);
      } else {
        setErrorMsg(res.message || "Failed to assign alternative charger.");
      }
    } catch (err) {
      setErrorMsg(err.message || "Assignment error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Join Smart Queue
  const handleJoinQueue = async () => {
    setShowConflictModal(false);
    try {
      const res = await smartReservationService.joinQueue({
        stationId: parseInt(stationId, 10),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        vehicleType,
        connectorType,
        requiredDuration: parseInt(durationMinutes, 10),
      });

      if (res.success) {
        alert(`Customer added to Smart Queue! Token: ${res.data?.queueToken} (Position #${res.data?.position})`);
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(res.message || "Failed to join queue.");
      }
    } catch (err) {
      setErrorMsg(err.message || "Queue error.");
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
        <div className="relative w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden text-[var(--text-primary)]">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600/20 via-cyan-600/10 to-transparent p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-500 shrink-0 shadow-md">
                <UserPlus size={20} />
              </div>
              <div>
                <h2 className="text-base font-black text-[var(--text-primary)]">
                  Offline Customer Check-In
                </h2>
                <p className="text-xs text-[var(--text-muted)] font-medium">
                  {stationName} • Walk-in Bay Assignment
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--bg-surface-raised)] transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          {successBooking ? (
            /* Success Receipt View */
            <div className="p-6 space-y-5 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-500 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h3 className="text-lg font-black text-[var(--text-primary)]">
                  Walk-In Assigned Successfully!
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">
                  Offline Booking ID: <span className="font-bold text-blue-500">{successBooking.offlineBookingId}</span>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Customer:</span>
                  <span className="font-bold text-[var(--text-primary)]">{successBooking.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Vehicle:</span>
                  <span className="font-bold font-mono text-[var(--text-primary)]">{successBooking.vehicleNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Assigned Charger:</span>
                  <span className="font-bold text-emerald-500">Slot #{successBooking.slotId} ({successBooking.connectorType})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Duration:</span>
                  <span className="font-bold text-[var(--text-primary)]">{successBooking.durationMinutes} Minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Payment:</span>
                  <span className="font-bold text-[var(--text-primary)]">₹{successBooking.amount} ({successBooking.paymentMethod})</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSuccessBooking(null);
                    onClose();
                  }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[var(--accent-primary)] hover:bg-blue-600 text-white transition shadow-md"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Form View */
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Customer Name & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priyan Kumar"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] focus:border-blue-500 focus:outline-none text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] focus:border-blue-500 focus:outline-none text-[var(--text-primary)]"
                  />
                </div>
              </div>

              {/* Vehicle Number & Vehicle Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                    Vehicle Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TN58AB1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold uppercase bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] focus:border-blue-500 focus:outline-none text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] focus:border-blue-500 focus:outline-none text-[var(--text-primary)]"
                  >
                    <option value="Car">Car (4 Wheeler)</option>
                    <option value="SUV">SUV</option>
                    <option value="2-Wheeler">2-Wheeler (Scooter/Bike)</option>
                    <option value="3-Wheeler">3-Wheeler (Auto)</option>
                    <option value="Bus/Truck">Bus / Commercial</option>
                  </select>
                </div>
              </div>

              {/* Charger Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Requested Charger Bay *
                </label>
                <select
                  required
                  value={selectedSlotId}
                  onChange={(e) => setSelectedSlotId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-bold bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] focus:border-blue-500 focus:outline-none text-[var(--text-primary)]"
                >
                  {availableChargers.map((c) => (
                    <option key={c.id || c.slotId} value={c.id || c.slotId}>
                      {c.slotNumber || `Charger #${c.id}`} — {c.powerKw} kW ({c.connectorType}) • {c.status || "AVAILABLE"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Charging Duration & Connector */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                    Duration (Minutes)
                  </label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => {
                      const mins = parseInt(e.target.value, 10);
                      setDurationMinutes(mins);
                      setAmount(Math.round(mins * 7.5 + 20));
                    }}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] focus:border-blue-500 focus:outline-none text-[var(--text-primary)]"
                  >
                    <option value={30}>30 Minutes (~20 kWh)</option>
                    <option value={45}>45 Minutes (~30 kWh)</option>
                    <option value={60}>60 Minutes (~40 kWh)</option>
                    <option value={90}>90 Minutes (~60 kWh)</option>
                    <option value={120}>120 Minutes (~80 kWh)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                    Connector Type
                  </label>
                  <select
                    value={connectorType}
                    onChange={(e) => setConnectorType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] focus:border-blue-500 focus:outline-none text-[var(--text-primary)]"
                  >
                    <option value="CCS2">CCS2 (DC Fast)</option>
                    <option value="Type 2">Type 2 (AC)</option>
                    <option value="CHAdeMO">CHAdeMO (DC)</option>
                    <option value="GB/T">GB/T</option>
                  </select>
                </div>
              </div>

              {/* Payment Method & Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] focus:border-blue-500 focus:outline-none text-[var(--text-primary)]"
                  >
                    <option value="Cash">Cash at Counter</option>
                    <option value="UPI">UPI / QR Payment</option>
                    <option value="Card">Debit / Credit Card</option>
                    <option value="Online">Online Link</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                    Total Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold text-emerald-500 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Validating Conflict & Assigning...</span>
                  ) : (
                    <>
                      <span>Verify & Assign Charger</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Conflict Modal Popup */}
      <ConflictModal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        conflictData={conflictData}
        onSelectAlternative={handleSelectAlternative}
        onJoinQueue={handleJoinQueue}
        onOpenOverride={() => {
          setShowConflictModal(false);
          // Allow override submit
          handleSubmit();
        }}
      />
    </>
  );
}
