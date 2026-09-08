import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, LogOut, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";

export default function Forbidden() {
  const navigate = useNavigate();
  const { currentUser, role, logout } = useAuth();

  const getDashboardPath = () => {
    const r = (role || "").toUpperCase();
    if (r === "ADMIN") return "/admin/dashboard";
    if (r === "STATION_OWNER" || r === "OWNER") return "/owner/dashboard";
    return "/customer/dashboard";
  };

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#070D1E] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-inter">
      {/* Background glow & electric grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg bg-[#0B1329]/95 backdrop-blur-2xl border border-rose-500/30 p-8 rounded-3xl shadow-2xl space-y-6 relative z-10 text-center"
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
              Security Protocol
            </div>
          </div>
        </div>

        {/* 403 Icon */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping opacity-75" />
          <div className="relative w-20 h-20 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-950/40">
            <ShieldAlert size={44} />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <span className="px-3 py-1 text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full inline-block">
            HTTP 403 • ACCESS RESTRICTED
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            Unauthorized Access
          </h1>
          <p className="text-xs md:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            Your current account clearance does not have permission to view or manage this section of the EV Charging Station System.
          </p>
        </div>

        {/* User Identity Snapshot */}
        {currentUser && (
          <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs font-mono flex items-center justify-between">
            <div className="text-left">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Active User</span>
              <span className="text-slate-200 font-bold">{currentUser.name}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Role Privilege</span>
              <span className="text-emerald-400 font-bold uppercase">{role}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={() => navigate(getDashboardPath())}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <ArrowLeft size={16} /> Return to My Dashboard
          </button>

          <button
            onClick={handleSignOut}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut size={16} /> Sign In with Another Account
          </button>
        </div>

        <p className="text-[11px] text-slate-500">
          Need higher access permissions? Contact your platform system administrator.
        </p>
      </motion.div>
    </div>
  );
}
