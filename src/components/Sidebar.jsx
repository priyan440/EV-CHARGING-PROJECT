import { Link, useLocation } from "react-router-dom";
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
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const { currentUser, role, logout } = useAuth();

  const customerLinks = [
    { label: "Dashboard", path: "/customer/dashboard", icon: LayoutDashboard },
    { label: "Find Stations", path: "/customer/stations", icon: MapPin },
    { label: "Book Charging", path: "/customer/book", icon: CalendarCheck },
    { label: "My Bookings", path: "/customer/bookings", icon: ClipboardList },
    { label: "Charging History", path: "/customer/history", icon: History },
    { label: "Live Charging", path: "/customer/live-charging", icon: Activity },
    { label: "Payments", path: "/customer/payments", icon: CreditCard },
    { label: "My Vehicles", path: "/customer/vehicles", icon: Car },
    { label: "Reviews", path: "/customer/reviews", icon: Star },
    { label: "Complaints", path: "/customer/complaints", icon: AlertTriangle },
    { label: "Profile", path: "/customer/profile", icon: User },
    { label: "Settings", path: "/customer/settings", icon: Settings },
  ];

  const ownerLinks = [
    { label: "Dashboard", path: "/owner/dashboard", icon: LayoutDashboard },
    { label: "QR Scanner", path: "/owner/scanner", icon: Cpu },
    { label: "My Stations", path: "/owner/stations", icon: Building2 },
    { label: "Chargers", path: "/owner/chargers", icon: Cpu },
    { label: "Bookings", path: "/owner/bookings", icon: CalendarCheck },
    { label: "Live Status", path: "/owner/sessions", icon: Activity },
    { label: "Revenue", path: "/owner/revenue", icon: TrendingUp },
    { label: "Maintenance", path: "/owner/maintenance", icon: Wrench },
    { label: "Customer Reviews", path: "/owner/reviews", icon: Star },
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
    { label: "Maintenance", path: "/admin/maintenance", icon: Wrench },
    { label: "Reports", path: "/admin/reports", icon: FileText },
    { label: "Analytics", path: "/admin/analytics", icon: PieChart },
    { label: "Audit Logs", path: "/admin/audit-logs", icon: ClipboardList },
    { label: "Settings", path: "/admin/settings", icon: Settings },
  ];

  let currentLinks = customerLinks;
  let roleTitle = "CUSTOMER PORTAL";
  let badgeColor = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";

  if (role === "STATION_OWNER") {
    currentLinks = ownerLinks;
    roleTitle = "STATION OWNER PORTAL";
    badgeColor = "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
  } else if (role === "ADMIN") {
    currentLinks = adminLinks;
    roleTitle = "ADMIN COMMAND CENTER";
    badgeColor = "bg-purple-500/20 text-purple-400 border-purple-500/30";
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
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-[#0B1329] border-r border-slate-800 text-slate-200 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Zap size={22} className="text-slate-950 fill-slate-950" />
            </div>
            <div>
              <div className="font-extrabold text-base tracking-wider text-white flex items-center gap-1.5 font-mono">
                EV CHARGE <span className="text-emerald-400 text-xs">PRO</span>
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Smart Station System
              </div>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Identity Banner */}
        <div className="px-5 py-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
          <div>
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
              {roleTitle}
            </span>
            <div className="text-xs font-mono font-semibold text-slate-300 mt-1">
              ID: {currentUser?.counterId || "CUS0001"}
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Icon size={18} className={isActive ? "text-slate-950" : "text-slate-400"} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Logout Footer */}
        <div className="p-4 border-t border-slate-800/80">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:text-white hover:bg-red-500/10 border border-red-500/20 transition-all"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}