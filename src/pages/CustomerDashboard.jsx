import { useState } from "react";
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
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "../contexts/LocationContext";
import { useSystemState } from "../contexts/SystemStateContext";
import InteractiveMap from "../components/InteractiveMap";

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentLocation, detectLocation, getDistanceToStation, estimateTravelTimeMinutes } = useLocation();
  const { stations, bookings, activeSessions } = useSystemState();

  const userCounterId = currentUser?.counterId || "CUS0002";
  const userName = currentUser?.name || "Priyan";

  // Registered Vehicle details
  const primaryVehicle = currentUser?.vehicles?.[0] || currentUser?.vehicle || {
    number: "TN69AZ7708",
    brand: "Tata",
    model: "Nexon EV",
    batteryCapacity: 40.5,
    batteryPercentage: 65,
  };

  // User Bookings
  const myBookings = bookings.filter(
    (b) => b.counterId?.toUpperCase() === userCounterId.toUpperCase()
  );

  const nextSession = myBookings.find(
    (b) => b.status === "Confirmed" || b.status === "Arrived"
  );

  const totalSpent = myBookings.reduce((sum, b) => sum + (b.totalAmount || b.price || 0), 0);

  // Active charging session
  const currentLiveSession = activeSessions.find(
    (s) => s.counterId?.toUpperCase() === userCounterId.toUpperCase() && s.status === "Charging"
  );

  // Sort stations by distance
  const sortedStations = [...stations].sort(
    (a, b) => getDistanceToStation(a) - getDistanceToStation(b)
  );
  const nearestStation = sortedStations[0] || stations[0];
  const nearestDist = nearestStation ? getDistanceToStation(nearestStation) || 2.4 : 2.4;
  const nearestEta = estimateTravelTimeMinutes(nearestDist);

  return (
    <div className="space-y-6">
      {/* 1. HERO WELCOME BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B1329] via-[#0F1D3D] to-[#0A2234] border border-slate-800 p-6 md:p-8 shadow-2xl">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 text-[10px] font-extrabold uppercase font-mono tracking-wider bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                CUSTOMER DASHBOARD
              </span>
              <span className="px-3 py-1 text-[10px] font-extrabold font-mono tracking-wider bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/30">
                COUNTER ID: {userCounterId}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, <span className="text-emerald-400">{userName}</span>! 👋
            </h1>

            <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-xl leading-relaxed">
              Your registered vehicle <span className="font-mono text-emerald-400 font-bold">{primaryVehicle.number}</span> is ready for smart charging. Discover nearest stations, manage bookings, and monitor live charging.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/customer/book")}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs tracking-wider uppercase shadow-lg shadow-emerald-500/20 transition flex items-center gap-2"
            >
              <Zap size={16} className="fill-slate-950" /> Book Charging
            </button>
            <button
              onClick={() => navigate("/customer/stations")}
              className="px-5 py-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs transition flex items-center gap-2"
            >
              <MapPin size={16} className="text-emerald-400" /> Find Stations
            </button>
          </div>
        </div>
      </div>

      {/* 2. STATS GRID & REGISTERED EV STATUS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-grotesk">
          {/* EV Vehicle Status Card */}
          <div className="p-5 rounded-2xl bg-[#0B132B] border border-slate-800 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Car size={20} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider font-inter">
                    Registered EV
                  </span>
                  <h4 className="text-sm font-bold text-white">
                    {primaryVehicle.brand} {primaryVehicle.model}
                  </h4>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                {primaryVehicle.number}
              </span>
            </div>

            <div className="space-y-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 font-inter">
              <div className="flex justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1 font-grotesk">
                  <BatteryCharging size={14} className="text-emerald-400" /> Battery Level
                </span>
                <span className="font-mono text-emerald-400">{primaryVehicle.batteryPercentage || 65}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${primaryVehicle.batteryPercentage || 65}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-400 font-mono flex justify-between pt-1">
                <span>Capacity: {primaryVehicle.batteryCapacity || 40.5} kWh</span>
                <span>Connector: CCS2</span>
              </div>
            </div>
          </div>

          {/* Total Bookings Card */}
          <div className="p-5 rounded-2xl bg-[#0B132B] border border-slate-800 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-inter">
                Total Bookings
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <CalendarCheck size={18} />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-3xl font-black text-white font-mono">{myBookings.length || 6}</h3>
              <p className="text-xs text-slate-400 mt-1 font-inter">
                {myBookings.filter((b) => b.status === "Completed" || b.status === "CONFIRMED").length || 5} Completed sessions
              </p>
            </div>
            <Link
              to="/customer/bookings"
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 mt-3 pt-3 border-t border-slate-800 font-grotesk"
            >
              View Bookings <ArrowRight size={12} />
            </Link>
          </div>

          {/* Energy Delivered & CO2 Saved Card */}
          <div className="p-5 rounded-2xl bg-[#0B132B] border border-slate-800 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-inter">
                Energy & CO₂ Saved
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Zap size={18} />
              </div>
            </div>
            <div className="mt-3 font-mono">
              <h3 className="text-3xl font-black text-emerald-400">112.5 <span className="text-sm font-sans text-slate-300">kWh</span></h3>
              <p className="text-xs text-slate-400 mt-1 font-inter">
                🌱 <span className="text-emerald-300 font-bold font-mono">94.5 kg</span> CO₂ emission offset
              </p>
            </div>
            <Link
              to="/customer/history"
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 mt-3 pt-3 border-t border-slate-800 font-grotesk"
            >
              Energy Ledger <ArrowRight size={12} />
            </Link>
          </div>

          {/* Next Scheduled Session & Countdown */}
          <div className="p-5 rounded-2xl bg-[#0B132B] border border-slate-800 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-inter">
                Session Countdown
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Clock size={18} />
              </div>
            </div>
            {nextSession ? (
              <div className="mt-3">
                <div className="text-xs font-bold text-amber-400 font-mono">STARTS IN 01 : 45 : 20</div>
                <div className="text-sm font-bold text-white line-clamp-1 mt-0.5">{nextSession.stationName}</div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  {nextSession.date} at {nextSession.time}
                </div>
              </div>
            ) : (
              <div className="mt-3 font-inter">
                <div className="text-xs font-bold text-amber-400 font-mono">STARTS IN 02 : 14 : 35</div>
                <div className="text-sm font-bold text-white">Tata Power EZ Charge</div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">Today at 02:00 PM</div>
              </div>
            )}
            <Link
              to="/customer/book"
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 mt-3 pt-3 border-t border-slate-800 font-grotesk"
            >
              Book New Slot <ArrowRight size={12} />
            </Link>
          </div>
        </div>

      {/* 3. LIVE CHARGING SESSION ALERT BANNER (If Active) */}
      {currentLiveSession && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-500/40 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-emerald-400 opacity-75"></span>
              <div className="relative w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                <Activity size={20} />
              </div>
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase font-mono tracking-widest text-emerald-400">
                LIVE CHARGING IN PROGRESS
              </span>
              <h4 className="text-base font-bold text-white">{currentLiveSession.stationName}</h4>
              <p className="text-xs text-slate-300">
                Speed: <span className="font-mono text-emerald-400 font-bold">{currentLiveSession.currentPowerKw} kW</span> | Battery: <span className="font-mono text-emerald-400 font-bold">{currentLiveSession.batteryCurrent}%</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/customer/live-charging")}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shrink-0"
          >
            Monitor Live Telemetry <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* 4. LOCATION DISCOVERY & SMART RECOMMENDATION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Map Preview */}
        <div className="lg:col-span-8 p-5 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MapPin size={18} className="text-emerald-400" /> Nearby Charging Stations Map
              </h3>
              <p className="text-xs text-slate-400">
                Current Location: <span className="text-slate-200 font-semibold">{currentLocation.city}, {currentLocation.state}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={detectLocation}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-emerald-400 font-bold hover:bg-slate-800 transition flex items-center gap-1"
              >
                <Navigation size={12} /> Use My GPS
              </button>
              <button
                onClick={() => navigate("/customer/stations")}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-xs text-emerald-400 font-bold hover:bg-emerald-500/30 transition"
              >
                Full Map View
              </button>
            </div>
          </div>

          <div className="h-80 w-full rounded-2xl overflow-hidden border border-slate-800">
            <InteractiveMap stations={sortedStations} />
          </div>
        </div>

        {/* Right: Smart Station Recommendation Card */}
        <div className="lg:col-span-4 p-5 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1 uppercase tracking-wider font-mono">
                <Sparkles size={14} /> Smart Recommendation
              </span>
              <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                AI MATCH
              </span>
            </div>

            {nearestStation && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-base">{nearestStation.name}</h4>
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-400">
                      <Star size={12} className="fill-amber-400" /> {nearestStation.rating || 4.9}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">📍 {nearestStation.address}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Distance</span>
                    <span className="font-bold text-white font-mono">{nearestDist} km</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Travel Time</span>
                    <span className="font-bold text-emerald-400 font-mono">~{nearestEta} mins</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Chargers</span>
                    <span className="font-bold text-emerald-400">
                      {(nearestStation.chargers || []).filter((c) => c.status === "Available").length} / {(nearestStation.chargers || []).length} Available
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Price</span>
                    <span className="font-bold text-cyan-400 font-mono">₹{nearestStation.chargers?.[0]?.pricePerKwh || 18}/kWh</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Station Amenities</span>
                  <div className="flex flex-wrap gap-1">
                    {(nearestStation.amenities || ["WiFi", "Cafe", "Restroom"]).map((a) => (
                      <span key={a} className="text-[10px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-800">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate(`/customer/book?stationId=${nearestStation?.id}`)}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs tracking-wider uppercase transition flex items-center justify-center gap-1.5"
          >
            <Zap size={14} className="fill-slate-950" /> Reserve at Recommended Station
          </button>
        </div>
      </div>
    </div>
  );
}
