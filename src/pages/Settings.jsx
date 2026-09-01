import React, { useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import Toast from "../components/Toast";
import {
  FiSettings,
  FiMoon,
  FiSun,
  FiBell,
  FiGlobe,
  FiShield,
  FiCheckCircle,
} from "react-icons/fi";

function Settings() {
  const { theme, toggleTheme, setTheme } = useTheme();

  const [notifications, setNotifications] = useState({
    bookingSMS: true,
    emailAlerts: true,
    gracePeriodReminder: true,
  });

  const [language, setLanguage] = useState("en");
  const [toast, setToast] = useState({ message: "", type: "success" });

  const handleSaveSettings = () => {
    setToast({ message: "Settings saved successfully!", type: "success" });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          System Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Customize interface themes, notification preferences, and system parameters
        </p>
      </div>

      {/* Appearance Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <FiMoon className="text-emerald-500" />
          <span>Appearance & Theme System</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`p-5 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
              theme === "dark"
                ? "bg-slate-900 border-emerald-500 text-white shadow-md ring-2 ring-emerald-500/20"
                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <FiMoon className="w-6 h-6 text-amber-400" />
              <div>
                <span className="font-bold text-xs block">Futuristic Dark Mode</span>
                <span className="text-[10px] text-slate-400">
                  Recommended for EV terminal UI
                </span>
              </div>
            </div>
            {theme === "dark" && <FiCheckCircle className="text-emerald-500" />}
          </button>

          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`p-5 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
              theme === "light"
                ? "bg-white border-emerald-500 text-slate-900 shadow-md ring-2 ring-emerald-500/20"
                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <FiSun className="w-6 h-6 text-amber-500" />
              <div>
                <span className="font-bold text-xs block">Clean Light Mode</span>
                <span className="text-[10px] text-slate-500">Bright daylight interface</span>
              </div>
            </div>
            {theme === "light" && <FiCheckCircle className="text-emerald-500" />}
          </button>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <FiBell className="text-emerald-500" />
          <span>Notification & Alert Preferences</span>
        </h3>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 cursor-pointer">
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">
                Booking SMS Alerts
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Receive instant Booking ID confirmation SMS on registered mobile
              </span>
            </div>
            <input
              type="checkbox"
              checked={notifications.bookingSMS}
              onChange={(e) =>
                setNotifications((prev) => ({ ...prev, bookingSMS: e.target.checked }))
              }
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 cursor-pointer">
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">
                Email Receipts & Invoices
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Receive PDF receipts after completing charging sessions
              </span>
            </div>
            <input
              type="checkbox"
              checked={notifications.emailAlerts}
              onChange={(e) =>
                setNotifications((prev) => ({ ...prev, emailAlerts: e.target.checked }))
              }
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 cursor-pointer">
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">
                15-Minute Grace Period Reminder
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Notify 10 mins prior to slot start time to ensure timely arrival
              </span>
            </div>
            <input
              type="checkbox"
              checked={notifications.gracePeriodReminder}
              onChange={(e) =>
                setNotifications((prev) => ({
                  ...prev,
                  gracePeriodReminder: e.target.checked,
                }))
              }
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Language Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <FiGlobe className="text-emerald-500" />
          <span>Language Preference</span>
        </h3>

        <div className="max-w-xs">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
          >
            <option value="en">English (United States)</option>
            <option value="ta">Tamil (தமிழ்)</option>
            <option value="hi">Hindi (हिंदी)</option>
            <option value="es">Spanish (Español)</option>
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSaveSettings}
        className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition cursor-pointer"
      >
        SAVE SETTINGS PREFERENCES
      </button>
    </div>
  );
}

export default Settings;
