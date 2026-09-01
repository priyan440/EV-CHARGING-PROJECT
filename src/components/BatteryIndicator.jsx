import React from "react";
import { FiZap, FiBatteryCharging } from "react-icons/fi";

function BatteryIndicator({ percentage = 65, isCharging = false, size = "md" }) {
  const cleanPct = Math.min(100, Math.max(0, Number(percentage) || 0));

  let colorClass = "from-emerald-500 to-teal-400";
  let textClass = "text-emerald-500 dark:text-emerald-400";
  let bgClass = "bg-emerald-500/10 border-emerald-500/30";

  if (cleanPct < 20) {
    colorClass = "from-rose-500 to-red-600";
    textClass = "text-rose-500 dark:text-rose-400";
    bgClass = "bg-rose-500/10 border-rose-500/30";
  } else if (cleanPct < 50) {
    colorClass = "from-amber-400 to-yellow-500";
    textClass = "text-amber-500 dark:text-amber-400";
    bgClass = "bg-amber-500/10 border-amber-500/30";
  }

  return (
    <div className="flex flex-col items-center">
      {/* Battery Container */}
      <div className="relative flex items-center justify-center">
        {/* Outer Shell */}
        <div className={`relative w-28 h-14 rounded-2xl border-2 p-1 ${bgClass} flex items-center justify-start overflow-hidden shadow-inner`}>
          {/* Battery Level Fill */}
          <div
            className={`h-full rounded-xl bg-gradient-to-r ${colorClass} transition-all duration-700 ease-out flex items-center justify-end pr-2`}
            style={{ width: `${cleanPct}%` }}
          >
            {isCharging && (
              <FiZap className="text-slate-950 w-4 h-4 animate-bounce shrink-0" />
            )}
          </div>

          {/* Battery Cap */}
          <div className="absolute -right-2 top-4 w-2 h-6 rounded-r-md bg-slate-400 dark:bg-slate-600" />
        </div>
      </div>

      {/* Percentage Text & Label */}
      <div className="mt-2 text-center">
        <span className={`text-2xl font-black ${textClass} tracking-tight`}>
          {cleanPct}%
        </span>
        <span className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          {isCharging ? "Charging Active" : "Current Battery"}
        </span>
      </div>
    </div>
  );
}

export default BatteryIndicator;
