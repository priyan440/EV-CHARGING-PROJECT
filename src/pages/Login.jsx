import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Zap, Lock, Mail, UserCheck, ShieldCheck, Building2, User } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [selectedRole, setSelectedRole] = useState("CUSTOMER");
  const [identifier, setIdentifier] = useState("CUS0001"); // Default prefilled for easy testing
  const [password, setPassword] = useState("password123");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleChange = (newRole) => {
    setSelectedRole(newRole);
    setErrorMsg("");
    if (newRole === "CUSTOMER") {
      setIdentifier("CUS0001");
      setPassword("password123");
    } else if (newRole === "STATION_OWNER") {
      setIdentifier("OWNER0001");
      setPassword("ownerpassword");
    } else if (newRole === "ADMIN") {
      setIdentifier("ADM0001");
      setPassword("admin123");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    setTimeout(() => {
      const res = login(identifier, password, selectedRole);
      setIsLoading(false);

      if (!res.success) {
        setErrorMsg(res.message);
        return;
      }

      // Redirect based on role
      if (res.user.role === "ADMIN") {
        navigate("/admin/dashboard");
      } else if (res.user.role === "STATION_OWNER") {
        navigate("/owner/dashboard");
      } else {
        navigate("/customer/dashboard");
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#070D1E] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow Accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0B1329] border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Zap size={32} className="text-slate-950 fill-slate-950" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white font-mono">
            EV CHARGE <span className="text-emerald-400">PRO</span>
          </h1>
          <p className="text-xs text-slate-400">EV Charging Station Management System Portal</p>
        </div>

        {/* Role Selection Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-slate-900/90 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => handleRoleChange("CUSTOMER")}
            className={`py-2 rounded-xl transition flex items-center justify-center gap-1 ${
              selectedRole === "CUSTOMER"
                ? "bg-emerald-500 text-slate-950 font-extrabold shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <User size={14} /> User
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange("STATION_OWNER")}
            className={`py-2 rounded-xl transition flex items-center justify-center gap-1 ${
              selectedRole === "STATION_OWNER"
                ? "bg-cyan-500 text-slate-950 font-extrabold shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Building2 size={14} /> Owner
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange("ADMIN")}
            className={`py-2 rounded-xl transition flex items-center justify-center gap-1 ${
              selectedRole === "ADMIN"
                ? "bg-purple-600 text-white font-extrabold shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ShieldCheck size={14} /> Admin
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold text-center">
            {errorMsg}
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-300 uppercase tracking-wider mb-2">
              {selectedRole === "ADMIN" ? "Admin Counter ID / Email" : selectedRole === "STATION_OWNER" ? "Owner Counter ID (OWNER0001) / Email" : "Customer Counter ID (CUS0001) / Email"}
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Enter Counter ID or Email..."
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white text-xs font-mono font-bold rounded-xl pl-9 pr-4 py-3 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-300 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl pl-9 pr-4 py-3 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3.5 rounded-2xl text-slate-950 font-extrabold text-xs uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-2 ${
              selectedRole === "ADMIN"
                ? "bg-purple-500 hover:bg-purple-400 text-white"
                : selectedRole === "STATION_OWNER"
                ? "bg-cyan-400 hover:bg-cyan-300"
                : "bg-emerald-400 hover:bg-emerald-300"
            }`}
          >
            {isLoading ? "Signing in..." : `Sign In to ${selectedRole.replace("_", " ")}`}
          </button>
        </form>

        {/* Register Redirect */}
        <div className="pt-2 text-center text-xs text-slate-400">
          Don't have an account?{" "}
          <Link to="/register" className="text-emerald-400 hover:underline font-bold">
            Register Account
          </Link>
        </div>
      </div>
    </div>
  );
}