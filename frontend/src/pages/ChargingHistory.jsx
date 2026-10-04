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
      <div className="theme-card p-6 md:p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full border border-blue-500/20 uppercase tracking-wider">
              CHARGING LOGS & RECEIPTS
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-3">
            <History size={28} className="text-blue-500 dark:text-blue-400" /> CHARGING HISTORY
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Review your past completed charging sessions, energy consumed, duration, and download GST tax invoices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchHistory(true)}
            className="p-3 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:text-blue-500 hover:border-blue-500/40 transition flex items-center gap-2 text-xs font-bold shadow-sm"
            title="Sync history"
          >
            <RefreshCw size={15} className={isRefreshing ? "animate-spin text-blue-500" : ""} />
            <span>Sync</span>
          </button>

          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search session, booking, vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="theme-input w-full text-xs rounded-xl pl-9 pr-4 py-2.5"
            />
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="theme-card p-6 rounded-3xl overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] text-[var(--text-secondary)] font-bold uppercase tracking-wider text-[10px]">
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
          <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)] font-medium">
            {isLoading ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-[var(--text-muted)]">
                  <RefreshCw size={24} className="animate-spin text-blue-500 mx-auto mb-2" />
                  <span>Loading charging history records...</span>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-[var(--text-muted)] text-xs">
                  {searchTerm ? `No records matching "${searchTerm}".` : "No completed charging sessions found."}
                </td>
              </tr>
            ) : (
              filtered.map((b) => (
                <tr key={b.sessionId || b.id} className="hover:bg-[var(--bg-surface-raised)] transition">
                  <td className="py-4 px-3">
                    <div className="font-mono font-bold text-blue-600 dark:text-blue-400">{b.sessionId}</div>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono">{b.bookingId}</div>
                  </td>
                  <td className="py-4 px-3 text-[var(--text-secondary)]">
                    <div>{b.startTime ? new Date(b.startTime).toLocaleDateString("en-IN") : "-"}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">{b.startTime ? new Date(b.startTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "-"}</div>
                  </td>
                  <td className="py-4 px-3">
                    <div className="font-bold text-[var(--text-primary)]">{b.stationName || "Charging Station"}</div>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono">{b.connectorId || "-"}</div>
                  </td>
                  <td className="py-4 px-3">
                    <div className="text-[var(--text-primary)]">{b.vehicleModel || b.brand || "-"}</div>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono">{b.vehicleNumber || "-"}</div>
                  </td>
                  <td className="py-4 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {b.batteryTransition || (b.startingBattery && b.finalBattery ? `${b.startingBattery}% → ${b.finalBattery}%` : (b.batterySoc ? `${b.batterySoc}%` : "-"))}
                  </td>
                  <td className="py-4 px-3 font-mono font-bold text-cyan-600 dark:text-cyan-400">
                    {b.energyDelivered !== undefined && b.energyDelivered !== null ? `${b.energyDelivered} kWh` : (b.energyKwh ? `${b.energyKwh} kWh` : "0.0 kWh")}
                  </td>
                  <td className="py-4 px-3 font-mono text-[var(--text-secondary)]">
                    {b.durationMinutes || b.duration || 0} min
                  </td>
                  <td className="py-4 px-3 font-mono font-bold text-[var(--text-primary)]">
                    ₹{parseFloat(b.finalAmount || b.totalAmount || b.amount || 0).toFixed(2)}
                  </td>
                  <td className="py-4 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      {b.status || b.sessionStatus || "COMPLETED"}
                    </span>
                  </td>
                  <td className="py-4 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedInvoice(b)}
                        className="px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                        title="View Tax Invoice"
                      >
                        <FileText size={13} /> View
                      </button>
                      <button
                        onClick={() => setSelectedInvoice(b)}
                        className="p-1.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] hover:border-blue-500/40 text-[var(--text-secondary)] hover:text-blue-500 transition cursor-pointer"
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
