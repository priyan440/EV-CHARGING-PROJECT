import { useState } from "react";
import {
  History,
  Search,
  FileText,
  Download,
  Printer,
  CheckCircle2,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useSystemState } from "../contexts/SystemStateContext";

export default function ChargingHistory() {
  const { currentUser } = useAuth();
  const { bookings } = useSystemState();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const userCounterId = currentUser?.counterId || "CUS0002";
  const myBookings = bookings.filter(
    (b) => b.counterId?.toUpperCase() === userCounterId.toUpperCase()
  );

  const filtered = myBookings.filter((b) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (b.bookingId || "").toLowerCase().includes(q) ||
      (b.stationName || "").toLowerCase().includes(q) ||
      (b.vehicleNumber || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
            <History size={28} className="text-emerald-400" /> Charging History & Receipts
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review past charging logs, total energy consumed, and download GST tax invoices.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search booking ID, station..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* History Table */}
      <div className="p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider">
              <th className="py-3 px-3 rounded-l-xl">Booking / Session ID</th>
              <th className="py-3 px-3">Date & Time</th>
              <th className="py-3 px-3">Station Name</th>
              <th className="py-3 px-3">Vehicle</th>
              <th className="py-3 px-3">Energy Consumed</th>
              <th className="py-3 px-3">Amount</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right rounded-r-xl">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-200 font-medium">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                  No charging history records found.
                </td>
              </tr>
            ) : (
              filtered.map((b) => (
                <tr key={b.bookingId} className="hover:bg-slate-900/60 transition">
                  <td className="py-4 px-3 font-mono font-bold text-emerald-400">{b.bookingId}</td>
                  <td className="py-4 px-3 text-slate-300">{b.date} {b.time}</td>
                  <td className="py-4 px-3 font-bold text-white">{b.stationName}</td>
                  <td className="py-4 px-3 font-mono text-slate-300">{b.vehicleNumber}</td>
                  <td className="py-4 px-3 font-mono font-bold text-cyan-400">{b.estimatedKwh || 18.2} kWh</td>
                  <td className="py-4 px-3 font-mono font-bold text-white">₹{b.totalAmount || b.estimatedAmount}</td>
                  <td className="py-4 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {b.paymentStatus || "Paid"}
                    </span>
                  </td>
                  <td className="py-4 px-3 text-right">
                    <button
                      onClick={() => setSelectedInvoice(b)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1 ml-auto"
                    >
                      <FileText size={12} /> Invoice
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Printable Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0B1329] border border-slate-800 p-6 rounded-3xl shadow-2xl text-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <Zap size={16} className="text-emerald-400 fill-emerald-400" /> TAX INVOICE
                </h3>
                <span className="text-[10px] font-mono text-slate-400">Invoice #{selectedInvoice.invoiceId || "INV000001"}</span>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
              <div className="flex justify-between text-slate-400">
                <span>Customer ID:</span>
                <span className="font-bold text-white">{selectedInvoice.counterId}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Customer Name:</span>
                <span className="font-bold text-white">{selectedInvoice.customerName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Vehicle Plate:</span>
                <span className="font-bold text-emerald-400">{selectedInvoice.vehicleNumber}</span>
              </div>
              <hr className="border-slate-800 my-2" />
              <div className="flex justify-between text-slate-400">
                <span>Station:</span>
                <span className="font-bold text-white">{selectedInvoice.stationName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Charger Bay:</span>
                <span className="font-bold text-white">{selectedInvoice.chargerId} ({selectedInvoice.connectorType})</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Energy Consumed:</span>
                <span className="font-bold text-cyan-400">{selectedInvoice.estimatedKwh || 18.2} kWh</span>
              </div>
              <hr className="border-slate-800 my-2" />
              <div className="flex justify-between text-slate-400">
                <span>Base Charging Fee:</span>
                <span>₹{(selectedInvoice.chargingCost || selectedInvoice.totalAmount * 0.8).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Service Fee:</span>
                <span>₹20.00</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>GST Tax (18%):</span>
                <span>₹{(selectedInvoice.tax || selectedInvoice.totalAmount * 0.15).toFixed(2)}</span>
              </div>
              <hr className="border-slate-800 my-2" />
              <div className="flex justify-between items-center text-sm font-extrabold text-white pt-1">
                <span>Total Paid:</span>
                <span className="text-emerald-400 text-base">₹{selectedInvoice.totalAmount || selectedInvoice.estimatedAmount}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Printer size={14} /> Print Invoice
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
