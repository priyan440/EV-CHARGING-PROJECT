import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import Toast from "../components/Toast";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiTruck,
  FiZap,
  FiSave,
  FiEdit3,
  FiCheckCircle,
} from "react-icons/fi";

function Profile() {
  const { currentUser, updateProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });

  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    address: "",
    city: "",
    pincode: "",
    vehicleNumber: "",
    vehicleType: "Electric Car",
    brand: "",
    model: "",
    batteryCapacity: "40.5",
    batteryPercentage: 65,
    preferredChargingType: "DC Fast Charging",
    preferredConnector: "CCS",
  });

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || "",
        mobile: currentUser.mobile || "",
        address: currentUser.address || "",
        city: currentUser.city || "",
        pincode: currentUser.pincode || "",
        vehicleNumber: currentUser.vehicle?.number || "",
        vehicleType: currentUser.vehicle?.type || "Electric Car",
        brand: currentUser.vehicle?.brand || "",
        model: currentUser.vehicle?.model || "",
        batteryCapacity: currentUser.vehicle?.batteryCapacity || "40.5",
        batteryPercentage: currentUser.vehicle?.batteryPercentage || 65,
        preferredChargingType:
          currentUser.chargingPreference?.type || "DC Fast Charging",
        preferredConnector: currentUser.chargingPreference?.connector || "CCS",
      });
    }
  }, [currentUser]);

  if (!currentUser) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    const res = updateProfile({
      name: formData.name,
      mobile: formData.mobile,
      address: formData.address,
      city: formData.city,
      pincode: formData.pincode,
      vehicle: {
        number: formData.vehicleNumber,
        type: formData.vehicleType,
        brand: formData.brand,
        model: formData.model,
        batteryCapacity: formData.batteryCapacity,
        batteryPercentage: Number(formData.batteryPercentage),
      },
      chargingPreference: {
        type: formData.preferredChargingType,
        connector: formData.preferredConnector,
      },
    });

    if (res.success) {
      setIsEditing(false);
      setToast({ message: "Profile updated successfully!", type: "success" });
    } else {
      setToast({ message: res.message || "Failed to update profile", type: "error" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Customer Profile
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Manage your personal credentials, vehicle registration, and charging preferences
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 transition cursor-pointer"
        >
          <FiEdit3 size={16} />
          <span>{isEditing ? "Cancel Edit" : "Edit Profile"}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Account Badge Card */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xl flex items-center justify-center shadow-inner">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "C"}
            </div>
            <div>
              <h2 className="text-lg font-black">{currentUser.name}</h2>
              <p className="text-xs text-slate-400">{currentUser.email}</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700 text-left sm:text-right">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              Unique Counter ID
            </span>
            <span className="font-mono text-2xl font-black text-emerald-400 tracking-wider">
              {currentUser.counterId}
            </span>
          </div>
        </div>

        {/* Section 1: Personal Details */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <FiUser className="text-emerald-500" />
            <span>Personal Information</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                disabled={!isEditing}
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white disabled:opacity-75"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Email Address (Read-only)
              </label>
              <input
                type="email"
                disabled
                value={currentUser.email}
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Mobile Number
              </label>
              <input
                type="text"
                name="mobile"
                disabled={!isEditing}
                value={formData.mobile}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white disabled:opacity-75"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                City
              </label>
              <input
                type="text"
                name="city"
                disabled={!isEditing}
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white disabled:opacity-75"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Address
              </label>
              <input
                type="text"
                name="address"
                disabled={!isEditing}
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white disabled:opacity-75"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Vehicle Details */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <FiTruck className="text-emerald-500" />
            <span>Registered Electric Vehicle</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Vehicle Registration Number
              </label>
              <input
                type="text"
                name="vehicleNumber"
                disabled={!isEditing}
                value={formData.vehicleNumber}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white disabled:opacity-75 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Vehicle Category
              </label>
              <select
                name="vehicleType"
                disabled={!isEditing}
                value={formData.vehicleType}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white disabled:opacity-75"
              >
                <option value="Electric Car">Electric Car</option>
                <option value="Electric Bike">Electric Bike</option>
                <option value="Electric Scooter">Electric Scooter</option>
                <option value="Electric Bus">Electric Bus</option>
                <option value="Electric Van">Electric Van</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                EV Brand
              </label>
              <input
                type="text"
                name="brand"
                disabled={!isEditing}
                value={formData.brand}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white disabled:opacity-75"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                EV Model
              </label>
              <input
                type="text"
                name="model"
                disabled={!isEditing}
                value={formData.model}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white disabled:opacity-75"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Battery Capacity (kWh)
              </label>
              <input
                type="number"
                step="0.5"
                name="batteryCapacity"
                disabled={!isEditing}
                value={formData.batteryCapacity}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white disabled:opacity-75"
              />
            </div>
          </div>
        </div>

        {isEditing && (
          <button
            type="submit"
            className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <FiSave size={18} />
            <span>SAVE PROFILE CHANGES</span>
          </button>
        )}
      </form>
    </div>
  );
}

export default Profile;