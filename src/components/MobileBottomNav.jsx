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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-lg border-t border-slate-800/80 px-2 py-2">
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
                    ? "text-emerald-400 bg-emerald-500/10 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
