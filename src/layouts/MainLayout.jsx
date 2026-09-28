import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import MobileBottomNav from "../components/MobileBottomNav";
import { useTheme } from "../contexts/ThemeContext";

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen ${isDark ? "dark" : ""} bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-200`}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="md:pl-64 flex flex-col min-h-screen pb-16 md:pb-0">
        <Navbar
          onOpenSidebar={() => setSidebarOpen(true)}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />

        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>

        <MobileBottomNav />
      </div>
    </div>
  );
}
