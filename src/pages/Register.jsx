import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Zap, User, Building2, CheckCircle2, ShieldCheck } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Register() {
  const navigate = useNavigate();
  const { registerCustomer, registerOwner } = useAuth();

  const [roleTab, setRoleTab] = useState("CUSTOMER");
  const [successInfo, setSuccessInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Customer Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Chennai");
  const [pincode, setPincode] = useState("600001");
  const [brand, setBrand] = useState("Tata");
  const [model, setModel] = useState("Nexon EV");
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

  const handleCustomerSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    const res = registerCustomer({
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

    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }

    setSuccessInfo({
      role: "CUSTOMER",
      counterId: res.counterId,
      message: `Account created successfully! Your Counter ID is ${res.counterId}.`,
    });
  };

  const handleOwnerSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");

    const res = registerOwner({
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

    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }

    setSuccessInfo({
      role: "STATION_OWNER",
      counterId: res.counterId,
      message: `Station Owner registration submitted! Your Counter ID is ${res.counterId}. Awaiting Admin Approval.`,
    });
  };

  return (
    <div className="min-h-screen bg-[#070D1E] text-slate-100 flex items-center justify-center p-4 py-12 relative overflow-hidden">
      <div className="w-full max-w-2xl bg-[#0B1329] border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-400 mx-auto flex items-center justify-center">
            <Zap size={28} className="text-slate-950 fill-slate-950" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Create Account</h1>
          <p className="text-xs text-slate-400">Register as Customer or EV Station Owner</p>
        </div>

        {/* Role Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setRoleTab("CUSTOMER");
              setErrorMsg("");
              setSuccessInfo(null);
            }}
            className={`py-2.5 rounded-xl transition flex items-center justify-center gap-2 ${
              roleTab === "CUSTOMER"
                ? "bg-emerald-500 text-slate-950 font-extrabold shadow"
                : "text-slate-400 hover:text-white"
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
            className={`py-2.5 rounded-xl transition flex items-center justify-center gap-2 ${
              roleTab === "STATION_OWNER"
                ? "bg-cyan-500 text-slate-950 font-extrabold shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Building2 size={16} /> EV Station Owner
          </button>
        </div>

        {/* Success Modal Notification */}
        {successInfo ? (
          <div className="p-6 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-center space-y-4">
            <CheckCircle2 size={40} className="text-emerald-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">Registration Successful!</h3>
            <p className="text-xs text-slate-200 leading-relaxed max-w-md mx-auto">
              {successInfo.message}
            </p>
            <div className="p-3 bg-slate-900 rounded-xl font-mono text-sm font-bold text-emerald-400 inline-block">
              Auto-Generated Counter ID: {successInfo.counterId}
            </div>
            <div>
              <button
                onClick={() => navigate("/login")}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs"
              >
                Proceed to Login
              </button>
            </div>
          </div>
        ) : (
          <>
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold text-center">
                {errorMsg}
              </div>
            )}

            {/* CUSTOMER FORM */}
            {roleTab === "CUSTOMER" ? (
              <form onSubmit={handleCustomerSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Priyan"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. priyan@evcharge.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">Mobile Number</label>
                    <input
                      type="text"
                      placeholder="9876543210"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl"
                      required
                    />
                  </div>
                </div>

                {/* Vehicle Details */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">EV Vehicle Registration</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Brand</label>
                      <input
                        type="text"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Model</label>
                      <input
                        type="text"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Reg Number</label>
                      <input
                        type="text"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded-xl font-mono uppercase font-bold"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition"
                >
                  Register Customer & Generate CUS Counter ID
                </button>
              </form>
            ) : (
              /* STATION OWNER FORM */
              <form onSubmit={handleOwnerSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">Owner Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Senthil Nathan"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">Business / Company Name</label>
                    <input
                      type="text"
                      placeholder="e.g. GreenCharge Infra Pvt Ltd"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">Business Email</label>
                    <input
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">Password</label>
                    <input
                      type="password"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">Business Address</label>
                    <input
                      type="text"
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">GST Number</label>
                    <input
                      type="text"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl font-mono font-bold uppercase"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition"
                >
                  Register Station Owner & Generate OWNER ID
                </button>
              </form>
            )}
          </>
        )}

        <div className="pt-2 text-center text-xs text-slate-400">
          Already registered?{" "}
          <Link to="/login" className="text-emerald-400 hover:underline font-bold">
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
}
