import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { Zap, User, Building2, CheckCircle2, Car } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import Toast from "../components/Toast";
import ThemeToggle from "../components/ThemeToggle";

export default function Register() {
  const navigate = useNavigate();
  const { registerCustomer, registerOwner, loginWithGoogle, completeGoogleCustomerRegistration } = useAuth();

  const [roleTab, setRoleTab] = useState("CUSTOMER");
  const [successInfo, setSuccessInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [toast, setToast] = useState({ message: "", type: "info" });
  const [isLoading, setIsLoading] = useState(false);

  // Google Registration State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleProfile, setGoogleProfile] = useState(null);

  // Customer Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Chennai");
  const [pincode, setPincode] = useState("600001");
  const [brand, setBrand] = useState("Tata Motors");
  const [model, setModel] = useState("Nexon EV Max");
  const [vehicleNumber, setVehicleNumber] = useState("TN01AB1234");
  const [vehicleType, setVehicleType] = useState("Electric SUV");
  const [batteryCapacity, setBatteryCapacity] = useState("40.5");
  const [preferredConnector, setPreferredConnector] = useState("CCS2");

  // Station Owner Form State
  const [ownerName, setOwnerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [ownerCity, setOwnerCity] = useState("Chennai");
  const [ownerPincode, setOwnerPincode] = useState("600002");
  const [gstNumber, setGstNumber] = useState("33AAAAA0000A1Z5");

  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      setToast({ message: "Passwords do not match.", type: "error" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerCustomer({
        name,
        email,
        mobile,
        password,
        address,
        city,
        pincode,
        brand,
        model,
        vehicleNumber,
        vehicleType,
        batteryCapacity,
        preferredConnector,
      });
      setIsLoading(false);

      if (!res.success) {
        setErrorMsg(res.message);
        setToast({ message: res.message, type: "error" });
        return;
      }

      setSuccessInfo({
        role: "CUSTOMER",
        counterId: res.counterId,
        email: email.trim().toLowerCase(),
        message: `Account created successfully! Your Customer ID is ${res.counterId}. You can log in using either this Counter ID (${res.counterId}) or your Email (${email}).`,
      });
      setToast({ message: `Customer ID ${res.counterId} generated!`, type: "success" });
    } catch (err) {
      setIsLoading(false);
      setErrorMsg("Registration failed. Please try again.");
    }
  };

  const handleOwnerSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    setIsLoading(true);
    try {
      const res = await registerOwner({
        ownerName,
        businessName,
        email: ownerEmail,
        phone,
        password: ownerPassword,
        businessAddress,
        city: ownerCity,
        pincode: ownerPincode,
        gstNumber,
      });
      setIsLoading(false);

      if (!res.success) {
        setErrorMsg(res.message);
        setToast({ message: res.message, type: "error" });
        return;
      }

      setSuccessInfo({
        role: "STATION_OWNER",
        counterId: res.counterId,
        email: ownerEmail.trim().toLowerCase(),
        message: `Station Owner account registered successfully! Your Owner ID is ${res.counterId}. You can log in immediately using either this Owner ID (${res.counterId}) or your Business Email (${ownerEmail}).`,
      });
      setToast({ message: `Owner ID ${res.counterId} generated!`, type: "success" });
    } catch (err) {
      setIsLoading(false);
      setErrorMsg("Station Owner registration failed. Please try again.");
    }
  };

  /**
   * Handle Google Registration flow
   */
  const handleGoogleSuccess = (credentialResponse) => {
    try {
      const res = loginWithGoogle(credentialResponse.credential, roleTab);
      if (res.success && !res.isNew) {
        setToast({ message: "Welcome back! Redirecting to Dashboard...", type: "success" });
        navigate(res.redirectPath || "/customer/dashboard");
        return;
      }
      if (res.isNew && res.googleProfile) {
        setGoogleProfile(res.googleProfile);
        setName(res.googleProfile.name);
        setEmail(res.googleProfile.email);
        setShowGoogleModal(true);
      } else if (!res.success) {
        setErrorMsg(res.message || "Google registration failed.");
        setToast({ message: res.message || "Google registration failed.", type: "error" });
      }
    } catch (err) {
      console.error("Google Registration Error:", err);
      setToast({ message: "Google connection failed. Please try again.", type: "error" });
    }
  };

  const handleGoogleError = (err) => {
    console.warn("Google Registration Popup Error:", err);
    setErrorMsg("Google Sign-Up popup closed or origin restricted. You can use Instant Google Sign-Up below.");
    setToast({ message: "Google sign-up popup closed or domain restricted.", type: "warning" });
  };

  const handleSimulatedGoogleSignup = (customEmail = "priyanmahesh09@gmail.com", customName = "Priyan Mahesh") => {
    handleGoogleSuccess({
      credential: {
        sub: `google_user_${Date.now()}`,
        email: customEmail,
        name: customName,
        picture: "https://lh3.googleusercontent.com/a/default-user=s96-c",
      },
    });
  };

  const handleCompleteGoogleReg = (e) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      const res = completeGoogleCustomerRegistration(googleProfile, {
        mobile,
        brand,
        model,
        vehicleNumber,
        vehicleType,
        batteryCapacity,
        preferredConnector,
        city,
        pincode,
      });

      setIsLoading(false);
      setShowGoogleModal(false);

      if (res.success) {
        setSuccessInfo({
          role: "CUSTOMER",
          counterId: res.counterId,
          message: `Account created with Google! Your Customer ID is ${res.counterId}.`,
        });
      } else {
        setErrorMsg(res.message);
        setToast({ message: res.message, type: "error" });
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#070D1E] text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 py-12 relative overflow-hidden font-inter transition-colors duration-200">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "info" })}
      />

      {/* Floating White & Dark Theme Switcher */}
      <div className="absolute top-5 right-5 z-30">
        <ThemeToggle showLabel={true} />
      </div>

      <div className="w-full max-w-2xl bg-white/95 dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-2xl shadow-slate-300/60 dark:shadow-emerald-950/20 space-y-6 relative z-10 transition-colors duration-200">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Zap size={28} className="text-slate-950 fill-slate-950" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Create Account</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Join EV CHARGE PRO as an EV Customer or Charging Station Owner
          </p>
        </div>

        {/* Role Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setRoleTab("CUSTOMER");
              setErrorMsg("");
              setSuccessInfo(null);
            }}
            className={`py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              roleTab === "CUSTOMER"
                ? "bg-emerald-500 text-slate-950 font-extrabold shadow"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <User size={16} /> Customer / EV User
          </button>

          <button
            type="button"
            onClick={() => {
              setRoleTab("STATION_OWNER");
              setErrorMsg("");
              setSuccessInfo(null);
            }}
            className={`py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              roleTab === "STATION_OWNER"
                ? "bg-cyan-500 text-slate-950 font-extrabold shadow"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Building2 size={16} /> EV Station Owner
          </button>
        </div>

        {/* Google Quick Sign Up for Customers (Rule 12) */}
        {roleTab === "CUSTOMER" && !successInfo && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-3">
            {(!import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID.includes("your_google_client_id")) && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] leading-tight flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Google OAuth Notice:</p>
                  <p className="text-[10px] text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                    To use the official popup, add your Google Cloud Client ID to <code className="font-mono bg-amber-500/20 px-1 rounded">.env</code>.
                    Or click the <strong>Instant Google Sign-Up</strong> button below to test immediately!
                  </p>
                </div>
              </div>
            )}
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 text-center">
              Fast Track: Register with Google Account
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-center w-full">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="filled_black"
                  shape="pill"
                  size="large"
                  text="signup_with"
                  width="360"
                />
              </div>

              {/* Instant Functional Google OAuth Test Button (priyanmahesh09@gmail.com) */}
              <button
                type="button"
                onClick={() => handleSimulatedGoogleSignup("priyanmahesh09@gmail.com", "Priyan Mahesh")}
                className="w-full py-2.5 px-4 rounded-full bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-300 dark:border-slate-700 hover:border-emerald-500/50 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm group"
                title="Instant functional Google registration with priyanmahesh09@gmail.com"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Instant Google Sign-Up: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">priyanmahesh09@gmail.com</strong></span>
              </button>
            </div>
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
              <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
                OR REGISTER WITH PASSWORD
              </span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
            </div>
          </div>
        )}

        {/* Success Banner */}
        {successInfo ? (
          <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/40 text-center space-y-4">
            <CheckCircle2 size={44} className="text-emerald-600 dark:text-emerald-400 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Registration Successful!</h3>
            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed max-w-md mx-auto">
              {successInfo.message}
            </p>
            <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400 inline-block border border-slate-200 dark:border-slate-800">
              Auto-Generated Counter ID: {successInfo.counterId}
            </div>
            <div>
              <button
                onClick={() => navigate("/login")}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs cursor-pointer shadow-lg shadow-emerald-500/20 transition"
              >
                Proceed to Sign In
              </button>
            </div>
          </div>
        ) : (
          <>
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold text-center">
                {errorMsg}
              </div>
            )}

            {/* CUSTOMER FORM */}
            {roleTab === "CUSTOMER" ? (
              <form onSubmit={handleCustomerSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Priyan"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl focus:border-emerald-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. priyan@evcharge.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl focus:border-emerald-500 outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Mobile Number
                    </label>
                    <input
                      type="text"
                      placeholder="9876543210"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl font-mono focus:border-emerald-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl focus:border-emerald-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl focus:border-emerald-500 outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Vehicle Details */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Car size={16} /> EV Vehicle Registration
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                        Brand
                      </label>
                      <input
                        type="text"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2 rounded-xl focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                        Model
                      </label>
                      <input
                        type="text"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2 rounded-xl focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                        Reg Number
                      </label>
                      <input
                        type="text"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2 rounded-xl font-mono uppercase font-bold focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  Register Customer & Generate CUS Counter ID
                </button>
              </form>
            ) : (
              /* STATION OWNER FORM */
              <form onSubmit={handleOwnerSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Owner Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Senthil Nathan"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl focus:border-cyan-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Business / Company Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. GreenCharge Infra Pvt Ltd"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl font-bold focus:border-cyan-500 outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Business Email
                    </label>
                    <input
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl focus:border-cyan-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl font-mono focus:border-cyan-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl focus:border-cyan-500 outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Business Address
                    </label>
                    <input
                      type="text"
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl focus:border-cyan-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      GST Number
                    </label>
                    <input
                      type="text"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl font-mono font-bold uppercase focus:border-cyan-500 outline-none"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  Register Station Owner & Generate OWNER ID
                </button>
              </form>
            )}
          </>
        )}

        <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800/80">
          Already registered?{" "}
          <Link to="/login" className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold">
            Sign In Here
          </Link>
        </div>
      </div>

      {/* Complete Google Sign Up Details Modal */}
      <AnimatePresence>
        {showGoogleModal && googleProfile && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg theme-card rounded-3xl p-6 md:p-8 shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                {googleProfile.profileImage ? (
                  <img
                    src={googleProfile.profileImage}
                    alt={googleProfile.name}
                    className="w-12 h-12 rounded-full border border-emerald-500/50 object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-slate-950 font-black text-lg flex items-center justify-center">
                    {googleProfile.name ? googleProfile.name[0] : "G"}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-white">Welcome, {googleProfile.name}!</h3>
                  <p className="text-xs text-slate-400">{googleProfile.email}</p>
                </div>
              </div>

              <p className="text-xs text-slate-300">
                Finish setting up your customer profile with your phone number and electric vehicle specifications:
              </p>

              <form onSubmit={handleCompleteGoogleReg} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-400 uppercase mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="9876543210"
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5 font-mono"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      EV Brand
                    </label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2 font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      EV Model
                    </label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2 font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Registration Number
                    </label>
                    <input
                      type="text"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                      className="w-full bg-slate-900 border border-slate-700 text-emerald-400 rounded-xl p-2 font-mono uppercase font-bold"
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
                      value={batteryCapacity}
                      onChange={(e) => setBatteryCapacity(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2 font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowGoogleModal(false)}
                    className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20"
                  >
                    {isLoading ? "Creating Account..." : "Complete & Register"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
