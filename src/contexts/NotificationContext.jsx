import { createContext, useContext, useState, useEffect } from "react";

const NotificationContext = createContext();

const INITIAL_NOTIFICATIONS = [
  {
    id: "NOTIF001",
    title: "Booking Confirmed",
    message: "Your booking BK000001 at GreenCharge Central Hub is confirmed for 10:00 AM.",
    type: "Booking Confirmed",
    targetRole: "CUSTOMER",
    counterId: "CUS0001",
    isRead: false,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "NOTIF002",
    title: "Station Registration Pending",
    message: "Station Owner OWNER0001 registered a new station STA001 awaiting approval.",
    type: "Owner Approval",
    targetRole: "ADMIN",
    isRead: false,
    timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "NOTIF003",
    title: "Charger Occupied",
    message: "Charger CHG0003 is currently occupied for charging session SES000001.",
    type: "Station Status",
    targetRole: "STATION_OWNER",
    isRead: true,
    timestamp: new Date(Date.now() - 14400000).toISOString(),
  },
];

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("ev_notifications");
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  useEffect(() => {
    localStorage.setItem("ev_notifications", JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = (notif) => {
    const newNotif = {
      id: `NOTIF${Date.now()}`,
      isRead: false,
      timestamp: new Date().toISOString(),
      ...notif,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const deleteNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getUnreadCount = (role, counterId) => {
    return notifications.filter((n) => {
      if (n.isRead) return false;
      if (n.targetRole && n.targetRole !== "ALL" && n.targetRole !== role) return false;
      if (n.counterId && counterId && n.counterId !== counterId) return false;
      return true;
    }).length;
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        getUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
