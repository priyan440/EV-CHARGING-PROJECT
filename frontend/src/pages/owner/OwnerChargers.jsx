import { useState } from "react";
import { Cpu, Plus, Zap, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useSystemState } from "../../contexts/SystemStateContext";

export default function OwnerChargers() {
  const { currentUser } = useAuth();
  const { stations, addChargerToStation, toggleChargerStatus } = useSystemState();
  const [showAddModal, setShowAddModal] = useState(false);

  const ownerCounterId = currentUser?.counterId || "OWNER0001";
  const myStations = stations.filter((s) => s.ownerCounterId === ownerCounterId);

  const [selectedStationId, setSelectedStationId] = useState(myStations[0]?.id || "STA001");
  const [connector, setConnector] = useState("CCS2");
  const [powerKw, setPowerKw] = useState("60");
  const [pricePerKwh, setPricePerKwh] = useState("18");

  const handleAddCharger = (e) => {
    e.preventDefault();
    addChargerToStation(selectedStationId, {
      connector,
      powerKw: parseFloat(powerKw),
      pricePerKwh: parseFloat(pricePerKwh),
    });

    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
            <Cpu size={28} className="text-cyan-400" /> Charger Bay Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Add charger units, set tariff pricing per kWh, and switch charger live operational status.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-2"
        >
          <Plus size={16} /> Add Charger Bay
        </button>
      </div>

      {/* Chargers Grid Grouped by Station */}
      <div className="space-y-6">
        {myStations.map((st) => (
          <div key={st.id} className="p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">{st.name}</h3>
                <p className="text-xs text-slate-400 font-mono">ID: {st.id} | {st.city}</p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-xl border border-emerald-500/30">
                {(st.chargers || []).length} Chargers
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(st.chargers || []).map((ch) => (
                <div key={ch.id} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-300">{ch.id}</span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        ch.status === "Available"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : ch.status === "Occupied"
                          ? "bg-red-500/20 text-red-400 border-red-500/30"
                          : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {ch.status}
                    </span>
                  </div>

                  <div>
                    <div className="text-base font-bold text-white font-mono">{ch.connector}</div>
                    <div className="text-xs text-slate-400">Power: <span className="text-white font-mono font-bold">{ch.powerKw} kW</span></div>
                    <div className="text-xs text-slate-400">Rate: <span className="text-cyan-400 font-mono font-bold">₹{ch.pricePerKwh}/kWh</span></div>
                  </div>

                  {/* Toggle Status */}
                  <select
                    value={ch.status}
                    onChange={(e) => toggleChargerStatus(st.id, ch.id, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-xs font-bold text-slate-300 p-2 rounded-xl"
                  >
                    <option value="Available">Available</option>
                    <option value="Occupied">Occupied</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add Charger Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0B1329] border border-slate-800 p-6 rounded-3xl shadow-2xl text-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
              Add New Charger Unit (CHG Counter ID)
            </h3>

            <form onSubmit={handleAddCharger} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">Target Station</label>
                <select
                  value={selectedStationId}
                  onChange={(e) => setSelectedStationId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white font-bold p-2.5 rounded-xl"
                >
                  {myStations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">Connector Standard</label>
                <select
                  value={connector}
                  onChange={(e) => setConnector(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white font-bold p-2.5 rounded-xl"
                >
                  <option value="CCS2">CCS2 (DC Fast Charging)</option>
                  <option value="Type 2">Type 2 (AC Charging)</option>
                  <option value="CHAdeMO">CHAdeMO</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">Power Output (kW)</label>
                  <input
                    type="number"
                    value={powerKw}
                    onChange={(e) => setPowerKw(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">Price / kWh (₹)</label>
                  <input
                    type="number"
                    value={pricePerKwh}
                    onChange={(e) => setPricePerKwh(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold"
                >
                  Save Charger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
