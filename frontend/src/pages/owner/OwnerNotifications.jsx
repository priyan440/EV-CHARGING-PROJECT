import { useState, useEffect } from "react";
import {
  Bell,
  CheckCheck,
  Zap,
  AlertTriangle,
  Wrench,
  DollarSign,
  Calendar,
  Info,
  ShieldAlert,
  Clock,
  Filter,
  RefreshCw,
  CheckCircle2
} from "lucide-react";
import { getOwnerNotifications, markNotificationAsRead } from "../../services/ownerService";
import { useSocket } from "../../contexts/SocketContext";

export default function OwnerNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL"); // ALL, UNREAD, BOOKING, CHARGER, PAYMENT, MAINTENANCE
  const [markingId, setMarkingId] = useState(null);
  const { socket } = useSocket();

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await getOwnerNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
    };

    socket.on("notification", handleNewNotification);
    socket.on("new_notification", handleNewNotification);
    socket.on("fault_alert", handleNewNotification);

    return () => {
      socket.off("notification", handleNewNotification);
      socket.off("new_notification", handleNewNotification);
      socket.off("fault_alert", handleNewNotification);
    };
  }, [socket]);

  const handleMarkAsRead = async (id) => {
    try {
      setMarkingId(id);
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id || n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    for (const n of unread) {
      try {
        await markNotificationAsRead(n._id || n.id);
      } catch (e) {
        console.error(e);
      }
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const getIcon = (type, severity) => {
    switch (type) {
      case "BOOKING":
        return <Calendar className="w-5 h-5 text-indigo-400" />;
      case "CHARGER":
      case "SESSION":
        return <Zap className="w-5 h-5 text-emerald-400" />;
      case "PAYMENT":
        return <DollarSign className="w-5 h-5 text-emerald-400" />;
      case "MAINTENANCE":
        return <Wrench className="w-5 h-5 text-amber-400" />;
      case "FAULT":
      case "CRITICAL":
        return <AlertTriangle className="w-5 h-5 text-rose-500" />;
      default:
        return severity === "CRITICAL" ? (
          <ShieldAlert className="w-5 h-5 text-rose-500" />
        ) : (
          <Info className="w-5 h-5 text-cyan-400" />
        );
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "UNREAD") return !n.read;
    if (filter === "ALL") return true;
    return n.type === filter || (n.category && n.category === filter);
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Bell className="w-6 h-6" />
            </span>
            Notification Center
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Real-time alerts, operational updates, and system notifications persisted in MySQL.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-2"
            >
              <CheckCheck className="w-4 h-4 text-emerald-500" />
              Mark All as Read ({unreadCount})
            </button>
          )}

          <button
            onClick={loadNotifications}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin text-emerald-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: "ALL", label: `All (${notifications.length})` },
          { id: "UNREAD", label: `Unread (${unreadCount})` },
          { id: "BOOKING", label: "Bookings" },
          { id: "CHARGER", label: "Chargers & Sessions" },
          { id: "PAYMENT", label: "Payments" },
          { id: "MAINTENANCE", label: "Maintenance & Faults" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              filter === tab.id
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Fetching notifications from MySQL...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">All Caught Up!</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            No notifications found matching the selected filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((n) => {
            const id = n._id || n.id;
            const isUnread = !n.read;
            const isCritical = n.severity === "CRITICAL" || n.severity === "HIGH";

            return (
              <div
                key={id}
                className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                  isUnread
                    ? isCritical
                      ? "bg-rose-500/5 dark:bg-rose-950/20 border-rose-500/30 shadow-sm"
                      : "bg-indigo-500/5 dark:bg-indigo-950/20 border-indigo-500/30 shadow-sm"
                    : "bg-white dark:bg-[#0B1329] border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 shrink-0 mt-0.5">
                    {getIcon(n.type, n.severity)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-sm font-bold ${isUnread ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"}`}>
                        {n.title || "Station Alert"}
                      </h4>
                      {isUnread && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500 text-white">
                          New
                        </span>
                      )}
                      {n.severity && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            n.severity === "CRITICAL"
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : n.severity === "HIGH"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          }`}
                        >
                          {n.severity}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {n.message || n.description}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {n.createdAt ? new Date(n.createdAt).toLocaleString() : "Just now"}
                      </span>
                      {n.stationId && (
                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                          Station: {n.stationId?.stationName || n.stationId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isUnread && (
                  <button
                    onClick={() => handleMarkAsRead(id)}
                    disabled={markingId === id}
                    className="shrink-0 p-2 rounded-xl text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition text-xs font-bold flex items-center gap-1.5"
                    title="Mark as Read"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span className="hidden sm:inline">Mark Read</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
