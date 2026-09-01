import React from "react";

function StatCard({ title, value, subtext, icon: Icon, badge, color = "emerald" }) {
  const colorMap = {
    emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    sky: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className={`p-2.5 rounded-xl border ${colorMap[color] || colorMap.emerald}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between">
        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {value}
        </h3>
        {badge && (
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
            {badge}
          </span>
        )}
      </div>

      {subtext && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
          {subtext}
        </p>
      )}
    </div>
  );
}

export default StatCard;
