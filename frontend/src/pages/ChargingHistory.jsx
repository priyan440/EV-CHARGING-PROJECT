import { useState, useEffect } from "react";
import {
  History,
  Search,
  FileText,
  Download,
  RefreshCw,
  CheckCircle2,
  MapPin,
  Car,
  BatteryCharging,
  Zap,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getChargingHistory } from "../services/chargingService";
import InvoiceModal from "../components/InvoiceModal";

export default function ChargingHistory() {
  const { currentUser } = useAuth();

  const [historyList, setHistoryList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const fetchHistory = async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const data = await getChargingHistory();
      setHistoryList(data || []);
    } catch (err) {
      console.error("fetchHistory error:", err);
      setHistoryList([]);
    } finally {
      setIsLoading(false);
      if (showSpinner) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [currentUser]);

  const filtered = historyList.filter((b) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (b.sessionId || "").toLowerCase().includes(q) ||
      (b.bookingId || "").toLowerCase().includes(q) ||
      (b.stationName || "").toLowerCase().includes(q) ||
      (b.vehicleNumber || "").toLowerCase().includes(q) ||
      (b.invoiceNumber || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-inter">
      {/* Header */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0B132B] border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20 uppercase tracking-wider">
              CHARGING LOGS & RECEIPTS
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-3">
            <History size={28} className="text-blue-400" /> CHARGING HISTORY
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review your past completed charging sessions, energy consumed, duration, and download GST tax invoices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchHistory(true)}
            className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-blue-400 hover:border-blue-500/40 transition flex items-center gap-2 text-xs font-bold shadow-sm"
            title="Sync history"
          >
            <RefreshCw size={15} className={isRefreshing ? "animate-spin text-blue-400" : ""} />
            <span>Sync</span>
          </button>

          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search session, booking, vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="p-6 rounded-3xl bg-[#0B132B] border border-slate-800 shadow-xl overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-3 rounded-l-xl">Session / Booking ID</th>
              <th className="py-3 px-3">Date & Time</th>
              <th className="py-3 px-3">Station & Connector</th>
              <th className="py-3 px-3">Vehicle</th>
              <th className="py-3 px-3">Battery Transition</th>
              <th className="py-3 px-3">Energy Consumed</th>
              <th className="py-3 px-3">Duration</th>
              <th className="py-3 px-3">Amount</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right rounded-r-xl">Invoice</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-200 font-medium">
            {isLoading ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400">
                  <RefreshCw size={24} className="animate-spin text-blue-400 mx-auto mb-2" />
                  <span>Loading charging history records...</span>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-500 text-xs">
                  {searchTerm ? `No records matching "${searchTerm}".` : "No completed charging sessions found."}
                </td>
              </tr>
            ) : (
              filtered.map((b) => (
                <tr key={b.sessionId || b.id} className="hover:bg-slate-900/60 transition">
                  <td className="py-4 px-3">
                    <div className="font-mono font-bold text-blue-400">{b.sessionId}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{b.bookingId}</div>
                  </td>
                  <td className="py-4 px-3 text-slate-300">
                    <div>{b.startTime ? new Date(b.startTime).toLocaleDateString("en-IN") : "Today"}</div>
                    <div className="text-[10px] text-slate-500">{b.startTime ? new Date(b.startTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "14:00"}</div>
                  </td>
                  <td className="py-4 px-3">
                    <div className="font-bold text-white">{b.stationName || "GreenCharge Central"}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{b.connectorId || "STA001-C01"}</div>
                  </td>
                  <td className="py-4 px-3">
                    <div className="text-slate-200">{b.vehicleModel || "Tata Nexon EV Max"}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{b.vehicleNumber || "TN58AB1234"}</div>
                  </td>
                  <td className="py-4 px-3 font-mono font-bold text-emerald-400">
                    {b.batteryTransition || `${b.startingBattery || 20}% → ${b.finalBattery || 78}%`}
                  </td>
                  <td className="py-4 px-3 font-mono font-bold text-cyan-400">
                    {b.energyDelivered || 29.1} kWh
                  </td>
                  <td className="py-4 px-3 font-mono text-slate-300">
                    {b.durationMinutes || 52} min
                  </td>
                  <td className="py-4 px-3 font-mono font-bold text-white">
                    ₹{parseFloat(b.finalAmount || 436.50).toFixed(2)}
                  </td>
                  <td className="py-4 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {b.status || "COMPLETED"}
                    </span>
                  </td>
                  <td className="py-4 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedInvoice(b)}
                        className="px-2.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-bold text-[11px] flex items-center gap-1 transition"
                        title="View Tax Invoice"
                      >
                        <FileText size={13} /> View
                      </button>
                      <button
                        onClick={() => setSelectedInvoice(b)}
                        className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition"
                        title="Download PDF"
                      >
                        <Download size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invoice Modal for Preview & Download */}
      {selectedInvoice && (
        <InvoiceModal
          booking={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}
