import React, { useState } from 'react';
import { useSystemState } from '../contexts/SystemStateContext';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  FiMapPin, FiCpu, FiCalendar, FiCheckSquare, FiAlertOctagon, 
  FiZap, FiActivity, FiUser, FiInfo, FiCheck, FiX, FiRadio, FiClock
} from 'react-icons/fi';
import GlassCard from '../components/GlassCard';
import CyberButton from '../components/CyberButton';

const ManagerDashboard = ({ activeTab }) => {
  const { user } = useAuth();
  const { 
    stations, 
    bookings, 
    tickets, 
    smartStats,
    liveTime,
    updateBookingStatus, 
    updateChargerStatus,
    createTicket,
    updateTicketStatus 
  } = useSystemState();

  // FORM STATES FOR REPORTING MAINTENANCE
  const [maintCharger, setMaintCharger] = useState('');
  const [maintIssue, setMaintIssue] = useState('');
  const [maintSeverity, setMaintSeverity] = useState('Medium');
  const [ticketLogged, setTicketLogged] = useState(false);

  // Identify managed station (Manager user has user.stationId)
  const stationId = user?.stationId || 'ST001';
  const station = stations.find(s => s.id === stationId) || stations[0];

  // Filter bookings and tickets for this station
  const stationBookings = bookings.filter(b => b.stationId === station?.id);
  const pendingBookings = stationBookings.filter(b => b.status === 'Pending');
  const stationTickets = tickets.filter(t => t.stationId === station?.id);

  const handleMaintenanceSubmit = (e) => {
    e.preventDefault();
    if (!maintIssue.trim() || !maintCharger) return;

    createTicket({
      stationId,
      stationName: station?.name || 'Local Station',
      chargerId: maintCharger,
      issue: maintIssue,
      severity: maintSeverity,
      assignedTechId: 'TECH001',
      assignedTechName: 'Dave Miller'
    });

    setTicketLogged(true);
    setMaintIssue('');
    setTimeout(() => setTicketLogged(false), 4000);
  };

  if (!station) {
    return (
      <div className="py-12 text-center text-slate-500 text-xs font-semibold">
        System Error: Managed station details not loaded.
      </div>
    );
  }

  // RENDER BASED ON ACTIVE TAB
  switch (activeTab) {
    case 'overview':
      return (
        <div className="space-y-6">
          {/* Welcome and Station info */}
          <div className="relative overflow-hidden p-8 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 text-[10px] font-extrabold tracking-widest text-blue-400 bg-blue-500/10 rounded-full border border-blue-500/20 uppercase">
                    MANAGEMENT PORTAL // ASSIGNED HUB: {station.id}
                  </span>
                  <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> {liveTime}
                  </span>
                </div>
                <h2 className="text-3xl font-black tracking-tight text-white">
                  Sarah's Station Dashboard
                </h2>
                <p className="text-slate-400 text-sm mt-1 max-w-xl flex items-center gap-1.5 font-medium">
                  <FiMapPin className="text-blue-500" /> {station.name} — {station.location}
                </p>
              </div>

              <div className="flex gap-4">
                <div className="p-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-center min-w-[130px]">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Awaiting Action</span>
                  <span className="text-2xl font-black text-amber-400 tracking-tight font-mono">{pendingBookings.length} Requests</span>
                </div>
                <div className="p-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-center min-w-[130px]">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Station Load</span>
                  <span className="text-2xl font-black text-blue-400 tracking-tight font-mono">
                    {Math.round((station.currentPowerUsage / station.totalPowerLimit) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <GlassCard hover={false} className="flex items-center gap-4 border border-slate-200 p-5">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                <FiZap size={22} />
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-bold uppercase tracking-wider">Power Stream</span>
                <span className="text-lg font-black font-mono text-slate-900">{station.currentPowerUsage} / {station.totalPowerLimit} kW</span>
              </div>
            </GlassCard>

            <GlassCard hover={false} className="flex items-center gap-4 border border-slate-200 p-5">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0">
                <FiCpu size={22} />
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-bold uppercase tracking-wider">Bays Active</span>
                <span className="text-lg font-black font-mono text-slate-900">
                  {station.chargers.filter(c => c.status === 'Charging').length} / {station.chargers.length} charging
                </span>
              </div>
            </GlassCard>

            <GlassCard hover={false} className="flex items-center gap-4 border border-slate-200 p-5">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
                <FiCalendar size={22} />
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-bold uppercase tracking-wider">Total Bookings</span>
                <span className="text-lg font-black font-mono text-slate-900">{stationBookings.length} units</span>
              </div>
            </GlassCard>

            <GlassCard hover={false} className="flex items-center gap-4 border border-slate-200 p-5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <FiAlertOctagon size={22} />
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-bold uppercase tracking-wider">Active Faults</span>
                <span className="text-lg font-black font-mono text-slate-900">
                  {stationTickets.filter(t => t.status !== 'Completed').length} tickets
                </span>
              </div>
            </GlassCard>
          </div>

          {/* Charger Status list & Power limit */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <GlassCard hover={false} className="space-y-4 border border-slate-200 p-6">
                <h3 className="font-extrabold text-base text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
                  <FiCpu className="text-blue-600" /> Active Charger Bays & Live States
                </h3>
                <div className="space-y-3">
                  {station.chargers.map(ch => (
                    <div key={ch.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-4 font-mono">
                      <div>
                        <span className="text-sm font-extrabold text-slate-900">{ch.id.split('-')[1]}</span>
                        <span className="text-xs text-slate-500 ml-3 font-sans font-medium">({ch.connector} // {ch.speed})</span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs">
                        {ch.status === 'Charging' && (
                          <div className="flex items-center gap-2 text-emerald-600 font-bold font-sans">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                            <span>{ch.currentVehicle || 'EV'} ({ch.currentSoC || 45}%)</span>
                          </div>
                        )}
                        <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${
                          {
                            Available: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                            Charging: 'bg-blue-100 text-blue-800 border-blue-300',
                            Occupied: 'bg-amber-100 text-amber-800 border-amber-300',
                            Offline: 'bg-rose-100 text-rose-800 border-rose-300'
                          }[ch.status] || 'bg-slate-200 text-slate-700'
                        }`}>
                          {ch.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>

            <div className="lg:col-span-4">
              <GlassCard hover={false} className="h-full flex flex-col justify-between border border-slate-200 p-6">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 border-b border-slate-200 pb-3 mb-4 flex items-center gap-2">
                    <FiActivity className="text-blue-600" /> Grid Stream Cap
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Station transformer capacity is currently capped at <b>{station.totalPowerLimit} kW</b>. Adjusting charger queue and offline/maintenance locks helps stabilize load fluctuations.
                  </p>

                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Real-time Grid Utilization</span>
                      <span className="font-mono text-blue-600">{station.currentPowerUsage} kW</span>
                    </div>
                    <div className="h-4 w-full bg-slate-100 rounded-lg border border-slate-200 overflow-hidden p-0.5">
                      <div 
                        className={`h-full rounded-md transition-all duration-500 ${
                          station.currentPowerUsage > station.totalPowerLimit * 0.85 
                            ? 'bg-gradient-to-r from-amber-500 to-rose-500' 
                            : 'bg-gradient-to-r from-blue-600 to-emerald-500'
                        }`} 
                        style={{ width: `${Math.min(100, (station.currentPowerUsage / station.totalPowerLimit) * 100)}%` }} 
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50/80 p-4 border border-blue-200 rounded-2xl text-xs text-slate-700 flex gap-2.5 items-start mt-6 font-medium">
                  <FiInfo className="text-blue-600 shrink-0 mt-0.5 w-4 h-4" />
                  <span>
                    To increase overall station capability thresholds, contact the Super Administrator (ADMIN001) to alter transformer ratings.
                  </span>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      );

    case 'bookings':
      return (
        <GlassCard hover={false} className="space-y-6 border border-slate-200 p-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <h3 className="font-extrabold text-xl text-slate-900 flex items-center gap-2">
              <FiCalendar className="text-blue-600" /> Booking Approvals & Queue Manager
            </h3>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              Pending Approvals: {pendingBookings.length} requests
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider">
                  <th className="py-3 px-3 rounded-l-xl">Booking ID</th>
                  <th className="py-3 px-3">Customer / Driver</th>
                  <th className="py-3 px-3">Vehicle Plate</th>
                  <th className="py-3 px-3">Charger Unit</th>
                  <th className="py-3 px-3">Connector</th>
                  <th className="py-3 px-3">Time Slot</th>
                  <th className="py-3 px-3">Current Status</th>
                  <th className="py-3 px-3 text-right rounded-r-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900 font-medium">
                {stationBookings.map((b) => (
                  <tr key={b.bookingId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-3 font-mono font-bold text-blue-600">{b.bookingId}</td>
                    <td className="py-4 px-3 font-bold text-slate-900">{b.customerName}</td>
                    <td className="py-4 px-3 font-mono font-semibold">{b.vehicleNo}</td>
                    <td className="py-4 px-3 font-mono">{b.chargerId.split('-')[1]}</td>
                    <td className="py-4 px-3 font-mono text-xs">{b.connectorType}</td>
                    <td className="py-4 px-3 text-xs">{b.timeSlot}</td>
                    <td className="py-4 px-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border inline-block ${
                        {
                          Pending: 'bg-amber-100 text-amber-800 border-amber-300',
                          Approved: 'bg-sky-100 text-sky-800 border-sky-300',
                          Active: 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse',
                          Completed: 'bg-slate-200 text-slate-700 border-slate-300',
                          Rejected: 'bg-rose-100 text-rose-800 border-rose-300'
                        }[b.status] || 'bg-slate-100 text-slate-700'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-right">
                      {b.status === 'Pending' && (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => updateBookingStatus(b.bookingId, 'Approved')}
                            className="p-2 rounded-xl border border-sky-300 bg-sky-50 hover:bg-sky-600 hover:text-white text-sky-700 transition cursor-pointer shadow-xs"
                            title="Approve Slot"
                          >
                            <FiCheck size={16} />
                          </button>
                          <button
                            onClick={() => updateBookingStatus(b.bookingId, 'Rejected')}
                            className="p-2 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 transition cursor-pointer shadow-xs"
                            title="Reject Request"
                          >
                            <FiX size={16} />
                          </button>
                        </div>
                      )}
                      {b.status === 'Approved' && (
                        <button
                          onClick={() => updateBookingStatus(b.bookingId, 'Active')}
                          className="px-3.5 py-1.5 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-xs font-bold transition cursor-pointer shadow-xs"
                        >
                          Activate Plug
                        </button>
                      )}
                      {b.status === 'Active' && (
                        <button
                          onClick={() => updateBookingStatus(b.bookingId, 'Completed')}
                          className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-800 hover:text-white text-slate-800 text-xs font-bold transition cursor-pointer shadow-xs"
                        >
                          Complete Cycle
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {stationBookings.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 text-xs font-medium">
                      No customer reservation records for this station.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      );

    case 'slots':
      return (
        <GlassCard hover={false} className="space-y-6 border border-slate-200 p-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <h3 className="font-extrabold text-xl text-slate-900 flex items-center gap-2">
              <FiCpu className="text-blue-600" /> Charger Hardware Override console
            </h3>
            <span className="text-xs text-slate-600 font-bold bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              Bays status: {station.chargers.length} bays online
            </span>
          </div>

          <div className="space-y-4">
            {station.chargers.map(ch => (
              <div key={ch.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-4 font-mono">
                <div>
                  <h4 className="font-extrabold text-base text-slate-900">{ch.id.split('-')[1]} // {ch.connector}</h4>
                  <p className="text-xs text-slate-600 mt-1 font-sans font-medium">Capability Speed: <b>{ch.speed}</b></p>
                </div>

                <div className="flex gap-2">
                  <CyberButton
                    onClick={() => updateChargerStatus(stationId, ch.id, 'Available')}
                    variant={ch.status === 'Available' ? 'primary' : 'glass'}
                    className="py-1.5 px-3.5 text-xs font-bold"
                  >
                    Available
                  </CyberButton>
                  <CyberButton
                    onClick={() => updateChargerStatus(stationId, ch.id, 'Charging')}
                    variant={ch.status === 'Charging' ? 'secondary' : 'glass'}
                    className="py-1.5 px-3.5 text-xs font-bold"
                  >
                    Charging
                  </CyberButton>
                  <CyberButton
                    onClick={() => updateChargerStatus(stationId, ch.id, 'Offline')}
                    variant={ch.status === 'Offline' ? 'danger' : 'glass'}
                    className="py-1.5 px-3.5 text-xs font-bold"
                  >
                    Offline
                  </CyberButton>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      );

    case 'maintenance':
      return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create Repair Request ticket */}
          <div className="lg:col-span-5">
            <GlassCard hover={false} className="space-y-4 border border-slate-200 p-6">
              <h3 className="font-extrabold text-lg text-slate-900 border-b border-slate-200 pb-3 mb-2 flex items-center gap-2">
                <FiAlertOctagon className="text-amber-600" /> Log Maintenance Request
              </h3>
              
              {ticketLogged && (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs font-bold text-emerald-800">
                  Maintenance ticket submitted and assigned to field technician.
                </div>
              )}

              <form onSubmit={handleMaintenanceSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Charger Unit Bay</label>
                  <select
                    value={maintCharger}
                    onChange={(e) => setMaintCharger(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer"
                    required
                  >
                    <option value="">Select bay...</option>
                    {station.chargers.map(ch => (
                      <option key={ch.id} value={ch.id}>{ch.id.split('-')[1]} ({ch.connector})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Severity Level</label>
                  <select
                    value={maintSeverity}
                    onChange={(e) => setMaintSeverity(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer"
                  >
                    <option value="Low">Low (Glitch or recalibration)</option>
                    <option value="Medium">Medium (Hardware wear-down)</option>
                    <option value="High">High (Overheating, unsafe lock, offline)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Detailed Issue description</label>
                  <textarea
                    rows="3"
                    value={maintIssue}
                    onChange={(e) => setMaintIssue(e.target.value)}
                    placeholder="e.g. RFID scanner glass cracked or temperature reading is abnormal..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400"
                    required
                  />
                </div>

                <CyberButton type="submit" variant="danger" className="w-full py-3.5 text-sm font-bold shadow-md shadow-rose-500/20">
                  Dispatch Field Engineer
                </CyberButton>
              </form>
            </GlassCard>
          </div>

          {/* Active Maintenance Tickets list */}
          <div className="lg:col-span-7">
            <GlassCard hover={false} className="space-y-4 border border-slate-200 p-6">
              <h3 className="font-extrabold text-lg text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
                <FiCheckSquare className="text-blue-600" /> Active Work Orders & Repairs
              </h3>

              <div className="space-y-3">
                {stationTickets.map(t => (
                  <div key={t.id} className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs relative overflow-hidden">
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-mono font-bold text-slate-900 text-sm">{t.id} // Bay: {t.chargerId.split('-')[1]}</span>
                        <p className="text-xs text-slate-500 font-mono mt-0.5 font-medium">Assigned to: {t.assignedTechName}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                          t.severity === 'High' ? 'bg-rose-100 text-rose-800 border border-rose-200' : (t.severity === 'Medium' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-700 border border-slate-200')
                        }`}>
                          {t.severity}
                        </span>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                          t.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-sky-100 text-sky-800 border border-sky-200'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-800 mt-3 bg-slate-50 p-4 rounded-xl border border-slate-200 font-medium leading-relaxed">
                      {t.issue}
                    </p>
                  </div>
                ))}
                {stationTickets.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-6 font-medium">
                    No active maintenance tickets on this hub.
                  </p>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      );

    case 'powergrid':
      return (
        <div className="space-y-6 max-w-5xl mx-auto">
          <div className="relative overflow-hidden p-8 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="px-3.5 py-1 text-[10px] font-extrabold tracking-widest text-blue-400 bg-blue-500/10 rounded-full border border-blue-500/20 uppercase">
                  SMART GRID & SOLAR STORAGE SUITE // HUB: {station.id}
                </span>
                <h2 className="text-3xl font-black mt-3 tracking-tight flex items-center gap-3">
                  Grid Power & Solar Balancer <FiZap className="text-blue-400" />
                </h2>
                <p className="text-slate-300 text-sm mt-1 max-w-xl font-medium">
                  Dynamic station load throttling, solar energy storage sync, and peak-hour transformer load balancing.
                </p>
              </div>

              <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 text-center min-w-[180px]">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                  SOLAR BATTERY BANK
                </span>
                <span className="text-2xl font-black font-mono text-emerald-400 mt-0.5 block">
                  120 kWh (88%)
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                  Solar Array Active (42 kW Solar Feed)
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard hover={false} className="p-6 space-y-4 border border-slate-200">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <FiZap className="text-blue-600" /> Station Power Quota Limit
                </h3>
                <span className="text-xs font-mono font-bold text-blue-600">{station.totalPowerLimit} kW Cap</span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Adjust maximum allowable power intake from main municipal grid. Throttles high-capacity bays during demand spikes.
              </p>
            </GlassCard>
          </div>
        </div>
      );

    default:
      return <ManagerDashboard activeTab="overview" />;
  }
};

export default ManagerDashboard;
