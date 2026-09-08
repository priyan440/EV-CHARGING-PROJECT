import { useNavigate } from "react-router-dom";
import { Compass, ArrowLeft, Zap, Home } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";

export default function NotFound() {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();

  const handleReturn = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    const r = (role || "").toUpperCase();
    if (r === "ADMIN") navigate("/admin/dashboard");
    else if (r === "STATION_OWNER" || r === "OWNER") navigate("/owner/dashboard");
    else navigate("/customer/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#070D1E] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-inter">
      {/* Background glow & electric grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg bg-[#0B1329]/95 backdrop-blur-2xl border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6 relative z-10 text-center"
      >
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Zap size={22} className="text-slate-950 fill-slate-950" />
          </div>
          <div className="text-left">
            <div className="font-mono font-extrabold text-base tracking-wider text-white">
              EV CHARGE <span className="text-emerald-400">PRO</span>
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              Station System
            </div>
          </div>
        </div>

        {/* 404 Large Display */}
        <div className="relative py-4">
          <div className="text-7xl md:text-8xl font-black font-mono tracking-tighter bg-gradient-to-b from-slate-200 via-slate-400 to-slate-700 bg-clip-text text-transparent">
            404
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <span className="px-3 py-1 text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full inline-block">
            PAGE OUT OF CHARGING GRID
          </span>
          <h1 className="text-xl md:text-2xl font-extrabold text-white">
            Lost in Navigation?
          </h1>
          <p className="text-xs md:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            The page or resource you requested does not exist or has been relocated within the EV CHARGE PRO network.
          </p>
        </div>

        {/* Actions */}
        <div className="pt-2">
          <button
            onClick={handleReturn}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            {isAuthenticated ? (
              <>
                <Home size={16} /> Return to Active Dashboard
              </>
            ) : (
              <>
                <ArrowLeft size={16} /> Return to Sign In
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
