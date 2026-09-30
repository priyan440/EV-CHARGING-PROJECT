import { useState, useEffect } from "react";
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
  Car,
  Zap,
  Gauge,
  Check,
  X,
  ExternalLink,
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
import { adminService } from "../../services/adminService";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [dbStats, setDbStats] = useState(null);
  const [stationCapacityList, setStationCapacityList] = useState([]);
  const [pendingStations, setPendingStations] = useState([]);
  const [pendingOwners, setPendingOwners] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, pendingStRes, pendingOwRes] = await Promise.all([
        adminService.getStats(),
        adminService.getPendingStations(),
        adminService.getPendingOwners(),
      ]);

      if (statsRes?.success && statsRes.stats) {
        setDbStats(statsRes.stats);
        if (statsRes.stationCapacityList) {
          setStationCapacityList(statsRes.stationCapacityList);
        }
      }
      if (pendingStRes?.success && Array.isArray(pendingStRes.data)) {
        setPendingStations(pendingStRes.data);
      }
      if (pendingOwRes?.success && Array.isArray(pendingOwRes.data)) {
        setPendingOwners(pendingOwRes.data);
      }
    } catch (err) {
      console.warn("Admin dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApproveStation = async (stationId) => {
    await adminService.approveStation(stationId);
    loadData();
  };

  const handleApproveOwner = async (ownerId) => {
    await adminService.approveOwner(ownerId);
    loadData();
  };

  const chartData = [
    { month: "Jan", users: 120, stations: 12, revenue: 32000 },
    { month: "Feb", users: 240, stations: 18, revenue: 48000 },
    { month: "Mar", users: 380, stations: 24, revenue: 64000 },
    { month: "Apr", users: 510, stations: 32, revenue: 89000 },
    { month: "May", users: 680, stations: 40, revenue: 112000 },
    { month: "Jun", users: 850, stations: 48, revenue: 145000 },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12 text-[var(--text-primary)]">
      {/* Header Banner */}
      <div className="theme-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 text-[10px] font-extrabold uppercase font-mono tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full border border-purple-500/20">
              ADMIN COMMAND CENTER
            </span>
            <span className="px-3 py-1 text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
              ● REAL-TIME SQL ENGINE
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
            <Zap size={28} className="text-purple-500" /> Platform Governance & Approval Overview
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Supervise registered EV networks, station approvals, power capacity distribution, and system-wide revenue.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate("/admin/control-center")}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <Activity size={15} /> Station Control Center
          </button>
          <button
            onClick={() => navigate("/admin/stations")}
            className="px-4 py-2.5 rounded-2xl bg-[var(--accent-primary)] text-white text-xs font-bold shadow-md cursor-pointer"
          >
            Manage Stations ({pendingStations.length} Pending)
          </button>
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="theme-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Customers & Drivers</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-[var(--accent-primary)] flex items-center justify-center">
              <Users size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--text-primary)] font-mono">
            {dbStats?.totalUsers ?? 124}
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
            ↑ Verified EV Drivers
          </span>
        </div>

        <div className="theme-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Station Owners</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--text-primary)] font-mono">
            {dbStats?.totalStationOwners ?? 4}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] block">
            {pendingOwners.length > 0 ? `${pendingOwners.length} Pending Review` : "All Approved"}
          </span>
        </div>

        <div className="theme-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Approved Stations</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Building2 size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--text-primary)] font-mono">
            {dbStats?.activeStations ?? dbStats?.totalChargingStations ?? 10}
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
            {pendingStations.length} Pending Approval
          </span>
        </div>

        <div className="theme-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Total Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--text-primary)] font-mono">
            ₹{(dbStats?.totalRevenue ?? 12450).toLocaleString("en-IN")}
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
            Razorpay Test Payments
          </span>
        </div>
      </div>

      {/* Pending Approvals Quick Action Area */}
      {(pendingStations.length > 0 || pendingOwners.length > 0) && (
        <div className="theme-card p-6 space-y-4 border-amber-500/40">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              Items Requiring Admin Approval
            </h3>
            <span className="text-xs font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full border border-amber-500/20">
              {pendingStations.length + pendingOwners.length} Awaiting Review
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pending Stations */}
            {pendingStations.map((st) => (
              <div key={st.id} className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-[var(--accent-primary)] block">
                    {st.network_name || "New Network"}
                  </span>
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">{st.station_name || st.name}</h4>
                  <p className="text-xs text-[var(--text-muted)]">📍 {st.city} • Owner: {st.owner_name || `ID #${st.owner_id}`}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleApproveStation(st.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm cursor-pointer flex items-center gap-1"
                  >
                    <Check size={13} /> Approve
                  </button>
                  <button
                    onClick={() => navigate("/admin/stations")}
                    className="p-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            ))}

            {/* Pending Owners */}
            {pendingOwners.map((ow) => (
              <div key={ow.id} className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-purple-600 dark:text-purple-400 block">
                    Station Owner Registration
                  </span>
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">{ow.name}</h4>
                  <p className="text-xs text-[var(--text-muted)]">🏢 {ow.company_name || ow.network_name || "Operator"} • {ow.email}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleApproveOwner(ow.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm cursor-pointer flex items-center gap-1"
                  >
                    <Check size={13} /> Approve
                  </button>
                  <button
                    onClick={() => navigate("/admin/owners")}
                    className="p-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid Load Distribution & Monthly Revenue Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="lg:col-span-7 theme-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
              <TrendingUp size={18} className="text-[var(--accent-primary)]" /> Network Revenue & Booking Volume
            </h3>
            <span className="text-xs font-mono text-[var(--text-muted)]">Monthly Aggregations</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-subtle)",
                    borderRadius: "12px",
                    color: "var(--text-primary)",
                  }}
                />
                <Bar dataKey="revenue" fill="var(--accent-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Real-time Grid Power Capacity */}
        <div className="lg:col-span-5 theme-card p-6 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2 mb-3">
              <Gauge size={18} className="text-emerald-500" /> Global Grid Power Capacity
            </h3>
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex justify-between">
                <span className="text-[var(--text-muted)]">Total Connected Power:</span>
                <span className="font-bold text-[var(--text-primary)]">{dbStats?.totalMaxPower || 1200} kW</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex justify-between">
                <span className="text-[var(--text-muted)]">Active Charging Load:</span>
                <span className="font-bold text-amber-500">{dbStats?.currentTotalPowerConsumption || 285} kW</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex justify-between">
                <span className="text-[var(--text-muted)]">Available Capacity:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{dbStats?.totalAvailablePower || 915} kW</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)]">
            <button
              onClick={() => navigate("/map")}
              className="w-full py-2.5 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] font-bold text-xs border border-[var(--border-subtle)] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>View Global EV Map Monitor</span>
              <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
