import React, { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import StationPopup from "./StationPopup";

/**
 * Creates custom EV charging station marker icon with accurate status color:
 * GREEN: Available
 * ORANGE: Limited availability
 * RED: Fully occupied
 * GRAY: Offline / Maintenance
 */
export function createEVMarkerIcon(station) {
  let color = "#10B981"; // Default Green (Available)
  const status = (station.status || "").toUpperCase();
  const availableBays = parseInt(station.availableBays ?? station.availableSlots ?? 1, 10);

  if (status === "OFFLINE" || status === "MAINTENANCE" || status === "INACTIVE") {
    color = "#64748B"; // Gray
  } else if (status === "OCCUPIED" || availableBays === 0) {
    color = "#EF4444"; // Red
  } else if (status === "LIMITED" || availableBays === 1) {
    color = "#F59E0B"; // Orange
  } else {
    color = "#10B981"; // Green
  }

  const svgMarker = `
    <div class="group relative flex items-center justify-center transition-transform duration-200 hover:scale-125 cursor-pointer">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 38 48" width="38" height="48" class="drop-shadow-lg">
        <defs>
          <filter id="shadow-${station.id || station.stationId}" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.4"/>
          </filter>
        </defs>
        <path d="M19 0C8.5 0 0 8.5 0 19c0 14 19 29 19 29s19-15 19-29C38 8.5 29.5 0 19 0z" fill="${color}" stroke="#0F172A" stroke-width="1.5" filter="url(#shadow-${station.id || station.stationId})"/>
        <circle cx="19" cy="19" r="10.5" fill="#0F172A"/>
        <path d="M20 10l-5.5 8h5l-1 7.5 6.5-9.5h-5l1-6z" fill="${color}"/>
      </svg>
    </div>
  `;

  return L.divIcon({
    className: "custom-ev-marker",
    html: svgMarker,
    iconSize: [38, 48],
    iconAnchor: [19, 48],
    popupAnchor: [0, -44],
  });
}

export default function ChargingStationMarker({
  station,
  userLocation,
  onBook,
  onViewDetails,
}) {
  const lat = station.lat || station.latitude;
  const lng = station.lng || station.longitude;

  const icon = useMemo(() => createEVMarkerIcon(station), [station]);

  if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;

  return (
    <Marker position={[lat, lng]} icon={icon}>
      <Popup className="ev-station-leaflet-popup" autoPan={true} closeButton={true}>
        <StationPopup
          station={station}
          userLocation={userLocation}
          onBook={onBook}
          onViewDetails={onViewDetails}
        />
      </Popup>
    </Marker>
  );
}
