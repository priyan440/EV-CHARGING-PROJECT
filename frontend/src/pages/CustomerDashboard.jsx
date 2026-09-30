import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Zap,
  Car,
  MapPin,
  CalendarCheck,
  CreditCard,
  BatteryCharging,
  Clock,
  ArrowRight,
  Sparkles,
  Navigation,
  Activity,
  ShieldCheck,
  Star,
  Plus,
  Compass,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "../contexts/LocationContext";
import { useSystemState } from "../contexts/SystemStateContext";
import { stationService } from "../services/stationService";

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentLocation, getDistanceToStation, estimateTravelTimeMinutes } = useLocation();
  const { bookings, activeSessions } = useSystemState();

  const [dbStations, setDbStations] = useState([]);
  const [loadingStations, setLoadingStations] = useState(true);

  useEffect(() => {
    stationService.getApprovedStations().then((res) => {
      if (res?.success && Array.isArray(res.data)) {
        setDbStations(res.data);
      }
      setLoadingStations(false);
    });
  }, []);

  const userCounterId = currentUser?.counterId || "CUS0001";
  const currentUserId = currentUser?.id || currentUser?.userId;
  const userName = currentUser?.name || "Priyan";

  // Registered Vehicle details from profile
  const primaryVehicle = currentUser?.vehicles?.[0] || currentUser?.vehicle || {
    number: "TN58AB1234",
    brand: "Tata Motors",
    model: "Nexon EV Max",
    batteryCapacity: 40.5,
    batteryPercentage: 65,
  };

  // User Bookings
  const myBookings = bookings.filter(
    (b) =>
      (currentUserId && b.userId && Number(b.userId) === Number(currentUserId)) ||
      (b.counterId && b.counterId.toUpperCase() === userCounterId.toUpperCase()) ||
      (!b.userId && !b.counterId)
  );

  const nextSession = myBookings.find(
    (b) => b.status === "Confirmed" || b.status === "CONFIRMED" || b.status === "Arrived"
  );

  const totalSpent = myBookings.reduce(
    (sum, b) => sum + (b.totalAmount || b.price || b.amount || 0),
    0
  );

  // Active charging session
  const currentLiveSession = activeSessions.find(
    (s) => s.counterId?.toUpperCase() === userCounterId.toUpperCase() && s.status === "Charging"
  );

  // Nearest station
  const sortedStations = [...dbStations].sort(
    (a, b) => (getDistanceToStation ? getDistanceToStation(a) - getDistanceToStation(b) : 0)
  );
  const nearestStation = sortedStations[0] || dbStations[0];
  const nearestDist = nearestStation ? getDistanceToStation ? getDistanceToStation(nearestStation) || 2.4 : 2.4 : 2.4;
  const nearestEta = estimateTravelTimeMinutes ? estimateTravelTimeMinutes(nearestDist) : 8;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12 text-[var(--text-primary)]">
      {/* 1. HERO WELCOME BANNER */}
      <div className="theme-card p-6 md:p-8 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              {userName ? userName[0].toUpperCase() : "C"}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-3 py-1 text-[10px] font-extrabold uppercase font-mono tracking-wider bg-blue-500/10 text-[var(--accent-primary)] rounded-full border border-blue-500/20">
                  CUSTOMER PORTAL
                </span>
                <span className="px-3 py-1 text-[10px] font-extrabold font-mono tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
                  ID: {userCounterId}
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Welcome back, <span className="text-[var(--accent-primary)]">{userName}</span>! 👋
              </h1>

              <p className="text-[var(--text-muted)] text-xs md:text-sm mt-1 max-w-xl leading-relaxed">
                Your registered EV <span className="font-mono text-[var(--accent-primary)] font-bold">{primaryVehicle.number}</span> is connected. Discover live database stations, reserve bays, and monitor live charging sessions.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/customer/book")}
              className="px-5 py-3 rounded-2xl bg-[var(--accent-primary)] hover:opacity-95 text-white font-extrabold text-xs tracking-wider uppercase shadow-lg shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer"
            >
              <Zap size={16} className="fill-white" /> Quick Book
            </button>
            <button
              onClick={() => navigate("/customer/map")}
              className="px-5 py-3 rounded-2xl bg-[var(--bg-surface-raised)] hover:bg-[var(--border-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold text-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Compass size={16} className="text-[var(--accent-primary)]" /> Live EV Map
            </button>
          </div>
        </div>
      </div>

      {/* 2. STATS GRID & REGISTERED EV STATUS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* EV Vehicle Status Card */}
        <div className="theme-card p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-[var(--accent-primary)]">
                <Car size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Primary EV</span>
                <h4 className="font-bold text-xs text-[var(--text-primary)] truncate max-w-[120px]">
                  {primaryVehicle.brand} {primaryVehicle.model}
                </h4>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
              Active
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[var(--text-muted)]">Battery Level</span>
              <span className="font-mono font-bold text-[var(--accent-primary)]">
                {primaryVehicle.batteryPercentage || 65}%
              </span>
            </div>
            <div className="w-full bg-[var(--bg-surface-raised)] rounded-full h-2 overflow-hidden border border-[var(--border-subtle)]">
              <div
                className="bg-[var(--accent-primary)] h-full rounded-full transition-all duration-500"
                style={{ width: `${primaryVehicle.batteryPercentage || 65}%` }}
              />
            </div>
          </div>
        </div>

        {/* Nearest Station Card */}
        <div className="theme-card p-5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Nearest Station</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <MapPin size={16} />
            </div>
          </div>
          <div>
            <h4 className="font-bold text-sm text-[var(--text-primary)] truncate">
              {nearestStation?.stationName || nearestStation?.name || "GreenCharge Central"}
            </h4>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
              {nearestDist} km away • {nearestEta} mins ETA
            </span>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] block">
            {nearestStation?.availableSlots ?? nearestStation?.availableBays ?? 4} Bays Available Now
          </span>
        </div>

        {/* Total Bookings Card */}
        <div className="theme-card p-5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Total Bookings</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <CalendarCheck size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--text-primary)] font-mono">
            {myBookings.length}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] block">
            ₹{totalSpent.toFixed(2)} Total Spent
          </span>
        </div>

        {/* CO2 Saved Card */}
        <div className="theme-card p-5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Eco Impact</span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {Math.round(myBookings.length * 14.8 + 24)} kg
          </div>
          <span className="text-[10px] text-[var(--text-muted)] block">
            CO₂ Carbon Emissions Prevented
          </span>
        </div>
      </div>

      {/* 3. NEAREST STATIONS CARDS (FROM DATABASE) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <MapPin size={20} className="text-[var(--accent-primary)]" /> Nearest EV Stations (Live Database)
            </h2>
            <p className="text-xs text-[var(--text-muted)]">Real-time availability and dynamic charging price</p>
          </div>
          <button
            onClick={() => navigate("/customer/stations")}
            className="text-xs font-bold text-[var(--accent-primary)] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sortedStations.slice(0, 3).map((st) => {
            const availBays = parseInt(st.availableSlots ?? st.availableBays ?? 0, 10);
            const isAvail = availBays > 0;
            const dist = getDistanceToStation ? getDistanceToStation(st) : 2.5;

            return (
              <div key={st.id || st.stationId} className="theme-card p-5 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono font-bold text-[var(--accent-primary)] uppercase">
                      {st.networkName || "GreenCharge"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                        isAvail
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      }`}
                    >
                      {isAvail ? `${availBays} Available` : "Full"}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-[var(--text-primary)] truncate">
                    {st.stationName || st.name}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] line-clamp-1 mt-0.5">📍 {st.address || st.city}</p>

                  <div className="flex items-center justify-between text-xs font-mono mt-3 p-2 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">{st.maxPower || 120} kW</span>
                    <span className="text-[var(--text-primary)] font-bold">₹{st.pricePerKwh || 18}/kWh</span>
                    <span className="text-[var(--text-muted)]">{dist} km</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => navigate(`/customer/stations/${st.id || st.stationId}`)}
                    className="flex-1 py-1.5 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] font-bold text-xs border border-[var(--border-subtle)] transition cursor-pointer"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => navigate(`/customer/book?stationId=${st.id || st.stationId}`)}
                    className="flex-1 py-1.5 rounded-xl bg-[var(--accent-primary)] hover:opacity-95 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Zap size={12} className="fill-white" />
                    <span>Book</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
