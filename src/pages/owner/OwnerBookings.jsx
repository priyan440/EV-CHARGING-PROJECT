import { useState } from "react";
import { CalendarCheck, Search, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useSystemState } from "../../contexts/SystemStateContext";

export default function OwnerBookings() {
  const { currentUser } = useAuth();
  const { stations, bookings, updateBooking } = useSystemState();

  const ownerCounterId = currentUser?.counterId || "OWNER0001";
  const ownerStationIds = stations
    .filter((s) => s.ownerCounterId === ownerCounterId)
    .map((s) => s.id);

  const ownerBookings = bookings.filter((b) => ownerStationIds.includes(b.stationId));

  return (
    <div className="space-y-6">
      <div className="p-6 md:p-8 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-2xl">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
          <CalendarCheck size={28} className="text-purple-400" /> Customer Bookings Overview
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Inspect customer reservations at your stations, verify check-ins, and update booking status.
        </p>
      </div>

      <div className="p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider">
              <th className="py-3 px-3 rounded-l-xl">Booking ID</th>
              <th className="py-3 px-3">Customer ID & Name</th>
              <th className="py-3 px-3">Station & Charger</th>
              <th className="py-3 px-3">Vehicle Plate</th>
              <th className="py-3 px-3">Date & Time</th>
              <th className="py-3 px-3">Amount</th>
              <th className="py-3 px-3 rounded-r-xl">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-200 font-medium">
            {ownerBookings.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                  No customer bookings logged for your stations yet.
                </td>
              </tr>
            ) : (
              ownerBookings.map((b) => (
                <tr key={b.bookingId} className="hover:bg-slate-900/60 transition">
                  <td className="py-4 px-3 font-mono font-bold text-purple-400">{b.bookingId}</td>
                  <td className="py-4 px-3">
                    <span className="font-bold text-white block">{b.customerName}</span>
                    <span className="font-mono text-[10px] text-slate-400">{b.counterId}</span>
                  </td>
                  <td className="py-4 px-3">
                    <span className="font-bold text-white block">{b.stationName}</span>
                    <span className="font-mono text-[10px] text-emerald-400">{b.chargerId} ({b.connectorType})</span>
                  </td>
                  <td className="py-4 px-3 font-mono text-slate-300">{b.vehicleNumber}</td>
                  <td className="py-4 px-3 text-slate-300">{b.date} at {b.time}</td>
                  <td className="py-4 px-3 font-mono font-bold text-white">₹{b.totalAmount || b.estimatedAmount}</td>
                  <td className="py-4 px-3">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
