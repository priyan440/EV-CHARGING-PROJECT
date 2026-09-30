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
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import ThemeToggle from "./ThemeToggle";

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, role, logout } = useAuth();
  const r = (role || "").toUpperCase();

  const [hasActiveCharging, setHasActiveCharging] = useState(false);

  useEffect(() => {
    if (r === "CUSTOMER" || r === "USER") {
      import("../services/chargingService").then(({ getActiveChargingSession }) => {
        getActiveChargingSession().then((res) => {
          setHasActiveCharging(Boolean(res?.active && res?.session));
        }).catch(() => {});
      });
    }
  }, [location.pathname, r]);

  const customerLinks = [
    { label: "Dashboard", path: "/customer/dashboard", icon: LayoutDashboard },
    { label: "Live EV Map", path: "/customer/map", icon: Globe },
    { label: "Find Stations", path: "/customer/stations", icon: MapPin },
    { label: "Book Charging", path: "/customer/book", icon: CalendarCheck },
    { label: "My Bookings", path: "/customer/bookings", icon: ClipboardList },
    { label: "Live Charging", path: "/customer/live-charging", icon: Activity, badge: hasActiveCharging ? "ACTIVE" : null },
    { label: "Charging History", path: "/customer/history", icon: History },
    { label: "Payments", path: "/customer/payments", icon: CreditCard },
    { label: "My Vehicles", path: "/customer/vehicles", icon: Car },
    { label: "Vehicle Health", path: "/customer/vehicle-health", icon: BatteryCharging },
    { label: "Charging Simulator", path: "/customer/charging-simulator", icon: Zap },
    { label: "Emergency Assistance", path: "/customer/emergency-assistance", icon: AlertTriangle },
    { label: "Reviews", path: "/customer/reviews", icon: Star },
    { label: "Complaints", path: "/customer/complaints", icon: AlertTriangle },
    { label: "Security Center", path: "/security", icon: Lock },
    { label: "Profile", path: "/customer/profile", icon: User },
    { label: "Settings", path: "/customer/settings", icon: Settings },
  ];

  const ownerLinks = [
    { label: "Dashboard", path: "/owner/dashboard", icon: LayoutDashboard },
    { label: "Control Center", path: "/owner/control-center", icon: Activity },
    { label: "AI Intelligence", path: "/owner/ai-dashboard", icon: BrainCircuit },
    { label: "Demand Forecast", path: "/owner/demand-forecast", icon: TrendingUp },
    { label: "QR Scanner", path: "/owner/scanner", icon: Cpu },
    { label: "My Stations", path: "/owner/stations", icon: Building2 },
    { label: "Chargers", path: "/owner/chargers", icon: Cpu },
    { label: "Bookings", path: "/owner/bookings", icon: CalendarCheck },
    { label: "Live Status", path: "/owner/sessions", icon: Activity },
    { label: "Revenue", path: "/owner/revenue", icon: TrendingUp },
    { label: "Maintenance", path: "/owner/maintenance", icon: Wrench },
    { label: "Customer Reviews", path: "/owner/reviews", icon: Star },
    { label: "Security Center", path: "/security", icon: Lock },
    { label: "Profile", path: "/owner/profile", icon: User },
    { label: "Settings", path: "/owner/settings", icon: Settings },
  ];

  const adminLinks = [
    { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Control Center", path: "/admin/control-center", icon: Activity },
    { label: "Users", path: "/admin/users", icon: Users },
    { label: "Station Owners", path: "/admin/owners", icon: ShieldCheck },
    { label: "Stations", path: "/admin/stations", icon: Building2 },
    { label: "Chargers", path: "/admin/chargers", icon: Cpu },
    { label: "Bookings", path: "/admin/bookings", icon: CalendarCheck },
    { label: "Live Sessions", path: "/admin/sessions", icon: Activity },
    { label: "Payments", path: "/admin/payments", icon: CreditCard },
    { label: "Maintenance", path: "/admin/maintenance", icon: Wrench },
    { label: "Reports", path: "/admin/reports", icon: FileText },
    { label: "Analytics", path: "/admin/analytics", icon: PieChart },
    { label: "Audit Logs", path: "/admin/audit-logs", icon: ClipboardList },
    { label: "Security Center", path: "/security", icon: Lock },
    { label: "Settings", path: "/admin/settings", icon: Settings },
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
          <div className="overflow-hidden">
            <div className="text-sm font-bold text-[var(--text-primary)] truncate">
              {currentUser?.name || "EV User"}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${badgeColor}`}>
                {roleTitle}
              </span>
              <span className="text-xs font-mono text-[var(--accent-primary)] font-bold">
                {currentUser?.counterId || "CUS0001"}
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