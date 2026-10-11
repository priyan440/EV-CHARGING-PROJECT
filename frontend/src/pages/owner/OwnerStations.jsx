import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Plus,
  MapPin,
  Clock,
  Zap,
  Power,
  Globe,
  Edit2,
  RefreshCw,
  Search,
  CheckCircle2,
  Sliders,
  Sparkles,
  X,
  Layers,
  Compass,
  DollarSign,
  Coffee,
  Shield,
  Wifi,
  LocateFixed,
  Car,
  Camera,
  Eye,
  Info,
  SlidersHorizontal,
} from "lucide-react";
import {
  getOwnerStations,
  createOwnerStation,
  updateOwnerStation,
  deleteOwnerStation,
} from "../../services/ownerService";
import LocationPickerMap from "../../components/LocationPickerMap";
import StationPhotosModal from "../../components/owner/StationPhotosModal";
import StationDetailsModal from "../../components/owner/StationDetailsModal";
import Pagination from "../../components/Pagination";

export default function OwnerStations() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStation, setEditingStation] = useState(null);
  const [photoModalStation, setPhotoModalStation] = useState(null);
  const [detailsModalStation, setDetailsModalStation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);

  const [formData, setFormData] = useState({
    stationName: "",
    address: "",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600026",
    latitude: 13.0504,
    longitude: 80.2096,
    contactNumber: "+91 9876543210",
    openingTime: "06:00 AM",
    closingTime: "11:00 PM",
    stationType: "Public",
    parkingCapacity: 4,
    totalSlots: 4,
    acChargersCount: 2,
    dcFastChargersCount: 2,
    chargingRatePerKwh: 18.0,
    maxPowerKw: 150,
    description: "High-speed multi-standard EV charging hub with smart load management.",
    amenities: ["WiFi", "Restrooms", "Cafe", "Waiting Lounge"],
  });

  const availableAmenitiesList = [
    "WiFi",
    "Restrooms",
    "Cafe",
    "Waiting Lounge",
    "Covered Parking",
    "24/7 Security",
    "Wheelchair Accessible",
    "Solar Powered",
  ];

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getOwnerStations();
      setStations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showToast("Error loading stations from MySQL");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "latitude" ||
        name === "longitude" ||
        name === "maxPowerKw" ||
        name === "parkingCapacity" ||
        name === "totalSlots" ||
        name === "acChargersCount" ||
        name === "dcFastChargersCount" ||
        name === "chargingRatePerKwh"
          ? Number(value)
          : value,
    }));
  };

  const handleAmenityToggle = (amenity) => {
    setFormData((prev) => {
      const current = Array.isArray(prev.amenities) ? prev.amenities : [];
      if (current.includes(amenity)) {
        return { ...prev, amenities: current.filter((a) => a !== amenity) };
      }
      return { ...prev, amenities: [...current, amenity] };
    });
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData((prev) => ({
            ...prev,
            latitude: parseFloat(pos.coords.latitude.toFixed(6)),
            longitude: parseFloat(pos.coords.longitude.toFixed(6)),
          }));
          showToast("GPS coordinates updated to current location!");
        },
        (err) => {
          showToast("Could not access GPS location: " + err.message);
        }
      );
    } else {
      showToast("Geolocation is not supported by your browser");
    }
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    if (!formData.stationName.trim() || !formData.address.trim()) {
      showToast("Please provide Station Name and Address.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingStation) {
        await updateOwnerStation(editingStation.stationId || editingStation.id, formData);
        showToast(`Station ${editingStation.stationId || editingStation.id} updated!`);
      } else {
        const res = await createOwnerStation(formData);
        showToast(`Station commissioned successfully! ID: ${res.data?.stationId || res.data?.id || "STN"}`);
      }
      setShowAddModal(false);
      setEditingStation(null);
      loadData();
    } catch (err) {
      showToast("Error saving station: " + (err.message || "Failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (stationId) => {
    if (!window.confirm(`Are you sure you want to deactivate station ${stationId}?`)) return;
    try {
      await deleteOwnerStation(stationId);
      showToast(`Station ${stationId} status updated.`);
      loadData();
    } catch (err) {
      showToast("Error: " + err.message);
    }
  };

  const openEditModal = (st) => {
    setEditingStation(st);
    let parsedAmenities = ["WiFi", "Restrooms", "Cafe"];
    if (Array.isArray(st.amenities)) {
      parsedAmenities = st.amenities;
    } else if (typeof st.amenities === "string") {
      try {
        parsedAmenities = JSON.parse(st.amenities);
      } catch {
        parsedAmenities = st.amenities.split(",").map((s) => s.trim());
      }
    }

    setFormData({
      stationName: st.stationName || st.name || "",
      address: st.address || "",
      city: st.city || "Chennai",
      state: st.state || "Tamil Nadu",
      pincode: st.pincode || "600026",
      latitude: parseFloat(st.latitude) || 13.0504,
      longitude: parseFloat(st.longitude) || 80.2096,
      contactNumber: st.contactNumber || "+91 9876543210",
      openingTime: st.openingTime || "06:00 AM",
      closingTime: st.closingTime || "11:00 PM",
      stationType: st.stationType || "Public",
      parkingCapacity: st.parkingCapacity || st.totalSlots || 4,
      totalSlots: st.totalSlots || st.parkingCapacity || 4,
      acChargersCount: 2,
      dcFastChargersCount: 2,
      chargingRatePerKwh: parseFloat(st.pricePerKwh || st.energy_tariff_per_kwh) || 18.0,
      maxPowerKw: st.maxPowerKw || st.maxPower || 150,
      description: st.description || "High-speed multi-standard EV charging hub with smart load management.",
      amenities: parsedAmenities,
    });
    setShowAddModal(true);
  };

  // Filter stations by Search Term and Status
  const filteredStations = stations.filter((st) => {
    const matchesSearch =
      st.stationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      st.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      st.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      st.stationId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      st.address?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && (st.status === "Active" || st.status === "ACTIVE")) ||
      (statusFilter === "INACTIVE" && (st.status === "Inactive" || st.status === "INACTIVE" || st.status === "Offline"));

    return matchesSearch && matchesStatus;
  });

  // Calculate Client / Server Pagination Window
  const totalItems = filteredStations.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const safePage = Math.min(page, totalPages);
  const paginatedStations = filteredStations.slice((safePage - 1) * limit, safePage * limit);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in font-sans text-[var(--text-primary)]">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-[var(--accent-primary)] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-blue-400/30 animate-fade-in font-bold text-xs">
          <Sparkles className="w-4 h-4 text-yellow-300" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="p-6 md:p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              STATION OWNER MANAGEMENT
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] flex items-center gap-3 font-mono">
            <Building2 className="w-7 h-7 text-[var(--accent-primary)]" />
            My Charging Stations
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Commission EV charging hubs, pinpoint GPS coordinates with live map, manage station photographs, facilities, chargers, tariffs and energy loads.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/owner/map"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-bold transition"
          >
            <Globe className="w-4 h-4 text-sky-500" />
            Station Map
          </Link>
          <button
            onClick={() => {
              setEditingStation(null);
              setFormData({
                stationName: "",
                address: "",
                city: "Chennai",
                state: "Tamil Nadu",
                pincode: "600026",
                latitude: 13.0504,
                longitude: 80.2096,
                contactNumber: "+91 9876543210",
                openingTime: "06:00 AM",
                closingTime: "11:00 PM",
                stationType: "Public",
                parkingCapacity: 4,
                totalSlots: 4,
                acChargersCount: 2,
                dcFastChargersCount: 2,
                chargingRatePerKwh: 18.0,
                maxPowerKw: 150,
                description: "High-speed multi-standard EV charging hub with smart load management.",
                amenities: ["WiFi", "Restrooms", "Cafe", "Waiting Lounge"],
              });
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] hover:opacity-90 text-white font-bold text-xs transition shadow-lg shadow-blue-500/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Commission New Station
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by name, city, address, or ID (e.g. STN0001)..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl pl-9 pr-4 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1 bg-[var(--bg-surface-raised)] p-1 rounded-xl border border-[var(--border-subtle)]">
            <button
              onClick={() => {
                setStatusFilter("ALL");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === "ALL"
                  ? "bg-[var(--accent-primary)] text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              All ({stations.length})
            </button>
            <button
              onClick={() => {
                setStatusFilter("ACTIVE");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === "ACTIVE"
                  ? "bg-emerald-500 text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => {
                setStatusFilter("INACTIVE");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === "INACTIVE"
                  ? "bg-rose-500 text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Offline
            </button>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl border border-[var(--border-subtle)] transition cursor-pointer shrink-0"
            title="Refresh Stations"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[var(--accent-primary)]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Stations Grid */}
      {loading ? (
        <div className="text-center py-16 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-subtle)]">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-[var(--text-muted)] text-xs font-mono animate-pulse">Loading stations from MySQL...</p>
        </div>
      ) : paginatedStations.length === 0 ? (
        <div className="text-center py-16 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-subtle)] shadow-sm space-y-3">
          <Building2 className="w-12 h-12 text-[var(--text-muted)] mx-auto opacity-40" />
          <h3 className="text-base font-bold text-[var(--text-primary)] font-mono">No Stations Found</h3>
          <p className="text-xs text-[var(--text-muted)]">No station matches your active search and filter criteria.</p>
          <button
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("ALL");
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-[var(--accent-primary)] text-white rounded-xl text-xs font-bold cursor-pointer shadow-md"
          >
            + Commission Station
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedStations.map((st) => (
              <div
                key={st.stationId || st.id}
                className="bg-[var(--bg-surface)] rounded-3xl p-5 border border-[var(--border-subtle)] hover:border-blue-500/40 transition-all flex flex-col justify-between shadow-sm space-y-4"
              >
                <div>
                  {/* Station Thumbnail & Top Badges */}
                  <div className="relative aspect-video rounded-2xl overflow-hidden mb-3.5 bg-slate-900 border border-[var(--border-subtle)] group">
                    <img
                      src={
                        st.image ||
                        "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=600&q=80"
                      }
                      alt={st.stationName || st.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <span className="font-mono font-bold text-[10px] text-white bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded-md border border-white/10">
                        {st.stationId || st.station_id || `STN000${st.id}`}
                      </span>
                    </div>

                    <div className="absolute top-2 right-2">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                          st.status === "Active" || st.status === "ACTIVE"
                            ? "bg-emerald-500 text-white shadow-sm"
                            : "bg-rose-500 text-white shadow-sm"
                        }`}
                      >
                        {st.status || "ACTIVE"}
                      </span>
                    </div>

                    {/* Manage Photos Overlay Button */}
                    <button
                      onClick={() => setPhotoModalStation(st)}
                      className="absolute bottom-2 right-2 bg-black/70 hover:bg-black/90 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer shadow-md"
                    >
                      <Camera size={11} /> Photos
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                    {st.stationName || st.station_name || st.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-3">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="line-clamp-1">{st.address}, {st.city}</span>
                  </div>

                  {/* Metrics Pill Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-[var(--bg-surface-raised)] p-3 rounded-2xl mb-3 text-center text-xs border border-[var(--border-subtle)]">
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Chargers</div>
                      <div className="font-bold text-[var(--text-primary)] font-mono text-sm">
                        {st.totalChargers || st.total_slots || 4}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Available</div>
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                        {st.availableChargers || st.available_slots || 4}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Rate</div>
                      <div className="font-bold text-amber-600 dark:text-amber-400 font-mono text-sm">
                        ₹{st.pricePerKwh || 18}/kWh
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)] px-1 mb-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{st.openingTime || st.opening_time || "06:00 AM"} - {st.closingTime || st.closing_time || "11:00 PM"}</span>
                    </div>
                    <div>
                      <span>Power: <strong className="text-[var(--text-primary)] font-mono">{st.maxPowerKw || st.max_power || 150} kW</strong></span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-3 border-t border-[var(--border-subtle)]">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setDetailsModalStation(st)}
                      className="py-2 px-3 text-center bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl text-xs font-bold transition border border-[var(--border-subtle)] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Eye size={12} /> Details & Specs
                    </button>
                    <Link
                      to={`/owner/chargers?stationId=${st.stationId || st.id}`}
                      className="py-2 px-3 text-center bg-blue-500/10 hover:bg-blue-500/20 text-[var(--accent-primary)] rounded-xl text-xs font-bold transition border border-blue-500/30 flex items-center justify-center gap-1"
                    >
                      <Sliders size={12} /> Chargers
                    </Link>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPhotoModalStation(st)}
                        className="p-2 bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl transition border border-[var(--border-subtle)] cursor-pointer"
                        title="Upload & Manage Photos"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                      <Link
                        to={`/owner/smart-load?stationId=${st.stationId || st.id}`}
                        className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl transition border border-amber-500/20"
                        title="Energy & Smart Load Balance"
                      >
                        <Zap className="w-3.5 h-3.5" />
                      </Link>
                      <Link
                        to={`/owner/tariffs?stationId=${st.stationId || st.id}`}
                        className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-xl transition border border-emerald-500/20"
                        title="Dynamic Tariffs"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(st)}
                        className="p-2 bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl transition border border-[var(--border-subtle)] cursor-pointer"
                        title="Edit Station"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeactivate(st.stationId || st.id)}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition border border-rose-500/20 cursor-pointer"
                        title="Deactivate Station"
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Reusable Server-Side / Client Pagination Bar */}
          <Pagination
            page={safePage}
            totalPages={totalPages}
            totalItems={totalItems}
            limit={limit}
            onPageChange={(p) => setPage(p)}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
            limitOptions={[6, 12, 24, 48]}
          />
        </div>
      )}

      {/* Station Photos Management Modal */}
      {photoModalStation && (
        <StationPhotosModal
          station={photoModalStation}
          isOpen={Boolean(photoModalStation)}
          onClose={() => setPhotoModalStation(null)}
          onPhotoUpdated={loadData}
        />
      )}

      {/* Comprehensive Station Details Modal */}
      {detailsModalStation && (
        <StationDetailsModal
          station={detailsModalStation}
          isOpen={Boolean(detailsModalStation)}
          onClose={() => setDetailsModalStation(null)}
          onEdit={(st) => openEditModal(st)}
          onManagePhotos={(st) => setPhotoModalStation(st)}
        />
      )}

      {/* Add / Edit Station Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl max-w-3xl w-full p-6 shadow-2xl animate-fade-in my-8 text-[var(--text-primary)] max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-5">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 font-mono">
                  <Building2 className="w-5 h-5 text-[var(--accent-primary)]" />
                  {editingStation ? `Edit Station ${editingStation.stationId || editingStation.id}` : "Commission New EV Charging Station (MySQL)"}
                </h2>
                <p className="text-[11px] text-[var(--text-muted)]">Configure station details, map location pin, charging rate, and amenities.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdate} className="space-y-4">
              {/* Section 1: Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Station Name *</label>
                  <input
                    type="text"
                    name="stationName"
                    value={formData.stationName}
                    onChange={handleInputChange}
                    placeholder="e.g. GreenCharge HyperHub Vadapalani"
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Street Address *</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="183 Arcot Road, Vadapalani"
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">State</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Pincode</label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Contact Number</label>
                  <input
                    type="text"
                    name="contactNumber"
                    value={formData.contactNumber}
                    onChange={handleInputChange}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
              </div>

              {/* Section 2: Interactive Location Map Picker */}
              <div className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 font-mono">
                    <MapPin size={14} className="text-red-500" /> SELECT LOCATION ON INTERACTIVE MAP
                  </span>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="text-[11px] font-bold text-[var(--accent-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <LocateFixed size={12} /> Use My Current GPS Location
                  </button>
                </div>

                <LocationPickerMap
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  onLocationChange={(newLat, newLng, foundAddress, addrObj) => {
                    setFormData((prev) => ({
                      ...prev,
                      latitude: newLat,
                      longitude: newLng,
                      address: foundAddress ? foundAddress : prev.address,
                      city: addrObj?.city || addrObj?.town || addrObj?.state_district || prev.city,
                      state: addrObj?.state || prev.state,
                      pincode: addrObj?.postcode || prev.pincode,
                    }));
                  }}
                />

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-0.5">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleInputChange}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-0.5">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleInputChange}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Technical Chargers & Power Config */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Total Charging Points</label>
                  <input
                    type="number"
                    name="totalSlots"
                    value={formData.totalSlots}
                    onChange={handleInputChange}
                    min={1}
                    max={20}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Rate (₹ / kWh)</label>
                  <input
                    type="number"
                    step="0.5"
                    name="chargingRatePerKwh"
                    value={formData.chargingRatePerKwh}
                    onChange={handleInputChange}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Max Power (kW)</label>
                  <input
                    type="number"
                    name="maxPowerKw"
                    value={formData.maxPowerKw}
                    onChange={handleInputChange}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Opening Time</label>
                  <input
                    type="text"
                    name="openingTime"
                    value={formData.openingTime}
                    onChange={handleInputChange}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* Section 4: Available Amenities */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-2">Available Facilities / Amenities</label>
                <div className="flex flex-wrap gap-2">
                  {availableAmenitiesList.map((amenity) => {
                    const isSelected = formData.amenities?.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => handleAmenityToggle(amenity)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                          isSelected
                            ? "bg-blue-500/20 text-[var(--accent-primary)] border-blue-500/40"
                            : "bg-[var(--bg-surface-raised)] text-[var(--text-muted)] border-[var(--border-subtle)]"
                        }`}
                      >
                        {isSelected ? "✓ " : "+ "}
                        {amenity}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Station Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
                  placeholder="Describe your station amenities, security, fast chargers, etc."
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)] mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] text-[var(--text-primary)] text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[var(--accent-primary)] hover:opacity-90 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Commissioning in MySQL..." : editingStation ? "Save Changes" : "Commission Station"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
