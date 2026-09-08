import { useState, useEffect } from "react";
import {
  Car,
  Plus,
  Trash2,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Edit3,
  Eye,
  Star,
  Battery,
  Fuel,
  Gauge,
  Calendar,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { vehicleService } from "../services/vehicleService";
import Toast from "../components/Toast";

export default function Vehicles() {
  const { currentUser } = useAuth();
  const customerId = currentUser?.counterId || "CUS0001";

  const [vehicles, setVehicles] = useState([]);
  const [toast, setToast] = useState({ message: "", type: "success" });

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingVehicle, setViewingVehicle] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    manufacturer: "Tata Motors",
    model: "Nexon EV Max",
    vehicleNumber: "TN58AB1234",
    vehicleType: "Car",
    batteryCapacity: 40.5,
    batteryPercentage: 65,
    connectorType: "CCS2",
    range: 312,
  });

  const loadVehicles = () => {
    let list = vehicleService.getVehicles(customerId);
    if (!list || list.length === 0) {
      if (currentUser?.vehicles && currentUser.vehicles.length > 0) {
        list = currentUser.vehicles;
      } else {
        // Fallback to all available garage vehicles so the page is never blank
        list = vehicleService.getVehicles();
      }
    }
    setVehicles(list || []);
  };

  useEffect(() => {
    loadVehicles();
  }, [customerId, currentUser]);

  const handleOpenAdd = () => {
    setFormData({
      manufacturer: "Tata Motors",
      model: "Nexon EV Max",
      vehicleNumber: `TN${Math.floor(10 + Math.random() * 89)}EV${Math.floor(1000 + Math.random() * 9000)}`,
      vehicleType: "Car",
      batteryCapacity: 40.5,
      batteryPercentage: 70,
      connectorType: "CCS2",
      range: 312,
    });
    setShowAddModal(true);
  };

  const handleSaveVehicle = (e) => {
    e.preventDefault();
    if (!formData.vehicleNumber || !formData.model) return;

    if (editingVehicle) {
      // Edit existing
      vehicleService.updateVehicle(editingVehicle.id, {
        manufacturer: formData.manufacturer,
        brand: formData.manufacturer,
        model: formData.model,
        vehicleNumber: formData.vehicleNumber.toUpperCase(),
        vehicleType: formData.vehicleType,
        batteryCapacity: parseFloat(formData.batteryCapacity),
        batteryPercentage: parseInt(formData.batteryPercentage, 10),
        connectorType: formData.connectorType,
        range: parseInt(formData.range, 10),
      });
      setToast({ message: `Vehicle ${formData.vehicleNumber} updated successfully!`, type: "success" });
      setEditingVehicle(null);
    } else {
      // Add new
      vehicleService.addVehicle({
        customerId,
        ownerName: currentUser?.name || "EV User",
        manufacturer: formData.manufacturer,
        brand: formData.manufacturer,
        model: formData.model,
        vehicleNumber: formData.vehicleNumber.toUpperCase(),
        vehicleType: formData.vehicleType,
        batteryCapacity: parseFloat(formData.batteryCapacity),
        batteryPercentage: parseInt(formData.batteryPercentage, 10),
        connectorType: formData.connectorType,
        range: parseInt(formData.range, 10),
      });
      setToast({ message: `New EV ${formData.vehicleNumber} added to garage!`, type: "success" });
      setShowAddModal(false);
    }
    loadVehicles();
  };

  const handleDeleteVehicle = (vehicleId, number) => {
    if (vehicles.length <= 1) {
      setToast({ message: "You must maintain at least one vehicle in your garage.", type: "warning" });
      return;
    }
    if (window.confirm(`Are you sure you want to remove vehicle ${number}?`)) {
      vehicleService.deleteVehicle(vehicleId);
      loadVehicles();
      setToast({ message: `Vehicle ${number} removed from garage.`, type: "info" });
    }
  };

  const handleSetPrimary = (vehicleId) => {
    vehicleService.setPrimaryVehicle(vehicleId, customerId);
    loadVehicles();
    setToast({ message: "Primary EV updated successfully!", type: "success" });
  };

  const startEdit = (veh) => {
    setEditingVehicle(veh);
    setFormData({
      manufacturer: veh.manufacturer || veh.brand || "Tata Motors",
      model: veh.model || "",
      vehicleNumber: veh.vehicleNumber || veh.number || "",
      vehicleType: veh.vehicleType || "Car",
      batteryCapacity: veh.batteryCapacity || veh.batteryCapacityKb || 40.5,
      batteryPercentage: veh.batteryPercentage || 65,
      connectorType: veh.connectorType || veh.connector || "CCS2",
      range: veh.range || 300,
    });
  };

  return (
    <div className="space-y-6 font-inter">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />

      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0B132B] border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded border border-emerald-500/30">
              MY GARAGE • {customerId}
            </span>
            <span className="text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 px-2.5 py-0.5 rounded border border-cyan-500/30">
              {currentUser?.authProvider === "google" ? "GOOGLE AUTHENTICATED" : "REGISTERED ACCOUNT"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
            <Car size={28} className="text-emerald-400" /> My Vehicles
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Manage your registered electric vehicles, track battery capacities, configure default connectors, and set your primary EV for streamlined charger bookings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-5 py-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-center hidden sm:block">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Garage Total</span>
            <span className="text-xl font-black text-cyan-400 font-mono">{vehicles.length} EVs</span>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-5 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-2xl transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <Plus size={16} /> Add Vehicle
          </button>
        </div>
      </div>

      {/* Vehicle Cards Grid or Empty State */}
      {vehicles.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#0B132B] border border-dashed border-slate-800 space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
            <Car size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">No Electric Vehicles Registered Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Add your EV to your garage to monitor battery capacity, view real-time range estimation, and enable fast 1-click slot booking.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-2xl transition inline-flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <Plus size={16} /> Add Your First EV
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((v) => (
            <motion.div
              key={v.id || v.vehicleNumber || Math.random()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${
              v.isPrimary
                ? "bg-gradient-to-b from-slate-900 to-[#0A182F] border-emerald-500/60 shadow-xl shadow-emerald-950/30"
                : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
            }`}
          >
            {/* Primary Vehicle Badge */}
            {v.isPrimary && (
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center gap-1 shadow-sm">
                  <Star size={10} className="fill-emerald-400" /> PRIMARY VEHICLE
                </span>
              </div>
            )}

            <div>
              {/* Vehicle Icon & Title */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 shrink-0">
                  <Car size={24} />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase">
                    {v.manufacturer || v.brand || "Electric Vehicle"}
                  </span>
                  <h3 className="text-base font-extrabold text-white leading-snug">
                    {v.model}
                  </h3>
                  <span className="text-xs font-mono font-black text-emerald-400 block mt-0.5">
                    {v.vehicleNumber || v.number}
                  </span>
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 text-xs mb-4">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block flex items-center gap-1">
                    <Battery size={12} className="text-emerald-400" /> Battery
                  </span>
                  <span className="font-mono font-bold text-slate-200">
                    {v.batteryCapacity || v.batteryCapacityKb || 40.5} kWh
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block flex items-center gap-1">
                    <Zap size={12} className="text-cyan-400" /> Connector
                  </span>
                  <span className="font-mono font-bold text-cyan-300">
                    {v.connectorType || v.connector || "CCS2"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block flex items-center gap-1">
                    <Gauge size={12} className="text-amber-400" /> Est. Range
                  </span>
                  <span className="font-mono font-bold text-slate-200">
                    ~{v.range || Math.round((v.batteryCapacity || 40) * 7.5)} km
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block flex items-center gap-1">
                    <Fuel size={12} className="text-emerald-400" /> Level
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    {v.batteryPercentage || 65}%
                  </span>
                </div>
              </div>

              {/* Battery Bar */}
              <div className="space-y-1.5 mb-5">
                <div className="flex justify-between text-[11px] font-bold text-slate-400">
                  <span>Current Charge State</span>
                  <span className="text-emerald-400 font-mono">{v.batteryPercentage || 65}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${v.batteryPercentage || 65}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Actions Bar: VIEW, EDIT, DELETE, SET PRIMARY */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setViewingVehicle(v)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                  title="View Details"
                >
                  <Eye size={15} />
                </button>
                <button
                  onClick={() => startEdit(v)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Edit Vehicle"
                >
                  <Edit3 size={15} />
                </button>
                {vehicles.length > 1 && (
                  <button
                    onClick={() => handleDeleteVehicle(v.id, v.vehicleNumber || v.number)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                    title="Delete Vehicle"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              {!v.isPrimary ? (
                <button
                  onClick={() => handleSetPrimary(v.id)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 border border-slate-700 hover:border-emerald-500/40 text-xs font-bold transition cursor-pointer"
                >
                  Set Primary
                </button>
              ) : (
                <span className="text-[11px] font-mono text-emerald-400 font-bold px-2 py-1">
                  Active Primary
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    )}

      {/* ==================================================== */}
      {/* ADD / EDIT VEHICLE MODAL                             */}
      {/* ==================================================== */}
      <AnimatePresence>
        {(showAddModal || editingVehicle) && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#0B1329] border border-slate-800 rounded-3xl p-6 md:p-7 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Car size={20} className="text-emerald-400" />
                  {editingVehicle ? "Edit Electric Vehicle" : "Add New Vehicle to Garage"}
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingVehicle(null);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveVehicle} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">
                    EV Manufacturer / Brand
                  </label>
                  <select
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 text-white font-bold rounded-xl p-2.5 focus:border-emerald-500 outline-none"
                  >
                    <option value="Tata Motors">Tata Motors (Nexon, Tiago, Punch EV)</option>
                    <option value="MG Motor">MG Motor (ZS EV, Comet)</option>
                    <option value="Hyundai">Hyundai (Ioniq 5, Kona)</option>
                    <option value="Kia">Kia (EV6, EV9)</option>
                    <option value="Mahindra">Mahindra (XUV400 EV)</option>
                    <option value="BYD">BYD (Atto 3, Seal)</option>
                    <option value="BMW">BMW (i4, iX1)</option>
                    <option value="Mercedes-Benz">Mercedes-Benz (EQB, EQE)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">
                    Model Name
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g. Nexon EV Max 40.5 kWh"
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5 font-bold focus:border-emerald-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">
                    Vehicle Registration Number
                  </label>
                  <input
                    type="text"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. TN58AB1234"
                    className="w-full bg-slate-900 border border-slate-700 text-emerald-400 font-mono text-xs font-bold rounded-xl p-2.5 focus:border-emerald-500 outline-none uppercase"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 uppercase mb-1">
                      Battery (kWh)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.batteryCapacity}
                      onChange={(e) => setFormData({ ...formData, batteryCapacity: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 text-white font-mono rounded-xl p-2.5 focus:border-emerald-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 uppercase mb-1">
                      Connector Type
                    </label>
                    <select
                      value={formData.connectorType}
                      onChange={(e) => setFormData({ ...formData, connectorType: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 text-white font-bold rounded-xl p-2.5 focus:border-emerald-500 outline-none"
                    >
                      <option value="CCS2">CCS2 (DC Fast)</option>
                      <option value="Type 2">Type 2 (AC)</option>
                      <option value="CHAdeMO">CHAdeMO</option>
                      <option value="GB/T">GB/T</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 uppercase mb-1">
                      Battery Percentage (%)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.batteryPercentage}
                      onChange={(e) => setFormData({ ...formData, batteryPercentage: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 text-white font-mono rounded-xl p-2.5 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 uppercase mb-1">
                      Estimated Range (km)
                    </label>
                    <input
                      type="number"
                      value={formData.range}
                      onChange={(e) => setFormData({ ...formData, range: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 text-white font-mono rounded-xl p-2.5 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingVehicle(null);
                    }}
                    className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                  >
                    {editingVehicle ? "Save Changes" : "Save Vehicle"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* VIEW VEHICLE SPECS MODAL                            */}
      {/* ==================================================== */}
      <AnimatePresence>
        {viewingVehicle && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#0B1329] border border-emerald-500/40 rounded-3xl p-6 md:p-8 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Car size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">
                      {viewingVehicle.manufacturer || viewingVehicle.brand} {viewingVehicle.model}
                    </h3>
                    <span className="font-mono text-xs text-emerald-400 font-bold">
                      {viewingVehicle.vehicleNumber || viewingVehicle.number}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setViewingVehicle(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex justify-between">
                  <span className="text-slate-400">Battery Capacity:</span>
                  <span className="font-mono font-bold text-white">
                    {viewingVehicle.batteryCapacity || viewingVehicle.batteryCapacityKb || 40.5} kWh
                  </span>
                </div>
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex justify-between">
                  <span className="text-slate-400">Connector Standard:</span>
                  <span className="font-mono font-bold text-cyan-300">
                    {viewingVehicle.connectorType || viewingVehicle.connector || "CCS2"}
                  </span>
                </div>
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex justify-between">
                  <span className="text-slate-400">Estimated Full Range:</span>
                  <span className="font-mono font-bold text-white">
                    {viewingVehicle.range || 312} km
                  </span>
                </div>
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex justify-between">
                  <span className="text-slate-400">Primary Status:</span>
                  <span className="font-bold text-emerald-400">
                    {viewingVehicle.isPrimary ? "Yes (Default for Bookings)" : "Secondary"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setViewingVehicle(null)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition"
              >
                Close Details
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
