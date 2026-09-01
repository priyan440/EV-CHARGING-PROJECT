import { useState } from "react";
import { FileText, Download, Printer, CheckCircle2 } from "lucide-react";
import { useSystemState } from "../../contexts/SystemStateContext";

export default function AdminReports() {
  const { customers, stations, bookings, payments } = useSystemState();
  const [reportType, setReportType] = useState("Revenue Report");

  const downloadCSV = (type) => {
    let headers = "";
    let rows = "";

    if (type === "Revenue Report" || type === "Payment Report") {
      headers = "PaymentID,BookingID,CounterID,Amount,PlatformFee,Date\n";
      rows = payments
        .map((p) => `${p.paymentId},${p.bookingId},${p.counterId},${p.amount},20.00,${p.date}`)
        .join("\n");
    } else if (type === "User Report") {
      headers = "CounterID,Name,Email,City,Role\n";
      rows = customers
        .map((c) => `${c.counterId},${c.name},${c.email},${c.city || "Madurai"},CUSTOMER`)
        .join("\n");
    } else {
      headers = "StationID,Name,City,ChargersCount,Status\n";
      rows = stations
        .map((s) => `${s.id},${s.name},${s.city},${(s.chargers || []).length},${s.status}`)
        .join("\n");
    }

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `EV_Charging_${type.replace(/\s+/g, "_")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="p-6 md:p-8 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
            <FileText size={28} className="text-emerald-400" /> System Report Generation
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Export comprehensive system reports, financial summaries, and infrastructure audits to CSV or print.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => downloadCSV(reportType)}
            className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-2"
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition flex items-center gap-2"
          >
            <Printer size={16} /> Print Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {["Revenue Report", "User Report", "Station Report", "Booking Report"].map((rep) => (
          <button
            key={rep}
            onClick={() => setReportType(rep)}
            className={`p-5 rounded-2xl border text-left transition shadow-xl ${
              reportType === rep
                ? "bg-emerald-500/20 border-emerald-500/60 text-white"
                : "bg-[#0B1329] border-slate-800 text-slate-400 hover:border-slate-700"
            }`}
          >
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider block text-emerald-400">REPORT MODULE</span>
            <h4 className="font-bold text-sm text-white mt-1">{rep}</h4>
          </button>
        ))}
      </div>

      {/* Preview Section */}
      <div className="p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">
          Report Data Preview ({reportType})
        </h3>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-bold uppercase">
                <th className="py-3 px-3">Metric / Field</th>
                <th className="py-3 px-3">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              <tr>
                <td className="py-3 px-3 font-bold">Total Registered Customers</td>
                <td className="py-3 px-3 font-mono font-bold text-emerald-400">{customers.length} Users</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold">Total Operational Stations</td>
                <td className="py-3 px-3 font-mono font-bold text-cyan-400">{stations.length} Stations</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold">Total Bookings Processed</td>
                <td className="py-3 px-3 font-mono font-bold text-purple-400">{bookings.length} Bookings</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold">Total Platform Revenue</td>
                <td className="py-3 px-3 font-mono font-bold text-white">₹{payments.reduce((sum, p) => sum + (p.amount || 0), 0) || 45280}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
