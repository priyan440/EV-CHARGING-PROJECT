import React from "react";
import { Zap, Navigation, ExternalLink, Info, Calendar } from "lucide-react";

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

  // Directions URL via OpenStreetMap
  const fromCoord = userLat && userLng ? `${userLat},${userLng}` : "";
  const directionsUrl = `https://www.openstreetmap.org/directions?from=${fromCoord}&to=${lat},${lng}`;

  // Status visual badge
  const isOperational = station.status === "operational";
  const isNonOperational = station.status === "non-operational";

  const statusLabel = isOperational
    ? "Operational"
    : isNonOperational
    ? "Non-operational"
    : "Unknown Status";

  const statusColor = isOperational
    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
    : isNonOperational
    ? "text-rose-400 bg-rose-500/10 border-rose-500/30"
    : "text-slate-400 bg-slate-500/10 border-slate-500/30";

  const statusDot = isOperational
    ? "bg-emerald-500"
    : isNonOperational
    ? "bg-rose-500"
    : "bg-slate-400";

  return (
    <div className="station-popup-content w-72 sm:w-80 text-slate-100 p-1 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="p-1 rounded-md bg-amber-500/10 text-amber-400">
            <Zap size={15} className="fill-amber-400" />
          </span>
          <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-amber-400">
            EV CHARGING STATION
          </span>
        </div>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 font-bold ${statusColor}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`}></span>
          {statusLabel}
        </span>
      </div>

      {/* Station Title & Location */}
      <h3 className="font-bold text-sm text-white leading-snug mb-1">
        {station.name || "EV Charging Station"}
      </h3>
      <p className="text-[11px] text-slate-400 leading-normal mb-2.5 line-clamp-2">
        📍 {station.address || station.city || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`}
      </p>

      {/* Grid of specs: Operator, Capacity, Power, Connector, Access, Hours, Fee */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 text-[11px] mb-3">
        <div>
          <span className="block text-[10px] uppercase font-mono text-slate-400">Operator</span>
          <span className="font-semibold text-slate-200 truncate block">
            {station.operator || station.brand || "Not available"}
          </span>
        </div>

        <div>
          <span className="block text-[10px] uppercase font-mono text-slate-400">Capacity</span>
          <span className="font-semibold text-slate-200 truncate block">
            {station.capacity || "Not available"}
          </span>
        </div>

        <div>
          <span className="block text-[10px] uppercase font-mono text-slate-400">Power</span>
          <span className="font-semibold text-cyan-400 truncate block">
            {station.power || "Not available"}
          </span>
        </div>

        <div>
          <span className="block text-[10px] uppercase font-mono text-slate-400">Connector</span>
          <span className="font-semibold text-emerald-400 truncate block">
            {station.connector || "Not available"}
          </span>
        </div>

        <div>
          <span className="block text-[10px] uppercase font-mono text-slate-400">Access</span>
          <span className="font-semibold text-slate-200 truncate block">
            {station.access || "Public"}
          </span>
        </div>

        <div>
          <span className="block text-[10px] uppercase font-mono text-slate-400">Hours</span>
          <span className="font-semibold text-slate-200 truncate block">
            {station.openingHours || "Not available"}
          </span>
        </div>

        <div>
          <span className="block text-[10px] uppercase font-mono text-slate-400">Payment / Fee</span>
          <span className="font-semibold text-slate-200 truncate block">
            {station.fee || "Not available"}
          </span>
        </div>

        <div>
          <span className="block text-[10px] uppercase font-mono text-slate-400">Distance</span>
          <span className="font-semibold text-indigo-400 truncate block">
            {distanceKm ? `${distanceKm} km away` : "Not available"}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5">
        {onViewDetails && (
          <button
            type="button"
            onClick={() => onViewDetails(station)}
            className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] border border-slate-700 transition flex items-center justify-center gap-1 cursor-pointer active:scale-95"
          >
            <Info size={12} />
            <span>Details</span>
          </button>
        )}

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-[11px] border border-cyan-500/30 transition flex items-center justify-center gap-1 text-center no-underline cursor-pointer active:scale-95"
        >
          <Navigation size={12} />
          <span>Directions</span>
        </a>

        <button
          type="button"
          onClick={() => onBook(station)}
          className="flex-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-1 cursor-pointer active:scale-95"
        >
          <Zap size={12} className="fill-white" />
          <span>Book</span>
        </button>
      </div>
    </div>
  );
}
