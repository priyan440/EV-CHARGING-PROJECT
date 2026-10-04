import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Car,
  Zap,
  Battery,
  ShieldCheck,
  ArrowLeft,
  Gauge,
  Calendar,
  Layers,
  Edit3,
  Trash2,
  Cpu,
  Clock,
  BatteryCharging,
} from "lucide-react";
import { vehicleService } from "../services/vehicleService";
import Breadcrumbs from "../components/Breadcrumbs";
import Toast from "../components/Toast";

export default function VehicleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: "", type: "success" });

  useEffect(() => {
    vehicleService.getVehicleById(id)
      .then((res) => {
        if (res?.success && res.data) {
          setVehicle(res.data);
        } else {
          setToast({ message: "Vehicle not found", type: "error" });
        }
      })
      .catch((err) => {
        setToast({ message: err.message || "Failed to load vehicle", type: "error" });
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-[var(--text-secondary)] space-y-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs uppercase font-bold tracking-widest">Loading vehicle details from MySQL...</p>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <Car size={48} className="text-[var(--text-muted)] mx-auto" />
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Vehicle Not Found</h2>
        <p className="text-xs text-[var(--text-secondary)]">The requested vehicle record could not be found in the database.</p>
        <Link to="/vehicles" className="inline-flex px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider">
          Back to Vehicles
        </Link>
      </div>
    );
  }

  const soc = vehicle.current_soc_percent ?? vehicle.batteryPercentage ?? 70;
  const capacity = vehicle.batteryCapacityKwh || vehicle.batteryCapacity || 40.5;
  const estRange = Math.round(capacity * 7.5 * (soc / 100));

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      <Breadcrumbs
        items={[
          { label: "My Vehicles", path: "/vehicles" },
          { label: `${vehicle.brand || ""} ${vehicle.model}`.trim() || "Vehicle Specs", path: `/vehicles/${id}` },
        ]}
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/vehicles"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-emerald-500 font-semibold mb-2 transition"
          >
            <ArrowLeft size={14} /> Back to Vehicles
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
              {vehicle.brand} {vehicle.model}
            </h1>
            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              {vehicle.registrationNumber || vehicle.vehicleNumber}
            </span>
          </div>
        </div>

        {/* Primary Action Button */}
        <Link
          to={`/charging/estimate?vehicleId=${vehicle.id}`}
          className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition hover:scale-105"
        >
          <Zap size={16} /> Calculate & Charge Vehicle
        </Link>
      </div>

      {/* Battery State Card */}
      <div className="theme-card p-6 sm:p-8 rounded-3xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Current Battery Level</span>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-black font-mono text-emerald-500">{soc}%</span>
              <span className="text-xs text-[var(--text-muted)] font-medium">Approx. {estRange} km remaining</span>
            </div>
          </div>

          <div className="flex-1 max-w-md">
            <div className="h-4 rounded-full bg-[var(--bg-card-subtle)] p-0.5 border border-[var(--border-subtle)] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, soc))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono mt-1.5">
              <span>0% Empty</span>
              <span>80% Recommended</span>
              <span>100% Full</span>
            </div>
          </div>
        </div>

        {/* Technical Specs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[var(--border-subtle)]">
          <div className="bg-[var(--bg-card-subtle)] p-4 rounded-2xl border border-[var(--border-subtle)]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Battery Pack</span>
            <span className="text-lg font-extrabold font-mono text-[var(--text-primary)]">{capacity} kWh</span>
          </div>

          <div className="bg-[var(--bg-card-subtle)] p-4 rounded-2xl border border-[var(--border-subtle)]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Max DC Charge</span>
            <span className="text-lg font-extrabold font-mono text-emerald-500">{vehicle.maxChargingPowerKw || 50} kW</span>
          </div>

          <div className="bg-[var(--bg-card-subtle)] p-4 rounded-2xl border border-[var(--border-subtle)]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Connector Port</span>
            <span className="text-lg font-extrabold text-[var(--text-primary)]">{vehicle.connectorType || "CCS2"}</span>
          </div>

          <div className="bg-[var(--bg-card-subtle)] p-4 rounded-2xl border border-[var(--border-subtle)]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Vehicle Class</span>
            <span className="text-lg font-extrabold text-[var(--text-primary)]">{vehicle.vehicleType || "4W Car"}</span>
          </div>
        </div>
      </div>

      {toast.message && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />
      )}
    </div>
  );
}
