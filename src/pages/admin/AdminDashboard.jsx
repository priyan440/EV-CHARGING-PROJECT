import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  ShieldCheck,
  Building2,
  Activity,
  CalendarCheck,
  DollarSign,
  Clock,
  TrendingUp,
  FileText,
  AlertTriangle,
  Download,
  Server,
  Settings,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useAuth } from "../../contexts/AuthContext";
import { useSystemState } from "../../contexts/SystemStateContext";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { customers, owners, stations, bookings, payments, auditLogs, updateOwnerStatus, updateStationStatus } = useSystemState();

  const pendingOwners = owners.filter((o) => o.status === "Pending Approval");
  const pendingStations = stations.filter((s) => s.status === "Pending Approval");

  const totalChargers = stations.reduce((sum, s) => sum + ((s.chargers || []).length || 4), 0);
  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0) || 82500;

  const chartData = [
    { month: "Jan", users: 120, stations: 12, revenue: 32000 },
    { month: "Feb", users: 240, stations: 18, revenue: 48000 },
    { month: "Mar", users: 380, stations: 24, revenue: 64000 },
    { month: "Apr", users: 510, stations: 32, revenue: 89000 },
    { month: "May", users: 680, stations: 40, revenue: 112000 },
    { month: "Jun", users: 850, stations: 48, revenue: 145000 },
  ];

  const handleExportCSV = (dataType) => {
    let csvContent = "";
    let filename = `${dataType}_export.csv`;

    if (dataType === "bookings") {
      csvContent = "BookingID,Customer,Station,Date,Time,Amount,Status\n" +
        bookings.map((b) => `${b.bookingId},${b.customerName},${b.stationName},${b.date},${b.time},${b.totalAmount},${b.status}`).join("\n");
    } else if (dataType === "payments") {
      csvContent = "PaymentID,BookingID,RazorpayOrderID,Amount,Method,Status\n" +
        payments.map((p) => `${p.paymentId},${p.bookingId},${p.razorpayOrderId || "N/A"},${p.amount},${p.paymentMethod},${p.status}`).join("\n");
    } else {
      csvContent = "StationID,StationName,City,OwnerID,Status\n" +
        stations.map((s) => `${s.id},${s.name},${s.city},${s.ownerCounterId},${s.status}`).join("\n");
    }

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#0B1329] via-[#1A0B2E] to-[#0A1B2A] border border-purple-900/40 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 text-[10px] font-extrabold uppercase font-mono tracking-wider bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30">
              ADMIN COMMAND CENTER
            </span>
            <span className="px-3 py-1 text-[10px] font-extrabold font-mono tracking-wider bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
              SYSTEM HEALTH ONLINE
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            System Administration Overview
          </h1>

          <p className="text-xs text-slate-300 mt-1">
            Complete ecosystem control: station owner approvals, dispute management, system health monitoring, and data exports.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate("/admin/health")}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs border border-slate-700 transition flex items-center gap-1.5"
          >
            <Server size={15} /> System Health
          </button>

          <button
            onClick={() => handleExportCSV("bookings")}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-950/40 transition flex items-center gap-1.5"
          >
            <Download size={15} /> Export CSV Data
          </button>
        </div>
      </div>

      {/* Overview Cards (4 Cards Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0B1329] border border-slate-800 shadow-xl">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Total Customers</span>
          <h3 className="text-xl font-black text-white font-mono mt-1">{customers.length || 142}</h3>
          <span className="text-[10px] text-emerald-400 font-bold mt-1 block">Active Drivers</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0B1329] border border-slate-800 shadow-xl">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Station Owners</span>
          <h3 className="text-xl font-black text-white font-mono mt-1">{owners.length || 18}</h3>
          <span className="text-[10px] text-purple-400 font-bold mt-1 block">{pendingOwners.length} Pending Approval</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0B1329] border border-slate-800 shadow-xl">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Total Stations</span>
          <h3 className="text-xl font-black text-white font-mono mt-1">{stations.length || 24}</h3>
          <span className="text-[10px] text-cyan-400 font-bold mt-1 block">Registered Infrastructure</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0B1329] border border-slate-800 shadow-xl">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Total Chargers</span>
          <h3 className="text-xl font-black text-white font-mono mt-1">{totalChargers || 96}</h3>
          <span className="text-[10px] text-emerald-400 font-bold mt-1 block">Active Ports</span>
        </div>
      </div>

      {/* PENDING APPROVALS SECTION */}
      {(pendingOwners.length > 0 || pendingStations.length > 0) && (
        <div className="p-6 rounded-3xl bg-[#0B1329] border border-amber-500/40 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock size={20} className="text-amber-400 animate-pulse" /> Pending Registration Approvals
            </h3>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/20 px-3 py-1 rounded-xl border border-amber-500/30">
              Action Required
            </span>
          </div>

          <div className="space-y-3">
            {pendingOwners.map((owner) => (
              <div key={owner.counterId} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30 mr-2">
                    {owner.counterId}
                  </span>
                  <span className="font-bold text-white text-sm">{owner.ownerName}</span> ({owner.businessName})
                  <div className="text-slate-400 text-[11px] mt-0.5">GST: {owner.gstNumber || "33AAAAA0000A1Z5"} | City: {owner.city}</div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => updateOwnerStatus(owner.counterId, "Approved")}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs"
                  >
                    Approve Owner
                  </button>
                  <button
                    onClick={() => updateOwnerStatus(owner.counterId, "Rejected")}
                    className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 font-bold text-xs"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Charts & Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <TrendingUp size={18} className="text-purple-400" /> Ecosystem Analytics
          </h3>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="month" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155", borderRadius: "12px", color: "#FFF" }} />
                <Bar dataKey="users" fill="#8B5CF6" radius={[6, 6, 0, 0]} name="Users" />
                <Bar dataKey="stations" fill="#10B981" radius={[6, 6, 0, 0]} name="Stations" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white">Audit Log Activity</h3>
            <button onClick={() => navigate("/admin/audit-logs")} className="text-xs font-bold text-purple-400 hover:text-purple-300">
              View All
            </button>
          </div>

          <div className="space-y-3">
            {auditLogs.slice(0, 4).map((log) => (
              <div key={log.id} className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-purple-400 text-[10px]">{log.user}</span>
                  <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="font-bold text-white text-[11px]">{log.action}</div>
                <div className="text-slate-400 text-[10px] line-clamp-1">{log.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
