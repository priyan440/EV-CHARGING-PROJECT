import { NavLink } from "react-router-dom";
import { Home, MapPin, Calendar, Zap, User } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function MobileBottomNav() {
  const { user } = useAuth();

  // Show only for Customer role or general users
  if (user && user.role !== "CUSTOMER") return null;

  const navItems = [
    { label: "Home", path: "/customer/dashboard", icon: Home },
    { label: "Find Map", path: "/customer/stations", icon: MapPin },
    { label: "Bookings", path: "/customer/bookings", icon: Calendar },
    { label: "Live Charge", path: "/customer/live-charging", icon: Zap },
    { label: "Profile", path: "/customer/profile", icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-surface)]/95 backdrop-blur-lg border-t border-[var(--border-subtle)] px-2 py-2">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
                  isActive
                    ? "text-[var(--accent-primary)] bg-[var(--accent-light)] font-bold"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
