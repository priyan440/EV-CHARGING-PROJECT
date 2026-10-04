import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Zap,
  Car,
  Battery,
  BatteryCharging,
  Sliders,
  MapPin,
  Clock,
  ArrowRight,
  ArrowLeft,
  Info,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Gauge,
  Cpu,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import Breadcrumbs from "../components/Breadcrumbs";
import { vehicleService } from "../services/vehicleService";
import { stationService } from "../services/stationService";
import { bookingService } from "../services/bookingService";
import Toast from "../components/Toast";

// Helper to check if a charger/connector is compatible with a vehicle
export const checkCompatibility = (chargerObj, vehObj) => {
  if (!chargerObj || !vehObj) return true;
  const vTypeId = vehObj.connector_type_id || vehObj.connectorTypeId;
  const cTypeId = chargerObj.connector_type_id || chargerObj.connectorTypeId;
  if (vTypeId && cTypeId) {
    return Number(vTypeId) === Number(cTypeId);
  }
  const vType = (vehObj.connector_type || vehObj.connectorType || "").toLowerCase().replace(/[\s-_]/g, "");
  const cType = (chargerObj.connector_name || chargerObj.connector_type || chargerObj.connectorType || "").toLowerCase().replace(/[\s-_]/g, "");
  if (!vType || !cType) return true;
  return vType === cType || cType.includes(vType) || vType.includes(cType);
};

export default function SmartChargingEstimate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const queryStationId = searchParams.get("stationId") || "";
  const queryChargerId = searchParams.get("chargerId") || "";
  const queryVehicleId = searchParams.get("vehicleId") || "";

  // Data loaded from MySQL
  const [vehicles, setVehicles] = useState([]);
  const [stations, setStations] = useState([]);
  const [chargers, setChargers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: "", type: "success" });

  // Selected State
  const [selectedVehicleId, setSelectedVehicleId] = useState(queryVehicleId);
  const [selectedStationId, setSelectedStationId] = useState(queryStationId);
  const [selectedChargerId, setSelectedChargerId] = useState(queryChargerId);

  // SOC Sliders
  const [currentSoc, setCurrentSoc] = useState(50);
  const [targetSoc, setTargetSoc] = useState(80);

  // Load vehicles and stations from MySQL
  useEffect(() => {
    Promise.all([
      vehicleService.fetchVehicles().catch(() => []),
      stationService.getApprovedStations().catch(() => ({ data: [] })),
    ]).then(([vehs, stnsRes]) => {
      const vehList = Array.isArray(vehs) ? vehs : [];
      setVehicles(vehList);

      const stnList = stnsRes?.data && Array.isArray(stnsRes.data) ? stnsRes.data : [];
      setStations(stnList);

      // Default selection if none in query params
      if (!selectedVehicleId && vehList.length > 0) {
        setSelectedVehicleId(vehList[0].id);
        const vSoc = vehList[0].current_soc_percent ?? vehList[0].batteryPercentage ?? 50;
        setCurrentSoc(vSoc);
        setTargetSoc(Math.min(100, Math.max(vSoc + 20, 80)));
      }

      if (!selectedStationId && stnList.length > 0) {
        setSelectedStationId(stnList[0].id);
      }

      setLoading(false);
    });
  }, []);

  // Update chargers whenever selectedStationId changes, auto-selecting compatible connector
  useEffect(() => {
    if (!selectedStationId) {
      setChargers([]);
      return;
    }
    stationService.getStationConnectors(selectedStationId)
      .then((res) => {
        let chgList = [];
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          chgList = res.data;
        } else {
          // Fallback to station chargers
          const stn = stations.find((s) => String(s.id) === String(selectedStationId));
          chgList = stn?.chargers || [
            { id: 1, charger_name: "DC Fast Bay 1", power_kw: 60, connector_name: "CCS2", connector_type_id: 1, pricePerKwh: 18 },
            { id: 2, charger_name: "DC Fast Bay 2", power_kw: 120, connector_name: "CCS2", connector_type_id: 1, pricePerKwh: 18 },
          ];
        }
        setChargers(chgList);

        const currentVeh = vehicles.find((v) => String(v.id) === String(selectedVehicleId)) || vehicles[0];
        const compatibleList = chgList.filter((c) => checkCompatibility(c, currentVeh));

        const currentlySelectedValid = chgList.some(
          (c) => String(c.id) === String(selectedChargerId) && checkCompatibility(c, currentVeh)
        );

        if (!currentlySelectedValid) {
          if (compatibleList.length > 0) {
            setSelectedChargerId(compatibleList[0].id);
          } else if (chgList.length > 0) {
            setSelectedChargerId(chgList[0].id);
          }
        }
      })
      .catch(() => {
        setChargers([]);
      });
  }, [selectedStationId, stations, selectedVehicleId, vehicles]);

  // Selected Objects
  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => String(v.id) === String(selectedVehicleId)) || vehicles[0] || null;
  }, [vehicles, selectedVehicleId]);

  const selectedStation = useMemo(() => {
    return stations.find((s) => String(s.id) === String(selectedStationId)) || stations[0] || null;
  }, [stations, selectedStationId]);

  const selectedCharger = useMemo(() => {
    return chargers.find((c) => String(c.id) === String(selectedChargerId)) || chargers[0] || null;
  }, [chargers, selectedChargerId]);

  // Check if currently selected charger is compatible
  const isCompatible = useMemo(() => {
    return checkCompatibility(selectedCharger, selectedVehicle);
  }, [selectedCharger, selectedVehicle]);

  // Update SOC and auto-select compatible charger from vehicle if vehicle changes
  const handleVehicleChange = (vId) => {
    setSelectedVehicleId(vId);
    const veh = vehicles.find((v) => String(v.id) === String(vId));
    if (veh) {
      const vSoc = veh.current_soc_percent ?? veh.batteryPercentage ?? 50;
      setCurrentSoc(vSoc);
      setTargetSoc(Math.min(100, Math.max(vSoc + 20, 80)));

      // Auto-select compatible connector for the newly chosen vehicle
      if (chargers.length > 0) {
        const compatible = chargers.filter((c) => checkCompatibility(c, veh));
        if (compatible.length > 0) {
          setSelectedChargerId(compatible[0].id);
        }
      }
    }
  };

  // Enforce targetSoc >= currentSoc
  const handleCurrentSocChange = (val) => {
    const newCur = parseInt(val, 10);
    setCurrentSoc(newCur);
    if (targetSoc <= newCur) {
      setTargetSoc(Math.min(100, newCur + 10));
    }
  };

  const handleTargetSocChange = (val) => {
    const newTgt = parseInt(val, 10);
    setTargetSoc(Math.max(currentSoc + 5, newTgt));
  };

  // Real-Time Smart Calculations (Strictly according to Section 11)
  const calculation = useMemo(() => {
    const batteryCapacity = parseFloat(selectedVehicle?.batteryCapacityKwh || selectedVehicle?.battery_capacity || selectedVehicle?.batteryCapacity || 40.5);
    const vehicleMaxPower = parseFloat(selectedVehicle?.maxChargingPowerKw || selectedVehicle?.max_charging_power_kw || 50.0);
    const chargerPower = parseFloat(selectedCharger?.powerKw || selectedCharger?.power_kw || 60.0);
    const tariffRate = parseFloat(selectedStation?.pricePerKwh || selectedStation?.base_rate_per_kwh || selectedCharger?.pricePerKwh || 18.0);
    const efficiency = 0.90; // 90% standard EV charging efficiency

    // 1. Required Energy = Battery Capacity × (Target SOC - Current SOC) / 100
    const socDiff = Math.max(0, targetSoc - currentSoc);
    const requiredEnergyKwh = Math.round((batteryCapacity * (socDiff / 100)) * 100) / 100;

    // 2. Effective Charging Power = MIN(Charger Power, Vehicle Max Power)
    const effectivePowerKw = Math.min(chargerPower, vehicleMaxPower);

    // 3. Adjusted Energy = Required Energy / Charging Efficiency
    const adjustedGridEnergyKwh = Math.round((requiredEnergyKwh / efficiency) * 100) / 100;

    // 4. Estimated Time = (Adjusted Energy / Effective Power) × 60 (in minutes)
    const estimatedMinutes = effectivePowerKw > 0
      ? Math.max(5, Math.round((adjustedGridEnergyKwh / effectivePowerKw) * 60))
      : 30;

    // 5. Estimated Cost
    const energyCost = Math.round(adjustedGridEnergyKwh * tariffRate * 100) / 100;
    const platformFee = 15.00;
    const subtotal = energyCost + platformFee;
    const gstTax = Math.round(subtotal * 0.18 * 100) / 100;
    const totalCost = Math.round((subtotal + gstTax) * 100) / 100;

    let timeFormatted = `${estimatedMinutes} minutes`;
    if (estimatedMinutes >= 60) {
      const h = Math.floor(estimatedMinutes / 60);
      const m = estimatedMinutes % 60;
      timeFormatted = m > 0 ? `${h} hr ${m} min` : `${h} hr`;
    }

    return {
      batteryCapacity,
      socDiff,
      requiredEnergyKwh,
      effectivePowerKw,
      efficiencyPercent: 90,
      adjustedGridEnergyKwh,
      estimatedMinutes,
      timeFormatted,
      tariffRate,
      energyCost,
      platformFee,
      gstTax,
      totalCost,
    };
  }, [selectedVehicle, selectedCharger, selectedStation, currentSoc, targetSoc]);

  const handleProceedToSlots = () => {
    if (!selectedVehicle) {
      setToast({ message: "Please select an EV vehicle.", type: "error" });
      return;
    }
    if (!selectedStation) {
      setToast({ message: "Please select a charging station.", type: "error" });
      return;
    }
    if (!selectedCharger) {
      setToast({ message: "Please select a charger bay.", type: "error" });
      return;
    }

    if (!isCompatible) {
      const vReq = selectedVehicle?.connector_type || selectedVehicle?.connectorType || "compatible connector";
      const cHas = selectedCharger?.connector_name || selectedCharger?.connector_type || selectedCharger?.connectorType || "different connector";
      setToast({
        message: `Incompatible connector: Your ${selectedVehicle?.brand || ""} ${selectedVehicle?.model || "vehicle"} requires a ${vReq} connector, but this bay is ${cHas}. Please select a compatible bay.`,
        type: "error",
      });
      return;
    }

    // Save calculation session in localStorage & pass state
    const estimateState = {
      vehicleId: selectedVehicle.id,
      vehicle: selectedVehicle,
      stationId: selectedStation.id,
      station: selectedStation,
      chargerId: selectedCharger.id,
      charger: selectedCharger,
      currentSoc,
      targetSoc,
      calculation,
      timestamp: Date.now(),
    };

    localStorage.setItem("ev_active_estimate", JSON.stringify(estimateState));

    navigate("/charging/slots", {
      state: estimateState,
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs uppercase font-bold tracking-widest text-[var(--text-secondary)]">
          Loading Smart Charging Calculator...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-16">
      <Breadcrumbs
        items={[
          { label: "Stations", path: "/stations" },
          { label: selectedStation?.name || selectedStation?.station_name || "Station Details", path: `/stations/${selectedStationId}` },
          { label: "Smart Charging Calculator", path: "/charging/estimate" },
        ]}
      />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
            <Zap className="text-emerald-500 fill-emerald-500" /> Smart Charging Calculator
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Accurate SOC-based energy modeling, non-linear battery estimation, and dynamic slot calculation.
          </p>
        </div>

        <Link
          to="/stations"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-emerald-500 font-semibold"
        >
          <ArrowLeft size={14} /> Change Station
        </Link>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Inputs (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Step 1: Select Vehicle */}
          <div className="theme-card p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-black">1</span>
                Select Vehicle
              </span>
              <Link to="/vehicles/add" className="text-[11px] font-bold text-emerald-500 hover:underline">
                + Add New EV
              </Link>
            </div>

            {vehicles.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-[var(--border-subtle)] text-center space-y-2">
                <p className="text-xs text-[var(--text-secondary)]">No vehicles found in your garage.</p>
                <Link to="/vehicles/add" className="inline-block px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider">
                  Add Your First Vehicle
                </Link>
              </div>
            ) : (
              <select
                value={selectedVehicleId}
                onChange={(e) => handleVehicleChange(e.target.value)}
                className="w-full theme-input px-4 py-3 rounded-xl text-sm font-semibold cursor-pointer"
              >
                {vehicles.map((v) => {
                  const conn = v.connector_type || v.connectorType || "CCS2";
                  return (
                    <option key={v.id} value={v.id}>
                      {v.brand} {v.model} ({v.registrationNumber || v.registration_number}) • {v.batteryCapacityKwh || v.battery_capacity || 40} kWh • {conn}
                    </option>
                  );
                })}
              </select>
            )}

            {selectedVehicle && (
              <div className="flex flex-wrap gap-4 text-[11px] text-[var(--text-secondary)] bg-[var(--bg-card-subtle)] p-2.5 rounded-xl border border-[var(--border-subtle)]">
                <span>Max Power: <b className="text-emerald-500">{selectedVehicle.maxChargingPowerKw || selectedVehicle.max_power_kw || 50} kW</b></span>
                <span>Required Connector: <b className="text-emerald-400 font-bold">{selectedVehicle.connector_type || selectedVehicle.connectorType || "CCS2"}</b></span>
                <span>Battery: <b className="text-[var(--text-primary)]">{selectedVehicle.batteryCapacityKwh || selectedVehicle.battery_capacity || 40.5} kWh</b></span>
              </div>
            )}
          </div>

          {/* Step 2 & 3: Interactive Battery Sliders */}
          <div className="theme-card p-5 sm:p-6 rounded-2xl space-y-5">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-black">2</span>
              Battery State of Charge (SOC)
            </span>

            {/* Current SOC Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                  <Battery size={14} className="text-amber-500" /> Current Battery Level
                </span>
                <span className="text-base font-black font-mono text-amber-500">{currentSoc}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="95"
                value={currentSoc}
                onChange={(e) => handleCurrentSocChange(e.target.value)}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Target SOC Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                  <BatteryCharging size={14} className="text-emerald-500" /> Target Battery Level
                </span>
                <span className="text-base font-black font-mono text-emerald-500">{targetSoc}%</span>
              </div>
              <input
                type="range"
                min={currentSoc + 5}
                max="100"
                value={targetSoc}
                onChange={(e) => handleTargetSocChange(e.target.value)}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
                <span>Start: {currentSoc}%</span>
                <span>Delta: +{targetSoc - currentSoc}%</span>
                <span>Target: {targetSoc}% (80% Recommended)</span>
              </div>
            </div>
          </div>

          {/* Step 4: Select Station */}
          <div className="theme-card p-5 rounded-2xl space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-black">3</span>
              Select Charging Station
            </span>
            <select
              value={selectedStationId}
              onChange={(e) => setSelectedStationId(e.target.value)}
              className="w-full theme-input px-4 py-3 rounded-xl text-sm font-semibold cursor-pointer"
            >
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.station_name || s.name} ({s.address || s.city || "EV Hub"})
                </option>
              ))}
            </select>
          </div>

          {/* Step 5: Select Charger Bay */}
          <div className="theme-card p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-black">4</span>
                Select Charger Bay
              </span>
              {selectedVehicle && (
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                  Vehicle needs: <b className="text-emerald-400">{selectedVehicle.connector_type || selectedVehicle.connectorType || "CCS2"}</b>
                </span>
              )}
            </div>

            {chargers.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)]">No chargers registered at this station.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {chargers.map((c) => {
                  const isSelected = String(c.id) === String(selectedChargerId);
                  const power = c.power_kw || c.max_power_kw || c.powerKw || 60;
                  const connName = c.connector_name || c.connector_type || c.connectorType || "CCS2";
                  const isComp = checkCompatibility(c, selectedVehicle);

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        if (!isComp) {
                          setToast({
                            message: `Note: This bay provides ${connName}, but your vehicle requires ${selectedVehicle?.connector_type || selectedVehicle?.connectorType || 'a different connector'}.`,
                            type: "error",
                          });
                        }
                        setSelectedChargerId(c.id);
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition relative cursor-pointer ${
                        isSelected
                          ? isComp
                            ? "border-emerald-500 bg-emerald-500/10 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500"
                            : "border-rose-500 bg-rose-500/10 shadow-md shadow-rose-500/10 ring-1 ring-rose-500"
                          : isComp
                          ? "border-[var(--border-subtle)] bg-[var(--bg-card-subtle)] hover:border-emerald-500/50"
                          : "border-rose-500/20 bg-rose-500/5 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-extrabold text-xs text-[var(--text-primary)]">
                          {c.connector_number || c.connector_id || c.charger_name || `Bay #${c.id}`}
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                          {power} kW
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-[var(--border-subtle)]">
                        <span className="text-xs font-mono font-extrabold text-[var(--text-primary)]">
                          {connName}
                        </span>
                        {isComp ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            ✓ Compatible
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                            ✕ Incompatible
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {!isCompatible && selectedCharger && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>
                  The selected bay (<b>{selectedCharger.connector_name || selectedCharger.connector_type || "different"}</b>) does not match your vehicle (<b>{selectedVehicle?.connector_type || selectedVehicle?.connectorType || "required"}</b>). Please tap a compatible bay above.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Dynamic Battery Visualization & Estimate (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Animated Battery Graphic Card */}
          <div className="theme-card p-6 rounded-3xl space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" /> Battery Visualization
            </h3>

            {/* Battery Comparison Visual */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-[var(--bg-card-subtle)] p-4 rounded-2xl border border-[var(--border-subtle)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">CURRENT</span>
                <div className="text-3xl font-black font-mono text-amber-500 flex items-center justify-center gap-1">
                  🔋 {currentSoc}%
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">Present Level</span>
              </div>

              <div className="bg-[var(--bg-card-subtle)] p-4 rounded-2xl border border-emerald-500/30">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">TARGET</span>
                <div className="text-3xl font-black font-mono text-emerald-500 flex items-center justify-center gap-1">
                  ⚡ {targetSoc}%
                </div>
                <span className="text-[10px] text-emerald-500/80">Goal Level</span>
              </div>
            </div>

            {/* Energy Required Banner */}
            <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-4 rounded-2xl border border-emerald-500/20 text-center">
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-[var(--text-muted)] block">
                Net Energy Required
              </span>
              <div className="text-2xl font-black font-mono text-emerald-400 my-0.5">
                {calculation.requiredEnergyKwh} kWh
              </div>
              <span className="text-[11px] text-[var(--text-secondary)]">
                Pack Capacity: {calculation.batteryCapacity} kWh ({targetSoc - currentSoc}% delta)
              </span>
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-3 text-xs pt-2 border-t border-[var(--border-subtle)]">
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-secondary)]">Effective Charging Power</span>
                <span className="font-mono font-bold text-[var(--text-primary)]">{calculation.effectivePowerKw} kW</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-secondary)]">Charging Efficiency</span>
                <span className="font-mono font-bold text-[var(--text-primary)]">{calculation.efficiencyPercent}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-secondary)]">Estimated Charging Time</span>
                <span className="font-mono font-extrabold text-emerald-500 text-sm">{calculation.timeFormatted}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[var(--text-secondary)]">Estimated Total Cost</span>
                <span className="font-mono font-extrabold text-lg text-[var(--text-primary)]">₹{calculation.totalCost}</span>
              </div>
            </div>

            {/* Proceed to 24-Hour Slots Button */}
            <button
              type="button"
              onClick={handleProceedToSlots}
              disabled={!isCompatible}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition ${
                isCompatible
                  ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-xl shadow-emerald-500/25 hover:scale-[1.02] cursor-pointer"
                  : "bg-[var(--bg-card-subtle)] text-rose-400 border border-rose-500/30 cursor-not-allowed opacity-80"
              }`}
            >
              <span>{isCompatible ? `Find Available Slot (${calculation.timeFormatted})` : "Select Compatible Bay Above to Continue"}</span>
              <ArrowRight size={16} />
            </button>

            <p className="text-[10px] text-[var(--text-muted)] text-center leading-relaxed">
              * Note: Estimated charging duration is dynamically computed based on battery chemistry and effective charger power. Physical charging duration may vary slightly.
            </p>
          </div>
        </div>
      </div>

      {toast.message && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />
      )}
    </div>
  );
}
