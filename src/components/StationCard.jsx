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
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
      {/* Top Banner Image with Status Badge */}
      <div className="relative h-44 overflow-hidden bg-slate-800">
        <img
          src={station.image}
          alt={station.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

        {/* Station ID Tag */}
        <span className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md text-white font-mono text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-700">
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
          <FiMapPin className="text-[var(--accent-primary)]" />
          <span>{station.distance}</span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-lg text-[var(--text-primary)] leading-snug group-hover:text-[var(--accent-primary)] transition-colors">
            {station.name}
          </h3>
          <p className="text-sm text-[var(--text-muted)] mt-1 flex items-center gap-1 font-medium">
            <FiMapPin className="shrink-0" />
            <span className="truncate">{station.location}</span>
          </p>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-2.5 mt-4 p-3 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
            <div>
              <span className="text-xs text-[var(--text-muted)] uppercase font-bold block">
                Availability
              </span>
              <span className="text-sm font-bold text-[var(--text-primary)]">
                {station.availablePoints} / {station.totalPoints} Ports
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)] uppercase font-bold block">
                  Tariff
                </span>
                {station.priceBadge && station.priceBadgeType !== "standard" && (
                  <span
                    className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border ${
                      station.priceBadgeType === "peak"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    }`}
                  >
                    {station.priceBadge}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-sm font-bold text-[var(--accent-primary)]">
                  ₹{station.pricePerKwh || 18} / kWh
                </span>
                {station.basePricePerKwh && Number(station.pricePerKwh) !== Number(station.basePricePerKwh) && (
                  <span className="text-xs text-[var(--text-muted)] line-through">
                    ₹{station.basePricePerKwh}
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="text-xs text-[var(--text-muted)] uppercase font-bold block">
                Charging Speed
              </span>
              <span className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1">
                <FiZap className="text-amber-500 w-3.5 h-3.5" />
                {station.chargingSpeed}
              </span>
            </div>

            <div>
              <span className="text-xs text-[var(--text-muted)] uppercase font-bold block">
                Support
              </span>
              <span className="text-sm font-bold text-[var(--text-primary)]">
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
                className="text-xs font-medium px-2 py-0.5 rounded-md bg-[var(--bg-surface-raised)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
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
          className={`w-full mt-4 py-3 px-4 rounded-2xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
            station.status === "Maintenance" || station.status === "Offline"
              ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
              : "bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-bold shadow-md shadow-blue-500/20 active:scale-98"
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
