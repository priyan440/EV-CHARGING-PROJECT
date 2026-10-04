import { useState, useEffect } from "react";
import { BatteryCharging, X, AlertCircle, Sparkles, Check, Clock } from "lucide-react";
import { vehicleService } from "../services/vehicleService";

export default function UpdateBatteryModal({ isOpen, onClose, vehicle, onSuccess }) {
  const [socInput, setSocInput] = useState(75);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (vehicle) {
      const initialSoc = vehicle.current_soc_percent !== undefined && vehicle.current_soc_percent !== null
        ? Number(vehicle.current_soc_percent)
        : (vehicle.batteryPercentage !== undefined ? Number(vehicle.batteryPercentage) : 75);
      setSocInput(isNaN(initialSoc) ? 75 : Math.min(100, Math.max(0, initialSoc)));
      setError("");
      setSuccessMsg("");
    }
  }, [vehicle, isOpen]);

  if (!isOpen || !vehicle) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const num = parseFloat(socInput);
    if (isNaN(num) || num < 0 || num > 100) {
      setError("Please enter a valid battery percentage between 0% and 100%.");
      return;
    }

    setLoading(true);
    try {
      const res = await vehicleService.updateBatteryLevel(vehicle.id || vehicle.vehicleId, num);
      setSuccessMsg("Battery level updated successfully!");
      if (onSuccess) {
        onSuccess(res?.data || res?.vehicle || { ...vehicle, current_soc_percent: num, batteryPercentage: num, soc_updated_at: new Date().toISOString() });
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setError(err.message || "Failed to update battery level.");
    } finally {
      setLoading(false);
    }
  };

  const vehName = `${vehicle.brand || vehicle.manufacturer || "EV"} ${vehicle.model || ""}`.trim();
  const regNo = vehicle.registrationNumber || vehicle.registration_number || vehicle.vehicleNumber || vehicle.vehicle_number || "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="theme-card max-w-md w-full p-6 md:p-7 rounded-3xl border border-[var(--border-subtle)] shadow-2xl space-y-5 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <BatteryCharging size={22} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                Update Battery Level
              </h3>
              <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                Latest Known Reading
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)] transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Vehicle Details Card */}
        <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex items-center justify-between text-xs">
          <div>
            <span className="font-extrabold text-[var(--text-primary)] block text-sm">{vehName}</span>
            <span className="font-mono text-[10px] text-[var(--text-secondary)]">{regNo}</span>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            {vehicle.batteryCapacity || vehicle.battery_capacity || 40.5} kWh
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--text-secondary)] font-mono uppercase">
                Current Known Battery Level:
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  required
                  value={socInput}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setSocInput(isNaN(v) ? 0 : Math.min(100, Math.max(0, v)));
                  }}
                  className="w-16 p-2 text-center font-mono font-black text-base rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-amber-500 focus:outline-none focus:border-amber-500"
                />
                <span className="font-mono font-bold text-sm text-[var(--text-secondary)]">%</span>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="0"
              max="100"
              value={socInput}
              onChange={(e) => setSocInput(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-[var(--bg-surface)] rounded-lg"
            />
            <div className="flex justify-between text-[10px] font-mono text-[var(--text-muted)]">
              <span>0% (Empty)</span>
              <span>50%</span>
              <span>100% (Full)</span>
            </div>
          </div>

          {/* Telemetry Disclaimer Notice */}
          <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-[11px] text-[var(--text-secondary)] leading-relaxed">
            <strong>Note:</strong> Battery level is based on your latest user update or completed charging session. Live vehicle telemetry is not connected.
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
              <Check size={14} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? "Updating..." : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
