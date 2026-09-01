import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Printer, Download, X, Zap, ShieldCheck, FileText } from "lucide-react";

export default function InvoiceModal({ booking, onClose }) {
  const invoiceRef = useRef(null);

  if (!booking) return null;

  const invoiceId = booking.invoiceId || `INV-2026-${(booking.bookingId || "000123").replace(/\D/g, "") || "000123"}`;
  const kwh = booking.estimatedKwh || 18.5;
  const rate = 18;
  const chargingCost = booking.chargingCost || Math.round(kwh * rate);
  const serviceFee = booking.serviceFee || 20;
  const subtotal = chargingCost + serviceFee - (booking.discountAmount || 0);
  const tax = booking.tax || Math.round(subtotal * 0.18);
  const grandTotal = booking.totalAmount || subtotal + tax;

  const verifyUrl = `${window.location.origin}/booking/verify/${booking.bookingId || "EVB-998877"}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        backgroundColor: "#070D1E",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      pdf.save(`${invoiceId}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-[#0B132B] border border-slate-700/80 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden text-slate-100 print:bg-white print:text-black font-inter">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white font-grotesk">Official EV Tax Invoice</h3>
              <p className="text-xs text-slate-400">Computer Generated Invoice & QR Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Body Container */}
        <div className="p-6 space-y-5">
          <div
            ref={invoiceRef}
            className="bg-[#070D1E] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5"
          >
            {/* Header Banner */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 font-extrabold font-grotesk text-xl">
                  <Zap className="w-5 h-5 fill-emerald-400" />
                  <span>VOLTCHARGE PLATFORM</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">GSTIN: 33AAAAA0000A1Z5 • ISO 9001:2026</p>
                <p className="text-[11px] text-slate-300 font-bold">{booking.stationName || "EV Power Hub"}</p>
              </div>

              <div className="text-right">
                <span className="px-3 py-1 text-xs font-mono font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-xl inline-block">
                  {invoiceId}
                </span>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">Date: {booking.date}</p>
                <p className="text-[11px] text-slate-400">Status: <strong className="text-emerald-400">PAID</strong></p>
              </div>
            </div>

            {/* Customer & Vehicle Information */}
            <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Customer Billed To</span>
                <p className="font-extrabold text-white text-sm">{booking.customerName || "Priyan Customer"}</p>
                <p className="text-[11px] text-slate-400 font-mono">Counter ID: {booking.counterId || "CUS0001"}</p>
                <p className="text-[11px] text-slate-400 font-mono">Email: priyan.ev@example.com</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Vehicle & Slot</span>
                <p className="font-extrabold text-emerald-300 text-sm font-mono">{booking.vehicleNumber || "TN58AB1234"}</p>
                <p className="text-[11px] text-slate-300 font-bold">{booking.connectorType || "CCS2"} Charger</p>
                <p className="text-[11px] text-slate-400 font-mono">{booking.date} at {booking.time}</p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-12 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 pb-2 font-grotesk">
                <span className="col-span-6">Description</span>
                <span className="col-span-2 text-center">Qty / kWh</span>
                <span className="col-span-2 text-right">Rate</span>
                <span className="col-span-2 text-right">Total</span>
              </div>

              <div className="grid grid-cols-12 text-xs py-1 font-mono">
                <span className="col-span-6 text-white font-bold">EV Energy Charging ({booking.connectorType || "CCS2"})</span>
                <span className="col-span-2 text-center text-slate-300">{kwh} kWh</span>
                <span className="col-span-2 text-right text-slate-300">₹{rate}</span>
                <span className="col-span-2 text-right text-white font-bold">₹{chargingCost}</span>
              </div>

              <div className="grid grid-cols-12 text-xs py-1 font-mono">
                <span className="col-span-6 text-slate-300">Platform & Station Service Fee</span>
                <span className="col-span-2 text-center text-slate-400">1</span>
                <span className="col-span-2 text-right text-slate-400">₹{serviceFee}</span>
                <span className="col-span-2 text-right text-slate-200">₹{serviceFee}</span>
              </div>

              {booking.discountAmount > 0 && (
                <div className="grid grid-cols-12 text-xs py-1 text-emerald-400 font-bold font-mono">
                  <span className="col-span-6">Promo Coupon Discount ({booking.couponCode || "EVFIRST50"})</span>
                  <span className="col-span-2 text-center">-</span>
                  <span className="col-span-2 text-right">-</span>
                  <span className="col-span-2 text-right">-₹{booking.discountAmount}</span>
                </div>
              )}
            </div>

            {/* Subtotal & Razorpay References */}
            <div className="border-t border-slate-800 pt-3 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>GST Tax (18%):</span>
                <span>₹{tax}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-extrabold text-base pt-2 border-t border-slate-800 font-grotesk">
                <span>Grand Total Paid:</span>
                <span>₹{grandTotal}</span>
              </div>

              <div className="pt-2 text-[10px] text-slate-400 space-y-1">
                <div>Razorpay Order ID: <strong className="text-slate-200">{booking.razorpayOrderId || "order_test_01"}</strong></div>
                <div>Razorpay Payment ID: <strong className="text-emerald-400">{booking.razorpayPaymentId || booking.paymentId || "pay_test_01"}</strong></div>
              </div>
            </div>

            {/* REAL QR CODE & FOOTER */}
            <div className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div>
                <p className="text-xs font-bold text-white font-grotesk">Digital Verification QR</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Scan to verify booking validity</p>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 mt-2 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Server Signature
                </div>
              </div>

              <div className="bg-white p-2 rounded-xl shadow-md shrink-0">
                <QRCodeSVG
                  value={verifyUrl}
                  size={75}
                  level="M"
                />
              </div>
            </div>

            <p className="text-[10px] text-slate-500 text-center font-mono">
              Thank you for using our EV Charging Platform. This is a computer-generated invoice.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2 print:hidden font-grotesk">
            <button
              onClick={handlePrint}
              className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 border border-slate-700"
            >
              <Printer className="w-4 h-4" /> Print Invoice
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Download className="w-4 h-4" /> Download PDF
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
