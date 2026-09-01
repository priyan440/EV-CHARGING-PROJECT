import { useState } from "react";
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
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "../contexts/LocationContext";
import { useNotifications } from "../contexts/NotificationContext";

export default function Navbar({ onOpenSidebar, isDark, onToggleTheme }) {
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/customer/stations?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#0B1329]/90 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Menu Button & Search */}
      <div className="flex items-center gap-3 flex-1">
        <button
          onClick={onOpenSidebar}
          className="md:hidden text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60"
        >
          <Menu size={20} />
        </button>

        <form onSubmit={handleSearchSubmit} className="relative hidden sm:block max-w-xs w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search station, ID, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/60 text-slate-200 text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
          />
        </form>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Location Picker */}
        <div className="relative">
          <button
            onClick={() => setShowLocationPicker(!showLocationPicker)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs hover:border-emerald-500/50 transition"
          >
            <MapPin size={14} className="text-emerald-400" />
            <span className="font-medium max-w-[100px] truncate">{currentLocation.city}</span>
            <ChevronDown size={12} className="text-slate-400" />
          </button>

          {showLocationPicker && (
            <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 text-xs text-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-300">Select City Location</span>
                <button
                  onClick={detectLocation}
                  disabled={isLocating}
                  className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300"
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
                    className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center justify-between ${
                      currentLocation.city === c.city
                        ? "bg-emerald-500/20 text-emerald-400 font-bold"
                        : "hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    <span>{c.city}</span>
                    <span className="text-[10px] text-slate-500">{c.state}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400 hover:border-amber-400/40 transition"
          title="Toggle Dark/Light Mode"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notifications Icon */}
        <div className="relative">
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-emerald-400 transition"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-slate-950 font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 text-xs text-slate-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                <span className="font-bold">Notifications</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} Unread
                </span>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar">
                {notifications.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer ${
                        n.isRead
                          ? "bg-slate-900/50 border-slate-800 text-slate-400"
                          : "bg-slate-800/60 border-emerald-500/30 text-slate-200 font-medium"
                      }`}
                    >
                      <div className="font-bold text-xs text-emerald-400 mb-0.5">{n.title}</div>
                      <div className="text-[11px] leading-relaxed">{n.message}</div>
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
            className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-extrabold text-xs flex items-center justify-center">
              {currentUser?.name ? currentUser.name[0] : "U"}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-bold text-slate-200 leading-tight">
                {currentUser?.name || "EV User"}
              </div>
              <div className="text-[10px] font-mono text-emerald-400 leading-tight">
                {currentUser?.counterId || "CUS0001"}
              </div>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 text-xs">
              <Link
                to={role === "ADMIN" ? "/admin/profile" : role === "STATION_OWNER" ? "/owner/profile" : "/customer/profile"}
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <User size={14} /> My Profile
              </Link>
              <Link
                to={role === "ADMIN" ? "/admin/settings" : role === "STATION_OWNER" ? "/owner/settings" : "/customer/settings"}
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Sun size={14} /> Settings
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}