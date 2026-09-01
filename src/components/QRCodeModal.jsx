import { useState } from "react";
import { QrCode, MapPin, CheckCircle, AlertCircle, RefreshCw, X, Shield, Navigation } from "lucide-react";
import { useSystemState } from "../contexts/SystemStateContext";

export default function QRCodeModal({ booking, onClose }) {
  const { checkInBooking } = useSystemState();
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedInSuccess, setCheckedInSuccess] = useState(booking.status === "CHECKED_IN" || booking.status === "CHARGING");
  const [geofenceError, setGeofenceError] = useState("");
  const [bypassGeofence, setBypassGeofence] = useState(true); // Default true for development testing ease

  const handleSimulateQRScan = () => {
    setCheckingIn(true);
    setGeofenceError("");

    setTimeout(() => {
      // Simulate Geofencing check (100m radius)
      if (!bypassGeofence) {
        setGeofenceError("Check-in failed. GPS location places you 450m away from station (Allowed radius: 100m). Enable bypass for dev testing.");
        setCheckingIn(false);
        return;
      }

      checkInBooking(booking.bookingId);
      setCheckedInSuccess(true);
      setCheckingIn(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Station Check-in QR</h3>
              <p className="text-xs text-slate-400">Booking Pass: {booking.bookingId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 text-center space-y-6">

          {checkedInSuccess ? (
            <div className="space-y-4 py-4 animate-scale-up">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white">Station Check-in Confirmed!</h4>
                <p className="text-xs text-emerald-400 mt-1">Status: CHECKED_IN • Charger CHG0001 Activated</p>
              </div>
              <p className="text-xs text-slate-400">
                Plug in your vehicle connector <span className="text-white font-semibold">({booking.connectorType || "CCS2"})</span> and start live charging session.
              </p>
              <button
                onClick={onClose}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-950/50"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* QR Container */}
              <div className="relative p-6 bg-white rounded-2xl inline-block shadow-xl border-4 border-slate-800 mx-auto">
                {/* SVG Visual QR Mock */}
                <svg className="w-48 h-48" viewBox="0 0 200 200" fill="none">
                  <rect width="200" height="200" fill="white" />
                  {/* Position detection patterns */}
                  <rect x="10" y="10" width="50" height="50" fill="#0F172A" />
                  <rect x="20" y="20" width="30" height="30" fill="white" />
                  <rect x="25" y="25" width="20" height="20" fill="#0F172A" />

                  <rect x="140" y="10" width="50" height="50" fill="#0F172A" />
                  <rect x="150" y="20" width="30" height="30" fill="white" />
                  <rect x="155" y="25" width="20" height="20" fill="#0F172A" />

                  <rect x="10" y="140" width="50" height="50" fill="#0F172A" />
                  <rect x="20" y="150" width="30" height="30" fill="white" />
                  <rect x="25" y="155" width="20" height="20" fill="#0F172A" />

                  {/* QR Data Payload Simulation Blocks */}
                  <path d="M70 20h20v20H70zM100 20h30v10h-30zM70 50h10v30H70zM90 60h20v10H90zM120 40h20v20h-20zM10 70h40v10H10zM70 90h30v20H70zM110 80h30v30h-30zM150 70h30v20h-30zM20 100h30v20H20zM60 120h40v10H60zM120 120h20v30h-20zM160 100h20v40h-20zM80 140h30v20H80zM130 150h40v20h-40zM70 170h40v20H70zM140 180h30v10h-30z" fill="#0F172A" />
                </svg>

                {/* Center Badge */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 bg-slate-900 border-2 border-emerald-500 rounded-lg flex items-center justify-center text-emerald-400 font-mono font-bold text-xs shadow-lg">
                    EV
                  </div>
                </div>
              </div>

              {/* Station Info Box */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-xs text-left space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-300 font-sans font-semibold">
                  <span>{booking.stationName}</span>
                  <span className="text-emerald-400">{booking.connectorType}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Slot: {booking.date} @ {booking.time}</span>
                  <span>Vehicle: {booking.vehicleNumber}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 pt-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Secure QR token encrypted. No personal PII stored inside QR.</span>
                </div>
              </div>

              {/* Geofence Notice & Dev Toggle */}
              {geofenceError && (
                <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-xl text-xs text-rose-300 text-left flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{geofenceError}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs bg-slate-950/50 p-2.5 rounded-lg border border-slate-800 text-slate-400">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <span>100m Station Geo-fencing</span>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={bypassGeofence}
                    onChange={(e) => setBypassGeofence(e.target.checked)}
                    className="accent-emerald-500 rounded"
                  />
                  <span>Test Mode Override</span>
                </label>
              </div>

              {/* Scan / Check In Simulation Button */}
              <button
                onClick={handleSimulateQRScan}
                disabled={checkingIn}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 text-sm"
              >
                {checkingIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Validating Geo-fence & Checking In...
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4 text-emerald-200" />
                    Simulate Attendant QR Scan & Check In
                  </>
                )}
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
