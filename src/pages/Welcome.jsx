import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Zap,
  ArrowRight,
  MapPin,
  BatteryCharging,
  ShieldCheck,
  TrendingUp,
  Cpu,
  ChevronDown,
  Search,
  User,
  Activity,
  Sparkles,
  CheckCircle2,
  Clock,
  Compass,
  Layers,
  Leaf,
  Globe,
  Sliders,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import ThemeToggle from "../components/ThemeToggle";

export default function Welcome() {
  const navigate = useNavigate();
  const { isAuthenticated, role, currentUser } = useAuth();

  // Simulated real-time charging percentage ticker (82% -> 85% cycle)
  const [chargePercent, setChargePercent] = useState(82);

  useEffect(() => {
    const interval = setInterval(() => {
      setChargePercent((prev) => (prev >= 85 ? 82 : prev + 1));
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  // Determine destination: if authenticated, direct to appropriate dashboard; otherwise /login
  const handleGetStarted = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    const r = (role || "").toUpperCase();
    if (r === "ADMIN") navigate("/admin/dashboard");
    else if (r === "STATION_OWNER" || r === "OWNER") navigate("/owner/dashboard");
    else navigate("/customer/dashboard");
  };

  const dashboardRoute = !isAuthenticated
    ? "/login"
    : (role || "").toUpperCase() === "ADMIN"
    ? "/admin/dashboard"
    : (role || "").toUpperCase() === "STATION_OWNER" || (role || "").toUpperCase() === "OWNER"
    ? "/owner/dashboard"
    : "/customer/dashboard";

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 overflow-x-hidden selection:bg-emerald-500 selection:text-black">
      {/* Subtle Background Radial Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-emerald-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-[600px] right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[130px]" />
        <div className="absolute top-[1400px] left-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[160px]" />
      </div>

      {/* ==================================================== */}
      {/* 1. FLOATING MINIMAL GLASS NAVBAR                     */}
      {/* ==================================================== */}
      <header className="fixed top-4 left-0 right-0 z-50 px-4 sm:px-8 max-w-7xl mx-auto">
        <nav className="h-16 px-5 sm:px-7 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center justify-between transition-all duration-300">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
              <Zap size={20} className="text-black fill-black" />
            </div>
            <div className="font-extrabold text-base tracking-wider text-white font-mono flex items-center">
              EVCharge<span className="text-emerald-400">X</span>
            </div>
          </Link>

          {/* Center Navigation Links (Desktop) */}
          <div className="hidden md:flex items-center gap-7 text-xs font-semibold tracking-wide text-slate-300">
            <a href="#hero" className="hover:text-emerald-400 transition-colors">
              Home
            </a>
            <a href="#stations" className="hover:text-emerald-400 transition-colors">
              Stations
            </a>
            <a href="#features" className="hover:text-emerald-400 transition-colors">
              Features
            </a>
            <a href="#impact" className="hover:text-emerald-400 transition-colors">
              Impact
            </a>
            <Link to="/charging-simulator" className="text-emerald-400/90 hover:text-emerald-300 flex items-center gap-1 transition-colors">
              <Sparkles size={12} /> Simulator
            </Link>
          </div>

          {/* Right Action Icons & Login */}
          <div className="flex items-center gap-3">
            <ThemeToggle showLabel={false} />

            <Link
              to="/login"
              title="Search Stations"
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              <Search size={16} />
            </Link>

            {/* Common Login Trigger Icon */}
            <Link
              to={dashboardRoute}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-emerald-500 hover:text-black border border-white/10 hover:border-emerald-400 text-xs font-bold transition-all duration-200 group cursor-pointer shadow-sm"
              title={isAuthenticated ? `Logged in as ${currentUser?.name || "User"}` : "Sign In to EV Charging System"}
            >
              <User size={14} className="group-hover:text-black text-emerald-400 transition-colors" />
              <span className="hidden sm:inline font-mono uppercase tracking-wider text-[11px]">
                {isAuthenticated ? "Dashboard" : "Sign In"}
              </span>
            </Link>
          </div>
        </nav>
      </header>

      {/* ==================================================== */}
      {/* 2. FULL-SCREEN HERO SECTION                          */}
      {/* ==================================================== */}
      <section id="hero" className="relative pt-32 pb-20 md:pt-40 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
        {/* Top Animated Pill */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-emerald-400 text-[11px] font-mono font-extrabold uppercase tracking-widest shadow-inner shadow-emerald-500/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>SMART EV CHARGING • POWERING A GREENER FUTURE</span>
          </div>
        </motion.div>

        {/* Hero Heading */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.05] font-heading">
            Power Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Journey.</span>
            <br />
            Charge <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-emerald-400 to-cyan-300">Smarter.</span>
          </h1>

          <p className="mt-6 text-sm sm:text-base md:text-lg text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
            Next-generation intelligent EV charging ecosystem built for drivers, station owners, and a cleaner future. Real-time availability, non-linear simulations, and instant reservations.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              onClick={handleGetStarted}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs uppercase tracking-widest transition-all duration-200 shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2.5 group cursor-pointer hover:scale-105"
            >
              <span>Get Started</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <a
              href="#stations"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/15 text-xs font-bold uppercase tracking-widest transition-all duration-200 backdrop-blur-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Compass size={15} className="text-emerald-400" />
              <span>Explore Stations</span>
            </a>
          </div>

          {/* Live Network Status Indicator */}
          <div className="mt-6 inline-flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>24 Ultra-Fast Charging Stations Active & Online</span>
          </div>
        </motion.div>

        {/* ==================================================== */}
        {/* 3. HERO EV & CHARGING SHOWCASE (VISUAL CANVAS)        */}
        {/* ==================================================== */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative mt-12 md:mt-16 rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-emerald-950/40 bg-gradient-to-b from-[#0B0D0B] to-black"
        >
          {/* Main Visual Image */}
          <div className="relative w-full aspect-[16/9] max-h-[640px] overflow-hidden">
            <img
              src="/assets/hero-ev-charging.jpg"
              alt="Futuristic EV plugged into an intelligent fast charging station"
              className="w-full h-full object-cover object-center"
            />

            {/* Dark Studio Gradient Vignette Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-black/40 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60 pointer-events-none" />

            {/* Live Charging Badge on the Station */}
            <div className="absolute top-6 right-6 sm:top-8 sm:right-10 bg-black/80 backdrop-blur-xl border border-emerald-500/40 rounded-2xl p-3 sm:p-4 shadow-2xl flex items-center gap-3 z-20">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <BatteryCharging size={22} className="animate-pulse" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">
                  Ultra-Fast DC 240kW
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 flex items-baseline gap-1">
                  {chargePercent}%
                  <span className="text-[11px] text-emerald-300 font-normal uppercase tracking-wider">Charging</span>
                </div>
              </div>
            </div>

            {/* Floating Telemetry Card 1: Network Statistics (Bottom Right) */}
            <div className="absolute bottom-6 right-6 hidden md:flex items-center gap-5 p-4 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 text-xs shadow-2xl z-20">
              <div className="text-center px-2">
                <div className="text-lg font-black font-mono text-emerald-400">8,400+</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Fast Chargers</div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center px-2">
                <div className="text-lg font-black font-mono text-cyan-400">52K+</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Active Drivers</div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center px-2">
                <div className="text-lg font-black font-mono text-white">99.4%</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Uptime SLA</div>
              </div>
            </div>

            {/* Floating Telemetry Card 2: Nearest Station Location (Bottom Left) */}
            <div className="absolute bottom-6 left-6 p-4 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 text-xs shadow-2xl max-w-xs z-20">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-400 uppercase mb-1">
                <MapPin size={12} /> Nearest Fast Charger
              </div>
              <div className="font-bold text-sm text-white truncate">
                Forum Vijaya Mall Station
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
                <span>2.4 km away • 0 min wait</span>
                <span className="font-mono text-emerald-400 font-bold">6 Free</span>
              </div>
              <button
                onClick={handleGetStarted}
                className="mt-2.5 w-full py-1.5 rounded-xl bg-white/10 hover:bg-emerald-500 hover:text-black text-white text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1"
              >
                <span>Reserve Slot</span>
                <ArrowRight size={10} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <div className="mt-8 flex flex-col items-center justify-center text-slate-500 text-xs font-mono uppercase tracking-widest">
          <span>Scroll to explore</span>
          <ChevronDown size={18} className="mt-1 animate-bounce text-emerald-400" />
        </div>
      </section>

      {/* ==================================================== */}
      {/* 4. SECTION 2 — CHARGING MADE INTELLIGENT             */}
      {/* ==================================================== */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/5 z-10 relative">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold block mb-2">
            INTELLIGENT TECHNOLOGY
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-heading">
            Charging Made Intelligent
          </h2>
          <p className="text-sm text-slate-400 mt-3">
            Every feature is engineered for high performance, battery protection, and predictable journeys.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              icon: Zap,
              title: "Ultra-Fast DC Charging",
              description: "High-output 60kW to 240kW CCS2 dispensers with liquid-cooled cables and automated load balancing.",
              badge: "Up to 240kW",
            },
            {
              icon: Compass,
              title: "Smart Station Discovery",
              description: "Haversine distance calculations, real-time connector availability, and automated queue predictions.",
              badge: "Haversine Engine",
            },
            {
              icon: BatteryCharging,
              title: "Battery Health Telematics",
              description: "Track battery degradation curves, State of Health (SOH), cycle counts, and charging recommendations.",
              badge: "OBD-II Telemetry",
            },
            {
              icon: Sparkles,
              title: "AI Demand Forecasting",
              description: "Heuristic AI models predicting peak demand surge hours and optimizing grid power allocations.",
              badge: "Predictive AI",
            },
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={i}
                whileHover={{ y: -6 }}
                className="p-6 rounded-3xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-emerald-500/40 backdrop-blur-md shadow-xl transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-black transition-all">
                      <Icon size={22} />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 font-bold">
                      {card.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {card.title}
                  </h3>

                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-emerald-400 font-mono font-bold">
                  <span>Explore Module</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ==================================================== */}
      {/* 5. SECTION 3 — LIVE NETWORK STATION PREVIEW          */}
      {/* ==================================================== */}
      <section id="stations" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/5 z-10 relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold block mb-2">
              REAL-TIME NETWORK PREVIEW
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-heading">
              Featured Charging Hubs
            </h2>
          </div>

          <button
            onClick={handleGetStarted}
            className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold uppercase tracking-wider text-white transition flex items-center gap-2 self-start md:self-auto cursor-pointer"
          >
            <span>View All 24 Stations</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              id: "STA001",
              name: "Tata Power EZ Charge - Forum Vijaya Mall",
              location: "Vadapalani, Chennai",
              distance: "2.4 km",
              availableGuns: "6 / 8 Available",
              power: "CCS2 • 60kW - 120kW",
              price: "₹18.5 / kWh",
              waitTime: "0 min wait",
              status: "Operational",
            },
            {
              id: "STA002",
              name: "Jio-bp Pulse - Express Avenue Mall",
              location: "Royapettah, Chennai",
              distance: "4.8 km",
              availableGuns: "4 / 6 Available",
              power: "CCS2 • 120kW - 240kW",
              price: "₹19.5 / kWh",
              waitTime: "3 min wait",
              status: "Operational",
            },
            {
              id: "STA004",
              name: "Apex HyperFast Station Madurai",
              location: "KK Nagar, Madurai",
              distance: "7.2 km",
              availableGuns: "2 / 4 Available",
              power: "CCS2 • 150kW - 300kW",
              price: "₹20.0 / kWh",
              waitTime: "5 min wait",
              status: "Operational",
            },
          ].map((st) => (
            <div
              key={st.id}
              className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/40 shadow-xl flex flex-col justify-between space-y-4 group transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-emerald-400 font-extrabold uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {st.status}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">{st.distance}</span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                  {st.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <MapPin size={12} className="text-emerald-400 shrink-0" /> {st.location}
                </p>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/5 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Guns Free</span>
                    <span className="font-bold text-emerald-400">{st.availableGuns}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Tariff</span>
                    <span className="font-bold text-white">{st.price}</span>
                  </div>
                </div>

                <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between font-mono">
                  <span>{st.power}</span>
                  <span className="text-cyan-400 font-bold">{st.waitTime}</span>
                </div>
              </div>

              <button
                onClick={handleGetStarted}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-emerald-500 hover:text-black border border-white/10 hover:border-emerald-400 text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Reserve Charger Gun</span>
                <ArrowRight size={13} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ==================================================== */}
      {/* 6. SECTION 4 — SUSTAINABILITY IMPACT                 */}
      {/* ==================================================== */}
      <section id="impact" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/5 z-10 relative">
        <div className="p-8 md:p-12 rounded-3xl bg-gradient-to-r from-emerald-950/20 via-black to-[#071F18] border border-emerald-500/20 shadow-2xl">
          <div className="max-w-3xl mb-8">
            <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold block mb-2">
              ENVIRONMENTAL STEWARDSHIP
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-heading">
              Charge Today. Build a Greener Tomorrow.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Every kilowatt delivered through our network reduces petroleum reliance and displaces carbon emissions across Indian transit corridors.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-black/60 border border-white/10">
              <Leaf size={24} className="text-emerald-400 mb-2" />
              <div className="text-3xl sm:text-4xl font-black font-mono text-white">1,280+</div>
              <div className="text-xs text-slate-400 uppercase font-mono tracking-wider mt-1">Tons CO₂ Prevented</div>
            </div>

            <div className="p-5 rounded-2xl bg-black/60 border border-white/10">
              <Zap size={24} className="text-cyan-400 mb-2" />
              <div className="text-3xl sm:text-4xl font-black font-mono text-white">4.8 GWh</div>
              <div className="text-xs text-slate-400 uppercase font-mono tracking-wider mt-1">Clean Energy Delivered</div>
            </div>

            <div className="p-5 rounded-2xl bg-black/60 border border-white/10">
              <Globe size={24} className="text-emerald-400 mb-2" />
              <div className="text-3xl sm:text-4xl font-black font-mono text-white">145,000+</div>
              <div className="text-xs text-slate-400 uppercase font-mono tracking-wider mt-1">Zero-Emission Sessions</div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* 7. SECTION 5 — FINAL CALL TO ACTION                  */}
      {/* ==================================================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center z-10 relative">
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-heading">
          Ready to Charge Smarter?
        </h2>
        <p className="text-sm text-slate-400 max-w-xl mx-auto mt-3">
          Join thousands of EV owners, fleet managers, and station entrepreneurs enjoying zero-queue charging, dynamic simulations, and predictive station analytics.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <button
            onClick={handleGetStarted}
            className="w-full sm:w-auto px-10 py-4 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs uppercase tracking-widest transition-all duration-200 shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer hover:scale-105"
          >
            <span>Get Started Now</span>
            <ArrowRight size={16} />
          </button>
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-bold uppercase tracking-widest transition backdrop-blur-md"
          >
            Sign In with Google
          </Link>
        </div>
      </section>

      {/* ==================================================== */}
      {/* 8. SECTION 6 — MINIMAL PREMIUM FOOTER                */}
      {/* ==================================================== */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/10 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4 z-10 relative">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center text-black font-black text-xs">
            ⚡
          </div>
          <span className="font-extrabold font-mono text-white text-sm">EVChargeX</span>
          <span className="text-[11px] text-slate-600">© 2026 Smart EV Ecosystem.</span>
        </div>

        <div className="flex items-center gap-6 font-mono text-[11px]">
          <Link to="/login" className="hover:text-emerald-400 transition">
            Sign In
          </Link>
          <Link to="/register" className="hover:text-emerald-400 transition">
            Register
          </Link>
          <Link to="/charging-simulator" className="hover:text-emerald-400 transition">
            Simulator
          </Link>
          <Link to="/emergency-assistance" className="hover:text-emerald-400 transition">
            Emergency SOS
          </Link>
          <Link to="/security" className="hover:text-emerald-400 transition">
            Security
          </Link>
        </div>
      </footer>
    </div>
  );
}
