import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle2, Zap, Loader2, KeyRound } from "lucide-react";
import { motion } from "framer-motion";

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#070D1E] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-inter">
      {/* Background glow & electric grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-[#0B1329]/95 backdrop-blur-2xl border border-emerald-500/30 p-7 md:p-8 rounded-3xl shadow-2xl space-y-6 relative z-10"
      >
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Zap size={30} className="text-slate-950 fill-slate-950" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white font-mono">
            EV CHARGE <span className="text-emerald-400">PRO</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Account Recovery Assistance
          </p>
        </div>

        {!isSuccess ? (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="text-center space-y-1">
              <h2 className="text-base font-bold text-white">Reset Account Password</h2>
              <p className="text-slate-400 text-xs leading-relaxed">
                Enter your registered Email or Counter ID (Customer, Station Owner, or Admin). We will guide your identity recovery.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-300 uppercase tracking-wider mb-2">
                Email / Counter ID
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. CUS0001 or name@example.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white text-xs font-mono font-bold rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Verifying Identity...
                </>
              ) : (
                <>
                  <KeyRound size={16} /> Send Password Reset
                </>
              )}
            </button>
          </form>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4 py-2"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mx-auto flex items-center justify-center">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-white">
                Reset Link Dispatched
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                If an account exists for <span className="text-emerald-400 font-mono font-bold">{identifier}</span>, password reset credentials have been routed to the registered address.
              </p>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] text-slate-400">
              💡 For immediate testing in this development environment, default passwords are:
              <div className="font-mono text-emerald-400 font-bold mt-1">
                Customer: password123 | Owner: ownerpassword | Admin: admin123
              </div>
            </div>
          </motion.div>
        )}

        <div className="pt-2 border-t border-slate-800/80 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition"
          >
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
