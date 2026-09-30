import { useState } from "react";
import {
  Users,
  Clock,
  Car,
  User,
  Zap,
  ArrowRight,
  XCircle,
  Plus,
  CheckCircle2,
} from "lucide-react";

export default function QueueManagementCard({
  queue = [],
  availableChargers = [],
  onAssignQueue,
  onLeaveQueue,
  onOpenJoinQueue,
}) {
  const [assigningId, setAssigningId] = useState(null);
  const [selectedSlotForQueue, setSelectedSlotForQueue] = useState({});

  return (
    <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
            <Users size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider">
              Smart Station Queue
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {queue.length} Customer{queue.length !== 1 ? "s" : ""} waiting for available charger
            </p>
          </div>
        </div>

        {onOpenJoinQueue && (
          <button
            onClick={onOpenJoinQueue}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--accent-primary)] hover:bg-blue-600 text-white shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>Add to Queue</span>
          </button>
        )}
      </div>

      {/* Queue List */}
      {queue.length === 0 ? (
        <div className="p-6 rounded-xl bg-[var(--bg-surface-raised)] border border-dashed border-[var(--border-subtle)] text-center text-xs text-[var(--text-muted)]">
          No customers currently in the waiting queue.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto custom-scrollbar">
          {queue.map((item, idx) => (
            <div
              key={item.id || item.queue_token}
              className="p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex items-center justify-between gap-3 transition hover:border-cyan-500/40"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-mono font-black text-xs flex items-center justify-center border border-cyan-500/30">
                  #{item.position || idx + 1}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {item.customer_name}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--bg-surface)] text-cyan-600 dark:text-cyan-400 border border-[var(--border-subtle)]">
                      {item.queue_token}
                    </span>
                  </div>

                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5 flex items-center gap-2 font-mono">
                    <span>{item.vehicle_number}</span>
                    <span>•</span>
                    <span>{item.connector_type || "CCS2"}</span>
                    <span>•</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                      <Clock size={11} />
                      ~{item.estimated_wait_minutes || 15}m wait
                    </span>
                  </div>
                </div>
              </div>

              {/* Assignment Controls */}
              <div className="flex items-center gap-2">
                {availableChargers.length > 0 && onAssignQueue && (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={selectedSlotForQueue[item.id] || availableChargers[0]?.id}
                      onChange={(e) =>
                        setSelectedSlotForQueue({
                          ...selectedSlotForQueue,
                          [item.id]: e.target.value,
                        })
                      }
                      className="px-2 py-1 rounded-lg text-[11px] font-bold bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
                    >
                      {availableChargers.map((ac) => (
                        <option key={ac.id} value={ac.id}>
                          {ac.slotNumber} ({ac.powerKw}kW)
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => {
                        const targetSlot =
                          selectedSlotForQueue[item.id] || availableChargers[0]?.id;
                        if (onAssignQueue) onAssignQueue(item.id, targetSlot);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>Assign</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                )}

                {onLeaveQueue && (
                  <button
                    onClick={() => onLeaveQueue(item.id)}
                    className="p-1 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                    title="Dismiss / Cancel"
                  >
                    <XCircle size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
