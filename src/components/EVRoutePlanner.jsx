import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiMapPin, FiNavigation, FiZap, FiBatteryCharging, 
  FiClock, FiDollarSign, FiCheckCircle, FiCompass, FiArrowRight 
} from 'react-icons/fi';
import GlassCard from './GlassCard';
import CyberButton from './CyberButton';
import { useSystemState } from '../contexts/SystemStateContext';
import confetti from 'canvas-confetti';

const POPULAR_ROUTES = [
  { origin: 'Chennai HQ', dest: 'Kovilpatti Hub', distKm: 540, stopsNeeded: 2 },
  { origin: 'Madurai Station', dest: 'Kanyakumari Point', distKm: 245, stopsNeeded: 1 },
  { origin: 'Coimbatore East', dest: 'Chennai HQ', distKm: 505, stopsNeeded: 2 },
  { origin: 'Tech City Center', dest: 'North Metro Bypass', distKm: 120, stopsNeeded: 0 },
];

const EVRoutePlanner = ({ onSelectStation }) => {
  const { stations } = useSystemState();
  const [origin, setOrigin] = useState('Chennai HQ');
  const [destination, setDestination] = useState('Kovilpatti Hub');
  const [batteryCap, setBatteryCap] = useState(75);
  const [currentSoC, setCurrentSoC] = useState(35);
  const [efficiency, setEfficiency] = useState(0.18);
  const [calculatedRoute, setCalculatedRoute] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handlePlanRoute = (e) => {
    e.preventDefault();
    setIsCalculating(true);

    setTimeout(() => {
      const matchedPreset = POPULAR_ROUTES.find(
        r => (r.origin === origin && r.dest === destination) || (r.origin === destination && r.dest === origin)
      );
      const totalKm = matchedPreset ? matchedPreset.distKm : 420;
      
      const usableKwh = batteryCap * (currentSoC / 100);
      const neededKwhTotal = totalKm * efficiency;
      const deficitKwh = Math.max(0, neededKwhTotal - usableKwh + (batteryCap * 0.15));

      const avgChargerSpeed = 150;
      const estChargeMins = Math.round((deficitKwh / avgChargerSpeed) * 60) + 10;
      const estCost = Math.round(deficitKwh * 18.5);

      const stops = stations.slice(0, Math.max(1, Math.ceil(deficitKwh / (batteryCap * 0.6))));

      setCalculatedRoute({
        totalKm,
        usableKwh: usableKwh.toFixed(1),
        neededKwhTotal: neededKwhTotal.toFixed(1),
        deficitKwh: deficitKwh.toFixed(1),
        estChargeMins,
        estCost,
        stops,
      });

      setIsCalculating(false);

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* HEADER HERO */}
      <div className="relative overflow-hidden p-8 rounded-3xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white border border-blue-700/50 shadow-xl">
        <div className="relative z-10">
          <span className="px-3.5 py-1 text-[10px] font-bold tracking-widest text-blue-200 bg-white/10 rounded-full border border-white/20 uppercase">
            INTELLIGENT TRIP ENGINE
          </span>
          <h2 className="text-3xl font-black mt-3 tracking-tight text-white">
            EV Route & Station Range Planner
          </h2>
          <p className="text-blue-100 text-sm mt-1 max-w-2xl font-medium">
            Plan long-distance EV trips with zero range anxiety. Calculate required energy, optimal charging stops, and reserve bays in advance.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* INPUT FORM CARD */}
        <div className="lg:col-span-5">
          <GlassCard className="p-6 rounded-3xl space-y-4">
            <h3 className="text-lg font-extrabold flex items-center gap-2 text-blue-600">
              <FiNavigation className="text-blue-600" />
              Configure Trip Parameters
            </h3>

            <form onSubmit={handlePlanRoute} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Origin Location
                </label>
                <div className="relative">
                  <FiMapPin className="absolute left-4 top-3 text-blue-600 w-4.5 h-4.5" />
                  <select
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-blue-600 focus:outline-none text-slate-900 font-medium"
                  >
                    <option value="Chennai HQ">Chennai VoltHub HQ</option>
                    <option value="Madurai Station">Madurai EV Station</option>
                    <option value="Coimbatore East">Coimbatore FastGrid</option>
                    <option value="Tech City Center">Downtown Tech Hub</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Destination Location
                </label>
                <div className="relative">
                  <FiCompass className="absolute left-4 top-3 text-blue-600 w-4.5 h-4.5" />
                  <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-blue-600 focus:outline-none text-slate-900 font-medium"
                  >
                    <option value="Kovilpatti Hub">Kovilpatti Charging Hub</option>
                    <option value="Kanyakumari Point">Kanyakumari Supercharger</option>
                    <option value="Chennai HQ">Chennai VoltHub HQ</option>
                    <option value="North Metro Bypass">North Metro Supercharger</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Battery Size
                    </label>
                    <span className="text-xs font-mono font-bold text-blue-600">{batteryCap} kWh</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="120"
                    step="5"
                    value={batteryCap}
                    onChange={(e) => setBatteryCap(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Start SoC
                    </label>
                    <span className="text-xs font-mono font-bold text-emerald-600">{currentSoC}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={currentSoC}
                    onChange={(e) => setCurrentSoC(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Vehicle Consumption Rate
                  </label>
                  <span className="text-xs font-mono text-blue-600 font-bold">{efficiency} kWh/km</span>
                </div>
                <input
                  type="range"
                  min="0.12"
                  max="0.28"
                  step="0.01"
                  value={efficiency}
                  onChange={(e) => setEfficiency(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={isCalculating}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/20"
              >
                <FiZap />
                {isCalculating ? 'Computing Route Matrix...' : 'Compute Route & Stops'}
              </button>
            </form>
          </GlassCard>
        </div>

        {/* RESULTS CARD */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {calculatedRoute ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* STATS STRIP */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-xs">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Distance</span>
                    <span className="text-2xl font-black text-slate-900 font-mono">{calculatedRoute.totalKm} km</span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-xs">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Energy Needed</span>
                    <span className="text-2xl font-black text-blue-600 font-mono">{calculatedRoute.neededKwhTotal} kWh</span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-xs">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Charge Time</span>
                    <span className="text-2xl font-black text-amber-600 font-mono">~{calculatedRoute.estChargeMins} min</span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-xs">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Est. Cost</span>
                    <span className="text-2xl font-black text-emerald-600 font-mono">₹{calculatedRoute.estCost}</span>
                  </div>
                </div>

                {/* RECOMMENDED CHARGER STOPS */}
                <GlassCard className="p-6 rounded-3xl">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <FiBatteryCharging className="text-blue-600" />
                      Recommended VoltHub Stations En-Route
                    </h4>
                    <span className="text-xs text-slate-500 font-mono">
                      {calculatedRoute.stops.length} Stop{calculatedRoute.stops.length > 1 ? 's' : ''} Recommended
                    </span>
                  </div>

                  <div className="space-y-3">
                    {calculatedRoute.stops.map((st, idx) => (
                      <div
                        key={st.id}
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-blue-400 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-700 font-bold font-mono text-sm">
                            #{idx + 1}
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-900 text-sm">{st.name}</h5>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <FiMapPin className="text-slate-400" />
                              {st.location} • <span className="text-blue-600 font-bold font-mono">₹{st.pricePerKwh}/kWh</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right hidden sm:block">
                            <span className="text-[10px] text-slate-500 font-bold block uppercase">Max Speed</span>
                            <span className="text-xs font-mono font-bold text-blue-600">250 kW DC</span>
                          </div>

                          <button
                            onClick={() => onSelectStation && onSelectStation(st)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <span>Book Bay</span>
                            <FiArrowRight />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            ) : (
              <GlassCard className="p-12 text-center rounded-3xl flex flex-col items-center justify-center min-h-[380px]">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-4 animate-bounce">
                  <FiCompass className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="text-lg font-bold text-slate-900">No Route Calculated Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-2 font-medium">
                  Select your origin, destination, and battery parameters on the left to calculate your optimal charging itinerary.
                </p>
              </GlassCard>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default EVRoutePlanner;
