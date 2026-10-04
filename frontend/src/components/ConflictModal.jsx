import { useState } from "react";
import {
  AlertTriangle,
  Zap,
  Clock,
  User,
  Car,
  CheckCircle2,
  Users,
  ShieldAlert,
  ArrowRight,
  X,
} from "lucide-react";

export default function ConflictModal({
  isOpen,
  onClose,
  conflictData,
  onSelectAlternative,
  onJoinQueue,
  onOpenOverride,
  userRole = "STATION_OWNER",
}) {
  if (!isOpen || !conflictData) return null;

  const {
    message = "Charger is protected for an online booking.",
    reservationDetails = {},
    recommendedChargers = [],
    conflictType,
  } = conflictData;

  const canOverride = ["ADMIN", "STATION_OWNER", "OWNER"].includes((userRole || "").toUpperCase());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-[var(--bg-surface)] border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden text-[var(--text-primary)]">
        {/* Header with Amber Glow */}
        <div className="bg-gradient-to-r from-amber-600/20 via-orange-600/15 to-transparent p-5 border-b border-amber-500/20 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 shrink-0 shadow-lg shadow-amber-500/10">
              <AlertTriangle size={26} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  ⚠️ Smart Reservation Conflict
                </span>
              </div>
              <h2 className="text-lg font-black text-[var(--text-primary)] mt-1">
                Protected Online Reservation
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--bg-surface-raised)] transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Main Notice Banner */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <ShieldAlert size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                {message}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                System priority rule prevents accidental assignment of reserved bays to walk-in customers within the protection window.
              </p>
            </div>
          </div>

          {/* Reserved Customer Details Card */}
          {reservationDetails && (
            <div className="p-4 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center justify-between">
                <span>Online Reservation Details</span>
                <span className="font-mono text-blue-600 dark:text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  {reservationDetails.bookingId || "EV001"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <User size={15} className="text-[var(--text-muted)]" />
                  <div>
                    <div className="text-[var(--text-muted)]">Customer</div>
                    <div className="font-bold text-[var(--text-primary)]">
                      {reservationDetails.customerName || "Online User"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-[var(--text-muted)]" />
                  <div>
                    <div className="text-[var(--text-muted)]">Reserved Slot</div>
                    <div className="font-bold text-[var(--text-primary)]">
                      {reservationDetails.reservedTime || reservationDetails.startTime || "10:00 AM"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Car size={15} className="text-[var(--text-muted)]" />
                  <div>
                    <div className="text-[var(--text-muted)]">Vehicle</div>
                    <div className="font-bold text-[var(--text-primary)] font-mono">
                      {reservationDetails.vehicleNumber || "N/A"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Zap size={15} className="text-amber-500" />
                  <div>
                    <div className="text-[var(--text-muted)]">Arrival Protection</div>
                    <div className="font-bold text-amber-600 dark:text-amber-400">
                      {reservationDetails.protectionMinutes || 10} min buffer
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recommended Alternative Chargers */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                <Zap size={16} className="text-emerald-500" />
                Recommended Available Chargers
              </h3>
              <span className="text-xs text-[var(--text-muted)] font-medium">
                {recommendedChargers.length} compatible alternative{recommendedChargers.length !== 1 ? "s" : ""}
              </span>
            </div>

            {recommendedChargers.length === 0 ? (
              <div className="p-4 rounded-xl bg-[var(--bg-surface-raised)] text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)]">
                All chargers currently occupied or reserved. You can add this customer to the Smart Queue.
              </div>
            ) : (
              <div className="space-y-2">
                {recommendedChargers.map((alt) => (
                  <div
                    key={alt.id || alt.slotId}
                    className="p-3.5 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface-overlay)] border border-[var(--border-subtle)] hover:border-emerald-500/40 flex items-center justify-between gap-3 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black font-mono text-sm ${
                          alt.isAvailable
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {alt.slotNumber || `C${alt.slotId}`}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[var(--text-primary)]">
                            {alt.slotNumber || `Charger #${alt.slotId}`}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                              alt.isAvailable
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {alt.isAvailable ? "🟢 Available" : `🟡 ${alt.statusLabel}`}
                          </span>
                        </div>

                        <div className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-2">
                          <span>{alt.powerKw} kW {alt.chargerType === "AC" ? "AC" : "DC"}</span>
                          <span>•</span>
                          <span>{alt.connectorType}</span>
                          <span>•</span>
                          <span>Wait: {alt.estimatedWaitMinutes || 0} min</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectAlternative(alt)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition cursor-pointer group-hover:scale-105"
                    >
                      <span>Assign {alt.slotNumber || `C${alt.slotId}`}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[var(--bg-surface-raised)] border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onJoinQueue && (
              <button
                onClick={onJoinQueue}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-overlay)] border border-[var(--border-subtle)] flex items-center gap-1.5 transition cursor-pointer"
              >
                <Users size={14} className="text-blue-500" />
                <span>Join Smart Queue</span>
              </button>
            )}

            {canOverride && onOpenOverride && (
              <button
                onClick={onOpenOverride}
                className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 border border-red-500/20 transition cursor-pointer"
              >
                Manual Override
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-overlay)] transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
