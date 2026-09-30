import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import {
  Zap,
  Lock,
  Mail,
  Car,
  Phone,
  Link as LinkIcon,
  AlertCircle,
  X,
  Loader2,
  ArrowRight,
  KeyRound,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import Toast from "../components/Toast";
import ThemeToggle from "../components/ThemeToggle";
import OTPInput from "../components/OTPInput";

export default function Login() {
  const navigate = useNavigate();
  const {
    login,
    loginWithGoogle,
    sendOTP,
    verifyOTP,
    resendOTP,
    completeGoogleCustomerRegistration,
    linkGoogleAccount,
  } = useAuth();

  // Auth Mode: "OTP" (default) or "PASSWORD"
  const [authMode, setAuthMode] = useState("OTP");

  // Email OTP Login State
  const [otpEmail, setOtpEmail] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpExpiresIn, setOtpExpiresIn] = useState(300); // 5 minutes (300 sec)
  const [resendCooldown, setResendCooldown] = useState(0); // 30 sec cooldown
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState("");
  const [devOtpCode, setDevOtpCode] = useState(null);

  // Password / ID Login State
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // Global State
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleAuthenticating, setIsGoogleAuthenticating] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "info" });

  // 5-Minute OTP Expiration Timer
  useEffect(() => {
    let timer = null;
    if (isOtpSent && otpExpiresIn > 0) {
      timer = setInterval(() => {
        setOtpExpiresIn((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOtpSent, otpExpiresIn]);

  // 30-Second Resend Cooldown Timer
  useEffect(() => {
    let timer = null;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCooldown]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  /**
   * Handle Send Email OTP Request
   */
  const handleSendOTP = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg("");
    setOtpSuccessMessage("");
    setDevOtpCode(null);

    if (!otpEmail || !otpEmail.trim()) {
      setErrorMsg("Please enter your email address.");
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await sendOTP(otpEmail);
      setIsSendingOtp(false);

      if (!res.success) {
        setErrorMsg(res.message || "Failed to send OTP.");
        setToast({ message: res.message || "Failed to send OTP.", type: "error" });
        return;
      }

      setIsOtpSent(true);
      setOtpExpiresIn(res.expiresSeconds || 300);
      setResendCooldown(res.cooldownSeconds || 30);
      setRemainingAttempts(5);
      setOtpValue("");
      if (res.devOtpCode || res.otpCode) {
        setDevOtpCode(res.devOtpCode || res.otpCode);
      }
      setToast({ message: res.message || `OTP sent to ${otpEmail}`, type: "success" });
    } catch (err) {
      setIsSendingOtp(false);
      setErrorMsg("Network error sending OTP. Please try again.");
    }
  };

  /**
   * Handle Verify Email OTP Code
   */
  const handleVerifyOTP = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg("");

    if (!otpValue || otpValue.length !== 6) {
      setErrorMsg("Please enter the complete 6-digit OTP code.");
      return;
    }

    if (otpExpiresIn <= 0) {
      setErrorMsg("OTP expired. Please request a new OTP.");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const res = await verifyOTP(otpEmail, otpValue);
      setIsVerifyingOtp(false);

      if (!res.success) {
        setErrorMsg(res.message);
        if (res.remainingAttempts !== undefined) {
          setRemainingAttempts(res.remainingAttempts);
        }
        setToast({ message: res.message, type: "error" });
        return;
      }

      setOtpSuccessMessage("✓ Email verified successfully! Redirecting...");
      setToast({ message: `Welcome, ${res.user.name}! Connected via Email OTP.`, type: "success" });

      const roleUpper = (res.user.role || "").toUpperCase();
      setTimeout(() => {
        if (roleUpper === "ADMIN") {
          navigate("/admin/dashboard");
        } else if (roleUpper === "STATION_OWNER" || roleUpper === "OWNER") {
          navigate("/owner/dashboard");
        } else {
          navigate("/customer/dashboard");
        }
      }, 500);
    } catch (err) {
      setIsVerifyingOtp(false);
      setErrorMsg("OTP verification failed. Please try again.");
    }
  };

  /**
   * Handle Resend OTP Request
   */
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setErrorMsg("");
    setIsSendingOtp(true);
    try {
      const res = await resendOTP(otpEmail);
      setIsSendingOtp(false);

      if (!res.success) {
        setErrorMsg(res.message);
        setToast({ message: res.message, type: "error" });
        return;
      }

      setOtpExpiresIn(res.expiresSeconds || 300);
      setResendCooldown(res.cooldownSeconds || 30);
      setRemainingAttempts(5);
      setOtpValue("");
      setToast({ message: `New OTP sent to ${otpEmail}!`, type: "success" });
    } catch (err) {
      setIsSendingOtp(false);
      setErrorMsg("Failed to resend OTP.");
    }
  };

  // Account Linking Modal State
  const [showLinkingModal, setShowLinkingModal] = useState(false);
  const [linkingData, setLinkingData] = useState(null);

  // First-Time Customer Information Modal
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [pendingGoogleProfile, setPendingGoogleProfile] = useState(null);
  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    mobile: "",
    brand: "Tata Motors",
    model: "Nexon EV Max",
    vehicleNumber: "TN58EV2026",
    vehicleType: "Electric SUV",
    batteryCapacity: "40.5",
    connectorType: "CCS2",
  });

  /**
   * Universal Password Login with Automatic Role Detection (Counter ID or Email)
   */
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      const res = await login(identifier, password);
      setIsLoading(false);

      if (!res.success) {
        setErrorMsg(res.message);
        setToast({ message: res.message, type: "error" });
        return;
      }

      const counterIdDisplay = res.user?.counterId || res.user?.id || "";
      setToast({
        message: res.message || `Welcome, ${res.user.name}! Connected with ID ${counterIdDisplay}`,
        type: "success",
      });

      // Automatic redirect based on user's authoritative account role
      const roleUpper = (res.user.role || "").toUpperCase();
      setTimeout(() => {
        if (roleUpper === "ADMIN") {
          navigate("/admin/dashboard");
        } else if (roleUpper === "STATION_OWNER" || roleUpper === "OWNER") {
          navigate("/owner/dashboard");
        } else {
          navigate("/customer/dashboard");
        }
      }, 300);
    } catch (err) {
      setIsLoading(false);
      setErrorMsg("Authentication error. Please try again.");
      setToast({ message: "Sign-in encountered an error.", type: "error" });
    }
  };

  /**
   * Google OAuth Success Handler (Automatic Role Detection)
   */
  const handleGoogleSuccess = (credentialResponse) => {
    setErrorMsg("");
    setIsGoogleAuthenticating(true);

    try {
      // Pass null for automatic role detection based on account type / email
      const res = loginWithGoogle(credentialResponse.credential, null);
      setIsGoogleAuthenticating(false);

      // Case 1: Successful login for existing Customer, Owner, or Admin
      if (res.success && res.user) {
        setToast({
          message: res.message || `Signed in with Google as ${res.user.name}`,
          type: "success",
        });
        navigate(res.redirectPath || "/customer/dashboard");
        return;
      }

      // Case 2: First-time Google user - Needs vehicle & customer profile completion
      if (res.isNew && res.needsInfo) {
        setPendingGoogleProfile(res.googleProfile);
        setCustomerDetails((prev) => ({
          ...prev,
          name: res.googleProfile?.name || prev.name,
        }));
        setShowOnboardingModal(true);
        setToast({
          message: "Google account verified! Please complete your EV profile.",
          type: "info",
        });
        return;
      }

      // Case 3: Account with same email exists with password - Offer linking
      if (res.code === "ACCOUNT_EXISTS_LINK_REQUIRED") {
        setLinkingData({
          email: res.googleProfile.email,
          googleProfile: res.googleProfile,
        });
        setShowLinkingModal(true);
        return;
      }

      if (!res.success) {
        setErrorMsg(res.message || "Google authentication failed.");
        setToast({ message: res.message || "Unable to sign in with Google.", type: "error" });
      }
    } catch (err) {
      setIsGoogleAuthenticating(false);
      console.error("Google authentication error:", err);
      setErrorMsg("Unable to complete Google sign-in. Please try again.");
      setToast({ message: "Google sign-in encountered an error.", type: "error" });
    }
  };

  /**
   * Google OAuth Error Handler
   */
  const handleGoogleError = (err) => {
    setIsGoogleAuthenticating(false);
    console.warn("Google OAuth Error:", err);
    setErrorMsg(
      "Google OAuth popup was closed or restricted. Ensure your app origin (http://localhost:5173) is listed in Google Cloud Console 'Authorized JavaScript origins', or use Instant Google Sign-In below."
    );
    setToast({ message: "Google Sign-In popup closed or encounters domain restriction.", type: "warning" });
  };

  /**
   * Functional Instant Google Login (for testing with verified user profile in development)
   */
  const handleSimulatedGoogleLogin = (customEmail = "priyanmahesh09@gmail.com", customName = "Priyan Mahesh") => {
    setIsGoogleAuthenticating(true);
    setTimeout(() => {
      const simulatedProfile = {
        sub: `google_user_${Date.now()}`,
        email: customEmail.trim().toLowerCase(),
        name: customName.trim(),
        picture: "https://lh3.googleusercontent.com/a/default-user=s96-c",
        email_verified: true,
      };
      handleGoogleSuccess({ credential: simulatedProfile });
    }, 350);
  };

  /**
   * Complete First-Time Customer Onboarding Form
   */
  const handleCompleteOnboarding = (e) => {
    e.preventDefault();
    if (!pendingGoogleProfile) return;

    setIsLoading(true);
    setTimeout(() => {
      const res = completeGoogleCustomerRegistration(pendingGoogleProfile, customerDetails);
      setIsLoading(false);
      setShowOnboardingModal(false);

      if (res.success) {
        setToast({ message: res.message, type: "success" });
        navigate("/customer/dashboard");
      } else {
        setErrorMsg(res.message);
        setToast({ message: res.message, type: "error" });
      }
    }, 400);
  };

  /**
   * Confirm Account Linking
   */
  const handleConfirmLink = () => {
    if (!linkingData) return;
    setIsLoading(true);

    setTimeout(() => {
      const res = linkGoogleAccount(linkingData.email, linkingData.googleProfile);
      setIsLoading(false);
      setShowLinkingModal(false);

      if (res.success) {
        setToast({ message: res.message, type: "success" });
        navigate(res.redirectPath || "/customer/dashboard");
      } else {
        setErrorMsg(res.message);
        setToast({ message: res.message, type: "error" });
      }
    }, 350);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex items-center justify-center p-4 relative overflow-hidden font-inter transition-colors duration-200">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "info" })}
      />

      {/* Floating White & Dark Theme Switcher */}
      <div className="absolute top-5 right-5 z-30">
        <ThemeToggle showLabel={true} />
      </div>

      {/* Futuristic Ambient Glow & Electric Grid Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 dark:opacity-25 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none animate-pulse delay-700" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Single Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md theme-card p-7 md:p-8 rounded-3xl space-y-6 relative z-10"
      >
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20 group">
            <Zap size={32} className="text-slate-950 fill-slate-950" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">
            EV CHARGE <span className="text-emerald-500 dark:text-emerald-400">PRO</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Smart EV Charging Station Management System
          </p>
          <div className="pt-1">
            <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-600 dark:text-emerald-400/90 uppercase px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 inline-block">
              ONE PLATFORM • AUTOMATIC ROLE DETECTION
            </span>
          </div>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {/* Authentication Mode Switcher Tabs */}
        <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-900/80 p-1 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setAuthMode("OTP");
              setErrorMsg("");
            }}
            className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === "OTP"
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Zap size={14} />
            <span>EMAIL OTP SIGN-IN</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("PASSWORD");
              setErrorMsg("");
            }}
            className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === "PASSWORD"
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Lock size={14} />
            <span>PASSWORD / ID</span>
          </button>
        </div>

        {/* MODE 1: EMAIL OTP AUTHENTICATION */}
        {authMode === "OTP" && (
          <div className="space-y-4 text-xs">
            {!isOtpSent ? (
              /* STEP 1: Enter Email & Request OTP */
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      placeholder="Enter your email (e.g. user@evcharge.com)..."
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono font-bold rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5">
                    We will send a 6-digit One-Time Password (OTP) to your email inbox.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSendingOtp || !otpEmail.trim()}
                  className={`w-full py-3.5 rounded-2xl font-extrabold text-xs uppercase tracking-wider shadow-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-emerald-500/25 transition flex items-center justify-center gap-2 cursor-pointer ${
                    isSendingOtp || !otpEmail.trim() ? "opacity-75 cursor-wait" : ""
                  }`}
                >
                  {isSendingOtp ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Sending OTP...
                    </>
                  ) : (
                    <>
                      <Zap size={15} /> Send OTP
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* STEP 2: Verify 6-Digit OTP */
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between text-xs">
                  <div className="truncate pr-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">OTP Sent To:</span>
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-bold truncate">{otpEmail}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOtpSent(false);
                      setOtpValue("");
                      setErrorMsg("");
                    }}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold shrink-0"
                  >
                    Change Email
                  </button>
                </div>

                {devOtpCode && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] leading-snug flex items-start gap-2">
                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-500" />
                    <div>
                      <p className="font-bold">Live Test OTP Mode:</p>
                      <p className="text-[10px] text-amber-800/80 dark:text-amber-200/80 mt-0.5">
                        Your test verification code is <strong className="font-mono bg-amber-500/20 px-1 py-0.5 rounded text-emerald-700 dark:text-emerald-300 font-extrabold text-xs">{devOtpCode}</strong>.
                        To send real emails to your Gmail inbox, add your Gmail App Password to <code className="font-mono bg-amber-500/20 px-1 rounded">backend/.env</code>!
                      </p>
                    </div>
                  </div>
                )}

                {otpSuccessMessage ? (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-600 dark:text-emerald-300 font-bold text-center flex items-center justify-center gap-2">
                    <CheckCircle2 size={18} className="animate-bounce" />
                    <span>{otpSuccessMessage}</span>
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-center mb-1">
                      Enter 6-Digit Verification Code
                    </label>

                    {/* 6-Digit OTP Input Component */}
                    <OTPInput
                      length={6}
                      value={otpValue}
                      onChange={(val) => setOtpValue(val)}
                      onComplete={(val) => {
                        setOtpValue(val);
                      }}
                      disabled={isVerifyingOtp || otpExpiresIn <= 0}
                    />

                    {/* 5-Minute Timer & Attempts Count */}
                    <div className="flex items-center justify-between mt-2 text-[11px] font-mono">
                      <div className={`flex items-center gap-1.5 font-bold ${otpExpiresIn <= 60 ? "text-red-500 animate-pulse" : "text-slate-600 dark:text-slate-400"}`}>
                        <ShieldCheck size={14} />
                        <span>
                          {otpExpiresIn > 0 ? (
                            <>OTP expires in: <strong className="text-emerald-600 dark:text-emerald-400">{formatTimer(otpExpiresIn)}</strong></>
                          ) : (
                            <strong className="text-red-500">OTP Expired. Please request a new OTP.</strong>
                          )}
                        </span>
                      </div>

                      {remainingAttempts !== null && (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                          {remainingAttempts} attempts left
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Verify OTP Button */}
                <button
                  type="submit"
                  disabled={isVerifyingOtp || otpValue.length !== 6 || otpExpiresIn <= 0}
                  className={`w-full py-3.5 rounded-2xl font-extrabold text-xs uppercase tracking-wider shadow-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-emerald-500/25 transition flex items-center justify-center gap-2 cursor-pointer ${
                    isVerifyingOtp || otpValue.length !== 6 || otpExpiresIn <= 0 ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  {isVerifyingOtp ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Verifying OTP...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} /> Verify OTP & Sign In
                    </>
                  )}
                </button>

                {/* Resend OTP & Cooldown Timer */}
                <div className="text-center pt-1">
                  {resendCooldown > 0 ? (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Didn't receive code? Resend OTP in <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{resendCooldown}s</strong>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={isSendingOtp}
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw size={13} /> Resend OTP Code
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {/* MODE 2: UNIFIED PASSWORD LOGIN */}
        {authMode === "PASSWORD" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Email / Counter ID
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter Email or Counter ID (e.g. CUS0001, OWN0001, ADM0001)..."
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono font-bold rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-medium transition"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  placeholder="Enter password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isGoogleAuthenticating}
              className={`w-full py-3.5 rounded-2xl font-extrabold text-xs uppercase tracking-wider shadow-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-emerald-500/25 transition flex items-center justify-center gap-2 cursor-pointer ${
                isLoading ? "opacity-75 cursor-wait" : ""
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Verifying Credentials...
                </>
              ) : (
                "SIGN IN WITH PASSWORD"
              )}
            </button>
          </form>
        )}

        {/* Divider: OR */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
          <span className="flex-shrink mx-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
            OR
          </span>
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
        </div>

        {/* GOOGLE OAUTH BUTTON CONTAINER */}
        <div className="space-y-3">
          {(!import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID.includes("your_google_client_id")) && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] leading-tight flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Google OAuth Notice:</p>
                <p className="text-[10px] text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                  To use the official popup, add your Google Cloud Client ID to <code className="font-mono bg-amber-500/20 px-1 rounded">.env</code>.
                  Or click the <strong>Instant Google Sign-In</strong> button below to test immediately!
                </p>
              </div>
            </div>
          )}
          {isGoogleAuthenticating ? (
            <div className="w-full py-3 px-4 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-emerald-500" />
              <span>Authenticating with Google...</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex justify-center w-full google-btn-wrapper">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="filled_black"
                  shape="pill"
                  size="large"
                  width="360"
                  text="continue_with"
                  logo_alignment="left"
                />
              </div>

              {/* Instant Functional Google OAuth Test Button */}
              <button
                type="button"
                onClick={() => handleSimulatedGoogleLogin("priyanmahesh09@gmail.com", "Priyan Mahesh")}
                className="w-full py-2.5 px-4 rounded-full bg-slate-100 dark:bg-slate-900/90 hover:bg-slate-200 dark:hover:bg-slate-850 border border-slate-300 dark:border-slate-700 hover:border-emerald-500/50 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm group"
                title="Instant functional Google test with priyanmahesh09@gmail.com"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Instant Google Sign-In: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">priyanmahesh09@gmail.com</strong></span>
              </button>
            </div>
          )}
          <p className="text-[10px] text-center text-slate-500 font-medium">
            Single Secure Login • Automatic Role-Based Dashboard Redirection
          </p>
        </div>

        {/* Register Navigation */}
        <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800/80">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold transition inline-flex items-center gap-0.5"
          >
            Register Account <ArrowRight size={12} />
          </Link>
        </div>

        {/* Quick Demo Credentials with 1-Click Dual Login Testing */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 text-[10px] space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-500 dark:text-emerald-400" /> Test Dual Login (Counter ID or Email)
            </div>
            <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
              ⚡ LIVE MYSQL
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Customer:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { setIdentifier("CUS0001"); setPassword("password123"); }}
                  className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 font-mono text-[10px] transition cursor-pointer font-bold"
                  title="Fill Counter ID: CUS0001"
                >
                  ID: CUS0001
                </button>
                <button
                  type="button"
                  onClick={() => { setIdentifier("priyan@evcharge.com"); setPassword("password123"); }}
                  className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 text-[10px] transition cursor-pointer font-bold"
                  title="Fill Email: priyan@evcharge.com"
                >
                  Email: priyan@evcharge.com
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
              <span className="font-bold text-cyan-600 dark:text-cyan-400">Owner:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { setIdentifier("OWNER0001"); setPassword("ownerpassword"); }}
                  className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-500/20 text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-300 border border-slate-200 dark:border-slate-700 font-mono text-[10px] transition cursor-pointer font-bold"
                  title="Fill Counter ID: OWNER0001"
                >
                  ID: OWNER0001
                </button>
                <button
                  type="button"
                  onClick={() => { setIdentifier("senthil@greencharge.com"); setPassword("ownerpassword"); }}
                  className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-500/20 text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-300 border border-slate-200 dark:border-slate-700 text-[10px] transition cursor-pointer font-bold"
                  title="Fill Email: senthil@greencharge.com"
                >
                  Email: senthil@greencharge.com
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
              <span className="font-bold text-purple-600 dark:text-purple-400">Admin:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { setIdentifier("ADM0001"); setPassword("admin123"); }}
                  className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-500/20 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 border border-slate-200 dark:border-slate-700 font-mono text-[10px] transition cursor-pointer font-bold"
                  title="Fill Counter ID: ADM0001"
                >
                  ID: ADM0001
                </button>
                <button
                  type="button"
                  onClick={() => { setIdentifier("admin@evcharge.com"); setPassword("admin123"); }}
                  className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-500/20 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 border border-slate-200 dark:border-slate-700 text-[10px] transition cursor-pointer font-bold"
                  title="Fill Email: admin@evcharge.com"
                >
                  Email: admin@evcharge.com
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ==================================================== */}
      {/* FIRST-TIME GOOGLE USER ONBOARDING MODAL (Rule 9)     */}
      {/* ==================================================== */}
      <AnimatePresence>
        {showOnboardingModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg theme-card rounded-3xl p-6 md:p-8 shadow-2xl space-y-5 relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-3">
                  {pendingGoogleProfile?.profileImage ? (
                    <img
                      src={pendingGoogleProfile.profileImage}
                      alt={pendingGoogleProfile.name}
                      className="w-10 h-10 rounded-full border border-emerald-500/50 object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center">
                      {pendingGoogleProfile?.name ? pendingGoogleProfile.name[0] : "G"}
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                      Google Verified
                    </span>
                    <h3 className="text-base font-bold text-white">
                      Welcome, {pendingGoogleProfile?.name}!
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setShowOnboardingModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-1 text-xs text-slate-300 leading-relaxed">
                <p>
                  Your Google identity has been verified! As a new user, you are being onboarded as an EV Customer.
                </p>
                <p className="text-[11px] text-slate-400">
                  Please complete your details below to generate your official Customer ID (<strong className="text-emerald-400 font-mono">CUS0001</strong>) and Vehicle ID (<strong className="text-emerald-400 font-mono">VEH0001</strong>).
                </p>
              </div>

              <form onSubmit={handleCompleteOnboarding} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={customerDetails.name}
                      onChange={(e) =>
                        setCustomerDetails({ ...customerDetails, name: e.target.value })
                      }
                      placeholder="Your full name"
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2.5 font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="tel"
                        value={customerDetails.mobile}
                        onChange={(e) =>
                          setCustomerDetails({ ...customerDetails, mobile: e.target.value })
                        }
                        placeholder="e.g. 9876543210"
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-9 pr-3 py-2.5 font-mono"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase">
                    <Car size={16} /> EV Vehicle Information
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        EV Manufacturer
                      </label>
                      <select
                        value={customerDetails.brand}
                        onChange={(e) =>
                          setCustomerDetails({ ...customerDetails, brand: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded-xl"
                      >
                        <option value="Tata Motors">Tata Motors</option>
                        <option value="MG Motor">MG Motor</option>
                        <option value="Hyundai">Hyundai</option>
                        <option value="Kia">Kia</option>
                        <option value="Mahindra">Mahindra</option>
                        <option value="BYD">BYD</option>
                        <option value="BMW">BMW</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        EV Model
                      </label>
                      <input
                        type="text"
                        value={customerDetails.model}
                        onChange={(e) =>
                          setCustomerDetails({ ...customerDetails, model: e.target.value })
                        }
                        placeholder="e.g. Nexon EV Max"
                        className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded-xl font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Vehicle Number
                      </label>
                      <input
                        type="text"
                        value={customerDetails.vehicleNumber}
                        onChange={(e) =>
                          setCustomerDetails({
                            ...customerDetails,
                            vehicleNumber: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="TN58EV2026"
                        className="w-full bg-slate-900 border border-slate-700 text-emerald-400 p-2 rounded-xl font-mono uppercase font-bold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Battery (kWh)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={customerDetails.batteryCapacity}
                        onChange={(e) =>
                          setCustomerDetails({
                            ...customerDetails,
                            batteryCapacity: e.target.value,
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded-xl font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Connector
                      </label>
                      <select
                        value={customerDetails.connectorType}
                        onChange={(e) =>
                          setCustomerDetails({
                            ...customerDetails,
                            connectorType: e.target.value,
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded-xl"
                      >
                        <option value="CCS2">CCS2</option>
                        <option value="Type 2">Type 2</option>
                        <option value="CHAdeMO">CHAdeMO</option>
                        <option value="GB/T">GB/T</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:from-emerald-300 hover:to-teal-300 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? "Finalizing Registration..." : "Complete Profile & Enter Dashboard"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* ACCOUNT LINKING CONFIRMATION MODAL                   */}
      {/* ==================================================== */}
      <AnimatePresence>
        {showLinkingModal && linkingData && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md theme-card rounded-3xl p-6 md:p-8 shadow-2xl space-y-5 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 mx-auto flex items-center justify-center border border-cyan-500/30">
                <LinkIcon size={28} />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-white">Link Google Account?</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  An existing EV CHARGE PRO account was found with:
                </p>
                <div className="font-mono text-xs font-bold text-cyan-400 bg-slate-900 py-1.5 px-3 rounded-lg inline-block mt-1">
                  {linkingData.email}
                </div>
              </div>

              <p className="text-xs text-slate-400">
                Would you like to link your Google account to this existing profile? Your vehicles, bookings, and customer ID will be preserved.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLinkingModal(false)}
                  className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLink}
                  disabled={isLoading}
                  className="py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  {isLoading ? "Linking..." : "Link Google Account"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}