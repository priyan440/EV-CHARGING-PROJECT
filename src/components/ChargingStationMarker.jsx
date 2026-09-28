import React, { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import StationPopup from "./StationPopup";

/**
 * Creates custom EV charging station marker icon with accurate status color
 */
export function createEVMarkerIcon(station) {
  let color = "#94A3B8"; // Default Unknown (Gray)

  if (station.status === "operational") {
    color = "#10B981"; // Operational (Green)
  } else if (station.status === "non-operational") {
    color = "#EF4444"; // Non-operational (Red)
  } else if (station.isPlatform) {
    color = "#06B6D4"; // Platform default (Cyan)
  } else {
    color = "#94A3B8"; // Unknown (Gray)
  }

  const svgMarker = `
    <div class="group relative flex items-center justify-center transition-transform duration-200 hover:scale-125 cursor-pointer">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 38 48" width="38" height="48" class="drop-shadow-lg">
        <defs>
          <filter id="shadow-${station.id}" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.5"/>
          </filter>
        </defs>
        <path d="M19 0C8.5 0 0 8.5 0 19c0 14 19 29 19 29s19-15 19-29C38 8.5 29.5 0 19 0z" fill="${color}" stroke="#0F172A" stroke-width="2" filter="url(#shadow-${station.id})"/>
        <circle cx="19" cy="19" r="11" fill="#0B1329"/>
        <path d="M20 10l-6 8h6l-1 8 7-10h-6l1-6z" fill="${color}"/>
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
