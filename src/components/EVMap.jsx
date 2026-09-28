import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import { Zap, Navigation, X, Shield, Info, BatteryCharging, ExternalLink } from "lucide-react";
import { fetchChargingStations } from "../services/overpassService";
import { createEVMarkerIcon } from "./ChargingStationMarker";
import StationPopup from "./StationPopup";
import MapControls from "./MapControls";
import MapSearch from "./MapSearch";
import MapLegend from "./MapLegend";

// Fix default Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Standard OpenStreetMap Tile Layers (100% Keyless raster basemaps)
const BASEMAP_LAYERS = {
  osmStandard: {
    name: "OpenStreetMap Standard",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  osmHot: {
    name: "OpenStreetMap Humanitarian",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors, Tiles style by Humanitarian OpenStreetMap Team',
    maxZoom: 19,
  },
  openTopo: {
    name: "OpenTopoMap",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; OpenTopoMap',
    maxZoom: 17,
  },
};

// Center of India default
const DEFAULT_INDIA_CENTER = [20.5937, 78.9629];
const DEFAULT_ZOOM = 5;

/**
 * Controller inside MapContainer to handle map events, debounced viewport queries, and camera moves
 */
function MapController({
  onBoundsChange,
  targetCenter,
  targetZoom,
  userLocation,
}) {
  const map = useMap();
  const debounceTimerRef = useRef(null);

  // Trigger station fetch on viewport change
  useMapEvents({
    moveend: () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        onBoundsChange(map.getBounds());
      }, 650);
    },
    zoomend: () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        onBoundsChange(map.getBounds());
      }, 650);
    },
  });

  // Handle flyTo when targetCenter changes
  useEffect(() => {
    if (targetCenter && targetCenter[0] && targetCenter[1]) {
      map.flyTo(targetCenter, targetZoom || 12, { duration: 1.5 });
    }
  }, [targetCenter, targetZoom, map]);

  // Initial bounds fetch when map is mounted
  useEffect(() => {
    const timer = setTimeout(() => {
      onBoundsChange(map.getBounds());
    }, 400);
    return () => clearTimeout(timer);
  }, [map, onBoundsChange]);

  return null;
}

/**
 * Marker Clustering wrapper with custom dark-cyber cluster pins
 */
function ClusterLayer({ stations, userLocation, onBook, onViewDetails }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 55,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `
            <div class="relative flex items-center justify-center w-10 h-10 rounded-full bg-[#0B1329] border-2 border-emerald-400 text-emerald-400 font-mono font-bold text-xs shadow-2xl transition hover:scale-110">
              <span class="mr-0.5">${count}</span>
              <span class="text-[10px] text-amber-300">⚡</span>
            </div>
          `,
          className: "custom-ev-cluster-icon",
          iconSize: [40, 40],
        });
      },
    });

    stations.forEach((st) => {
      const lat = st.lat || st.latitude;
      const lng = st.lng || st.longitude;
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

      const marker = L.marker([lat, lng], {
        icon: createEVMarkerIcon(st),
      });

      // Bind custom popup HTML
      const directionsUrl = `https://www.openstreetmap.org/directions?from=${
        userLocation?.latitude && userLocation?.longitude
          ? `${userLocation.latitude},${userLocation.longitude}`
          : ""
      }&to=${lat},${lng}`;

      const statusColor =
        st.status === "operational"
          ? "#10B981"
          : st.status === "non-operational"
          ? "#EF4444"
          : "#94A3B8";

      const popupHtml = `
        <div style="font-family: system-ui, -apple-system, sans-serif; width: 280px; padding: 4px; color: #F8FAFC;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 6px; margin-bottom: 8px;">
            <div style="display: flex; items-center: center; gap: 4px; color: #F59E0B; font-weight: 800; font-size: 11px; text-transform: uppercase;">
              ⚡ EV CHARGING STATION
            </div>
            <span style="font-size: 10px; font-weight: 700; color: ${statusColor}; background: ${statusColor}18; border: 1px solid ${statusColor}40; padding: 2px 8px; border-radius: 9999px;">
              ${st.status === "operational" ? "Operational" : st.status === "non-operational" ? "Non-operational" : "Unknown"}
            </span>
          </div>

          <div style="font-weight: 800; font-size: 14px; color: #FFFFFF; line-height: 1.3; margin-bottom: 2px;">
            ${st.name || "EV Charging Station"}
          </div>
          <div style="font-size: 11px; color: #94A3B8; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            📍 ${st.address || st.city || "Visible Map View"}
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px; background: #0F172A; border: 1px solid #1E293B; border-radius: 8px; padding: 8px; margin-bottom: 10px;">
            <div>
              <span style="display: block; font-size: 9px; color: #64748B; font-weight: 700; text-transform: uppercase;">Operator:</span>
              <span style="font-weight: 600; color: #CBD5E1; overflow: hidden; text-overflow: ellipsis; display: block; white-space: nowrap;">${st.operator || "Not available"}</span>
            </div>
            <div>
              <span style="display: block; font-size: 9px; color: #64748B; font-weight: 700; text-transform: uppercase;">Capacity:</span>
              <span style="font-weight: 600; color: #CBD5E1;">${st.capacity || "Not available"}</span>
            </div>
            <div>
              <span style="display: block; font-size: 9px; color: #64748B; font-weight: 700; text-transform: uppercase;">Power:</span>
              <span style="font-weight: 700; color: #38BDF8;">${st.power || "Not available"}</span>
            </div>
            <div>
              <span style="display: block; font-size: 9px; color: #64748B; font-weight: 700; text-transform: uppercase;">Connector:</span>
              <span style="font-weight: 700; color: #34D399; overflow: hidden; text-overflow: ellipsis; display: block; white-space: nowrap;">${st.connector || "Not available"}</span>
            </div>
            <div>
              <span style="display: block; font-size: 9px; color: #64748B; font-weight: 700; text-transform: uppercase;">Access:</span>
              <span style="font-weight: 600; color: #CBD5E1;">${st.access || "Public"}</span>
            </div>
            <div>
              <span style="display: block; font-size: 9px; color: #64748B; font-weight: 700; text-transform: uppercase;">Hours:</span>
              <span style="font-weight: 600; color: #CBD5E1;">${st.openingHours || "Not available"}</span>
            </div>
          </div>

          <div style="display: flex; gap: 6px;">
            <button id="osm-btn-details-${st.id}" style="flex: 1; padding: 7px 4px; background: #1E293B; border: 1px solid #334155; color: #F1F5F9; font-size: 11px; font-weight: 700; border-radius: 8px; cursor: pointer;">
              Details
            </button>
            <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="flex: 1; text-align: center; text-decoration: none; padding: 7px 4px; background: #0369A1; border: 1px solid #0284C7; color: #FFFFFF; font-size: 11px; font-weight: 700; border-radius: 8px; display: inline-block;">
              Directions
            </a>
            <button id="osm-btn-book-${st.id}" style="flex: 1; padding: 7px 4px; background: #2563EB; border: 1px solid #3B82F6; color: #FFFFFF; font-size: 11px; font-weight: 700; border-radius: 8px; cursor: pointer;">
              ⚡ Book
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        className: "custom-osm-ev-popup",
        closeButton: true,
      });

      marker.on("popupopen", () => {
        const detailsBtn = document.getElementById(`osm-btn-details-${st.id}`);
        if (detailsBtn) {
          detailsBtn.onclick = () => onViewDetails(st);
        }

        const bookBtn = document.getElementById(`osm-btn-book-${st.id}`);
        if (bookBtn) {
          bookBtn.onclick = () => onBook(st);
        }
      });

      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);

    return () => {
      map.removeLayer(clusterGroup);
    };
  }, [map, stations, userLocation, onBook, onViewDetails]);

  return null;
}

export default function EVMap({
  initialCenter = null,
  initialZoom = null,
  selectedStation = null,
  onSelectStation = null,
}) {
  const navigate = useNavigate();

  // Location and Camera State
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationToast, setLocationToast] = useState("");
  const [targetCenter, setTargetCenter] = useState(initialCenter);
  const [targetZoom, setTargetZoom] = useState(initialZoom);

  // Basemap tile state
  const [activeLayerKey, setActiveLayerKey] = useState("osmStandard");
  const activeLayer = BASEMAP_LAYERS[activeLayerKey] || BASEMAP_LAYERS.osmStandard;

  // Stations State
  const [stations, setStations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stationModalItem, setStationModalItem] = useState(null);

  // Bounds & In-flight request controller
  const currentBoundsRef = useRef(null);
  const abortControllerRef = useRef(null);

  // 1. Browser Geolocation on Mount
  useEffect(() => {
    if (!navigator.geolocation) return;

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ latitude: lat, longitude: lng });
        setIsLocating(false);

        // If no explicit initial center was provided, fly to user location
        if (!initialCenter && !selectedStation) {
          setTargetCenter([lat, lng]);
          setTargetZoom(12);
        }
      },
      (err) => {
        // Fallback silently to India center without crashing
        console.info("Geolocation not granted or unavailable, defaulted to India center:", err.message);
        setIsLocating(false);
      },
      { timeout: 7000, enableHighAccuracy: true }
    );
  }, [initialCenter, selectedStation]);

  // Handle selectedStation prop change
  useEffect(() => {
    if (selectedStation) {
      const lat = parseFloat(selectedStation.lat || selectedStation.latitude);
      const lng = parseFloat(selectedStation.lng || selectedStation.longitude);
      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        setTargetCenter([lat, lng]);
        setTargetZoom(14);
      }
    }
  }, [selectedStation]);

  // 2. Fetch stations dynamically based on Leaflet bounding box
  const handleBoundsChange = useCallback(async (bounds) => {
    if (!bounds) return;
    currentBoundsRef.current = bounds;

    // Abort previous in-flight query
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const fetched = await fetchChargingStations(bounds, abortControllerRef.current.signal);
      setStations(fetched);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Overpass station load error:", err);
        setError("Unable to load charging stations. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 3. User Location Button Action
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      setLocationToast("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setLocationToast("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ latitude: lat, longitude: lng });
        setTargetCenter([lat, lng]);
        setTargetZoom(13);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        setLocationToast("Location permission denied. Please enable location access.");
        setTimeout(() => setLocationToast(""), 4500);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // 4. Refresh Stations Action
  const handleRefresh = () => {
    if (currentBoundsRef.current) {
      handleBoundsChange(currentBoundsRef.current);
    }
  };

  // 5. Search Location Select Action
  const handleSelectSearchedLocation = (loc) => {
    if (loc && loc.lat && loc.lng) {
      setTargetCenter([loc.lat, loc.lng]);
      setTargetZoom(12);
    }
  };

  // 6. Booking Redirection Action
  const handleBookStation = (st) => {
    if (onSelectStation) {
      onSelectStation(st);
    }
    const stName = encodeURIComponent(st.name || "EV Station");
    const power = encodeURIComponent(st.power || "60 kW");
    const conn = encodeURIComponent(st.connector || "CCS2");
    navigate(`/booking?stationId=${st.id}&stationName=${stName}&power=${power}&connector=${conn}`);
  };

  // 7. Details Modal Action
  const handleViewDetails = (st) => {
    setStationModalItem(st);
    if (onSelectStation) {
      onSelectStation(st);
    }
  };

  const defaultCenterCoord = initialCenter || DEFAULT_INDIA_CENTER;
  const defaultZoomLevel = initialZoom || DEFAULT_ZOOM;

  return (
    <div className="relative w-full h-full min-h-[520px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-[#070D1E] font-sans">
      {/* Search Bar at Top */}
      <MapSearch onSelectLocation={handleSelectSearchedLocation} />

      {/* Control Buttons (Zoom, GPS, Refresh, Layers) */}
      <MapControls
        onLocateUser={handleLocateUser}
        isLocating={isLocating}
        onRefresh={handleRefresh}
        isLoading={isLoading}
        activeLayer={activeLayerKey}
        onLayerChange={setActiveLayerKey}
        availableLayers={BASEMAP_LAYERS}
      />

      {/* Geolocation Denied Toast */}
      {locationToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[600] bg-rose-950/90 border border-rose-500 text-rose-200 text-xs px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 animate-fade-in">
          <span>⚠️ {locationToast}</span>
          <button
            onClick={() => setLocationToast("")}
            className="text-rose-300 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Leaflet Map Container */}
      <MapContainer
        center={defaultCenterCoord}
        zoom={defaultZoomLevel}
        scrollWheelZoom={true}
        zoomControl={false}
        style={{ width: "100%", height: "100%", minHeight: "520px" }}
        className="z-10"
      >
        <MapController
          onBoundsChange={handleBoundsChange}
          targetCenter={targetCenter}
          targetZoom={targetZoom}
          userLocation={userLocation}
        />

        {/* 100% OpenStreetMap Raster Tiles */}
        <TileLayer
          key={activeLayerKey}
          url={activeLayer.url}
          attribution={activeLayer.attribution}
          maxZoom={activeLayer.maxZoom}
        />

        {/* User GPS Location Marker with Blue Pulsing Animation */}
        {userLocation?.latitude && userLocation?.longitude && (
          <Marker
            position={[userLocation.latitude, userLocation.longitude]}
            icon={L.divIcon({
              className: "user-gps-marker",
              html: `
                <div class="relative flex items-center justify-center">
                  <span class="animate-ping absolute inline-flex h-9 w-9 rounded-full bg-cyan-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-5 w-5 bg-cyan-500 border-2 border-white shadow-xl"></span>
                </div>
              `,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            })}
          >
            <Popup>
              <div className="p-1 text-slate-900 text-xs font-bold font-sans">
                ● Your Current Location
              </div>
            </Popup>
          </Marker>
        )}

        {/* Dynamic Clustered Overpass EV Charging Station Markers */}
        <ClusterLayer
          stations={stations}
          userLocation={userLocation}
          onBook={handleBookStation}
          onViewDetails={handleViewDetails}
        />
      </MapContainer>

      {/* Map Legend & Actual Station Count Footer */}
      <MapLegend
        stationCount={stations.length}
        isLoading={isLoading}
        error={error}
        onRetry={handleRefresh}
      />

      {/* Station Technical Details Modal */}
      {stationModalItem && (
        <div className="fixed inset-0 z-[700] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1329] border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-slate-100 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Zap size={20} className="fill-amber-400" />
                </span>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {stationModalItem.name}
                  </h3>
                  <span className="text-[11px] font-mono text-cyan-400">
                    OpenStreetMap ID: {stationModalItem.osmId || stationModalItem.id}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStationModalItem(null)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 font-mono text-[10px] uppercase block">
                  Operator
                </span>
                <span className="font-bold text-white text-sm">
                  {stationModalItem.operator || stationModalItem.brand || "Not available"}
                </span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 font-mono text-[10px] uppercase block">
                  Status
                </span>
                <span
                  className={`font-bold text-sm ${
                    stationModalItem.status === "operational"
                      ? "text-emerald-400"
                      : stationModalItem.status === "non-operational"
                      ? "text-rose-400"
                      : "text-slate-400"
                  }`}
                >
                  {stationModalItem.status === "operational"
                    ? "Operational"
                    : stationModalItem.status === "non-operational"
                    ? "Non-operational"
                    : "Unknown Status"}
                </span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 font-mono text-[10px] uppercase block">
                  Charging Output / Power
                </span>
                <span className="font-bold text-cyan-400 text-sm">
                  {stationModalItem.power || "Not available"}
                </span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 font-mono text-[10px] uppercase block">
                  Connector Types
                </span>
                <span className="font-bold text-emerald-400 text-sm">
                  {stationModalItem.connector || "Not available"}
                </span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 font-mono text-[10px] uppercase block">
                  Capacity / Bays
                </span>
                <span className="font-bold text-white text-sm">
                  {stationModalItem.capacity || "Not available"}
                </span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 font-mono text-[10px] uppercase block">
                  Public Access
                </span>
                <span className="font-bold text-white text-sm">
                  {stationModalItem.access || "Public"}
                </span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 col-span-2">
                <span className="text-slate-400 font-mono text-[10px] uppercase block">
                  Opening Hours
                </span>
                <span className="font-bold text-white text-sm">
                  {stationModalItem.openingHours || "Not available"}
                </span>
              </div>
            </div>

            {/* Coordinates & Actions */}
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-1">
              <span>
                Coordinates: {stationModalItem.lat?.toFixed(5)}, {stationModalItem.lng?.toFixed(5)}
              </span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <a
                href={`https://www.openstreetmap.org/directions?to=${stationModalItem.lat},${stationModalItem.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs border border-cyan-500/30 transition text-center flex items-center justify-center gap-2"
              >
                <Navigation size={14} />
                <span>Open Navigation</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  const item = stationModalItem;
                  setStationModalItem(null);
                  handleBookStation(item);
                }}
                className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap size={14} className="fill-white" />
                <span>Book Charging Slot</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
