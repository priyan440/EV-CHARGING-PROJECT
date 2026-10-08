import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Cpu,
  Plus,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  RefreshCw,
  Search,
  Sliders,
  Sparkles,
  Layers,
  Wrench,
  Radio,
  X,
  Building2,
  Activity,
  ShieldAlert,
  Power,
  Edit2,
  Trash2,
} from "lucide-react";
import {
  getOwnerChargers,
  createOwnerCharger,
  updateOwnerCharger,
  deleteOwnerCharger,
  setChargerSimulatorState,
  getOwnerStations,
} from "../../services/ownerService";
import { getSocket } from "../../services/socketService";

export default function OwnerChargers() {
  const [searchParams] = useSearchParams();
  const stationIdParam = searchParams.get("stationId") || "";

  const [chargers, setChargers] = useState([]);
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(stationIdParam);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [simulatorModalCharger, setSimulatorModalCharger] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // Add Charger Form State
  const [formData, setFormData] = useState({
    stationId: "",
    name: "",
    chargerType: "DC_FAST",
    powerRating: 60,
    connectorType: "CCS2",
    pricePerKwh: 18.0,
    manufacturer: "Delta Electronics",
    model: "UltraFast DC-120",
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [chgData, stnData] = await Promise.all([
        getOwnerChargers(selectedStation),
        getOwnerStations(),
      ]);
      setChargers(Array.isArray(chgData) ? chgData : []);
      setStations(Array.isArray(stnData) ? stnData : []);
      if (!formData.stationId && Array.isArray(stnData) && stnData.length > 0) {
        setFormData((prev) => ({ ...prev, stationId: stnData[0].stationId || stnData[0].id }));
      }
    } catch (err) {
      console.error(err);
      showToast("Error loading chargers from MySQL");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const socket = getSocket?.();
    if (socket) {
      const handleChargerChange = () => {
        getOwnerChargers(selectedStation).then((data) => setChargers(Array.isArray(data) ? data : [])).catch(() => {});
      };
      const handleTelemetry = (data) => {
        setChargers((prev) =>
          prev.map((c) => {
            const cId = c.charger_id || c.chargerId;
            return cId === data.telemetry?.chargerId
              ? {
                  ...c,
                  telemetry: { ...c.telemetry, ...data.telemetry },
                  status: data.telemetry?.status || c.status,
                }
              : c;
          })
        );
      };

      socket.on("charger_status_changed", handleChargerChange);
      socket.on("telemetry_updated", handleTelemetry);

      return () => {
        socket.off("charger_status_changed", handleChargerChange);
        socket.off("telemetry_updated", handleTelemetry);
      };
    }
  }, [selectedStation]);

  const [editingCharger, setEditingCharger] = useState(null);

  const handleCreateCharger = async (e) => {
    e.preventDefault();
    if (!formData.stationId) {
      showToast("Please select a valid station.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createOwnerCharger({
        stationId: formData.stationId,
        chargerName: formData.name || `Bay (${formData.connectorType} ${formData.powerRating}kW)`,
        chargerType: formData.chargerType,
        powerKw: Number(formData.powerRating),
        connectorType: formData.connectorType,
      });
      showToast(`Charger added! ID: ${res.data?.charger_id || res.data?.chargerId || "CHG"}`);
      setShowAddModal(false);
      setFormData({
        stationId: stations[0]?.stationId || stations[0]?.id || "",
        name: "",
        chargerType: "DC_FAST",
        powerRating: 60,
        connectorType: "CCS2",
        pricePerKwh: 18.0,
        manufacturer: "Delta Electronics",
        model: "UltraFast DC-120",
      });
      loadData();
    } catch (err) {
      showToast("Error creating charger: " + (err.message || "Failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateChargerSubmit = async (e) => {
    e.preventDefault();
    if (!editingCharger) return;

    setSubmitting(true);
    try {
      await updateOwnerCharger(editingCharger.charger_id || editingCharger.id, {
        chargerName: editingCharger.charger_name || editingCharger.name,
        chargerType: editingCharger.charger_type,
        powerKw: Number(editingCharger.power_kw || editingCharger.powerKw),
        status: editingCharger.status,
        connectorType: editingCharger.connector_type || editingCharger.connectorType,
      });
      showToast(`Charger ${editingCharger.charger_id || editingCharger.id} updated!`);
      setEditingCharger(null);
      loadData();
    } catch (err) {
      showToast("Error updating charger: " + (err.message || "Failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateCharger = async (chargerId) => {
    if (!window.confirm(`Are you sure you want to mark charger ${chargerId} as OFFLINE?`)) return;
    try {
      await deleteOwnerCharger(chargerId);
      showToast(`Charger ${chargerId} marked OFFLINE.`);
      loadData();
    } catch (err) {
      showToast("Error deactivating charger: " + (err.message || "Failed"));
    }
  };

  const handleSimulatorAction = async (chargerId, state, powerKw = 60, faultCode = null) => {
    try {
      await setChargerSimulatorState(chargerId, {
        status: state,
        powerKw: Number(powerKw),
        faultCode,
      });
      showToast(`Charger ${chargerId} simulated state: ${state}`);
      setSimulatorModalCharger(null);
      loadData();
    } catch (err) {
      showToast("Error updating simulator: " + (err.message || "Failed"));
    }
  };

  const filteredChargers = chargers.filter((c) => {
    const status = (c.status || "AVAILABLE").toUpperCase();
    if (statusFilter !== "ALL" && status !== statusFilter) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const name = (c.charger_name || c.name || "").toLowerCase();
    const cId = (c.charger_id || c.chargerId || "").toLowerCase();
    const sName = (c.station_name || c.stationId || "").toLowerCase();
    const type = (c.charger_type || c.connectorType || "").toLowerCase();

    return name.includes(q) || cId.includes(q) || sName.includes(q) || type.includes(q);
  });

  const getStatusBadge = (status) => {
    const st = (status || "AVAILABLE").toUpperCase();
    switch (st) {
      case "AVAILABLE":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      case "CHARGING":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
      case "OCCUPIED":
      case "RESERVED":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
      case "FAULTED":
      case "FAULT":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
      case "MAINTENANCE":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30";
      case "OFFLINE":
      default:
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in font-sans">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-[var(--accent-primary)] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-blue-400/30 animate-fade-in font-bold text-xs">
          <Sparkles className="w-4 h-4 text-yellow-300" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              OCPP 2.0.1 SIMULATOR LAYER
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] flex items-center gap-3 font-mono">
            <Cpu className="w-7 h-7 text-emerald-500" />
            Chargers & Live Monitoring
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Manage physical charging hardware, power ratings, connector types, and simulate live OCPP states in MySQL.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (stations.length > 0) {
                setFormData((prev) => ({ ...prev, stationId: stations[0].stationId || stations[0].id }));
              }
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Charger
          </button>
        </div>
      </div>

      {/* Filters: Station Select & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by charger ID, name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Station Selector */}
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-xl px-3 py-2.5 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="">All Stations</option>
            {stations.map((st) => (
              <option key={st.stationId || st.id} value={st.stationId || st.id}>
                {st.station_name || st.stationName || st.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-xl px-3 py-2.5 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="CHARGING">Charging</option>
            <option value="RESERVED">Reserved</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="FAULTED">Faulted</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="OFFLINE">Offline</option>
          </select>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-2.5 bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl border border-[var(--border-subtle)] transition cursor-pointer self-end sm:self-auto"
          title="Refresh Chargers"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-500" : ""}`} />
        </button>
      </div>

      {/* Chargers Grid */}
      {loading ? (
        <div className="text-center py-16 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-subtle)] space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-[var(--text-muted)] text-xs font-mono animate-pulse">Loading live charger states from MySQL...</p>
        </div>
      ) : filteredChargers.length === 0 ? (
        <div className="text-center py-16 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-subtle)] shadow-sm space-y-3">
          <Cpu className="w-12 h-12 text-[var(--text-muted)] mx-auto" />
          <h3 className="text-base font-bold text-[var(--text-primary)]">No Chargers Found</h3>
          <p className="text-xs text-[var(--text-muted)]">Add a new DC or AC charger to your charging stations in MySQL.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition cursor-pointer shadow-md"
          >
            + Add Charger
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChargers.map((charger) => {
            const chargerCode = charger.charger_id || charger.chargerId || `CHG00${charger.id}`;
            const chargerTitle = charger.charger_name || charger.name || `Charger ${chargerCode}`;
            const powerRating = charger.power_kw || charger.powerKw || charger.powerRating || 60;
            const stationTitle = charger.station_name || charger.stationId || "EV Power Station";
            const currentStatus = (charger.status || "AVAILABLE").toUpperCase();
            const chargerType = charger.charger_type || charger.chargerType || "DC_FAST";

            return (
              <div
                key={charger.id || chargerCode}
                className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-emerald-500/40 transition-all shadow-sm flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      {chargerCode}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(currentStatus)}`}>
                      {currentStatus}
                    </span>
                  </div>

                  {/* Charger Title */}
                  <h3 className="text-base font-bold text-[var(--text-primary)] leading-tight">{chargerTitle}</h3>
                  <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-1">
                    <Building2 size={12} /> {stationTitle}
                  </p>

                  {/* Specifications Card */}
                  <div className="mt-3.5 p-3 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Power Output</span>
                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">{powerRating} kW</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Standard</span>
                      <span className="font-bold text-[var(--text-primary)]">{chargerType.replace("_", " ")}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center gap-2">
                  <button
                    onClick={() => setSimulatorModalCharger(charger)}
                    className="flex-1 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Sliders size={13} /> OCPP Controls
                  </button>
                  <button
                    onClick={() => setEditingCharger({
                      ...charger,
                      powerRating: charger.power_kw || charger.powerKw || 60,
                      connectorType: charger.connector_type || charger.connectorType || "CCS2",
                    })}
                    className="p-2 bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl border border-[var(--border-subtle)] transition cursor-pointer"
                    title="Edit Charger Configuration"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleDeactivateCharger(charger.charger_id || charger.id)}
                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl border border-rose-500/20 transition cursor-pointer"
                    title="Mark Charger Offline"
                  >
                    <Power size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Edit Existing Charger */}
      {editingCharger && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl animate-fade-in text-[var(--text-primary)]">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 font-mono">
                <Edit2 size={18} className="text-blue-500" /> Edit Charger {editingCharger.charger_id || editingCharger.id} (MySQL)
              </h3>
              <button
                onClick={() => setEditingCharger(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateChargerSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Charger Name / Bay *</label>
                  <input
                    type="text"
                    required
                    value={editingCharger.charger_name || editingCharger.name || ""}
                    onChange={(e) => setEditingCharger({ ...editingCharger, charger_name: e.target.value, name: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-xl p-2.5"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Max Power Output (kW) *</label>
                  <input
                    type="number"
                    required
                    value={editingCharger.power_kw || editingCharger.powerKw || 60}
                    onChange={(e) => setEditingCharger({ ...editingCharger, power_kw: e.target.value, powerKw: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-xl p-2.5 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Charger Type</label>
                  <select
                    value={editingCharger.charger_type || editingCharger.chargerType || "DC_FAST"}
                    onChange={(e) => setEditingCharger({ ...editingCharger, charger_type: e.target.value, chargerType: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-xl p-2.5 font-bold"
                  >
                    <option value="DC_FAST">DC Fast Charger</option>
                    <option value="AC">AC Level 2</option>
                    <option value="CCS2">CCS Type 2</option>
                    <option value="TYPE2">Type 2 AC</option>
                    <option value="CHADEMO">CHAdeMO</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Connector Standard</label>
                  <select
                    value={editingCharger.connector_type || editingCharger.connectorType || "CCS2"}
                    onChange={(e) => setEditingCharger({ ...editingCharger, connector_type: e.target.value, connectorType: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-xl p-2.5 font-bold"
                  >
                    <option value="CCS2">CCS2 (Combo 2)</option>
                    <option value="Type 2">Type 2 (IEC 62196)</option>
                    <option value="CHAdeMO">CHAdeMO</option>
                    <option value="GB/T">GB/T</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Operational Status</label>
                <select
                  value={editingCharger.status || "AVAILABLE"}
                  onChange={(e) => setEditingCharger({ ...editingCharger, status: e.target.value })}
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-xl p-2.5 font-bold"
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="CHARGING">CHARGING</option>
                  <option value="RESERVED">RESERVED</option>
                  <option value="FAULTED">FAULTED</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="OFFLINE">OFFLINE</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCharger(null)}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] text-xs font-bold text-[var(--text-primary)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 cursor-pointer"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add New Charger */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl animate-fade-in text-[var(--text-primary)]">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 font-mono">
                <Plus size={18} className="text-emerald-500" /> Add New Charger (MySQL)
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCharger} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Target Station *</label>
                <select
                  value={formData.stationId}
                  onChange={(e) => setFormData({ ...formData, stationId: e.target.value })}
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-xl p-2.5 font-bold"
                  required
                >
                  {stations.map((s) => (
                    <option key={s.stationId || s.id} value={s.stationId || s.id}>
                      {s.station_name || s.stationName || s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Charger Name / Bay *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-xl p-2.5"
                    placeholder="e.g. Bay 01 (CCS2 60kW)"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Max Power Output (kW) *</label>
                  <input
                    type="number"
                    required
                    value={formData.powerRating}
                    onChange={(e) => setFormData({ ...formData, powerRating: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-xl p-2.5 font-mono font-bold"
                    placeholder="60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Charger Type</label>
                  <select
                    value={formData.chargerType}
                    onChange={(e) => setFormData({ ...formData, chargerType: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-xl p-2.5 font-bold"
                  >
                    <option value="DC_FAST">DC Fast Charger</option>
                    <option value="AC">AC Level 2</option>
                    <option value="CCS2">CCS Type 2</option>
                    <option value="TYPE2">Type 2 AC</option>
                    <option value="CHADEMO">CHAdeMO</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Connector Standard</label>
                  <select
                    value={formData.connectorType}
                    onChange={(e) => setFormData({ ...formData, connectorType: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-xl p-2.5 font-bold"
                  >
                    <option value="CCS2">CCS2 (Combo 2)</option>
                    <option value="Type 2">Type 2 (IEC 62196)</option>
                    <option value="CHAdeMO">CHAdeMO</option>
                    <option value="GB/T">GB/T</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] text-xs font-bold text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  {submitting ? "Registering..." : "Register Charger"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: OCPP Simulator Controls */}
      {simulatorModalCharger && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl animate-fade-in text-[var(--text-primary)]">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 font-mono">
                <Sliders size={18} className="text-purple-500" />
                Simulate: {simulatorModalCharger.charger_id || simulatorModalCharger.chargerId}
              </h3>
              <button
                onClick={() => setSimulatorModalCharger(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              Trigger instant OCPP 2.0.1 status transitions to test live synchronization across Customer, Owner, and Admin dashboards:
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={() => handleSimulatorAction(simulatorModalCharger.charger_id || simulatorModalCharger.id, "AVAILABLE")}
                className="p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold text-left transition cursor-pointer flex items-center justify-between"
              >
                <span>Available</span>
                <CheckCircle2 size={14} />
              </button>

              <button
                onClick={() => handleSimulatorAction(simulatorModalCharger.charger_id || simulatorModalCharger.id, "CHARGING", 50)}
                className="p-3 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-bold text-left transition cursor-pointer flex items-center justify-between"
              >
                <span>Charging (50kW)</span>
                <Play size={14} />
              </button>

              <button
                onClick={() => handleSimulatorAction(simulatorModalCharger.charger_id || simulatorModalCharger.id, "RESERVED")}
                className="p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold text-left transition cursor-pointer flex items-center justify-between"
              >
                <span>Reserved</span>
                <Activity size={14} />
              </button>

              <button
                onClick={() => handleSimulatorAction(simulatorModalCharger.charger_id || simulatorModalCharger.id, "FAULTED", 0, "GROUND_FAULT")}
                className="p-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold text-left transition cursor-pointer flex items-center justify-between"
              >
                <span>Faulted</span>
                <ShieldAlert size={14} />
              </button>

              <button
                onClick={() => handleSimulatorAction(simulatorModalCharger.charger_id || simulatorModalCharger.id, "MAINTENANCE")}
                className="p-3 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 text-xs font-bold text-left transition cursor-pointer flex items-center justify-between"
              >
                <span>Maintenance</span>
                <Wrench size={14} />
              </button>

              <button
                onClick={() => handleSimulatorAction(simulatorModalCharger.charger_id || simulatorModalCharger.id, "OFFLINE")}
                className="p-3 rounded-2xl bg-slate-500/10 hover:bg-slate-500/20 text-slate-600 dark:text-slate-400 border border-slate-500/30 text-xs font-bold text-left transition cursor-pointer flex items-center justify-between"
              >
                <span>Offline</span>
                <Power size={14} />
              </button>
            </div>

            <button
              onClick={() => setSimulatorModalCharger(null)}
              className="w-full py-2.5 rounded-xl bg-[var(--bg-surface-raised)] text-xs font-bold text-[var(--text-primary)] mt-2"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
