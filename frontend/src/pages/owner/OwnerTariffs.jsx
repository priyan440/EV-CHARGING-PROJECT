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
  X,
} from "lucide-react";
import {
  getOwnerTariffs,
  createOwnerTariff,
  updateOwnerTariff,
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in text-slate-100">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-blue-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-blue-400/30 animate-bounce">
          <Sparkles className="w-5 h-5 text-yellow-300" />
          <span className="text-sm font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <DollarSign className="w-7 h-7 text-yellow-400" />
            Tariff & Dynamic Pricing Rules
          </h1>
          <p className="text-xs text-slate-400 mt-1">
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
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-yellow-500/25 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Create Tariff Plan
        </button>
      </div>

      {/* Tariffs List */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-400 text-sm animate-pulse">Loading tariffs from MySQL...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tariffs.map((t) => (
            <div
              key={t.tariffId || t.tariff_id || t.id || t._id}
              className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 hover:border-yellow-500/40 transition-all flex flex-col justify-between shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="font-mono font-bold text-yellow-400 px-2.5 py-0.5 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    {t.tariffId || t.tariff_id}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                      t.active !== false
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {t.active !== false ? "Active Rule" : "Inactive"}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-1">{t.name || t.tariffName || t.tariff_name || "Standard EV Tariff"}</h3>
                <div className="text-xs text-slate-400 mb-4">
                  Applies to: <strong className="text-slate-200">{t.stationId === "ALL" || t.station_id === "ALL" ? "All Network Stations" : (t.stationId || t.station_id)}</strong>
                </div>

                {/* Rate Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-800/60 p-3 rounded-2xl mb-4 text-center text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Base Rate</div>
                    <div className="font-bold text-white text-base">₹{t.pricePerKwh || t.baseRate || t.rate_per_kwh || 18}/kWh</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Peak Rate</div>
                    <div className="font-bold text-amber-400 text-base">₹{t.peakPrice || t.peakRate || t.peak_rate || t.pricePerKwh || 22}/kWh</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Off-Peak</div>
                    <div className="font-bold text-emerald-400 text-base">₹{t.offPeakPrice || t.offPeakRate || t.off_peak_rate || 14}/kWh</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Connection Fee</div>
                    <div className="font-bold text-sky-400 text-base">₹{t.connectionFee || t.baseFee || t.base_fee || 15}</div>
                  </div>
                </div>

                <div className="text-xs text-slate-400 space-y-1.5 p-3 bg-slate-800/30 rounded-2xl mb-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      Peak Window:
                    </span>
                    <strong className="text-slate-200">{t.peakStart || t.peak_start || "18:00"} - {t.peakEnd || t.peak_end || "22:00"}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Idle Fee (after 100% full):</span>
                    <strong className="text-slate-200">₹{t.idleFee || t.idle_fee || 2}/min</strong>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end">
                <button
                  onClick={() => openEditModal(t)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Plan
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Tariff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-scale-in my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-yellow-400" />
                {editingTariff ? `Edit Tariff ${editingTariff.tariffId}` : "Configure New Tariff Plan"}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTariff} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Plan Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Station</label>
                  <select
                    name="stationId"
                    value={formData.stationId}
                    onChange={handleInputChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
                  >
                    <option value="ALL">All Stations</option>
                    {stations.map((st) => (
                      <option key={st.stationId} value={st.stationId}>
                        {st.stationId} - {st.stationName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Base Rate / kWh (₹) *</label>
                  <input
                    type="number"
                    step="0.1"
                    name="pricePerKwh"
                    value={formData.pricePerKwh}
                    onChange={handleInputChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Peak Rate / kWh (₹)</label>
                  <input
                    type="number"
                    step="0.1"
                    name="peakPrice"
                    value={formData.peakPrice}
                    onChange={handleInputChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Off-Peak Rate / kWh (₹)</label>
                  <input
                    type="number"
                    step="0.1"
                    name="offPeakPrice"
                    value={formData.offPeakPrice}
                    onChange={handleInputChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Peak Start (Time)</label>
                  <input
                    type="text"
                    name="peakStart"
                    value={formData.peakStart}
                    onChange={handleInputChange}
                    placeholder="18:00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Peak End (Time)</label>
                  <input
                    type="text"
                    name="peakEnd"
                    value={formData.peakEnd}
                    onChange={handleInputChange}
                    placeholder="22:00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Connection Fee (₹)</label>
                  <input
                    type="number"
                    name="connectionFee"
                    value={formData.connectionFee}
                    onChange={handleInputChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Idle Fee (₹/min)</label>
                  <input
                    type="number"
                    name="idleFee"
                    value={formData.idleFee}
                    onChange={handleInputChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
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
                  className="rounded text-yellow-500"
                />
                <label htmlFor="activeCheck" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  Activate this tariff plan immediately across referenced stations
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-sm font-bold shadow-lg shadow-yellow-500/25 transition-all active:scale-95 disabled:opacity-50"
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
