import { useState, useEffect } from "react";
import { Sliders, ShieldCheck, Clock, Check, X, Save, AlertCircle } from "lucide-react";
import smartReservationService from "../services/smartReservationService";

export default function ReservationPolicyModal({
  isOpen,
  onClose,
  stationId = "global",
  onSaved,
}) {
  const [policy, setPolicy] = useState({
    protectionMinutes: 10,
    gracePeriodMinutes: 10,
    queueTimeoutMinutes: 5,
    maxAdvanceDays: 7,
    maxDurationHours: 4,
    cancellationWindowMins: 15,
    noShowPenaltyPct: 20,
    autoAssignQueue: true,
    allowOfflineBooking: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      smartReservationService
        .getReservationPolicy(stationId)
        .then((res) => {
          if (res?.policy) setPolicy(res.policy);
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, stationId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setIsSaving(true);
    setSaveMsg("");
    try {
      const res = await smartReservationService.updateReservationPolicy(stationId, policy);
      if (res.success) {
        setSaveMsg("Policy saved successfully!");
        if (onSaved) onSaved(res.policy);
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setSaveMsg(res.message || "Failed to update policy.");
      }
    } catch (err) {
      setSaveMsg(err.message || "Save error.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden text-[var(--text-primary)]">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600/20 via-blue-600/10 to-transparent p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-500 flex items-center justify-center shrink-0">
              <Sliders size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-[var(--text-primary)]">
                Smart Reservation Policy Settings
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Configure Protection Windows, Grace Periods & Auto-Release
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--bg-surface-raised)] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto custom-scrollbar">
          {saveMsg && (
            <div className={`p-3 rounded-xl flex items-center gap-2 font-semibold ${
              saveMsg.includes("success")
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                : "bg-red-500/10 text-red-500 border border-red-500/30"
            }`}>
              <AlertCircle size={15} />
              <span>{saveMsg}</span>
            </div>
          )}

          {/* Protection Before Booking */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-amber-500" />
                Reservation Protection Before Booking (Minutes)
              </label>
              <span className="font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                {policy.protectionMinutes} Mins
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Blocks walk-in / offline customers from taking this charger X minutes prior to an online reservation.
            </p>
            <input
              type="range"
              min={5}
              max={30}
              step={5}
              value={policy.protectionMinutes}
              onChange={(e) => setPolicy({ ...policy, protectionMinutes: parseInt(e.target.value, 10) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Grace Period After Booking Start */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Clock size={15} className="text-blue-500" />
                Grace Period for Online Check-In (Minutes)
              </label>
              <span className="font-mono font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">
                {policy.gracePeriodMinutes} Mins
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Time the customer has to arrive & check in before auto-marking as NO-SHOW and releasing the charger.
            </p>
            <input
              type="range"
              min={5}
              max={30}
              step={5}
              value={policy.gracePeriodMinutes}
              onChange={(e) => setPolicy({ ...policy, gracePeriodMinutes: parseInt(e.target.value, 10) })}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          {/* Smart Queue & Advance Limits */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[var(--text-muted)] mb-1">
                Queue Timeout (Mins)
              </label>
              <input
                type="number"
                min={2}
                max={20}
                value={policy.queueTimeoutMinutes}
                onChange={(e) => setPolicy({ ...policy, queueTimeoutMinutes: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-[var(--text-muted)] mb-1">
                Cancellation Window (Mins)
              </label>
              <input
                type="number"
                min={5}
                max={60}
                value={policy.cancellationWindowMins}
                onChange={(e) => setPolicy({ ...policy, cancellationWindowMins: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Toggle Options */}
          <div className="space-y-2 pt-2">
            <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] cursor-pointer">
              <span className="font-bold text-[var(--text-primary)]">
                Auto-Assign Released Chargers to Queue
              </span>
              <input
                type="checkbox"
                checked={policy.autoAssignQueue}
                onChange={(e) => setPolicy({ ...policy, autoAssignQueue: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] cursor-pointer">
              <span className="font-bold text-[var(--text-primary)]">
                Allow Offline Walk-In Assignments
              </span>
              <input
                type="checkbox"
                checked={policy.allowOfflineBooking}
                onChange={(e) => setPolicy({ ...policy, allowOfflineBooking: e.target.checked })}
                className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
              />
            </label>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-bold text-[var(--text-muted)] hover:bg-[var(--bg-surface-raised)] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-md shadow-blue-500/25 flex items-center gap-2 transition cursor-pointer"
            >
              <Save size={15} />
              <span>{isSaving ? "Saving..." : "Save Policy"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
