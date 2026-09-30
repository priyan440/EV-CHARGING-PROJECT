import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useSystemState } from "../contexts/SystemStateContext";
import { motion } from "framer-motion";
import {
  FiCheckCircle,
  FiZap,
  FiMapPin,
  FiClock,
  FiNavigation,
  FiFileText,
  FiCalendar,
  FiPrinter,
  FiShare2,
  FiShield,
  FiCpu,
  FiArrowLeft
} from "react-icons/fi";
import GlassCard from "../components/GlassCard";
import CyberButton from "../components/CyberButton";
import confetti from "canvas-confetti";

function BookingConfirmation({ bookingIdProp }) {
  const { bookingId: paramBookingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { bookings } = useSystemState();

  const activeBookingId =
    bookingIdProp || paramBookingId || location.state?.bookingId || bookings[0]?.bookingId;

  const booking = bookings.find((b) => b.bookingId === activeBookingId) || bookings[0];

  // Confetti effect on load
  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.5 },
    });
  }, [activeBookingId]);

  // Live countdown timer state (mocking slot start in 24 mins)
  const [timeLeft, setTimeLeft] = useState(1450); // seconds

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (totalSec) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hours.toString().padStart(2, "0")}h : ${mins
      .toString()
      .padStart(2, "0")}m : ${secs.toString().padStart(2, "0")}s`;
  };

  if (!booking) {
    return (
      <div className="p-8 text-center text-slate-600">
        <p>No booking record found.</p>
        <CyberButton
          onClick={() => navigate("/dashboard/book")}
          variant="primary"
          className="mt-4"
        >
          Book a Charging Slot
        </CyberButton>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/dashboard/book")}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition cursor-pointer"
        >
          <FiArrowLeft size={16} /> Back to Booking Form
        </button>

        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 rounded-full text-xs font-mono font-bold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          CONFIRMED & QUEUED
        </span>
      </div>

      {/* Header Banner */}
      <div className="relative overflow-hidden p-8 rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-2xl border border-emerald-500/30">
        <div className="absolute top-0 right-0 p-12 opacity-10 font-mono text-8xl font-black text-emerald-400 select-none">
          {booking.bookingId}
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="px-3.5 py-1 text-[10px] font-bold tracking-widest text-emerald-200 bg-white/10 rounded-full border border-white/20 uppercase">
              DIGITAL QR GATE PASS GENERATED
            </span>
            <h2 className="text-3xl font-extrabold mt-3 tracking-tight text-white flex items-center gap-3">
              Charging Bay Reserved! <FiCheckCircle className="text-emerald-400" />
            </h2>
            <p className="text-emerald-100 text-sm mt-1 max-w-lg font-medium">
              Your high-speed charging slot has been registered in the VoltHub grid node. Scan your QR pass at the gate or present to guard for instant entry.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-emerald-500/40 p-4 rounded-2xl text-center min-w-[170px] backdrop-blur-md">
            <span className="text-[10px] text-emerald-300 font-bold block uppercase tracking-wider">
              SLOT STARTS IN
            </span>
            <span className="text-lg font-mono font-black text-emerald-400 tracking-wider block mt-1">
              {formatCountdown(timeLeft)}
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">
              Slot: {booking.timeSlot}
            </span>
          </div>
        </div>
      </div>

      {/* Ticket Body & QR Pass Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scannable Holographic QR Ticket Card */}
        <div className="lg:col-span-5">
          <GlassCard hover={false} className="h-full p-6 text-center space-y-6 flex flex-col justify-between border-2 border-blue-500/30 bg-slate-950 text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400" />

            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-widest">
                  VOLTHUB GATE PASS
                </span>
                <FiShield className="text-emerald-400" size={18} />
              </div>

              {/* High-Tech Animated QR Visual */}
              <div className="relative inline-flex items-center justify-center p-5 bg-white rounded-2xl shadow-xl mx-auto my-2 group border-4 border-blue-500/40">
                {/* Laser scan line overlay */}
                <motion.div
                  initial={{ top: "5%" }}
                  animate={{ top: ["5%", "90%", "5%"] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                  className="absolute left-2 right-2 h-0.5 bg-rose-500 shadow-[0_0_12px_#ef4444] z-20 pointer-events-none"
                />

                {/* SVG QR Code Simulation */}
                <svg
                  className="w-44 h-44 text-slate-950"
                  viewBox="0 0 100 100"
                  fill="currentColor"
                >
                  {/* Top-Left Corner Box */}
                  <rect x="5" y="5" width="30" height="30" rx="4" fill="currentColor" />
                  <rect x="10" y="10" width="20" height="20" rx="2" fill="white" />
                  <rect x="15" y="15" width="10" height="10" fill="currentColor" />

                  {/* Top-Right Corner Box */}
                  <rect x="65" y="5" width="30" height="30" rx="4" fill="currentColor" />
                  <rect x="70" y="10" width="20" height="20" rx="2" fill="white" />
                  <rect x="75" y="15" width="10" height="10" fill="currentColor" />

                  {/* Bottom-Left Corner Box */}
                  <rect x="5" y="65" width="30" height="30" rx="4" fill="currentColor" />
                  <rect x="10" y="70" width="20" height="20" rx="2" fill="white" />
                  <rect x="15" y="75" width="10" height="10" fill="currentColor" />

                  {/* Random QR Pattern Modules */}
                  <rect x="42" y="10" width="8" height="8" />
                  <rect x="52" y="18" width="6" height="6" />
                  <rect x="40" y="28" width="10" height="6" />

                  <rect x="10" y="42" width="8" height="8" />
                  <rect x="22" y="48" width="6" height="10" />

                  <rect x="42" y="42" width="16" height="16" rx="2" />
                  <rect x="62" y="42" width="8" height="8" />

                  <rect x="72" y="52" width="10" height="6" />
                  <rect x="85" y="45" width="8" height="12" />

                  <rect x="45" y="65" width="8" height="8" />
                  <rect x="58" y="72" width="10" height="10" />
                  <rect x="42" y="82" width="8" height="8" />
                  <rect x="72" y="72" width="16" height="16" />
                </svg>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-blue-600 text-white font-black text-[10px] px-2 py-0.5 rounded shadow border border-white">
                    VOLT
                  </div>
                </div>
              </div>

              <div className="mt-3 font-mono text-center space-y-1">
                <span className="text-[11px] text-slate-400 uppercase tracking-widest block">
                  SECURITY CHECKSUM TOKEN
                </span>
                <span className="text-xs text-blue-400 font-bold block bg-slate-900/80 py-1.5 px-3 rounded-lg border border-slate-800">
                  {booking.bookingId}-SEC998X-GRID
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <FiPrinter size={14} /> Print Pass
              </button>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(booking.bookingId);
                  alert("Booking ID copied to clipboard!");
                }}
                className="flex-1 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <FiShare2 size={14} /> Copy ID
              </button>
            </div>
          </GlassCard>
        </div>

        {/* Detailed Reservation Summary Card */}
        <div className="lg:col-span-7 space-y-6">
          <GlassCard hover={false} className="p-6 space-y-6 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <FiCpu className="text-blue-600" /> Reservation Specification Sheet
              </h3>
              <span className="text-xs text-slate-500 font-mono">Invoice: {booking.invoiceId}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">
                  Station Hub
                </span>
                <span className="text-slate-900 font-bold text-sm block mt-0.5">
                  {booking.stationName}
                </span>
                <span className="text-[10px] text-slate-500 font-normal block mt-1 flex items-center gap-1">
                  <FiMapPin className="text-blue-600" /> VoltHub Grid Station #{booking.stationId}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">
                  Assigned Bay / Charger
                </span>
                <span className="text-blue-600 font-bold text-sm block mt-0.5">
                  Unit {booking.chargerId}
                </span>
                <span className="text-[10px] text-emerald-600 font-bold block mt-1">
                  {booking.connectorType} Fast DC
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">
                  Vehicle License Plate
                </span>
                <span className="text-slate-900 font-bold text-sm block mt-0.5">
                  {booking.vehicleNo}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Registered Driver Vehicle
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">
                  Reserved Time Slot
                </span>
                <span className="text-amber-600 font-bold text-sm block mt-0.5">
                  {booking.timeSlot}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Guaranteed minimum 150-250 kW output
                </span>
              </div>
            </div>

            {/* Price Summary Strip */}
            <div className="bg-slate-950 text-white p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Estimated Tariff Payable
                </span>
                <span className="text-2xl font-black text-blue-400 font-mono">
                  ₹{parseFloat(booking.price).toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-emerald-400 font-bold block uppercase tracking-wider">
                  Payment Status
                </span>
                <span className="text-xs text-white font-mono font-bold">
                  Billed to Account ({booking.invoiceId})
                </span>
              </div>
            </div>

            {/* Navigation Actions via Hooks */}
            <div className="space-y-3 pt-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Next Steps & Traversals
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CyberButton
                  onClick={() => navigate("/dashboard/charge")}
                  variant="primary"
                  className="py-3 px-4 text-xs font-bold w-full justify-center"
                >
                  <FiZap /> Launch Live Charger Simulator
                </CyberButton>

                <CyberButton
                  onClick={() => navigate("/dashboard/route")}
                  variant="secondary"
                  className="py-3 px-4 text-xs font-bold w-full justify-center"
                >
                  <FiNavigation /> Get GPS Route Directions
                </CyberButton>

                <CyberButton
                  onClick={() => navigate("/dashboard/billing")}
                  variant="glass"
                  className="py-3 px-4 text-xs font-bold w-full justify-center text-slate-800"
                >
                  <FiFileText /> View Invoice Receipt
                </CyberButton>

                <CyberButton
                  onClick={() => navigate("/dashboard/book")}
                  variant="glass"
                  className="py-3 px-4 text-xs font-bold w-full justify-center text-slate-800"
                >
                  <FiCalendar /> Reserve Another Slot
                </CyberButton>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

export default BookingConfirmation;
