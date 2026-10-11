import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  MapPin,
  Clock,
  Zap,
  Phone,
  ShieldCheck,
  Cpu,
  CreditCard,
  Camera,
  Coffee,
  Wifi,
  Sparkles,
  X,
  ExternalLink,
  Edit2,
  CheckCircle2,
  Sliders,
  BatteryCharging,
} from "lucide-react";
import {
  getOwnerChargers,
  getStationPhotos,
  getStationEnergyConfig,
  updateOwnerStation,
} from "../../services/ownerService";

export default function StationDetailsModal({ station, isOpen, onClose, onEdit, onManagePhotos }) {
  const [chargers, setChargers] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [energyConfig, setEnergyConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const [facilities, setFacilities] = useState([]);
  const [savingFacilities, setSavingFacilities] = useState(false);

  const availableFacilities = [
    { key: "WiFi", label: "High-Speed WiFi", icon: Wifi },
    { key: "Restrooms", label: "Clean Restrooms", icon: Sparkles },
    { key: "Cafe", label: "Cafe / Refreshments", icon: Coffee },
    { key: "Waiting Lounge", label: "AC Waiting Lounge", icon: Building2 },
    { key: "Covered Parking", label: "Covered Parking Canopy", icon: Building2 },
    { key: "24/7 Security", label: "24/7 CCTV & Security", icon: ShieldCheck },
    { key: "Wheelchair Accessible", label: "Wheelchair Accessible", icon: Sparkles },
    { key: "Solar Powered", label: "Solar Canopy Powered", icon: Zap },
  ];

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  useEffect(() => {
    if (isOpen && station) {
      const stId = station.stationId || station.id;
      setLoading(true);

      // Parse amenities
      let initialAmenities = [];
      if (Array.isArray(station.amenities)) {
        initialAmenities = station.amenities;
      } else if (typeof station.amenities === "string") {
        try {
          initialAmenities = JSON.parse(station.amenities);
        } catch {
          initialAmenities = station.amenities.split(",").map((s) => s.trim());
        }
      }
      setFacilities(initialAmenities.length > 0 ? initialAmenities : ["WiFi", "Restrooms", "Cafe", "Covered Parking"]);

      Promise.allSettled([
        getOwnerChargers(stId),
        getStationPhotos(stId),
        getStationEnergyConfig(stId),
      ])
        .then(([chgRes, photoRes, energyRes]) => {
          if (chgRes.status === "fulfilled") setChargers(Array.isArray(chgRes.value) ? chgRes.value : []);
          if (photoRes.status === "fulfilled") setPhotos(Array.isArray(photoRes.value) ? photoRes.value : []);
          if (energyRes.status === "fulfilled") setEnergyConfig(energyRes.value);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, station]);

  const handleToggleFacility = (key) => {
    setFacilities((prev) => {
      if (prev.includes(key)) {
        return prev.filter((item) => item !== key);
      }
      return [...prev, key];
    });
  };

  const handleSaveFacilities = async () => {
    setSavingFacilities(true);
    try {
      await updateOwnerStation(station.stationId || station.id, {
        amenities: facilities,
      });
      showToast("Station facilities updated in MySQL!");
    } catch (err) {
      showToast("Error updating facilities: " + err.message);
    } finally {
      setSavingFacilities(false);
    }
  };

  if (!isOpen || !station) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans text-[var(--text-primary)]">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-60 bg-[var(--accent-primary)] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-blue-400/30 animate-fade-in font-bold text-xs">
          <Sparkles className="w-4 h-4 text-yellow-300" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl max-w-4xl w-full p-6 shadow-2xl animate-fade-in my-8 max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col justify-between space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6 text-[var(--accent-primary)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[var(--accent-primary)] bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
                  {station.stationId || station.station_id || `STN000${station.id}`}
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  {station.status || "ACTIVE"}
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  {station.approvalStatus || station.approval_status || "APPROVED"}
                </span>
              </div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] mt-1">
                {station.stationName || station.station_name || station.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(station);
                }}
                className="px-3 py-1.5 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 transition cursor-pointer"
              >
                <Edit2 size={13} /> Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              activeTab === "overview"
                ? "bg-[var(--accent-primary)] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Overview & Specs
          </button>
          <button
            onClick={() => setActiveTab("facilities")}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              activeTab === "facilities"
                ? "bg-[var(--accent-primary)] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Facilities & Amenities ({facilities.length})
          </button>
          <button
            onClick={() => setActiveTab("chargers")}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              activeTab === "chargers"
                ? "bg-[var(--accent-primary)] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Chargers & Bays ({chargers.length})
          </button>
          <button
            onClick={() => setActiveTab("photos")}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              activeTab === "photos"
                ? "bg-[var(--accent-primary)] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Photos Gallery ({photos.length})
          </button>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="text-center py-16 bg-[var(--bg-surface-raised)] rounded-3xl border border-[var(--border-subtle)]">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-[var(--text-muted)] font-mono">Loading station specifications from MySQL...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. OVERVIEW TAB */}
            {activeTab === "overview" && (
              <div className="space-y-5">
                {/* Primary Hero Image & Address */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-slate-900 md:col-span-1">
                    <img
                      src={
                        station.image ||
                        photos.find((p) => p.isPrimary || p.is_primary)?.imageUrl ||
                        photos[0]?.imageUrl ||
                        "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=600&q=80"
                      }
                      alt={station.stationName}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => {
                        if (onManagePhotos) onManagePhotos(station);
                      }}
                      className="absolute bottom-2 right-2 bg-black/70 hover:bg-black/90 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition"
                    >
                      <Camera size={11} /> {photos.length} Photos
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] md:col-span-2 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                        Station Location & Coordinates
                      </div>
                      <div className="text-sm font-bold text-[var(--text-primary)] flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <span>
                          {station.address}, {station.city}, {station.state} - {station.pincode}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--border-subtle)] text-xs">
                      <div>
                        <div className="text-[10px] text-[var(--text-muted)] font-bold">LATITUDE</div>
                        <div className="font-mono font-bold text-[var(--text-primary)]">
                          {parseFloat(station.latitude || 13.0827).toFixed(4)}°N
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[var(--text-muted)] font-bold">LONGITUDE</div>
                        <div className="font-mono font-bold text-[var(--text-primary)]">
                          {parseFloat(station.longitude || 80.2707).toFixed(4)}°E
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[var(--text-muted)] font-bold">HOURS</div>
                        <div className="font-bold text-[var(--text-primary)]">
                          {station.openingTime || station.opening_time || "06:00 AM"} -{" "}
                          {station.closingTime || station.closing_time || "11:00 PM"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[var(--text-muted)] font-bold">CONTACT</div>
                        <div className="font-bold text-[var(--text-primary)]">
                          {station.contactNumber || station.contact_number || "+91 9876543210"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-center">
                    <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Total Chargers</div>
                    <div className="text-xl font-bold font-mono text-[var(--text-primary)] mt-1">
                      {chargers.length || station.totalChargers || station.total_slots || 4}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-center">
                    <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Site Power Limit</div>
                    <div className="text-xl font-bold font-mono text-[var(--accent-primary)] mt-1">
                      {station.maxPowerKw || station.max_power || 150} kW
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-center">
                    <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Base Tariff Rate</div>
                    <div className="text-xl font-bold font-mono text-amber-500 mt-1">
                      ₹{station.pricePerKwh || 18.0}/kWh
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-center">
                    <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Available Capacity</div>
                    <div className="text-xl font-bold font-mono text-emerald-500 mt-1">
                      {energyConfig?.availableChargingCapacityKw || Math.max(0, (station.maxPowerKw || 150) - 50)} kW
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                  <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    Station Description
                  </div>
                  <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                    {station.description || "High-speed multi-standard EV charging hub equipped with DC Fast CCS2 connectors, smart power management, and driver amenities."}
                  </p>
                </div>
              </div>
            )}

            {/* 2. FACILITIES TAB */}
            {activeTab === "facilities" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Configure Station Amenities</h3>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Select all available amenities at this station to inform drivers during trip planning.
                    </p>
                  </div>
                  <button
                    onClick={handleSaveFacilities}
                    disabled={savingFacilities}
                    className="px-4 py-2 bg-[var(--accent-primary)] hover:opacity-90 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 transition cursor-pointer"
                  >
                    {savingFacilities ? "Saving in MySQL..." : "Save Facilities"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableFacilities.map((fac) => {
                    const isChecked = facilities.includes(fac.key);
                    const Icon = fac.icon;
                    return (
                      <div
                        key={fac.key}
                        onClick={() => handleToggleFacility(fac.key)}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer select-none ${
                          isChecked
                            ? "bg-blue-500/10 border-blue-500/40 text-[var(--accent-primary)]"
                            : "bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-slate-400"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-5 h-5 ${isChecked ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"}`} />
                          <span className="text-xs font-bold text-[var(--text-primary)]">{fac.label}</span>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                            isChecked ? "bg-[var(--accent-primary)] border-blue-500 text-white" : "border-[var(--border-subtle)]"
                          }`}
                        >
                          {isChecked && <CheckCircle2 size={14} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. CHARGERS TAB */}
            {activeTab === "chargers" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Installed Charger Units ({chargers.length})</h3>
                  <Link
                    to={`/owner/chargers?stationId=${station.stationId || station.id}`}
                    className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-[var(--accent-primary)] border border-blue-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Sliders size={13} /> Full Charger Controller
                  </Link>
                </div>

                {chargers.length === 0 ? (
                  <div className="text-center py-10 bg-[var(--bg-surface-raised)] rounded-2xl border border-[var(--border-subtle)]">
                    <p className="text-xs text-[var(--text-muted)]">No chargers configured for this station.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {chargers.map((chg) => (
                      <div
                        key={chg.charger_id || chg.id}
                        className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-[var(--accent-primary)]">
                            {chg.charger_id || chg.chargerId}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              chg.status === "AVAILABLE"
                                ? "bg-emerald-500/10 text-emerald-500"
                                : chg.status === "CHARGING"
                                ? "bg-blue-500/10 text-blue-500"
                                : "bg-amber-500/10 text-amber-500"
                            }`}
                          >
                            {chg.status}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-[var(--text-primary)]">{chg.charger_name || chg.name}</div>
                        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)] font-mono">
                          <span>{chg.charger_type || "DC_FAST"}</span>
                          <span className="font-bold text-[var(--text-primary)]">{parseFloat(chg.power_kw || 60)} kW</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. PHOTOS TAB */}
            {activeTab === "photos" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Station Photograph Gallery ({photos.length})</h3>
                  <button
                    onClick={() => {
                      if (onManagePhotos) onManagePhotos(station);
                    }}
                    className="px-3 py-1.5 bg-[var(--accent-primary)] hover:opacity-90 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera size={13} /> Manage Photos
                  </button>
                </div>

                {photos.length === 0 ? (
                  <div className="text-center py-10 bg-[var(--bg-surface-raised)] rounded-2xl border border-[var(--border-subtle)]">
                    <p className="text-xs text-[var(--text-muted)]">No photos uploaded yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {photos.map((p) => (
                      <div
                        key={p.photoId || p.id}
                        className="relative aspect-video rounded-xl overflow-hidden border border-[var(--border-subtle)] group bg-slate-900 shadow-sm"
                      >
                        <img src={p.imageUrl || p.image_url} alt={p.caption} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 p-2 flex flex-col justify-between">
                          <span className="text-[9px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded self-start">
                            {p.category}
                          </span>
                          <div className="text-[10px] text-white font-medium truncate">{p.caption}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Link
              to={`/owner/smart-load?stationId=${station.stationId || station.id}`}
              className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Zap size={13} /> Smart Load & Energy
            </Link>
            <Link
              to={`/owner/tariffs?stationId=${station.stationId || station.id}`}
              className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <CreditCard size={13} /> Tariffs
            </Link>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs font-bold transition border border-[var(--border-subtle)] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
