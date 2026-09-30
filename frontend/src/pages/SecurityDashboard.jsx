import React, { useState } from "react";
import { useSystemState } from "../contexts/SystemStateContext";
import { useAuth } from "../contexts/AuthContext";
import {
  FiCheckSquare,
  FiFileText,
  FiShield,
  FiZap,
  FiCheckCircle,
  FiXCircle,
  FiTrendingUp,
  FiMapPin,
  FiClock,
  FiCamera,
  FiAlertOctagon,
  FiAlertTriangle,
  FiCheck
} from "react-icons/fi";
import GlassCard from "../components/GlassCard";
import CyberButton from "../components/CyberButton";

const INITIAL_INCIDENTS = [
  { id: "INC-001", time: "11:20 AM", type: "Unauthorized Parking", bay: "ST001-C04", plate: "KA 05 EV 1122", status: "Resolved", severity: "Low" },
  { id: "INC-002", time: "09:40 AM", type: "Barrier Arm Delay Sensor Alert", bay: "Main Gate", plate: "N/A", status: "Investigating", severity: "Medium" },
];

const SecurityDashboard = ({ activeTab }) => {
  const { user } = useAuth();
  const { bookings, updateBookingStatus } = useSystemState();

  const [bookingIdInput, setBookingIdInput] = useState("");
  const [validatedDetails, setValidatedDetails] = useState(null);
  const [valError, setValError] = useState("");
  const [gateStatus, setGateStatus] = useState("Closed"); // Closed, Opening, Open, Closing

  // ALPR License Plate Camera simulator
  const [alprPlate, setAlprPlate] = useState("");
  const [alprMatch, setAlprMatch] = useState(null);

  // Incidents state
  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS);
  const [newIncType, setNewIncType] = useState("Unauthorized Bay Occupancy");
  const [newIncPlate, setNewIncPlate] = useState("");
  const [newIncBay, setNewIncBay] = useState("ST001-C01");
  const [incLoggedMsg, setIncLoggedMsg] = useState(false);

  // MOCK LOGS LOCAL STATE
  const [gateLogs, setGateLogs] = useState([
    { time: "10:15", bookingId: "BK000002", plateNo: "CA-EV-8891", direction: "IN", status: "Authorized" },
    { time: "09:45", bookingId: "BK000001", plateNo: "NY-TES-4455", direction: "OUT", status: "Authorized" },
    { time: "08:30", bookingId: "BK000002", plateNo: "CA-EV-8891", direction: "OUT", status: "Authorized" },
  ]);

  const handleValidate = (e) => {
    e.preventDefault();
    setValError("");
    setValidatedDetails(null);

    const cleanId = bookingIdInput.trim().toUpperCase();
    const found = bookings.find((b) => b.bookingId === cleanId);

    if (found) {
      setValidatedDetails(found);
    } else {
      setValError("Verification Error: Invalid Booking ID. No match found in registry.");
    }
  };

  const handleAlprScan = (plateNumber) => {
    setAlprPlate(plateNumber);
    setValError("");

    const found = bookings.find(
      (b) => b.vehicleNo.toLowerCase().replaceAll(" ", "") === plateNumber.toLowerCase().replaceAll(" ", "")
    );

    if (found) {
      setAlprMatch(found);
      setValidatedDetails(found);
      setBookingIdInput(found.bookingId);
    } else {
      setAlprMatch(null);
      setValError(`ALPR Camera Alert: Plate '${plateNumber}' has no active reservation.`);
    }
  };

  const handleGateAction = (direction) => {
    if (!validatedDetails) return;

    setGateStatus("Opening");
    setTimeout(() => {
      setGateStatus("Open");

      // Log the entrance or exit
      const newLog = {
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        bookingId: validatedDetails.bookingId,
        plateNo: validatedDetails.vehicleNo,
        direction,
        status: "Authorized",
      };
      setGateLogs((prev) => [newLog, ...prev]);

      // If they are entering (IN) and booking was Approved, let's mark it as Active so they can start charging
      if (direction === "IN" && validatedDetails.status === "Approved") {
        updateBookingStatus(validatedDetails.bookingId, "Active");
      }

      // Close gate after 3 seconds automatically
      setTimeout(() => {
        setGateStatus("Closing");
        setTimeout(() => {
          setGateStatus("Closed");
          setValidatedDetails(null);
          setBookingIdInput("");
          setAlprMatch(null);
        }, 1200);
      }, 2500);
    }, 1200);
  };

  const handleLogIncident = (e) => {
    e.preventDefault();
    if (!newIncPlate.trim()) return;

    const newInc = {
      id: `INC-00${incidents.length + 1}`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: newIncType,
      bay: newIncBay,
      plate: newIncPlate,
      status: "Investigating",
      severity: "Medium",
    };

    setIncidents((prev) => [newInc, ...prev]);
    setIncLoggedMsg(true);
    setNewIncPlate("");
    setTimeout(() => setIncLoggedMsg(false), 3500);
  };

  switch (activeTab) {
    case "overview":
      return (
        <div className="space-y-6">
          {/* Header Portal */}
          <div className="relative overflow-hidden p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-[#1D1710] to-[#0A0F1C] border border-amber-500/30 text-white shadow-2xl">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="px-3.5 py-1 text-[10px] font-bold tracking-widest text-amber-400 bg-amber-500/10 rounded-full border border-amber-500/20 uppercase">
                  SECURITY TERMINAL // SHIELD GUARD ID: {user.id}
                </span>
                <h2 className="text-3xl font-extrabold mt-3 tracking-tight flex items-center gap-3">
                  Gate Barrier & ALPR Camera Console <FiShield className="text-amber-400" />
                </h2>
                <p className="text-slate-300 text-sm mt-1 max-w-xl font-medium">
                  Automated License Plate Recognition (ALPR) camera scanner, QR barcode validation, and electric barrier control.
                </p>
              </div>

              <div className="flex gap-4">
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center min-w-[130px]">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                    Barrier Gate
                  </span>
                  <span
                    className={`text-2xl font-black font-mono uppercase mt-0.5 block ${
                      gateStatus === "Open"
                        ? "text-emerald-400"
                        : gateStatus === "Opening" || gateStatus === "Closing"
                        ? "text-amber-400 animate-pulse"
                        : "text-rose-400"
                    }`}
                  >
                    {gateStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ALPR Quick Scanner & Manual Input */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-6">
              {/* ALPR Camera Simulator */}
              <GlassCard hover={false} className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <FiCamera className="text-amber-600" /> Automated License Plate Scanner (ALPR Feed)
                  </h3>
                  <span className="text-[10px] font-mono bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
                    LIVE HD CAMERA 1080P
                  </span>
                </div>

                <div className="bg-slate-950 p-6 rounded-2xl border-2 border-amber-500/30 text-white relative text-center overflow-hidden">
                  <div className="absolute top-2 left-2 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    CAMERA 01 ONLINE
                  </div>

                  <p className="text-xs text-slate-400 mt-2 mb-4">
                    Simulate vehicle arriving at entry barrier:
                  </p>

                  {/* ALPR Quick Test Chips */}
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAlprScan("TN 58 AB 1234")}
                      className="px-3 py-2 bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-300 rounded-xl text-xs font-mono font-bold transition cursor-pointer"
                    >
                      📸 Scan TN 58 AB 1234
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAlprScan("NY-TES-4455")}
                      className="px-3 py-2 bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-300 rounded-xl text-xs font-mono font-bold transition cursor-pointer"
                    >
                      📸 Scan NY-TES-4455
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAlprScan("MH 02 EV 9999")}
                      className="px-3 py-2 bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30 text-rose-300 rounded-xl text-xs font-mono font-bold transition cursor-pointer"
                    >
                      ⚠️ Scan Unknown (MH 02 EV 9999)
                    </button>
                  </div>
                </div>

                {/* Manual Booking Verification Form */}
                <form onSubmit={handleValidate} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Or Manual Booking ID Entry
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={bookingIdInput}
                        onChange={(e) => setBookingIdInput(e.target.value)}
                        placeholder="e.g. BK000001"
                        className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:border-amber-600"
                        required
                      />
                      <CyberButton type="submit" variant="secondary" className="py-2.5 px-5 text-xs font-bold">
                        Verify ID
                      </CyberButton>
                    </div>
                  </div>

                  {valError && (
                    <div className="p-3 bg-rose-100 border border-rose-300 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                      <FiXCircle /> {valError}
                    </div>
                  )}
                </form>
              </GlassCard>
            </div>

            {/* Validation Details & Gate Trigger Panel */}
            <div className="lg:col-span-5">
              <GlassCard hover={false} className="h-full flex flex-col justify-between p-6">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm border-b border-slate-200 pb-3 mb-4 flex items-center gap-2">
                    <FiCheckSquare className="text-amber-600" /> Clearance & Gate Controls
                  </h3>

                  {validatedDetails ? (
                    <div className="space-y-4 text-xs font-mono">
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-slate-900">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Booking ID:</span>
                          <span className="font-bold text-amber-700">{validatedDetails.bookingId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Customer:</span>
                          <span className="font-sans font-bold">{validatedDetails.customerName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">License Plate:</span>
                          <span className="font-bold text-blue-600">{validatedDetails.vehicleNo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Reserved Slot:</span>
                          <span className="font-bold">{validatedDetails.timeSlot}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Assigned Bay:</span>
                          <span className="font-bold text-emerald-600">{validatedDetails.chargerId}</span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        <CyberButton
                          onClick={() => handleGateAction("IN")}
                          disabled={gateStatus !== "Closed"}
                          variant="primary"
                          className="w-full py-3 text-xs font-bold justify-center"
                        >
                          <FiZap /> Open Entry Barrier (IN)
                        </CyberButton>

                        <CyberButton
                          onClick={() => handleGateAction("OUT")}
                          disabled={gateStatus !== "Closed"}
                          variant="secondary"
                          className="w-full py-3 text-xs font-bold justify-center"
                        >
                          <FiCheckCircle /> Open Exit Barrier (OUT)
                        </CyberButton>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      Scan a license plate or verify a booking ID to activate gate barrier controls.
                    </div>
                  )}
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      );

    case "incidents":
      return (
        <div className="space-y-6 max-w-5xl mx-auto">
          <div className="relative overflow-hidden p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-[#261510] to-[#0A0F1C] border border-rose-500/30 text-white shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="px-3.5 py-1 text-[10px] font-bold tracking-widest text-rose-400 bg-rose-500/10 rounded-full border border-rose-500/20 uppercase">
                  STATION PERIMETER & SECURITY INCIDENTS
                </span>
                <h2 className="text-3xl font-extrabold mt-3 tracking-tight flex items-center gap-3">
                  Security Alerts & Incident Log <FiAlertOctagon className="text-rose-400" />
                </h2>
                <p className="text-slate-300 text-sm mt-1 max-w-xl font-medium">
                  Log unauthorized bay occupancy, tailgating events, or equipment tamper alerts to dispatch site supervisor.
                </p>
              </div>
            </div>
          </div>

          {incLoggedMsg && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-2xl flex items-center gap-2">
              <FiCheckCircle /> Security incident registered and dispatched to Station Supervisor.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-5">
              <GlassCard hover={false} className="p-6 space-y-4">
                <h3 className="font-extrabold text-slate-900 text-sm border-b border-slate-200 pb-3 flex items-center gap-2">
                  <FiAlertTriangle className="text-rose-600" /> Log Security Incident
                </h3>

                <form onSubmit={handleLogIncident} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold uppercase mb-1">Incident Category</label>
                    <select
                      value={newIncType}
                      onChange={(e) => setNewIncType(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900"
                    >
                      <option value="Unauthorized Bay Occupancy">Unauthorized Bay Occupancy (ICEing)</option>
                      <option value="Barrier Arm Obstruction">Barrier Arm Obstruction / Tailgating</option>
                      <option value="Connector Cable Tampering">Connector Cable Tampering Alert</option>
                      <option value="Speeding in Station Lot">Station Lot Speeding / Reckless Drive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold uppercase mb-1">Vehicle License Plate</label>
                    <input
                      type="text"
                      value={newIncPlate}
                      onChange={(e) => setNewIncPlate(e.target.value)}
                      placeholder="e.g. KA 05 EV 1122"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold uppercase mb-1">Station Bay Location</label>
                    <select
                      value={newIncBay}
                      onChange={(e) => setNewIncBay(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900"
                    >
                      <option value="ST001-C01">Bay ST001-C01</option>
                      <option value="ST001-C02">Bay ST001-C02</option>
                      <option value="ST001-C04">Bay ST001-C04</option>
                      <option value="Main Gate Barrier">Main Gate Entry Barrier</option>
                    </select>
                  </div>

                  <CyberButton type="submit" variant="danger" className="w-full py-3 text-xs font-bold justify-center">
                    Dispatch Incident Log
                  </CyberButton>
                </form>
              </GlassCard>
            </div>

            <div className="md:col-span-7">
              <GlassCard hover={false} className="p-6 space-y-4">
                <h3 className="font-extrabold text-slate-900 text-sm border-b border-slate-200 pb-3 flex items-center gap-2">
                  <FiFileText className="text-slate-700" /> Active Security Incidents
                </h3>

                <div className="space-y-3">
                  {incidents.map((inc) => (
                    <div key={inc.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                      <div className="flex justify-between items-center font-mono">
                        <span className="font-bold text-slate-900">{inc.id}</span>
                        <span className="text-slate-500">{inc.time}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-rose-600">{inc.type}</span>
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-[9px] font-bold uppercase">
                          {inc.severity}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-600 font-mono">
                        <span>Plate: <b>{inc.plate}</b></span>
                        <span>Location: <b>{inc.bay}</b></span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      );

    case "logs":
      return (
        <GlassCard hover={false} className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <h3 className="font-bold text-lg flex items-center gap-2 text-slate-900">
              <FiFileText /> Gate Access Audit Trail & Clearance Logs
            </h3>
            <span className="text-xs text-slate-500 font-mono">Recorded entries: {gateLogs.length} events</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-2.5 px-2">Verification Time</th>
                  <th className="py-2.5 px-2">Booking Reference</th>
                  <th className="py-2.5 px-2">Vehicle Plate No</th>
                  <th className="py-2.5 px-2">Action / Gate Direction</th>
                  <th className="py-2.5 px-2">Clearance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {gateLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-2 text-slate-500 flex items-center gap-1">
                      <FiClock size={12} /> {log.time}
                    </td>
                    <td className="py-3 px-2 font-bold text-slate-900">{log.bookingId}</td>
                    <td className="py-3 px-2 text-blue-600 font-bold">{log.plateNo}</td>
                    <td className="py-3 px-2">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          log.direction === "IN"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-sky-100 text-sky-800"
                        }`}
                      >
                        Barrier: {log.direction}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-emerald-600 font-bold">{log.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      );

    default:
      return <SecurityDashboard activeTab="overview" />;
  }
};

export default SecurityDashboard;
