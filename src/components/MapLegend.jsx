import React from "react";
import { Zap, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";

export default function MapLegend({
  stationCount = 0,
  isLoading = false,
  error = null,
  onRetry,
}) {
  return (
    <div className="absolute bottom-4 left-4 z-[500] max-w-xs sm:max-w-sm w-full font-sans pointer-events-none">
      <div className="bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-800 text-xs text-slate-300 shadow-2xl space-y-2.5 pointer-events-auto">
        {/* Header & Status Indicator */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5 font-bold font-mono tracking-wider text-slate-100 text-xs uppercase">
            <Zap size={14} className="text-emerald-400 fill-emerald-400" />
            <span>REAL EV CHARGING NETWORK</span>
          </div>

          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
            {isLoading ? "UPDATING..." : `${stationCount} STATIONS`}
          </span>
        </div>

        {/* Legend Indicators */}
        <div className="flex items-center justify-between text-[11px] font-medium py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow"></span>
            <span className="text-slate-300">Operational</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow"></span>
            <span className="text-slate-300">Non-operational</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block shadow"></span>
            <span className="text-slate-300">Unknown</span>
          </div>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold animate-pulse">
            <Loader2 size={13} className="animate-spin shrink-0 text-cyan-400" />
            <span>⚡ Finding nearby EV charging stations...</span>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-[11px]">
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={13} className="shrink-0 text-rose-400" />
              <span>Unable to load charging stations. Please try again.</span>
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="shrink-0 p-1 rounded-md bg-rose-800 hover:bg-rose-700 text-white cursor-pointer"
                title="Retry"
              >
                <RefreshCw size={11} />
              </button>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && stationCount === 0 && (
          <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-[11px] text-slate-300 space-y-0.5">
            <div className="font-semibold text-amber-300">
              No EV charging stations found in this area.
            </div>
            <div className="text-[10px] text-slate-400">
              Try zooming out or searching another location.
            </div>
          </div>
        )}

        {/* Station Count Summary */}
        {!isLoading && !error && stationCount > 0 && (
          <div className="text-[11px] font-semibold text-emerald-400 font-mono">
            {stationCount} charging stations found in this area
          </div>
        )}

        {/* Footer Attribution: OpenStreetMap */}
        <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-2 font-mono flex items-center justify-between">
          <span>Data: OpenStreetMap (amenity=charging_station)</span>
        </div>
      </div>
    </div>
  );
}
