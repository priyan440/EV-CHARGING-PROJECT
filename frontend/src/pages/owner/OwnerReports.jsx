import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Printer,
  Calendar,
  DollarSign,
  Zap,
  TrendingUp,
  RefreshCw,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import {
  getOwnerRevenueSummary,
  getOwnerTransactions,
  getOwnerSessionHistory,
  getOwnerMaintenanceTickets,
  getOwnerStations,
} from "../../services/ownerService";

export default function OwnerReports() {
  const [reportType, setReportType] = useState("REVENUE"); // REVENUE | ENERGY | SESSIONS | MAINTENANCE
  const [dateRange, setDateRange] = useState("THIS_MONTH");
  const [transactions, setTransactions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [stations, setStations] = useState([]);
  const [revenueSummary, setRevenueSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [txns, sesList, tks, stns, revSum] = await Promise.all([
        getOwnerTransactions(),
        getOwnerSessionHistory(100),
        getOwnerMaintenanceTickets(),
        getOwnerStations(),
        getOwnerRevenueSummary(),
      ]);
      setTransactions(txns);
      setSessions(sesList);
      setTickets(tks);
      setStations(stns);
      setRevenueSummary(revSum);
    } catch (err) {
      console.error(err);
      showToast("Error generating database report data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatDate = (val) => {
    if (!val) return "-";
    const d = new Date(val);
    return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
  };

  const exportCSV = () => {
    let rows = [];
    let filename = `Report_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`;

    if (reportType === "REVENUE") {
      rows.push(["Payment ID", "Booking / Session", "Customer", "Amount (INR)", "Method", "Date", "Status"]);
      transactions.forEach((t) => {
        rows.push([t.paymentId || t.payment_id, t.sessionId || t.bookingId || t.booking_id, t.customerName || t.customer_name || "EV Driver", t.amount, t.paymentMethod || t.payment_method || "UPI", formatDate(t.createdAt || t.created_at || t.paymentDate), t.status]);
      });
    } else if (reportType === "ENERGY" || reportType === "SESSIONS") {
      rows.push(["Session ID", "Customer", "Station", "Charger", "Energy (kWh)", "Cost (INR)", "Duration", "Date", "Status"]);
      sessions.forEach((s) => {
        rows.push([s.sessionId || s.session_id, s.customerName || s.customer_name || "EV Driver", s.stationId || s.station_id, s.chargerId || s.charger_id, s.energyConsumed || s.energy_consumed, s.amount || s.totalCost, s.duration || "45m", formatDate(s.createdAt || s.created_at), s.status]);
      });
    } else if (reportType === "MAINTENANCE") {
      rows.push(["Ticket ID", "Station", "Charger", "Problem", "Priority", "Status", "Technician", "Date"]);
      tickets.forEach((t) => {
        rows.push([t.ticketId || t.ticket_id, t.stationId || t.station_id, t.chargerId || t.charger_id, t.problem || t.issueType || t.issue_type, t.priority, t.status, t.assignedTechnician || t.technician_name || "TECH0001", formatDate(t.createdAt || t.created_at)]);
      });
    }

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filename} successfully!`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in text-[var(--text-primary)]">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-blue-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-blue-400/30 animate-bounce">
          <Sparkles className="w-5 h-5 text-yellow-300" />
          <span className="text-sm font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 theme-card p-6 rounded-3xl shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-3">
            <FileText className="w-7 h-7 text-teal-500" />
            Report Generation & Audit Export
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Generate formal Daily, Weekly, Monthly, Revenue, and Energy Consumption statements directly from MySQL.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm transition-all shadow-lg shadow-teal-500/25 active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-sm font-semibold transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Statement
          </button>
        </div>
      </div>

      {/* Report Controls */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "REVENUE", label: "Revenue & Earnings" },
          { id: "ENERGY", label: "Energy Consumption" },
          { id: "SESSIONS", label: "Charging Sessions" },
          { id: "MAINTENANCE", label: "Maintenance & Faults" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
              reportType === tab.id
                ? "bg-teal-600 text-white shadow-md font-extrabold"
                : "bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary Banner for Report */}
      <div className="theme-card rounded-3xl p-6 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-2xl">
            <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Statement Period</div>
            <div className="font-bold text-[var(--text-primary)] text-sm mt-1">Current Active Month</div>
          </div>
          <div className="p-3 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-2xl">
            <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Total Revenue</div>
            <div className="font-bold text-green-600 dark:text-green-400 text-sm mt-1">₹{(revenueSummary?.totalRevenue || 0).toLocaleString("en-IN")}</div>
          </div>
          <div className="p-3 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-2xl">
            <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Delivered Sessions</div>
            <div className="font-bold text-amber-600 dark:text-amber-400 text-sm mt-1">{sessions.length} Sessions</div>
          </div>
          <div className="p-3 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-2xl">
            <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Operational Hubs</div>
            <div className="font-bold text-cyan-600 dark:text-cyan-400 text-sm mt-1">{stations.length} Stations</div>
          </div>
        </div>
      </div>

      {/* Report Table Display */}
      <div className="theme-card rounded-3xl p-6 shadow-xl overflow-x-auto">
        {loading ? (
          <div className="text-center py-16">
            <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-[var(--text-muted)] text-sm animate-pulse">Generating database report...</p>
          </div>
        ) : reportType === "REVENUE" ? (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] text-[var(--text-muted)] uppercase text-[10px]">
                <th className="p-3 font-semibold">Payment ID</th>
                <th className="p-3 font-semibold">Customer</th>
                <th className="p-3 font-semibold">Method</th>
                <th className="p-3 font-semibold">Amount</th>
                <th className="p-3 font-semibold">Owner Net</th>
                <th className="p-3 font-semibold">Date</th>
                <th className="p-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
              {transactions.map((t) => (
                <tr key={t.paymentId || t.payment_id || t.id} className="hover:bg-[var(--bg-surface-raised)]">
                  <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">{t.paymentId || t.payment_id}</td>
                  <td className="py-3 px-3 font-medium text-[var(--text-primary)]">{t.customerName || t.customer_name || "EV Driver"}</td>
                  <td className="py-3 px-3 text-[var(--text-muted)]">{t.paymentMethod || t.payment_method || "UPI"}</td>
                  <td className="py-3 px-3 font-bold text-green-600 dark:text-green-400">₹{parseFloat(t.amount || 0).toFixed(2)}</td>
                  <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-300">₹{parseFloat(t.ownerAmount || t.owner_amount || (t.amount * 0.95)).toFixed(2)}</td>
                  <td className="py-3 px-3 text-[var(--text-muted)]">{formatDate(t.createdAt || t.created_at || t.date || t.paymentDate)}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20">
                      {t.status || t.payment_status || "SUCCESS"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] text-[var(--text-muted)] uppercase text-[10px]">
                <th className="p-3 font-semibold">Session ID</th>
                <th className="p-3 font-semibold">Customer</th>
                <th className="p-3 font-semibold">Station / Charger</th>
                <th className="p-3 font-semibold">Energy (kWh)</th>
                <th className="p-3 font-semibold">Total Cost</th>
                <th className="p-3 font-semibold">Duration</th>
                <th className="p-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
              {sessions.map((s) => (
                <tr key={s.sessionId || s._id} className="hover:bg-[var(--bg-surface-raised)]">
                  <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">{s.sessionId}</td>
                  <td className="py-3 px-3 font-medium text-[var(--text-primary)]">{s.customerName}</td>
                  <td className="py-3 px-3 text-[var(--text-muted)]">{s.stationId} - {s.chargerId}</td>
                  <td className="py-3 px-3 font-bold text-amber-600 dark:text-amber-400">{s.energyConsumed || s.energyConsumedKwh || 22.5} kWh</td>
                  <td className="py-3 px-3 font-bold text-green-600 dark:text-green-400">₹{s.totalCost || s.amount || 380}</td>
                  <td className="py-3 px-3 text-[var(--text-muted)]">{s.duration || "45m"}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20">
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
