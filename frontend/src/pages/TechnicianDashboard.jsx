import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import {
  Wrench,
  Cpu,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Shield,
  Radio,
  Box,
  FileText,
  Search,
  Check,
  MapPin,
  Flame,
  ArrowRight,
  Power,
  Building2,
  Plus,
  X,
  UserCheck,
  Phone,
  Mail,
  Award,
  CalendarCheck,
  TrendingUp,
  FileCheck2,
  QrCode,
  Wifi,
  SlidersHorizontal,
  ChevronRight,
  Terminal,
  ShieldAlert,
  Sparkles,
  History,
  Bell,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { useSystemState } from "../contexts/SystemStateContext";
import { technicianService } from "../services/technicianService";
import Toast from "../components/Toast";
import TechnicianSidebar from "../components/TechnicianSidebar";
import TechnicianNavbar from "../components/TechnicianNavbar";

// Common EV Fault Types
const COMMON_FAULT_TYPES = [
  "Connector Fault",
  "Charging Failure",
  "Overheating",
  "Voltage Error",
  "Current Error",
  "Communication Error",
  "Payment Terminal Error",
  "Display Error",
  "Emergency Stop Activated",
  "Network Failure",
  "Power Supply Failure",
  "Unknown Fault",
];

// Maintenance Types
const MAINTENANCE_TYPES = [
  "Preventive Maintenance",
  "Corrective Maintenance",
  "Electrical Safety Inspection",
  "Connector & Cable Inspection",
  "Cooling System & Pressure Check",
  "Software/Firmware Check",
  "Earthing & Protection Devices Test",
  "Calibration & Load Testing",
];

// 9-Stage Work Order Status Workflow
const WORK_ORDER_STAGES = [
  "ASSIGNED",
  "ACCEPTED",
  "TRAVELING",
  "ON_SITE",
  "DIAGNOSING",
  "REPAIRING",
  "TESTING",
  "COMPLETED",
  "CANCELLED",
];

// 10-Stage Repair Pipeline
const REPAIR_STAGES = [
  "REPORTED",
  "ASSIGNED",
  "ACCEPTED",
  "INSPECTION",
  "DIAGNOSIS",
  "REPAIR STARTED",
  "REPAIR COMPLETED",
  "TESTING",
  "STATION RESTORED",
  "FAULT CLOSED",
];

// 11-Point Preventive Maintenance Checklist
const INITIAL_CHECKLIST = [
  { id: "chk_1", item: "Inspect charging cable for cuts, wear, or thermal degradation", status: "PASS", remarks: "Cables intact and insulation resistance tested normal" },
  { id: "chk_2", item: "Inspect connector pins, rubber boot, and latch solenoid lock", status: "PASS", remarks: "Lock pin lubricated and engages securely" },
  { id: "chk_3", item: "Inspect enclosure housing, weather seals, and IP rating seals", status: "PASS", remarks: "No ingress or structural seal deterioration" },
  { id: "chk_4", item: "Check electrical connections, busbar torque, and terminal tightness", status: "PASS", remarks: "Torqued to manufacturer specification (35 Nm)" },
  { id: "chk_5", item: "Check earth loop impedance and ground fault protection (RCD/GFCI)", status: "PASS", remarks: "Earth loop resistance measured < 1.2 ohms" },
  { id: "chk_6", item: "Check surge protection devices (SPD) and DC isolation monitoring", status: "PASS", remarks: "Isolation resistance verified at 920 MΩ (> 500 kΩ threshold)" },
  { id: "chk_7", item: "Check LCD display, touch interface, and RFID / NFC reader operation", status: "PASS", remarks: "Display responsiveness and RFID scan instantaneous" },
  { id: "chk_8", item: "Check liquid cooling loop fluid levels, radiator fan, and pressure", status: "PASS", remarks: "Coolant pressure nominal at 2.4 bar; fan runs smoothly" },
  { id: "chk_9", item: "Check emergency stop button mechanical latch and circuit trip switch", status: "PASS", remarks: "NC contact block tested; cuts HV contactor in 18ms" },
  { id: "chk_10", item: "Check OCPP 2.0.1 communication, LTE/Ethernet fallback, and heartbeat", status: "PASS", remarks: "Heartbeat sync verified with central management server" },
  { id: "chk_11", item: "Perform live test charging session under dynamic load (150kW test)", status: "PASS", remarks: "Delivered 120A continuous without thermal throttling" },
];

export default function TechnicianDashboard({ defaultTab }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { liveTime } = useSystemState();

  // Resolve active tab from URL path or param
  const getTabFromPath = () => {
    const path = location.pathname;
    if (path.includes("/technician/stations")) return "stations";
    if (path.includes("/technician/work-orders") || path.includes("/technician/tasks")) return "work-orders";
    if (path.includes("/technician/faults")) return "faults";
    if (path.includes("/technician/maintenance")) return "maintenance";
    if (path.includes("/technician/corrective-maintenance")) return "corrective-maintenance";
    if (path.includes("/technician/emergency")) return "emergency";
    if (path.includes("/technician/charger-health")) return "charger-health";
    if (path.includes("/technician/network")) return "network";
    if (path.includes("/technician/spare-parts")) return "spare-parts";
    if (path.includes("/technician/service-reports")) return "service-reports";
    if (path.includes("/technician/work-history")) return "work-history";
    if (path.includes("/technician/notifications")) return "notifications";
    if (path.includes("/technician/profile")) return "profile";
    return defaultTab || searchParams.get("tab") || "overview";
  };

  const [activeTab, setActiveTab] = useState(getTabFromPath());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState("AVAILABLE");

  // Live state
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState({ message: "", type: "info" });

  // Dashboard Stats
  const [dashboardStats, setDashboardStats] = useState({
    assignedStations: 3,
    activeTasks: 3,
    activeWorkOrders: 3,
    pendingRepairs: 3,
    criticalFaults: 1,
    completedRepairs: 4,
    stationsOnline: 2,
    stationsOffline: 1,
    scheduledMaintenance: 4,
    preventiveDue: 4,
  });

  // Data Collections
  const [stations, setStations] = useState([]);
  const [workOrders, setWorkOrders] = useState([
    {
      id: 1,
      work_order_id: "WO1024",
      station_id: 1,
      station_name: "EV Power Hub Chennai Central",
      slot_id: 1,
      port_id: "PORT01",
      bay_name: "Bay 01 (CCS2 150kW)",
      problem: "Charging Failure & Connector Solenoid Stuck",
      description: "Connector solenoid lock pin stuck during uncoupling. Temperature sensor reading 48°C intermittent.",
      priority: "HIGH",
      status: "IN PROGRESS",
      assigned_technician_id: "TECH0001",
      assigned_technician_name: "Dave Wilson",
      created_time: "Today, 08:30 AM",
      diagnosis: "Actuator coil drawing high inrush current; guide sleeve needs lubrication and microswitch realignment.",
    },
    {
      id: 2,
      work_order_id: "WO1025",
      station_id: 1,
      station_name: "EV Power Hub Chennai Central",
      slot_id: 4,
      port_id: "PORT04",
      bay_name: "Bay 04 (Type 2 AC 22kW)",
      problem: "Overheating & Thermal Tripping",
      description: "Coolant temperature exceeded 52°C threshold. Internal thermal protection breaker tripped.",
      priority: "CRITICAL",
      status: "ON_SITE",
      assigned_technician_id: "TECH0001",
      assigned_technician_name: "Dave Wilson",
      created_time: "Today, 09:15 AM",
      diagnosis: "Radiator cooling fan circuit relay intermittent. Coolant level low.",
    },
    {
      id: 3,
      work_order_id: "WO1026",
      station_id: 2,
      station_name: "ExpressWay Charge Plaza Guindy",
      slot_id: 5,
      port_id: "PORT01",
      bay_name: "Bay 01 (CHAdeMO 60kW)",
      problem: "Communication Error & RFID Reader Sync",
      description: "RFID card reader timeout and CAN-bus packet drop during session initialization.",
      priority: "MEDIUM",
      status: "ASSIGNED",
      assigned_technician_id: "TECH0001",
      assigned_technician_name: "Dave Wilson",
      created_time: "Yesterday, 04:20 PM",
      diagnosis: "Awaiting field arrival for firmware reflash.",
    },
  ]);

  const [faults, setFaults] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [serviceReports, setServiceReports] = useState([
    {
      id: 1,
      report_id: "SR-1021",
      work_order_id: "WO1019",
      technician_id: "TECH0001",
      technician_name: "Dave Wilson",
      station_id: 3,
      station_name: "Apex HyperFast Station Madurai",
      port_id: "PORT02",
      problem: "SiC Inverter Phase-B thermal gate driver degradation under 120kW DC load",
      diagnosis: "Gate driver optocoupler degraded with excessive voltage ripple.",
      repair_performed: "Replaced inverter phase-B module, applied thermal interface paste, ran 120kW load test.",
      parts_used: [{ partId: "PRT-002", name: "150kW SiC Inverter Power Module", qty: 1 }],
      electrical_test: "PASS",
      communication_test: "PASS",
      charging_test: "PASS",
      safety_test: "PASS",
      start_time: "2026-09-28 10:00 AM",
      end_time: "2026-09-28 01:30 PM",
      remarks: "Isolation resistance verified at 850MΩ. 45-minute continuous load test passed.",
      station_final_status: "AVAILABLE",
    },
  ]);

  const [spareParts, setSpareParts] = useState([]);
  const [workHistory, setWorkHistory] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [networkInfo, setNetworkInfo] = useState({
    internetStatus: "CONNECTED",
    connectionType: "Gigabit Ethernet + 4G LTE Backup",
    signalStrength: "98% (-54 dBm)",
    backendStatus: "ONLINE",
    ocppStatus: "CONNECTED",
    ocppVersion: "OCPP 2.0.1",
    lastHeartbeat: "16:42:11",
    firmwareVersion: "v2.4.1-STN-PRO",
    ipAddress: "192.168.1.120",
    packetLoss: "0.02%",
    latencyMs: 14,
  });

  const [profile, setProfile] = useState({
    counterId: "TECH0001",
    name: "Dave Wilson",
    email: "tech@evcharge.com",
    phone: "+91 98401 23456",
    specialization: "DC Ultra-Fast & High Voltage Charger Diagnostics",
    skills: [
      "DC Fast Charger",
      "AC Charger",
      "Electrical Systems",
      "EVSE Hardware",
      "OCPP",
      "Preventive Maintenance",
      "Corrective Maintenance",
      "Commissioning",
    ],
    experienceYears: 6,
    certification: "Level 3 Master EVSE High Voltage Specialist & Siemens Certified",
    assignedStation: "EV Power Hub Chennai Central",
    assignedRegion: "Chennai Central Metropolitan District",
    status: "AVAILABLE",
    joiningDate: "2024-03-15",
  });

  // Telemetry state for hardware monitoring
  const [telemetry, setTelemetry] = useState([
    {
      bayId: "STA001-C01",
      name: "Bay 01 (CCS2 150kW)",
      stationName: "EV Power Hub Chennai Central",
      voltage: 482.4,
      current: 185.0,
      powerOutput: 89.2,
      temp: 34.2,
      energyDelivered: 412.8,
      connectorStatus: "Connected",
      networkConnectivity: "Online (4G LTE)",
      emergencyStop: "NORMAL",
      faultStatus: "None",
      isolation: 920,
      coolantPress: 2.4,
      status: "Active",
      heartbeat: "16:42:11",
      firmware: "v2.4.1",
    },
    {
      bayId: "STA001-C02",
      name: "Bay 02 (CCS2 150kW)",
      stationName: "EV Power Hub Chennai Central",
      voltage: 480.1,
      current: 0.0,
      powerOutput: 0.0,
      temp: 28.5,
      energyDelivered: 298.5,
      connectorStatus: "Available",
      networkConnectivity: "Online (Fiber)",
      emergencyStop: "NORMAL",
      faultStatus: "None",
      isolation: 950,
      coolantPress: 2.5,
      status: "Idle",
      heartbeat: "16:42:15",
      firmware: "v2.4.1",
    },
    {
      bayId: "STA001-C03",
      name: "Bay 03 (CHAdeMO 60kW)",
      stationName: "EV Power Hub Chennai Central",
      voltage: 481.0,
      current: 75.2,
      powerOutput: 36.2,
      temp: 36.8,
      energyDelivered: 184.2,
      connectorStatus: "Connected",
      networkConnectivity: "Online (4G LTE)",
      emergencyStop: "NORMAL",
      faultStatus: "None",
      isolation: 890,
      coolantPress: 2.3,
      status: "Active",
      heartbeat: "16:42:08",
      firmware: "v2.4.1",
    },
    {
      bayId: "STA001-C04",
      name: "Bay 04 (Type 2 AC 22kW)",
      stationName: "EV Power Hub Chennai Central",
      voltage: 400.2,
      current: 0.0,
      powerOutput: 0.0,
      temp: 52.4,
      energyDelivered: 95.0,
      connectorStatus: "Unavailable",
      networkConnectivity: "Degraded",
      emergencyStop: "TRIPPED",
      faultStatus: "Thermal Overheat (52.4°C)",
      isolation: 610,
      coolantPress: 1.8,
      status: "Maintenance",
      heartbeat: "16:41:50",
      firmware: "v2.4.1",
    },
  ]);

  // Preventive Checklist State
  const [checklist, setChecklist] = useState(INITIAL_CHECKLIST);
  const [checklistRemarks, setChecklistRemarks] = useState("");

  // Modals & Selected items
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [selectedFault, setSelectedFault] = useState(null);
  const [showReportFaultModal, setShowReportFaultModal] = useState(false);
  const [showNewWorkOrderModal, setShowNewWorkOrderModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showServiceReportModal, setShowServiceReportModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrInputCode, setQrInputCode] = useState("");
  const [qrLookupResult, setQrLookupResult] = useState(null);

  // Forms
  const [newWorkOrderForm, setNewWorkOrderForm] = useState({
    stationId: 1,
    stationName: "EV Power Hub Chennai Central",
    slotId: 1,
    portId: "PORT01",
    bayName: "Bay 01 (CCS2 150kW)",
    problem: "",
    description: "",
    priority: "HIGH",
  });

  const [newFaultForm, setNewFaultForm] = useState({
    stationId: 1,
    stationName: "EV Power Hub Chennai Central",
    slotId: 4,
    portId: "PORT04",
    bayName: "Bay 04 (Type 2 AC)",
    faultType: "Overheating",
    description: "",
    priority: "CRITICAL",
    reportedBy: "Field Inspection",
  });

  const [newScheduleForm, setNewScheduleForm] = useState({
    stationId: 1,
    stationName: "EV Power Hub Chennai Central",
    maintenanceType: "Preventive Maintenance",
    scheduledDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
    scheduledTime: "10:00 AM",
    priority: "MEDIUM",
    notes: "",
  });

  const [serviceReportForm, setServiceReportForm] = useState({
    workOrderId: "WO1024",
    stationId: 1,
    stationName: "EV Power Hub Chennai Central",
    portId: "PORT01",
    problem: "Charging Failure & Connector Solenoid Stuck",
    diagnosis: "Actuator coil inrush current high; guide sleeve lubricated.",
    repairPerformed: "Replaced solenoid actuator switch and lubricated connector latch.",
    partsUsed: [{ partId: "PRT-003", name: "RFID Solenoid Lock Pin Subsystem", qty: 1 }],
    electricalTest: "PASS",
    communicationTest: "PASS",
    chargingTest: "PASS",
    safetyTest: "PASS",
    startTime: "09:00 AM",
    endTime: "11:30 AM",
    remarks: "Full 150kW charging cycle verified under load. Ready for service.",
  });

  // Filters
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("All");
  const [taskStatusFilter, setTaskStatusFilter] = useState("All");
  const [historySearch, setHistorySearch] = useState("");
  const [historyPriorityFilter, setHistoryPriorityFilter] = useState("All");

  // Sync tab with URL
  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname, searchParams]);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  // Load Initial Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [dashRes, stRes, woRes, fltRes, schRes, srepRes, partRes, histRes, notifRes, confRes, profRes, netRes] =
        await Promise.allSettled([
          technicianService.getDashboard(),
          technicianService.getStations(),
          technicianService.getWorkOrders(),
          technicianService.getFaults(),
          technicianService.getSchedules(),
          technicianService.getServiceReports(),
          technicianService.getSpareParts(),
          technicianService.getWorkHistory(),
          technicianService.getNotifications(),
          technicianService.getConflicts(),
          technicianService.getProfile(),
          technicianService.getNetworkDiagnostics(),
        ]);

      if (dashRes.status === "fulfilled" && dashRes.value?.success) {
        setDashboardStats((prev) => ({ ...prev, ...dashRes.value.data.stats }));
        if (dashRes.value.data.telemetry?.length) {
          setTelemetry(dashRes.value.data.telemetry);
        }
      }

      if (stRes.status === "fulfilled" && stRes.value?.data?.length) {
        setStations(stRes.value.data);
      }

      if (woRes.status === "fulfilled" && woRes.value?.data?.length) {
        setWorkOrders(woRes.value.data);
      }

      if (fltRes.status === "fulfilled" && fltRes.value?.data?.length) {
        setFaults(fltRes.value.data);
      }

      if (schRes.status === "fulfilled" && schRes.value?.data?.length) {
        setSchedules(schRes.value.data);
      }

      if (srepRes.status === "fulfilled" && srepRes.value?.data?.length) {
        setServiceReports(srepRes.value.data);
      }

      if (partRes.status === "fulfilled" && partRes.value?.data?.length) {
        setSpareParts(partRes.value.data);
      }

      if (histRes.status === "fulfilled" && histRes.value?.data?.length) {
        setWorkHistory(histRes.value.data);
      }

      if (notifRes.status === "fulfilled" && notifRes.value?.data?.length) {
        setNotifications(notifRes.value.data);
      }

      if (confRes.status === "fulfilled" && confRes.value?.data?.length) {
        setConflicts(confRes.value.data);
      }

      if (profRes.status === "fulfilled" && profRes.value?.data) {
        setProfile((prev) => ({ ...prev, ...profRes.value.data }));
        if (profRes.value.data.status) {
          setAvailabilityStatus(profRes.value.data.status);
        }
      }

      if (netRes.status === "fulfilled" && netRes.value?.data) {
        setNetworkInfo((prev) => ({ ...prev, ...netRes.value.data }));
      }
    } catch (err) {
      console.warn("Technician dashboard load error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      setTelemetry((prev) =>
        prev.map((t) => {
          if (t.status === "Active") {
            const jitterV = +(t.voltage + (Math.random() * 2 - 1)).toFixed(1);
            const jitterA = +(t.current + (Math.random() * 4 - 2)).toFixed(1);
            const jitterP = +((jitterV * jitterA) / 1000).toFixed(1);
            const jitterT = +(t.temp + (Math.random() * 0.4 - 0.2)).toFixed(1);
            return { ...t, voltage: jitterV, current: jitterA, powerOutput: jitterP, temp: jitterT };
          }
          return t;
        })
      );
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Update Availability Status
  const handleUpdateAvailability = async (newStatus) => {
    setAvailabilityStatus(newStatus);
    await technicianService.updateAvailability(newStatus);
    setToast({
      message: `Technician availability status set to: ${newStatus}`,
      type: "success",
    });
  };

  // Mark notification read
  const handleMarkNotifRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    await technicianService.markNotificationRead(id);
  };

  // Advance Work Order Status (9-Stage Workflow)
  const handleAdvanceWorkOrder = async (order, nextStatus, diagnosis = "", resolution = "") => {
    try {
      await technicianService.updateWorkOrder(order.id || order.work_order_id, {
        status: nextStatus,
        diagnosis: diagnosis || order.diagnosis,
        resolution: resolution || order.resolution,
      });

      setWorkOrders((prev) =>
        prev.map((w) =>
          w.id === order.id || w.work_order_id === order.work_order_id
            ? { ...w, status: nextStatus, diagnosis: diagnosis || w.diagnosis, resolution: resolution || w.resolution }
            : w
        )
      );

      // If completed, prompt for Service Report and restore port
      if (nextStatus === "COMPLETED") {
        setServiceReportForm((prev) => ({
          ...prev,
          workOrderId: order.work_order_id || `WO-${order.id}`,
          stationId: order.station_id || 1,
          stationName: order.station_name || "EV Power Hub Chennai Central",
          portId: order.port_id || "PORT01",
          problem: order.problem || order.issue_title,
          diagnosis: diagnosis || order.diagnosis || "Diagnosis verified",
          repairPerformed: resolution || "Component replacement and testing completed",
        }));
        setShowServiceReportModal(true);

        // Restore affected telemetry bay
        setTelemetry((prev) =>
          prev.map((t) =>
            t.bayId === "STA001-C04"
              ? { ...t, status: "Idle", emergencyStop: "NORMAL", faultStatus: "None", temp: 30.5 }
              : t
          )
        );

        setDashboardStats((prev) => ({
          ...prev,
          activeWorkOrders: Math.max(0, prev.activeWorkOrders - 1),
          completedRepairs: prev.completedRepairs + 1,
        }));
      }

      setToast({ message: `Work Order ${order.work_order_id} advanced to: ${nextStatus}`, type: "success" });
      setSelectedWorkOrder(null);
    } catch (err) {
      setToast({ message: "Failed to update work order status.", type: "error" });
    }
  };

  // Advance Fault Repair Stage
  const handleAdvanceFaultStage = async (fault, nextStage, diagnosis = "", resolution = "") => {
    try {
      await technicianService.updateFaultStage(fault.id || fault.fault_id, {
        status: nextStage,
        diagnosis: diagnosis || fault.diagnosis,
        resolution: resolution || fault.resolution,
      });

      setFaults((prev) =>
        prev.map((f) =>
          f.id === fault.id || f.fault_id === fault.fault_id
            ? { ...f, status: nextStage, diagnosis: diagnosis || f.diagnosis, resolution: resolution || f.resolution }
            : f
        )
      );

      if (nextStage === "STATION RESTORED" || nextStage === "FAULT CLOSED") {
        setTelemetry((prev) =>
          prev.map((t) =>
            t.bayId === "STA001-C04"
              ? { ...t, status: "Idle", emergencyStop: "NORMAL", faultStatus: "None", temp: 29.8 }
              : t
          )
        );
      }

      setToast({ message: `Fault ${fault.fault_id || fault.id} advanced to: ${nextStage}`, type: "success" });
      setSelectedFault(null);
    } catch (err) {
      setToast({ message: "Failed to update fault stage.", type: "error" });
    }
  };

  // Submit Work Order
  const handleCreateWorkOrderSubmit = async (e) => {
    e.preventDefault();
    if (!newWorkOrderForm.problem.trim()) return;

    try {
      const res = await technicianService.createWorkOrder(newWorkOrderForm);
      const newWo = {
        id: Date.now(),
        work_order_id: res.workOrderId || `WO${Math.floor(1000 + Math.random() * 9000)}`,
        ...newWorkOrderForm,
        status: "ASSIGNED",
        assigned_technician_id: "TECH0001",
        assigned_technician_name: "Dave Wilson",
        created_time: "Just now",
      };

      setWorkOrders((prev) => [newWo, ...prev]);
      setDashboardStats((prev) => ({ ...prev, activeWorkOrders: prev.activeWorkOrders + 1 }));
      setShowNewWorkOrderModal(false);
      setToast({ message: "Work Order created. Station port marked MAINTENANCE.", type: "success" });
    } catch (err) {
      setToast({ message: "Failed to create work order.", type: "error" });
    }
  };

  // Submit Fault Report
  const handleReportFaultSubmit = async (e) => {
    e.preventDefault();
    if (!newFaultForm.faultType) return;

    try {
      const res = await technicianService.reportFault(newFaultForm);
      const newFlt = {
        id: Date.now(),
        fault_id: res.faultId || `FLT-${Date.now().toString().slice(-6)}`,
        ...newFaultForm,
        reported_time: "Just now",
        assigned_tech_id: "TECH0001",
        status: "REPORTED",
      };

      setFaults((prev) => [newFlt, ...prev]);
      setDashboardStats((prev) => ({ ...prev, pendingRepairs: prev.pendingRepairs + 1 }));

      setTelemetry((prev) =>
        prev.map((t) =>
          t.bayId === "STA001-C04"
            ? { ...t, status: "Maintenance", faultStatus: newFaultForm.faultType, emergencyStop: "TRIPPED" }
            : t
        )
      );

      setShowReportFaultModal(false);
      setToast({
        message: "Fault reported. Associated charger port set to MAINTENANCE state.",
        type: "success",
      });
    } catch (err) {
      setToast({ message: "Failed to report fault.", type: "error" });
    }
  };

  // Submit Preventive Maintenance Schedule
  const handleCreateScheduleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await technicianService.createSchedule(newScheduleForm);
      const newSch = {
        id: Date.now(),
        schedule_id: res.scheduleId || `SCH-${Date.now().toString().slice(-4)}`,
        ...newScheduleForm,
        assigned_tech_name: "Dave Wilson",
        status: "SCHEDULED",
      };

      setSchedules((prev) => [...prev, newSch]);
      setDashboardStats((prev) => ({ ...prev, scheduledMaintenance: prev.scheduledMaintenance + 1 }));
      setShowScheduleModal(false);
      setToast({ message: "Preventive maintenance task scheduled successfully.", type: "success" });
    } catch (err) {
      setToast({ message: "Failed to create schedule.", type: "error" });
    }
  };

  // Submit Service Report
  const handleCreateServiceReportSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await technicianService.createServiceReport(serviceReportForm);
      const newRep = {
        id: Date.now(),
        report_id: res.reportId || `SR-${Math.floor(1000 + Math.random() * 9000)}`,
        ...serviceReportForm,
      };

      setServiceReports((prev) => [newRep, ...prev]);
      setShowServiceReportModal(false);
      setToast({ message: "Service Report signed and archived. Station marked AVAILABLE.", type: "success" });
    } catch (err) {
      setToast({ message: "Failed to create service report.", type: "error" });
    }
  };

  // Consume Spare Part
  const handleUseSparePart = async (part) => {
    try {
      await technicianService.useSparePart(part.part_id || part.id, 1, "WO1024");
      setSpareParts((prev) =>
        prev.map((p) => {
          if (p.id === part.id || p.part_id === part.part_id) {
            const nextQty = Math.max(0, p.quantity - 1);
            return {
              ...p,
              quantity: nextQty,
              used_qty: (p.used_qty || 0) + 1,
              status: nextQty <= 0 ? "Out of Stock" : nextQty <= 2 ? "Critical" : nextQty <= 4 ? "Low Stock" : "In Stock",
            };
          }
          return p;
        })
      );
      setToast({ message: `1 unit of ${part.name} consumed for active repair.`, type: "success" });
    } catch (err) {
      setToast({ message: "Failed to consume spare part.", type: "error" });
    }
  };

  // QR Diagnostic Lookup
  const handleQrLookup = async () => {
    if (!qrInputCode.trim()) return;
    const res = await technicianService.qrLookup(qrInputCode.trim());
    if (res?.data) {
      setQrLookupResult(res.data);
    }
  };

  // Save Checklist Sign-Off
  const handleChecklistSignoff = () => {
    const hasFailures = checklist.some((c) => c.status === "FAIL");
    setToast({
      message: hasFailures
        ? "Preventive Inspection completed with FAILS flagged. Corrective work order recommended."
        : "Preventive Maintenance 11-point inspection verified 100% PASS!",
      type: hasFailures ? "warning" : "success",
    });
  };

  // Filtered Work Orders
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter((w) => {
      const matchStatus = taskStatusFilter === "All" || w.status === taskStatusFilter;
      const matchPriority = taskPriorityFilter === "All" || w.priority === taskPriorityFilter;
      return matchStatus && matchPriority;
    });
  }, [workOrders, taskStatusFilter, taskPriorityFilter]);

  // Filtered Work History
  const filteredHistory = useMemo(() => {
    return workHistory.filter((h) => {
      const matchPriority = historyPriorityFilter === "All" || h.priority === historyPriorityFilter;
      const matchSearch =
        !historySearch.trim() ||
        (h.issue && h.issue.toLowerCase().includes(historySearch.toLowerCase())) ||
        (h.station_name && h.station_name.toLowerCase().includes(historySearch.toLowerCase())) ||
        (h.task_id && h.task_id.toLowerCase().includes(historySearch.toLowerCase()));
      return matchPriority && matchSearch;
    });
  }, [workHistory, historyPriorityFilter, historySearch]);

  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-200">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "info" })}
      />

      <TechnicianSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        stats={{
          ...dashboardStats,
          unreadNotifs: unreadNotifsCount,
        }}
      />

      <div className="md:pl-64 flex flex-col min-h-screen pb-16 md:pb-0">
        <TechnicianNavbar
          onOpenSidebar={() => setSidebarOpen(true)}
          currentStatus={availabilityStatus}
          onUpdateStatus={handleUpdateAvailability}
          currentStation="EV Power Hub Chennai Central (STA001)"
          notifications={notifications}
          unreadCount={unreadNotifsCount}
          onMarkNotificationRead={handleMarkNotifRead}
          onSelectTab={handleSelectTab}
          onOpenQrScanner={() => setShowQrModal(true)}
        />

        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto animate-fade-in space-y-6">
          {/* ==================================================== */}
          {/* TOP CONTROL CENTER HERO BANNER                        */}
          {/* ==================================================== */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-subtle)] shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30 uppercase tracking-wide">
                  TECHNICIAN CONTROL CENTER
                </span>
                <span className="text-xs font-mono text-[var(--text-muted)]">{liveTime}</span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-[var(--text-primary)] mt-1 font-mono flex items-center gap-2">
                Technician: <span className="text-amber-500">{currentUser?.name || "Dave Wilson"}</span>
                <span className="text-xs font-normal text-[var(--text-muted)] font-mono">({profile.counterId})</span>
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Current Station: EV Power Hub Chennai Central • Status: <strong className="text-emerald-500 font-mono">{availabilityStatus}</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowQrModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-bold border border-[var(--border-subtle)] transition cursor-pointer"
              >
                <QrCode size={14} className="text-amber-500" />
                <span>QR Scanner</span>
              </button>

              <button
                onClick={() => setShowReportFaultModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-lg shadow-rose-600/20 transition cursor-pointer"
              >
                <AlertTriangle size={14} />
                <span>Report Fault</span>
              </button>

              <button
                onClick={() => setShowNewWorkOrderModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                <Plus size={14} />
                <span>New Work Order</span>
              </button>

              <button
                onClick={loadData}
                disabled={isLoading}
                className="p-2 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] hover:border-amber-500/50 text-[var(--text-primary)] transition cursor-pointer"
                title="Refresh Live Data"
              >
                <RefreshCw size={16} className={isLoading ? "animate-spin text-amber-500" : ""} />
              </button>
            </div>
          </div>

          {/* Section 9: Real Backend 8 Statistical Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: "Assigned Stations", value: dashboardStats.assignedStations, icon: Building2, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", tab: "stations" },
              { label: "Active Work Orders", value: dashboardStats.activeWorkOrders, icon: Wrench, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", tab: "work-orders" },
              { label: "Pending Faults", value: dashboardStats.pendingRepairs, icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20", tab: "faults" },
              { label: "Critical Faults", value: dashboardStats.criticalFaults, icon: Flame, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20", tab: "emergency" },
              { label: "Maint. Due", value: dashboardStats.preventiveDue || 4, icon: CalendarCheck, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20", tab: "maintenance" },
              { label: "Completed Repairs", value: dashboardStats.completedRepairs, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", tab: "work-history" },
              { label: "Stations Online", value: dashboardStats.stationsOnline, icon: Radio, color: "text-teal-500", bg: "bg-teal-500/10", border: "border-teal-500/20", tab: "stations" },
              { label: "Stations Offline", value: dashboardStats.stationsOffline, icon: Power, color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20", tab: "stations" },
            ].map((c, i) => {
              const Icon = c.icon;
              return (
                <button
                  key={i}
                  onClick={() => handleSelectTab(c.tab)}
                  className={`p-3 rounded-2xl bg-[var(--bg-surface)] border ${c.border} text-left hover:scale-[1.02] transition shadow-sm cursor-pointer flex flex-col justify-between`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`p-1.5 rounded-lg ${c.bg} ${c.color}`}>
                      <Icon size={14} />
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="text-lg font-black font-mono text-[var(--text-primary)] leading-tight">
                      {c.value}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] font-medium leading-tight mt-0.5 truncate">
                      {c.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ==================================================== */}
          {/* TAB 1: OVERVIEW DASHBOARD SCREEN                      */}
          {/* ==================================================== */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Priority Work Orders Preview */}
              <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-subtle)] space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                  <h2 className="text-sm font-bold font-mono text-[var(--text-primary)] flex items-center gap-2">
                    <Wrench size={16} className="text-amber-500" />
                    PRIORITY WORK ORDERS
                  </h2>
                  <button
                    onClick={() => handleSelectTab("work-orders")}
                    className="text-xs text-amber-500 hover:underline font-bold"
                  >
                    View All Work Orders →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {workOrders.slice(0, 2).map((wo) => (
                    <div
                      key={wo.id}
                      className="p-4 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-amber-500">{wo.work_order_id}</span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            wo.priority === "CRITICAL"
                              ? "bg-rose-500/15 text-rose-500 animate-pulse"
                              : "bg-amber-500/15 text-amber-500"
                          }`}
                        >
                          {wo.priority}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-[var(--text-primary)]">{wo.problem}</h4>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{wo.station_name} • {wo.port_id}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedWorkOrder(wo)}
                          className="flex-1 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition cursor-pointer"
                        >
                          View & Advance Status
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Station Health Overview Preview */}
              <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-subtle)] space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                  <h2 className="text-sm font-bold font-mono text-[var(--text-primary)] flex items-center gap-2">
                    <Activity size={16} className="text-amber-500" />
                    STATION HARDWARE HEALTH
                  </h2>
                  <span className="text-xs font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                    ● Live Telemetry Stream
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {telemetry.map((bay, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border ${
                        bay.status === "Maintenance"
                          ? "bg-rose-500/5 border-rose-500/30"
                          : "bg-[var(--bg-surface-raised)] border-[var(--border-subtle)]"
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs font-mono font-bold">
                        <span>{bay.name}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            bay.status === "Active"
                              ? "bg-emerald-500/15 text-emerald-500"
                              : bay.status === "Maintenance"
                              ? "bg-rose-500/15 text-rose-500"
                              : "bg-slate-500/15 text-slate-400"
                          }`}
                        >
                          {bay.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 mt-2.5 text-[11px] font-mono">
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] block">Voltage</span>
                          <span className="font-bold text-amber-500">{bay.voltage} V</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] block">Current</span>
                          <span className="font-bold text-blue-500">{bay.current} A</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] block">Power</span>
                          <span className="font-bold text-emerald-500">{bay.powerOutput} kW</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] block">Temp</span>
                          <span className={`font-bold ${bay.temp > 45 ? "text-rose-500" : "text-[var(--text-primary)]"}`}>
                            {bay.temp} °C
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 2: ASSIGNED STATIONS                             */}
          {/* ==================================================== */}
          {activeTab === "stations" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold font-mono text-[var(--text-primary)]">
                    ASSIGNED CHARGING STATIONS
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Stations currently under your active field maintenance responsibility
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stations.map((st) => (
                  <div
                    key={st.id}
                    className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-4 shadow-sm hover:border-amber-500/40 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[var(--bg-surface-raised)] text-amber-500 border border-[var(--border-subtle)]">
                        {st.stationId}
                      </span>
                      <span
                        className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full ${
                          st.status === "Online"
                            ? "bg-emerald-500/15 text-emerald-500"
                            : st.status === "Warning"
                            ? "bg-amber-500/15 text-amber-500"
                            : "bg-rose-500/15 text-rose-500"
                        }`}
                      >
                        {st.status === "Online" ? "🟢 ONLINE" : st.status === "Warning" ? "🟡 WARNING" : "🔴 OFFLINE"}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-[var(--text-primary)]">{st.name}</h3>
                      <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-1">
                        <MapPin size={12} className="text-amber-500" />
                        {st.location}
                      </p>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="bg-[var(--bg-surface-raised)] p-2 rounded-xl">
                        <span className="text-[10px] text-[var(--text-muted)] block">Total</span>
                        <span className="font-mono font-bold">{st.totalPorts}</span>
                      </div>
                      <div className="bg-[var(--bg-surface-raised)] p-2 rounded-xl">
                        <span className="text-[10px] text-emerald-500 block">Avail</span>
                        <span className="font-mono font-bold text-emerald-500">{st.availablePorts}</span>
                      </div>
                      <div className="bg-[var(--bg-surface-raised)] p-2 rounded-xl">
                        <span className="text-[10px] text-blue-500 block">Occ</span>
                        <span className="font-mono font-bold text-blue-500">{st.occupiedPorts}</span>
                      </div>
                      <div className="bg-[var(--bg-surface-raised)] p-2 rounded-xl">
                        <span className="text-[10px] text-rose-500 block">Maint</span>
                        <span className="font-mono font-bold text-rose-500">{st.offlinePorts}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
                      <div className="flex justify-between">
                        <span>Last Maintenance:</span>
                        <span className="font-mono text-[var(--text-primary)]">{st.lastMaintenance}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Next Maintenance:</span>
                        <span className="font-mono text-amber-500 font-bold">{st.nextMaintenance}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Active Faults:</span>
                        <span className={`font-mono font-bold ${st.currentFaults > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                          {st.currentFaults}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleSelectTab("charger-health")}
                        className="flex-1 py-2 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-amber-500/15 text-amber-500 text-xs font-bold border border-amber-500/30 transition cursor-pointer"
                      >
                        Inspect Ports
                      </button>
                      <button
                        onClick={() => {
                          setNewWorkOrderForm((prev) => ({
                            ...prev,
                            stationId: st.id,
                            stationName: st.name,
                          }));
                          setShowNewWorkOrderModal(true);
                        }}
                        className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition cursor-pointer"
                      >
                        Create Work Order
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 3: WORK ORDERS (9-STAGE WORKFLOW)                */}
          {/* ==================================================== */}
          {activeTab === "work-orders" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold font-mono text-[var(--text-primary)] flex items-center gap-2">
                    <Wrench size={16} className="text-amber-500" />
                    WORK ORDERS & 9-STAGE DISPATCH PIPELINE
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Manage active assignments: ASSIGNED → ACCEPTED → TRAVELING → ON_SITE → DIAGNOSING → REPAIRING → TESTING → COMPLETED
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={taskPriorityFilter}
                    onChange={(e) => setTaskPriorityFilter(e.target.value)}
                    className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs rounded-xl px-3 py-1.5 focus:outline-none"
                  >
                    <option value="All">All Priorities</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>

                  <select
                    value={taskStatusFilter}
                    onChange={(e) => setTaskStatusFilter(e.target.value)}
                    className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs rounded-xl px-3 py-1.5 focus:outline-none"
                  >
                    <option value="All">All Statuses</option>
                    {WORK_ORDER_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => setShowNewWorkOrderModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-600 transition cursor-pointer"
                  >
                    <Plus size={14} /> New Work Order
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredWorkOrders.map((wo) => {
                  const currentIdx = WORK_ORDER_STAGES.indexOf(wo.status);
                  const nextStage = WORK_ORDER_STAGES[currentIdx + 1];

                  return (
                    <div
                      key={wo.id}
                      className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3 hover:border-amber-500/40 transition shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                            {wo.work_order_id}
                          </span>
                          <span className="text-xs font-bold text-[var(--text-primary)]">{wo.port_id}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full ${
                              wo.priority === "CRITICAL"
                                ? "bg-rose-500/15 text-rose-500 border border-rose-500/30 animate-pulse"
                                : wo.priority === "HIGH"
                                ? "bg-orange-500/15 text-orange-500 border border-orange-500/30"
                                : "bg-blue-500/15 text-blue-500 border border-blue-500/30"
                            }`}
                          >
                            {wo.priority}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
                            {wo.status}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-[var(--text-primary)]">{wo.problem}</h4>
                        <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{wo.description}</p>
                      </div>

                      <div className="space-y-1 text-[11px] text-[var(--text-muted)] pt-2 border-t border-[var(--border-subtle)]">
                        <div className="flex justify-between">
                          <span>Station:</span>
                          <span className="font-bold text-[var(--text-primary)]">{wo.station_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Assigned Technician:</span>
                          <span className="text-amber-500 font-bold">{wo.assigned_technician_name || "Dave Wilson (TECH0001)"}</span>
                        </div>
                        {wo.diagnosis && (
                          <div className="text-xs text-amber-500/90 font-mono bg-amber-500/5 p-2 rounded-lg border border-amber-500/20">
                            <strong>Diagnosis:</strong> {wo.diagnosis}
                          </div>
                        )}
                      </div>

                      {/* Action workflow buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        {nextStage && nextStage !== "CANCELLED" && (
                          <button
                            onClick={() => handleAdvanceWorkOrder(wo, nextStage)}
                            className="flex-1 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>Mark as {nextStage}</span>
                            <ArrowRight size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedWorkOrder(wo)}
                          className="px-3 py-1.5 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--border-subtle)] text-xs font-bold transition cursor-pointer"
                        >
                          Edit / Advance
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 4: FAULT REPORTS (10-STAGE WORKFLOW)              */}
          {/* ==================================================== */}
          {activeTab === "faults" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold font-mono text-[var(--text-primary)] flex items-center gap-2">
                    <AlertTriangle size={16} className="text-rose-500" />
                    FAULT REPORTS & RESTORATION PIPELINE
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Reported charger anomalies, thermal incidents, and port restoration records
                  </p>
                </div>
                <button
                  onClick={() => setShowReportFaultModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition cursor-pointer shrink-0"
                >
                  <Plus size={14} /> Report New Fault
                </button>
              </div>

              <div className="space-y-3">
                {faults.map((flt) => {
                  const currentStageIdx = REPAIR_STAGES.indexOf(flt.status) !== -1 ? REPAIR_STAGES.indexOf(flt.status) : 0;
                  const nextStage = REPAIR_STAGES[currentStageIdx + 1];

                  return (
                    <div
                      key={flt.id}
                      className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-4 shadow-sm hover:border-amber-500/30 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                            {flt.fault_id || `FLT-${flt.id}`}
                          </span>
                          <span className="font-bold text-sm text-[var(--text-primary)]">{flt.fault_type}</span>
                          <span className="text-xs text-[var(--text-muted)] font-mono">({flt.port_id || flt.bay_name || "PORT01"})</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full ${
                              flt.priority === "CRITICAL"
                                ? "bg-rose-500/15 text-rose-500 border border-rose-500/30 animate-pulse"
                                : "bg-orange-500/15 text-orange-500 border border-orange-500/30"
                            }`}
                          >
                            {flt.priority}
                          </span>
                          <span className="text-xs font-mono font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                            Stage: {flt.status}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">{flt.description}</p>

                      <div className="space-y-1.5">
                        <div className="text-[10px] font-mono font-bold text-[var(--text-muted)] flex justify-between">
                          <span>Repair Workflow Progress</span>
                          <span className="text-amber-500">{currentStageIdx + 1} / 10 Steps</span>
                        </div>
                        <div className="grid grid-cols-10 gap-1">
                          {REPAIR_STAGES.map((stg, sIdx) => (
                            <div
                              key={stg}
                              title={`Step ${sIdx + 1}: ${stg}`}
                              className={`h-2 rounded-full transition-all ${
                                sIdx <= currentStageIdx
                                  ? sIdx === 9
                                    ? "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                                    : "bg-amber-500"
                                  : "bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]"
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border-subtle)]">
                        {nextStage ? (
                          <button
                            onClick={() => setSelectedFault(flt)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition cursor-pointer"
                          >
                            <span>Advance to {nextStage}</span>
                            <ArrowRight size={14} />
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold font-mono">
                            <CheckCircle2 size={16} />
                            <span>Station Restored & Fault Closed</span>
                          </div>
                        )}

                        <button
                          onClick={() => setSelectedFault(flt)}
                          className="px-3.5 py-2 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--border-subtle)] text-xs font-bold transition cursor-pointer"
                        >
                          Diagnostic Notes
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 5: PREVENTIVE MAINTENANCE CHECKLIST               */}
          {/* ==================================================== */}
          {(activeTab === "maintenance" || activeTab === "corrective-maintenance") && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold font-mono text-[var(--text-primary)] flex items-center gap-2">
                    <CalendarCheck size={16} className="text-indigo-500" />
                    PREVENTIVE MAINTENANCE & 11-POINT INSPECTION CHECKLIST
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Statutory safety and functional audit for Station STA001 (EV Power Hub Chennai Central)
                  </p>
                </div>
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition cursor-pointer shrink-0"
                >
                  <Plus size={14} /> Schedule Task
                </button>
              </div>

              {/* 11-Point Interactive Checklist */}
              <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-subtle)] space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-500">
                    Mandatory Hardware Safety & Operational Checklist
                  </span>
                  <span className="text-xs font-mono text-emerald-500 font-bold">
                    All 11 Points Required
                  </span>
                </div>

                <div className="space-y-3">
                  {checklist.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <span className="font-mono text-xs font-bold text-amber-500 bg-[var(--bg-surface)] px-2 py-1 rounded border border-[var(--border-subtle)] shrink-0">
                          #{idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-[var(--text-primary)]">{item.item}</p>
                          <input
                            type="text"
                            placeholder="Add technician remarks..."
                            value={item.remarks}
                            onChange={(e) => {
                              const val = e.target.value;
                              setChecklist((prev) =>
                                prev.map((c) => (c.id === item.id ? { ...c, remarks: val } : c))
                              );
                            }}
                            className="mt-1 w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[11px] rounded-lg px-2.5 py-1 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                        {["PASS", "FAIL", "NOT APPLICABLE"].map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => {
                              setChecklist((prev) =>
                                prev.map((c) => (c.id === item.id ? { ...c, status: st } : c))
                              );
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                              item.status === st
                                ? st === "PASS"
                                  ? "bg-emerald-500 text-slate-950 shadow-sm"
                                  : st === "FAIL"
                                  ? "bg-rose-500 text-white shadow-sm"
                                  : "bg-slate-500 text-white"
                                : "bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]"
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row justify-between items-center gap-3">
                  <p className="text-xs text-[var(--text-muted)]">
                    Technician Certificate Sign-off: <strong>Dave Wilson (TECH0001)</strong>
                  </p>
                  <button
                    onClick={handleChecklistSignoff}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                  >
                    Save & Certify Inspection Checklist
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 6: EMERGENCY ISSUES                              */}
          {/* ==================================================== */}
          {activeTab === "emergency" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold font-mono text-rose-500 flex items-center gap-2">
                    <Flame size={18} className="animate-pulse" />
                    CRITICAL EMERGENCY INCIDENT RESPONSE
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Overheating, smoke warnings, emergency stops, and severe voltage faults
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                    <span className="font-mono font-black text-xs text-rose-500 uppercase tracking-wider">
                      ACTIVE EMERGENCY ALERT • STA001-PORT04
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-rose-500 bg-rose-500/20 px-3 py-1 rounded-full">
                    CRITICAL PRIORITY
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Thermal Coolant Temperature Exceeded 52.4°C Threshold
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                    Port automatically locked into MAINTENANCE state. Public booking blocked. Safety circuit isolation active.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-subtle)]">
                    <span className="text-[10px] text-[var(--text-muted)] block">Telemetry Reading</span>
                    <span className="font-mono font-black text-rose-500 text-sm">52.4 °C (Limit 45°C)</span>
                  </div>
                  <div className="bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-subtle)]">
                    <span className="text-[10px] text-[var(--text-muted)] block">Breaker Status</span>
                    <span className="font-mono font-bold text-amber-500 text-sm">TRIPPED (ISOLATED)</span>
                  </div>
                  <div className="bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-subtle)]">
                    <span className="text-[10px] text-[var(--text-muted)] block">User Bookings</span>
                    <span className="font-mono font-bold text-rose-500 text-sm">Rerouted / Protected</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => {
                      const flt = faults.find((f) => f.priority === "CRITICAL") || faults[0];
                      setSelectedFault(flt);
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition cursor-pointer"
                  >
                    Accept Emergency & Begin On-Site Diagnostic
                  </button>

                  <button
                    onClick={() => {
                      setTelemetry((prev) =>
                        prev.map((t) =>
                          t.bayId === "STA001-C04"
                            ? { ...t, status: "Idle", emergencyStop: "NORMAL", faultStatus: "None", temp: 29.2 }
                            : t
                        )
                      );
                      setToast({ message: "Emergency circuit tested and reset to normal.", type: "success" });
                    }}
                    className="px-4 py-2 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs font-bold transition cursor-pointer"
                  >
                    Reset Safety Isolation Circuit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 7: CHARGER HEALTH MONITORING                      */}
          {/* ==================================================== */}
          {activeTab === "charger-health" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <div>
                  <h2 className="text-base font-bold font-mono text-[var(--text-primary)] flex items-center gap-2">
                    <Activity size={16} className="text-amber-500" />
                    CHARGER HARDWARE HEALTH & TELEMETRY
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Live sensor metrics: Voltage, Current, Power, Temperature, Isolation resistance, and Coolant pressure
                  </p>
                </div>
                <span className="text-xs font-mono bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20 font-bold">
                  ● OCPP 2.0.1 Live Stream Active
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {telemetry.map((bay, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      bay.status === "Maintenance"
                        ? "bg-rose-500/5 border-rose-500/30"
                        : "bg-[var(--bg-surface)] border-[var(--border-subtle)]"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                      <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{bay.name}</span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          bay.status === "Active"
                            ? "bg-emerald-500/15 text-emerald-500"
                            : bay.status === "Maintenance"
                            ? "bg-rose-500/15 text-rose-500 animate-pulse"
                            : "bg-slate-500/15 text-slate-400"
                        }`}
                      >
                        {bay.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                      <div className="bg-[var(--bg-surface-raised)] p-2 rounded-xl">
                        <span className="text-[10px] text-[var(--text-muted)] block">Voltage</span>
                        <span className="font-mono font-bold text-amber-500">{bay.voltage} V</span>
                      </div>
                      <div className="bg-[var(--bg-surface-raised)] p-2 rounded-xl">
                        <span className="text-[10px] text-[var(--text-muted)] block">Current</span>
                        <span className="font-mono font-bold text-blue-500">{bay.current} A</span>
                      </div>
                      <div className="bg-[var(--bg-surface-raised)] p-2 rounded-xl">
                        <span className="text-[10px] text-[var(--text-muted)] block">Power Output</span>
                        <span className="font-mono font-bold text-emerald-500">{bay.powerOutput} kW</span>
                      </div>
                      <div className="bg-[var(--bg-surface-raised)] p-2 rounded-xl">
                        <span className="text-[10px] text-[var(--text-muted)] block">Temperature</span>
                        <span className={`font-mono font-bold ${bay.temp > 45 ? "text-rose-500 font-black" : "text-[var(--text-primary)]"}`}>
                          {bay.temp} °C
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[var(--border-subtle)] space-y-1 text-[11px] text-[var(--text-muted)] font-mono">
                      <div className="flex justify-between">
                        <span>Connector:</span>
                        <span className="font-bold text-[var(--text-primary)]">{bay.connectorStatus}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Isolation:</span>
                        <span className="font-bold text-[var(--text-primary)]">{bay.isolation} MΩ</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Emergency Stop:</span>
                        <span className={`font-bold ${bay.emergencyStop === "TRIPPED" ? "text-rose-500" : "text-emerald-500"}`}>
                          {bay.emergencyStop}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Heartbeat:</span>
                        <span className="text-[var(--text-primary)]">{bay.heartbeat}</span>
                      </div>
                    </div>

                    {bay.status === "Maintenance" && (
                      <button
                        onClick={() => {
                          const relatedFault = faults.find((f) => f.slot_id === 4 || f.fault_type === "Overheating") || faults[0];
                          setSelectedFault(relatedFault);
                        }}
                        className="w-full mt-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Wrench size={12} />
                        <span>Diagnose & Repair</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 8: NETWORK & OCPP DIAGNOSTICS                    */}
          {/* ==================================================== */}
          {activeTab === "network" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold font-mono text-[var(--text-primary)] flex items-center gap-2">
                    <Radio size={16} className="text-teal-500" />
                    NETWORK & OCPP 2.0.1 COMMUNICATION DIAGNOSTICS
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Real-time connectivity health, packet telemetry, and backend cloud link
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1">
                  <span className="text-xs font-mono text-[var(--text-muted)] block">Internet Status</span>
                  <span className="text-lg font-mono font-black text-emerald-500">CONNECTED</span>
                  <span className="text-[10px] text-[var(--text-muted)] block">{networkInfo.connectionType}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1">
                  <span className="text-xs font-mono text-[var(--text-muted)] block">Signal Strength</span>
                  <span className="text-lg font-mono font-black text-teal-400">{networkInfo.signalStrength}</span>
                  <span className="text-[10px] text-[var(--text-muted)] block">Latency: {networkInfo.latencyMs} ms</span>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1">
                  <span className="text-xs font-mono text-[var(--text-muted)] block">OCPP Status</span>
                  <span className="text-lg font-mono font-black text-emerald-500">CONNECTED</span>
                  <span className="text-[10px] text-[var(--text-muted)] block">Version: {networkInfo.ocppVersion}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1">
                  <span className="text-xs font-mono text-[var(--text-muted)] block">Firmware Version</span>
                  <span className="text-lg font-mono font-black text-amber-500">{networkInfo.firmwareVersion}</span>
                  <span className="text-[10px] text-[var(--text-muted)] block">Last Heartbeat: {networkInfo.lastHeartbeat}</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3 font-mono text-xs">
                <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Terminal size={14} className="text-amber-500" />
                  Live OCPP Heartbeat & Communication Log
                </h3>
                <div className="p-3.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-1.5 text-[11px]">
                  <p className="text-emerald-500">[16:42:11] OCPP Heartbeat.req -&gt; Heartbeat.conf [ACK 200 OK] (14ms)</p>
                  <p className="text-slate-300">[16:41:50] MeterValues.req [STA001-P01: 89.2kW | 482.4V | 185.0A] -&gt; Accepted</p>
                  <p className="text-rose-400">[16:40:12] StatusNotification.req [STA001-P04: Faulted (Thermal Overheat)] -&gt; Accepted</p>
                  <p className="text-emerald-500">[16:38:00] Cloud Backend WebSocket link active at wss://api.evchargepro.io/ocpp</p>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 9: SPARE PARTS INVENTORY                         */}
          {/* ==================================================== */}
          {activeTab === "spare-parts" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold font-mono text-[var(--text-primary)] flex items-center gap-2">
                    <Box size={16} className="text-amber-500" />
                    SPARE PARTS & REPLACEMENT HARDWARE DEPOT
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Inventory tracking with auto-deduction on repair utilization
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {spareParts.map((part) => (
                  <div
                    key={part.id}
                    className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3 hover:border-amber-500/40 transition shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                        {part.part_id}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          part.status === "In Stock"
                            ? "bg-emerald-500/15 text-emerald-500"
                            : part.status === "Low Stock"
                            ? "bg-amber-500/15 text-amber-500"
                            : "bg-rose-500/15 text-rose-500 animate-pulse"
                        }`}
                      >
                        {part.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-[var(--text-primary)]">{part.name}</h4>
                      <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                        PN: {part.part_number} • {part.category}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs bg-[var(--bg-surface-raised)] p-2 rounded-xl">
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">In Stock</span>
                        <span className="font-mono font-bold text-[var(--text-primary)]">{part.quantity}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">Required</span>
                        <span className="font-mono font-bold text-amber-500">{part.required_qty || 1}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">Used</span>
                        <span className="font-mono font-bold text-blue-500">{part.used_qty || 0}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleUseSparePart(part)}
                      disabled={part.quantity <= 0}
                      className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 font-bold text-xs transition cursor-pointer"
                    >
                      {part.quantity > 0 ? "Consume Part for Maintenance" : "Out of Stock"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 10: SERVICE REPORTS                              */}
          {/* ==================================================== */}
          {activeTab === "service-reports" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold font-mono text-[var(--text-primary)] flex items-center gap-2">
                    <FileCheck2 size={16} className="text-emerald-500" />
                    CERTIFIED SERVICE & TESTING REPORTS
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Official completion records including electrical, communication, charging, and safety testing verification
                  </p>
                </div>
                <button
                  onClick={() => setShowServiceReportModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition cursor-pointer shrink-0"
                >
                  <Plus size={14} /> New Service Report
                </button>
              </div>

              <div className="space-y-4">
                {serviceReports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                          {rep.report_id}
                        </span>
                        <span className="font-bold text-sm text-[var(--text-primary)]">{rep.station_name} ({rep.port_id})</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-500 bg-emerald-500/15 px-3 py-0.5 rounded-full">
                        STATUS: {rep.station_final_status || "AVAILABLE"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <strong className="text-[var(--text-muted)] block">Problem Description:</strong>
                        <p className="text-[var(--text-primary)] mt-0.5">{rep.problem}</p>
                      </div>
                      <div>
                        <strong className="text-[var(--text-muted)] block">Repair Performed:</strong>
                        <p className="text-[var(--text-primary)] mt-0.5">{rep.repair_performed}</p>
                      </div>
                    </div>

                    {/* 4-Point Testing Results Matrix */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                      <div className="p-2 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-center">
                        <span className="text-[10px] text-[var(--text-muted)] block">Electrical Test</span>
                        <span className="font-mono font-bold text-emerald-500">PASS ✓</span>
                      </div>
                      <div className="p-2 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-center">
                        <span className="text-[10px] text-[var(--text-muted)] block">Communication Test</span>
                        <span className="font-mono font-bold text-emerald-500">PASS ✓</span>
                      </div>
                      <div className="p-2 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-center">
                        <span className="text-[10px] text-[var(--text-muted)] block">Charging Load Test</span>
                        <span className="font-mono font-bold text-emerald-500">PASS ✓</span>
                      </div>
                      <div className="p-2 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-center">
                        <span className="text-[10px] text-[var(--text-muted)] block">Safety Trip Test</span>
                        <span className="font-mono font-bold text-emerald-500">PASS ✓</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-[var(--text-muted)] pt-2 border-t border-[var(--border-subtle)] flex justify-between font-mono">
                      <span>Certified by: {rep.technician_name} ({rep.technician_id})</span>
                      <span>{rep.start_time} - {rep.end_time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 11: WORK HISTORY                                 */}
          {/* ==================================================== */}
          {activeTab === "work-history" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold font-mono text-[var(--text-primary)] flex items-center gap-2">
                    <History size={16} className="text-amber-500" />
                    TECHNICIAN WORK HISTORY & SIGN-OFF LOGS
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Search and export completed maintenance interventions and repair sign-offs
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="Search issue or station..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none"
                    />
                  </div>

                  <select
                    value={historyPriorityFilter}
                    onChange={(e) => setHistoryPriorityFilter(e.target.value)}
                    className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs rounded-xl px-3 py-1.5 focus:outline-none"
                  >
                    <option value="All">All Priorities</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-raised)]/50 text-[var(--text-muted)] font-mono">
                      <th className="p-3">Task ID</th>
                      <th className="p-3">Station</th>
                      <th className="p-3">Issue & Diagnosis</th>
                      <th className="p-3">Repair Performed</th>
                      <th className="p-3">Technician</th>
                      <th className="p-3">Completion Time</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {filteredHistory.map((h) => (
                      <tr key={h.id} className="hover:bg-[var(--bg-surface-raised)] transition">
                        <td className="p-3 font-mono font-bold text-amber-500 whitespace-nowrap">{h.task_id}</td>
                        <td className="p-3 font-bold text-[var(--text-primary)] whitespace-nowrap">{h.station_name}</td>
                        <td className="p-3 max-w-xs">
                          <div className="font-bold text-[var(--text-primary)]">{h.issue}</div>
                          <div className="text-[11px] text-[var(--text-muted)] mt-0.5 font-mono">{h.diagnosis}</div>
                        </td>
                        <td className="p-3 text-[var(--text-muted)] max-w-xs">{h.repair_performed}</td>
                        <td className="p-3 font-mono whitespace-nowrap">{h.technician}</td>
                        <td className="p-3 font-mono text-[var(--text-muted)] whitespace-nowrap">{h.completion_time}</td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-500">
                            {h.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 12: NOTIFICATIONS                                */}
          {/* ==================================================== */}
          {activeTab === "notifications" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold font-mono text-[var(--text-primary)] flex items-center gap-2">
                    <Bell size={16} className="text-amber-500" />
                    TECHNICIAN NOTIFICATION DISPATCH INBOX
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Alerts for new work orders, critical faults, temperature warnings, and owner repair requests
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleMarkNotifRead(n.id)}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex items-start justify-between gap-4 ${
                      n.isRead
                        ? "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)]"
                        : "bg-amber-500/10 border-amber-500/30 text-[var(--text-primary)]"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[var(--text-primary)]">{n.title}</span>
                        <span className="text-[10px] font-mono bg-[var(--bg-surface-raised)] px-2 py-0.5 rounded text-amber-500 font-bold">
                          {n.type}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">{n.message}</p>
                    </div>

                    {!n.isRead && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 shrink-0">
                        Mark Read
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 13: TECHNICIAN PROFILE & SPECIALIZATION          */}
          {/* ==================================================== */}
          {activeTab === "profile" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold font-mono text-[var(--text-primary)] flex items-center gap-2">
                    <UserCheck size={16} className="text-amber-500" />
                    TECHNICIAN PROFILE & FIELD SPECIALIZATION
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Skill matrix, certifications, and availability status
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-4 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 font-black text-2xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
                    {profile.name[0]}
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">{profile.name}</h3>
                    <p className="text-xs font-mono text-amber-500 font-bold">{profile.counterId}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{profile.specialization}</p>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-subtle)] text-left space-y-2 text-xs text-[var(--text-muted)]">
                    <div className="flex items-center justify-between">
                      <span>Experience:</span>
                      <span className="font-bold text-[var(--text-primary)]">{profile.experienceYears} Years</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Assigned Region:</span>
                      <span className="font-bold text-[var(--text-primary)]">{profile.assignedRegion}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Primary Station:</span>
                      <span className="font-bold text-[var(--text-primary)]">{profile.assignedStation}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Status:</span>
                      <span className="text-emerald-500 font-bold font-mono">{availabilityStatus}</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-4">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase font-mono">
                    Technician Skill Specialization Matrix
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "AC Charger",
                      "DC Charger",
                      "DC Fast Charger",
                      "Electrical Systems",
                      "EVSE Hardware",
                      "Networking",
                      "OCPP",
                      "Installation",
                      "Commissioning",
                      "Preventive Maintenance",
                      "Corrective Maintenance",
                    ].map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5"
                      >
                        <Check size={14} />
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-[var(--border-subtle)]">
                    <h4 className="text-xs font-bold text-[var(--text-muted)] mb-1">
                      High Voltage Certifications & Accreditations
                    </h4>
                    <p className="text-xs font-mono text-[var(--text-primary)] bg-[var(--bg-surface-raised)] p-3 rounded-xl border border-[var(--border-subtle)]">
                      {profile.certification}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ==================================================== */}
      {/* MODAL 1: QR CODE DIAGNOSTIC SCANNER MODAL            */}
      {/* ==================================================== */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <QrCode size={18} className="text-amber-500" />
                Station QR Code Quick Diagnostic
              </h3>
              <button
                onClick={() => {
                  setShowQrModal(false);
                  setQrLookupResult(null);
                  setQrInputCode("");
                }}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">
                  Enter or Scan Station / Port Code (e.g. STN001, STN001-P01)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter QR Code..."
                    value={qrInputCode}
                    onChange={(e) => setQrInputCode(e.target.value)}
                    className="flex-1 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs rounded-xl p-2.5 font-mono uppercase focus:outline-none"
                  />
                  <button
                    onClick={handleQrLookup}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
                  >
                    Lookup
                  </button>
                </div>
              </div>

              {qrLookupResult && (
                <div className="p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-2 text-xs">
                  <div className="flex justify-between font-mono font-bold">
                    <span className="text-amber-500">{qrLookupResult.portId}</span>
                    <span className="text-emerald-500">{qrLookupResult.healthStatus}</span>
                  </div>
                  <p className="font-bold text-[var(--text-primary)]">{qrLookupResult.stationName}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">{qrLookupResult.connectorType}</p>
                  <button
                    onClick={() => {
                      setShowQrModal(false);
                      handleSelectTab("charger-health");
                    }}
                    className="w-full py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs mt-2"
                  >
                    Open Live Telemetry
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: REPORT FAULT MODAL                          */}
      {/* ==================================================== */}
      {showReportFaultModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-500" />
                Report Station Hardware Fault
              </h3>
              <button
                onClick={() => setShowReportFaultModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReportFaultSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Fault Type</label>
                <select
                  value={newFaultForm.faultType}
                  onChange={(e) => setNewFaultForm({ ...newFaultForm, faultType: e.target.value })}
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs rounded-xl p-2.5 focus:outline-none"
                >
                  {COMMON_FAULT_TYPES.map((ft) => (
                    <option key={ft} value={ft}>
                      {ft}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Station</label>
                  <select
                    value={newFaultForm.stationId}
                    onChange={(e) =>
                      setNewFaultForm({
                        ...newFaultForm,
                        stationId: Number(e.target.value),
                        stationName: e.target.options[e.target.selectedIndex].text,
                      })
                    }
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs rounded-xl p-2.5 focus:outline-none"
                  >
                    <option value={1}>EV Power Hub Chennai Central</option>
                    <option value={2}>ExpressWay Charge Plaza Guindy</option>
                    <option value={3}>Apex HyperFast Station Madurai</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Priority</label>
                  <select
                    value={newFaultForm.priority}
                    onChange={(e) => setNewFaultForm({ ...newFaultForm, priority: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs rounded-xl p-2.5 focus:outline-none"
                  >
                    <option value="CRITICAL">Critical (Immediate Shutdown)</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Description & Symptoms</label>
                <textarea
                  rows={3}
                  placeholder="Describe electrical or mechanical failure symptoms..."
                  value={newFaultForm.description}
                  onChange={(e) => setNewFaultForm({ ...newFaultForm, description: e.target.value })}
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs rounded-xl p-2.5 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportFaultModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/20"
                >
                  Submit Fault & Update Port
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 3: NEW WORK ORDER MODAL                        */}
      {/* ==================================================== */}
      {showNewWorkOrderModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Wrench size={18} className="text-amber-500" />
                Create New Work Order
              </h3>
              <button
                onClick={() => setShowNewWorkOrderModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateWorkOrderSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Problem Title</label>
                <input
                  type="text"
                  placeholder="e.g. Charging Failure & Solenoid Lock Pin Stuck"
                  value={newWorkOrderForm.problem}
                  onChange={(e) => setNewWorkOrderForm({ ...newWorkOrderForm, problem: e.target.value })}
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs rounded-xl p-2.5 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Station</label>
                  <select
                    value={newWorkOrderForm.stationId}
                    onChange={(e) =>
                      setNewWorkOrderForm({
                        ...newWorkOrderForm,
                        stationId: Number(e.target.value),
                        stationName: e.target.options[e.target.selectedIndex].text,
                      })
                    }
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs rounded-xl p-2.5 focus:outline-none"
                  >
                    <option value={1}>EV Power Hub Chennai Central</option>
                    <option value={2}>ExpressWay Charge Plaza Guindy</option>
                    <option value={3}>Apex HyperFast Station Madurai</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Priority</label>
                  <select
                    value={newWorkOrderForm.priority}
                    onChange={(e) => setNewWorkOrderForm({ ...newWorkOrderForm, priority: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs rounded-xl p-2.5 focus:outline-none"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Work Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Step-by-step repair and safety verification procedures..."
                  value={newWorkOrderForm.description}
                  onChange={(e) => setNewWorkOrderForm({ ...newWorkOrderForm, description: e.target.value })}
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs rounded-xl p-2.5 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewWorkOrderModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20"
                >
                  Dispatch Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 4: ADVANCE WORK ORDER MODAL                    */}
      {/* ==================================================== */}
      {selectedWorkOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Work Order Status Workflow: {selectedWorkOrder.work_order_id}
              </h3>
              <button
                onClick={() => setSelectedWorkOrder(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[var(--bg-surface-raised)] rounded-xl">
                <span className="font-bold text-[var(--text-primary)] block">{selectedWorkOrder.problem}</span>
                <span className="text-[var(--text-muted)] block mt-0.5">{selectedWorkOrder.description}</span>
                <span className="text-amber-500 font-mono font-bold block mt-1">Current Status: {selectedWorkOrder.status}</span>
              </div>

              <div>
                <label className="font-bold text-[var(--text-muted)] block mb-1">Diagnostic Evaluation</label>
                <textarea
                  rows={2}
                  placeholder="Technician diagnostic evaluation findings..."
                  value={selectedWorkOrder.diagnosis || ""}
                  onChange={(e) => setSelectedWorkOrder({ ...selectedWorkOrder, diagnosis: e.target.value })}
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl p-2.5 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-muted)] block mb-1">Advance Status To:</label>
                <div className="grid grid-cols-3 gap-2">
                  {WORK_ORDER_STAGES.map((stg) => (
                    <button
                      key={stg}
                      onClick={() =>
                        handleAdvanceWorkOrder(selectedWorkOrder, stg, selectedWorkOrder.diagnosis, selectedWorkOrder.resolution)
                      }
                      className={`p-2 rounded-xl text-center font-mono font-bold text-[10px] transition ${
                        selectedWorkOrder.status === stg
                          ? "bg-amber-500 text-slate-950"
                          : "bg-[var(--bg-surface-raised)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)]"
                      }`}
                    >
                      {stg}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 5: SERVICE REPORT GENERATOR MODAL              */}
      {/* ==================================================== */}
      {showServiceReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <FileCheck2 size={18} className="text-emerald-500" />
                Generate Certified Service Report
              </h3>
              <button
                onClick={() => setShowServiceReportModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateServiceReportSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[var(--text-muted)] block mb-1">Work Order ID</label>
                  <input
                    type="text"
                    value={serviceReportForm.workOrderId}
                    disabled
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl p-2.5 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-[var(--text-muted)] block mb-1">Station Port</label>
                  <input
                    type="text"
                    value={serviceReportForm.portId}
                    disabled
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl p-2.5 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[var(--text-muted)] block mb-1">Repair Performed</label>
                <textarea
                  rows={2}
                  value={serviceReportForm.repairPerformed}
                  onChange={(e) => setServiceReportForm({ ...serviceReportForm, repairPerformed: e.target.value })}
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl p-2.5 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-muted)] block mb-1">Testing Verification (All 4 Required)</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-[var(--bg-surface-raised)] flex justify-between items-center">
                    <span>Electrical Test:</span>
                    <span className="font-mono font-bold text-emerald-500">PASS ✓</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--bg-surface-raised)] flex justify-between items-center">
                    <span>Communication:</span>
                    <span className="font-mono font-bold text-emerald-500">PASS ✓</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--bg-surface-raised)] flex justify-between items-center">
                    <span>Charging Load Test:</span>
                    <span className="font-mono font-bold text-emerald-500">PASS ✓</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--bg-surface-raised)] flex justify-between items-center">
                    <span>Safety Protection:</span>
                    <span className="font-mono font-bold text-emerald-500">PASS ✓</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-[var(--text-muted)] block mb-1">Remarks & Sign-Off</label>
                <textarea
                  rows={2}
                  value={serviceReportForm.remarks}
                  onChange={(e) => setServiceReportForm({ ...serviceReportForm, remarks: e.target.value })}
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl p-2.5 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowServiceReportModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/20"
                >
                  Certify & Restore Station
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
