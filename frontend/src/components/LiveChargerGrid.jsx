import { useState } from "react";
import {
  Zap,
  Clock,
  User,
  Car,
  ShieldCheck,
  AlertTriangle,
  Play,
  CheckCircle2,
  XCircle,
  Wrench,
  MoreVertical,
  Activity,
  ArrowRight,
} from "lucide-react";

export default function LiveChargerGrid({
  chargers = [],
  onSelectCharger,
  onOpenOfflineCheckIn,
  onCheckInBooking,
  onReleaseSlot,
  onOpenOverride,
  userRole = "STATION_OWNER",
}) {
  const [selectedCharger, setSelectedCharger] = useState(null);

  const getStatusBadge = (status, occupant) => {
    switch (status) {
      case "AVAILABLE":
        return {
          icon: "🟢",
          text: "AVAILABLE",
          badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          cardBorder: "border-emerald-500/30 hover:border-emerald-500/60",
          glow: "group-hover:shadow-emerald-500/10",
        };
      case "RESERVED":
        return {
          icon: "🔵",
          text: occupant?.startTime ? `RESERVED ${occupant.startTime.slice(0, 5)}` : "RESERVED",
          badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
          cardBorder: "border-blue-500/30 hover:border-blue-500/60",
          glow: "group-hover:shadow-blue-500/10",
        };
      case "PROTECTED":
        return {
          icon: "🟡",
          text: occupant?.startTime ? `PROTECTED ${occupant.startTime.slice(0, 5)}` : "PROTECTED",
          badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
          cardBorder: "border-amber-500/40 hover:border-amber-500/70",
          glow: "group-hover:shadow-amber-500/10",
        };
      case "CHARGING":
        return {
          icon: "🟠",
          text: "CHARGING",
          badge: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
          cardBorder: "border-orange-500/40 hover:border-orange-500/70",
          glow: "group-hover:shadow-orange-500/10",
        };
      case "OCCUPIED":
        return {
          icon: "🔴",
          text: "OCCUPIED",
          badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
          cardBorder: "border-rose-500/30 hover:border-rose-500/60",
          glow: "group-hover:shadow-rose-500/10",
        };
      case "MAINTENANCE":
        return {
          icon: "⚫",
          text: "MAINTENANCE",
          badge: "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/30",
          cardBorder: "border-slate-500/30 hover:border-slate-500/60",
          glow: "",
        };
      default:
        return {
          icon: "⚪",
          text: status || "AVAILABLE",
          badge: "bg-slate-500/10 text-slate-400 border-slate-500/20",
          cardBorder: "border-[var(--border-subtle)]",
          glow: "",
        };
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {chargers.map((c) => {
          const cfg = getStatusBadge(c.status, c.occupant);
          const isBusy = ["CHARGING", "OCCUPIED", "PROTECTED", "RESERVED"].includes(c.status);

          return (
            <div
              key={c.id || c.slotId}
              onClick={() => {
                setSelectedCharger(c);
                if (onSelectCharger) onSelectCharger(c);
              }}
              className={`p-5 rounded-2xl bg-[var(--bg-surface)] border ${cfg.cardBorder} shadow-sm hover:shadow-xl ${cfg.glow} transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden`}
            >
              {/* Top Row: Charger ID & Live Badge */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex items-center justify-center font-mono font-black text-sm text-[var(--text-primary)] group-hover:scale-105 transition-transform">
                    {c.slotNumber || `C${c.id}`}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      {c.bayNumber || `Bay #${c.id}`}
                    </div>
                    <div className="text-sm font-black text-[var(--text-primary)]">
                      {c.powerKw} kW <span className="text-xs font-normal text-[var(--text-muted)]">({c.chargerType === "AC" ? "AC" : "DC Fast"})</span>
                    </div>
                  </div>
                </div>

                <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded-lg border flex items-center gap-1.5 ${cfg.badge}`}>
                  <span>{cfg.icon}</span>
                  <span>{cfg.text}</span>
                </span>
              </div>

              {/* Occupant / Reservation Details Banner */}
              {c.occupant ? (
                <div className="p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-1.5 mb-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)] truncate max-w-[120px]">
                      <User size={13} className="text-[var(--text-muted)] shrink-0" />
                      <span>{c.occupant.customerName}</span>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">
                      {c.occupant.bookingId}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[var(--text-muted)] text-[11px]">
                    <div className="flex items-center gap-1 font-mono">
                      <Car size={12} />
                      <span>{c.occupant.vehicleNumber}</span>
                    </div>
                    {c.timeRemainingMinutes > 0 && (
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                        <Clock size={12} />
                        <span>{c.timeRemainingMinutes}m left</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-dashed border-[var(--border-subtle)] mb-3 text-xs text-[var(--text-muted)] flex items-center justify-between">
                  <span>Connector: {c.connectorType}</span>
                  <span className="text-emerald-500 font-bold">Ready</span>
                </div>
              )}

              {/* Card Footer Quick Actions */}
              <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                {c.status === "AVAILABLE" ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenOfflineCheckIn) onOpenOfflineCheckIn(c);
                    }}
                    className="w-full py-1.5 px-3 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Walk-In Check-In</span>
                    <ArrowRight size={13} />
                  </button>
                ) : c.status === "PROTECTED" || c.status === "RESERVED" ? (
                  <div className="w-full flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onCheckInBooking && c.occupant?.bookingId) {
                          onCheckInBooking(c.occupant.bookingId);
                        }
                      }}
                      className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>Check-In</span>
                    </button>
                    {onOpenOverride && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenOverride && c.occupant?.bookingId) {
                            onOpenOverride(c.occupant.bookingId, c);
                          }
                        }}
                        className="py-1.5 px-2 rounded-lg text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 border border-red-500/20 transition cursor-pointer"
                      >
                        Override
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onReleaseSlot) onReleaseSlot(c);
                    }}
                    className="w-full py-1.5 px-3 rounded-lg text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Manage Slot</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
