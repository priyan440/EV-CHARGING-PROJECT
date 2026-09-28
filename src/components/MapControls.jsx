import React, { useState } from "react";
import { useMap } from "react-leaflet";
import { Plus, Minus, LocateFixed, RefreshCw, Layers, Check } from "lucide-react";

export default function MapControls({
  onLocateUser,
  isLocating = false,
  onRefresh,
  isLoading = false,
  activeLayer,
  onLayerChange,
  availableLayers = {},
}) {
  const map = useMap();
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  const handleZoomIn = () => {
    map.zoomIn();
  };

  const handleZoomOut = () => {
    map.zoomOut();
  };

  return (
    <div className="absolute top-4 right-4 z-[500] flex flex-col items-end gap-2 font-sans">
      {/* Primary Action Buttons */}
      <div className="flex flex-col bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl p-1.5 gap-1">
        {/* Locate My Position */}
        <button
          type="button"
          onClick={onLocateUser}
          disabled={isLocating}
          title="📍 Recenter on My GPS Location"
          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-slate-700/60 transition flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <LocateFixed size={18} className={isLocating ? "animate-spin" : ""} />
        </button>

        {/* Refresh Stations */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          title="🔄 Refresh EV Stations for this Area"
          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 border border-slate-700/60 transition flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
        </button>

        {/* Map Layers Toggle */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            title="🗺 Map Layers"
            className={`p-2.5 rounded-xl border transition flex items-center justify-center cursor-pointer active:scale-95 ${
              showLayerMenu
                ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/30"
                : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/60"
            }`}
          >
            <Layers size={18} />
          </button>

          {/* Layer Options Dropdown */}
          {showLayerMenu && (
            <div className="absolute right-full mr-2 top-0 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl p-2 w-48 text-xs text-slate-200 z-[600] animate-fade-in space-y-1">
              <span className="block px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800">
                Map Basemap
              </span>
              {Object.entries(availableLayers).map(([key, layer]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onLayerChange(key);
                    setShowLayerMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs font-semibold transition cursor-pointer ${
                    activeLayer === key
                      ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 font-bold"
                      : "hover:bg-slate-800 text-slate-300"
                  }`}
                >
                  <span>{layer.name}</span>
                  {activeLayer === key && <Check size={14} className="text-blue-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Standard Zoom Controls (+ / -) */}
      <div className="flex flex-col bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl p-1.5 gap-1">
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In (+)"
          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition flex items-center justify-center cursor-pointer active:scale-95"
        >
          <Plus size={18} />
        </button>

        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out (-)"
          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition flex items-center justify-center cursor-pointer active:scale-95"
        >
          <Minus size={18} />
        </button>
      </div>
    </div>
  );
}
