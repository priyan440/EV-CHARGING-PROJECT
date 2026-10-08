import React, { useState, useEffect } from "react";
import {
  DollarSign,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Sliders,
  Zap,
  Edit2,
  Save,
  Power,
  Trash2,
  X,
} from "lucide-react";
import {
  getOwnerTariffs,
  createOwnerTariff,
  updateOwnerTariff,
  deleteOwnerTariff,
  getOwnerStations,
} from "../../services/ownerService";

export default function OwnerTariffs() {
  const [tariffs, setTariffs] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTariff, setEditingTariff] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const [formData, setFormData] = useState({
    name: "Standard Dynamic Power Tariff",
    stationId: "ALL",
    chargerType: "DC Fast",
    pricePerKwh: 16.5,
    pricePerMinute: 0.0,
    connectionFee: 15.0,
    idleFee: 2.0,
    peakPrice: 19.5,
    offPeakPrice: 14.0,
    peakStart: "18:00",
    peakEnd: "22:00",
    taxPercent: 18,
    active: true,
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [trfData, stnData] = await Promise.all([
        getOwnerTariffs(),
        getOwnerStations(),
      ]);
      setTariffs(trfData);
      setStations(stnData);
    } catch (err) {
      console.error(err);
      showToast("Error loading tariffs from MySQL");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSaveTariff = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingTariff) {
        await updateOwnerTariff(editingTariff.tariffId || editingTariff.tariff_id, formData);
        showToast(`Tariff ${editingTariff.tariffId || editingTariff.tariff_id} updated successfully.`);
      } else {
        const res = await createOwnerTariff(formData);
        showToast(`New tariff created in MySQL! ID: ${res.data?.tariffId || res.data?.tariff_id || "TRF"}`);
      }
      setShowAddModal(false);
      setEditingTariff(null);
      loadData();
    } catch (err) {
      showToast("Error saving tariff: " + (err.message || "Failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateTariff = async (tariffId) => {
    if (!window.confirm(`Are you sure you want to deactivate tariff plan ${tariffId}? Past session billing will remain intact.`)) return;
    try {
      await deleteOwnerTariff(tariffId);
      showToast(`Tariff ${tariffId} deactivated successfully.`);
      loadData();
    } catch (err) {
      showToast("Error deactivating tariff: " + (err.message || "Failed"));
    }
  };

  const openEditModal = (t) => {
    setEditingTariff(t);
    setFormData({
      name: t.name || "Dynamic Tariff",
      stationId: t.stationId || "ALL",
      chargerType: t.chargerType || "DC Fast",
      pricePerKwh: t.pricePerKwh || 16.5,
      pricePerMinute: t.pricePerMinute || 0,
      connectionFee: t.connectionFee || 15,
      idleFee: t.idleFee || 2,
      peakPrice: t.peakPrice || 19.5,
      offPeakPrice: t.offPeakPrice || 14,
      peakStart: t.peakStart || "18:00",
      peakEnd: t.peakEnd || "22:00",
      taxPercent: t.taxPercent || 18,
      active: t.active !== false,
    });
    setShowAddModal(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in font-sans text-[var(--text-primary)]">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-[var(--accent-primary)] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-blue-400/30 animate-fade-in font-bold text-xs">
          <Sparkles className="w-4 h-4 text-yellow-300" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="theme-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-3 font-mono">
            <DollarSign className="w-7 h-7 text-amber-500" />
            Tariff & Dynamic Pricing Rules
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Configure per kWh rates, peak vs off-peak hours, idle fees, and automated session billing.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingTariff(null);
            setFormData({
              name: "Custom Dynamic Tariff",
              stationId: "ALL",
              chargerType: "DC Fast",
              pricePerKwh: 17.0,
              pricePerMinute: 0.0,
              connectionFee: 15.0,
              idleFee: 2.0,
              peakPrice: 20.0,
              offPeakPrice: 14.5,
              peakStart: "18:00",
              peakEnd: "22:00",
              taxPercent: 18,
              active: true,
            });
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Tariff Plan
        </button>
      </div>

      {/* Tariffs List */}
      {loading ? (
        <div className="text-center py-16 theme-card">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-[var(--text-muted)] text-xs font-mono animate-pulse">Loading tariffs from MySQL...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tariffs.map((t) => (
            <div
              key={t.tariffId || t.tariff_id || t.id || t._id}
              className="theme-card p-6 hover:border-amber-500/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400 px-2.5 py-0.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    {t.tariffId || t.tariff_id}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                      t.active !== false
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-[var(--bg-surface-raised)] text-[var(--text-muted)]"
                    }`}
                  >
                    {t.active !== false ? "Active Rule" : "Inactive"}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">{t.name || t.tariffName || t.tariff_name || "Standard EV Tariff"}</h3>
                <div className="text-xs text-[var(--text-muted)] mb-4">
                  Applies to: <strong className="text-[var(--text-primary)]">{t.stationId === "ALL" || t.station_id === "ALL" ? "All Network Stations" : (t.stationId || t.station_id)}</strong>
                </div>

                {/* Rate Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[var(--bg-surface-raised)] p-3 rounded-2xl mb-4 text-center text-xs border border-[var(--border-subtle)]">
                  <div>
                    <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Base Rate</div>
                    <div className="font-bold text-[var(--text-primary)] font-mono text-sm">₹{t.pricePerKwh || t.baseRate || t.rate_per_kwh || 18}/kWh</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Peak Rate</div>
                    <div className="font-bold text-amber-600 dark:text-amber-400 font-mono text-sm">₹{t.peakPrice || t.peakRate || t.peak_rate || t.pricePerKwh || 22}/kWh</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Off-Peak</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">₹{t.offPeakPrice || t.offPeakRate || t.off_peak_rate || 14}/kWh</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Connection Fee</div>
                    <div className="font-bold text-sky-600 dark:text-sky-400 font-mono text-sm">₹{t.connectionFee || t.baseFee || t.base_fee || 15}</div>
                  </div>
                </div>

                <div className="text-xs text-[var(--text-muted)] space-y-1.5 p-3 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-2xl mb-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      Peak Window:
                    </span>
                    <strong className="text-[var(--text-primary)] font-mono">{t.peakStart || t.peak_start || "18:00"} - {t.peakEnd || t.peak_end || "22:00"}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Idle Fee (after 100% full):</span>
                    <strong className="text-[var(--text-primary)] font-mono">₹{t.idleFee || t.idle_fee || 2}/min</strong>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
                <button
                  onClick={() => openEditModal(t)}
                  className="px-3 py-1.5 bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-[var(--border-subtle)] cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Plan
                </button>
                {t.active !== false && (
                  <button
                    onClick={() => handleDeactivateTariff(t.tariffId || t.tariff_id || t.id)}
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition border border-rose-500/20 cursor-pointer"
                    title="Deactivate Tariff Plan"
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Tariff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-fade-in my-8 text-[var(--text-primary)]">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] mb-4">
              <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 font-mono">
                <DollarSign className="w-5 h-5 text-amber-500" />
                {editingTariff ? `Edit Tariff ${editingTariff.tariffId}` : "Configure New Tariff Plan"}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTariff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Plan Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Target Station</label>
                  <select
                    name="stationId"
                    value={formData.stationId}
                    onChange={handleInputChange}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] font-bold focus:outline-none"
                  >
                    <option value="ALL">All Stations</option>
                    {stations.map((st) => (
                      <option key={st.stationId || st.id} value={st.stationId || st.id}>
                        {st.stationId || st.id} - {st.stationName || st.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Base Rate / kWh (₹) *</label>
                  <input
                    type="number"
                    step="0.1"
                    name="pricePerKwh"
                    value={formData.pricePerKwh}
                    onChange={handleInputChange}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] font-mono font-bold focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Peak Rate / kWh (₹)</label>
                  <input
                    type="number"
                    step="0.1"
                    name="peakPrice"
                    value={formData.peakPrice}
                    onChange={handleInputChange}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] font-mono font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Off-Peak Rate / kWh (₹)</label>
                  <input
                    type="number"
                    step="0.1"
                    name="offPeakPrice"
                    value={formData.offPeakPrice}
                    onChange={handleInputChange}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] font-mono font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Peak Start (Time)</label>
                  <input
                    type="text"
                    name="peakStart"
                    value={formData.peakStart}
                    onChange={handleInputChange}
                    placeholder="18:00"
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Peak End (Time)</label>
                  <input
                    type="text"
                    name="peakEnd"
                    value={formData.peakEnd}
                    onChange={handleInputChange}
                    placeholder="22:00"
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Connection Fee (₹)</label>
                  <input
                    type="number"
                    name="connectionFee"
                    value={formData.connectionFee}
                    onChange={handleInputChange}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] font-mono font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Idle Fee (₹/min)</label>
                  <input
                    type="number"
                    name="idleFee"
                    value={formData.idleFee}
                    onChange={handleInputChange}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activeCheck"
                  name="active"
                  checked={formData.active}
                  onChange={handleInputChange}
                  className="rounded text-amber-500 cursor-pointer"
                />
                <label htmlFor="activeCheck" className="text-xs text-[var(--text-muted)] font-bold cursor-pointer">
                  Activate this tariff plan immediately across referenced stations
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)] mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] text-[var(--text-primary)] text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Saving to MySQL..." : editingTariff ? "Save Changes" : "Create Tariff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
