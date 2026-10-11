import React, { useState, useEffect } from "react";
import {
  Sliders,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Building2,
  Cpu,
  Save,
  DollarSign,
  TrendingUp,
  Activity,
  BarChart3,
  History,
  Lock,
  ArrowUpRight,
  Info,
  Radio,
  Clock,
} from "lucide-react";
import {
  getOwnerStations,
  getStationEnergyConfig,
  updateStationEnergyConfig,
  getStationEnergyDashboard,
  smartAllocatePower,
  recordEnergyTelemetry,
  getStationEnergyHistory,
} from "../../services/ownerService";
import { getSocket } from "../../services/socketService";
import Pagination from "../../components/Pagination";

export default function OwnerSmartLoad() {
  const [stations, setStations] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState("");
  const [dashboardData, setDashboardData] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard"); // 'dashboard' | 'config' | 'history'

  // Pagination for telemetry / allocation history
  const [histPage, setHistPage] = useState(1);
  const [histTotalPages, setHistTotalPages] = useState(1);
  const [histTotalItems, setHistTotalItems] = useState(0);

  // Editable config state
  const [configForm, setConfigForm] = useState({
    sitePowerLimitKw: 250,
    otherBuildingLoadKw: 30,
    safetyReserveKw: 20,
    controlMode: "MONITOR",
    gridCostPerKwh: 8.5,
    demandChargePerKw: 250.0,
    overloadThresholdPct: 90,
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const stns = await getOwnerStations();
      const rawStations = Array.isArray(stns) ? stns : stns?.data || [];
      setStations(rawStations);

      const targetStn = selectedStationId || rawStations[0]?.stationId || rawStations[0]?.id;
      if (!selectedStationId && targetStn) {
        setSelectedStationId(targetStn);
      }

      if (targetStn) {
        const [dashRes, cfgRes] = await Promise.all([
          getStationEnergyDashboard(targetStn),
          getStationEnergyConfig(targetStn),
        ]);

        setDashboardData(dashRes.data || dashRes);
        if (cfgRes?.data || cfgRes) {
          const cfg = cfgRes.data || cfgRes;
          setConfigForm({
            sitePowerLimitKw: cfg.sitePowerLimitKw || 250,
            otherBuildingLoadKw: cfg.otherBuildingLoadKw || 30,
            safetyReserveKw: cfg.safetyReserveKw || 20,
            controlMode: cfg.controlMode || "MONITOR",
            gridCostPerKwh: cfg.gridCostPerKwh || 8.5,
            demandChargePerKw: cfg.demandChargePerKw || 250.0,
            overloadThresholdPct: cfg.overloadThresholdPct || 90,
          });
        }
      }
    } catch (err) {
      console.error("loadData error:", err);
      showToast("Error loading energy management profile.");
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryLogs = async () => {
    if (!selectedStationId) return;
    try {
      const res = await getStationEnergyHistory(selectedStationId, { page: histPage, limit: 10 });
      setHistoryList(res.data || []);
      if (res.pagination) {
        setHistTotalPages(res.pagination.totalPages || 1);
        setHistTotalItems(res.pagination.totalItems || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedStationId]);

  useEffect(() => {
    if (activeTab === "history") {
      loadHistoryLogs();
    }
  }, [activeTab, selectedStationId, histPage]);

  // Socket listener for live telemetry updates
  useEffect(() => {
    const socket = getSocket?.();
    if (socket) {
      socket.on("telemetry_updated", () => {
        if (selectedStationId) {
          getStationEnergyDashboard(selectedStationId).then((res) => {
            setDashboardData(res.data || res);
          }).catch(() => {});
        }
      });
      return () => socket.off("telemetry_updated");
    }
  }, [selectedStationId]);

  const handleRunSmartAllocation = async () => {
    setAllocating(true);
    try {
      const res = await smartAllocatePower(selectedStationId);
      showToast(res.message || "Power allocation recalculated safely without exceeding site limits.");
      const updated = await getStationEnergyDashboard(selectedStationId);
      setDashboardData(updated.data || updated);
    } catch (err) {
      showToast("Allocation failed: " + err.message);
    } finally {
      setAllocating(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await updateStationEnergyConfig(selectedStationId, configForm);
      showToast("Energy electrical configuration updated in MySQL!");
      loadData();
    } catch (err) {
      showToast("Error saving config: " + err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  const d = dashboardData || {};
  const cfg = d.config || configForm;
  const load = d.currentLoad || {};
  const energy = d.energyAndCosts || {};
  const chargers = Array.isArray(d.chargers) ? d.chargers : [];

  const siteLimit = cfg.sitePowerLimitKw || 250;
  const buildingLoad = cfg.otherBuildingLoadKw || 30;
  const safetyReserve = cfg.safetyReserveKw || 20;
  const availableCapacity = Math.max(0, siteLimit - buildingLoad - safetyReserve);
  const totalAllocated = load.totalAllocatedPowerKw || 0;
  const totalRequested = load.totalRequestedPowerKw || 0;
  const currentTotalSiteLoad = buildingLoad + totalAllocated;
  const utilizationPct = siteLimit > 0 ? ((currentTotalSiteLoad / siteLimit) * 100).toFixed(1) : 0;
  const isOverloaded = parseFloat(utilizationPct) >= (cfg.overloadThresholdPct || 90);

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
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
              SMART LOAD & ENERGY MANAGEMENT
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/10 text-amber-500 border border-amber-500/20">
              {cfg.controlMode === "SMART_CONTROL" ? "MODE: SMART_CONTROL (ACTIVE)" : "MODE: MONITOR (SAFE FALLBACK)"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] flex items-center gap-3 font-mono">
            <Zap className="w-7 h-7 text-cyan-500" />
            Energy Cost & Smart Load Management
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Dynamic transformer load balancing, peak demand clipping, grid tariff reconciliation, and multi-bay charging distribution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedStationId}
            onChange={(e) => setSelectedStationId(e.target.value)}
            className="bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none font-bold cursor-pointer"
          >
            {stations.map((st) => (
              <option key={st.stationId || st.id} value={st.stationId || st.id}>
                {st.stationId || st.id} - {st.stationName || st.name}
              </option>
            ))}
          </select>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl border border-[var(--border-subtle)] transition cursor-pointer"
            title="Refresh Energy Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[var(--accent-primary)]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Verified Telemetry Notice Banner */}
      <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between text-xs text-[var(--text-primary)]">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
          <span>
            <strong>Simulation & Telemetry Status:</strong> Telemetry readings are recorded and calculated in MySQL. Available capacity is strictly constrained by site power limits.
          </span>
        </div>
        <button
          onClick={handleRunSmartAllocation}
          disabled={allocating}
          className="px-3 py-1.5 bg-[var(--accent-primary)] hover:opacity-90 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 transition cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <Sliders size={12} />
          {allocating ? "Balancing Load..." : "Trigger Smart Load Allocation"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === "dashboard"
              ? "bg-[var(--accent-primary)] text-white shadow-sm"
              : "bg-[var(--bg-surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Activity size={14} /> Live Energy Dashboard
        </button>
        <button
          onClick={() => setActiveTab("config")}
          className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === "config"
              ? "bg-[var(--accent-primary)] text-white shadow-sm"
              : "bg-[var(--bg-surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Sliders size={14} /> Electrical & Tariff Settings
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === "history"
              ? "bg-[var(--accent-primary)] text-white shadow-sm"
              : "bg-[var(--bg-surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <History size={14} /> Load Allocation History Logs
        </button>
      </div>

      {/* 1. LIVE DASHBOARD TAB */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Formula Callout Banner */}
          <div className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] font-mono">
                Standard Available Capacity Formula
              </div>
              <div className="text-sm font-bold font-mono text-[var(--text-primary)]">
                Available Capacity = MAX(0, Site Limit [{siteLimit}kW] - Building Load [{buildingLoad}kW] - Reserve [{safetyReserve}kW]) ={" "}
                <span className="text-emerald-500">{availableCapacity} kW</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-[var(--text-muted)]">Mode:</span>
              <span className="font-mono font-bold px-2 py-1 bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 rounded-lg">
                {cfg.controlMode || "MONITOR"}
              </span>
            </div>
          </div>

          {/* KPI Gauges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm">
              <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Site Power Limit</div>
              <div className="text-2xl font-black font-mono text-[var(--text-primary)] mt-1">
                {siteLimit} <span className="text-sm font-bold text-cyan-500">kW</span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-1">Contracted Transformer Capacity</div>
            </div>

            <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm">
              <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Active Charging Load</div>
              <div className="text-2xl font-black font-mono text-amber-500 mt-1">
                {totalAllocated} <span className="text-sm font-bold text-amber-500">kW</span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                Requested: {totalRequested} kW across bays
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm">
              <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Available Charging Headroom</div>
              <div className="text-2xl font-black font-mono text-emerald-500 mt-1">
                {Math.max(0, availableCapacity - totalAllocated)} <span className="text-sm font-bold text-emerald-500">kW</span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                Total available capacity: {availableCapacity} kW
              </div>
            </div>

            <div className={`p-5 rounded-3xl bg-[var(--bg-surface)] border shadow-sm ${isOverloaded ? "border-rose-500 ring-2 ring-rose-500/20" : "border-[var(--border-subtle)]"}`}>
              <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Site Load Utilization</div>
              <div className={`text-2xl font-black font-mono mt-1 ${isOverloaded ? "text-rose-500" : "text-[var(--text-primary)]"}`}>
                {utilizationPct}%
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                {isOverloaded ? "⚠️ Warning: Near site power threshold!" : "Optimal grid operating range"}
              </div>
            </div>
          </div>

          {/* Energy Consumed & Financial Margin Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Energy Consumption & Grid Bill */}
            <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 font-mono">
                  <BarChart3 className="w-4 h-4 text-[var(--accent-primary)]" />
                  Energy Dispensed & Estimated Grid Costs
                </h3>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-blue-500/10 text-[var(--accent-primary)]">
                  TARIFF: ₹{cfg.gridCostPerKwh || 8.5}/kWh
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Today's Energy Dispensed</div>
                  <div className="text-xl font-bold font-mono text-[var(--text-primary)] mt-1">
                    {energy.todayEnergyKwh || 0} <span className="text-xs">kWh</span>
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-1">
                    Est. Grid Cost: <strong>₹{energy.estimatedDailyEnergyCost || 0}</strong>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">30-Day Energy Dispensed</div>
                  <div className="text-xl font-bold font-mono text-[var(--text-primary)] mt-1">
                    {energy.monthlyEnergyKwh || 0} <span className="text-xs">kWh</span>
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-1">
                    Est. 30-Day Grid Cost: <strong>₹{energy.estimatedMonthlyEnergyCost || 0}</strong>
                  </div>
                </div>
              </div>

              {/* Progress bar of Site Utilization */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>Current Site Total Power: {currentTotalSiteLoad} kW</span>
                  <span className={isOverloaded ? "text-rose-500" : "text-emerald-500"}>{utilizationPct}% of {siteLimit}kW</span>
                </div>
                <div className="h-3 w-full bg-[var(--bg-surface-raised)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      isOverloaded ? "bg-rose-500" : "bg-gradient-to-r from-emerald-500 via-blue-500 to-cyan-400"
                    }`}
                    style={{ width: `${Math.min(100, utilizationPct)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Revenue, Grid Cost & Net Operating Margin */}
            <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-4 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 font-mono">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Estimated Revenue & Net Energy Margin
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  Reconciled from successful customer session payments minus wholesale grid power supply costs.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Today's Revenue</div>
                  <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    ₹{energy.todayRevenue || 0}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-1">
                    Net Margin: <strong className="text-emerald-500 font-mono">₹{energy.dailyNetMargin || 0}</strong>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                  <div className="text-[10px] font-bold uppercase text-[var(--accent-primary)]">30-Day Total Revenue</div>
                  <div className="text-xl font-bold font-mono text-[var(--accent-primary)] mt-1">
                    ₹{energy.monthlyRevenue || 0}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-1">
                    Net Margin: <strong className="text-emerald-500 font-mono">₹{energy.monthlyNetMargin || 0}</strong>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] flex items-center justify-between">
                <span>Wholesale Grid Tariff Basis:</span>
                <strong className="text-[var(--text-primary)] font-mono">₹{cfg.gridCostPerKwh || 8.50} / kWh</strong>
              </div>
            </div>
          </div>

          {/* Per-Charger Requested & Allocated Power Table */}
          <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 font-mono">
                  <Cpu className="w-4 h-4 text-cyan-500" />
                  Per-Charger Bay Power Allocations & Telemetry
                </h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Smart load controller continuously throttles and distributes available power across active bays.
                </p>
              </div>
              <button
                onClick={handleRunSmartAllocation}
                disabled={allocating}
                className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-[var(--accent-primary)] border border-blue-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Sliders size={12} /> Recalculate
              </button>
            </div>

            {chargers.length === 0 ? (
              <div className="text-center py-8 text-xs text-[var(--text-muted)]">
                No charger bays configured for this station.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--bg-surface-raised)] text-[var(--text-muted)] uppercase font-bold border-b border-[var(--border-subtle)]">
                    <tr>
                      <th className="p-3">Bay / Charger ID</th>
                      <th className="p-3">Type & Connector</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Rated Power</th>
                      <th className="p-3">Requested Power</th>
                      <th className="p-3">Allocated Power</th>
                      <th className="p-3">Active Session / SOC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {chargers.map((c) => (
                      <tr key={c.id || c.chargerId} className="hover:bg-[var(--bg-surface-raised)] transition">
                        <td className="p-3 font-bold">
                          <span className="font-mono text-[var(--accent-primary)]">{c.chargerId || `CHG000${c.id}`}</span>
                          <div className="text-[10px] text-[var(--text-muted)]">{c.chargerName}</div>
                        </td>
                        <td className="p-3">
                          <span className="font-mono font-bold">{c.chargerType}</span>
                          <div className="text-[10px] text-[var(--text-muted)]">{c.connectorType || "CCS2"}</div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              c.status === "CHARGING" || c.status === "OCCUPIED"
                                ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                : c.status === "AVAILABLE"
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-[var(--text-primary)]">{c.ratedPowerKw} kW</td>
                        <td className="p-3 font-mono text-amber-500 font-bold">{c.requestedPowerKw} kW</td>
                        <td className="p-3 font-mono text-emerald-500 font-bold">
                          {c.allocatedPowerKw > 0 ? `${c.allocatedPowerKw} kW` : "0 kW (Idle)"}
                        </td>
                        <td className="p-3">
                          {c.activeSession ? (
                            <div>
                              <div className="font-bold text-[var(--text-primary)]">{c.activeSession.vehicleModel}</div>
                              <div className="text-[10px] text-[var(--text-muted)] font-mono">
                                SOC: {c.activeSession.batterySoc}% • {c.activeSession.energyKwh} kWh
                              </div>
                            </div>
                          ) : (
                            <span className="text-[var(--text-muted)]">No active session</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. ELECTRICAL CONFIGURATION TAB */}
      {activeTab === "config" && (
        <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-6 shadow-sm">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 font-mono">
              <Sliders className="w-5 h-5 text-cyan-500" />
              Electrical Grid Parameters & Smart Control Safeguards
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Configure maximum transformer thresholds, building baseline loads, safety buffers, and control automation mode.
            </p>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Site Transformer Power Limit (kW) *
                </label>
                <input
                  type="number"
                  name="sitePowerLimitKw"
                  value={configForm.sitePowerLimitKw}
                  onChange={(e) => setConfigForm({ ...configForm, sitePowerLimitKw: Number(e.target.value) })}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  required
                />
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Total service capacity from grid substation</span>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Other Building Load (kW) *
                </label>
                <input
                  type="number"
                  name="otherBuildingLoadKw"
                  value={configForm.otherBuildingLoadKw}
                  onChange={(e) => setConfigForm({ ...configForm, otherBuildingLoadKw: Number(e.target.value) })}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  required
                />
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Facility HVAC, lighting, and store loads</span>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Safety Reserve Buffer (kW) *
                </label>
                <input
                  type="number"
                  name="safetyReserveKw"
                  value={configForm.safetyReserveKw}
                  onChange={(e) => setConfigForm({ ...configForm, safetyReserveKw: Number(e.target.value) })}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-500"
                  required
                />
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Emergency headroom margin</span>
              </div>
            </div>

            {/* Smart Control Mode Selection */}
            <div className="p-5 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-3">
              <label className="block text-xs font-bold text-[var(--text-primary)] uppercase font-mono">
                Control Automation Mode
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setConfigForm({ ...configForm, controlMode: "MONITOR" })}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    configForm.controlMode === "MONITOR"
                      ? "bg-blue-500/10 border-blue-500/40 text-[var(--accent-primary)]"
                      : "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-[var(--text-primary)]">1. MONITOR MODE (Default / Recommended)</span>
                    <input type="radio" checked={configForm.controlMode === "MONITOR"} readOnly />
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Calculates and visualizes recommended dynamic load allocations and telemetry without dispatching physical electrical hardware commands.
                  </p>
                </div>

                <div
                  onClick={() => setConfigForm({ ...configForm, controlMode: "SMART_CONTROL" })}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    configForm.controlMode === "SMART_CONTROL"
                      ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-500"
                      : "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-[var(--text-primary)]">2. SMART_CONTROL MODE (Hardware Integrated)</span>
                    <input type="radio" checked={configForm.controlMode === "SMART_CONTROL"} readOnly />
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Dispatches power limits via compatible OCPP 1.6J / 2.0.1 smart charging profiles with automated fail-safe fallbacks.
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Cost inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Wholesale Grid Cost (₹ / kWh)</label>
                <input
                  type="number"
                  step="0.1"
                  value={configForm.gridCostPerKwh}
                  onChange={(e) => setConfigForm({ ...configForm, gridCostPerKwh: Number(e.target.value) })}
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Demand Charge (₹ / kW peak)</label>
                <input
                  type="number"
                  step="10"
                  value={configForm.demandChargePerKw}
                  onChange={(e) => setConfigForm({ ...configForm, demandChargePerKw: Number(e.target.value) })}
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Overload Alert Threshold (%)</label>
                <input
                  type="number"
                  step="1"
                  value={configForm.overloadThresholdPct}
                  onChange={(e) => setConfigForm({ ...configForm, overloadThresholdPct: Number(e.target.value) })}
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-[var(--border-subtle)]">
              <button
                type="submit"
                disabled={savingConfig}
                className="px-6 py-2.5 bg-[var(--accent-primary)] hover:opacity-90 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {savingConfig ? "Saving in MySQL..." : "Save Electrical Configuration"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. LOAD ALLOCATION HISTORY TAB */}
      {activeTab === "history" && (
        <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-4 shadow-sm">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 font-mono">
              <History className="w-5 h-5 text-cyan-500" />
              Load Allocation & Meter Readings History
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Historical record of dynamic power allocation cycles and transformer safety events.
            </p>
          </div>

          {historyList.length === 0 ? (
            <div className="text-center py-12 text-xs text-[var(--text-muted)]">
              No historical load allocation events logged yet. Trigger an allocation from the dashboard to create logs.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--bg-surface-raised)] text-[var(--text-muted)] uppercase font-bold border-b border-[var(--border-subtle)]">
                    <tr>
                      <th className="p-3">Log ID</th>
                      <th className="p-3">Total Site Limit</th>
                      <th className="p-3">Building Load</th>
                      <th className="p-3">Available Capacity</th>
                      <th className="p-3">Requested Power</th>
                      <th className="p-3">Allocated Power</th>
                      <th className="p-3">Mode</th>
                      <th className="p-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {historyList.map((log) => (
                      <tr key={log.id} className="hover:bg-[var(--bg-surface-raised)] transition">
                        <td className="p-3 font-mono font-bold text-[var(--accent-primary)]">#LOG{log.id}</td>
                        <td className="p-3 font-mono font-bold text-[var(--text-primary)]">{log.totalCapacityKw} kW</td>
                        <td className="p-3 font-mono text-[var(--text-muted)]">{log.buildingLoadKw} kW</td>
                        <td className="p-3 font-mono text-emerald-500 font-bold">{log.availableChargingKw} kW</td>
                        <td className="p-3 font-mono text-amber-500">{log.totalRequestedKw} kW</td>
                        <td className="p-3 font-mono text-cyan-500 font-bold">{log.totalAllocatedKw} kW</td>
                        <td className="p-3 font-mono text-[9px] font-bold uppercase">{log.mode}</td>
                        <td className="p-3 font-mono text-[var(--text-muted)]">{new Date(log.timestamp).toLocaleString()}</td>
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
    </div>
  );
}
