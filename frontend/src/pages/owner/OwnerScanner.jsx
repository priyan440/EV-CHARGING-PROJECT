import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { QrCode, CheckCircle2, AlertTriangle, Play, ShieldCheck, Search, Zap, Clock, Car } from "lucide-react";
import { useSystemState } from "../../contexts/SystemStateContext";

export default function OwnerScanner() {
  const navigate = useNavigate();
  const { bookings, updateBookingStatus } = useSystemState();

  const [inputPayload, setInputPayload] = useState("EVB000001");
  const [scannedBooking, setScannedBooking] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null); // VALID, EXPIRED, ALREADY_USED, NOT_FOUND
  const [msg, setMsg] = useState("");

  const handleVerifyQR = (e) => {
    e.preventDefault();
    setVerificationResult(null);
    setScannedBooking(null);
    setMsg("");

    let targetBookingId = inputPayload.trim();

    // Parse JSON payload if scanned from QR code payload
    if (inputPayload.includes("{")) {
      try {
        const parsed = JSON.parse(inputPayload);
        targetBookingId = parsed.bookingId || targetBookingId;
      } catch (err) {
        console.warn("Invalid QR payload format:", err);
      }
    }

    const found = bookings.find(
      (b) => b.bookingId.toUpperCase() === targetBookingId.toUpperCase()
    );

    if (!found) {
      setVerificationResult("NOT_FOUND");
      return;
    }

    setScannedBooking(found);

    if (found.status === "COMPLETED") {
      setVerificationResult("ALREADY_USED");
    } else if (found.status === "CANCELLED" || found.status === "EXPIRED") {
      setVerificationResult("EXPIRED");
    } else {
      setVerificationResult("VALID");
    }
  };

  const handleStartCharging = () => {
    if (!scannedBooking) return;
    updateBookingStatus(scannedBooking.bookingId, "CHARGING");
    navigate(`/owner/session/${scannedBooking.bookingId}`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-inter">
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0B132B] border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 px-2.5 py-0.5 rounded border border-cyan-500/30">
              STATION OPERATOR DASHBOARD
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white font-grotesk flex items-center gap-2">
            <QrCode size={28} className="text-cyan-400" /> Booking QR Code Scanner & Verification
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Scan customer EV booking pass QR code or enter Booking ID to verify payment, charger slot, and initiate live charging session.
          </p>
        </div>
      </div>

      {/* QR Input Card */}
      <div className="p-6 rounded-3xl bg-[#0B132B] border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white font-grotesk flex items-center gap-2">
          <Search size={18} className="text-cyan-400" /> Scan or Enter Booking ID / QR Payload
        </h3>

        <form onSubmit={handleVerifyQR} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={inputPayload}
              onChange={(e) => setInputPayload(e.target.value)}
              placeholder="Paste QR JSON payload or enter Booking ID (e.g. EVB000001)..."
              className="w-full bg-slate-900 border border-slate-700 text-white font-mono text-sm font-bold rounded-2xl px-5 py-4 focus:outline-none focus:border-cyan-500"
              required
            />
            <button
              type="submit"
              className="absolute right-2 top-2 bottom-2 px-5 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs font-grotesk uppercase tracking-wider rounded-xl transition shadow-md"
            >
              Verify QR Code
            </button>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            Sample test IDs available: <strong className="text-cyan-400 cursor-pointer" onClick={() => setInputPayload("BK000001")}>BK000001</strong>, <strong className="text-cyan-400 cursor-pointer" onClick={() => setInputPayload("BK000002")}>BK000002</strong>
          </p>
        </form>
      </div>

      {/* Verification Output Screen */}
      {verificationResult === "VALID" && scannedBooking && (
        <div className="p-6 rounded-3xl bg-slate-950 border-2 border-emerald-500/50 shadow-2xl space-y-5 animate-scale-up">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-2xl flex items-center justify-center">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  ✓ VERIFIED AUTHORIZED BOOKING
                </span>
                <h3 className="text-lg font-black text-white font-grotesk mt-1">{scannedBooking.bookingId}</h3>
              </div>
            </div>
            <div className="text-right font-mono">
              <div className="text-[10px] text-slate-400">Payment Status</div>
              <div className="text-emerald-400 font-extrabold text-sm">PAID (₹{scannedBooking.totalAmount || 416})</div>
            </div>
          </div>

          {/* Booking Metadata Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Customer</span>
              <span className="font-bold text-white text-sm">{scannedBooking.customerName || "Priyan"}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Vehicle Number</span>
              <span className="font-bold text-emerald-300 text-sm">{scannedBooking.vehicleNumber || "TN58AB1234"}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Charger Type</span>
              <span className="font-bold text-cyan-300 text-sm">{scannedBooking.connectorType || "CCS2"} (DC Fast)</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Date</span>
              <span className="font-bold text-slate-200">{scannedBooking.date}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Time Slot</span>
              <span className="font-bold text-emerald-400">{scannedBooking.time}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Energy Tariff</span>
              <span className="font-bold text-slate-200">{scannedBooking.estimatedKwh || 18.5} kWh</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleStartCharging}
              className="w-full py-4 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm uppercase tracking-wider font-grotesk rounded-2xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <Play size={18} className="fill-slate-950" /> Authorize & Start Charging Session
            </button>
          </div>
        </div>
      )}

      {/* Invalid State */}
      {verificationResult === "NOT_FOUND" && (
        <div className="p-6 rounded-3xl bg-slate-950 border-2 border-rose-500/50 shadow-2xl text-center space-y-3">
          <AlertTriangle size={36} className="text-rose-400 mx-auto" />
          <h3 className="text-lg font-bold text-white font-grotesk">Invalid QR Code / Booking Not Found</h3>
          <p className="text-xs text-rose-300">
            The scanned QR code or ID does not exist in our central charging grid system.
          </p>
        </div>
      )}

      {/* Already Used State */}
      {verificationResult === "ALREADY_USED" && (
        <div className="p-6 rounded-3xl bg-slate-950 border-2 border-amber-500/50 shadow-2xl text-center space-y-3">
          <AlertTriangle size={36} className="text-amber-400 mx-auto" />
          <h3 className="text-lg font-bold text-white font-grotesk">Booking Session Already Completed</h3>
          <p className="text-xs text-amber-300">
            This QR code pass was already used for a completed charging session.
          </p>
        </div>
      )}

      {/* Expired State */}
      {verificationResult === "EXPIRED" && (
        <div className="p-6 rounded-3xl bg-slate-950 border-2 border-rose-500/50 shadow-2xl text-center space-y-3">
          <AlertTriangle size={36} className="text-rose-400 mx-auto" />
          <h3 className="text-lg font-bold text-white font-grotesk">Booking Expired or Cancelled</h3>
          <p className="text-xs text-rose-300">
            This booking time slot has expired or was cancelled by the driver.
          </p>
        </div>
      )}
    </div>
  );
}
