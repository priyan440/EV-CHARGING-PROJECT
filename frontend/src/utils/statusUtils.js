/**
 * EV CHARGING STATION MANAGEMENT SYSTEM
 * Central Canonical Status Display & Mapping Utilities (Frontend)
 */

export const getOwnerStatusBadge = (status) => {
  const s = (status || "").toUpperCase().trim();
  switch (s) {
    case "VERIFIED":
    case "ACTIVE":
      return {
        label: "Verified",
        bg: "bg-emerald-500/10",
        text: "text-emerald-500",
        border: "border-emerald-500/20",
        dot: "bg-emerald-500",
      };
    case "PENDING":
      return {
        label: "Pending Verification",
        bg: "bg-amber-500/10",
        text: "text-amber-500",
        border: "border-amber-500/20",
        dot: "bg-amber-500 animate-pulse",
      };
    case "REJECTED":
      return {
        label: "Rejected",
        bg: "bg-rose-500/10",
        text: "text-rose-500",
        border: "border-rose-500/20",
        dot: "bg-rose-500",
      };
    case "SUSPENDED":
      return {
        label: "Suspended",
        bg: "bg-orange-500/10",
        text: "text-orange-500",
        border: "border-orange-500/20",
        dot: "bg-orange-500",
      };
    case "INACTIVE":
      return {
        label: "Inactive",
        bg: "bg-slate-500/10",
        text: "text-slate-400",
        border: "border-slate-500/20",
        dot: "bg-slate-400",
      };
    default:
      return {
        label: s || "Unknown",
        bg: "bg-slate-500/10",
        text: "text-slate-400",
        border: "border-slate-500/20",
        dot: "bg-slate-400",
      };
  }
};

export const getStationApprovalBadge = (status) => {
  const s = (status || "").toUpperCase().trim();
  switch (s) {
    case "APPROVED":
      return {
        label: "Approved & Live",
        bg: "bg-emerald-500/10",
        text: "text-emerald-500",
        border: "border-emerald-500/20",
        dot: "bg-emerald-500",
      };
    case "PENDING":
      return {
        label: "Pending Review",
        bg: "bg-amber-500/10",
        text: "text-amber-500",
        border: "border-amber-500/20",
        dot: "bg-amber-500 animate-pulse",
      };
    case "REJECTED":
      return {
        label: "Rejected",
        bg: "bg-rose-500/10",
        text: "text-rose-500",
        border: "border-rose-500/20",
        dot: "bg-rose-500",
      };
    case "SUSPENDED":
      return {
        label: "Suspended",
        bg: "bg-orange-500/10",
        text: "text-orange-500",
        border: "border-orange-500/20",
        dot: "bg-orange-500",
      };
    default:
      return {
        label: s || "Unavailable",
        bg: "bg-slate-500/10",
        text: "text-slate-400",
        border: "border-slate-500/20",
        dot: "bg-slate-400",
      };
  }
};

export const getChargerStatusBadge = (status, isOnline = true, isSimulated = false) => {
  const s = (status || "").toUpperCase().trim();

  if (!isOnline && s !== "CHARGING" && !isSimulated) {
    return {
      label: "Offline (Stale)",
      bg: "bg-slate-500/15",
      text: "text-slate-400",
      border: "border-slate-500/30",
      dot: "bg-slate-400",
    };
  }

  switch (s) {
    case "AVAILABLE":
      return {
        label: "Available",
        bg: "bg-emerald-500/10",
        text: "text-emerald-500 dark:text-emerald-400",
        border: "border-emerald-500/30",
        dot: "bg-emerald-500",
      };
    case "CHARGING":
    case "IN_PROGRESS":
      return {
        label: isSimulated ? "Charging (Simulated)" : "Charging",
        bg: "bg-blue-500/10",
        text: "text-blue-500 dark:text-blue-400",
        border: "border-blue-500/30",
        dot: "bg-blue-500 animate-pulse",
      };
    case "RESERVED":
    case "PROTECTED":
      return {
        label: "Reserved",
        bg: "bg-amber-500/10",
        text: "text-amber-500 dark:text-amber-400",
        border: "border-amber-500/30",
        dot: "bg-amber-500",
      };
    case "OCCUPIED":
      return {
        label: "Occupied",
        bg: "bg-indigo-500/10",
        text: "text-indigo-500 dark:text-indigo-400",
        border: "border-indigo-500/30",
        dot: "bg-indigo-500",
      };
    case "FAULTED":
      return {
        label: "Faulted",
        bg: "bg-rose-500/10",
        text: "text-rose-500 dark:text-rose-400",
        border: "border-rose-500/30",
        dot: "bg-rose-500 animate-ping",
      };
    case "MAINTENANCE":
      return {
        label: "In Maintenance",
        bg: "bg-orange-500/10",
        text: "text-orange-500 dark:text-orange-400",
        border: "border-orange-500/30",
        dot: "bg-orange-500",
      };
    case "OFFLINE":
      return {
        label: "Offline",
        bg: "bg-slate-500/10",
        text: "text-slate-400",
        border: "border-slate-500/20",
        dot: "bg-slate-400",
      };
    case "UNAVAILABLE":
      return {
        label: "Unavailable",
        bg: "bg-zinc-500/10",
        text: "text-zinc-400",
        border: "border-zinc-500/20",
        dot: "bg-zinc-400",
      };
    default:
      return {
        label: s || "Unknown",
        bg: "bg-slate-500/10",
        text: "text-slate-400",
        border: "border-slate-500/20",
        dot: "bg-slate-400",
      };
  }
};

export const getPaymentStatusBadge = (status) => {
  const s = (status || "").toUpperCase().trim();
  switch (s) {
    case "SUCCESS":
    case "PAID":
      return {
        label: "Successful",
        bg: "bg-emerald-500/10",
        text: "text-emerald-500",
        border: "border-emerald-500/20",
        dot: "bg-emerald-500",
      };
    case "PENDING":
      return {
        label: "Pending",
        bg: "bg-amber-500/10",
        text: "text-amber-500",
        border: "border-amber-500/20",
        dot: "bg-amber-500",
      };
    case "FAILED":
      return {
        label: "Failed",
        bg: "bg-rose-500/10",
        text: "text-rose-500",
        border: "border-rose-500/20",
        dot: "bg-rose-500",
      };
    case "REFUNDED":
      return {
        label: "Refunded",
        bg: "bg-purple-500/10",
        text: "text-purple-500",
        border: "border-purple-500/20",
        dot: "bg-purple-500",
      };
    case "DISPUTED":
      return {
        label: "Disputed",
        bg: "bg-red-500/15",
        text: "text-red-600 dark:text-red-400",
        border: "border-red-500/30",
        dot: "bg-red-500",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        bg: "bg-slate-500/10",
        text: "text-slate-400",
        border: "border-slate-500/20",
        dot: "bg-slate-400",
      };
    default:
      return {
        label: s || "Unknown",
        bg: "bg-slate-500/10",
        text: "text-slate-400",
        border: "border-slate-500/20",
        dot: "bg-slate-400",
      };
  }
};

export const getIncidentSeverityBadge = (severity) => {
  const s = (severity || "").toUpperCase().trim();
  switch (s) {
    case "CRITICAL":
      return {
        label: "CRITICAL",
        bg: "bg-rose-500/20 text-rose-500 border-rose-500/40",
      };
    case "HIGH":
      return {
        label: "HIGH",
        bg: "bg-orange-500/20 text-orange-500 border-orange-500/40",
      };
    case "MEDIUM":
      return {
        label: "MEDIUM",
        bg: "bg-amber-500/20 text-amber-500 border-amber-500/40",
      };
    case "LOW":
    default:
      return {
        label: "LOW",
        bg: "bg-blue-500/20 text-blue-500 border-blue-500/40",
      };
  }
};

export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return "Never";
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "Unknown";
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 5) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
};

export default {
  getOwnerStatusBadge,
  getStationApprovalBadge,
  getChargerStatusBadge,
  getPaymentStatusBadge,
  getIncidentSeverityBadge,
  formatRelativeTime,
};
