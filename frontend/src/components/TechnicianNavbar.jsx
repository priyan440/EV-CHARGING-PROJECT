import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  Bell,
  Wrench,
  User,
  LogOut,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  QrCode,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import ThemeToggle from "./ThemeToggle";

const AVAILABILITY_STATUSES = [
  { id: "AVAILABLE", label: "AVAILABLE 🟢", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" },
  { id: "BUSY", label: "BUSY 🟡", color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
  { id: "ON_SITE", label: "ON_SITE 🔵", color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
  { id: "ON_BREAK", label: "ON_BREAK ☕", color: "text-orange-500 bg-orange-500/10 border-orange-500/30" },
  { id: "OFFLINE", label: "OFFLINE ⚪", color: "text-slate-400 bg-slate-500/10 border-slate-500/30" },
  { id: "ON_LEAVE", label: "ON_LEAVE 🏖️", color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
];

export default function TechnicianNavbar({
  onOpenSidebar,
  currentStatus = "AVAILABLE",
  onUpdateStatus,
  currentStation = "EV Power Hub Chennai Central (STA001)",
  notifications = [],
  unreadCount = 0,
  onMarkNotificationRead,
  onSelectTab,
  onOpenQrScanner,
}) {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const activeStatusObj =
    AVAILABILITY_STATUSES.find((s) => s.id === currentStatus) || AVAILABILITY_STATUSES[0];

  return (
    <header className="sticky top-0 z-30 h-16 bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] text-[var(--text-primary)] px-4 md:px-6 flex items-center justify-between gap-4 transition-colors duration-200">
      {/* Left: Mobile Sidebar Trigger & Station Breadcrumb */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={onOpenSidebar}
          className="md:hidden text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] transition cursor-pointer"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2 truncate">
          <div className="hidden sm:flex w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 items-center justify-center text-amber-500 shrink-0">
            <Wrench size={16} />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-500 uppercase tracking-wider hidden sm:inline">
                Current Station:
              </span>
              <span className="text-xs font-bold text-[var(--text-primary)] truncate flex items-center gap-1">
                <MapPin size={12} className="text-amber-500 shrink-0" />
                {currentStation}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* QR Scanner Quick Button */}
        <button
          onClick={onOpenQrScanner}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--border-subtle)] text-xs font-bold border border-[var(--border-subtle)] text-[var(--text-primary)] transition cursor-pointer"
          title="Scan Station QR Code for Quick Diagnostics"
        >
          <QrCode size={14} className="text-amber-500" />
          <span className="hidden sm:inline">Scan QR</span>
        </button>

        {/* Live Availability Status Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold border transition cursor-pointer ${activeStatusObj.color}`}
            title="Update Field Availability Status"
          >
            <span>{activeStatusObj.label}</span>
            <ChevronDown size={12} />
          </button>

          {showStatusMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-2 z-50 text-xs space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider font-mono">
                Set Availability
              </div>
              {AVAILABILITY_STATUSES.map((status) => (
                <button
                  key={status.id}
                  onClick={() => {
                    if (onUpdateStatus) onUpdateStatus(status.id);
                    setShowStatusMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left font-mono font-bold transition cursor-pointer ${
                    currentStatus === status.id
                      ? "bg-amber-500 text-slate-950"
                      : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)]"
                  }`}
                >
                  <span>{status.label}</span>
                  {currentStatus === status.id && <CheckCircle2 size={12} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Technician ID Pill */}
        <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs font-mono text-amber-500 font-bold">
          <span className="text-[var(--text-muted)]">ID:</span>
          <span>{currentUser?.counterId || "TECH0001"}</span>
        </div>

        {/* Theme Toggle */}
        <ThemeToggle showLabel={false} />

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-amber-500/50 transition cursor-pointer"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-950 font-black text-[10px] rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-3 z-50 text-sm text-[var(--text-primary)]">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] mb-2">
                <span className="font-bold text-xs uppercase font-mono text-[var(--text-primary)]">
                  Dispatch & Fault Alerts
                </span>
                <span className="text-[10px] font-bold font-mono bg-amber-500/15 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  {unreadCount} New
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 custom-scrollbar">
                {notifications.length === 0 ? (
                  <p className="text-[var(--text-muted)] text-center py-6 text-xs">
                    No active technician alerts
                  </p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (onMarkNotificationRead) onMarkNotificationRead(n.id);
                        if (onSelectTab) onSelectTab("work-orders");
                        setShowNotifs(false);
                      }}
                      className={`p-2.5 rounded-xl border transition cursor-pointer ${
                        n.isRead
                          ? "bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] text-[var(--text-muted)] opacity-75"
                          : "bg-amber-500/10 border-amber-500/30 text-[var(--text-primary)]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-amber-500 flex items-center gap-1">
                          <AlertTriangle size={12} />
                          {n.title}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                          {n.type}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] leading-snug">
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 mt-2 border-t border-[var(--border-subtle)] text-center">
                <button
                  onClick={() => {
                    if (onSelectTab) onSelectTab("notifications");
                    setShowNotifs(false);
                  }}
                  className="text-xs font-bold text-amber-500 hover:underline cursor-pointer"
                >
                  View All Notifications →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] hover:border-amber-500/40 transition cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
              {currentUser?.name ? currentUser.name[0].toUpperCase() : "T"}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-bold text-[var(--text-primary)] leading-tight truncate max-w-[110px]">
                {currentUser?.name || "Dave Wilson"}
              </div>
              <div className="text-[10px] font-mono text-amber-500 leading-tight font-bold">
                Level 3 Specialist
              </div>
            </div>
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-52 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-2 z-50 text-sm">
              <button
                onClick={() => {
                  setShowProfile(false);
                  if (onSelectTab) onSelectTab("profile");
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)] cursor-pointer"
              >
                <User size={14} className="text-amber-500" />
                <span>Technician Profile</span>
              </button>

              <button
                onClick={() => {
                  setShowProfile(false);
                  if (onSelectTab) onSelectTab("work-orders");
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)] cursor-pointer"
              >
                <Wrench size={14} className="text-amber-500" />
                <span>Active Work Orders</span>
              </button>

              <button
                onClick={() => {
                  setShowProfile(false);
                  logout();
                  navigate("/login");
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-rose-500 hover:bg-rose-500/10 font-bold cursor-pointer"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
