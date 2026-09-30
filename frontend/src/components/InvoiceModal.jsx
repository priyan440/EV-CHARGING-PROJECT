import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Printer, Download, X, Zap, ShieldCheck, FileText, CheckCircle2 } from "lucide-react";

export default function InvoiceModal({ booking, onClose }) {
  const invoiceRef = useRef(null);

  if (!booking) return null;

  const invoiceId = booking.invoiceNumber || booking.invoiceId || `INV-2026-${(booking.bookingId || "00042").replace(/\D/g, "") || "00042"}`;
  const sessionId = booking.chargingSessionId || booking.sessionId || `CS${(booking.bookingId || "00042").replace(/\D/g, "") || "00042"}`;
  const kwh = parseFloat(booking.actualEnergyUsed || booking.energyDelivered || booking.energyRequired || 29.1);
  const tariff = 15.0;
  const energyCost = parseFloat((kwh * tariff).toFixed(2));
  const serviceFee = 10.0;
  const discount = 10.0;
  const grandTotal = parseFloat(booking.finalAmount || booking.amount || (energyCost + serviceFee - discount).toFixed(2));
  const invoiceDate = booking.date || booking.bookingDate || new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
  const vehModel = booking.vehicleModel || "Tata Motors Nexon EV Max";
  const vehNum = booking.vehicleNumber || "TN58AB1234";
  const stationName = booking.stationName || "GreenCharge Central";
  const stationAddress = booking.stationAddress || "183 Arcot Road, Vadapalani, Chennai";
  const connectorId = booking.connectorId || "STA001-C01";
  const chargingType = booking.chargingType || "CCS2";
  const powerKw = booking.chargingPower || 50;
  const startBat = booking.batteryStartPct || booking.startingBattery || 20;
  const endBat = booking.finalBattery || booking.batteryTargetPct || 78;
  const duration = booking.duration || `${booking.durationMinutes || 52} minutes`;
  const paymentMethod = booking.paymentMethod || "Razorpay UPI";
  const paymentId = booking.paymentId || `PAY-${(booking.bookingId || "00042").toUpperCase()}-${Date.now().toString().slice(-4)}`;

  const verifyUrl = `${window.location.origin}/booking/verify/${booking.bookingId || "EV1042"}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        backgroundColor: "#070D1E",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      pdf.save(`${invoiceId}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
      <div className="bg-[#0B132B] border border-slate-700/80 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden text-slate-100 print:bg-white print:text-black font-inter my-8">
        
        {/* Header Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">EV Charge Pro Invoice</h3>
              <p className="text-xs text-slate-400">Official Computer-Generated Tax Invoice</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
              title="Download official PDF"
            >
              <Download size={14} /> Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              title="Print"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable / Renderable Invoice Container */}
        <div className="p-6 space-y-4">
          <div
            ref={invoiceRef}
            className="bg-[#070D1E] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 text-slate-100"
          >
            {/* Header Brand */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 text-blue-400 font-extrabold text-xl font-mono">
                  <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center text-white">
                    <Zap className="w-4 h-4 fill-white" />
                  </div>
                  <span>EV CHARGE PRO</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 tracking-wider font-semibold uppercase">Smart Station System</p>
                <p className="text-xs text-slate-300 font-bold mt-2">{stationName}</p>
                <p className="text-[11px] text-slate-400">{stationAddress}</p>
              </div>

              <div className="text-right">
                <span className="px-3 py-1 text-xs font-mono font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-xl inline-block">
                  {invoiceId}
                </span>
                <p className="text-[11px] text-slate-400 mt-1.5 font-mono">Date: {invoiceDate}</p>
                <div className="flex items-center justify-end gap-1 mt-1 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 size={13} />
                  <span>PAID</span>
                </div>
              </div>
            </div>

            {/* Customer & Vehicle Grid */}
            <div className="grid grid-cols-2 gap-3 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Customer Details</span>
                <p className="font-bold text-white mt-1">{booking.customerName || "Priyan Customer"}</p>
                <p className="text-slate-400 text-[11px]">ID: {booking.counterId || "CUS0001"}</p>
                <p className="text-slate-400 text-[11px]">{booking.customerEmail || "priyan@evcharge.com"}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Vehicle Details</span>
                <p className="font-bold text-white mt-1">{vehModel}</p>
                <p className="text-slate-300 font-mono text-[11px] font-bold">{vehNum}</p>
                <p className="text-slate-400 text-[11px]">Type: {booking.vehicleType || "Electric Car"}</p>
              </div>
            </div>

            {/* Charging Telemetry Details */}
            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80 space-y-2 text-xs">
              <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800 pb-1.5">
                <span>Charging Telemetry</span>
                <span className="font-mono text-blue-400">{booking.bookingId || "EV1042"} • {sessionId}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Connector</span>
                  <span className="font-bold text-white">{connectorId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Type & Power</span>
                  <span className="font-bold text-white">{chargingType} • {powerKw} kW</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Battery Gained</span>
                  <span className="font-bold text-emerald-400">{startBat}% → {endBat}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Energy & Time</span>
                  <span className="font-bold text-white">{kwh} kWh ({duration})</span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 border-b border-slate-800 pb-1.5">
                <span>Description</span>
                <span>Amount (INR)</span>
              </div>
              <div className="flex justify-between text-slate-300 text-xs">
                <span>Energy Charge ({kwh} kWh @ ₹{tariff}/kWh)</span>
                <span>₹{energyCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-300 text-xs">
                <span>Platform Service Fee</span>
                <span>₹{serviceFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-400 text-xs">
                <span>Green Mobility Discount</span>
                <span>-₹{discount.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between items-center font-extrabold text-sm text-white">
                <span>Total Amount Paid</span>
                <span className="text-base text-emerald-400 font-mono">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment & QR Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-[11px] text-slate-400">
              <div className="space-y-0.5">
                <p><strong className="text-slate-300">Payment Method:</strong> {paymentMethod}</p>
                <p><strong className="text-slate-300">Payment ID:</strong> <span className="font-mono">{paymentId}</span></p>
                <p className="text-[10px] text-slate-400 mt-1">Thank you for using EV Charge Pro. Computer-generated invoice.</p>
              </div>
              <div className="p-1.5 bg-white rounded-xl shadow-md shrink-0">
                <QRCodeSVG value={verifyUrl} size={50} level="M" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Close */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
