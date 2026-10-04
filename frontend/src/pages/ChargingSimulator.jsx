import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Zap,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  TrendingUp,
  BatteryCharging,
  Clock,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  CalendarCheck,
  ArrowRight,
  Info,
  Sparkles,
  Award,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useSystemState } from "../contexts/SystemStateContext";
import { vehicleService } from "../services/vehicleService";
import { chargingSimulatorService } from "../services/chargingSimulatorService";

export default function ChargingSimulator() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { stations } = useSystemState();

  const customerId = currentUser?.counterId || "CUS0001";
  const [vehicles, setVehicles] = useState([]);

  // Simulation Parameters
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [currentSoc, setCurrentSoc] = useState(
    parseInt(searchParams.get("currentSoc"), 10) || 20
  );
  const [targetSoc, setTargetSoc] = useState(80);
  const [selectedStationId, setSelectedStationId] = useState(
    searchParams.get("stationId") || "STA001"
  );
  const [chargerPower, setChargerPower] = useState(60); // kW
  const [priority, setPriority] = useState("BALANCED"); // BALANCED, LOWEST_COST, FASTEST, NEAREST

  // Simulation Result State
  const [simulationResult, setSimulationResult] = useState(null);
  const [comparisonOptions, setComparisonOptions] = useState([]);

  // Animation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [animatedSoc, setAnimatedSoc] = useState(20);
  const [animatedKwh, setAnimatedKwh] = useState(0);
  const [animatedCost, setAnimatedCost] = useState(0);

  // Load Vehicles
  useEffect(() => {
    const list = vehicleService.getVehicles(customerId);
    setVehicles(list);
    if (list.length > 0) {
      const primary = list.find((v) => v.isPrimary) || list[0];
      setSelectedVehicleId(primary.id);
    }
  }, [customerId]);

  // Recalculate simulation when inputs change
  useEffect(() => {
    const activeVehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];
    const batteryCap = parseFloat(activeVehicle?.batteryCapacity) || 40.5;

    const result = chargingSimulatorService.simulateCharging({
      batteryCapacity: batteryCap,
      currentSoc,
      targetSoc,
      chargerKw: chargerPower,
      pricePerKwh: 18.5,
    });

    setSimulationResult(result);
    setAnimatedSoc(currentSoc);
    setAnimatedKwh(0);
    setAnimatedCost(0);
    setIsSimulating(false);

    // Compute comparison matrix
    const options = chargingSimulatorService.compareOptions(
      { batteryCapacity: batteryCap, currentSoc, targetSoc },
      priority
    );
    setComparisonOptions(options);
  }, [selectedVehicleId, currentSoc, targetSoc, chargerPower, priority, vehicles]);

  // Animated charging simulation ticker
  useEffect(() => {
    let interval = null;
    if (isSimulating && simulationResult) {
      interval = setInterval(() => {
        setAnimatedSoc((prev) => {
          if (prev >= targetSoc) {
            setIsSimulating(false);
            return targetSoc;
          }
          const next = prev + 1;
          const activeVehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];
          const cap = parseFloat(activeVehicle?.batteryCapacity) || 40.5;
          const kwh = (((next - currentSoc) / 100) * cap).toFixed(2);
          setAnimatedKwh(parseFloat(kwh));
          setAnimatedCost(parseFloat((kwh * 18.5 + 20).toFixed(2)));
          return next;
        });
      }, 120);
    }
    return () => clearInterval(interval);
  }, [isSimulating, targetSoc, currentSoc, simulationResult, selectedVehicleId, vehicles]);

  const handleStartSim = () => {
    if (animatedSoc >= targetSoc) {
      setAnimatedSoc(currentSoc);
      setAnimatedKwh(0);
      setAnimatedCost(0);
    }
    setIsSimulating(true);
  };

  const handlePauseSim = () => setIsSimulating(false);
  const handleResetSim = () => {
    setIsSimulating(false);
    setAnimatedSoc(currentSoc);
    setAnimatedKwh(0);
    setAnimatedCost(0);
  };

  const handleBookSlot = (stationId = selectedStationId) => {
    navigate(`/customer/book?stationId=${stationId}&targetBattery=${targetSoc}&currentBattery=${currentSoc}`);
  };

  if (!simulationResult) return null;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="theme-card p-6 md:p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 text-[10px] font-extrabold uppercase font-mono tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
              <Sparkles size={12} className="text-emerald-500" /> WHAT-IF CHARGING SIMULATOR
            </span>
            <span className="px-3 py-1 text-[10px] font-extrabold font-mono tracking-wider bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-full border border-cyan-500/30">
              PHYSICS & TARIFF ENGINE
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <Zap className="text-emerald-500" size={28} /> Smart Charging Simulator
          </h1>

          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl">
            Simulate realistic EV charging sessions with non-linear battery tapering above 80%, estimate cost and completion times, and compare multi-station charging alternatives.
          </p>
        </div>

        <button
          onClick={() => handleBookSlot(selectedStationId)}
          className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 shrink-0"
        >
          <CalendarCheck size={16} /> Book Simulated Slot
        </button>
      </div>

      {/* 1. Simulation Inputs Grid */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-lg space-y-5">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Sliders size={16} className="text-cyan-500" /> Simulation Parameters
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Vehicle Select */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Select Vehicle
            </label>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="w-full py-2.5 px-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white cursor-pointer outline-none focus:border-emerald-500"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.brand || v.manufacturer} {v.model} ({v.batteryCapacity} kWh)
                </option>
              ))}
            </select>
          </div>

          {/* Station Select */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Charging Station
            </label>
            <select
              value={selectedStationId}
              onChange={(e) => setSelectedStationId(e.target.value)}
              className="w-full py-2.5 px-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white cursor-pointer outline-none focus:border-emerald-500"
            >
              {(stations || []).map((s) => (
                <option key={s.stationId || s.id} value={s.stationId || s.id}>
                  {s.name} ({s.city})
                </option>
              ))}
            </select>
          </div>

          {/* Charger Power */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Charger Hardware Power
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: "22 kW AC", kw: 22 },
                { label: "60 kW DC", kw: 60 },
                { label: "120 kW Hyper", kw: 120 },
              ].map((ch) => (
                <button
                  key={ch.kw}
                  type="button"
                  onClick={() => setChargerPower(ch.kw)}
                  className={`py-2 px-1 rounded-xl text-xs font-mono font-bold transition cursor-pointer text-center ${
                    chargerPower === ch.kw
                      ? "bg-emerald-500 text-slate-950 shadow"
                      : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Battery SOC Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-slate-500">Current Battery SOC:</span>
              <span className="font-mono text-emerald-500 text-sm">{currentSoc}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={targetSoc - 5}
              value={currentSoc}
              onChange={(e) => setCurrentSoc(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-slate-500">Target Battery SOC:</span>
              <span className="font-mono text-cyan-500 text-sm">{targetSoc}%</span>
            </div>
            <input
              type="range"
              min={currentSoc + 5}
              max={100}
              value={targetSoc}
              onChange={(e) => setTargetSoc(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            {targetSoc > 80 && (
              <span className="text-[10px] text-amber-500 font-semibold block mt-1">
                ⚠️ Charges above 80% activate thermal taper protection (slower charging rate).
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Simulation Calculations Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Energy Required</span>
          <div className="text-2xl font-black text-emerald-500 font-mono mt-1">
            {simulationResult.energyRequiredKwh} <span className="text-sm">kWh</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium mt-1 block">
            +{simulationResult.deltaSoc}% Delta
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimated Duration</span>
          <div className="text-2xl font-black text-cyan-500 font-mono mt-1">
            {simulationResult.formattedDuration}
          </div>
          <span className="text-[10px] text-slate-500 font-medium mt-1 block">
            Ready by ~{simulationResult.completionTimeStr}
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimated Cost</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
            ₹{simulationResult.totalCost}
          </div>
          <span className="text-[10px] text-slate-500 font-medium mt-1 block">
            Includes tariff & 18% GST
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Range Gained</span>
          <div className="text-2xl font-black text-purple-500 font-mono mt-1">
            +{simulationResult.rangeGainedKm} <span className="text-sm">km</span>
          </div>
          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-1 block">
            Added driving autonomy
          </span>
        </div>
      </div>

      {/* 3. Live Animated Charging Visualizer */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-[#0B172E] to-slate-900 border border-slate-800 shadow-2xl space-y-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold flex items-center gap-2">
              <BatteryCharging size={20} className="text-emerald-400" /> Interactive Charging Progress Animation
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live physics simulation showing real-time kilowatt delivery, battery capacity expansion, and elapsed cost.
            </p>
          </div>

          {/* Animation Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {!isSimulating ? (
              <button
                onClick={handleStartSim}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Play size={14} /> Start Simulation
              </button>
            ) : (
              <button
                onClick={handlePauseSim}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Pause size={14} /> Pause
              </button>
            )}
            <button
              onClick={handleResetSim}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer border border-slate-700"
              title="Reset Animation"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* Battery Graphic */}
        <div className="relative p-6 rounded-3xl bg-slate-950/60 border border-slate-800 flex flex-col items-center justify-center space-y-4">
          <div className="w-full max-w-xl flex items-center gap-3">
            {/* Battery Exterior Container */}
            <div className="relative flex-1 h-12 bg-slate-900 border-2 border-slate-700 rounded-2xl p-1 overflow-hidden shadow-inner flex items-center">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-xl transition-all duration-150 flex items-center justify-end pr-2 shadow-lg shadow-emerald-500/30"
                style={{ width: `${animatedSoc}%` }}
              >
                {animatedSoc >= 15 && (
                  <span className="font-mono text-xs font-black text-slate-950">
                    {animatedSoc}%
                  </span>
                )}
              </div>
            </div>
            {/* Battery Terminal Nub */}
            <div className="w-2.5 h-6 bg-slate-700 rounded-r-md shrink-0" />
          </div>

          {/* Animated Metrics Ribbon */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-mono">
            <div>
              <span className="text-slate-500">Current Level:</span>{" "}
              <strong className="text-emerald-400 font-black text-sm">{animatedSoc}%</strong>
            </div>
            <div>
              <span className="text-slate-500">Target Level:</span>{" "}
              <strong className="text-cyan-400 font-bold">{targetSoc}%</strong>
            </div>
            <div>
              <span className="text-slate-500">Energy Delivered:</span>{" "}
              <strong className="text-white font-bold">{animatedKwh} kWh</strong>
            </div>
            <div>
              <span className="text-slate-500">Running Cost:</span>{" "}
              <strong className="text-emerald-400 font-bold">₹{animatedCost}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Multi-Option Comparison Matrix */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-cyan-500" /> Compare Charging Options & Alternatives
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Evaluate duration, tariff, and distance across different connector hardware and nearby stations.
            </p>
          </div>

          {/* Priority Toggle Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2">Priority:</span>
            {[
              { id: "BALANCED", label: "Balanced" },
              { id: "LOWEST_COST", label: "Lowest Cost" },
              { id: "FASTEST", label: "Fastest Time" },
              { id: "NEAREST", label: "Nearest Station" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPriority(p.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  priority === p.id
                    ? "bg-emerald-500 text-slate-950 shadow"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Options Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-3">Option & Station</th>
                <th className="py-3 px-2">Connector Type</th>
                <th className="py-3 px-2">Power</th>
                <th className="py-3 px-2">Charging Time</th>
                <th className="py-3 px-2">Estimated Cost</th>
                <th className="py-3 px-2">Distance</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {comparisonOptions.map((opt) => (
                <tr
                  key={opt.id}
                  className={`transition ${
                    opt.isRecommended
                      ? "bg-emerald-500/5 dark:bg-emerald-500/10 font-bold"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      {opt.isRecommended && (
                        <span className="p-1 rounded-full bg-emerald-500 text-slate-950 shrink-0" title="Recommended Option">
                          <Award size={12} />
                        </span>
                      )}
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                          {opt.name}
                          {opt.isRecommended && (
                            <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded">
                              ⭐ BEST MATCH
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal">{opt.stationName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-slate-600 dark:text-slate-300">{opt.chargerType}</td>
                  <td className="py-3 px-2 font-mono text-cyan-600 dark:text-cyan-400 font-bold">{opt.powerKw} kW</td>
                  <td className="py-3 px-2 font-mono">{opt.formattedDuration}</td>
                  <td className="py-3 px-2 font-mono font-bold text-emerald-500">₹{opt.cost}</td>
                  <td className="py-3 px-2 font-mono text-slate-500">{opt.distanceKm} km</td>
                  <td className="py-3 px-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      {opt.availability}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleBookSlot(selectedStationId)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                    >
                      Book
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
