import React, { useState } from 'react';
import { useSystemState } from '../contexts/SystemStateContext';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiMapPin, FiCpu, FiUsers, FiDollarSign, FiMessageSquare, 
  FiSettings, FiActivity, FiPlus, FiCheck, FiAlertTriangle, FiCheckSquare,
  FiZap, FiCompass, FiInfo, FiRadio, FiCheckCircle, FiClock, FiTerminal
} from 'react-icons/fi';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';
import GlassCard from '../components/GlassCard';
import CyberButton from '../components/CyberButton';

const AdminDashboard = ({ activeTab }) => {
  const { 
    stations, 
    bookings, 
    complaints, 
    settings, 
    liveTelemetryLog,
    liveTime,
    smartStats,
    updateFeedbackStatus, 
    updateSettings, 
    addStation,
    updateStationStatus,
    updateChargerStatus
  } = useSystemState();

  // STAFF MANAGEMENT LOCAL STATE
  const [staffList, setStaffList] = useState([
    { id: 'ADMIN001', name: 'Alex Mercer', role: 'superadmin', email: 'alex@voltcharge.com', status: 'Active' },
    { id: 'MGR001', name: 'Sarah Jenkins', role: 'manager', email: 'sarah.mgr@voltcharge.com', status: 'Active' },
    { id: 'TECH001', name: 'Dave Miller', role: 'technician', email: 'dave.tech@voltcharge.com', status: 'Active' },
    { id: 'SEC001', name: 'Guard Cooper', role: 'security', email: 'cooper.sec@voltcharge.com', status: 'Active' },
  ]);

  // FORM STATES
  const [newStationName, setNewStationName] = useState('');
  const [newStationLoc, setNewStationLoc] = useState('');
  const [newStationPrice, setNewStationPrice] = useState(0.32);
  const [newStationPower, setNewStationPower] = useState(300);
  
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('manager');
  const [newStaffEmail, setNewStaffEmail] = useState('');

  // CALCULATE REVENUE AND LOAD STATS
  const totalRevenue = bookings
    .filter(b => b.status === 'Completed' || b.status === 'Active')
    .reduce((acc, curr) => acc + curr.price, 0);

  const activeChargersCount = stations.reduce((acc, st) => {
    return acc + st.chargers.filter(c => c.status === 'Charging').length;
  }, 0);

  const totalChargersCount = stations.reduce((acc, st) => acc + st.chargers.length, 0);

  // MOCK SYSTEM DATA FOR RECHARTS
  const hourlyLoadData = [
    { hour: '00:00', load: 85, revenue: 120 },
    { hour: '04:00', load: 45, revenue: 65 },
    { hour: '08:00', load: 180, revenue: 240 },
    { hour: '12:00', load: 380, revenue: 520 },
    { hour: '16:00', load: 440, revenue: 680 },
    { hour: '20:00', load: 310, revenue: 410 },
  ];

  const stationRevenueData = stations.map(st => {
    const rev = bookings
      .filter(b => b.stationId === st.id && (b.status === 'Completed' || b.status === 'Active'))
      .reduce((sum, curr) => sum + curr.price, 0);
    return { name: st.name.split(' ')[0], revenue: rev };
  });

  const handleCreateStation = (e) => {
    e.preventDefault();
    if (!newStationName || !newStationLoc) return;
    addStation({
      name: newStationName,
      location: newStationLoc,
      distance: '0.1 miles',
      pricePerKwh: parseFloat(newStationPrice),
      totalPowerLimit: parseInt(newStationPower),
    });
    setNewStationName('');
    setNewStationLoc('');
  };

  const handleAddStaff = (e) => {
    e.preventDefault();
    if (!newStaffName || !newStaffEmail) return;
    const prefix = { superadmin: 'ADMIN', manager: 'MGR', technician: 'TECH', security: 'SEC' }[newStaffRole];
    const newId = `${prefix}00${staffList.length + 1}`;
    setStaffList([...staffList, {
      id: newId,
      name: newStaffName,
      role: newStaffRole,
      email: newStaffEmail,
      status: 'Active'
    }]);
    setNewStaffName('');
    setNewStaffEmail('');
  };

  switch (activeTab) {
    case 'overview':
      return (
        <div className="space-y-6">
          {/* Real-time Status Banner */}
          <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="w-3 h-3 rounded-full bg-emerald-500 block animate-ping" />
                <span className="w-3 h-3 rounded-full bg-emerald-500 block absolute top-0 left-0" />
              </div>
              <div>
                <h3 className="font-bold text-base tracking-wide flex items-center gap-2">
                  <FiRadio className="text-emerald-400" /> LIVE GRID TELEMETRY STREAMING
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  System Frequency: <span className="text-emerald-400 font-bold">{smartStats.gridFrequency || 60.01} Hz</span> | Grid Voltage: <span className="text-sky-400 font-bold">{smartStats.gridVoltage || 480.2} V</span> | Live Time: <span className="text-amber-400 font-bold">{liveTime}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-700">
                <span className="text-slate-400">Solar Gen:</span> <span className="text-emerald-400 font-bold">+{smartStats.solarGenerationKw || 144.2} kW</span>
              </div>
              <div className="bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-700">
                <span className="text-slate-400">Active Chargers:</span> <span className="text-blue-400 font-bold">{activeChargersCount}/{totalChargersCount}</span>
              </div>
            </div>
          </div>

          {/* Header Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <GlassCard hover={false} className="flex items-center gap-5 border border-slate-200 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0">
                <FiDollarSign size={24} />
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-bold uppercase tracking-wider">Total Revenue</span>
                <h4 className="text-2xl font-extrabold text-slate-900 font-mono mt-0.5">${totalRevenue.toFixed(2)}</h4>
                <span className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                  <FiCheckCircle size={12} /> Live stream active
                </span>
              </div>
            </GlassCard>

            <GlassCard hover={false} className="flex items-center gap-5 border border-slate-200 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 shrink-0">
                <FiZap size={24} />
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-bold uppercase tracking-wider">Active Grid Load</span>
                <h4 className="text-2xl font-extrabold text-slate-900 font-mono mt-0.5">
                  {stations.reduce((sum, st) => sum + st.currentPowerUsage, 0)} kW
                </h4>
                <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
                  Capacity: {stations.reduce((sum, st) => sum + st.totalPowerLimit, 0)} kW Limit
                </span>
              </div>
            </GlassCard>

            <GlassCard hover={false} className="flex items-center gap-5 border border-slate-200 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 shrink-0">
                <FiCpu size={24} />
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-bold uppercase tracking-wider">Bay Utilization</span>
                <h4 className="text-2xl font-extrabold text-slate-900 font-mono mt-0.5">
                  {activeChargersCount} / {totalChargersCount} Plugs
                </h4>
                <span className="text-[11px] text-purple-600 font-bold mt-1 block">
                  {Math.round((activeChargersCount / totalChargersCount) * 100) || 0}% active charger rate
                </span>
              </div>
            </GlassCard>

            <GlassCard hover={false} className="flex items-center gap-5 border border-slate-200 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
                <FiActivity size={24} />
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-bold uppercase tracking-wider">System Health</span>
                <h4 className="text-2xl font-extrabold text-slate-900 font-mono mt-0.5">99.8%</h4>
                <span className="text-[11px] text-emerald-600 font-bold mt-1 block">All main transformers nominal</span>
              </div>
            </GlassCard>
          </div>

          {/* Recharts Grid Load and Station Performance charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard hover={false} className="p-6 border border-slate-200">
              <h3 className="font-bold text-base text-slate-900 mb-4 flex items-center gap-2">
                <FiActivity className="text-blue-600" /> Daily Grid Power Load Curve (kW)
              </h3>
              <div className="h-72 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyLoadData}>
                    <defs>
                      <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="hour" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', border: 'none' }} />
                    <Area type="monotone" dataKey="load" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorLoad)" name="Grid Load (kW)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard hover={false} className="p-6 border border-slate-200">
              <h3 className="font-bold text-base text-slate-900 mb-4 flex items-center gap-2">
                <FiDollarSign className="text-emerald-600" /> Station Revenue Generation ($)
              </h3>
              <div className="h-72 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stationRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', border: 'none' }} />
                    <Bar dataKey="revenue" fill="#0EA5E9" radius={[8, 8, 0, 0]} name="Revenue ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>

          {/* REAL-TIME LIVE TELEMETRY FEED LOG */}
          <GlassCard hover={false} className="p-6 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <FiTerminal className="text-blue-600" /> Real-Time Telemetry Socket Feed
              </h3>
              <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> LIVE RECEIVING
              </span>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl font-mono text-xs text-slate-200 max-h-56 overflow-y-auto space-y-2 border border-slate-800 shadow-inner">
              {liveTelemetryLog.map(log => (
                <div key={log.id} className="flex items-start gap-3 border-b border-slate-800/60 pb-1.5">
                  <span className="text-slate-500 shrink-0">[{log.time}]</span>
                  <span className={log.type === 'success' ? 'text-emerald-400 font-bold' : 'text-sky-300'}>{log.text}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      );

    case 'stations':
      return (
        <div className="space-y-6">
          {/* Add Station Card */}
          <GlassCard hover={false} className="p-6 border border-slate-200">
            <h3 className="font-bold text-lg text-slate-900 border-b border-slate-200 pb-3 mb-4 flex items-center gap-2">
              <FiPlus className="text-blue-600" /> Deploy New Charging Station Hub
            </h3>
            <form onSubmit={handleCreateStation} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Station Name</label>
                <input
                  type="text"
                  value={newStationName}
                  onChange={(e) => setNewStationName(e.target.value)}
                  placeholder="e.g. Westside Voltpark"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Location Address</label>
                <input
                  type="text"
                  value={newStationLoc}
                  onChange={(e) => setNewStationLoc(e.target.value)}
                  placeholder="e.g. 505 Industrial Blvd"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Price/kWh ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newStationPrice}
                    onChange={(e) => setNewStationPrice(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Power (kW)</label>
                  <input
                    type="number"
                    value={newStationPower}
                    onChange={(e) => setNewStationPower(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                    required
                  />
                </div>
              </div>
              <CyberButton type="submit" variant="primary" className="py-2.5 text-xs font-bold w-full shadow-md shadow-blue-500/20">
                Initialize Hub
              </CyberButton>
            </form>
          </GlassCard>

          {/* List existing stations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stations.map(st => (
              <GlassCard key={st.id} hover={false} className="space-y-4 border border-slate-200 p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg font-mono text-xs font-bold uppercase tracking-wider text-slate-700">
                      ID: {st.id}
                    </span>
                    <h4 className="font-extrabold text-lg text-slate-900 mt-2">{st.name}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-medium">
                      <FiMapPin size={14} className="text-blue-600" /> {st.location}
                    </p>
                  </div>
                  <select
                    value={st.status}
                    onChange={(e) => updateStationStatus(st.id, e.target.value)}
                    className="bg-slate-50 border border-slate-300 px-3 py-1.5 text-xs font-bold rounded-xl text-slate-800 outline-none cursor-pointer focus:border-blue-600"
                  >
                    <option value="Active">Active</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Tariff Rate</span>
                    <span className="font-extrabold text-blue-600 font-mono text-base">${st.pricePerKwh}/kWh</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Power Stream</span>
                    <span className="font-extrabold text-slate-900 font-mono text-base">{st.currentPowerUsage} / {st.totalPowerLimit} kW</span>
                  </div>
                </div>

                {/* Chargers display inside station */}
                <div className="space-y-2.5">
                  <span className="text-xs text-slate-700 font-bold block uppercase tracking-wider">Connected Chargers ({st.chargers.length})</span>
                  <div className="space-y-2">
                    {st.chargers.map(ch => (
                      <div key={ch.id} className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
                        <div className="flex justify-between items-center text-xs font-mono">
                          <div>
                            <span className="text-slate-900 font-extrabold">{ch.id.split('-')[1]}</span>
                            <span className="text-xs text-slate-500 ml-2 font-sans font-medium">({ch.connector} // {ch.speed})</span>
                          </div>
                          <select
                            value={ch.status}
                            onChange={(e) => updateChargerStatus(st.id, ch.id, e.target.value)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold outline-none cursor-pointer border ${
                              ch.status === 'Charging' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : (ch.status === 'Available' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-rose-50 text-rose-700 border-rose-200')
                            }`}
                          >
                            <option value="Available">Available</option>
                            <option value="Charging">Charging</option>
                            <option value="Occupied">Occupied</option>
                            <option value="Offline">Offline</option>
                          </select>
                        </div>

                        {/* Real-time SoC progress bar if charging */}
                        {ch.status === 'Charging' && (
                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                              <span>Charging ({ch.currentVehicle || 'EV'})</span>
                              <span className="font-mono font-bold text-emerald-600">{ch.currentSoC || 45}% SoC</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${ch.currentSoC || 45}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {st.chargers.length === 0 && (
                      <p className="text-xs text-slate-500 italic">No chargers registered on this hub yet.</p>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      );

    case 'personnel':
      return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Staff Registry Form */}
          <div className="lg:col-span-4">
            <GlassCard hover={false} className="space-y-4 border border-slate-200 p-6">
              <h3 className="font-extrabold text-lg text-slate-900 border-b border-slate-200 pb-3 mb-2 flex items-center gap-2">
                <FiUsers className="text-blue-600" /> Hire Operator/Staff
              </h3>
              <form onSubmit={handleAddStaff} className="space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Staff Member Name</label>
                  <input
                    type="text"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Email Address</label>
                  <input
                    type="email"
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    placeholder="e.g. john.doe@voltcharge.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Target Terminal Role</label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer"
                  >
                    <option value="manager">Station Manager (MGR)</option>
                    <option value="technician">Field Technician (TECH)</option>
                    <option value="security">Security Guard (SEC)</option>
                    <option value="superadmin">Administrator (ADMIN)</option>
                  </select>
                </div>
                <CyberButton type="submit" variant="primary" className="w-full py-3.5 text-sm font-bold shadow-md shadow-blue-500/25">
                  Hire & Assign Login ID
                </CyberButton>
              </form>
            </GlassCard>
          </div>

          {/* Staff List */}
          <div className="lg:col-span-8">
            <GlassCard hover={false} className="space-y-4 border border-slate-200 p-6">
              <h3 className="font-extrabold text-lg text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
                <FiCheckSquare className="text-blue-600" /> Active Personnel Roster
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider">
                      <th className="py-3 px-3 rounded-l-xl">ID</th>
                      <th className="py-3 px-3">Name</th>
                      <th className="py-3 px-3">Assigned Role</th>
                      <th className="py-3 px-3">Email</th>
                      <th className="py-3 px-3 rounded-r-xl">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-900 font-medium">
                    {staffList.map(st => (
                      <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-3 font-mono font-bold text-blue-600">{st.id}</td>
                        <td className="py-3.5 px-3 font-bold text-slate-900">{st.name}</td>
                        <td className="py-3.5 px-3 capitalize font-mono text-xs font-semibold text-slate-700">{st.role}</td>
                        <td className="py-3.5 px-3 text-slate-600 text-xs">{st.email}</td>
                        <td className="py-3.5 px-3">
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-block">
                            {st.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        </div>
      );

    case 'complaints':
      return (
        <GlassCard hover={false} className="space-y-6 border border-slate-200 p-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <h3 className="font-extrabold text-xl text-slate-900 flex items-center gap-2">
              <FiMessageSquare className="text-blue-600" /> Customer Feedback & Complaints Center
            </h3>
            <span className="text-xs text-slate-600 font-bold bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              Pending: {complaints.filter(c => c.status === 'Unresolved').length} feedback signals
            </span>
          </div>

          <div className="space-y-4">
            {complaints.map(c => (
              <div key={c.id} className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs relative overflow-hidden transition-all hover:shadow-md">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="px-3 py-1 rounded-lg font-mono text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      TICKET: {c.id}
                    </span>
                    <h4 className="font-extrabold text-base text-slate-900 mt-2">{c.name} <span className="text-xs font-normal text-slate-500">({c.email})</span></h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                      <FiClock size={12} /> {new Date(c.date).toLocaleString()}
                    </p>
                  </div>
                  
                  {c.status === 'Unresolved' ? (
                    <button
                      onClick={() => updateFeedbackStatus(c.id, 'Resolved')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-300 bg-rose-50 hover:bg-emerald-600 hover:text-white text-rose-700 text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      <FiAlertTriangle />
                      <span>Resolve Complaint</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 text-xs font-bold">
                      <FiCheck /> Resolved
                    </span>
                  )}
                </div>
                <div className="mt-4 text-sm text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200 font-medium leading-relaxed">
                  {c.message}
                </div>
              </div>
            ))}
            {complaints.length === 0 && (
              <div className="py-12 text-center text-slate-500 text-xs font-medium">
                No active complaints or signals recorded in the feed buffer.
              </div>
            )}
          </div>
        </GlassCard>
      );

    case 'settings':
      return (
        <div className="max-w-2xl mx-auto">
          <GlassCard hover={false} className="space-y-6 border border-slate-200 p-6">
            <h3 className="font-extrabold text-xl text-slate-900 border-b border-slate-200 pb-4 flex items-center gap-2">
              <FiSettings className="text-blue-600" /> Global Grid & Tariff Settings
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-2">Standard Grid Price ($/kWh)</label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.standardTariff}
                  onChange={(e) => updateSettings({ standardTariff: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 text-slate-900 outline-none font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-2">Tesla NACS Premium Add-on ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.nacsPremium}
                  onChange={(e) => updateSettings({ nacsPremium: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 text-slate-900 outline-none font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-2">Peak Hour Multiplier (x)</label>
                <input
                  type="number"
                  step="0.05"
                  value={settings.peakHourMultiplier}
                  onChange={(e) => updateSettings({ peakHourMultiplier: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 text-slate-900 outline-none font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-2">Max Power Threshold (%)</label>
                <input
                  type="number"
                  value={settings.maxPowerThreshold}
                  onChange={(e) => updateSettings({ maxPowerThreshold: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 text-slate-900 outline-none font-mono font-bold text-sm"
                />
              </div>
            </div>

            <div className="bg-blue-50/80 border border-blue-200 p-4 rounded-2xl flex items-start gap-3 mt-4">
              <FiInfo className="text-blue-600 shrink-0 mt-0.5 w-5 h-5" />
              <div className="text-xs text-slate-700 leading-relaxed font-medium">
                Updating these configurations applies grid tariff adjustments in real-time. Estimations for new bookings and active load balance alarms are derived directly from these values.
              </div>
            </div>
          </GlassCard>
        </div>
      );

    default:
      return <AdminDashboard activeTab="overview" />;
  }
};

export default AdminDashboard;
