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
  const vehModel = booking.vehicleModel || booking.brand || "Electric Vehicle";
  const vehNum = booking.vehicleNumber || booking.registrationNumber || "-";
  const stationName = booking.stationName || "Charging Station";
  const stationAddress = booking.stationAddress || "";
  const connectorId = booking.connectorId || "-";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in overflow-y-auto text-[var(--text-primary)]">
      <div className="theme-card w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden print:bg-white print:text-black font-sans my-8">
        
        {/* Header Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)] font-heading">EV Charge Pro Invoice</h3>
              <p className="text-xs text-[var(--text-secondary)]">Official Computer-Generated Tax Invoice</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              title="Download official PDF"
            >
              <Download size={14} /> Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl hover:bg-[var(--bg-surface)] transition cursor-pointer"
              title="Print"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl hover:bg-[var(--bg-surface)] transition cursor-pointer"
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
            className="theme-card p-6 shadow-card space-y-5 rounded-2xl"
          >
            {/* Header Brand */}
            <div className="flex justify-between items-start border-b border-[var(--border-subtle)] pb-4">
              <div>
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-extrabold text-xl font-mono">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                    <Zap className="w-4 h-4 fill-white" />
                  </div>
                  <span>EV CHARGE PRO</span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5 tracking-wider font-semibold uppercase">Smart Station System</p>
                <p className="text-xs text-[var(--text-primary)] font-bold mt-2">{stationName}</p>
                <p className="text-[11px] text-[var(--text-secondary)]">{stationAddress}</p>
              </div>

              <div className="text-right">
                <span className="px-3 py-1 text-xs font-mono font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 rounded-xl inline-block">
                  {invoiceId}
                </span>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 font-mono">Date: {invoiceDate}</p>
                <div className="flex items-center justify-end gap-1 mt-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                  <CheckCircle2 size={13} />
                  <span>PAID</span>
                </div>
              </div>
            </div>

            {/* Customer & Vehicle Grid */}
            <div className="grid grid-cols-2 gap-3 bg-[var(--bg-surface-raised)] p-3.5 rounded-2xl border border-[var(--border-subtle)] text-xs">
              <div>
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider">Customer Details</span>
                <p className="font-bold text-[var(--text-primary)] mt-1">{booking.customerName || "Priyan Customer"}</p>
                <p className="text-[var(--text-secondary)] text-[11px]">ID: {booking.counterId || "CUS0001"}</p>
                <p className="text-[var(--text-secondary)] text-[11px]">{booking.customerEmail || "priyan@evcharge.com"}</p>
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider">Vehicle Details</span>
                <p className="font-bold text-[var(--text-primary)] mt-1">{vehModel}</p>
                <p className="text-blue-600 dark:text-blue-400 font-mono text-[11px] font-bold">{vehNum}</p>
                <p className="text-[var(--text-secondary)] text-[11px]">Type: {booking.vehicleType || "Electric Car"}</p>
              </div>
            </div>

            {/* Charging Telemetry Details */}
            <div className="bg-[var(--bg-surface-raised)] p-3.5 rounded-2xl border border-[var(--border-subtle)] space-y-2 text-xs">
              <div className="flex justify-between items-center text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider border-b border-[var(--border-subtle)] pb-1.5">
                <span>Charging Telemetry</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">{booking.bookingId || "EV1042"} • {sessionId}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                <div>
                  <span className="text-[var(--text-muted)] block text-[10px]">Connector</span>
                  <span className="font-bold text-[var(--text-primary)]">{connectorId}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-[10px]">Type & Power</span>
                  <span className="font-bold text-[var(--text-primary)]">{chargingType} • {powerKw} kW</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-[10px]">Battery Gained</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{startBat}% → {endBat}%</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-[10px]">Energy & Time</span>
                  <span className="font-bold text-[var(--text-primary)]">{kwh} kWh ({duration})</span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-[10px] font-bold uppercase text-[var(--text-muted)] border-b border-[var(--border-subtle)] pb-1.5">
                <span>Description</span>
                <span>Amount (INR)</span>
              </div>
              <div className="flex justify-between text-[var(--text-secondary)] text-xs">
                <span>Energy Charge ({kwh} kWh @ ₹{tariff}/kWh)</span>
                <span className="font-mono font-medium text-[var(--text-primary)]">₹{energyCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[var(--text-secondary)] text-xs">
                <span>Platform Service Fee</span>
                <span className="font-mono font-medium text-[var(--text-primary)]">₹{serviceFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 text-xs">
                <span>Green Mobility Discount</span>
                <span className="font-mono font-medium">-₹{discount.toFixed(2)}</span>
              </div>
              <div className="border-t border-[var(--border-subtle)] pt-2 flex justify-between items-center font-extrabold text-sm text-[var(--text-primary)]">
                <span>Total Amount Paid</span>
                <span className="text-base text-emerald-600 dark:text-emerald-400 font-mono">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment & QR Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)]">
              <div className="space-y-0.5">
                <p><strong className="text-[var(--text-primary)]">Payment Method:</strong> {paymentMethod}</p>
                <p><strong className="text-[var(--text-primary)]">Payment ID:</strong> <span className="font-mono">{paymentId}</span></p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">Thank you for using EV Charge Pro. Computer-generated tax invoice.</p>
              </div>
              <div className="p-1.5 bg-white rounded-xl shadow-md border border-slate-200 shrink-0">
                <QRCodeSVG value={verifyUrl} size={50} level="M" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Close */}
        <div className="px-6 py-3 bg-[var(--bg-surface-raised)] border-t border-[var(--border-subtle)] flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
