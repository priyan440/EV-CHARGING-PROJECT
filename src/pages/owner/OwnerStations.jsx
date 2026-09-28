import { useState } from "react";
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
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useSystemState } from "../../contexts/SystemStateContext";
import { stationService } from "../../services/stationService";

export default function OwnerStations() {
  const { currentUser } = useAuth();
  const { stations, addStation } = useSystemState();
  const [showAddModal, setShowAddModal] = useState(false);

  const ownerCounterId = currentUser?.counterId || "OWNER0001";
  const myStations = stations.filter(
    (s) => s.ownerCounterId === ownerCounterId || s.ownerId === currentUser?.id
  );

  // Form State for New Station
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Chennai");
  const [pincode, setPincode] = useState("600002");
  const [latitude, setLatitude] = useState("13.0604");
  const [longitude, setLongitude] = useState("80.2642");
  const [openingHours, setOpeningHours] = useState("24/7 Open");
  const [contactNumber, setContactNumber] = useState("+91 98401 23456");

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

  const handleResetDefaults = () => {
    setPricingRules({
      peak_start: "18:00",
      peak_end: "21:00",
      peak_multiplier: 1.25,
      offpeak_discount: 0.15,
      utilization_threshold: 0.75,
      max_multiplier: 1.5,
    });
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

  const handleSubmit = (e) => {
    e.preventDefault();
    addStation(
      {
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        latitude,
        longitude,
        openingHours,
        contactNumber,
      },
      ownerCounterId
    );

    setShowAddModal(false);
    setName("");
    setAddress("");
  };

  // Base rate helper for simulation
  const stationBaseRate =
    selectedStationPricing?.pricePerKwh || selectedStationPricing?.basePricePerKwh || 18.0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
            <Building2 size={28} className="text-emerald-400" /> My EV Charging Stations
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Register new charging stations, configure dynamic tariffs, and monitor station status.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
        >
          <Plus size={16} /> Register New Station
        </button>
      </div>

      {/* Stations List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {myStations.map((st) => (
          <div
            key={st.id}
            className="p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-xl border border-emerald-500/30">
                  ID: {st.id}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    st.status === "Approved"
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : st.status === "Pending Approval"
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                  }`}
                >
                  {st.status}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">{st.name}</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin size={14} className="text-emerald-400 shrink-0" /> {st.address}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/90 p-3 rounded-2xl border border-slate-800 font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">
                    GPS Coordinates
                  </span>
                  <span className="font-bold text-slate-200">
                    {st.latitude}, {st.longitude}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Hours</span>
                  <span className="font-bold text-emerald-400">{st.openingHours || "24/7"}</span>
                </div>
              </div>

              <div className="text-xs text-slate-400 pt-2 border-t border-slate-800 flex justify-between">
                <span>
                  Charger Bays:{" "}
                  <strong className="text-white font-mono">{(st.chargers || []).length} Units</strong>
                </span>
                <span>
                  Rating: <strong className="text-amber-400 font-mono">{st.rating || 4.9} ⭐</strong>
                </span>
              </div>
            </div>

            {/* Dynamic Pricing Action Bar */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Base Tariff
                </span>
                <span className="text-sm font-extrabold text-emerald-400 font-mono">
                  ₹{st.pricePerKwh || st.basePricePerKwh || 18} / kWh
                </span>
              </div>

              <button
                onClick={() => handleOpenPricingModal(st)}
                className="px-3.5 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-98"
              >
                <Sliders size={14} className="text-purple-400" />
                <span>Dynamic Pricing</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Dynamic Pricing Editor Modal */}
      {showPricingModal && selectedStationPricing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl bg-[#0B1329] border border-slate-800 p-6 md:p-7 rounded-3xl shadow-2xl text-slate-200 space-y-5 my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sliders size={20} className="text-purple-400" />
                  <h3 className="text-lg font-bold text-white">Dynamic Pricing Rules</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Station: <span className="text-white font-semibold">{selectedStationPricing.name}</span>{" "}
                  • Base: <span className="text-emerald-400 font-mono font-bold">₹{stationBaseRate}/kWh</span>
                </p>
              </div>

              <button
                onClick={() => setShowPricingModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {pricingLoading ? (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span>Loading pricing rules...</span>
              </div>
            ) : (
              <form onSubmit={handleSavePricing} className="space-y-4 text-xs">
                {/* Live Tariff Preview Simulation */}
                <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 font-mono">
                  <div className="text-center p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-amber-400 uppercase font-bold block">
                      Peak Tariff
                    </span>
                    <span className="text-sm font-extrabold text-white block mt-0.5">
                      ₹{(stationBaseRate * pricingRules.peak_multiplier).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-amber-400 font-sans">
                      +{Math.round((pricingRules.peak_multiplier - 1) * 100)}% surge
                    </span>
                  </div>

                  <div className="text-center p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-emerald-400 uppercase font-bold block">
                      Off-Peak Tariff
                    </span>
                    <span className="text-sm font-extrabold text-white block mt-0.5">
                      ₹{(stationBaseRate * (1 - pricingRules.offpeak_discount)).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-sans">
                      -{Math.round(pricingRules.offpeak_discount * 100)}% saver
                    </span>
                  </div>

                  <div className="text-center p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-rose-400 uppercase font-bold block">
                      Maximum Cap
                    </span>
                    <span className="text-sm font-extrabold text-white block mt-0.5">
                      ₹{(stationBaseRate * pricingRules.max_multiplier).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans">Hard Limit</span>
                  </div>
                </div>

                {/* Peak Hours Configuration */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock size={14} className="text-amber-400" /> Peak Hours Window
                    </span>
                    <span className="text-[11px] font-mono text-amber-400 font-bold">
                      {pricingRules.peak_start} — {pricingRules.peak_end}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">
                        Peak Start Time
                      </label>
                      <input
                        type="time"
                        value={pricingRules.peak_start}
                        onChange={(e) =>
                          setPricingRules({ ...pricingRules, peak_start: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-700 text-white font-mono p-2.5 rounded-xl font-bold focus:border-purple-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">
                        Peak End Time
                      </label>
                      <input
                        type="time"
                        value={pricingRules.peak_end}
                        onChange={(e) =>
                          setPricingRules({ ...pricingRules, peak_end: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-700 text-white font-mono p-2.5 rounded-xl font-bold focus:border-purple-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Multipliers Configuration */}
                <div className="space-y-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                  {/* Peak Surge Multiplier */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-300">Peak Surge Multiplier</span>
                      <span className="font-mono text-amber-400 font-bold">
                        {pricingRules.peak_multiplier}x (+
                        {Math.round((pricingRules.peak_multiplier - 1) * 100)}%)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="2.0"
                      step="0.05"
                      value={pricingRules.peak_multiplier}
                      onChange={(e) =>
                        setPricingRules({
                          ...pricingRules,
                          peak_multiplier: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  {/* Off-Peak Discount */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-300">
                        Off-Peak Night Discount (23:00 - 06:00)
                      </span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {Math.round(pricingRules.offpeak_discount * 100)}% off
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.40"
                      step="0.05"
                      value={pricingRules.offpeak_discount}
                      onChange={(e) =>
                        setPricingRules({
                          ...pricingRules,
                          offpeak_discount: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Utilization Threshold */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-300">
                        Congestion Utilization Surge Threshold
                      </span>
                      <span className="font-mono text-cyan-400 font-bold">
                        {Math.round(pricingRules.utilization_threshold * 100)}% slots occupied
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.50"
                      max="0.95"
                      step="0.05"
                      value={pricingRules.utilization_threshold}
                      onChange={(e) =>
                        setPricingRules({
                          ...pricingRules,
                          utilization_threshold: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  {/* Max Multiplier Cap */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-300">Maximum Price Multiplier Cap</span>
                      <span className="font-mono text-rose-400 font-bold">
                        {pricingRules.max_multiplier}x (+
                        {Math.round((pricingRules.max_multiplier - 1) * 100)}% max)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1.1"
                      max="2.5"
                      step="0.05"
                      value={pricingRules.max_multiplier}
                      onChange={(e) =>
                        setPricingRules({
                          ...pricingRules,
                          max_multiplier: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                  </div>
                </div>

                {pricingSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 size={16} /> {pricingSuccessMsg}
                  </div>
                )}

                {pricingErrorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle size={16} /> {pricingErrorMsg}
                  </div>
                )}

                {/* Modal Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCcw size={14} /> Reset
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPricingModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={pricingSaving}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-extrabold shadow-lg shadow-purple-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {pricingSaving ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <Check size={16} /> Save Rules
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Add Station Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0B1329] border border-slate-800 p-6 rounded-3xl shadow-2xl text-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
              Register New Charging Station (STA Counter ID)
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Station Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. GreenCharge Express Hub"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Full Street Address
                </label>
                <input
                  type="text"
                  placeholder="Street name, landmark..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Latitude
                  </label>
                  <input
                    type="text"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Longitude
                  </label>
                  <input
                    type="text"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-white font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold cursor-pointer"
                >
                  Submit Station
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
