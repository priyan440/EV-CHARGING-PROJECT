import React from "react";
import { Zap, Navigation, Info, Star } from "lucide-react";

/**
 * Calculates straight line distance between two coordinates in kilometers
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d < 10 ? d.toFixed(1) : Math.round(d).toString();
}

export default function StationPopup({
  station,
  userLocation,
  onBook,
  onViewDetails,
}) {
  if (!station) return null;

  const lat = station.lat || station.latitude;
  const lng = station.lng || station.longitude;

  const userLat = userLocation?.latitude || userLocation?.lat;
  const userLng = userLocation?.longitude || userLocation?.lng;

  const distanceKm =
    userLat && userLng && lat && lng
      ? calculateDistanceKm(userLat, userLng, lat, lng)
      : null;

  const fromCoord = userLat && userLng ? `${userLat},${userLng}` : "";
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${fromCoord}&destination=${lat},${lng}`;

  const availableBays = parseInt(station.availableBays ?? station.availableSlots ?? 0, 10);
  const totalBays = parseInt(station.totalBays ?? station.totalSlots ?? 4, 10);
  const status = (station.status || "AVAILABLE").toUpperCase();

  let statusBadgeColor = "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
  let statusText = "Available";
  let statusDot = "bg-emerald-500";

  if (status === "OFFLINE" || status === "MAINTENANCE" || status === "INACTIVE") {
    statusBadgeColor = "text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/30";
    statusText = "Maintenance";
    statusDot = "bg-slate-400";
  } else if (status === "OCCUPIED" || availableBays === 0) {
    statusBadgeColor = "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30";
    statusText = "Fully Occupied";
    statusDot = "bg-rose-500";
  } else if (status === "LIMITED" || availableBays <= 1) {
    statusBadgeColor = "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30";
    statusText = "1 Bay Left";
    statusDot = "bg-amber-500";
  }

  const networkName = station.networkName || station.operator || "GreenCharge";
  const chargingTypes = Array.isArray(station.chargingTypes)
    ? station.chargingTypes.join(", ")
    : station.connectorTypes || "CCS2, Type 2";

  return (
    <div className="w-72 sm:w-80 p-1 font-sans text-[var(--text-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="p-1 rounded-md bg-blue-500/10 text-[var(--accent-primary)]">
            <Zap size={14} className="fill-current" />
          </span>
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[var(--accent-primary)] truncate max-w-[130px]">
            {networkName}
          </span>
        </div>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 font-bold ${statusBadgeColor}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`}></span>
          {statusText}
        </span>
      </div>

      {/* Station Title & Location */}
      <h3 className="font-bold text-sm text-[var(--text-primary)] leading-snug mb-0.5 truncate">
        {station.stationName || station.name || "EV Charging Station"}
      </h3>
      <p className="text-[11px] text-[var(--text-muted)] leading-tight mb-2.5 line-clamp-1">
        📍 {station.address || `${station.city || "Chennai"}, Tamil Nadu`}
      </p>

      {/* Grid of details */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl p-2.5 text-[11px] mb-3">
        <div>
          <span className="block text-[9px] uppercase font-mono text-[var(--text-muted)]">Available Bays</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            {availableBays} / {totalBays} Bays
          </span>
        </div>

        <div>
          <span className="block text-[9px] uppercase font-mono text-[var(--text-muted)]">Power</span>
          <span className="font-bold text-blue-600 dark:text-blue-400">
            {station.power || `${station.powerKw || 120} kW`}
          </span>
        </div>

        <div>
          <span className="block text-[9px] uppercase font-mono text-[var(--text-muted)]">Tariff</span>
          <span className="font-bold text-[var(--text-primary)]">
            ₹{station.pricePerKwh || 18} / kWh
          </span>
        </div>

        <div>
          <span className="block text-[9px] uppercase font-mono text-[var(--text-muted)]">Rating</span>
          <span className="font-bold text-amber-500 flex items-center gap-0.5">
            <Star size={11} className="fill-amber-400 text-amber-400" />
            {station.rating || 4.9}
          </span>
        </div>

        <div className="col-span-2 border-t border-[var(--border-subtle)] pt-1.5">
          <span className="block text-[9px] uppercase font-mono text-[var(--text-muted)]">Connectors</span>
          <span className="font-semibold text-[var(--text-secondary)] text-[10px] truncate block">
            {chargingTypes}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5">
        {onViewDetails && (
          <button
            type="button"
            onClick={() => onViewDetails(station)}
            className="flex-1 px-2.5 py-1.5 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] font-bold text-[11px] border border-[var(--border-subtle)] transition flex items-center justify-center gap-1 cursor-pointer"
          >
            <Info size={12} />
            <span>Details</span>
          </button>
        )}

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 px-2.5 py-1.5 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--border-subtle)] text-blue-600 dark:text-blue-400 font-bold text-[11px] border border-blue-500/30 transition flex items-center justify-center gap-1 text-center no-underline cursor-pointer"
        >
          <Navigation size={12} />
          <span>Directions</span>
        </a>

        <button
          type="button"
          onClick={() => onBook(station)}
          className="flex-1 px-2.5 py-1.5 rounded-xl bg-[var(--accent-primary)] hover:opacity-90 text-white font-bold text-[11px] transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-1 cursor-pointer"
        >
          <Zap size={12} className="fill-white" />
          <span>Book</span>
        </button>
      </div>
    </div>
  );
}
