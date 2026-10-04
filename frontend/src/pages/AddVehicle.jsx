import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Car,
  Zap,
  Battery,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import Breadcrumbs from "../components/Breadcrumbs";
import { vehicleService } from "../services/vehicleService";
import Toast from "../components/Toast";

const POPULAR_MODELS = [
  { manufacturer: "Tata Motors", model: "Nexon EV Max", battery: 40.5, power: 50, connector: "CCS2", type: "Car" },
  { manufacturer: "Tata Motors", model: "Curvv EV", battery: 55.0, power: 70, connector: "CCS2", type: "Car" },
  { manufacturer: "Tata Motors", model: "Punch EV", battery: 35.0, power: 50, connector: "CCS2", type: "Car" },
  { manufacturer: "Mahindra", model: "XUV400 Pro", battery: 39.4, power: 50, connector: "CCS2", type: "Car" },
  { manufacturer: "Hyundai", model: "Ioniq 5", battery: 72.6, power: 150, connector: "CCS2", type: "Car" },
  { manufacturer: "MG Motor", model: "ZS EV", battery: 50.3, power: 50, connector: "CCS2", type: "Car" },
  { manufacturer: "BYD", model: "Seal", battery: 82.5, power: 150, connector: "CCS2", type: "Car" },
  { manufacturer: "Ather Energy", model: "450X Gen 3", battery: 3.7, power: 3.3, connector: "Type 2", type: "2W" },
  { manufacturer: "Ola Electric", model: "S1 Pro", battery: 4.0, power: 3.3, connector: "Type 2", type: "2W" },
];

export default function AddVehicle() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });

  const [formData, setFormData] = useState({
    vehicleName: "",
    registrationNumber: "",
    vehicleType: "Car",
    manufacturer: "Tata Motors",
    model: "",
    batteryCapacity: 40.5,
    maxChargingPowerKw: 50,
    connectorType: "CCS2",
    currentSocPercent: 70,
  });

  const [connectorTypes, setConnectorTypes] = useState([
    { id: 1, connector_name: "CCS2", description: "Combined Charging System (DC Fast)" },
    { id: 2, connector_name: "Type 2", description: "Mennekes AC Charging" },
    { id: 3, connector_name: "CHAdeMO", description: "Japanese DC Fast Charging" },
    { id: 4, connector_name: "GB/T", description: "Standard DC/AC Fast Connector" },
  ]);

  useEffect(() => {
    vehicleService.getConnectorTypes().then((types) => {
      if (Array.isArray(types) && types.length > 0) {
        setConnectorTypes(types);
      }
    }).catch(() => {});
  }, []);

  const handleQuickPreset = (preset) => {
    setFormData((prev) => ({
      ...prev,
      manufacturer: preset.manufacturer,
      model: preset.model,
      vehicleName: `${preset.manufacturer} ${preset.model}`,
      batteryCapacity: preset.battery,
      maxChargingPowerKw: preset.power,
      connectorType: preset.connector,
      vehicleType: preset.type,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.registrationNumber.trim()) {
      setToast({ message: "Registration number is required (e.g. TN01AB1234)", type: "error" });
      return;
    }
    if (!formData.model.trim()) {
      setToast({ message: "Vehicle model is required", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        vehicle_name: formData.vehicleName || `${formData.manufacturer} ${formData.model}`,
        vehicleName: formData.vehicleName || `${formData.manufacturer} ${formData.model}`,
        registration_number: formData.registrationNumber.toUpperCase().replace(/\s+/g, ""),
        vehicle_type: formData.vehicleType,
        brand: formData.manufacturer,
        manufacturer: formData.manufacturer,
        model: formData.model,
        battery_capacity: parseFloat(formData.batteryCapacity) || 40.0,
        batteryCapacity: parseFloat(formData.batteryCapacity) || 40.0,
        max_charging_power_kw: parseFloat(formData.maxChargingPowerKw) || 50.0,
        connector_type: formData.connectorType,
        connectorType: formData.connectorType,
        current_soc_percent: parseInt(formData.currentSocPercent, 10) || 70,
      };

      const res = await vehicleService.createVehicle(payload);
      if (res?.success) {
        setToast({ message: "Vehicle registered successfully in MySQL database!", type: "success" });
        setTimeout(() => {
          navigate("/vehicles");
        }, 800);
      } else {
        setToast({ message: res?.message || "Failed to save vehicle.", type: "error" });
      }
    } catch (err) {
      setToast({ message: err.message || "An unexpected error occurred.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      <Breadcrumbs
        items={[
          { label: "My Vehicles", path: "/vehicles" },
          { label: "Add New Vehicle", path: "/vehicles/add" },
        ]}
      />

      {/* Header Banner */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link
            to="/vehicles"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-emerald-500 font-semibold transition"
          >
            <ArrowLeft size={14} /> Back to Vehicles
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
            <Car className="text-emerald-500" /> Register New Electric Vehicle
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Add your EV specifications to enable intelligent charging calculations, real-time connector matching, and instant slot reservations.
          </p>
        </div>
      </div>

      {/* Quick Model Presets */}
      <div className="theme-card p-4 sm:p-5 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-400" /> Popular EV Presets (Click to autofill)
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {POPULAR_MODELS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleQuickPreset(preset)}
              className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card-subtle)] hover:border-emerald-500 hover:bg-emerald-500/10 text-xs font-semibold whitespace-nowrap transition cursor-pointer text-left"
            >
              <div className="font-bold text-[var(--text-primary)]">{preset.model}</div>
              <div className="text-[10px] text-[var(--text-muted)]">{preset.battery} kWh • {preset.power} kW</div>
            </button>
          ))}
        </div>
      </div>

      {/* Add Vehicle Form */}
      <form onSubmit={handleSubmit} className="theme-card p-6 sm:p-8 rounded-3xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Vehicle Name / Nickname */}
          <div>
            <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1.5">
              Vehicle Nickname / Display Name
            </label>
            <input
              type="text"
              placeholder="e.g. My Daily Nexon EV"
              value={formData.vehicleName}
              onChange={(e) => setFormData({ ...formData, vehicleName: e.target.value })}
              className="w-full theme-input px-4 py-3 rounded-xl text-sm"
            />
          </div>

          {/* Registration Number */}
          <div>
            <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1.5">
              Registration Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. TN01AB1234"
              value={formData.registrationNumber}
              onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() })}
              className="w-full theme-input px-4 py-3 rounded-xl text-sm font-mono uppercase tracking-wider"
            />
          </div>

          {/* Manufacturer / Brand */}
          <div>
            <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1.5">
              Manufacturer / Brand <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Tata Motors, Mahindra, Hyundai"
              value={formData.manufacturer}
              onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
              className="w-full theme-input px-4 py-3 rounded-xl text-sm"
            />
          </div>

          {/* Model */}
          <div>
            <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1.5">
              Model <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Nexon EV Max, Ioniq 5"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className="w-full theme-input px-4 py-3 rounded-xl text-sm"
            />
          </div>

          {/* Vehicle Type */}
          <div>
            <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1.5">
              Vehicle Type
            </label>
            <select
              value={formData.vehicleType}
              onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
              className="w-full theme-input px-4 py-3 rounded-xl text-sm cursor-pointer"
            >
              <option value="Car">4-Wheeler (Passenger Car / SUV)</option>
              <option value="2W">2-Wheeler (Motorcycle / Scooter)</option>
              <option value="3W">3-Wheeler (Auto Rickshaw)</option>
              <option value="Commercial">Commercial / Fleet Truck</option>
            </select>
          </div>

          {/* Connector Type */}
          <div>
            <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1.5">
              Connector Standard <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.connectorType}
              onChange={(e) => setFormData({ ...formData, connectorType: e.target.value })}
              className="w-full theme-input px-4 py-3 rounded-xl text-sm font-semibold cursor-pointer"
            >
              {connectorTypes.map((c) => (
                <option key={c.id || c.connector_name} value={c.connector_name}>
                  {c.connector_name} {c.description ? `(${c.description})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Battery Capacity (kWh) */}
          <div>
            <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1.5">
              Battery Capacity (kWh) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="1"
                max="200"
                required
                value={formData.batteryCapacity}
                onChange={(e) => setFormData({ ...formData, batteryCapacity: e.target.value })}
                className="w-full theme-input px-4 py-3 rounded-xl text-sm font-mono pr-14"
              />
              <span className="absolute right-4 top-3 text-xs font-bold text-[var(--text-muted)]">kWh</span>
            </div>
          </div>

          {/* Max Charging Power (kW) */}
          <div>
            <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1.5">
              Maximum Charging Power (kW) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="3"
                max="350"
                required
                value={formData.maxChargingPowerKw}
                onChange={(e) => setFormData({ ...formData, maxChargingPowerKw: e.target.value })}
                className="w-full theme-input px-4 py-3 rounded-xl text-sm font-mono pr-14"
              />
              <span className="absolute right-4 top-3 text-xs font-bold text-[var(--text-muted)]">kW</span>
            </div>
          </div>

          {/* Current State of Charge (SOC %) */}
          <div className="md:col-span-2 space-y-2 bg-[var(--bg-card-subtle)] p-4 rounded-2xl border border-[var(--border-subtle)]">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold uppercase text-[var(--text-secondary)] flex items-center gap-1.5">
                <Battery size={14} className="text-emerald-500" /> Current Battery State of Charge (SOC)
              </span>
              <span className="font-mono font-extrabold text-sm text-emerald-500">
                {formData.currentSocPercent}%
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              value={formData.currentSocPercent}
              onChange={(e) => setFormData({ ...formData, currentSocPercent: parseInt(e.target.value, 10) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <p className="text-[11px] text-[var(--text-muted)]">
              This will be used as the default starting battery level when calculating charging times and slot requirements.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
          <Link
            to="/vehicles"
            className="px-5 py-3 rounded-xl theme-input text-xs font-bold hover:bg-[var(--border-subtle)] transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck size={16} />
            {loading ? "Saving Vehicle..." : "Save Vehicle to MySQL"}
          </button>
        </div>
      </form>

      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "success" })}
        />
      )}
    </div>
  );
}
