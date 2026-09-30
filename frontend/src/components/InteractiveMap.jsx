import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import {
  Zap,
  Navigation,
  Star,
  MapPin,
  Layers,
  LocateFixed,
  Globe,
  ExternalLink,
  ShieldCheck,
  Check,
} from "lucide-react";
import { useLocation } from "../contexts/LocationContext";

// Fix default Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom EV Pin Generator based on operational status
const getCustomMarkerIcon = (st) => {
  const isOperational = st.status === "operational" || st.status === "Operational" || st.status === "Available";
  const isNonOperational = st.status === "non-operational" || st.status === "Non-operational" || st.status === "Offline";

  let color = isOperational ? "#10B981" : isNonOperational ? "#EF4444" : "#94A3B8";

  const svgMarker = `
    <div class="custom-ev-pin-wrapper transition-transform hover:scale-110 cursor-pointer">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 52" width="40" height="52">
        <defs>
          <filter id="shadow-${st.id}" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.6"/>
          </filter>
        </defs>
        <path d="M20 0C9.006 0 0 9.006 0 20c0 15 20 32 20 32s20-17 20-32C40 9.006 30.994 0 20 0z" fill="${color}" stroke="#070D1E" stroke-width="2.5" filter="url(#shadow-${st.id})"/>
        <circle cx="20" cy="20" r="12" fill="#070D1E"/>
        <path d="M21 11l-6 9h6l-1 7 7-9h-6l1-7z" fill="${color}"/>
      </svg>
    </div>
  `;

  return L.divIcon({
    className: "custom-leaflet-marker",
    html: svgMarker,
    iconSize: [40, 52],
    iconAnchor: [20, 52],
    popupAnchor: [0, -46],
  });
};

function ChangeMapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map]);

  return null;
}

// Marker Clustering Layer Wrapper
function MarkerClusterGroupComponent({ stations, onSelectStation, navigate, getDistanceToStation }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: function (cluster) {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div class="w-10 h-10 rounded-full bg-[#0B132B] border-2 border-emerald-400 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center shadow-2xl">
            ${count} <span class="text-[9px] text-amber-300 ml-0.5">⚡</span>
          </div>`,
          className: "custom-cluster-icon",
          iconSize: [40, 40],
        });
      },
    });

    // De-duplicate stations before adding to map cluster
    const seenIds = new Set();
    const uniqueStations = [];
    stations.forEach((st) => {
      const stableId = String(st.id || `${st.latitude || st.lat}_${st.longitude || st.lng}`);
      if (!seenIds.has(stableId)) {
        seenIds.add(stableId);
        uniqueStations.push(st);
      }
    });

    uniqueStations.forEach((st) => {
      const lat = parseFloat(st.latitude || st.lat);
      const lng = parseFloat(st.longitude || st.lng);
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

      const marker = L.marker([lat, lng], {
        icon: getCustomMarkerIcon(st),
      });

      const directionsUrl = `https://www.openstreetmap.org/directions?to=${lat},${lng}`;
      const distance = getDistanceToStation ? getDistanceToStation(st) : null;
      const distanceText = distance != null ? `${distance} km away` : "Distance unavailable";

      const isOperational = st.status === "operational" || st.status === "Operational" || st.status === "Available";
      const isNonOperational = st.status === "non-operational" || st.status === "Non-operational" || st.status === "Offline";
      const statusText = isOperational ? "Operational" : isNonOperational ? "Non-operational" : "Unknown";
      const statusColor = isOperational ? "#10B981" : isNonOperational ? "#EF4444" : "#94A3B8";

      const popupHtml = `
        <div class="p-2 w-72 text-slate-100 font-sans" style="font-family: system-ui, -apple-system, sans-serif;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1px solid #334155; padding-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #F59E0B; display: flex; align-items: center; gap: 4px;">
              ⚡ EV CHARGING STATION
            </span>
            <span style="font-size: 10px; font-weight: 700; color: ${statusColor}; background: ${statusColor}18; border: 1px solid ${statusColor}40; padding: 2px 8px; border-radius: 9999px;">
              ${statusText}
            </span>
          </div>

          <h4 style="font-weight: 800; font-size: 13px; color: #FFFFFF; margin: 0 0 2px 0;">${st.name || "EV Charging Station"}</h4>
          <p style="font-size: 11px; color: #94A3B8; margin: 0 0 4px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            📍 ${st.address || st.city || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`}
          </p>
          <p style="font-size: 10px; font-weight: 700; color: #38BDF8; margin: 0 0 8px 0;">🧭 ${distanceText}</p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px; background-color: #0F172A; border: 1px solid #1E293B; padding: 8px; border-radius: 8px; margin-bottom: 10px;">
            <div>
              <span style="color: #64748B; display: block; font-size: 9px; font-weight: 700; text-transform: uppercase;">Operator:</span>
              <span style="font-weight: 600; color: #E2E8F0; overflow: hidden; text-overflow: ellipsis; display: block; white-space: nowrap;">
                ${st.operator || st.brand || 'Not available'}
              </span>
            </div>
            <div>
              <span style="color: #64748B; display: block; font-size: 9px; font-weight: 700; text-transform: uppercase;">Capacity:</span>
              <span style="font-weight: 600; color: #E2E8F0;">
                ${st.capacity || 'Not available'}
              </span>
            </div>
            <div>
              <span style="color: #64748B; display: block; font-size: 9px; font-weight: 700; text-transform: uppercase;">Power:</span>
              <span style="font-weight: 700; color: #38BDF8;">
                ${st.power || (st.chargers?.[0]?.powerKw ? `${st.chargers[0].powerKw} kW` : 'Not available')}
              </span>
            </div>
            <div>
              <span style="color: #64748B; display: block; font-size: 9px; font-weight: 700; text-transform: uppercase;">Connector:</span>
              <span style="font-weight: 700; color: #34D399; overflow: hidden; text-overflow: ellipsis; display: block; white-space: nowrap;">
                ${st.connector || st.chargers?.[0]?.type || 'Not available'}
              </span>
            </div>
          </div>

          <div style="display: flex; gap: 6px;">
            <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="flex: 1; text-align: center; background-color: #0369A1; color: #FFF; font-size: 11px; font-weight: 700; padding: 7px 4px; border-radius: 8px; text-decoration: none; display: inline-block;">
              🧭 Directions
            </a>
            <button id="interactive-btn-book-${st.id}" style="flex: 1; background-color: #2563EB; color: #FFFFFF; font-size: 11px; font-weight: 700; padding: 7px 4px; border-radius: 8px; border: none; cursor: pointer;">
              ⚡ Book Charging
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { className: "station-leaflet-popup" });

      marker.on("popupopen", () => {
        const bookBtn = document.getElementById(`interactive-btn-book-${st.id}`);
        if (bookBtn) {
          bookBtn.onclick = () => {
            if (onSelectStation) onSelectStation(st);
            const stName = encodeURIComponent(st.name || "EV Station");
            const power = encodeURIComponent(st.power || "60 kW");
            const conn = encodeURIComponent(st.connector || "CCS2");
            navigate(`/booking?stationId=${st.id}&stationName=${stName}&power=${power}&connector=${conn}`);
          };
        }
      });

      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);

    return () => {
      map.removeLayer(clusterGroup);
    };
  }, [map, stations, navigate, onSelectStation, getDistanceToStation]);

  return null;
}

export default function InteractiveMap({ stations = [], selectedStation = null, onSelectStation }) {
  const navigate = useNavigate();
  const { currentLocation, getDistanceToStation, detectLocation, isLocating } = useLocation();

  // Keyless OpenStreetMap Raster Tiles
  const osmTileConfig = {
    standard: {
      name: "OpenStreetMap Standard",
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
    },
    humanitarian: {
      name: "OpenStreetMap Humanitarian",
      url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors, Tiles style by HOT',
      maxZoom: 19,
    },
  };

  const [activeTileKey, setActiveTileKey] = useState("standard");
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const activeTile = osmTileConfig[activeTileKey] || osmTileConfig.standard;

  // Default center points strictly to selected station, user GPS location, or India center [20.5937, 78.9629]
  const defaultCenter = selectedStation
    ? [parseFloat(selectedStation.latitude || selectedStation.lat), parseFloat(selectedStation.longitude || selectedStation.lng)]
    : currentLocation?.latitude && currentLocation?.longitude
    ? [parseFloat(currentLocation.latitude), parseFloat(currentLocation.longitude)]
    : [20.5937, 78.9629]; // Center of India

  const defaultZoom = selectedStation ? 14 : currentLocation?.latitude ? 11 : 5;

  return (
    <div className="relative w-full h-full min-h-[480px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-[#070D1E] font-sans">
      {/* Map Control Buttons Overlay (Top Right) */}
      <div className="absolute top-4 right-4 z-[500] flex flex-col gap-2">
        <button
          onClick={detectLocation}
          disabled={isLocating}
          title="📍 Recenter on My GPS Location"
          className="p-3 bg-slate-900/95 hover:bg-slate-800 backdrop-blur-md text-emerald-400 border border-slate-700 rounded-2xl shadow-xl transition flex items-center justify-center cursor-pointer active:scale-95"
        >
          <LocateFixed size={18} className={isLocating ? "animate-spin" : ""} />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            title="Map Tile Style"
            className="p-3 bg-slate-900/95 hover:bg-slate-800 backdrop-blur-md text-cyan-400 border border-slate-700 rounded-2xl shadow-xl transition flex items-center justify-center cursor-pointer active:scale-95"
          >
            <Layers size={18} />
          </button>

          {showLayerMenu && (
            <div className="absolute right-full mr-2 top-0 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl p-2 w-48 text-xs text-slate-200 z-[600] space-y-1">
              <span className="block px-2 py-1 text-[10px] font-mono uppercase text-slate-400 font-bold border-b border-slate-800">
                Basemap
              </span>
              {Object.entries(osmTileConfig).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => {
                    setActiveTileKey(key);
                    setShowLayerMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition cursor-pointer ${
                    activeTileKey === key
                      ? "bg-blue-600/20 text-blue-400 font-bold"
                      : "hover:bg-slate-800 text-slate-300"
                  }`}
                >
                  <span>{config.name}</span>
                  {activeTileKey === key && <Check size={14} className="text-blue-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <MapContainer
        key={activeTileKey}
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%" }}
        className="z-10"
      >
        <ChangeMapView center={defaultCenter} zoom={defaultZoom} />

        {/* 100% Keyless OpenStreetMap Raster Tiles */}
        <TileLayer
          attribution={activeTile.attribution}
          url={activeTile.url}
          maxZoom={activeTile.maxZoom}
        />

        {/* User Current GPS Location Marker */}
        {currentLocation?.latitude && currentLocation?.longitude && (
          <Marker
            position={[currentLocation.latitude, currentLocation.longitude]}
            icon={L.divIcon({
              className: "user-gps-marker",
              html: `<div class="relative flex items-center justify-center">
                <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-cyan-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-5 w-5 bg-cyan-500 border-2 border-white shadow-lg"></span>
              </div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            })}
          >
            <Popup>
              <div className="p-1 text-slate-900 text-xs font-bold font-sans">
                📍 You Are Here ({currentLocation.city || "Current Location"})
              </div>
            </Popup>
          </Marker>
        )}

        {/* Marker Clustering Layer */}
        <MarkerClusterGroupComponent
          stations={stations}
          onSelectStation={onSelectStation}
          navigate={navigate}
          getDistanceToStation={getDistanceToStation}
        />
      </MapContainer>

      {/* Map Legend & Real Data Attribution Footer (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-[500] bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800 text-xs text-slate-300 shadow-2xl max-w-sm hidden sm:block">
        <div className="font-bold text-slate-200 mb-2 flex items-center justify-between gap-4 font-mono">
          <span className="flex items-center gap-1.5">
            <Zap size={14} className="text-emerald-400 fill-emerald-400" /> REAL EV CHARGING NETWORK
          </span>
          <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
            {stations.length} stations found
          </span>
        </div>
        <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 text-[11px] py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow"></span>{" "}
            Operational
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow"></span>{" "}
            Non-operational
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block shadow"></span>{" "}
            Unknown
          </div>
        </div>
        <p className="text-[9px] text-slate-400 border-t border-slate-800/80 pt-2 mt-2 font-mono leading-tight">
          Data: OpenStreetMap. Verify charger availability before traveling.
        </p>
      </div>
    </div>
  );
}
