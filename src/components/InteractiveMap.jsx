import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { Zap, Navigation, Star, MapPin, Layers, LocateFixed, Globe, ExternalLink, ShieldCheck } from "lucide-react";
import { useLocation } from "../contexts/LocationContext";

// Fix default Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;

const getCustomMarkerIcon = (st) => {
  const isPlatform = !st.isExternal;
  const isOperational = st.status !== "Non-operational" && st.status !== "Offline";
  const isFast = st.isFast || (st.chargers || []).some((c) => (c.powerKw || 0) >= 30);

  let color = isPlatform ? "#10B981" : isOperational ? "#06B6D4" : "#EF4444";
  let label = isPlatform ? "VOLTCHARGE" : isFast ? "DC FAST" : "EV";

  const svgMarker = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 52" width="40" height="52">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.6"/>
        </filter>
      </defs>
      <path d="M20 0C9.006 0 0 9.006 0 20c0 15 20 32 20 32s20-17 20-32C40 9.006 30.994 0 20 0z" fill="${color}" stroke="#070D1E" stroke-width="2.5" filter="url(#shadow)"/>
      <circle cx="20" cy="20" r="12" fill="#070D1E"/>
      <path d="M21 11l-6 9h6l-1 7 7-9h-6l1-7z" fill="${color}"/>
    </svg>
  `;

  return L.divIcon({
    className: "custom-leaflet-marker transition-transform hover:scale-110",
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
            ${count} <span class="text-[9px] text-emerald-300 ml-0.5">⚡</span>
          </div>`,
          className: "custom-cluster-icon",
          iconSize: [40, 40],
        });
      },
    });

    stations.forEach((st) => {
      const lat = st.latitude;
      const lng = st.longitude;
      if (!lat || !lng) return;

      const marker = L.marker([lat, lng], {
        icon: getCustomMarkerIcon(st),
      });

      const isPlatform = !st.isExternal;
      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      const distance = getDistanceToStation ? getDistanceToStation(st) : 2.4;

      const popupHtml = `
        <div className="p-2 w-64 text-slate-900 font-inter">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; background-color: ${isPlatform ? '#D1FAE5' : '#E0F2FE'}; color: ${isPlatform ? '#065F46' : '#0369A1'}; padding: 2px 8px; border-radius: 4px; border: 1px solid ${isPlatform ? '#A7F3D0' : '#BAE6FD'};">
              ${isPlatform ? '⚡ VOLTCHARGE NETWORK' : st.operator || 'EV Network'}
            </span>
            <span style="font-size: 11px; font-weight: 700; color: #D97706;">
              ★ ${st.rating || 4.8}
            </span>
          </div>

          <h4 style="font-weight: 800; font-size: 13px; color: #0F172A; margin: 0 0 2px 0;">${st.name}</h4>
          <p style="font-size: 11px; color: #475569; margin: 0 0 8px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">📍 ${st.address}, ${st.city}</p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px; background-color: #F1F5F9; padding: 8px; border-radius: 8px; margin-bottom: 10px;">
            <div>
              <span style="color: #64748B; display: block; font-size: 10px; font-weight: 700; text-transform: uppercase;">Status:</span>
              <span style="font-weight: 800; color: ${st.status === 'Non-operational' ? '#DC2626' : '#059669'};">
                ${st.status || 'Operational'}
              </span>
            </div>
            <div>
              <span style="color: #64748B; display: block; font-size: 10px; font-weight: 700; text-transform: uppercase;">Charging:</span>
              <span style="font-weight: 800; color: #0284C7;">
                ${st.chargers?.[0]?.powerKw || 60} kW (${st.chargers?.[0]?.type || 'CCS2'})
              </span>
            </div>
          </div>

          <div style="display: flex; gap: 6px;">
            <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="flex: 1; text-align: center; background-color: #1E293B; color: #FFF; font-size: 11px; font-weight: 700; padding: 6px; border-radius: 8px; text-decoration: none; display: inline-block;">
              🧭 Directions
            </a>
            ${
              isPlatform
                ? `<button id="btn-book-${st.id}" style="flex: 1; background-color: #10B981; color: #070D1E; font-size: 11px; font-weight: 800; padding: 6px; border-radius: 8px; border: none; cursor: pointer;">
                    ⚡ Book Now
                  </button>`
                : `<button id="btn-details-${st.id}" style="flex: 1; background-color: #0284C7; color: #FFF; font-size: 11px; font-weight: 700; padding: 6px; border-radius: 8px; border: none; cursor: pointer;">
                    View Details
                  </button>`
            }
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { className: "station-leaflet-popup" });

      marker.on("popupopen", () => {
        const bookBtn = document.getElementById(`btn-book-${st.id}`);
        if (bookBtn) {
          bookBtn.onclick = () => navigate(`/customer/book?stationId=${st.id}`);
        }
        const detailsBtn = document.getElementById(`btn-details-${st.id}`);
        if (detailsBtn) {
          detailsBtn.onclick = () => {
            if (onSelectStation) onSelectStation(st);
            navigate(`/customer/stations/${st.id}`);
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
  const [mapStyle, setMapStyle] = useState("dark"); // dark, standard

  // Default center points strictly to India [20.5937, 78.9629]
  const defaultCenter = selectedStation
    ? [selectedStation.latitude, selectedStation.longitude]
    : currentLocation?.latitude
    ? [currentLocation.latitude, currentLocation.longitude]
    : [20.5937, 78.9629]; // Center of India

  const defaultZoom = selectedStation ? 14 : currentLocation?.latitude ? 11 : 5;

  const tileUrls = {
    dark: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    standard: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  };

  return (
    <div className="relative w-full h-full min-h-[480px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 font-inter">
      
      {/* Map Control Buttons Overlay (Top Right) */}
      <div className="absolute top-4 right-4 z-[500] flex flex-col gap-2">
        <button
          onClick={detectLocation}
          disabled={isLocating}
          title="📍 Recenter on My GPS Location"
          className="p-3 bg-slate-900/95 hover:bg-slate-800 backdrop-blur-md text-emerald-400 border border-slate-700 rounded-2xl shadow-xl transition flex items-center justify-center"
        >
          <LocateFixed size={18} className={isLocating ? "animate-spin" : ""} />
        </button>

        <button
          onClick={() => setMapStyle(mapStyle === "dark" ? "standard" : "dark")}
          title="Toggle Map Style"
          className="p-3 bg-slate-900/95 hover:bg-slate-800 backdrop-blur-md text-cyan-400 border border-slate-700 rounded-2xl shadow-xl transition flex items-center justify-center text-xs font-bold"
        >
          <Layers size={18} />
        </button>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%" }}
        className="z-10"
      >
        <ChangeMapView center={defaultCenter} zoom={defaultZoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Powered by Open Charge Map'
          url={tileUrls[mapStyle]}
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
              <div className="p-1 text-slate-900 text-xs font-bold font-inter">
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
        <div className="font-bold text-slate-200 mb-2 flex items-center justify-between gap-4 font-grotesk">
          <span className="flex items-center gap-1.5">
            <Globe size={14} className="text-emerald-400" /> Real India EV Network
          </span>
          <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
            {stations.length} Loaded POIs
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow"></span> VoltCharge (Bookable)
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block shadow"></span> External Operational
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shadow"></span> Non-operational
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block shadow"></span> Unknown Status
          </div>
        </div>
        <p className="text-[9px] text-slate-400 border-t border-slate-800/80 pt-2 mt-2 font-mono leading-tight">
          Powered by Open Charge Map & OpenStreetMap. Verify charger availability before traveling.
        </p>
      </div>
    </div>
  );
}
