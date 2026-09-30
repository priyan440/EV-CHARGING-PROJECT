import React from "react";
import { FiZap } from "react-icons/fi";

function LoadingSpinner({ label = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-3">
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
        <FiZap className="absolute w-5 h-5 text-emerald-500 animate-pulse" />
      </div>
      {label && (
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          {label}
        </span>
      )}
    </div>
  );
}

export default LoadingSpinner;
