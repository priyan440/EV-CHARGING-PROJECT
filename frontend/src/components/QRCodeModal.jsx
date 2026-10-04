import { useState } from "react";
import { QrCode, MapPin, CheckCircle, AlertCircle, RefreshCw, X, Shield, Navigation } from "lucide-react";
import { useSystemState } from "../contexts/SystemStateContext";

export default function QRCodeModal({ booking, onClose }) {
  const { checkInBooking } = useSystemState();
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedInSuccess, setCheckedInSuccess] = useState(
    booking?.status === "CHECKED_IN" || booking?.status === "CHARGING"
  );
  const [geofenceError, setGeofenceError] = useState("");
  const [bypassGeofence, setBypassGeofence] = useState(true);

  if (!booking) return null;

  const handleSimulateQRScan = () => {
    setCheckingIn(true);
    setGeofenceError("");

    setTimeout(() => {
      if (!bypassGeofence) {
        setGeofenceError("Check-in failed. GPS location places you 450m away from station (Allowed radius: 100m). Enable bypass for dev testing.");
        setCheckingIn(false);
        return;
      }

      checkInBooking(booking.bookingId);
      setCheckedInSuccess(true);
      setCheckingIn(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in text-[var(--text-primary)]">
      <div className="theme-card w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-raised)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)] font-heading">Station Check-in QR</h3>
              <p className="text-xs text-[var(--text-secondary)] font-mono">Pass: {booking.bookingId || "BK000001"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl hover:bg-[var(--bg-surface)] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 text-center space-y-6">
          {checkedInSuccess ? (
            <div className="space-y-4 py-4 animate-scale-up">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-[var(--text-primary)]">Station Check-in Confirmed!</h4>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-1">Status: CHECKED_IN • Charger Ready</p>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Plug in your vehicle connector <span className="text-[var(--text-primary)] font-semibold">({booking.connectorType || "CCS2"})</span> and proceed to live charging.
              </p>
              <button
                onClick={onClose}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* QR Container */}
              <div className="relative p-6 bg-white rounded-2xl inline-block shadow-lg border-2 border-slate-200 dark:border-slate-800 mx-auto">
                <svg className="w-48 h-48" viewBox="0 0 200 200" fill="none">
                  <rect width="200" height="200" fill="white" />
                  <rect x="10" y="10" width="50" height="50" fill="#0F172A" />
                  <rect x="20" y="20" width="30" height="30" fill="white" />
                  <rect x="25" y="25" width="20" height="20" fill="#0F172A" />

                  <rect x="140" y="10" width="50" height="50" fill="#0F172A" />
                  <rect x="150" y="20" width="30" height="30" fill="white" />
                  <rect x="155" y="25" width="20" height="20" fill="#0F172A" />

                  <rect x="10" y="140" width="50" height="50" fill="#0F172A" />
                  <rect x="20" y="150" width="30" height="30" fill="white" />
                  <rect x="25" y="155" width="20" height="20" fill="#0F172A" />

                  <path d="M70 20h20v20H70zM100 20h30v10h-30zM70 50h10v30H70zM90 60h20v10H90zM120 40h20v20h-20zM10 70h40v10H10zM70 90h30v20H70zM110 80h30v30h-30zM150 70h30v20h-30zM20 100h30v20H20zM60 120h40v10H60zM120 120h20v30h-20zM160 100h20v40h-20zM80 140h30v20H80zM130 150h40v20h-40zM70 170h40v20H70zM140 180h30v10h-30z" fill="#0F172A" />
                </svg>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 bg-blue-600 border-2 border-white rounded-lg flex items-center justify-center text-white font-mono font-bold text-xs shadow-md">
                    EV
                  </div>
                </div>
              </div>

              {/* Station Info Box */}
              <div className="bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-2xl p-3.5 text-xs text-left space-y-1.5 font-mono">
                <div className="flex justify-between text-[var(--text-primary)] font-sans font-semibold">
                  <span className="truncate">{booking.stationName || "Charging Station"}</span>
                  <span className="text-blue-600 dark:text-blue-400">{booking.connectorType || "Standard"}</span>
                </div>
                <div className="flex justify-between text-[var(--text-secondary)] text-[11px]">
                  <span>Slot: {booking.date || "Date N/A"} @ {booking.time || "Time N/A"}</span>
                  <span>Vehicle: {booking.vehicleNumber || "N/A"}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] pt-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Encrypted digital check-in token</span>
                </div>
              </div>

              {/* Geofence Notice & Dev Toggle */}
              {geofenceError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-600 dark:text-rose-400 text-left flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{geofenceError}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs bg-[var(--bg-surface-raised)] p-2.5 rounded-xl border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>100m Station Geo-fencing</span>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer text-[var(--text-primary)] font-medium">
                  <input
                    type="checkbox"
                    checked={bypassGeofence}
                    onChange={(e) => setBypassGeofence(e.target.checked)}
                    className="accent-blue-600 rounded"
                  />
                  <span>Bypass for Testing</span>
                </label>
              </div>

              {/* Scan / Check In Simulation Button */}
              <button
                onClick={handleSimulateQRScan}
                disabled={checkingIn}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
              >
                {checkingIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Validating Geo-fence & Checking In...
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" />
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
