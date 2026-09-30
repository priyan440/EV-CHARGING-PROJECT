import { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Zap,
  TrendingUp,
  Percent,
  RotateCcw,
  Check,
  X,
  RefreshCw,
  Sparkles,
  Layers,
  Search,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { stationService } from "../../services/stationService";
import LocationPickerMap from "../../components/LocationPickerMap";

export default function OwnerStations() {
  const { currentUser } = useAuth();

  const [myStations, setMyStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

  // Form State for New Station
  const [stationName, setStationName] = useState("");
  const [networkName, setNetworkName] = useState("GreenCharge Network");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Chennai");
  const [state, setState] = useState("Tamil Nadu");
  const [pincode, setPincode] = useState("600028");
  const [latitude, setLatitude] = useState(13.0827);
  const [longitude, setLongitude] = useState(80.2707);
  const [is24x7, setIs24x7] = useState(true);
  const [openingTime, setOpeningTime] = useState("06:00");
  const [closingTime, setClosingTime] = useState("23:00");
  const [contactNumber, setContactNumber] = useState("+91 98401 23456");
  const [email, setEmail] = useState("");
  const [parkingCapacity, setParkingCapacity] = useState(10);
  const [baysCount, setBaysCount] = useState(4);
  const [acChargers, setAcChargers] = useState(2);
  const [dcChargers, setDcChargers] = useState(2);
  const [connectorTypes, setConnectorTypes] = useState("CCS2, Type 2");
  const [chargingPrice, setChargingPrice] = useState(18.0);
  const [serviceFee, setServiceFee] = useState(20.0);
  const [amenities, setAmenities] = useState(["WiFi", "Parking", "Restrooms", "CCTV"]);
  const [image, setImage] = useState(
    "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=600&q=80"
  );

  // Dynamic Pricing Modal State
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [selectedStationPricing, setSelectedStationPricing] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingSuccessMsg, setPricingSuccessMsg] = useState("");
  const [pricingErrorMsg, setPricingErrorMsg] = useState("");
  const [pricingRules, setPricingRules] = useState({
    peak_start: "18:00",
    peak_end: "21:00",
    peak_multiplier: 1.25,
    offpeak_discount: 0.15,
    utilization_threshold: 0.75,
    max_multiplier: 1.5,
  });

  const loadOwnerStations = async () => {
    setLoading(true);
    try {
      const res = await stationService.getMyStations();
      if (res?.success && Array.isArray(res.data)) {
        setMyStations(res.data);
      }
    } catch (err) {
      console.warn("Failed to load owner stations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOwnerStations();
  }, []);

  const handleLocationChange = (newLat, newLng, addressHint) => {
    setLatitude(newLat);
    setLongitude(newLng);
    if (addressHint) {
      setAddress(addressHint.slice(0, 120));
    }
  };

  const handleRegisterStation = async (e) => {
    e.preventDefault();
    if (!stationName.trim()) {
      setStatusMsg({ type: "error", text: "Station Name is required." });
      return;
    }

    setSubmitting(true);
    setStatusMsg({ type: "", text: "" });

    try {
      const payload = {
        stationName: stationName.trim(),
        name: stationName.trim(),
        networkName: networkName.trim(),
        description: description.trim(),
        address: address.trim() || `${stationName}, ${city}`,
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        latitude,
        longitude,
        is24x7,
        openingTime: is24x7 ? "00:00:00" : `${openingTime}:00`,
        closingTime: is24x7 ? "23:59:59" : `${closingTime}:00`,
        contactNumber,
        email: email || currentUser?.email,
        parkingCapacity: parseInt(parkingCapacity, 10),
        baysCount: parseInt(baysCount, 10),
        acChargers: parseInt(acChargers, 10),
        dcChargers: parseInt(dcChargers, 10),
        connectorTypes,
        chargingPrice: parseFloat(chargingPrice),
        serviceFee: parseFloat(serviceFee),
        amenities,
        image,
      };

      const res = await stationService.createStation(payload);
      setSubmitting(false);

      if (res?.success) {
        setStatusMsg({
          type: "success",
          text: res.message || "Charging Station registered successfully! Submitted for Admin approval.",
        });
        setTimeout(() => {
          setShowAddModal(false);
          setStatusMsg({ type: "", text: "" });
          loadOwnerStations();
        }, 1500);
      } else {
        setStatusMsg({ type: "error", text: res?.message || "Failed to register station." });
      }
    } catch (err) {
      setSubmitting(false);
      setStatusMsg({ type: "error", text: "Error submitting station to server." });
    }
  };

  const handleOpenPricingModal = async (station) => {
    setSelectedStationPricing(station);
    setShowPricingModal(true);
    setPricingLoading(true);
    setPricingSuccessMsg("");
    setPricingErrorMsg("");

    try {
      const res = await stationService.getPricingRules(station.id);
      if (res && res.success && res.data) {
        const r = res.data;
        setPricingRules({
          peak_start: r.peak_start ? r.peak_start.slice(0, 5) : "18:00",
          peak_end: r.peak_end ? r.peak_end.slice(0, 5) : "21:00",
          peak_multiplier: parseFloat(r.peak_multiplier) || 1.25,
          offpeak_discount: parseFloat(r.offpeak_discount) || 0.15,
          utilization_threshold: parseFloat(r.utilization_threshold) || 0.75,
          max_multiplier: parseFloat(r.max_multiplier) || 1.5,
        });
      }
    } catch (err) {
      console.warn("Pricing rules fetch warning:", err);
    } finally {
      setPricingLoading(false);
    }
  };

  const handleSavePricing = async (e) => {
    e.preventDefault();
    if (!selectedStationPricing) return;
    setPricingSaving(true);
    setPricingSuccessMsg("");
    setPricingErrorMsg("");

    const payload = {
      peak_start: `${pricingRules.peak_start}:00`,
      peak_end: `${pricingRules.peak_end}:00`,
      peak_multiplier: parseFloat(pricingRules.peak_multiplier),
      offpeak_discount: parseFloat(pricingRules.offpeak_discount),
      utilization_threshold: parseFloat(pricingRules.utilization_threshold),
      max_multiplier: parseFloat(pricingRules.max_multiplier),
    };

    const res = await stationService.updatePricingRules(selectedStationPricing.id, payload);
    setPricingSaving(false);
    if (res && res.success) {
      setPricingSuccessMsg("Dynamic pricing rules saved successfully!");
      setTimeout(() => {
        setShowPricingModal(false);
        setPricingSuccessMsg("");
      }, 1200);
    } else {
      setPricingErrorMsg(res?.message || "Failed to update pricing rules.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header Banner */}
      <div className="theme-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-[var(--accent-primary)] text-xs font-mono font-bold border border-blue-500/20">
              STATION OWNER HUB
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
            <Building2 size={28} className="text-[var(--accent-primary)]" /> My EV Charging Stations
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Register new charging stations, pinpoint GPS locations, manage bay power limits, and configure surge pricing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadOwnerStations}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
            title="Refresh Stations"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-2xl bg-[var(--accent-primary)] hover:opacity-95 text-white font-extrabold text-xs tracking-wider transition shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} /> Register New Station
          </button>
        </div>
      </div>

      {/* Stations List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="theme-card p-6 animate-pulse space-y-3">
              <div className="h-6 bg-[var(--border-subtle)] rounded w-1/4"></div>
              <div className="h-4 bg-[var(--border-subtle)] rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : myStations.length === 0 ? (
        <div className="theme-card p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-[var(--accent-primary)] flex items-center justify-center mx-auto">
            <Building2 size={32} />
          </div>
          <h3 className="font-bold text-lg text-[var(--text-primary)]">No Registered Stations Yet</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
            Register your first EV charging station to list it across the Live EV Map and start receiving bookings.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-2xl bg-[var(--accent-primary)] text-white font-bold text-xs shadow-md cursor-pointer"
          >
            Register Charging Station
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {myStations.map((st) => {
            const availableBays = parseInt(st.availableSlots ?? st.availableBays ?? st.availableConnectors ?? 4, 10);
            const totalBays = parseInt(st.totalSlots ?? st.totalBays ?? 4, 10);
            const rawApproval = (st.approvalStatus || st.approval_status || "").toUpperCase();
            const rawStatus = (st.status || st.rawStatus || st.operationalStatus || "ACTIVE").toUpperCase();

            const isPending = rawApproval === "PENDING" || rawStatus === "PENDING";
            const isSuspended = rawApproval === "SUSPENDED" || rawStatus === "SUSPENDED" || rawStatus === "MAINTENANCE";
            const isRejected = rawApproval === "REJECTED" || rawStatus === "REJECTED";
            const isApproved = !isPending && !isSuspended && !isRejected;

            const badgeText = isPending ? "Pending Approval" : isRejected ? "Rejected" : isSuspended ? "Suspended" : "Approved";
            const badgeClass = isApproved
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : isPending
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";

            return (
              <div key={st.id || st.stationId} className="theme-card p-6 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono font-bold text-[var(--accent-primary)]">
                      {st.networkName || "EV Network"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${badgeClass}`}>
                        {badgeText}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-extrabold text-base text-[var(--text-primary)]">{st.stationName || st.name}</h3>
                  <p className="text-xs text-[var(--text-muted)] line-clamp-1 mt-0.5">
                    📍 {st.address || `${st.city}, Tamil Nadu`} (Lat: {st.latitude}, Lng: {st.longitude})
                  </p>

                  <div className="grid grid-cols-3 gap-2 mt-4 p-3 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-center text-xs">
                    <div>
                      <span className="block text-[9px] uppercase font-mono text-[var(--text-muted)]">Live Bays</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {availableBays} / {totalBays}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase font-mono text-[var(--text-muted)]">Max Power</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{st.maxPower || 120} kW</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase font-mono text-[var(--text-muted)]">Base Tariff</span>
                      <span className="font-bold text-[var(--text-primary)]">₹{st.pricePerKwh || 18}/kWh</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-[var(--border-subtle)]">
                  <button
                    onClick={() => handleOpenPricingModal(st)}
                    className="flex-1 py-2 px-3 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] font-bold text-xs border border-[var(--border-subtle)] transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sliders size={13} className="text-[var(--accent-primary)]" />
                    <span>Dynamic Pricing</span>
                  </button>
                  <button
                    onClick={() => window.open(`https://www.google.com/maps?q=${st.latitude},${st.longitude}`, "_blank")}
                    className="py-2 px-3 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] font-bold text-xs border border-[var(--border-subtle)] transition cursor-pointer"
                    title="View on Maps"
                  >
                    <MapPin size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REGISTER NEW CHARGING STATION MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="theme-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Building2 className="text-[var(--accent-primary)]" size={20} /> Register New Charging Station
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Fill details and pinpoint GPS location on map for live network approval
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {statusMsg.text && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  statusMsg.type === "success"
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400"
                }`}
              >
                {statusMsg.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
                <span>{statusMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleRegisterStation} className="space-y-4 text-xs">
              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase mb-1">
                    Station Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GreenCharge Central Hub"
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                    className="w-full theme-input"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase mb-1">
                    EV Network Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. GreenCharge Network"
                    value={networkName}
                    onChange={(e) => setNetworkName(e.target.value)}
                    className="w-full theme-input"
                  />
                </div>
              </div>

              {/* Location Picker Map */}
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase mb-1">
                  Location Picker (Pinpoint on Map) *
                </label>
                <LocationPickerMap
                  latitude={latitude}
                  longitude={longitude}
                  onLocationChange={handleLocationChange}
                />
              </div>

              {/* Coordinates Preview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={latitude}
                    onChange={(e) => setLatitude(parseFloat(e.target.value))}
                    className="w-full theme-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={longitude}
                    onChange={(e) => setLongitude(parseFloat(e.target.value))}
                    className="w-full theme-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full theme-input"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full theme-input font-mono"
                  />
                </div>
              </div>

              {/* Full Address */}
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase mb-1">
                  Full Street Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. 183 Arcot Road, Vadapalani"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full theme-input"
                />
              </div>

              {/* Bays & Technical Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                    Total Bays
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={baysCount}
                    onChange={(e) => setBaysCount(parseInt(e.target.value, 10))}
                    className="w-full theme-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                    DC Fast Ports
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={dcChargers}
                    onChange={(e) => setDcChargers(parseInt(e.target.value, 10))}
                    className="w-full theme-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                    AC Standard Ports
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={acChargers}
                    onChange={(e) => setAcChargers(parseInt(e.target.value, 10))}
                    className="w-full theme-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                    Base Tariff (₹/kWh)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={chargingPrice}
                    onChange={(e) => setChargingPrice(parseFloat(e.target.value))}
                    className="w-full theme-input font-mono"
                  />
                </div>
              </div>

              {/* Contact & Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                    Contact Number
                  </label>
                  <input
                    type="text"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="w-full theme-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                    24x7 Availability
                  </label>
                  <select
                    value={is24x7 ? "yes" : "no"}
                    onChange={(e) => setIs24x7(e.target.value === "yes")}
                    className="w-full theme-input cursor-pointer font-bold"
                  >
                    <option value="yes">Yes, Open 24/7</option>
                    <option value="no">Specific Hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                    Connectors
                  </label>
                  <input
                    type="text"
                    value={connectorTypes}
                    onChange={(e) => setConnectorTypes(e.target.value)}
                    className="w-full theme-input"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-[var(--border-subtle)] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-surface-raised)] text-[var(--text-primary)] font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 rounded-xl bg-[var(--accent-primary)] hover:opacity-95 text-white font-bold text-xs shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Registering..." : "Submit for Approval"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DYNAMIC PRICING MODAL */}
      {showPricingModal && selectedStationPricing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="theme-card w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                  <Sliders size={18} className="text-[var(--accent-primary)]" />
                  Dynamic Pricing Engine
                </h3>
                <p className="text-xs text-[var(--text-muted)]">{selectedStationPricing.stationName || selectedStationPricing.name}</p>
              </div>
              <button
                onClick={() => setShowPricingModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {pricingSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                <Check size={14} />
                <span>{pricingSuccessMsg}</span>
              </div>
            )}

            {pricingErrorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{pricingErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSavePricing} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase mb-1">Peak Start Hour</label>
                  <input
                    type="time"
                    value={pricingRules.peak_start}
                    onChange={(e) => setPricingRules({ ...pricingRules, peak_start: e.target.value })}
                    className="w-full theme-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase mb-1">Peak End Hour</label>
                  <input
                    type="time"
                    value={pricingRules.peak_end}
                    onChange={(e) => setPricingRules({ ...pricingRules, peak_end: e.target.value })}
                    className="w-full theme-input font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase mb-1">Peak Multiplier</label>
                  <input
                    type="number"
                    step="0.05"
                    min="1.0"
                    max="2.5"
                    value={pricingRules.peak_multiplier}
                    onChange={(e) => setPricingRules({ ...pricingRules, peak_multiplier: parseFloat(e.target.value) })}
                    className="w-full theme-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase mb-1">Off-Peak Discount</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.0"
                    max="0.5"
                    value={pricingRules.offpeak_discount}
                    onChange={(e) => setPricingRules({ ...pricingRules, offpeak_discount: parseFloat(e.target.value) })}
                    className="w-full theme-input font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPricingModal(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-surface-raised)] text-[var(--text-primary)] font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pricingSaving}
                  className="px-5 py-2 rounded-xl bg-[var(--accent-primary)] hover:opacity-95 text-white font-bold cursor-pointer"
                >
                  {pricingSaving ? "Saving..." : "Save Pricing Rules"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
