import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import MobileBottomNav from "../components/MobileBottomNav";

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("ev_theme") !== "light";
  });

  const toggleTheme = () => {
    const nextTheme = isDark ? "light" : "dark";
    setIsDark(!isDark);
    localStorage.setItem("ev_theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? "dark bg-[#070D1E] text-slate-100" : "bg-slate-50 text-slate-900"} transition-colors duration-200`}>
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
