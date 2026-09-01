import { useState } from "react";
import { Car, Plus, Trash2, CheckCircle2, Zap, ShieldCheck } from "lucide-react";
import { useSystemState } from "../contexts/SystemStateContext";

export default function Vehicles() {
  const { vehicles, addVehicle, removeVehicle, setSelectedVehicleId, selectedVehicleId } = useSystemState();

  const [brand, setBrand] = useState("Tata Motors");
  const [model, setModel] = useState("Nexon EV Max");
  const [number, setNumber] = useState("TN58AB1234");
  const [batteryCapacity, setBatteryCapacity] = useState(40.5);
  const [connector, setConnector] = useState("CCS2");
  const [msg, setMsg] = useState("");

  const handleAddVehicle = (e) => {
    e.preventDefault();
    if (!number || !model) return;

    const newVeh = {
      id: `VEH_${Date.now().toString().slice(-6)}`,
      brand,
      model,
      number: number.toUpperCase(),
      batteryCapacityKb: parseFloat(batteryCapacity) || 40,
      batteryPercentage: 35,
      connector,
    };

    addVehicle(newVeh);
    setSelectedVehicleId(newVeh.id);
    setMsg(`Vehicle ${newVeh.number} added and set as primary EV!`);
    setNumber("");
    setTimeout(() => setMsg(""), 3000);
  };

  return (
    <div className="space-y-6 font-inter">
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0B132B] border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded border border-emerald-500/30">
              EV GARAGE MANAGER
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white font-grotesk flex items-center gap-2">
            <Car size={28} className="text-emerald-400" /> Saved EV Vehicles & Profiles
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your electric vehicles, battery pack capacities, and default charger connector types for instant booking pre-fills.
          </p>
        </div>

        <div className="px-5 py-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Saved Vehicles</span>
          <span className="text-xl font-black text-cyan-400 font-mono">{vehicles.length} EVs Registered</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form to Add New EV */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-[#0B132B] border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white font-grotesk flex items-center gap-2">
            <Plus size={18} className="text-emerald-400" /> Add New Electric Vehicle
          </h3>

          {msg && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 size={16} /> {msg}
            </div>
          )}

          <form onSubmit={handleAddVehicle} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-300 uppercase mb-1">EV Brand / Manufacturer</label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500"
              >
                <option value="Tata Motors">Tata Motors (Nexon, Tiago, Punch EV)</option>
                <option value="MG Motor">MG Motor ( ZS EV, Comet )</option>
                <option value="Hyundai">Hyundai (Ioniq 5, Kona)</option>
                <option value="Kia">Kia (EV6, EV9)</option>
                <option value="Mahindra">Mahindra (XUV400 EV)</option>
                <option value="BYD">BYD (Atto 3, Seal, E6)</option>
                <option value="BMW">BMW (i4, iX1)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-300 uppercase mb-1">Model Name</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. Nexon EV Max 40.5 kWh"
                className="w-full bg-slate-900 border border-slate-700 text-white text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 uppercase mb-1">Registration Number</label>
              <input
                type="text"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="e.g. TN58AB1234"
                className="w-full bg-slate-900 border border-slate-700 text-emerald-400 font-mono text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 uppercase"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Battery (kWh)</label>
                <input
                  type="number"
                  step="0.1"
                  value={batteryCapacity}
                  onChange={(e) => setBatteryCapacity(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white font-mono text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Connector Type</label>
                <select
                  value={connector}
                  onChange={(e) => setConnector(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500"
                >
                  <option value="CCS2">CCS2 (DC Fast)</option>
                  <option value="Type 2">Type 2 (AC Fast)</option>
                  <option value="CHAdeMO">CHAdeMO</option>
                  <option value="GB/T">GB/T</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider font-grotesk rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Plus size={16} /> Save Vehicle to Garage
            </button>
          </form>
        </div>

        {/* Right Column: List of Saved Vehicles */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-[#0B132B] border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white font-grotesk">Garage EV List</h3>

          <div className="space-y-3">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className={`p-5 rounded-2xl border transition flex items-center justify-between gap-4 ${
                  v.id === selectedVehicleId
                    ? "bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-950/40"
                    : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-base font-grotesk">{v.brand} {v.model}</span>
                    {v.id === selectedVehicleId && (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                        PRIMARY VEHICLE
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    Reg: <strong className="text-emerald-400">{v.number}</strong> • Battery: {v.batteryCapacityKb || 40} kWh • Connector: <strong className="text-cyan-300">{v.connector || "CCS2"}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {v.id !== selectedVehicleId && (
                    <button
                      onClick={() => setSelectedVehicleId(v.id)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-xl transition"
                    >
                      Set Primary
                    </button>
                  )}
                  {vehicles.length > 1 && (
                    <button
                      onClick={() => removeVehicle(v.id)}
                      className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition"
                      title="Remove Vehicle"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
