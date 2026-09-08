import { Navigate, useLocation } from "react-router-dom";
import { Zap, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";

/**
 * Standardize role for flexible comparison:
 * "customer" / "CUSTOMER" -> "CUSTOMER"
 * "owner" / "STATION_OWNER" / "OWNER" -> "OWNER"
 * "admin" / "ADMIN" -> "ADMIN"
 */
function normalizeRole(r) {
  if (!r) return "";
  const upper = r.toUpperCase();
  if (upper === "STATION_OWNER" || upper === "OWNER") return "OWNER";
  if (upper === "CUSTOMER") return "CUSTOMER";
  if (upper === "ADMIN") return "ADMIN";
  return upper;
}

export default function ProtectedRoute({ children, allowedRoles, allowedRole }) {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  // 1. Never show a blank screen while checking authentication session
  if (loading) {
    return (
      <div className="min-h-screen bg-[#070D1E] text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-inter">
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="relative z-10 flex flex-col items-center text-center space-y-4 max-w-sm"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 flex items-center justify-center shadow-xl shadow-emerald-500/25">
              <Zap size={36} className="text-slate-950 fill-slate-950 animate-bounce" />
            </div>
            <span className="animate-ping absolute -top-1 -right-1 h-4 w-4 rounded-full bg-cyan-400 opacity-75" />
          </div>

          <div>
            <h2 className="text-xl font-black text-white tracking-wider font-mono">
              EV CHARGE <span className="text-emerald-400">PRO</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Loading your secure EV workspace...
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full">
            <Loader2 size={14} className="animate-spin" />
            <span>Verifying Authenticated Session</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // 2. Unauthenticated: Redirect strictly to single /login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 3. Normalize roles for checking
  const rolesToCheck = [];
  if (allowedRoles && Array.isArray(allowedRoles)) {
    rolesToCheck.push(...allowedRoles.map(normalizeRole));
  }
  if (allowedRole) {
    rolesToCheck.push(normalizeRole(allowedRole));
  }

  // 4. Role Authorization: if user role not allowed, route to 403
  if (rolesToCheck.length > 0) {
    const userRoleNormalized = normalizeRole(role);
    const isPermitted = rolesToCheck.includes(userRoleNormalized);

    if (!isPermitted) {
      return <Navigate to="/403" replace state={{ attemptedPath: location.pathname }} />;
    }
  }

  return children;
}