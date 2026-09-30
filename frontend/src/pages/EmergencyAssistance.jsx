import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Navigation,
  BatteryCharging,
  Clock,
  MapPin,
  Truck,
  PhoneCall,
  CheckCircle2,
  X,
  Compass,
  Zap,
  ArrowRight,
  ShieldAlert,
  Info,
  Sliders,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useSystemState } from "../contexts/SystemStateContext";
import { useLocation } from "../contexts/LocationContext";
import { vehicleService } from "../services/vehicleService";
import { emergencyService } from "../services/emergencyService";

export default function EmergencyAssistance() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { stations } = useSystemState();
  const { currentLocation } = useLocation();

  // Test simulation SOC slider (defaults to realistic emergency SOC 8%)
  const [simulatedSoc, setSimulatedSoc] = useState(8);
  const [activeVehicle, setActiveVehicle] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [toast, setToast] = useState("");

  // Navigation Modal
  const [showNavModal, setShowNavModal] = useState(false);
  const [navTarget, setNavTarget] = useState(null);

  // Dispatch Modal
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchedTicket, setDispatchedTicket] = useState(null);
  const [isDispatching, setIsDispatching] = useState(false);

  const customerId = currentUser?.counterId || "CUS0001";

  useEffect(() => {
    const list = vehicleService.getVehicles(customerId);
    const primary = list.find((v) => v.isPrimary) || list[0] || null;
    setActiveVehicle(primary);
  }, [customerId]);

  useEffect(() => {
    if (stations && stations.length > 0) {
      const evalData = emergencyService.evaluateEmergency(
        currentLocation,
        stations,
        activeVehicle,
        simulatedSoc
      );
      setEvaluation(evalData);
    }
  }, [currentLocation, stations, activeVehicle, simulatedSoc]);

  const handleStartNavigation = (station) => {
    setNavTarget(station);
    setShowNavModal(true);
  };

  const handleRequestDispatch = () => {
    setIsDispatching(true);
    setTimeout(() => {
      const ticket = emergencyService.requestRoadsideAssistance({
        counterId: customerId,
        customerName: currentUser?.name || "Priyan",
        customerPhone: currentUser?.mobile || "+91 9876543210",
        vehicleModel: activeVehicle ? `${activeVehicle.brand} ${activeVehicle.model}` : "EV Vehicle",
        vehicleNumber: activeVehicle?.vehicleNumber || "TN58AB1234",
        currentSoc: simulatedSoc,
        location: currentLocation?.address || "Anna Salai, Chennai",
        latitude: currentLocation?.latitude || 13.0827,
        longitude: currentLocation?.longitude || 80.2707,
      });
      setDispatchedTicket(ticket);
      setIsDispatching(false);
      setShowDispatchModal(true);
    }, 600);
  };

  if (!evaluation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-red-500 border-t-transparent animate-spin" />
        <p className="text-xs font-mono text-slate-500 uppercase tracking-wider font-semibold">
          Triangulating Emergency Stations & Critical Range Matrix...
        </p>
      </div>
    );
  }

  const { primaryStation, alternativeStation, nearbyStations, remainingRangeKm, isCritical, isRangeDeficit, safetyNotice } = evaluation;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* Emergency Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#200B0B] via-[#2F1111] to-[#1F0C1B] border border-red-900/60 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 text-[10px] font-black uppercase font-mono tracking-wider bg-red-500/20 text-red-400 rounded-full border border-red-500/30 flex items-center gap-1.5 animate-pulse">
              <ShieldAlert size={12} className="text-red-400" /> EMERGENCY EV ASSISTANCE PROTOCOL
            </span>
            <span className="px-3 py-1 text-[10px] font-extrabold font-mono tracking-wider bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30">
              PRIORITY: CRITICAL
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <AlertTriangle className="text-red-500 shrink-0" size={28} /> Emergency Low Battery & Rescue
          </h1>

          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Real-time emergency routing to nearest operational fast chargers, alternative grid stations, and 24/7 mobile rapid-charge roadside assistance dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition border border-slate-700 cursor-pointer"
          >
            Cancel / Back
          </button>
        </div>
      </div>

      {/* Safety Warning */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2.5">
        <Info size={16} className="shrink-0 text-amber-500" />
        <span>
          <strong>Safety Advisory:</strong> {safetyNotice}
        </span>
      </div>

      {/* Battery State & Scenario Simulator Slider */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <BatteryCharging size={16} className="text-red-500" /> Vehicle Battery Situation
            </span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
              {activeVehicle ? `${activeVehicle.brand} ${activeVehicle.model}` : "EV Vehicle"} ({activeVehicle?.vehicleNumber || "TN58AB1234"})
            </h3>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Estimated Remaining Range</span>
              <span className="text-2xl font-black font-mono text-red-500">{remainingRangeKm} km</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Battery SOC</span>
              <span className="text-2xl font-black font-mono text-red-500">{simulatedSoc}%</span>
            </div>
          </div>
        </div>

        {/* Interactive Testing Slider */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sliders size={14} className="text-emerald-500" /> Test Low-Battery Scenarios:
            </span>
            <div className="flex gap-1.5">
              {[4, 8, 14, 22].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSimulatedSoc(val)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                    simulatedSoc === val
                      ? "bg-red-600 text-white shadow"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {val}% {val <= 10 ? "Critical" : "Warning"}
                </button>
              ))}
            </div>
          </div>

          <input
            type="range"
            min={1}
            max={35}
            value={simulatedSoc}
            onChange={(e) => setSimulatedSoc(parseInt(e.target.value, 10))}
            className="w-full accent-red-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Nearest Station Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PRIMARY STATION CARD */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1329] border-2 border-emerald-500/50 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ⭐ RECOMMENDED PRIMARY STATION
              </span>
              <span className="text-xs font-mono font-black text-emerald-500">
                {primaryStation.distanceKm} km away
              </span>
            </div>

            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {primaryStation.name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <MapPin size={14} className="text-emerald-500 shrink-0" /> {primaryStation.address}
            </p>

            <div className="grid grid-cols-3 gap-2.5 my-4 text-center">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Travel Time</span>
                <span className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
                  ~{primaryStation.travelTimeMins} mins
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Charger Speed</span>
                <span className="text-xs font-black text-cyan-500 font-mono mt-0.5 block">
                  {primaryStation.recommendedChargerType}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Time to 80%</span>
                <span className="text-base font-black text-emerald-500 font-mono mt-0.5 block">
                  {primaryStation.chargingTimeMins} mins
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
              <span>
                Available Chargers: <strong>{primaryStation.availableCount} of {primaryStation.totalCount} Guns Free</strong>
              </span>
              <span className="font-bold font-mono text-[10px]">NO QUEUE</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => handleStartNavigation(primaryStation)}
              className="w-1/2 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <Navigation size={15} /> Navigate Now
            </button>
            <button
              onClick={() => navigate(`/charging-simulator?stationId=${primaryStation.stationId || primaryStation.id}&currentSoc=${simulatedSoc}`)}
              className="w-1/2 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <Zap size={15} /> Simulate Charging
            </button>
          </div>
        </div>

        {/* BACKUP ALTERNATIVE STATION CARD */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                ALTERNATIVE BACKUP OPTION
              </span>
              <span className="text-xs font-mono font-black text-cyan-500">
                {alternativeStation.distanceKm} km away
              </span>
            </div>

            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {alternativeStation.name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <MapPin size={14} className="text-cyan-500 shrink-0" /> {alternativeStation.address}
            </p>

            <div className="grid grid-cols-3 gap-2.5 my-4 text-center">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Travel Time</span>
                <span className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
                  ~{alternativeStation.travelTimeMins} mins
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Charger Speed</span>
                <span className="text-xs font-black text-cyan-500 font-mono mt-0.5 block">
                  {alternativeStation.recommendedChargerType}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Time to 80%</span>
                <span className="text-base font-black text-emerald-500 font-mono mt-0.5 block">
                  {alternativeStation.chargingTimeMins} mins
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-700 dark:text-cyan-300 flex items-center justify-between">
              <span>
                Available Chargers: <strong>{alternativeStation.availableCount || 2} Guns Available</strong>
              </span>
              <span className="font-bold font-mono text-[10px]">Est. Queue: {alternativeStation.queueMinutes}m</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => handleStartNavigation(alternativeStation)}
              className="w-full py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              <Navigation size={15} /> Navigate to Alternative
            </button>
          </div>
        </div>
      </div>

      {/* Roadside Assistance Dispatch Action */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-red-950/40 via-slate-900 to-[#120B20] border border-red-500/40 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0">
            <Truck size={32} />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Can't Make It to a Charging Station?</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Dispatch our 24/7 Mobile Quick-Charge Van directly to your GPS coordinates. Equipped with a 30kW rapid DC pod to give you 50 km range in 15 minutes.
            </p>
          </div>
        </div>

        <button
          onClick={handleRequestDispatch}
          disabled={isDispatching}
          className="w-full md:w-auto px-6 py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-red-600/30 shrink-0"
        >
          {isDispatching ? (
            <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <PhoneCall size={16} />
          )}
          <span>Request Roadside EV Assistance</span>
        </button>
      </div>

      {/* NAVIGATION MODAL */}
      {showNavModal && navTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Compass size={18} className="text-emerald-500" /> Active Route to {navTarget.name}
              </h3>
              <button
                onClick={() => setShowNavModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-white space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Total Distance:</span>
                <span className="font-bold text-emerald-400">{navTarget.distanceKm} km</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Estimated Travel Time:</span>
                <span className="font-bold text-cyan-400">~{navTarget.travelTimeMins} mins</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Destination:</span>
                <span className="font-bold text-white truncate max-w-xs">{navTarget.address}</span>
              </div>
            </div>

            {/* Turn-by-Turn Directions Simulation */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                Turn-by-Turn Directions
              </h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
                  <ArrowRight size={14} className="text-emerald-500 shrink-0" />
                  <span>Head south on Anna Salai toward Energy Corridor (800 m)</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
                  <ArrowRight size={14} className="text-emerald-500 shrink-0" />
                  <span>Take the ramp onto Inner Ring Road (2.4 km)</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
                  <ArrowRight size={14} className="text-emerald-500 shrink-0" />
                  <span>Turn right into Mall Commercial EV Parking Plaza B2 (400 m)</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  window.open(
                    `https://www.google.com/maps/dir/?api=1&destination=${navTarget.latitude || 13.0827},${navTarget.longitude || 80.2707}`,
                    "_blank"
                  );
                }}
                className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition cursor-pointer shadow-md"
              >
                Open in Google Maps Navigation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISPATCH CONFIRMATION MODAL */}
      {showDispatchModal && dispatchedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0B1329] border border-red-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-red-500 flex items-center gap-2">
                <Truck size={18} /> Roadside Rescue Van Dispatched!
              </h3>
              <button
                onClick={() => setShowDispatchModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
                Ticket Identifier
              </span>
              <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                {dispatchedTicket.ticketId}
              </div>
              <span className="text-xs text-red-600 dark:text-red-400 font-bold block">
                Estimated Arrival: ~{dispatchedTicket.etaMinutes} Minutes
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Dispatched Unit:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{dispatchedTicket.dispatchedUnit}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Vehicle:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{dispatchedTicket.vehicleModel}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Location:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{dispatchedTicket.location}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Emergency Contact:</span>
                <span className="font-bold text-emerald-500">+91 1800-EV-RESCUE</span>
              </div>
            </div>

            <button
              onClick={() => setShowDispatchModal(false)}
              className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg"
            >
              Track Rescue Unit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
