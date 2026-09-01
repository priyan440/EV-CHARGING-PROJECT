import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarCheck,
  Zap,
  XCircle,
  Play,
  QrCode,
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useSystemState } from "../contexts/SystemStateContext";
import QRCodeModal from "../components/QRCodeModal";
import InvoiceModal from "../components/InvoiceModal";

export default function MyBookings() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { bookings, cancelBooking, setActiveSessions } = useSystemState();

  const [activeTab, setActiveTab] = useState("Upcoming");
  const [selectedQRBooking, setSelectedQRBooking] = useState(null);
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState(null);

  const userCounterId = currentUser?.counterId || "CUS0001";
  const myBookings = bookings.filter(
    (b) => !b.counterId || b.counterId.toUpperCase() === userCounterId.toUpperCase()
  );

  const filteredBookings = myBookings.filter((b) => {
    const st = (b.status || "").toUpperCase();
    if (activeTab === "Upcoming") return st === "CONFIRMED" || st === "PAYMENT_PENDING" || st === "ARRIVED" || st === "CHECKED_IN";
    if (activeTab === "Active") return st === "CHARGING";
    if (activeTab === "Completed") return st === "COMPLETED";
    if (activeTab === "Cancelled") return st === "CANCELLED" || st === "EXPIRED";
    return true;
  });

  const handleStartSession = (booking) => {
    const newSession = {
      sessionId: `SES${Date.now().toString().slice(-6)}`,
      bookingId: booking.bookingId,
      counterId: booking.counterId || "CUS0001",
      customerName: booking.customerName || "Priyan",
      stationId: booking.stationId,
      stationName: booking.stationName,
      chargerId: booking.chargerId,
      connectorType: booking.connectorType,
      powerKw: 60,
      vehicleNumber: booking.vehicleNumber,
      startTime: new Date().toISOString(),
      elapsedMinutes: 0,
      batteryStart: booking.currentBattery || 35,
      batteryCurrent: booking.currentBattery || 35,
      batteryTarget: booking.targetBattery || 80,
      energyConsumedKwh: 0,
      currentPowerKw: 45,
      currentCost: 0,
      estimatedRemainingMins: 30,
      status: "CHARGING",
      isSimulationMode: true,
    };

    setActiveSessions((prev) => [newSession, ...prev]);
    navigate("/customer/live-charging");
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded border border-emerald-500/30">
              BOOKING ENGINE PASS
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
            <CalendarCheck size={28} className="text-emerald-400" /> My Booking Sessions
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Scan station check-in QR code, view Razorpay tax invoices, monitor live charging, or manage cancellations.
          </p>
        </div>

        <button
          onClick={() => navigate("/customer/book")}
          className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-2"
        >
          <Zap size={16} className="fill-slate-950" /> New Charging Reservation
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        {["Upcoming", "Active", "Completed", "Cancelled"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === tab
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[#0B1329] border border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto">
            <CalendarCheck size={24} />
          </div>
          <h4 className="font-bold text-white text-base">No {activeTab.toLowerCase()} bookings</h4>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            You currently have no {activeTab.toLowerCase()} charging reservations on record.
          </p>
          <button
            onClick={() => navigate("/customer/book")}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
          >
            Find a Station & Reserve Slot
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBookings.map((b) => {
            const isConfirmed = b.status === "CONFIRMED" || b.status === "Confirmed";
            const isCheckedIn = b.status === "CHECKED_IN" || b.status === "Checked_In";
            const isCharging = b.status === "CHARGING" || b.status === "Charging";

            return (
              <div
                key={b.bookingId}
                className="p-5 rounded-2xl bg-[#0B1329] border border-slate-800 shadow-xl flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded border border-emerald-500/30">
                      {b.bookingId}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        isConfirmed || isCheckedIn
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : b.status === "CANCELLED" || b.status === "Cancelled"
                          ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                          : "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-base leading-snug">{b.stationName}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Charger Bay: <span className="font-mono text-slate-200 font-bold">{b.chargerId}</span> ({b.connectorType || "CCS2"})
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/80 p-3 rounded-xl border border-slate-800 my-3 font-mono">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Slot Date & Time</span>
                      <span className="font-bold text-slate-200">{b.date} at {b.time}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Vehicle Reg</span>
                      <span className="font-bold text-slate-200">{b.vehicleNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Battery Goal</span>
                      <span className="font-bold text-emerald-400">{b.currentBattery}% → {b.targetBattery}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Amount Paid</span>
                      <span className="font-bold text-cyan-400">₹{b.totalAmount || b.chargingCost}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-xs font-bold">
                  {(isConfirmed || isCheckedIn) && (
                    <>
                      <button
                        onClick={() => setSelectedQRBooking(b)}
                        className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 flex items-center gap-1.5 border border-slate-700"
                      >
                        <QrCode className="w-4 h-4 text-cyan-400" /> QR Pass
                      </button>

                      <button
                        onClick={() => handleStartSession(b)}
                        className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-1 shadow-md shadow-emerald-950/40"
                      >
                        <Play size={14} className="fill-slate-950" /> Start Charging
                      </button>

                      <button
                        onClick={() => cancelBooking(b.bookingId)}
                        className="py-2 px-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 flex items-center justify-center border border-rose-800/60"
                        title="Cancel Booking"
                      >
                        <XCircle size={14} />
                      </button>
                    </>
                  )}

                  {isCharging && (
                    <button
                      onClick={() => navigate("/customer/live-charging")}
                      className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-950/50"
                    >
                      <Zap size={16} className="fill-white" /> Monitor Live Charging Session
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedInvoiceBooking(b)}
                    className="py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 border border-slate-700"
                  >
                    <FileText className="w-4 h-4 text-slate-400" /> Invoice
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR Pass Modal */}
      {selectedQRBooking && (
        <QRCodeModal
          booking={selectedQRBooking}
          onClose={() => setSelectedQRBooking(null)}
        />
      )}

      {/* Invoice Modal */}
      {selectedInvoiceBooking && (
        <InvoiceModal
          booking={selectedInvoiceBooking}
          onClose={() => setSelectedInvoiceBooking(null)}
        />
      )}
    </div>
  );
}