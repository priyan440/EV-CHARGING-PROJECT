import React from "react";
import {
  FiCalendar,
  FiClock,
  FiZap,
  FiMapPin,
  FiTruck,
  FiAlertCircle,
  FiXCircle,
  FiCheckCircle,
  FiCreditCard,
} from "react-icons/fi";

function BookingCard({ booking, onCancel, onViewDetails }) {
  const statusStyles = {
    Confirmed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    Upcoming: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    "In Progress": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse",
    Completed: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
    Cancelled: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
    Expired: "bg-slate-700/10 text-slate-500 border-slate-700/30",
  };

  const isCancelable = booking.status === "Confirmed" || booking.status === "Upcoming";

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      {/* Header: Booking ID, Counter ID badge, Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800">
            {booking.bookingId}
          </span>
          <span className="ml-2 font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
            Counter ID: {booking.counterId}
          </span>
        </div>

        <span
          className={`px-3 py-1 rounded-full border text-xs font-extrabold ${
            statusStyles[booking.status] || statusStyles.Confirmed
          }`}
        >
          {booking.status}
        </span>
      </div>

      {/* Booking Details Content */}
      <div className="py-4 space-y-2.5">
        <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
          {booking.stationName}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <FiCalendar className="text-emerald-500 shrink-0" />
            <span>{booking.date}</span>
          </div>

          <div className="flex items-center gap-2">
            <FiClock className="text-emerald-500 shrink-0" />
            <span>
              {booking.time} ({booking.duration})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <FiZap className="text-amber-500 shrink-0" />
            <span>
              {booking.chargingType} ({booking.connector})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <FiTruck className="text-blue-500 shrink-0" />
            <span>{booking.vehicleNumber}</span>
          </div>
        </div>

        {/* Grace period banner for active bookings */}
        {isCancelable && (
          <div className="mt-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2 font-medium">
            <FiAlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              Grace Period: <b>15 minutes</b> after {booking.time}.
            </span>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="text-xs">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">
            Estimated Amount
          </span>
          <span className="font-extrabold text-slate-900 dark:text-white text-sm">
            ₹{booking.estimatedAmount ? booking.estimatedAmount.toFixed(2) : "180.00"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(booking)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
            >
              Details
            </button>
          )}

          {isCancelable && onCancel && (
            <button
              onClick={() => onCancel(booking.bookingId)}
              className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 hover:bg-rose-500 hover:text-white text-rose-600 dark:text-rose-400 font-bold text-xs transition cursor-pointer flex items-center gap-1"
            >
              <FiXCircle size={14} />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default BookingCard;