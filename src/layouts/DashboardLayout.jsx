import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSystemState } from '../contexts/SystemStateContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiHome, FiCpu, FiUsers, FiMapPin, FiCalendar, FiCheckSquare, 
  FiFileText, FiSettings, FiUser, FiLogOut, FiMenu, FiX, 
  FiCloudDrizzle, FiAlertOctagon, FiBell, FiAward, FiMessageSquare,
  FiNavigation, FiDollarSign, FiZap, FiShield, FiActivity, FiType
} from 'react-icons/fi';
import AnimatedBG from '../components/AnimatedBG';
import VoltBotChatbot from '../components/VoltBotChatbot';

const DashboardLayout = ({ children, activeTab, setActiveTab }) => {
  const { user, logout, loginAsRole } = useAuth();
  const { smartStats } = useSystemState();
  const { fontSize, setFontSize } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [fontSizeMenuOpen, setFontSizeMenuOpen] = useState(false);

  const mockNotifications = [
    { id: 1, title: 'Booking Confirmed', desc: 'Slot BK000001 confirmed at downtown HQ.', type: 'info', time: '5m ago' },
    { id: 2, title: 'Maintenance Alert', desc: 'Charger ST002-C03 has overheated.', type: 'warning', time: '30m ago' },
    { id: 3, title: 'Payment Success', desc: 'Invoice INV000002 was paid successfully.', type: 'success', time: '1h ago' }
  ];

  if (!user) return null;

  const getNavItems = () => {
    switch (user.role) {
      case 'superadmin':
        return [
          { id: 'overview', name: 'System Analytics', icon: FiHome },
          { id: 'stations', name: 'Manage Stations', icon: FiMapPin },
          { id: 'personnel', name: 'Staff Management', icon: FiUsers },
          { id: 'complaints', name: 'Customer Feedbacks', icon: FiMessageSquare },
          { id: 'settings', name: 'System Settings', icon: FiSettings },
        ];
      case 'manager':
        return [
          { id: 'overview', name: 'Station Overview', icon: FiHome },
          { id: 'powergrid', name: 'Smart Grid & Solar', icon: FiZap },
          { id: 'bookings', name: 'Booking Approvals', icon: FiCalendar },
          { id: 'slots', name: 'Charger Queue', icon: FiCpu },
          { id: 'maintenance', name: 'Maintenance Log', icon: FiCheckSquare },
        ];
      case 'customer':
        return [
          { id: 'overview', name: 'My Dashboard', icon: FiHome },
          { id: 'book', name: 'Book Charging Slot', icon: FiMapPin },
          { id: 'route', name: 'EV Trip Planner', icon: FiNavigation },
          { id: 'tariff', name: 'Tariff Estimator', icon: FiDollarSign },
          { id: 'history', name: 'Booking History', icon: FiCalendar },
          { id: 'charge', name: 'Charging Simulator', icon: FiCpu },
          { id: 'billing', name: 'Invoices & Payments', icon: FiFileText },
          { id: 'support', name: 'Emergency Support', icon: FiAlertOctagon },
        ];
      case 'technician':
        return [
          { id: 'overview', name: 'Assigned Repairs', icon: FiCpu },
          { id: 'diagnostics', name: 'Hardware Telemetry', icon: FiActivity },
          { id: 'inventory', name: 'Spare Parts Stock', icon: FiSettings },
          { id: 'calendar', name: 'Schedule Calendar', icon: FiCalendar },
        ];
      case 'security':
        return [
          { id: 'overview', name: 'QR & ALPR Gate', icon: FiCheckSquare },
          { id: 'incidents', name: 'Security Incidents', icon: FiAlertOctagon },
          { id: 'logs', name: 'Entry/Exit Logs', icon: FiFileText },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const handleRoleSwitch = (roleName) => {
    loginAsRole(roleName);
    setActiveTab('overview');
    setRoleSwitcherOpen(false);
  };

  return (
    <div className="min-h-screen relative text-slate-900 bg-[#F8FAFC]">
      {/* Blue & White Ambient Canvas */}
      <AnimatedBG />

      {/* Sidebar for Desktop */}
      <div className={`fixed top-0 left-0 h-full bg-[#0F172A] text-white z-30 transition-all duration-300 flex flex-col shadow-xl ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        {/* Brand Logo */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-blue-500 text-2xl font-bold tracking-widest animate-pulse">⚡</span>
            {sidebarOpen && (
              <span className="font-black text-lg tracking-wider text-white">
                VOLT<span className="text-blue-500">CHARGE</span>
              </span>
            )}
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-white transition cursor-pointer hidden md:block">
            {sidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
        </div>

        {/* User Card */}
        {sidebarOpen && (
          <div className="p-4 border-b border-slate-800 bg-slate-950/50 m-3 rounded-2xl">
            <div className="flex items-center gap-3">
              <img src={user.avatar} alt="Avatar" className="w-10 h-10 rounded-xl border border-blue-500/40 bg-slate-800" />
              <div className="overflow-hidden">
                <h4 className="text-sm font-bold truncate max-w-[140px] text-white">{user.name}</h4>
                <span className="text-xs text-blue-400 capitalize font-semibold">{user.role}</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer text-sm font-semibold ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                {sidebarOpen && <span>{item.name}</span>}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Logout */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition cursor-pointer font-semibold text-sm"
          >
            <FiLogOut size={18} />
            {sidebarOpen && <span>Terminate Session</span>}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`min-h-screen transition-all duration-300 flex flex-col ${sidebarOpen ? 'pl-0 md:pl-64' : 'pl-0 md:pl-20'}`}>
        
        {/* Header bar */}
        <header className="h-20 bg-white/95 border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20 backdrop-blur-md shadow-xs text-slate-800">
          {/* Mobile menu trigger */}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-slate-600 hover:text-slate-900 mr-4">
            <FiMenu size={22} />
          </button>

          {/* Smart weather stats & info */}
          <div className="hidden lg:flex items-center gap-6 text-sm text-slate-600 font-medium">
            <div className="flex items-center gap-2">
              <FiCloudDrizzle className="text-blue-600" />
              <span>Weather: <b>{smartStats.liveWeather.temp}</b>, {smartStats.liveWeather.condition}</span>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <FiAlertOctagon className="text-emerald-600" />
              <span>AQI: <b className="text-emerald-600">{smartStats.liveWeather.aqi}</b> ({smartStats.liveWeather.aqiDesc})</span>
            </div>
            {user.role === 'customer' && (
              <>
                <div className="h-4 w-px bg-slate-200" />
                <div className="flex items-center gap-2">
                  <FiAward className="text-amber-600" />
                  <span>Eco Savings: <b>{smartStats.carbonSavedTotal} kg CO₂</b></span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {/* Dynamic Font Size Control Button */}
            <div className="relative">
              <button
                onClick={() => setFontSizeMenuOpen(!fontSizeMenuOpen)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition cursor-pointer shadow-xs"
                title="Adjust Display Font Size"
              >
                <FiType className="w-4 h-4 text-blue-600" />
                <span className="uppercase hidden sm:inline">Text: {fontSize}</span>
              </button>

              <AnimatePresence>
                {fontSizeMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-3 w-52 bg-white rounded-2xl p-3 shadow-2xl z-50 border border-slate-200 text-slate-800"
                  >
                    <span className="text-[10px] uppercase font-bold text-slate-400 block px-2 mb-2">Display Font Scaling</span>
                    <div className="space-y-1">
                      <button
                        onClick={() => { setFontSize('sm'); setFontSizeMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer ${fontSize === 'sm' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        <span>A⁻ Small</span>
                        <span className="text-[10px] opacity-75">14.5px</span>
                      </button>
                      <button
                        onClick={() => { setFontSize('md'); setFontSizeMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer ${fontSize === 'md' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        <span>A Default</span>
                        <span className="text-[10px] opacity-75">16px</span>
                      </button>
                      <button
                        onClick={() => { setFontSize('lg'); setFontSizeMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer ${fontSize === 'lg' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        <span>A⁺ Large</span>
                        <span className="text-[10px] opacity-75">17.5px</span>
                      </button>
                      <button
                        onClick={() => { setFontSize('xl'); setFontSizeMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer ${fontSize === 'xl' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        <span>A² Extra Large</span>
                        <span className="text-[10px] opacity-75">19px</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quick Role Switcher Button */}
            <div className="relative">
              <button
                onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
                className="px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold flex items-center gap-2 hover:bg-blue-600 hover:text-white transition cursor-pointer shadow-xs"
              >
                <FiZap className="w-4 h-4 text-blue-600 hover:text-white" />
                <span className="capitalize hidden sm:inline">Role: {user.role}</span>
              </button>

              <AnimatePresence>
                {roleSwitcherOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-3 w-56 bg-white rounded-2xl p-3 shadow-2xl z-50 border border-slate-200"
                  >
                    <span className="text-[10px] uppercase font-bold text-slate-400 block px-2 mb-2">Switch Active Perspective</span>
                    <div className="space-y-1">
                      <button
                        onClick={() => handleRoleSwitch('customer')}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer ${user.role === 'customer' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        <span>⚡ EV Driver / Customer</span>
                      </button>
                      <button
                        onClick={() => handleRoleSwitch('manager')}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer ${user.role === 'manager' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        <span>🏢 Station Manager</span>
                      </button>
                      <button
                        onClick={() => handleRoleSwitch('technician')}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer ${user.role === 'technician' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        <span>🔧 Field Technician</span>
                      </button>
                      <button
                        onClick={() => handleRoleSwitch('security')}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer ${user.role === 'security' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        <span>🛡️ Security Guard</span>
                      </button>
                      <button
                        onClick={() => handleRoleSwitch('superadmin')}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer ${user.role === 'superadmin' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        <span>👑 System Administrator</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Notification trigger */}
            <div className="relative">
              <button 
                onClick={() => setNotificationsOpen(!notificationsOpen)} 
                className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition cursor-pointer"
              >
                <FiBell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 shadow-md" />
              </button>

              {/* Notification dropdown */}
              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-3 w-80 bg-white rounded-2xl p-4 shadow-2xl z-40 border border-slate-200 text-slate-800"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                      <h4 className="font-bold text-sm text-blue-600">System Signals</h4>
                      <span className="text-xs text-slate-400 cursor-pointer hover:underline">Mark all read</span>
                    </div>
                    <div className="space-y-3">
                      {mockNotifications.map(n => (
                        <div key={n.id} className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between font-semibold mb-1">
                            <span className={n.type === 'warning' ? 'text-amber-600' : 'text-slate-800'}>{n.title}</span>
                            <span className="text-slate-400 font-normal text-[10px]">{n.time}</span>
                          </div>
                          <p className="text-slate-600 leading-normal">{n.desc}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile trigger */}
            <div className="flex items-center gap-3">
              <img src={user.avatar} alt="User Avatar" className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-100" />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-bold text-slate-900 truncate max-w-[120px]">{user.name}</p>
                <p className="text-[10px] text-slate-500 truncate max-w-[120px]">{user.email}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content body container */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* FLOATING VOLTBOT AI CHATBOT */}
      <VoltBotChatbot />
    </div>
  );
};

export default DashboardLayout;
