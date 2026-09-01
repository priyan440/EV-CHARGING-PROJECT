import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Zap,
  MapPin,
  Clock,
  Phone,
  Star,
  ShieldCheck,
  Navigation,
  ArrowLeft,
  Wifi,
  Coffee,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useSystemState } from "../contexts/SystemStateContext";
import { useLocation } from "../contexts/LocationContext";

export default function StationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { stations, reviews } = useSystemState();
  const { getDistanceToStation, estimateTravelTimeMinutes } = useLocation();

  const station = stations.find((s) => s.id === id) || stations[0];
  const distance = getDistanceToStation(station) || station.distanceKm || 2.4;
  const eta = estimateTravelTimeMinutes(distance);

  const stationReviews = reviews.filter((r) => r.stationId === station.id);

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-bold bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl transition"
        >
          <ArrowLeft size={16} /> Back to Stations
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-xl border border-emerald-500/30">
            ID: {station.id}
          </span>
          <span className="text-xs font-bold bg-blue-500/20 text-blue-400 px-3 py-1 rounded-xl border border-blue-500/30">
            {station.status}
          </span>
        </div>
      </div>

      {/* Main Station Header Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-2xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">{station.name}</h1>
              <span className="flex items-center gap-1 text-amber-400 text-sm font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                <Star size={14} className="fill-amber-400" /> {station.rating || 4.9}
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-300 flex items-center gap-1.5">
              <MapPin size={16} className="text-emerald-400 shrink-0" /> {station.address}
            </p>
          </div>

          <button
            onClick={() => navigate(`/customer/book?stationId=${station.id}`)}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
          >
            <Zap size={16} className="fill-slate-950" /> Reserve Charging Slot
          </button>
        </div>

        {/* Quick Info Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Distance</span>
            <span className="font-extrabold text-white font-mono">{distance} km</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Travel Time</span>
            <span className="font-extrabold text-emerald-400 font-mono">~{eta} min</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Opening Hours</span>
            <span className="font-extrabold text-slate-200">{station.openingHours || "24/7 Open"}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact</span>
            <span className="font-extrabold text-slate-200">{station.contactNumber || "+91 98401 23456"}</span>
          </div>
        </div>
      </div>

      {/* Chargers Breakdown & Amenities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Chargers Bay Section (8 Cols) */}
        <div className="lg:col-span-8 p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap size={20} className="text-emerald-400" /> Available Charger Bays
            </h3>
            <span className="text-xs text-slate-400 font-mono font-bold">
              Total Chargers: {(station.chargers || []).length || 4}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(station.chargers || [
              { id: "CHG0001", connector: "CCS2", powerKw: 60, pricePerKwh: 18, status: "Available" },
              { id: "CHG0002", connector: "CCS2", powerKw: 150, pricePerKwh: 22, status: "Available" },
              { id: "CHG0003", connector: "Type 2", powerKw: 22, pricePerKwh: 14, status: "Occupied" },
              { id: "CHG0004", connector: "CHAdeMO", powerKw: 50, pricePerKwh: 16, status: "Available" },
            ]).map((ch) => {
              const isAvail = ch.status === "Available";
              return (
                <div
                  key={ch.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isAvail
                      ? "bg-slate-900/90 border-slate-800 hover:border-emerald-500/40"
                      : "bg-slate-950/60 border-slate-800/60 opacity-80"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-slate-300">{ch.id}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isAvail
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {ch.status}
                    </span>
                  </div>

                  <div className="space-y-1 my-2">
                    <div className="text-lg font-black text-white font-mono">{ch.connector}</div>
                    <div className="text-xs text-slate-400">Power Output: <span className="font-bold text-white font-mono">{ch.powerKw} kW</span></div>
                    <div className="text-xs text-slate-400">Rate: <span className="font-bold text-cyan-400 font-mono">₹{ch.pricePerKwh}/kWh</span></div>
                  </div>

                  <button
                    disabled={!isAvail}
                    onClick={() => navigate(`/customer/book?stationId=${station.id}&chargerId=${ch.id}`)}
                    className={`w-full py-2.5 mt-3 rounded-xl font-bold text-xs transition ${
                      isAvail
                        ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                        : "bg-slate-800 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    {isAvail ? "Select Charger & Book" : "Currently Occupied"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Amenities & Reviews (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Station Amenities */}
          <div className="p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
              Station Amenities
            </h3>
            <div className="space-y-2 text-xs">
              {(station.amenities || ["Free WiFi", "Coffee Lounge", "Restrooms", "Solar Canopy"]).map((amenity) => (
                <div key={amenity} className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Reviews */}
          <div className="p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>Customer Reviews</span>
              <span className="text-xs text-amber-400 font-mono">({stationReviews.length})</span>
            </h3>

            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
              {stationReviews.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">No reviews yet for this station.</p>
              ) : (
                stationReviews.map((rev) => (
                  <div key={rev.reviewId} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{rev.customerName}</span>
                      <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                        <Star size={10} className="fill-amber-400" /> {rev.rating}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">{rev.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
