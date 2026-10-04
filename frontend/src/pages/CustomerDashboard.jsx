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
import { bookingService } from "../services/bookingService";
import { vehicleService } from "../services/vehicleService";
import UpdateBatteryModal from "../components/UpdateBatteryModal";

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentLocation, getDistanceToStation, estimateTravelTimeMinutes } = useLocation();
  const { activeSessions } = useSystemState();

  const [dbStations, setDbStations] = useState([]);
  const [loadingStations, setLoadingStations] = useState(true);
  const [liveBookings, setLiveBookings] = useState([]);
  const [liveVehicles, setLiveVehicles] = useState([]);

  useEffect(() => {
    stationService.getApprovedStations().then((res) => {
      if (res?.success && Array.isArray(res.data)) {
        setDbStations(res.data);
      }
      setLoadingStations(false);
    });

    bookingService.getMyBookings().then((res) => {
      if (res?.success && Array.isArray(res.data)) {
        setLiveBookings(res.data);
      }
    });

    vehicleService.fetchVehicles().then((res) => {
      if (Array.isArray(res)) {
        setLiveVehicles(res);
      }
    });
  }, [currentUser]);

  const userCounterId = currentUser?.counterId || "CUS0001";
  const currentUserId = currentUser?.id || currentUser?.userId;
  const userName = currentUser?.name || "EV User";

  // Registered Vehicle details from MySQL profile
  const primaryVehicle = liveVehicles[0] || currentUser?.vehicles?.[0] || currentUser?.vehicle || null;

  // User Bookings from MySQL
  const myBookings = liveBookings;

  const nextSession = myBookings.find(
    (b) => b.status === "Confirmed" || b.status === "CONFIRMED" || b.status === "Arrived"
  );

  const totalSpent = myBookings.reduce(
    (sum, b) => sum + (b.totalAmount || b.price || b.amount || 0),
    0
  );

  // Active charging session
  const currentLiveSession = (activeSessions || []).find(
    (s) => s.counterId?.toUpperCase() === userCounterId.toUpperCase() && s.status === "Charging"
  );

  // Nearest station
  const sortedStations = [...(dbStations || [])].sort(
    (a, b) => (getDistanceToStation && a && b ? getDistanceToStation(a) - getDistanceToStation(b) : 0)
  );
  const nearestStation = sortedStations[0] || (dbStations && dbStations[0]) || null;
  const nearestDist = nearestStation ? (getDistanceToStation ? getDistanceToStation(nearestStation) || 2.4 : 2.4) : null;
  const nearestEta = nearestDist !== null ? (estimateTravelTimeMinutes ? estimateTravelTimeMinutes(nearestDist) : 8) : null;

  const [showUpdateBatteryModal, setShowUpdateBatteryModal] = useState(false);

  const formatLastUpdated = (dateStr) => {
    if (!dateStr) return "Just now";
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now - d;
      if (diffMs < 60000) return "Just now";
      if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
      const isToday = d.toDateString() === now.toDateString();
      const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      if (isToday) return `Today, ${timeStr}`;
      return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${timeStr}`;
    } catch {
      return "Recent";
    }
  };

  const handleVehicleSocUpdated = (updatedVeh) => {
    setLiveVehicles((prev) =>
      prev.map((v) => (v.id === updatedVeh.id ? { ...v, ...updatedVeh } : v))
    );
  };

  const primarySoc = primaryVehicle
    ? (primaryVehicle.current_soc_percent !== undefined && primaryVehicle.current_soc_percent !== null
        ? Number(primaryVehicle.current_soc_percent)
        : (primaryVehicle.batteryPercentage !== undefined ? Number(primaryVehicle.batteryPercentage) : 75))
    : null;

  const socTimestamp = primaryVehicle ? (primaryVehicle.soc_updated_at || primaryVehicle.updated_at) : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12 text-[var(--text-primary)]">
      {/* Update Battery Modal */}
      <UpdateBatteryModal
        isOpen={showUpdateBatteryModal}
        onClose={() => setShowUpdateBatteryModal(false)}
        vehicle={primaryVehicle}
        onSuccess={handleVehicleSocUpdated}
      />

      {/* Low Battery Warning Banner (if <= 20%) */}
      {primaryVehicle && primarySoc !== null && primarySoc <= 20 && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 animate-fade-in ${
          primarySoc <= 10
            ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
            : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              primarySoc <= 10 ? "bg-rose-500 text-white" : "bg-amber-500 text-white"
            }`}>
              <BatteryCharging size={20} />
            </div>
            <div>
              <h4 className="font-extrabold text-xs uppercase tracking-wider font-mono">
                {primarySoc <= 10 ? "CRITICALLY LOW BATTERY" : "LOW BATTERY WARNING"}
              </h4>
              <p className="text-xs mt-0.5">
                Your latest recorded battery level is <strong>{primarySoc}%</strong>. {primarySoc <= 10 ? "Charging is strongly recommended." : "Consider planning your next charging session."}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/book-slot")}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer shrink-0 ${
              primarySoc <= 10 ? "bg-rose-600 hover:bg-rose-500" : "bg-amber-600 hover:bg-amber-500"
            }`}
          >
            ⚡ Book Slot Now
          </button>
        </div>
      )}

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
                {primaryVehicle ? (
                  <>Your registered EV <span className="font-mono text-[var(--accent-primary)] font-bold">{primaryVehicle.registrationNumber || primaryVehicle.vehicleNumber || primaryVehicle.number}</span> is connected.</>
                ) : (
                  <>No vehicles registered yet. Add your vehicle to begin booking charging slots.</>
                )} Discover live database stations, reserve bays, and monitor charging sessions.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/book-slot")}
              className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs tracking-wider uppercase shadow-xl shadow-emerald-500/25 transition flex items-center gap-2 cursor-pointer"
            >
              <Zap size={16} className="fill-slate-950" /> ⚡ BOOK CHARGING SLOT
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
          {primaryVehicle ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-[var(--accent-primary)]">
                    <Car size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Primary EV</span>
                    <h4 className="font-bold text-xs text-[var(--text-primary)] truncate max-w-[120px]">
                      {primaryVehicle.brand || primaryVehicle.manufacturer} {primaryVehicle.model}
                    </h4>
                  </div>
                </div>
                <button
                  onClick={() => setShowUpdateBatteryModal(true)}
                  className="text-[10px] font-mono px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 font-bold border border-amber-500/20 transition cursor-pointer"
                  title="Update Latest Known Battery Level"
                >
                  Update SOC
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <div>
                    <span className="text-[var(--text-muted)] block">Latest Known Battery</span>
                    <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                      Last updated: {formatLastUpdated(socTimestamp)}
                    </span>
                  </div>
                  <span className={`font-mono font-black text-sm ${
                    primarySoc <= 20 ? "text-rose-500" : "text-amber-500"
                  }`}>
                    {primarySoc}%
                  </span>
                </div>
                <div className="w-full bg-[var(--bg-surface-raised)] rounded-full h-2 overflow-hidden border border-[var(--border-subtle)] mt-1.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      primarySoc <= 20 ? "bg-rose-500" : primarySoc <= 50 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${primarySoc}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[9px] text-[var(--text-muted)]">
                    Pack: {primaryVehicle.batteryCapacity || primaryVehicle.battery_capacity || 40.5} kWh
                  </span>
                  <button
                    onClick={() => setShowUpdateBatteryModal(true)}
                    className="text-[10px] text-amber-500 hover:underline font-bold cursor-pointer"
                  >
                    + Update Battery
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-2 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-[var(--accent-primary)]">
                  <Car size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">My Vehicle</span>
                  <h4 className="font-bold text-xs text-[var(--text-primary)]">No vehicles found</h4>
                </div>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">Add your vehicle to track telemetry & reserve bays.</p>
              <button
                onClick={() => navigate("/customer/vehicles")}
                className="mt-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                + Add Vehicle
              </button>
            </div>
          )}
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
              {nearestStation?.stationName || nearestStation?.name || "No stations found"}
            </h4>
            {nearestStation ? (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                {nearestDist} km away • {nearestEta} mins ETA
              </span>
            ) : (
              <span className="text-xs text-[var(--text-muted)]">Awaiting owner registrations</span>
            )}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] block">
            {nearestStation ? `${nearestStation?.availableSlots ?? nearestStation?.availableBays ?? 4} Bays Available Now` : "0 Stations Active"}
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
          {sortedStations.length === 0 ? (
            <div className="col-span-1 md:col-span-3 p-8 text-center bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-2xl">
              <MapPin className="mx-auto text-[var(--text-muted)] mb-2" size={32} />
              <p className="text-sm font-semibold text-[var(--text-primary)]">No stations found</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Charging stations will appear here once registered in the database.</p>
            </div>
          ) : (
            sortedStations.slice(0, 3).map((st) => {
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
                      onClick={() => navigate(`/book-slot?stationId=${st.id || st.stationId}`)}
                      className="flex-1 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Zap size={12} className="fill-slate-950" />
                      <span>Book Slot</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
