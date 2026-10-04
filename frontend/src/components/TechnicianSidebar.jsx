import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Wrench,
  Activity,
  AlertTriangle,
  ClipboardList,
  CalendarCheck,
  Flame,
  Box,
  History,
  Bell,
  User,
  LogOut,
  X,
  Radio,
  FileCheck2,
  Lock,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import ThemeToggle from "./ThemeToggle";

export default function TechnicianSidebar({ isOpen, onClose, activeTab, onSelectTab, stats = {} }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const menuItems = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard, path: "/technician/dashboard" },
    { id: "stations", label: "Assigned Stations", icon: Building2, badge: stats.assignedStations || 3, path: "/technician/stations" },
    { id: "work-orders", label: "Work Orders", icon: Wrench, badge: stats.activeWorkOrders || stats.activeTasks || 3, badgeColor: "bg-amber-500", path: "/technician/work-orders" },
    { id: "faults", label: "Fault Reports", icon: AlertTriangle, badge: stats.pendingRepairs || 3, badgeColor: "bg-rose-500", path: "/technician/faults" },
    { id: "maintenance", label: "Preventive Maintenance", icon: CalendarCheck, badge: stats.scheduledMaintenance || 4, path: "/technician/maintenance" },
    { id: "corrective-maintenance", label: "Corrective Maintenance", icon: ClipboardList, path: "/technician/corrective-maintenance" },
    { id: "emergency", label: "Emergency Issues", icon: Flame, badge: stats.criticalFaults || 1, badgeColor: "bg-red-600 animate-pulse", path: "/technician/emergency" },
    { id: "charger-health", label: "Charger Health", icon: Activity, path: "/technician/charger-health" },
    { id: "network", label: "Network & OCPP", icon: Radio, path: "/technician/network" },
    { id: "spare-parts", label: "Spare Parts", icon: Box, path: "/technician/spare-parts" },
    { id: "service-reports", label: "Service Reports", icon: FileCheck2, path: "/technician/service-reports" },
    { id: "work-history", label: "Work History", icon: History, path: "/technician/work-history" },
    { id: "notifications", label: "Notifications", icon: Bell, badge: stats.unreadNotifs || 3, badgeColor: "bg-blue-500", path: "/technician/notifications" },
    { id: "profile", label: "Profile", icon: User, path: "/technician/profile" },
    { id: "security", label: "Security Center", icon: Lock, path: "/security" },
  ];

  const handleItemClick = (item) => {
    if (onSelectTab) {
      onSelectTab(item.id);
    }
    navigate(item.path);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
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
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Wrench size={20} className="text-slate-950 font-bold" />
            </div>
            <div>
              <div className="font-black text-sm tracking-wider font-mono text-[var(--text-primary)]">
                EV CHARGE <span className="text-amber-500">PRO</span>
              </div>
              <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider font-mono">
                Field Technician
              </div>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="md:hidden text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--bg-surface-raised)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Technician Live Status Bar */}
        <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-raised)]/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-mono font-bold text-emerald-500 uppercase tracking-wide">
              Station Linked
            </span>
          </div>
          <span className="text-[11px] font-mono text-[var(--text-muted)] bg-[var(--bg-surface)] px-2 py-0.5 rounded border border-[var(--border-subtle)] font-bold">
            {currentUser?.counterId || "TECH0001"}
          </span>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 custom-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isCurrent =
              activeTab === item.id ||
              location.pathname === item.path ||
              (item.id === "overview" && location.pathname === "/technician/dashboard");

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isCurrent
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-sm font-bold"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    size={16}
                    className={
                      isCurrent
                        ? "text-amber-500"
                        : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
                    }
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge !== null && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold ${
                      item.badgeColor
                        ? `${item.badgeColor} text-white`
                        : "bg-[var(--bg-surface-raised)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Profile & Logout */}
        <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] text-[var(--text-muted)] font-medium">Theme Mode</span>
            <ThemeToggle showLabel={false} />
          </div>

          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
              {currentUser?.name ? currentUser.name[0].toUpperCase() : "T"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                {currentUser?.name || "Dave Wilson"}
              </p>
              <p className="text-[10px] font-mono text-amber-500 truncate font-semibold">
                STA001 • Primary Hub
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
