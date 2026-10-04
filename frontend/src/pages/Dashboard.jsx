import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getCustomerBookings, getStations } from "../utils/storage";
import StatCard from "../components/StatCard";
import BatteryIndicator from "../components/BatteryIndicator";
import BookingCard from "../components/BookingCard";
import {
  FiZap,
  FiTruck,
  FiCalendar,
  FiCheckCircle,
  FiDollarSign,
  FiMapPin,
  FiPlusCircle,
  FiClock,
  FiArrowRight,
} from "react-icons/fi";

function Dashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [stations, setStations] = useState([]);

  useEffect(() => {
    if (currentUser?.counterId) {
      const userBookings = getCustomerBookings(currentUser.counterId);
      setBookings(userBookings);
      setStations(getStations());
    }
  }, [currentUser]);

  if (!currentUser) return null;

  const vehicle = currentUser.vehicle || null;

  const upcomingBooking = bookings.find(
    (b) => b.status === "Confirmed" || b.status === "Upcoming"
  );
  const completedBookings = bookings.filter((b) => b.status === "Completed");
  const totalSpent = bookings.reduce((sum, b) => sum + (b.estimatedAmount || 0), 0);
  const availableStationsCount = stations.filter((s) => s.status === "Available").length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 border border-slate-800 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-3">
            <FiZap className="w-3.5 h-3.5 animate-pulse" />
            <span>Counter ID: {currentUser.counterId}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Welcome back, {currentUser.name} 👋
          </h1>

          <p className="text-xs text-slate-400 mt-1 max-w-lg">
            Vehicle: <b>{vehicle.brand} {vehicle.model}</b> ({vehicle.number}) • Battery Capacity: <b>{vehicle.batteryCapacity} kWh</b>
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={() => navigate("/booking")}
          className="relative z-10 py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-98 cursor-pointer shrink-0"
        >
          <FiPlusCircle size={18} />
          <span>Book Charging Slot</span>
        </button>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Vehicle Battery"
          value={`${vehicle.batteryPercentage || 65}%`}
          subtext={`${vehicle.brand} ${vehicle.model}`}
          icon={FiZap}
          color="emerald"
        />

        <StatCard
          title="Upcoming Booking"
          value={upcomingBooking ? upcomingBooking.bookingId : "None"}
          subtext={upcomingBooking ? upcomingBooking.stationName : "No active slot"}
          icon={FiCalendar}
          color="blue"
        />

        <StatCard
          title="Total Bookings"
          value={bookings.length}
          subtext={`${completedBookings.length} completed sessions`}
          icon={FiCheckCircle}
          color="sky"
        />

        <StatCard
          title="Amount Spent"
          value={`₹${totalSpent.toFixed(2)}`}
          subtext={`Available Stations: ${availableStationsCount}`}
          icon={FiDollarSign}
          color="purple"
        />
      </div>

      {/* Main Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Upcoming Booking & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Booking Focus Widget */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <FiCalendar className="text-emerald-500" />
                <span>Next Scheduled Session</span>
              </h3>

              <button
                onClick={() => navigate("/my-bookings")}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <FiArrowRight size={14} />
              </button>
            </div>

            {upcomingBooking ? (
              <BookingCard
                booking={upcomingBooking}
                onViewDetails={(b) => navigate("/my-bookings")}
              />
            ) : (
              <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-3">
                  <FiZap className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                  No upcoming bookings yet
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Book your charging slot at your nearest station and keep your EV powered up.
                </p>
                <button
                  onClick={() => navigate("/booking")}
                  className="mt-4 py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  Book Charging Now
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => navigate("/stations")}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:border-emerald-500/50 transition cursor-pointer group shadow-xs"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <FiMapPin size={18} />
              </div>
              <span className="font-bold text-xs text-slate-900 dark:text-white block">
                Stations
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                View & filter
              </span>
            </button>

            <button
              onClick={() => navigate("/my-bookings")}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:border-emerald-500/50 transition cursor-pointer group shadow-xs"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <FiCalendar size={18} />
              </div>
              <span className="font-bold text-xs text-slate-900 dark:text-white block">
                My Bookings
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                Manage slots
              </span>
            </button>

            <button
              onClick={() => navigate("/charging-history")}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:border-emerald-500/50 transition cursor-pointer group shadow-xs"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <FiClock size={18} />
              </div>
              <span className="font-bold text-xs text-slate-900 dark:text-white block">
                History
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                Past sessions
              </span>
            </button>

            <button
              onClick={() => navigate("/payments")}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:border-emerald-500/50 transition cursor-pointer group shadow-xs"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <FiDollarSign size={18} />
              </div>
              <span className="font-bold text-xs text-slate-900 dark:text-white block">
                Payments
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                Invoices & bills
              </span>
            </button>
          </div>
        </div>

        {/* Right Col: Live Battery Widget & Registered Vehicle Card */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-4">
              Registered EV Status
            </h3>
            <BatteryIndicator
              percentage={vehicle.batteryPercentage || 65}
              isCharging={upcomingBooking?.status === "In Progress"}
            />
            <div className="w-full mt-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Vehicle Model:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {vehicle.brand} {vehicle.model}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Registration No:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {vehicle.number}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Battery Size:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {vehicle.batteryCapacity} kWh
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;