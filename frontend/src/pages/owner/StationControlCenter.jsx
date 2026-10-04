import { useState, useEffect, useCallback } from "react";
import {
  Zap,
  Activity,
  UserPlus,
  Sliders,
  RefreshCw,
  Clock,
  Car,
  User,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Users,
  Search,
  Building2,
  FileText,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Cpu,
  Wifi,
  Radio,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import ownerControlCenterService from "../../services/ownerControlCenterService";
import smartReservationService from "../../services/smartReservationService";
import socketService from "../../services/socketService";
import SmartReservationMonitor from "../../components/SmartReservationMonitor";
import LiveChargerGrid from "../../components/LiveChargerGrid";
import OfflineCheckInModal from "../../components/OfflineCheckInModal";
import QueueManagementCard from "../../components/QueueManagementCard";
import ReservationPolicyModal from "../../components/ReservationPolicyModal";
import ManualOverrideModal from "../../components/ManualOverrideModal";

export default function StationControlCenter() {
  const { currentUser, role } = useAuth();

  const [stations, setStations] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [stationData, setStationData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("LIVE"); // LIVE | RECONNECTING | OFFLINE
  const [activeTab, setActiveTab] = useState("chargers"); // "chargers" | "reservations" | "offline" | "queue" | "audit"
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideBookingId, setOverrideBookingId] = useState(null);
  const [overrideCharger, setOverrideCharger] = useState(null);

  // Load Station list for owner from MySQL
  const loadStations = async () => {
    try {
      const res = await ownerControlCenterService.getOwnerStations();
      const list = res?.data || res?.stations || [];
      setStations(list);

      if (list.length > 0 && !selectedStationId) {
        const initialStationId = list[0].stationId || list[0].id || list[0]._id;
        setSelectedStationId(initialStationId);
      }
    } catch (err) {
      console.warn("loadStations warning:", err.message);
    }
  };

  // Load full live status for selected station
  const loadLiveStatus = useCallback(async (showSpinner = false) => {
    if (!selectedStationId) return;
    if (showSpinner) setIsRefreshing(true);

    try {
      const res = await ownerControlCenterService.getControlCenter(selectedStationId);
      if (res?.success) {
        setStationData(res);
        setConnectionStatus("LIVE");
      }
    } catch (err) {
      console.warn("loadLiveStatus error:", err.message);
      setConnectionStatus("OFFLINE");
    } finally {
      setIsLoading(false);
      if (showSpinner) setIsRefreshing(false);
    }
  }, [selectedStationId]);

  useEffect(() => {
    loadStations();
  }, [role]);

  // Initial load & fallback 10s auto-sync polling
  useEffect(() => {
    if (selectedStationId) {
      setIsLoading(true);
      loadLiveStatus();

      // Primary fallback interval every 10 seconds
      const interval = setInterval(() => {
        loadLiveStatus(false);
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [selectedStationId, loadLiveStatus]);

  // Socket.IO real-time event listeners
  useEffect(() => {
    const socket = socketService.getSocket();
    if (socket) {
      socketService.joinOwnerDashboard();
      if (selectedStationId) {
        socketService.joinStation(selectedStationId);
      }
    }

    const unsubscribeStatus = socketService.subscribeStatus((status) => {
      if (status === "connected") setConnectionStatus("LIVE");
      else if (status === "reconnecting") setConnectionStatus("RECONNECTING");
      else setConnectionStatus("OFFLINE");
    });

    const handleRealtimeUpdate = (payload) => {
      console.log("⚡ [SOCKET] Real-time update event received:", payload?.event);
      loadLiveStatus(false);
    };

    if (socket) {
      socket.on("charger_status_changed", handleRealtimeUpdate);
      socket.on("charger:statusChanged", handleRealtimeUpdate);
      socket.on("telemetry_updated", handleRealtimeUpdate);
      socket.on("charger:chargingUpdated", handleRealtimeUpdate);
      socket.on("session_started", handleRealtimeUpdate);
      socket.on("charger:chargingStarted", handleRealtimeUpdate);
      socket.on("session_stopped", handleRealtimeUpdate);
      socket.on("charger:chargingStopped", handleRealtimeUpdate);
      socket.on("booking_created", handleRealtimeUpdate);
      socket.on("booking_updated", handleRealtimeUpdate);
      socket.on("booking_cancelled", handleRealtimeUpdate);
      socket.on("maintenance_updated", handleRealtimeUpdate);
      socket.on("fault_detected", handleRealtimeUpdate);
    }

    return () => {
      unsubscribeStatus();
      if (socket) {
        socket.off("charger_status_changed", handleRealtimeUpdate);
        socket.off("charger:statusChanged", handleRealtimeUpdate);
        socket.off("telemetry_updated", handleRealtimeUpdate);
        socket.off("charger:chargingUpdated", handleRealtimeUpdate);
        socket.off("session_started", handleRealtimeUpdate);
        socket.off("charger:chargingStarted", handleRealtimeUpdate);
        socket.off("session_stopped", handleRealtimeUpdate);
        socket.off("charger:chargingStopped", handleRealtimeUpdate);
        socket.off("booking_created", handleRealtimeUpdate);
        socket.off("booking_updated", handleRealtimeUpdate);
        socket.off("booking_cancelled", handleRealtimeUpdate);
        socket.off("maintenance_updated", handleRealtimeUpdate);
        socket.off("fault_detected", handleRealtimeUpdate);
      }
    };
  }, [selectedStationId, loadLiveStatus]);

  // Simulation Actions
  const handleStartCharging = async (chargerId, extra = {}) => {
    try {
      const res = await ownerControlCenterService.startCharging(chargerId, {
        stationId: selectedStationId,
        ...extra,
      });
      if (res?.success) {
        loadLiveStatus(false);
      }
    } catch (err) {
      alert("Error starting charging: " + (err?.response?.data?.message || err.message));
    }
  };

  const handleStopCharging = async (sessionId) => {
    try {
      const res = await ownerControlCenterService.stopCharging(sessionId);
      if (res?.success) {
        loadLiveStatus(false);
      }
    } catch (err) {
      alert("Error stopping charging: " + (err?.response?.data?.message || err.message));
    }
  };

  const handleSetStatus = async (chargerId, status) => {
    try {
      const res = await ownerControlCenterService.setChargerStatus(chargerId, status);
      if (res?.success) {
        loadLiveStatus(false);
      }
    } catch (err) {
      alert("Error setting status: " + (err?.response?.data?.message || err.message));
    }
  };

  // Actions
  const handleCheckInBooking = async (bookingId) => {
    try {
      const res = await smartReservationService.checkInBooking(bookingId);
      if (res.success) {
        alert(res.message);
        loadLiveStatus(false);
      } else {
        alert(res.message || "Check-in failed");
      }
    } catch (err) {
      alert("Error checking in booking.");
    }
  };

  const handleMarkNoShow = async (bookingId) => {
    const confirm = window.confirm(
      `Are you sure you want to mark ${bookingId} as NO-SHOW? This will release the charger slot back to AVAILABLE and check the queue.`
    );
    if (!confirm) return;

    try {
      const res = await smartReservationService.markNoShow(bookingId);
      if (res.success) {
        alert(`Booking ${bookingId} marked as NO-SHOW. Charger released!`);
        loadLiveStatus(false);
      } else {
        alert(res.message || "Failed to mark no-show.");
      }
    } catch (err) {
      alert("Error marking no-show.");
    }
  };

  const handleAssignQueue = async (queueId, slotId) => {
    try {
      const res = await smartReservationService.assignQueueEntry(queueId, slotId);
      if (res.success) {
        alert(res.message);
        loadLiveStatus(false);
      } else {
        alert(res.message || "Failed to assign queued customer.");
      }
    } catch (err) {
      alert("Error assigning queue customer.");
    }
  };

  const handleLeaveQueue = async (queueId) => {
    try {
      await smartReservationService.leaveQueue(queueId);
      loadLiveStatus(false);
    } catch (err) {}
  };

  const activeStationInfo = stations.find(
    (s) => (s.stationId || s.id || s._id) === selectedStationId
  ) || stations[0];

  const chargerGrid = stationData?.chargerGrid || stationData?.chargers || [];
  const metrics = stationData?.metrics || stationData?.summary || {};
  const onlineBookings = stationData?.bookings || [];
  const offlineBookings = stationData?.offlineBookings || [];
  const queueEntries = stationData?.queue || [];

  const availableChargersForWalkIn = chargerGrid.filter(
    (c) => c.status === "AVAILABLE" || c.status === "NO_SHOW_RELEASED"
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-900/40 via-cyan-900/30 to-purple-900/40 border border-[var(--border-subtle)] shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/25 shrink-0">
            <Cpu size={30} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Live Station Operation
              </span>
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 ${
                  connectionStatus === "LIVE"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : connectionStatus === "RECONNECTING"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === "LIVE"
                      ? "bg-emerald-500 animate-pulse"
                      : connectionStatus === "RECONNECTING"
                      ? "bg-amber-500 animate-bounce"
                      : "bg-rose-500"
                  }`}
                />
                ● {connectionStatus}
              </span>
            </div>
            <h1 className="text-2xl font-black text-[var(--text-primary)] mt-1 tracking-tight">
              Station Control Center
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">
              Smart Reservation Protection • Walk-In Arrivals • Conflict Engine • Real-Time Grid
            </p>
          </div>
        </div>

        {/* Top Controls: Station Selector & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          {stations.length > 0 && (
            <select
              value={selectedStationId || ""}
              onChange={(e) => setSelectedStationId(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none shadow-sm cursor-pointer"
            >
              {stations.map((s) => {
                const sId = s.stationId || s.id || s._id;
                return (
                  <option key={sId} value={sId}>
                    {s.name || s.stationName || s.station_name || `Station ${sId}`}
                  </option>
                );
              })}
            </select>
          )}

          <button
            onClick={() => setShowOfflineModal(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition cursor-pointer hover:scale-102"
          >
            <UserPlus size={16} />
            <span>Walk-In Check-In</span>
          </button>

          <button
            onClick={() => setShowPolicyModal(true)}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center gap-2 transition cursor-pointer"
            title="Configure Reservation Policy"
          >
            <Sliders size={16} className="text-purple-500" />
            <span>Policy</span>
          </button>

          <button
            onClick={() => loadLiveStatus(true)}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] transition cursor-pointer"
            title="Refresh Live Status"
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin text-blue-500" : ""} />
          </button>
        </div>
      </div>

      {/* Smart Reservation Monitor KPI Cards */}
      <SmartReservationMonitor
        metrics={metrics}
        onCardClick={(tabKey) => {
          if (tabKey === "reservations") setActiveTab("reservations");
          if (tabKey === "offline") setActiveTab("offline");
          if (tabKey === "queue") setActiveTab("queue");
          if (tabKey === "conflicts") setActiveTab("audit");
          if (tabKey === "charging" || tabKey === "protected") setActiveTab("chargers");
        }}
      />

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 overflow-x-auto gap-2">
        <div className="flex items-center gap-1.5">
          {[
            { id: "chargers", label: "Live Charger Grid", icon: Zap, count: chargerGrid.length },
            { id: "reservations", label: "Online Reservations", icon: Clock, count: onlineBookings.length },
            { id: "offline", label: "Offline Walk-Ins", icon: UserPlus, count: offlineBookings.length },
            { id: "queue", label: "Smart Queue", icon: Users, count: queueEntries.length },
            { id: "audit", label: "Audit Logs & Conflicts", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-[var(--accent-primary)] text-white shadow-md shadow-blue-500/20"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)]"
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                      isActive ? "bg-white/20 text-white" : "bg-[var(--bg-surface)] text-[var(--text-muted)]"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Live Charger Grid */}
      {activeTab === "chargers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-[var(--text-primary)] flex items-center gap-2">
              <Zap size={18} className="text-emerald-500" />
              Real-Time Charger Grid & Occupancy
            </h2>
            <span className="text-xs text-[var(--text-muted)] font-mono">
              🟢 {metrics.availableCount || 0} Available • 🔵 {metrics.reservedCount || 0} Reserved • 🟡 {metrics.protectedCount || 0} Protected • 🟠 {metrics.chargingCount || 0} Charging
            </span>
          </div>

          <LiveChargerGrid
            chargers={chargerGrid}
            onOpenOfflineCheckIn={(slot) => setShowOfflineModal(true)}
            onCheckInBooking={handleCheckInBooking}
            onStartCharging={handleStartCharging}
            onStopCharging={handleStopCharging}
            onSetStatus={handleSetStatus}
            onReleaseSlot={(slot) => {
              if (slot.occupant?.bookingId) {
                handleMarkNoShow(slot.occupant.bookingId);
              }
            }}
            onOpenOverride={(bookingId, charger) => {
              setOverrideBookingId(bookingId);
              setOverrideCharger(charger);
              setShowOverrideModal(true);
            }}
            userRole={role}
          />
        </div>
      )}

      {/* Tab 2: Online Reservations List */}
      {activeTab === "reservations" && (
        <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-[var(--text-primary)]">
                Today's Online Reservations
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Authoritative server-time protection and auto no-show enforcement
              </p>
            </div>
          </div>

          {onlineBookings.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-xl">
              No online reservations scheduled for today.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Booking ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Vehicle</th>
                    <th className="py-3 px-4">Slot</th>
                    <th className="py-3 px-4">Time Window</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {onlineBookings.map((b) => (
                    <tr key={b.id || b.bookingId} className="hover:bg-[var(--bg-surface-raised)] transition">
                      <td className="py-3 px-4 font-mono font-bold text-blue-500">
                        {b.bookingId}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[var(--text-primary)]">{b.customerName}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">{b.phone}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[var(--text-primary)]">
                        {b.vehicleNumber}
                      </td>
                      <td className="py-3 px-4 font-bold text-[var(--text-primary)]">
                        {b.slotNumber}
                      </td>
                      <td className="py-3 px-4 font-mono text-[var(--text-muted)]">
                        {b.startTime?.slice(0, 5)} - {b.endTime?.slice(0, 5)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono border ${
                            b.status === "CHECKED_IN" || b.status === "CHARGING"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                              : b.status === "PROTECTED"
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                              : b.status === "NO_SHOW"
                              ? "bg-rose-500/10 text-rose-500 border-rose-500/30"
                              : "bg-blue-500/10 text-blue-500 border-blue-500/30"
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {b.status !== "CHECKED_IN" && b.status !== "NO_SHOW" && b.status !== "COMPLETED" && (
                          <button
                            onClick={() => handleCheckInBooking(b.bookingId)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer"
                          >
                            Check-In
                          </button>
                        )}
                        {b.status !== "NO_SHOW" && b.status !== "COMPLETED" && (
                          <button
                            onClick={() => handleMarkNoShow(b.bookingId)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-red-500 hover:bg-red-500/10 border border-red-500/20 transition cursor-pointer"
                          >
                            No-Show
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Offline Walk-In Bookings */}
      {activeTab === "offline" && (
        <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-[var(--text-primary)]">
                Today's Offline Walk-In Customers
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Physical walk-ins verified against conflict protection engine
              </p>
            </div>
            <button
              onClick={() => setShowOfflineModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus size={14} />
              <span>+ New Walk-In</span>
            </button>
          </div>

          {offlineBookings.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-xl">
              No walk-in customer records for today yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Offline ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Vehicle</th>
                    <th className="py-3 px-4">Slot</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Amount / Payment</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {offlineBookings.map((ob) => (
                    <tr key={ob.id || ob.offline_booking_id} className="hover:bg-[var(--bg-surface-raised)] transition">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-500">
                        {ob.offline_booking_id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[var(--text-primary)]">{ob.customer_name}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">{ob.customer_phone}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[var(--text-primary)]">
                        {ob.vehicle_number}
                      </td>
                      <td className="py-3 px-4 font-bold text-[var(--text-primary)]">
                        {ob.slot_number || `Slot #${ob.slot_id}`}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-muted)]">
                        {ob.duration_minutes} Mins
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-[var(--text-primary)]">₹{ob.amount}</span>
                        <span className="text-[11px] text-[var(--text-muted)] ml-1">({ob.payment_method})</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                          {ob.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Smart Queue Management */}
      {activeTab === "queue" && (
        <QueueManagementCard
          queue={queueEntries}
          availableChargers={availableChargersForWalkIn}
          onAssignQueue={handleAssignQueue}
          onLeaveQueue={handleLeaveQueue}
          onOpenJoinQueue={() => setShowOfflineModal(true)}
        />
      )}

      {/* Tab 5: Audit Logs & Conflicts */}
      {activeTab === "audit" && (
        <AuditLogsView stationId={selectedStationId} />
      )}

      {/* Offline Check-In Modal */}
      <OfflineCheckInModal
        isOpen={showOfflineModal}
        onClose={() => setShowOfflineModal(false)}
        stationId={selectedStationId}
        stationName={activeStationInfo?.name || "GreenCharge Central"}
        availableChargers={chargerGrid}
        onSuccess={() => loadLiveStatus(false)}
      />

      {/* Reservation Policy Modal */}
      <ReservationPolicyModal
        isOpen={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
        stationId={selectedStationId}
        onSaved={() => loadLiveStatus(false)}
      />

      {/* Manual Override Modal */}
      <ManualOverrideModal
        isOpen={showOverrideModal}
        onClose={() => setShowOverrideModal(false)}
        bookingId={overrideBookingId}
        chargerData={overrideCharger}
        onSuccess={() => loadLiveStatus(false)}
      />
    </div>
  );
}

// Sub-component for Audit Logs View
function AuditLogsView({ stationId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    smartReservationService
      .getAuditLogs({ stationId, limit: 30 })
      .then((res) => {
        if (res?.data) setLogs(res.data);
      })
      .finally(() => setLoading(false));
  }, [stationId]);

  return (
    <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-[var(--text-primary)]">
            Station Audit Logs & Reservation Conflict History
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Complete traceability of conflict blocks, walk-in assignments, no-shows, and manual overrides
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-[var(--text-muted)]">Loading audit records...</div>
      ) : logs.length === 0 ? (
        <div className="p-8 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-xl">
          No audit logs recorded for this station yet.
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
          {logs.map((log) => (
            <div
              key={log.id || log.log_id}
              className="p-3.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex items-start justify-between gap-3 text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono font-bold text-[10px] px-2 py-0.5 rounded border ${
                      log.action.includes("CONFLICT") || log.action.includes("BLOCKED")
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                        : log.action.includes("OVERRIDE")
                        ? "bg-red-500/10 text-red-500 border-red-500/30"
                        : log.action.includes("NO_SHOW")
                        ? "bg-rose-500/10 text-rose-500 border-rose-500/30"
                        : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                    }`}
                  >
                    {log.action}
                  </span>
                  {log.booking_id && (
                    <span className="font-mono text-blue-500 font-bold">{log.booking_id}</span>
                  )}
                  {log.charger_id && (
                    <span className="text-[var(--text-muted)] font-mono">• {log.charger_id}</span>
                  )}
                </div>
                <p className="text-[var(--text-primary)] font-medium mt-1">{log.reason || "System event"}</p>
              </div>

              <span className="text-[10px] text-[var(--text-muted)] font-mono shrink-0">
                {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
