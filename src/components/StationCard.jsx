import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FiMapPin,
  FiZap,
  FiClock,
  FiCheckCircle,
  FiAlertTriangle,
  FiXCircle,
  FiArrowRight,
} from "react-icons/fi";

function StationCard({ station }) {
  const navigate = useNavigate();

  const statusConfig = {
    Available: {
      badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      dot: "bg-emerald-500",
      icon: FiCheckCircle,
    },
    Busy: {
      badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      dot: "bg-amber-500",
      icon: FiAlertTriangle,
    },
    Maintenance: {
      badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
      dot: "bg-rose-500",
      icon: FiXCircle,
    },
    Offline: {
      badge: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
      dot: "bg-slate-500",
      icon: FiXCircle,
    },
  };

  const currentStatus = statusConfig[station.status] || statusConfig.Available;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
      {/* Top Banner Image with Status Badge */}
      <div className="relative h-44 overflow-hidden bg-slate-800">
        <img
          src={station.image}
          alt={station.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

        {/* Station ID Tag */}
        <span className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md text-white font-mono text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-700">
          {station.id}
        </span>

        {/* Status Badge */}
        <div
          className={`absolute top-3 right-3 px-3 py-1 rounded-full border backdrop-blur-md text-xs font-bold flex items-center gap-1.5 ${currentStatus.badge}`}
        >
          <span className={`w-2 h-2 rounded-full ${currentStatus.dot} animate-pulse`} />
          <span>{station.status}</span>
        </div>

        {/* Distance Badge */}
        <div className="absolute bottom-3 left-3 text-white text-xs font-bold flex items-center gap-1 bg-slate-900/60 backdrop-blur-md px-2.5 py-1 rounded-lg">
          <FiMapPin className="text-emerald-400" />
          <span>{station.distance}</span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-snug group-hover:text-emerald-500 transition-colors">
            {station.name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 font-medium">
            <FiMapPin className="shrink-0" />
            <span className="truncate">{station.location}</span>
          </p>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-2.5 mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Availability
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {station.availablePoints} / {station.totalPoints} Ports
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Tariff
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                ₹{station.pricePerKwh} / kWh
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Charging Speed
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <FiZap className="text-amber-500 w-3 h-3" />
                {station.chargingSpeed}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Support
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {station.acAvailable && station.dcAvailable
                  ? "AC & DC Fast"
                  : station.dcAvailable
                  ? "DC Fast"
                  : "AC Charging"}
              </span>
            </div>
          </div>

          {/* Connectors Tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {station.connectors.map((c) => (
              <span
                key={c}
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => navigate(`/booking?stationId=${station.id}`)}
          disabled={station.status === "Maintenance" || station.status === "Offline"}
          className={`w-full mt-4 py-3 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
            station.status === "Maintenance" || station.status === "Offline"
              ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
              : "bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black shadow-lg shadow-emerald-500/20 active:scale-98"
          }`}
        >
          <span>Book Charging Slot</span>
          <FiArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

export default StationCard;
