import React, { useState } from "react";
import { useSystemState } from "../contexts/SystemStateContext";
import { useAuth } from "../contexts/AuthContext";
import {
  FiCpu,
  FiCalendar,
  FiCheckSquare,
  FiAlertTriangle,
  FiCheck,
  FiInfo,
  FiActivity,
  FiMapPin,
  FiClock,
  FiSettings,
  FiZap,
  FiShield,
  FiRefreshCw,
  FiBox,
  FiLayers,
  FiRadio,
  FiCheckCircle
} from "react-icons/fi";
import GlassCard from "../components/GlassCard";
import CyberButton from "../components/CyberButton";

const INITIAL_SPARE_PARTS = [
  { id: "PRT-001", name: "Liquid Cooled NACS 250kW Cable", category: "Cable Assembly", stock: 4, location: "Main Warehouse", status: "In Stock" },
  { id: "PRT-002", name: "150kW SiC Inverter Power Module", category: "Electronics", stock: 2, location: "Station ST001 Vault", status: "Low Stock" },
  { id: "PRT-003", name: "RFID Solenoid Lock Pin Subsystem", category: "Mechanical", stock: 8, location: "Main Warehouse", status: "In Stock" },
  { id: "PRT-004", name: "Thermal Coolant Sensor Probe Array", category: "Sensors", stock: 12, location: "Station ST002 Toolroom", status: "In Stock" },
  { id: "PRT-005", name: "Emergency Cutoff Breaker Relay 500A", category: "Electrical", stock: 1, location: "Station ST003 Cabinet", status: "Critical" },
];

const TechnicianDashboard = ({ activeTab }) => {
  const { user } = useAuth();
  const { tickets, updateTicketStatus, stations, liveTime, smartStats } = useSystemState();
  const [selectedTask, setSelectedTask] = useState(null);

  // Diagnostic simulator state
  const [selectedBay, setSelectedBay] = useState("ST001-C01");
  const [testingProgress, setTestingProgress] = useState(null); // null or 0-100
  const [testResults, setTestResults] = useState(null);

  // Spare parts state
  const [spareParts, setSpareParts] = useState(INITIAL_SPARE_PARTS);
  const [requisitionMsg, setRequisitionMsg] = useState(false);

  // Identify technician's assigned tasks (assignedTechId)
  const myTasks = tickets.filter(
    (t) => t.assignedTechId === user?.id || t.assignedTechId === "TECH001" || t.assignedTechId === "TECH0001"
  );
  const activeTasks = myTasks.filter((t) => t.status !== "Completed");

  // MOCK SCHEDULE DATA
  const mockSchedule = [
    { day: "Today", time: "14:30", task: "ST001 Bay C04 cool cycle test", type: "Repairs" },
    { day: "Tomorrow", time: "09:00", task: "ST002 RFID sensor calibration", type: "Inspection" },
    { day: "Aug 10", time: "11:00", task: "ST003 cable mechanical clamp lube", type: "Maintenance" },
    { day: "Aug 12", time: "15:00", task: "ST001 Inverter Firmware Update v4.8", type: "Upgrade" },
  ];

  // Run hardware diagnostic test simulation
  const runDiagnostics = () => {
    setTestingProgress(10);
    setTestResults(null);

    const steps = [25, 50, 75, 100];
    steps.forEach((step, idx) => {
      setTimeout(() => {
        setTestingProgress(step);
        if (step === 100) {
          setTestingProgress(null);
          setTestResults({
            isolationTest: "PASSED (1000V DC OK)",
            coolantPressure: "PASSED (2.4 Bar)",
            solenoidLockPin: "PASSED (0.12s response)",
            emergencyBreaker: "PASSED (Relay Active)",
            efficiencyRating: "98.4% Nominal",
            timestamp: new Date().toLocaleTimeString(),
          });
        }
      }, (idx + 1) * 700);
    });
  };

  const handleRequestPart = (partId) => {
    setSpareParts((prev) =>
      prev.map((p) => (p.id === partId ? { ...p, stock: Math.max(0, p.stock - 1) } : p))
    );
    setRequisitionMsg(true);
    setTimeout(() => setRequisitionMsg(false), 3500);
  };

  switch (activeTab) {
    case "overview":
      return (
        <div className="space-y-6">
          {/* Header Panel */}
          <div className="relative overflow-hidden p-8 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3.5 py-1 text-[10px] font-extrabold tracking-widest text-sky-400 bg-sky-500/10 rounded-full border border-sky-500/20 uppercase">
                    FIELD TECHNICIAN TERMINAL // ID: TECH001
                  </span>
                  <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> {liveTime}
                  </span>
                </div>
                <h2 className="text-3xl font-black tracking-tight">
                  Dave's Work Order Console
                </h2>
                <p className="text-slate-400 text-sm mt-1 max-w-xl font-medium">
                  Assigned hardware maintenance, diagnostic telemetry readings, and component stock controls.
                </p>
              </div>

              <div className="flex gap-4">
                <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-2xl text-center min-w-[130px]">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Active Tasks</span>
                  <span className="text-2xl font-black font-mono text-sky-400">{activeTasks.length} Pending</span>
                </div>
                <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-2xl text-center min-w-[130px]">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Telemetry Voltage</span>
                  <span className="text-2xl font-black font-mono text-emerald-400">{smartStats.gridVoltage || 480.2}V</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <GlassCard hover={false} className="flex items-center gap-4 border border-slate-200 p-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <FiCpu size={22} />
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-bold uppercase tracking-wider">Work Orders</span>
                <span className="text-lg font-black font-mono text-slate-900">{myTasks.length} Total</span>
              </div>
            </GlassCard>

            <GlassCard hover={false} className="flex items-center gap-4 border border-slate-200 p-5">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0">
                <FiActivity size={22} />
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-bold uppercase tracking-wider">In Progress</span>
                <span className="text-lg font-black font-mono text-slate-900">
                  {myTasks.filter(t => t.status === "In Progress").length} Tasks
                </span>
              </div>
            </GlassCard>

            <GlassCard hover={false} className="flex items-center gap-4 border border-slate-200 p-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                <FiCheckSquare size={22} />
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-bold uppercase tracking-wider">Resolved</span>
                <span className="text-lg font-black font-mono text-slate-900">
                  {myTasks.filter(t => t.status === "Completed").length} Done
                </span>
              </div>
            </GlassCard>

            <GlassCard hover={false} className="flex items-center gap-4 border border-slate-200 p-5">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
                <FiBox size={22} />
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-bold uppercase tracking-wider">Spare Parts</span>
                <span className="text-lg font-black font-mono text-slate-900">{spareParts.length} Categories</span>
              </div>
            </GlassCard>
          </div>

          {/* Assigned Work Orders & Task detail drawer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <GlassCard hover={false} className="space-y-4 border border-slate-200 p-6">
                <h3 className="font-extrabold text-lg text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
                  <FiCpu className="text-blue-600" /> Assigned Repair & Maintenance Orders
                </h3>

                <div className="space-y-3">
                  {myTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTask(t)}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                        selectedTask?.id === t.id
                          ? "bg-blue-50 border-blue-400 shadow-md"
                          : "bg-white border-slate-200/90 hover:bg-slate-50 shadow-2xs"
                      }`}
                    >
                      <div className="flex justify-between items-start text-xs font-mono">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">{t.id} // {t.stationName}</span>
                          <p className="text-xs font-sans font-semibold text-slate-500 mt-1">Bay: {t.chargerId.split("-")[1]}</p>
                        </div>
                        <div className="flex gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                              t.severity === "High"
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : t.severity === "Medium"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {t.severity}
                          </span>
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                              t.status === "Completed"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-sky-100 text-sky-800 border border-sky-200"
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-slate-800 mt-3 line-clamp-2">{t.issue}</p>
                    </div>
                  ))}
                  {myTasks.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-6 font-medium">
                      No hardware work orders assigned at this time.
                    </p>
                  )}
                </div>
              </GlassCard>
            </div>

            <div className="lg:col-span-5">
              <GlassCard hover={false} className="h-full flex flex-col justify-between border border-slate-200 p-6">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 border-b border-slate-200 pb-3 mb-4 flex items-center gap-2">
                    <FiSettings className="text-blue-600" /> Work Order Inspector
                  </h3>

                  {selectedTask ? (
                    <div className="space-y-4 text-xs">
                      <div>
                        <span className="text-slate-500 block uppercase font-bold tracking-wider text-[10px]">
                          Target Hardware Unit
                        </span>
                        <span className="text-sm font-extrabold text-slate-900 font-mono">
                          {selectedTask.stationName} ({selectedTask.chargerId.split("-")[1]})
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-500 block uppercase font-bold tracking-wider text-[10px]">
                          Issue Details
                        </span>
                        <p className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-800 text-sm font-medium leading-relaxed mt-1">
                          {selectedTask.issue}
                        </p>
                      </div>

                      <div className="pt-2 flex gap-2">
                        {selectedTask.status === "Assigned" && (
                          <CyberButton
                            onClick={() => {
                              updateTicketStatus(selectedTask.id, "In Progress");
                              setSelectedTask((prev) => ({ ...prev, status: "In Progress" }));
                            }}
                            variant="secondary"
                            className="w-full py-2.5 justify-center font-bold"
                          >
                            Mark: In Progress
                          </CyberButton>
                        )}
                        {selectedTask.status === "In Progress" && (
                          <CyberButton
                            onClick={() => {
                              updateTicketStatus(selectedTask.id, "Completed");
                              setSelectedTask((prev) => ({ ...prev, status: "Completed" }));
                            }}
                            variant="primary"
                            className="w-full py-2.5 justify-center font-bold"
                          >
                            Mark: Completed
                          </CyberButton>
                        )}
                        {selectedTask.status === "Completed" && (
                          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-800 font-extrabold text-center w-full flex items-center justify-center gap-1.5">
                            <FiCheck /> Repair Order Completed
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-500 text-xs font-medium">
                      Select a work order from the ledger to calibrate settings, update diagnostic statuses, or sign-off.
                    </div>
                  )}
                </div>

                <div className="bg-blue-50/80 p-4 border border-blue-200 rounded-2xl text-xs text-slate-700 flex gap-2.5 items-start mt-6 font-medium">
                  <FiInfo className="text-blue-600 shrink-0 mt-0.5 w-4 h-4" />
                  <span>
                    Completing a work order immediately restores the charger hardware state to <b>Available</b> in the client grid maps.
                  </span>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      );

    case "diagnostics":
      return (
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Header Panel */}
          <div className="relative overflow-hidden p-8 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="px-3.5 py-1 text-[10px] font-extrabold tracking-widest text-sky-400 bg-sky-500/10 rounded-full border border-sky-500/20 uppercase">
                  LIVE HARDWARE TELEMETRY & DIAGNOSTICS SUITE
                </span>
                <h2 className="text-3xl font-black mt-3 tracking-tight flex items-center gap-3">
                  Charger Bay Diagnostics <FiActivity className="text-sky-400" />
                </h2>
                <p className="text-slate-300 text-sm mt-1 max-w-xl font-medium">
                  Run remote high-voltage telemetry tests, inspect liquid coolant loop pressures, and test solenoid pin locks across station bays.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedBay}
                  onChange={(e) => setSelectedBay(e.target.value)}
                  className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono font-bold text-sky-400 focus:outline-none cursor-pointer"
                >
                  <option value="ST001-C01">Bay ST001-C01 (NACS 250kW)</option>
                  <option value="ST001-C02">Bay ST001-C02 (CCS2 150kW)</option>
                  <option value="ST001-C03">Bay ST001-C03 (CCS2 150kW)</option>
                  <option value="ST002-C01">Bay ST002-C01 (NACS 250kW)</option>
                  <option value="ST003-C01">Bay ST003-C01 (NACS 250kW)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard hover={false} className="p-6 space-y-4 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Thermal Sensor Probe
              </span>
              <h4 className="text-3xl font-black font-mono text-slate-900">38.4 °C</h4>
              <p className="text-xs text-slate-600 font-medium">Liquid Coolant In-line loop reading nominal</p>
            </GlassCard>

            <GlassCard hover={false} className="p-6 space-y-4 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                DC Voltage Ingestion
              </span>
              <h4 className="text-3xl font-black font-mono text-blue-600">480.2 V</h4>
              <p className="text-xs text-slate-600 font-medium">High voltage isolation test benchmark active</p>
            </GlassCard>

            <GlassCard hover={false} className="p-6 space-y-4 border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Diagnostic Action
                </span>
                <p className="text-xs text-slate-600 mt-1 font-medium">Initiate telemetry sweep across bay switches.</p>
              </div>
              <CyberButton
                onClick={runDiagnostics}
                disabled={testingProgress !== null}
                variant="primary"
                className="w-full py-3 text-xs font-bold justify-center"
              >
                {testingProgress !== null ? (
                  <span className="flex items-center gap-2">
                    <FiRefreshCw className="animate-spin" /> Diagnostic Progress ({testingProgress}%)
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <FiZap /> Run Hardware Diagnostic Routine
                  </span>
                )}
              </CyberButton>
            </GlassCard>
          </div>

          {/* Test Results Console */}
          {testResults && (
            <GlassCard hover={false} className="p-6 space-y-4 border border-emerald-300 bg-emerald-50/50 text-slate-900">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
                <h4 className="font-extrabold text-base text-emerald-800 flex items-center gap-2">
                  <FiCheckCircle /> Diagnostic Routine Complete ({selectedBay})
                </h4>
                <span className="text-xs font-mono font-bold text-emerald-700">{testResults.timestamp}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                <div className="p-3.5 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                  <span className="text-slate-500 text-[10px] block font-bold uppercase">HV Isolation Test</span>
                  <span className="text-emerald-700 font-bold mt-1 block">{testResults.isolationTest}</span>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                  <span className="text-slate-500 text-[10px] block font-bold uppercase">Coolant Pressure</span>
                  <span className="text-emerald-700 font-bold mt-1 block">{testResults.coolantPressure}</span>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                  <span className="text-slate-500 text-[10px] block font-bold uppercase">Solenoid Lock Pin</span>
                  <span className="text-emerald-700 font-bold mt-1 block">{testResults.solenoidLockPin}</span>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      );

    case "inventory":
      return (
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Header Panel */}
          <div className="relative overflow-hidden p-8 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="px-3.5 py-1 text-[10px] font-extrabold tracking-widest text-sky-400 bg-sky-500/10 rounded-full border border-sky-500/20 uppercase">
                  HARDWARE INVENTORY & SPARE PARTS MANAGEMENT
                </span>
                <h2 className="text-3xl font-black mt-3 tracking-tight flex items-center gap-3">
                  Field Parts Ledger <FiBox className="text-sky-400" />
                </h2>
                <p className="text-slate-300 text-sm mt-1 max-w-xl font-medium">
                  Track spare components in stock, dispatch replacement liquid-cooled cables, and log warehouse requisitions.
                </p>
              </div>

              {requisitionMsg && (
                <div className="bg-emerald-500/20 border border-emerald-400 p-3 rounded-2xl text-xs font-extrabold text-emerald-300">
                  Requisition order logged for warehouse dispatch!
                </div>
              )}
            </div>
          </div>

          <GlassCard hover={false} className="space-y-4 border border-slate-200 p-6">
            <h3 className="font-extrabold text-lg text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
              <FiLayers className="text-blue-600" /> Active Component Inventory Stock
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider">
                    <th className="py-3 px-3 rounded-l-xl">Part ID</th>
                    <th className="py-3 px-3">Component Name</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Stock Units</th>
                    <th className="py-3 px-3">Warehouse Location</th>
                    <th className="py-3 px-3 text-right rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-900 font-medium">
                  {spareParts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-3 font-mono font-bold text-blue-600">{p.id}</td>
                      <td className="py-4 px-3 font-bold text-slate-900">{p.name}</td>
                      <td className="py-4 px-3 font-mono text-xs text-slate-700">{p.category}</td>
                      <td className="py-4 px-3 font-mono font-bold text-slate-900">{p.stock} units</td>
                      <td className="py-4 px-3 text-xs text-slate-600">{p.location}</td>
                      <td className="py-4 px-3 text-right">
                        <button
                          onClick={() => handleRequestPart(p.id)}
                          className="px-3 py-1.5 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-xs font-bold transition cursor-pointer shadow-xs"
                        >
                          Requisition 1x
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      );

    default:
      return <TechnicianDashboard activeTab="overview" />;
  }
};

export default TechnicianDashboard;
