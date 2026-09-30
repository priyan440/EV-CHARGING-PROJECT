import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiDollarSign, FiZap, FiClock, FiSun, FiAlertTriangle, FiTrendingUp } from 'react-icons/fi';
import GlassCard from './GlassCard';

const TariffCalculator = () => {
  const [connectorType, setConnectorType] = useState('CCS2'); // NACS, CCS2, Type 2
  const [timeOfDay, setTimeOfDay] = useState('offpeak'); // peak, standard, offpeak
  const [chargeKwh, setChargeKwh] = useState(40);
  const [includeSolarDiscount, setIncludeSolarDiscount] = useState(true);

  const baseRates = {
    Type2: 12.50,
    CCS2: 18.50,
    NACS: 22.00
  };

  const timeMultipliers = {
    offpeak: 0.85,
    standard: 1.00,
    peak: 1.25
  };

  const selectedBase = baseRates[connectorType.replace(' ', '')] || 18.50;
  const timeMult = timeMultipliers[timeOfDay];
  const solarDiscount = includeSolarDiscount ? 2.00 : 0.00;

  const effectiveRate = Math.max(8.00, (selectedBase * timeMult) - solarDiscount);
  const totalCost = Math.round(chargeKwh * effectiveRate);
  const estTimeMins = Math.round((chargeKwh / (connectorType === 'NACS' ? 250 : connectorType === 'CCS2' ? 150 : 22)) * 60);

  return (
    <GlassCard className="p-8 rounded-3xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest block">DYNAMIC GRID PRICING</span>
          <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2 mt-0.5">
            <FiDollarSign className="text-blue-600" />
            Tariff & Surge Estimator
          </h3>
        </div>
        <div className="px-3.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-bold font-mono">
          Effective: ₹{effectiveRate.toFixed(2)} / kWh
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* INPUT CONTROLS */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Connector Tech
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Type 2', 'CCS2', 'NACS'].map((conn) => (
                <button
                  key={conn}
                  type="button"
                  onClick={() => setConnectorType(conn)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    connectorType === conn
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {conn}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Time Window / Grid Load
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTimeOfDay('offpeak')}
                className={`py-2.5 px-2 rounded-xl border text-[11px] font-bold transition cursor-pointer text-center ${
                  timeOfDay === 'offpeak'
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Off-Peak (15% Off)
              </button>
              <button
                type="button"
                onClick={() => setTimeOfDay('standard')}
                className={`py-2.5 px-2 rounded-xl border text-[11px] font-bold transition cursor-pointer text-center ${
                  timeOfDay === 'standard'
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Standard Rate
              </button>
              <button
                type="button"
                onClick={() => setTimeOfDay('peak')}
                className={`py-2.5 px-2 rounded-xl border text-[11px] font-bold transition cursor-pointer text-center ${
                  timeOfDay === 'peak'
                    ? 'bg-amber-600 border-amber-600 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Peak Surge (+25%)
              </button>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Target Energy Fill
              </label>
              <span className="text-xs font-mono font-bold text-blue-600">{chargeKwh} kWh</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={chargeKwh}
              onChange={(e) => setChargeKwh(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl">
            <div className="flex items-center gap-2">
              <FiSun className="text-amber-500 w-4 h-4" />
              <span className="text-xs text-slate-800 font-bold">Green Solar Offset (-₹2.00/kWh)</span>
            </div>
            <input
              type="checkbox"
              checked={includeSolarDiscount}
              onChange={(e) => setIncludeSolarDiscount(e.target.checked)}
              className="accent-blue-600 w-4 h-4 cursor-pointer"
            />
          </div>
        </div>

        {/* PRICE SUMMARY RESULT */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden shadow-lg">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Calculated Session Total</span>
            <div className="text-4xl font-black text-blue-400 font-mono tracking-tight">
              ₹{totalCost}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Based on {chargeKwh} kWh via {connectorType}
            </p>
          </div>

          <div className="space-y-2 my-4 pt-4 border-t border-slate-800 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Base Tariff:</span>
              <span className="font-mono font-bold">₹{selectedBase.toFixed(2)}/kWh</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Time Multiplier:</span>
              <span className="font-mono font-bold">{timeMult}x</span>
            </div>
            {includeSolarDiscount && (
              <div className="flex justify-between text-emerald-400">
                <span>Solar Incentive:</span>
                <span className="font-mono font-bold">-₹2.00/kWh</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-800 text-sky-400">
              <span className="flex items-center gap-1 font-semibold"><FiClock /> Est. Duration:</span>
              <span className="font-mono font-bold">~{estTimeMins} mins</span>
            </div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-[10px] text-slate-300 flex items-center gap-2">
            <FiTrendingUp className="text-blue-400 w-4 h-4 shrink-0" />
            <span>Off-peak rates active daily from 23:00 to 06:00. Book ahead to lock in rates.</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

export default TariffCalculator;
