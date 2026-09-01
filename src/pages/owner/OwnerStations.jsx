import { useState } from "react";
import { Building2, Plus, MapPin, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useSystemState } from "../../contexts/SystemStateContext";

export default function OwnerStations() {
  const { currentUser } = useAuth();
  const { stations, addStation } = useSystemState();
  const [showAddModal, setShowAddModal] = useState(false);

  const ownerCounterId = currentUser?.counterId || "OWNER0001";
  const myStations = stations.filter((s) => s.ownerCounterId === ownerCounterId);

  // Form State
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Chennai");
  const [pincode, setPincode] = useState("600002");
  const [latitude, setLatitude] = useState("13.0604");
  const [longitude, setLongitude] = useState("80.2642");
  const [openingHours, setOpeningHours] = useState("24/7 Open");
  const [contactNumber, setContactNumber] = useState("+91 98401 23456");

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
            <Building2 size={28} className="text-emerald-400" /> My EV Charging Stations
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Register new charging stations, configure GPS coordinates, and monitor Admin approval status.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-2"
        >
          <Plus size={16} /> Register New Station
        </button>
      </div>

      {/* Stations List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {myStations.map((st) => (
          <div
            key={st.id}
            className="p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl space-y-4"
          >
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
                <span className="text-[10px] text-slate-500 block uppercase font-bold">GPS Coordinates</span>
                <span className="font-bold text-slate-200">{st.latitude}, {st.longitude}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Hours</span>
                <span className="font-bold text-emerald-400">{st.openingHours || "24/7"}</span>
              </div>
            </div>

            <div className="text-xs text-slate-400 pt-2 border-t border-slate-800 flex justify-between">
              <span>Charger Bays: <strong className="text-white font-mono">{(st.chargers || []).length} Units</strong></span>
              <span>Rating: <strong className="text-amber-400 font-mono">{st.rating || 4.9} ⭐</strong></span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Station Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0B1329] border border-slate-800 p-6 rounded-3xl shadow-2xl text-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
              Register New Charging Station (STA Counter ID)
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">Station Name</label>
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
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">Full Street Address</label>
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
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">Pincode</label>
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
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">Latitude</label>
                  <input
                    type="text"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">Longitude</label>
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
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold"
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
