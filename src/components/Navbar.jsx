import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  MapPin,
  Sun,
  Moon,
  User,
  ChevronDown,
  Navigation,
  Menu,
  Zap,
  LogOut,
  Database,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "../contexts/LocationContext";
import { useNotifications } from "../contexts/NotificationContext";
import { apiService } from "../services/apiService";
import ThemeToggle from "./ThemeToggle";

export default function Navbar({ onOpenSidebar, isDark, onToggleTheme }) {
  const navigate = useNavigate();
  const { currentUser, role, logout } = useAuth();
  const { currentLocation, detectLocation, setManualLocation, isLocating } = useLocation();
  const { notifications, getUnreadCount, markAsRead } = useNotifications();

  const [searchQuery, setSearchQuery] = useState("");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const unreadCount = getUnreadCount(role, currentUser?.counterId);

  const cities = [
    { city: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707 },
    { city: "Madurai", state: "Tamil Nadu", lat: 9.9252, lng: 78.1424 },
    { city: "Coimbatore", state: "Tamil Nadu", lat: 11.0168, lng: 76.9558 },
    { city: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946 },
    { city: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867 },
  ];

  const [dbOnline, setDbOnline] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const checkDb = async () => {
      try {
        const health = await apiService.checkHealth();
        if (isMounted) {
          const isHealthy =
            health?.status === "OK" ||
            health?.success === true ||
            health?.database === "connected" ||
            health?.services?.database === "ONLINE" ||
            health?.services?.database === "CONNECTED" ||
            health?.services?.mysql === "ONLINE";
          setDbOnline(Boolean(isHealthy));
        }
      } catch {
        if (isMounted) setDbOnline(false);
      }
    };
    checkDb();
    const interval = setInterval(checkDb, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/customer/stations?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] text-[var(--text-primary)] px-4 md:px-6 flex items-center justify-between gap-4 transition-colors duration-200">
      {/* Left: Mobile Menu Button & Search */}
      <div className="flex items-center gap-3 flex-1">
        <button
          onClick={onOpenSidebar}
          className="md:hidden text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] transition"
        >
          <Menu size={20} />
        </button>

        <form onSubmit={handleSearchSubmit} className="relative hidden sm:block max-w-xs w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search station, ID, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition"
          />
        </form>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Live MySQL Database Status Badge */}
        <div
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border transition ${
            dbOnline
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
          }`}
          title={dbOnline ? "Connected to live MySQL Database on port 5000" : "Connecting to Database..."}
        >
          <Database size={13} className={dbOnline ? "text-emerald-500 dark:text-emerald-400" : "text-amber-500 dark:text-amber-400"} />
          <span className={`w-1.5 h-1.5 rounded-full ${dbOnline ? "bg-emerald-500 dark:bg-emerald-400 animate-pulse" : "bg-amber-500 dark:bg-amber-400"}`} />
          <span>{dbOnline ? "MySQL Online" : "Connecting DB"}</span>
        </div>

        {/* Counter ID Badge */}
        <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--accent-primary)] font-bold">
          <span className="text-[var(--text-muted)]">ID:</span>
          <span>{currentUser?.counterId || "CUS0001"}</span>
        </div>

        {/* Location Picker */}
        <div className="relative">
          <button
            onClick={() => setShowLocationPicker(!showLocationPicker)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm hover:border-[var(--accent-primary)]/50 transition cursor-pointer"
          >
            <MapPin size={14} className="text-[var(--accent-primary)]" />
            <span className="font-medium max-w-[100px] truncate">{currentLocation.city}</span>
            <ChevronDown size={12} className="text-[var(--text-muted)]" />
          </button>

          {showLocationPicker && (
            <div className="absolute right-0 mt-2 w-64 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-3 z-50 text-sm text-[var(--text-primary)]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[var(--text-primary)] text-sm">Select City Location</span>
                <button
                  onClick={detectLocation}
                  disabled={isLocating}
                  className="flex items-center gap-1 text-xs font-bold text-[var(--accent-primary)] hover:opacity-80 cursor-pointer"
                >
                  <Navigation size={12} className={isLocating ? "animate-spin" : ""} />
                  GPS
                </button>
              </div>

              <div className="space-y-1">
                {cities.map((c) => (
                  <button
                    key={c.city}
                    onClick={() => {
                      setManualLocation({
                        city: c.city,
                        state: c.state,
                        latitude: c.lat,
                        longitude: c.lng,
                      });
                      setShowLocationPicker(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center justify-between cursor-pointer ${
                      currentLocation.city === c.city
                        ? "bg-[var(--accent-light)] text-[var(--accent-primary)] font-bold"
                        : "hover:bg-[var(--bg-surface-raised)] text-[var(--text-primary)]"
                    }`}
                  >
                    <span>{c.city}</span>
                    <span className="text-xs text-[var(--text-muted)]">{c.state}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Emergency Assistance SOS Button (for Customer) */}
        {(!role || role.toUpperCase() === "CUSTOMER") && (
          <button
            onClick={() => navigate("/emergency-assistance")}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-600 dark:text-red-400 border border-red-500/30 text-xs font-bold transition cursor-pointer shrink-0"
            title="Emergency Low Battery Roadside Dispatch"
          >
            <AlertTriangle size={14} className="text-red-500 shrink-0" />
            <span>SOS</span>
          </button>
        )}

        {/* White & Dark Theme Switcher */}
        <ThemeToggle showLabel={true} />

        {/* Notifications Icon */}
        <div className="relative">
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative p-2 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--accent-primary)]/50 transition cursor-pointer"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--accent-primary)] text-white font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-3 z-50 text-sm text-[var(--text-primary)]">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] mb-2">
                <span className="font-bold">Notifications</span>
                <span className="text-xs bg-[var(--accent-light)] text-[var(--accent-primary)] px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} Unread
                </span>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar">
                {notifications.length === 0 ? (
                  <p className="text-[var(--text-muted)] text-center py-4 text-xs">No notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer ${
                        n.isRead
                          ? "bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] text-[var(--text-muted)]"
                          : "bg-[var(--accent-light)] border-[var(--accent-primary)]/30 text-[var(--text-primary)] font-medium"
                      }`}
                    >
                      <div className="font-bold text-xs text-[var(--accent-primary)] mb-0.5">{n.title}</div>
                      <div className="text-xs leading-relaxed text-[var(--text-muted)]">{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown Badge */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/40 transition cursor-pointer"
          >
            {currentUser?.profileImage ? (
              <img
                src={currentUser.profileImage}
                alt={currentUser.name}
                className="w-7 h-7 rounded-lg object-cover border border-[var(--accent-primary)]/40"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-[var(--accent-primary)] text-white font-extrabold text-xs flex items-center justify-center">
                {currentUser?.name ? currentUser.name[0].toUpperCase() : "U"}
              </div>
            )}
            <div className="text-left hidden md:block">
              <div className="text-sm font-bold text-[var(--text-primary)] leading-tight truncate max-w-[120px]">
                {currentUser?.name || "EV User"}
              </div>
              <div className="text-xs font-mono text-[var(--accent-primary)] leading-tight font-bold">
                {currentUser?.counterId || "CUS0001"}
              </div>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-2 z-50 text-sm">
              {(() => {
                const r = (role || "").toUpperCase();
                const profilePath = r === "ADMIN" ? "/admin/profile" : r === "STATION_OWNER" || r === "OWNER" ? "/owner/profile" : "/customer/profile";
                const settingsPath = r === "ADMIN" ? "/admin/settings" : r === "STATION_OWNER" || r === "OWNER" ? "/owner/settings" : "/customer/settings";

                return (
                  <>
                    <Link
                      to={profilePath}
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)]"
                    >
                      <User size={14} /> My Profile
                    </Link>
                    <Link
                      to={settingsPath}
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)]"
                    >
                      <Sun size={14} /> Settings
                    </Link>
                  </>
                );
              })()}
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                  navigate("/login");
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-500/10 transition cursor-pointer font-bold"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}