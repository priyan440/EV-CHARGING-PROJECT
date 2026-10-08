import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Zap,
  LayoutDashboard,
  MapPin,
  CalendarCheck,
  History,
  Activity,
  CreditCard,
  Car,
  Star,
  User,
  Settings,
  LogOut,
  Building2,
  Cpu,
  TrendingUp,
  Wrench,
  Users,
  ShieldCheck,
  FileText,
  PieChart,
  ClipboardList,
  AlertTriangle,
  X,
  BatteryCharging,
  BrainCircuit,
  Lock,
  Globe,
  Flame,
  Box,
  Bell,
  DollarSign,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import ThemeToggle from "./ThemeToggle";
import { getActiveChargingSession } from "../services/chargingService";

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, role, logout } = useAuth();
  const r = (role || "").toUpperCase();

  const [hasActiveCharging, setHasActiveCharging] = useState(false);

  useEffect(() => {
    if (r === "CUSTOMER" || r === "USER") {
      getActiveChargingSession()
        .then((res) => {
          setHasActiveCharging(Boolean(res?.active && res?.session));
        })
        .catch(() => {});
    }
  }, [location.pathname, r]);

  const customerLinks = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "My Vehicles", path: "/vehicles", icon: Car },
    { label: "Find Stations", path: "/stations", icon: MapPin },
    { label: "Book Charging", path: "/book-slot", icon: CalendarCheck },
    { label: "My Bookings", path: "/my-bookings", icon: ClipboardList },
    { label: "Charging Sessions", path: "/sessions", icon: Activity, badge: hasActiveCharging ? "ACTIVE" : null },
    { label: "Charging History", path: "/history", icon: History },
    { label: "Payments", path: "/payments", icon: CreditCard },
    { label: "Live EV Map", path: "/map", icon: Globe },
    { label: "Vehicle Health", path: "/vehicle-health", icon: BatteryCharging },
    { label: "Emergency Assistance", path: "/emergency-assistance", icon: AlertTriangle },
    { label: "Reviews", path: "/customer/reviews", icon: Star },
    { label: "Complaints", path: "/customer/complaints", icon: AlertTriangle },
    { label: "Profile", path: "/profile", icon: User },
    { label: "Settings", path: "/settings", icon: Settings },
  ];

  const ownerLinks = [
    { label: "Dashboard", path: "/owner/dashboard", icon: LayoutDashboard },
    { label: "My Stations", path: "/owner/stations", icon: Building2 },
    { label: "Station Map", path: "/owner/map", icon: Globe },
    { label: "Chargers & Simulator", path: "/owner/chargers", icon: Cpu },
    { label: "Bookings", path: "/owner/bookings", icon: CalendarCheck },
    { label: "Live Sessions", path: "/owner/sessions", icon: Activity },
    { label: "Customers", path: "/owner/customers", icon: Users },
    { label: "Tariffs", path: "/owner/tariffs", icon: CreditCard },
    { label: "Revenue & Payouts", path: "/owner/revenue", icon: TrendingUp },
    { label: "Complaints", path: "/owner/complaints", icon: AlertTriangle },
    { label: "Maintenance & Faults", path: "/owner/maintenance", icon: Wrench },
    { label: "Smart Load Balance", path: "/owner/smart-load", icon: Zap },
    { label: "Analytics", path: "/owner/analytics", icon: PieChart },
    { label: "Reports", path: "/owner/reports", icon: FileText },
    { label: "Notifications", path: "/owner/notifications", icon: Bell },
    { label: "Audit Logs", path: "/owner/audit-logs", icon: ClipboardList },
    { label: "AI Assistant", path: "/owner/ai-dashboard", icon: BrainCircuit },
    { label: "QR Scanner", path: "/owner/scanner", icon: Cpu },
    { label: "Profile", path: "/owner/profile", icon: User },
    { label: "Settings", path: "/owner/settings", icon: Settings },
  ];

  const adminLinks = [
    { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Users", path: "/admin/users", icon: Users },
    { label: "Station Owners", path: "/admin/owners", icon: ShieldCheck },
    { label: "Stations", path: "/admin/stations", icon: Building2 },
    { label: "Chargers", path: "/admin/chargers", icon: Cpu },
    { label: "Bookings", path: "/admin/bookings", icon: CalendarCheck },
    { label: "Live Sessions", path: "/admin/sessions", icon: Activity },
    { label: "Payments", path: "/admin/payments", icon: CreditCard },
    { label: "Real-Time Analytics", path: "/admin/realtime-analytics", icon: TrendingUp },
    { label: "Emergency Requests", path: "/admin/emergency", icon: AlertTriangle },
    { label: "Pricing & Tariffs", path: "/admin/pricing", icon: DollarSign },
    { label: "Control Center", path: "/admin/control-center", icon: Activity },
    { label: "Technicians", path: "/admin/technicians", icon: Wrench },
    { label: "Complaints", path: "/admin/complaints", icon: AlertTriangle },
    { label: "Maintenance", path: "/admin/maintenance", icon: Wrench },
    { label: "Reports", path: "/admin/reports", icon: FileText },
    { label: "System Health", path: "/admin/health", icon: ShieldCheck },
    { label: "Audit Logs", path: "/admin/audit-logs", icon: ClipboardList },
    { label: "Security Center", path: "/security", icon: Lock },
    { label: "Profile", path: "/admin/profile", icon: User },
    { label: "Settings", path: "/admin/settings", icon: Settings },
  ];

  const technicianLinks = [
    { label: "Dashboard", path: "/technician/dashboard?tab=overview", icon: LayoutDashboard },
    { label: "Assigned Stations", path: "/technician/dashboard?tab=stations", icon: Building2 },
    { label: "Maintenance Tasks", path: "/technician/dashboard?tab=tasks", icon: Wrench },
    { label: "Station Health", path: "/technician/dashboard?tab=health", icon: Activity },
    { label: "Fault Reports", path: "/technician/dashboard?tab=faults", icon: AlertTriangle },
    { label: "Repair Requests", path: "/technician/dashboard?tab=repairs", icon: ClipboardList },
    { label: "Scheduled Maintenance", path: "/technician/dashboard?tab=schedules", icon: CalendarCheck },
    { label: "Emergency Issues", path: "/technician/dashboard?tab=emergencies", icon: Flame },
    { label: "Spare Parts", path: "/technician/dashboard?tab=parts", icon: Box },
    { label: "Work History", path: "/technician/dashboard?tab=history", icon: History },
    { label: "Notifications", path: "/technician/dashboard?tab=notifications", icon: Bell },
    { label: "Profile", path: "/technician/dashboard?tab=profile", icon: User },
    { label: "Security Center", path: "/security", icon: Lock },
  ];

  let currentLinks = customerLinks;
  let roleTitle = "CUSTOMER PORTAL";
  let badgeColor = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";

  if (r === "STATION_OWNER" || r === "OWNER") {
    currentLinks = ownerLinks;
    roleTitle = "STATION OWNER PORTAL";
    badgeColor = "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30";
  } else if (r === "ADMIN") {
    currentLinks = adminLinks;
    roleTitle = "ADMIN COMMAND CENTER";
    badgeColor = "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30";
  } else if (r === "TECHNICIAN" || r === "TECH") {
    currentLinks = technicianLinks;
    roleTitle = "FIELD TECHNICIAN CONSOLE";
    badgeColor = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
  }

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] text-[var(--text-primary)] flex flex-col transition-all duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <Zap size={22} className="text-white fill-white" />
            </div>
            <div>
              <div className="font-extrabold text-base tracking-wider text-[var(--text-primary)] flex items-center gap-1.5 font-mono">
                EV CHARGE <span className="text-[var(--accent-primary)] text-xs">PRO</span>
              </div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                Smart Station System
              </div>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="md:hidden text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg hover:bg-[var(--bg-surface-raised)] transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Identity Banner */}
        <div className="px-4 py-3 bg-[var(--bg-surface-raised)] border-b border-[var(--border-subtle)] flex items-center gap-3">
          {currentUser?.profileImage ? (
            <img
              src={currentUser.profileImage}
              alt={currentUser.name}
              className="w-9 h-9 rounded-xl object-cover border border-[var(--accent-primary)]/40 shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary)] text-white font-black text-xs flex items-center justify-center shrink-0">
              {currentUser?.name ? currentUser.name[0].toUpperCase() : "U"}
            </div>
          )}
          <div className="overflow-hidden flex-1 min-w-0">
            <div className="text-sm font-bold text-[var(--text-primary)] truncate">
              {currentUser?.name || "EV User"}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className={`text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded border ${badgeColor}`}>
                {roleTitle}
              </span>
              <span className="text-[10px] font-mono text-[var(--accent-primary)] font-bold">
                {currentUser?.counterId || currentUser?.user_id || "ADM000001"}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
          {currentLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-[var(--accent-primary)] text-white font-bold shadow-md shadow-blue-500/20"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)]"
                }`}
              >
                <Icon size={18} className={isActive ? "text-white" : "text-[var(--text-muted)]"} />
                <span className="flex-1">{item.label}</span>
                {item.badge === "ACTIVE" && (
                  <span className="flex items-center gap-1 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.5 rounded-full animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    ACTIVE
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Theme Switcher & Logout Footer */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="mb-3 flex items-center justify-between px-1">
            <span className="text-xs font-bold text-[var(--text-muted)]">Theme Switcher</span>
            <ThemeToggle showLabel={true} />
          </div>

          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-all cursor-pointer"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}