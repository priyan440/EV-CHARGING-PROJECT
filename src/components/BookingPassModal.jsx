import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import { Download, X, ShieldCheck, Zap, Calendar, Clock, Car, MapPin, CheckCircle2 } from "lucide-react";

export default function BookingPassModal({ booking, onClose, onOpenInvoice }) {
  const passRef = useRef(null);

  if (!booking) return null;

  const qrPayload = JSON.stringify({
    bookingId: booking.bookingId || "EVB-889900",
    stationId: booking.stationId || "STA001",
    chargerId: booking.chargerId || "CHG0001",
    counterId: booking.counterId || "CUS0001",
    date: booking.date,
    time: booking.time,
    status: booking.status || "CONFIRMED",
    paymentId: booking.paymentId || "PAY000001",
  });

  const handleDownloadPass = async () => {
    if (!passRef.current) return;
    try {
      const canvas = await html2canvas(passRef.current, {
        scale: 2,
        backgroundColor: "#070D1E",
      });
      const image = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = image;
      a.download = `EVPass_${booking.bookingId || "EVB"}.png`;
      a.click();
    } catch (err) {
      console.error("Failed to download booking pass:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-[#0B132B] border border-slate-700/80 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden text-slate-100 relative font-inter">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-400 fill-emerald-400" />
            <h3 className="text-base font-extrabold text-white font-grotesk">Digital EV Booking Pass</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Pass Container */}
        <div className="p-6 space-y-4">
          <div
            ref={passRef}
            className="bg-gradient-to-b from-[#0F172A] to-[#0B132B] border-2 border-emerald-500/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-5"
          >
            {/* Background Glow Badge */}
            <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Header / Brand Banner */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono font-extrabold uppercase bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded border border-emerald-500/30">
                  CONFIRMED PASS
                </span>
                <h4 className="text-lg font-black text-white font-grotesk tracking-wide mt-1">VOLTCHARGE EV PASS</h4>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-mono block">BOOKING ID</span>
                <span className="text-sm font-black text-emerald-400 font-mono">{booking.bookingId || "EVB-998877"}</span>
              </div>
            </div>

            {/* Station & Charger Metadata */}
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Station & Location</span>
                  <span className="font-bold text-white text-sm">{booking.stationName || "EV Power Hub"}</span>
                  <span className="text-slate-400 block text-[11px]">{booking.stationAddress || "Madurai Highway Hub, TN"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Charger Type</span>
                  <span className="font-bold text-cyan-300 font-mono">{booking.connectorType || "CCS2"} (DC Fast)</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Vehicle No.</span>
                  <span className="font-bold text-emerald-300 font-mono">{booking.vehicleNumber || "TN58AB1234"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Date</span>
                  <span className="font-bold text-slate-200 font-mono">{booking.date}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Time Slot</span>
                  <span className="font-bold text-emerald-400 font-mono">{booking.time}</span>
                </div>
              </div>
            </div>

            {/* REAL QR CODE SECTION */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center space-y-2">
              <div className="bg-white p-3 rounded-xl inline-block shadow-lg">
                <QRCodeSVG
                  value={qrPayload}
                  size={140}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <p className="text-[10px] text-slate-400 font-mono uppercase font-bold tracking-wider">
                Scan this QR code at the charging station
              </p>
            </div>

            {/* Footer Summary */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-mono">
              <span>Driver: <strong className="text-white">{booking.customerName || "Priyan"}</strong></span>
              <span className="text-emerald-400 font-extrabold text-sm">₹{booking.totalAmount || 416} PAID</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleDownloadPass}
              className="py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs font-grotesk uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Download className="w-4 h-4" /> Download Pass
            </button>

            <button
              onClick={onOpenInvoice}
              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs font-grotesk uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 border border-slate-700"
            >
              <ShieldCheck className="w-4 h-4" /> View PDF Invoice
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
