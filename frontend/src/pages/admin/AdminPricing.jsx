import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CreditCard,
  Zap,
  Percent,
  ShieldCheck,
  Save,
  RefreshCw,
  Sliders,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import Breadcrumbs from "../../components/Breadcrumbs";
import api from "../../services/api";
import Toast from "../../components/Toast";

export default function AdminPricing() {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });

  const [pricingConfig, setPricingConfig] = useState({
    baseTariffPerKwh: 18.00,
    peakTariffPerKwh: 22.00,
    offPeakTariffPerKwh: 14.00,
    platformServiceFee: 15.00,
    gstTaxRatePercent: 18,
    chargingEfficiencyPercent: 90,
  });

  useEffect(() => {
    // Fetch current system tariffs
    api.get("/tariffs")
      .then((res) => {
        if (res?.data?.data && res.data.data.length > 0) {
          const t = res.data.data[0];
          setPricingConfig((prev) => ({
            ...prev,
            baseTariffPerKwh: parseFloat(t.base_rate_per_kwh) || 18.0,
            peakTariffPerKwh: parseFloat(t.peak_rate_per_kwh) || 22.0,
            offPeakTariffPerKwh: parseFloat(t.off_peak_rate_per_kwh) || 14.0,
            platformServiceFee: parseFloat(t.connection_fee) || 15.0,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/tariffs", {
        base_rate_per_kwh: pricingConfig.baseTariffPerKwh,
        peak_rate_per_kwh: pricingConfig.peakTariffPerKwh,
        off_peak_rate_per_kwh: pricingConfig.offPeakTariffPerKwh,
        connection_fee: pricingConfig.platformServiceFee,
      });

      setToast({ message: "Pricing configuration updated successfully in MySQL!", type: "success" });
    } catch (err) {
      setToast({ message: err.message || "Failed to update pricing", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-16">
      <Breadcrumbs
        items={[
          { label: "Admin Dashboard", path: "/admin/dashboard" },
          { label: "Tariff & Pricing Management", path: "/admin/pricing" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
            <CreditCard className="text-emerald-500" /> Platform Pricing & Tariff Engine
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Configure system-wide tariffs per kWh, platform convenience fees, GST rates, and model efficiency.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="theme-card p-6 sm:p-8 rounded-3xl space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Base Tariff per kWh */}
          <div>
            <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1.5">
              Standard Base Tariff (₹ / kWh)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="5"
                max="100"
                required
                value={pricingConfig.baseTariffPerKwh}
                onChange={(e) => setPricingConfig({ ...pricingConfig, baseTariffPerKwh: parseFloat(e.target.value) })}
                className="w-full theme-input px-4 py-3 rounded-xl text-sm font-mono pr-14"
              />
              <span className="absolute right-4 top-3 text-xs font-bold text-[var(--text-muted)]">₹/kWh</span>
            </div>
          </div>

          {/* Peak Tariff per kWh */}
          <div>
            <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1.5">
              Peak Surge Tariff (18:00 - 22:00)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="5"
                max="100"
                required
                value={pricingConfig.peakTariffPerKwh}
                onChange={(e) => setPricingConfig({ ...pricingConfig, peakTariffPerKwh: parseFloat(e.target.value) })}
                className="w-full theme-input px-4 py-3 rounded-xl text-sm font-mono pr-14"
              />
              <span className="absolute right-4 top-3 text-xs font-bold text-[var(--text-muted)]">₹/kWh</span>
            </div>
          </div>

          {/* Off-Peak Tariff */}
          <div>
            <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1.5">
              Off-Peak Saver Tariff (22:00 - 06:00)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="5"
                max="100"
                required
                value={pricingConfig.offPeakTariffPerKwh}
                onChange={(e) => setPricingConfig({ ...pricingConfig, offPeakTariffPerKwh: parseFloat(e.target.value) })}
                className="w-full theme-input px-4 py-3 rounded-xl text-sm font-mono pr-14"
              />
              <span className="absolute right-4 top-3 text-xs font-bold text-[var(--text-muted)]">₹/kWh</span>
            </div>
          </div>

          {/* Service Fee */}
          <div>
            <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1.5">
              Platform Service / Connection Fee
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="0"
                max="200"
                required
                value={pricingConfig.platformServiceFee}
                onChange={(e) => setPricingConfig({ ...pricingConfig, platformServiceFee: parseFloat(e.target.value) })}
                className="w-full theme-input px-4 py-3 rounded-xl text-sm font-mono pr-14"
              />
              <span className="absolute right-4 top-3 text-xs font-bold text-[var(--text-muted)]">₹ Fixed</span>
            </div>
          </div>

          {/* Tax Rate (GST %) */}
          <div>
            <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1.5">
              Applicable Tax Rate (GST %)
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="0"
                max="28"
                required
                value={pricingConfig.gstTaxRatePercent}
                onChange={(e) => setPricingConfig({ ...pricingConfig, gstTaxRatePercent: parseInt(e.target.value, 10) })}
                className="w-full theme-input px-4 py-3 rounded-xl text-sm font-mono pr-14"
              />
              <span className="absolute right-4 top-3 text-xs font-bold text-[var(--text-muted)]">%</span>
            </div>
          </div>

          {/* Efficiency % */}
          <div>
            <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1.5">
              Model Charging Efficiency (%)
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="70"
                max="99"
                required
                value={pricingConfig.chargingEfficiencyPercent}
                onChange={(e) => setPricingConfig({ ...pricingConfig, chargingEfficiencyPercent: parseInt(e.target.value, 10) })}
                className="w-full theme-input px-4 py-3 rounded-xl text-sm font-mono pr-14"
              />
              <span className="absolute right-4 top-3 text-xs font-bold text-[var(--text-muted)]">%</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-[var(--border-subtle)]">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save size={16} />
            <span>{loading ? "Saving Pricing Changes..." : "Save Pricing Configuration"}</span>
          </button>
        </div>
      </form>

      {toast.message && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />
      )}
    </div>
  );
}
