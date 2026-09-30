import { useState } from "react";
import { AlertTriangle, ShieldAlert, X, ArrowRight } from "lucide-react";
import smartReservationService from "../services/smartReservationService";

export default function ManualOverrideModal({
  isOpen,
  onClose,
  bookingId,
  chargerData,
  onSuccess,
}) {
  const [reason, setReason] = useState("");
  const [overrideAction, setOverrideAction] = useState("CANCEL_AND_RELEASE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen || !bookingId) return null;

  const presetReasons = [
    "Customer requested cancellation via phone",
    "Emergency priority EV charging required",
    "Charger hardware malfunction reported",
    "Customer contacted station indicating delay",
    "System error / double assignment resolution",
  ];

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!reason || reason.trim().length < 5) {
      setErrorMsg("A detailed justification reason is required to perform an override.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await smartReservationService.manualOverride(
        bookingId,
        reason.trim(),
        overrideAction,
        overrideAction === "CANCEL_AND_RELEASE" ? "CANCELLED" : "AVAILABLE"
      );

      if (res.success) {
        alert(`Reservation ${bookingId} overridden successfully. Action logged in audit logs.`);
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(res.message || "Manual override failed.");
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to execute manual override.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[var(--bg-surface)] border border-red-500/40 rounded-2xl shadow-2xl overflow-hidden text-[var(--text-primary)]">
        {/* Header with Red Warning Glow */}
        <div className="bg-gradient-to-r from-red-600/20 via-orange-600/10 to-transparent p-5 border-b border-red-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 text-red-500 flex items-center justify-center shrink-0">
              <ShieldAlert size={22} />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-500 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20">
                Audited Administrative Action
              </span>
              <h2 className="text-base font-black text-[var(--text-primary)] mt-0.5">
                Manual Reservation Override
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg hover:bg-[var(--bg-surface-raised)] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 font-semibold flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-1">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Target Booking:</span>
              <span className="font-mono font-bold text-blue-500">{bookingId}</span>
            </div>
            {chargerData && (
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Target Charger:</span>
                <span className="font-bold text-[var(--text-primary)]">{chargerData.slotNumber || `Slot #${chargerData.id}`}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              Select Preset Reason
            </label>
            <div className="space-y-1.5 mb-2">
              {presetReasons.map((pr) => (
                <button
                  type="button"
                  key={pr}
                  onClick={() => setReason(pr)}
                  className={`w-full text-left p-2 rounded-lg text-[11px] border transition cursor-pointer ${
                    reason === pr
                      ? "bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-400 font-bold"
                      : "bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {pr}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              Detailed Justification Reason *
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the operational reason for this override..."
              className="w-full p-2.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] focus:border-red-500 focus:outline-none text-[var(--text-primary)] resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-bold text-[var(--text-muted)] hover:bg-[var(--bg-surface-raised)] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl font-bold bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/25 flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Overriding..." : "Confirm Override & Log"}
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
