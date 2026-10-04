import { useState, useEffect } from "react";
import {
  Settings,
  Building2,
  CreditCard,
  Phone,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileText,
  User,
  Mail,
  MapPin,
  Lock
} from "lucide-react";
import { getOwnerSettings, updateOwnerSettings } from "../../services/ownerService";
import { useAuth } from "../../contexts/AuthContext";

export default function OwnerSettings() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("BUSINESS"); // BUSINESS, BANKING, CONTACT, SECURITY
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const [formData, setFormData] = useState({
    // Business
    businessName: "",
    businessRegistrationNumber: "",
    gstNumber: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    
    // Banking / UPI
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    accountHolderName: "",
    upiId: "",

    // Personal & Contact
    name: "",
    email: "",
    phone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",

    // Security / Password
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getOwnerSettings();
      if (data) {
        setFormData((prev) => ({
          ...prev,
          businessName: data.businessName || data.businessInfo?.businessName || "",
          businessRegistrationNumber: data.businessRegistrationNumber || data.businessInfo?.registrationNumber || "",
          gstNumber: data.gstNumber || data.businessInfo?.gstNumber || "",
          address: data.address || data.businessInfo?.address || "",
          city: data.city || data.businessInfo?.city || "",
          state: data.state || data.businessInfo?.state || "",
          pincode: data.pincode || data.businessInfo?.pincode || "",
          bankName: data.bankInfo?.bankName || data.bankName || "",
          accountNumber: data.bankInfo?.accountNumber || data.accountNumber || "",
          ifscCode: data.bankInfo?.ifscCode || data.ifscCode || "",
          accountHolderName: data.bankInfo?.accountHolderName || data.accountHolderName || "",
          upiId: data.bankInfo?.upiId || data.upiId || "",
          name: data.name || currentUser?.name || "",
          email: data.email || currentUser?.email || "",
          phone: data.phone || currentUser?.phone || "",
          emergencyContactName: data.emergencyContact?.name || data.emergencyContactName || "",
          emergencyContactPhone: data.emergencyContact?.phone || data.emergencyContactPhone || "",
        }));
      }
    } catch (err) {
      console.error("Failed to load owner settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateOwnerSettings(formData);
      setToast({
        show: true,
        message: "Settings successfully saved to MySQL!",
        type: "success",
      });
    } catch (err) {
      console.error("Failed to update settings:", err);
      setToast({
        show: true,
        message: err.response?.data?.message || "Failed to update settings",
        type: "error",
      });
    } finally {
      setSaving(false);
      setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast.show && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${
            toast.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Settings className="w-6 h-6" />
            </span>
            Owner Profile & Settings
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Manage your legal entity registration, payout bank accounts, UPI credentials, and station preferences.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider transition flex items-center gap-2 self-start md:self-auto shadow-lg shadow-emerald-500/20 disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? "Persisting to DB..." : "Save Changes"}</span>
        </button>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: "BUSINESS", label: "Business & Legal KYC", icon: Building2 },
          { id: "BANKING", label: "Banking & UPI Payouts", icon: CreditCard },
          { id: "CONTACT", label: "Contact & Emergency", icon: Phone },
          { id: "SECURITY", label: "Security & Credentials", icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/30"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Settings Card */}
      <div className="rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
            <p className="text-slate-400 text-sm font-medium">Loading configuration from MySQL...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Tab 1: Business & Legal KYC */}
            {activeTab === "BUSINESS" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-cyan-500" />
                    Business Entity Details
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Registered corporate identification used for GST tax invoices and regulatory compliance.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Business / Trade Name *
                    </label>
                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleChange}
                      placeholder="e.g. Apex Charge Energy Pvt Ltd"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Business Registration Number (CIN/LLPIN) *
                    </label>
                    <input
                      type="text"
                      name="businessRegistrationNumber"
                      value={formData.businessRegistrationNumber}
                      onChange={handleChange}
                      placeholder="e.g. U74999TN2023PTC123456"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      GST Identification Number (GSTIN) *
                    </label>
                    <input
                      type="text"
                      name="gstNumber"
                      value={formData.gstNumber}
                      onChange={handleChange}
                      placeholder="e.g. 33AAAAA0000A1Z5"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="e.g. Tamil Nadu"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Registered Address *
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Street address, Industrial Estate, Hub"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="e.g. Chennai"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Pincode *
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleChange}
                      placeholder="e.g. 600001"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Banking & UPI Payouts */}
            {activeTab === "BANKING" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-cyan-500" />
                    Direct Settlement & Bank Details
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Razorpay test payouts and daily charging revenues are settled directly into this bank or VPA account.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      name="bankName"
                      value={formData.bankName}
                      onChange={handleChange}
                      placeholder="e.g. HDFC Bank Ltd"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      name="accountHolderName"
                      value={formData.accountHolderName}
                      onChange={handleChange}
                      placeholder="e.g. Apex Charge Energy"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Account Number
                    </label>
                    <input
                      type="password"
                      name="accountNumber"
                      value={formData.accountNumber}
                      onChange={handleChange}
                      placeholder="••••••••••••••"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      name="ifscCode"
                      value={formData.ifscCode}
                      onChange={handleChange}
                      placeholder="e.g. HDFC0001234"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono uppercase"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Settlement UPI ID (VPA)
                    </label>
                    <input
                      type="text"
                      name="upiId"
                      value={formData.upiId}
                      onChange={handleChange}
                      placeholder="e.g. apexenergy@okaxis"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Contact & Emergency */}
            {activeTab === "CONTACT" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Phone className="w-4 h-4 text-cyan-500" />
                    Personnel & Emergency Contacts
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Direct contacts for critical station outages, grid alerts, and hardware technician dispatches.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Primary Contact Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Primary Phone
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Notification Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      disabled
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Emergency Contact Person
                    </label>
                    <input
                      type="text"
                      name="emergencyContactName"
                      value={formData.emergencyContactName}
                      onChange={handleChange}
                      placeholder="e.g. Safety Officer John"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Emergency SOS Hotline Phone
                    </label>
                    <input
                      type="text"
                      name="emergencyContactPhone"
                      value={formData.emergencyContactPhone}
                      onChange={handleChange}
                      placeholder="+91 98765 43210 (24/7 Hotline)"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Security & Credentials */}
            {activeTab === "SECURITY" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-500" />
                    Security & Session Protection
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Update your account credentials and manage cryptographic authentication tokens.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 text-xs text-cyan-400">
                  🔒 All password hashing uses bcryptjs salt rounds. Secret keys and MySQL credentials remain strictly enclosed on the server runtime.
                </div>

                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      New Secure Password
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      placeholder="Minimum 8 characters"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-type new password"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{saving ? "Persisting to DB..." : "Save Settings"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
