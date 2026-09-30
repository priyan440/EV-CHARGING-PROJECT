import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

export default function ThemeToggle({ showLabel = true, className = "" }) {
  const { theme, toggleTheme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* Sliding Pill Switcher */}
      <div className="flex items-center p-1 rounded-2xl bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 shadow-inner transition-colors duration-200">
        <button
          type="button"
          onClick={() => setTheme("light")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
            !isDark
              ? "bg-white text-amber-600 shadow-md shadow-amber-500/10 font-extrabold"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
          title="Switch to White / Light Mode"
          aria-label="Light Theme"
        >
          <Sun size={14} className={!isDark ? "text-amber-500 fill-amber-500" : ""} />
          {showLabel && <span>Light</span>}
        </button>

        <button
          type="button"
          onClick={() => setTheme("dark")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
            isDark
              ? "bg-[var(--accent-primary)] text-white shadow-md shadow-blue-500/20 font-extrabold"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
          title="Switch to Dark / Night Mode"
          aria-label="Dark Theme"
        >
          <Moon size={14} className={isDark ? "text-white fill-white" : ""} />
          {showLabel && <span>Dark</span>}
        </button>
      </div>
    </div>
  );
}
