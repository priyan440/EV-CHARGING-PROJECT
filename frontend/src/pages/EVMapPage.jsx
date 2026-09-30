import React from "react";
import EVMap from "../components/EVMap";
import { Zap, ShieldCheck, MapPin, Globe } from "lucide-react";

export default function EVMapPage() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto px-2 sm:px-4 py-3 font-sans">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-surface)] p-4 sm:p-5 rounded-3xl border border-[var(--border-subtle)] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-mono font-bold tracking-wider uppercase border border-emerald-500/20 flex items-center gap-1">
              <Globe size={11} /> REAL-TIME OSM NETWORK
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 text-[10px] font-mono font-bold tracking-wider uppercase border border-cyan-500/20">
              KEYLESS TILESET
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-grotesk tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <Zap className="text-[var(--accent-primary)]" size={24} />
            Interactive EV Charging Map
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Explore live EV charging stations dynamically loaded from OpenStreetMap Overpass API across India.
          </p>
        </div>
      </div>

      {/* Full Map Canvas */}
      <div className="h-[calc(100vh-14rem)] min-h-[580px] w-full rounded-3xl overflow-hidden shadow-2xl border border-[var(--border-subtle)]">
        <EVMap />
      </div>
    </div>
  );
}
