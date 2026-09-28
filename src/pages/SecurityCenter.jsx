import { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Smartphone,
  Mail,
  KeyRound,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Globe,
  Laptop,
  QrCode,
  Copy,
  X,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { securityService } from "../services/securityService";
import { useSystemState } from "../contexts/SystemStateContext";

export default function SecurityCenter() {
  const { currentUser, role } = useAuth();
  const { auditLogs } = useSystemState();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: "", type: "info" });

  // 2FA Modal
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFAStep, setTwoFAStep] = useState(1);

  // Password Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const refreshProfile = () => {
    setLoading(true);
    const data = securityService.getSecurityProfile(currentUser);
    setProfile(data);
    setLoading(false);
  };

  useEffect(() => {
    refreshProfile();
  }, [currentUser]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "info" }), 3500);
  };

  const handleToggle2FA = () => {
    if (profile?.is2FAEnabled) {
      // Disable
      securityService.toggle2FA(currentUser, false);
      refreshProfile();
      showToast("Two-Factor Authentication disabled.", "info");
    } else {
      // Open Setup Modal
      setTwoFAStep(1);
      setTwoFACode("");
      setShow2FAModal(true);
    }
  };

  const confirmEnable2FA = (e) => {
    e.preventDefault();
    if (twoFACode.length < 6) {
      showToast("Please enter a valid 6-digit authentication code.", "error");
      return;
    }
    securityService.toggle2FA(currentUser, true);
    setTwoFAStep(2); // Show backup codes
    refreshProfile();
    showToast("2FA successfully enabled!", "success");
  };

  const handleTerminateOtherSessions = () => {
    const res = securityService.terminateOtherSessions(currentUser);
    refreshProfile();
    showToast(res.message, "success");
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    const res = securityService.changePassword(currentUser, currentPassword, newPassword);
    if (!res.success) {
      setPasswordError(res.message);
      return;
    }

    setShowPasswordModal(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    refreshProfile();
    showToast("Password updated successfully!", "success");
  };

  if (loading || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        <p className="text-xs font-mono text-slate-500 uppercase tracking-wider font-semibold">
          Auditing Account Security Status & Sessions...
        </p>
      </div>
    );
  }

  const { securityScore, scoreStatus, checklist, loginActivity, activeSessions, alerts, backupCodes, is2FAEnabled } = profile;
  const isAdmin = (role || "").toUpperCase() === "ADMIN";

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast.message && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 ${
            toast.type === "error"
              ? "bg-red-500 text-white"
              : toast.type === "info"
              ? "bg-slate-900 text-white border border-slate-700"
              : "bg-emerald-500 text-slate-950"
          }`}
        >
          <CheckCircle2 size={16} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#0B1329] via-[#0E203B] to-[#122238] border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 text-[10px] font-extrabold uppercase font-mono tracking-wider bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-emerald-400" /> ADVANCED SECURITY SHIELD
            </span>
            <span className="px-3 py-1 text-[10px] font-extrabold font-mono tracking-wider bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/30">
              ROLE: {role || "USER"}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            Security & Authentication Command Center
          </h1>

          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Control two-factor authentication, monitor active browser sessions, audit access history, and manage account credentials.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="px-4 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition border border-slate-700 cursor-pointer flex items-center gap-1.5"
          >
            <KeyRound size={15} /> Change Password
          </button>
        </div>
      </div>

      {/* 1. Account Security Health & Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Security Score Dial */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-emerald-500" /> Account Shield Rating
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                {scoreStatus}
              </span>
            </div>

            <div className="my-6 text-center">
              <div className="inline-flex items-baseline justify-center">
                <span className="text-6xl font-black font-mono text-emerald-500 dark:text-emerald-400">
                  {securityScore}
                </span>
                <span className="text-2xl font-bold font-mono text-slate-400 ml-1">/100</span>
              </div>
              <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto">
                {securityScore >= 80
                  ? "Your account meets industry standard zero-trust security requirements."
                  : "Enable Two-Factor Authentication (2FA) to achieve maximum security."}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleToggle2FA}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 ${
                is2FAEnabled
                  ? "bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
                  : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md"
              }`}
            >
              <Smartphone size={16} />
              <span>{is2FAEnabled ? "Disable Two-Factor Auth" : "Enable 2FA Protection (+20 pts)"}</span>
            </button>
          </div>
        </div>

        {/* Security Checklist */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-lg">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-4">
            <Lock size={16} className="text-cyan-500" /> Account Security Checklist
          </h2>

          <div className="space-y-3">
            {checklist.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      item.isSecure ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                    }`}
                  >
                    {item.isSecure ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">{item.label}</h4>
                    <p className="text-[11px] text-slate-500">{item.description}</p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-mono px-2.5 py-1 rounded-full font-bold border shrink-0 ${
                    item.isSecure
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                  }`}
                >
                  {item.badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Active Sessions & Login Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Browser Sessions */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Laptop size={16} className="text-emerald-500" /> Active Device Sessions
              </h3>
              <span className="text-[10px] font-mono text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {activeSessions.length} Active
              </span>
            </div>

            <div className="space-y-3">
              {activeSessions.map((ses) => (
                <div
                  key={ses.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                      <Laptop size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{ses.device}</span>
                        {ses.isCurrent && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400">
                            THIS DEVICE
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {ses.client} • {ses.ip} • {ses.location}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400">{ses.lastActive}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
            <button
              onClick={handleTerminateOtherSessions}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-500/10 text-slate-700 dark:text-slate-300 hover:text-red-500 border border-slate-200 dark:border-slate-700 hover:border-red-500/30 font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <LogOut size={15} /> Log Out Other Sessions
            </button>
          </div>
        </div>

        {/* Login Activity History */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Clock size={16} className="text-purple-500" /> Recent Authentication Activity
            </h3>
            <span className="text-[10px] font-mono text-slate-500">Security Log</span>
          </div>

          <div className="space-y-3">
            {loginActivity.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{log.browser}</span>
                    {log.isCurrentSession && (
                      <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {log.location} • IP: {log.ip}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono text-emerald-500 font-bold block">{log.status}</span>
                  <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. System Admin View: Global Audit Trail */}
      {isAdmin && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1329] border border-purple-500/30 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-purple-400 flex items-center gap-2">
              <ShieldAlert size={18} /> System Administrator Security Audit Log Feed
            </h3>
            <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-500/30 font-bold">
              ROLE GUARD: ADMIN ELEVATED
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2">Timestamp</th>
                  <th className="py-2">Actor</th>
                  <th className="py-2">Role</th>
                  <th className="py-2">Action</th>
                  <th className="py-2">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {(auditLogs || []).slice(0, 5).map((log, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2 font-mono text-slate-400">
                      {new Date(log.timestamp || Date.now()).toLocaleTimeString()}
                    </td>
                    <td className="py-2 font-bold text-slate-800 dark:text-slate-200 font-mono">{log.user || log.actor}</td>
                    <td className="py-2 text-slate-500">{log.role}</td>
                    <td className="py-2 font-mono font-bold text-cyan-500">{log.action}</td>
                    <td className="py-2 text-slate-400 truncate max-w-xs">{log.description || log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2FA SETUP MODAL */}
      {show2FAModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <QrCode size={18} className="text-emerald-500" /> Two-Factor Authentication Setup
              </h3>
              <button
                onClick={() => setShow2FAModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {twoFAStep === 1 ? (
              <form onSubmit={confirmEnable2FA} className="space-y-4 text-xs">
                <p className="text-slate-600 dark:text-slate-400">
                  Scan this QR code with Google Authenticator, Microsoft Authenticator, or 1Password.
                </p>

                {/* Simulated QR Box */}
                <div className="p-4 rounded-2xl bg-white border border-slate-300 flex flex-col items-center justify-center text-center">
                  <div className="w-36 h-36 bg-slate-950 rounded-xl flex items-center justify-center p-2 text-white">
                    <QrCode size={120} className="text-white" />
                  </div>
                  <span className="font-mono text-[10px] text-slate-800 font-bold mt-2">
                    Key: JBSW-Y3DP-EHPK-3PXP
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Enter 6-Digit Authenticator Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 842109"
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ""))}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-mono text-base font-black text-slate-900 dark:text-white tracking-widest focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShow2FAModal(false)}
                    className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold cursor-pointer shadow"
                  >
                    Verify & Enable
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>2FA is now active! Save your backup recovery codes.</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-center space-y-1">
                  {backupCodes.map((code, idx) => (
                    <div key={idx} className="font-bold text-slate-800 dark:text-slate-200">
                      {code}
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-slate-500">
                  Each backup code can be used once if you lose access to your authenticator app.
                </p>

                <button
                  onClick={() => setShow2FAModal(false)}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold cursor-pointer shadow"
                >
                  I Have Saved My Backup Codes
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound size={18} className="text-cyan-500" /> Change Account Password
              </h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  New Password (min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold cursor-pointer shadow"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
