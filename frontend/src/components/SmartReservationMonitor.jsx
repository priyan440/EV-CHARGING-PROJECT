import {
  Zap,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from "lucide-react";

export default function SmartReservationMonitor({ metrics = {}, onCardClick }) {
  const {
    totalChargers = 0,
    availableCount = 0,
    reservedCount = 0,
    protectedCount = 0,
    chargingCount = 0,
    occupiedCount = 0,
    maintenanceCount = 0,
    upcomingReservationsCount = 0,
    activeChargingCount = 0,
    offlineArrivalsToday = 0,
    conflictsDetectedToday = 0,
    noShowsToday = 0,
    queueWaitingCount = 0,
  } = metrics;

  const statusCards = [
    {
      label: "Available",
      count: availableCount,
      color: "emerald",
      icon: "🟢",
      textColor: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
    },
    {
      label: "Reserved",
      count: reservedCount,
      color: "blue",
      icon: "🔵",
      textColor: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
    },
    {
      label: "Protected",
      count: protectedCount,
      color: "amber",
      icon: "🟡",
      textColor: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
    },
    {
      label: "Charging",
      count: chargingCount,
      color: "orange",
      icon: "🟠",
      textColor: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/20",
    },
    {
      label: "Occupied",
      count: occupiedCount,
      color: "red",
      icon: "🔴",
      textColor: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
    },
    {
      label: "Maintenance",
      count: maintenanceCount,
      color: "slate",
      icon: "⚫",
      textColor: "text-slate-500 dark:text-slate-400",
      bgColor: "bg-slate-500/10",
      borderColor: "border-slate-500/20",
    },
  ];

  const summaryKPIs = [
    {
      label: "Upcoming Reservations",
      value: upcomingReservationsCount,
      icon: Clock,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      key: "reservations",
    },
    {
      label: "Protected Chargers",
      value: protectedCount,
      icon: ShieldCheck,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      key: "protected",
    },
    {
      label: "Active Charging",
      value: activeChargingCount,
      icon: Zap,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      key: "charging",
    },
    {
      label: "Offline Arrivals",
      value: offlineArrivalsToday,
      icon: TrendingUp,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      key: "offline",
    },
    {
      label: "Conflicts Detected",
      value: conflictsDetectedToday,
      icon: AlertTriangle,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      key: "conflicts",
    },
    {
      label: "No-Shows Today",
      value: noShowsToday,
      icon: XCircle,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      key: "noshows",
    },
    {
      label: "Queue Waiting",
      value: queueWaitingCount,
      icon: Users,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
      key: "queue",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Live Station Status Strip */}
      <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
              LIVE STATION STATUS ({totalChargers} TOTAL CHARGERS)
            </h3>
          </div>
          <span className="text-xs font-bold text-[var(--text-muted)]">
            Auto-Sync 10s
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {statusCards.map((sc) => (
            <div
              key={sc.label}
              className={`p-3 rounded-xl ${sc.bgColor} border ${sc.borderColor} flex items-center justify-between transition hover:scale-102`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{sc.icon}</span>
                <span className="text-xs font-bold text-[var(--text-muted)]">{sc.label}</span>
              </div>
              <span className={`text-lg font-black font-mono ${sc.textColor}`}>
                {String(sc.count).padStart(2, "0")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Smart Reservation Monitor KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {summaryKPIs.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              onClick={() => onCardClick && onCardClick(kpi.key)}
              className="p-3.5 rounded-2xl bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/40 transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg ${kpi.bg} ${kpi.color} flex items-center justify-center`}>
                  <Icon size={16} />
                </div>
                <span className="text-lg font-black font-mono text-[var(--text-primary)] group-hover:scale-105 transition-transform">
                  {kpi.value}
                </span>
              </div>
              <div className="text-[11px] font-bold text-[var(--text-muted)] leading-snug">
                {kpi.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
