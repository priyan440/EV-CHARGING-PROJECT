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
  History,
  Calculator,
  Building2,
  Tag,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import {
  getOwnerTariffs,
  createOwnerTariff,
  updateOwnerTariff,
  deleteOwnerTariff,
  getOwnerStations,
  getTariffHistory,
  calculateTariffEstimate,
} from "../../services/ownerService";
import Pagination from "../../components/Pagination";

export default function OwnerTariffs() {
  const [tariffs, setTariffs] = useState([]);
  const [stations, setStations] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("tariffs"); // 'tariffs' | 'history' | 'calculator'
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTariff, setEditingTariff] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // Pagination for Tariffs
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(8);

  // Pagination for History
  const [histPage, setHistPage] = useState(1);
  const [histTotalPages, setHistTotalPages] = useState(1);
  const [histTotalItems, setHistTotalItems] = useState(0);

  // Price Calculator State
  const [calcStationId, setCalcStationId] = useState("");
  const [calcKwh, setCalcKwh] = useState(25);
  const [calcDuration, setCalcDuration] = useState(45);
  const [calcResult, setCalcResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const [formData, setFormData] = useState({
    stationId: "",
    chargerType: "ALL",
    baseRate: 18.0,
    peakRate: 22.0,
    offPeakRate: 14.0,
    connectionFee: 15.0,
    idleFee: 2.0,
    taxPercentage: 18.0,
    peakStart: "18:00",
    peakEnd: "22:00",
    changeReason: "Owner tariff adjustment",
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
      const rawTariffs = Array.isArray(trfData) ? trfData : trfData?.data || [];
      const rawStations = Array.isArray(stnData) ? stnData : stnData?.data || [];
      setTariffs(rawTariffs);
      setStations(rawStations);
      if (rawStations.length > 0 && !calcStationId) {
        setCalcStationId(rawStations[0].stationId || rawStations[0].id);
      }
    } catch (err) {
      console.error(err);
      showToast("Error loading tariffs from MySQL");
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await getTariffHistory("", { page: histPage, limit: 10 });
      setHistoryLogs(res.data || []);
      if (res.pagination) {
        setHistTotalPages(res.pagination.totalPages || 1);
        setHistTotalItems(res.pagination.totalItems || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab, histPage]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "baseRate" ||
        name === "peakRate" ||
        name === "offPeakRate" ||
        name === "connectionFee" ||
        name === "idleFee" ||
        name === "taxPercentage"
          ? Number(value)
          : value,
    }));
  };

  const handleSaveTariff = async (e) => {
    e.preventDefault();
    if (!formData.stationId) {
      showToast("Please select a target charging station.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingTariff) {
        await updateOwnerTariff(editingTariff.tariffId || editingTariff.id, formData);
        showToast(`Tariff ${editingTariff.tariffId || editingTariff.id} updated! Historical snapshot logged.`);
      } else {
        const res = await createOwnerTariff(formData);
        showToast(`New dynamic tariff configured! ID: ${res.data?.tariffId || res.data?.tariff_id || "TAR"}`);
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
    if (!window.confirm(`Are you sure you want to deactivate tariff plan ${tariffId}? Historical pricing records will remain preserved.`)) return;
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
      stationId: t.stationId || t.station_id || stations[0]?.id || "",
      chargerType: t.chargerType || "ALL",
      baseRate: t.baseRate || t.pricePerKwh || 18.0,
      peakRate: t.peakRate || 22.0,
      offPeakRate: t.offPeakRate || 14.0,
      connectionFee: t.connectionFee || 15.0,
      idleFee: t.idleFee || 2.0,
      taxPercentage: t.taxPercentage || 18.0,
      peakStart: t.peakStart || "18:00",
      peakEnd: t.peakEnd || "22:00",
      changeReason: "Owner price adjustment",
    });
    setShowAddModal(true);
  };

  const handleRunCalculator = async () => {
    if (!calcStationId) return;
    setCalcLoading(true);
    try {
      const res = await calculateTariffEstimate({
        stationId: calcStationId,
        kwh: calcKwh,
        durationMinutes: calcDuration,
      });
      setCalcResult(res);
    } catch (err) {
      showToast("Calculator error: " + err.message);
    } finally {
      setCalcLoading(false);
    }
  };

  // Pagination for Tariffs
  const totalItems = tariffs.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const safePage = Math.min(page, totalPages);
  const paginatedTariffs = tariffs.slice((safePage - 1) * limit, safePage * limit);

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
      <div className="p-6 md:p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              DYNAMIC TARIFF MANAGEMENT
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] flex items-center gap-3 font-mono">
            <DollarSign className="w-7 h-7 text-emerald-500" />
            Tariff & Dynamic Pricing
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Configure Time-of-Day (TOU) rates, peak/off-peak surcharges, connection fees, tax rates, and maintain historical pricing records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingTariff(null);
              setFormData({
                stationId: stations[0]?.stationId || stations[0]?.id || "",
                chargerType: "ALL",
                baseRate: 18.0,
                peakRate: 22.0,
                offPeakRate: 14.0,
                connectionFee: 15.0,
                idleFee: 2.0,
                taxPercentage: 18.0,
                peakStart: "18:00",
                peakEnd: "22:00",
                changeReason: "Initial station tariff setup",
              });
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] hover:opacity-90 text-white font-bold text-xs transition shadow-lg shadow-blue-500/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Tariff Plan
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab("tariffs")}
          className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === "tariffs"
              ? "bg-[var(--accent-primary)] text-white shadow-sm"
              : "bg-[var(--bg-surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <DollarSign size={14} /> Active Tariffs ({tariffs.length})
        </button>
        <button
          onClick={() => setActiveTab("calculator")}
          className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === "calculator"
              ? "bg-[var(--accent-primary)] text-white shadow-sm"
              : "bg-[var(--bg-surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Calculator size={14} /> Public Pricing Estimator
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === "history"
              ? "bg-[var(--accent-primary)] text-white shadow-sm"
              : "bg-[var(--bg-surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <History size={14} /> Tariff Change History
        </button>
      </div>

      {/* 1. ACTIVE TARIFFS GRID */}
      {activeTab === "tariffs" && (
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-16 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-subtle)]">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-[var(--text-muted)] font-mono">Loading tariffs from MySQL...</p>
            </div>
          ) : paginatedTariffs.length === 0 ? (
            <div className="text-center py-16 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-subtle)] space-y-3">
              <DollarSign className="w-12 h-12 text-[var(--text-muted)] mx-auto opacity-40" />
              <h3 className="text-base font-bold font-mono">No Tariffs Configured</h3>
              <p className="text-xs text-[var(--text-muted)]">Create your first dynamic pricing tariff plan for your charging hubs.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-[var(--accent-primary)] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                + Create Tariff
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {paginatedTariffs.map((t) => (
                  <div
                    key={t.tariffId || t.id}
                    className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-emerald-500/40 transition-all shadow-sm flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Header Badge */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                          {t.tariffId || t.tariff_id || `TAR000${t.id}`}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            t.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                        {t.stationName || "Station Charging Hub"}
                      </h3>
                      <div className="text-xs text-[var(--text-muted)] mb-4 flex items-center gap-1.5">
                        <Building2 size={13} />
                        <span>Mode: <strong className="text-[var(--text-primary)] font-mono">{t.chargerType || "All Chargers (AC & DC)"}</strong></span>
                      </div>

                      {/* Pricing Tier Pills */}
                      <div className="grid grid-cols-3 gap-2 bg-[var(--bg-surface-raised)] p-3 rounded-2xl border border-[var(--border-subtle)] mb-4 text-center">
                        <div>
                          <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase">BASE RATE</div>
                          <div className="text-base font-bold font-mono text-[var(--text-primary)] mt-0.5">
                            ₹{t.baseRate || t.pricePerKwh}/kWh
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] font-bold text-amber-500 uppercase">PEAK RATE</div>
                          <div className="text-base font-bold font-mono text-amber-500 mt-0.5">
                            ₹{t.peakRate}/kWh
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] font-bold text-sky-500 uppercase">OFF-PEAK</div>
                          <div className="text-base font-bold font-mono text-sky-500 mt-0.5">
                            ₹{t.offPeakRate}/kWh
                          </div>
                        </div>
                      </div>

                      {/* Fees & Time Window */}
                      <div className="space-y-2 text-xs text-[var(--text-muted)] bg-[var(--bg-surface-raised)] p-3 rounded-2xl border border-[var(--border-subtle)]">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> Peak Hours Window:
                          </span>
                          <strong className="text-[var(--text-primary)] font-mono">{t.peakStart || "18:00"} - {t.peakEnd || "22:00"}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Connection / Session Fee:</span>
                          <strong className="text-[var(--text-primary)] font-mono">₹{t.connectionFee || 15.0}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Idle / Overstay Fee:</span>
                          <strong className="text-[var(--text-primary)] font-mono">₹{t.idleFee || 2.0}/min</strong>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]">
                          <span>Applicable Tax (GST):</span>
                          <strong className="text-emerald-500 font-mono">{t.taxPercentage || 18.0}%</strong>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
                      <button
                        onClick={() => openEditModal(t)}
                        className="px-3 py-1.5 bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl text-xs font-bold border border-[var(--border-subtle)] flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Edit2 size={12} /> Edit Tariff
                      </button>
                      <button
                        onClick={() => handleDeactivateTariff(t.tariffId || t.id)}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition border border-rose-500/20 cursor-pointer"
                        title="Deactivate Tariff"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <Pagination
                page={safePage}
                totalPages={totalPages}
                totalItems={totalItems}
                limit={limit}
                onPageChange={(p) => setPage(p)}
                onLimitChange={(l) => {
                  setLimit(l);
                  setPage(1);
                }}
                limitOptions={[6, 8, 16, 32]}
              />
            </div>
          )}
        </div>
      )}

      {/* 2. PUBLIC PRICING ESTIMATOR TAB */}
      {activeTab === "calculator" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-4 shadow-sm">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 font-mono">
                <Calculator className="w-5 h-5 text-[var(--accent-primary)]" />
                Live Dynamic Pricing Simulator
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Simulate transparent driver checkout quotes based on station, requested energy (kWh), and time-of-day tariff rules.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Select Station</label>
                <select
                  value={calcStationId}
                  onChange={(e) => setCalcStationId(e.target.value)}
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] font-medium focus:outline-none"
                >
                  {stations.map((s) => (
                    <option key={s.stationId || s.id} value={s.stationId || s.id}>
                      {s.stationName || s.name} ({s.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">
                  Requested Energy: <strong className="text-[var(--text-primary)] font-mono">{calcKwh} kWh</strong>
                </label>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={1}
                  value={calcKwh}
                  onChange={(e) => setCalcKwh(Number(e.target.value))}
                  className="w-full cursor-pointer accent-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">
                  Duration: <strong className="text-[var(--text-primary)] font-mono">{calcDuration} Minutes</strong>
                </label>
                <input
                  type="range"
                  min={15}
                  max={180}
                  step={5}
                  value={calcDuration}
                  onChange={(e) => setCalcDuration(Number(e.target.value))}
                  className="w-full cursor-pointer accent-blue-500"
                />
              </div>

              <button
                onClick={handleRunCalculator}
                disabled={calcLoading}
                className="w-full py-2.5 bg-[var(--accent-primary)] hover:opacity-90 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition cursor-pointer"
              >
                {calcLoading ? "Calculating..." : "Calculate Price Breakdown"}
              </button>
            </div>
          </div>

          {/* Result Card */}
          <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-4 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider font-mono mb-3">
                Transparent Driver Bill Breakdown
              </h3>

              {!calcResult ? (
                <div className="text-center py-12 text-xs text-[var(--text-muted)]">
                  Click "Calculate Price Breakdown" to compute live itemized rates.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Applied Rate Tier:</span>
                      <strong className="text-amber-500 font-mono uppercase">{calcResult.pricingDetails?.rateType} TARIFF</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Energy Charge ({calcResult.breakdown?.requestedEnergyKwh} kWh @ ₹{calcResult.pricingDetails?.applicableRatePerKwh}/kWh):</span>
                      <strong className="font-mono text-[var(--text-primary)]">₹{calcResult.breakdown?.energyCharge}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Connection Fee:</span>
                      <strong className="font-mono text-[var(--text-primary)]">₹{calcResult.breakdown?.connectionFee}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Subtotal:</span>
                      <strong className="font-mono text-[var(--text-primary)]">₹{calcResult.breakdown?.subtotal}</strong>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-[var(--border-subtle)]">
                      <span className="text-[var(--text-muted)]">Tax / GST ({calcResult.pricingDetails?.taxPercentage}%):</span>
                      <strong className="font-mono text-emerald-500">+ ₹{calcResult.breakdown?.taxAmount}</strong>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Total Driver Payable</div>
                      <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        ₹{calcResult.breakdown?.totalEstimatedAmount}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 rounded-lg">
                      100% TRANSPARENT
                    </span>
                  </div>
                </div>
              )}
            </div>

            <p className="text-[11px] text-[var(--text-muted)] italic">
              * Complies with real-world EV charging tariff requirements. Rate snapshots are locked upon booking creation.
            </p>
          </div>
        </div>
      )}

      {/* 3. TARIFF HISTORY TAB */}
      {activeTab === "history" && (
        <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-4 shadow-sm">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 font-mono">
              <History className="w-5 h-5 text-[var(--accent-primary)]" />
              Immutable Tariff Change Audit Trail
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Historical prices are permanently preserved to prevent silent rate alterations on existing bookings.
            </p>
          </div>

          {historyLoading ? (
            <div className="text-center py-12">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-[var(--text-muted)] font-mono">Loading audit logs...</p>
            </div>
          ) : historyLogs.length === 0 ? (
            <div className="text-center py-12 text-xs text-[var(--text-muted)]">
              No historical tariff adjustments logged yet.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--bg-surface-raised)] text-[var(--text-muted)] uppercase font-bold border-b border-[var(--border-subtle)]">
                    <tr>
                      <th className="p-3">Log ID</th>
                      <th className="p-3">Station</th>
                      <th className="p-3">Base / Peak / Off-Peak</th>
                      <th className="p-3">Tax</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {historyLogs.map((h) => (
                      <tr key={h.id} className="hover:bg-[var(--bg-surface-raised)] transition">
                        <td className="p-3 font-mono font-bold text-[var(--accent-primary)]">{h.history_id || `H${h.id}`}</td>
                        <td className="p-3 font-bold text-[var(--text-primary)]">{h.station_name || `Station #${h.station_id}`}</td>
                        <td className="p-3 font-mono">
                          ₹{h.base_rate_per_kwh} / <span className="text-amber-500">₹{h.peak_rate_per_kwh}</span> / <span className="text-sky-500">₹{h.off_peak_rate_per_kwh}</span>
                        </td>
                        <td className="p-3 font-mono">{h.tax_percentage || 18}%</td>
                        <td className="p-3 text-[var(--text-muted)]">{h.change_reason || "Price adjustment"}</td>
                        <td className="p-3 font-mono text-[var(--text-muted)]">{new Date(h.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={histPage}
                totalPages={histTotalPages}
                totalItems={histTotalItems}
                limit={10}
                onPageChange={(p) => setHistPage(p)}
                showPageSize={false}
              />
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Tariff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl max-w-2xl w-full p-6 shadow-2xl animate-fade-in my-8 max-h-[90vh] overflow-y-auto custom-scrollbar text-[var(--text-primary)]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-5">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 font-mono">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                  {editingTariff ? `Edit Tariff Plan ${editingTariff.tariffId || editingTariff.id}` : "Configure Dynamic Tariff Plan (MySQL)"}
                </h2>
                <p className="text-[11px] text-[var(--text-muted)]">Set base, peak, off-peak rates, peak time window, and tax percentage.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTariff} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Target Station *</label>
                  <select
                    name="stationId"
                    value={formData.stationId}
                    onChange={handleInputChange}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] font-medium focus:outline-none"
                    required
                  >
                    <option value="">Select Station...</option>
                    {stations.map((s) => (
                      <option key={s.stationId || s.id} value={s.stationId || s.id}>
                        {s.stationName || s.name} ({s.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Applicable Charger Mode</label>
                  <select
                    name="chargerType"
                    value={formData.chargerType}
                    onChange={handleInputChange}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] font-medium focus:outline-none"
                  >
                    <option value="ALL">All Chargers (Universal)</option>
                    <option value="DC_FAST">DC Fast (CCS2 60kW - 150kW)</option>
                    <option value="AC">AC Type 2 (7.4kW - 22kW)</option>
                  </select>
                </div>
              </div>

              {/* Rates */}
              <div className="grid grid-cols-3 gap-3 bg-[var(--bg-surface-raised)] p-4 rounded-2xl border border-[var(--border-subtle)]">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">Base Rate (₹/kWh) *</label>
                  <input
                    type="number"
                    step="0.5"
                    name="baseRate"
                    value={formData.baseRate}
                    onChange={handleInputChange}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-amber-500 mb-1">Peak Rate (₹/kWh) *</label>
                  <input
                    type="number"
                    step="0.5"
                    name="peakRate"
                    value={formData.peakRate}
                    onChange={handleInputChange}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-sky-500 mb-1">Off-Peak (₹/kWh) *</label>
                  <input
                    type="number"
                    step="0.5"
                    name="offPeakRate"
                    value={formData.offPeakRate}
                    onChange={handleInputChange}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-mono font-bold text-sky-500"
                    required
                  />
                </div>
              </div>

              {/* Time Window */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Peak Start Time</label>
                  <input
                    type="text"
                    name="peakStart"
                    value={formData.peakStart}
                    onChange={handleInputChange}
                    placeholder="18:00"
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Peak End Time</label>
                  <input
                    type="text"
                    name="peakEnd"
                    value={formData.peakEnd}
                    onChange={handleInputChange}
                    placeholder="22:00"
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Conn. Fee (₹)</label>
                  <input
                    type="number"
                    step="1"
                    name="connectionFee"
                    value={formData.connectionFee}
                    onChange={handleInputChange}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Tax / GST (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    name="taxPercentage"
                    value={formData.taxPercentage}
                    onChange={handleInputChange}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Change Reason / Audit Note</label>
                <input
                  type="text"
                  name="changeReason"
                  value={formData.changeReason}
                  onChange={handleInputChange}
                  placeholder="e.g. Summer grid demand revision"
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2 text-xs"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)] mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] text-[var(--text-primary)] text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[var(--accent-primary)] hover:opacity-90 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Saving in MySQL..." : editingTariff ? "Update Tariff Plan" : "Save Tariff Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
