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
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex items-center justify-center p-4 relative overflow-hidden font-inter">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg theme-card p-8 rounded-3xl shadow-2xl space-y-6 relative z-10 text-center"
      >
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Zap size={22} className="text-white fill-white" />
          </div>
          <div className="text-left">
            <div className="font-mono font-extrabold text-base tracking-wider text-[var(--text-primary)]">
              EV CHARGE <span className="text-emerald-500">PRO</span>
            </div>
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-semibold">
              Station System
            </div>
          </div>
        </div>

        {/* 404 Large Display */}
        <div className="relative py-4">
          <div className="text-7xl md:text-8xl font-black font-mono tracking-tighter text-[var(--text-primary)] opacity-40">
            404
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <span className="px-3 py-1 text-xs font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-full inline-block">
            PAGE OUT OF CHARGING GRID
          </span>
          <h1 className="text-xl md:text-2xl font-extrabold text-[var(--text-primary)]">
            Lost in Navigation?
          </h1>
          <p className="text-xs md:text-sm text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
            The page or resource you requested does not exist or has been relocated within the EV CHARGE PRO network.
          </p>
        </div>

        {/* Actions */}
        <div className="pt-2">
          <button
            onClick={handleReturn}
            className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
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
