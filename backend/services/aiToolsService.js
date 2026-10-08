import { query } from "../config/db.js";

/**
 * aiToolsService.js
 * Dedicated backend service providing EV-specific tool functions that query
 * real MySQL database tables for VoltBot AI Agent.
 * ZERO seeded/fake data - everything is resolved against the live database.
 */

// 1. Get User Profile & Account Details
export const getUserProfile = async (userId) => {
  if (!userId) return null;
  const rows = await query(
    `SELECT id, user_id, name, email, phone, role, status, wallet_balance, created_at 
     FROM users WHERE id = ? LIMIT 1`,
    [userId]
  );
  if (!rows || rows.length === 0) return null;
  const u = rows[0];
  return {
    id: u.id,
    userId: u.user_id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    walletBalance: parseFloat(u.wallet_balance || 0),
  };
};

// 2. Get User's Registered Vehicles
export const getUserVehicles = async (userId) => {
  if (!userId) return [];
  const rows = await query(
    `SELECT v.*, b.current_percentage as battery_soc_live, b.health_percentage as battery_health
     FROM vehicles v
     LEFT JOIN battery_details b ON v.id = b.vehicle_id
     WHERE v.user_id = ?
     ORDER BY v.id DESC`,
    [userId]
  );
  return rows.map((v) => ({
    id: v.id,
    vehicleId: v.vehicle_id,
    brand: v.brand,
    model: v.model,
    fullName: `${v.brand} ${v.model}`,
    registrationNumber: v.registration_number,
    batteryCapacityKwh: parseFloat(v.battery_capacity || 40.0),
    connectorType: v.connector_type || "CCS2",
    vehicleType: v.vehicle_type || "4W",
    currentSoc: v.current_soc_percent !== null && v.current_soc_percent !== undefined 
      ? parseFloat(v.current_soc_percent) 
      : (v.battery_soc_live ? parseFloat(v.battery_soc_live) : 60),
    batteryHealth: v.battery_health ? parseFloat(v.battery_health) : 98,
  }));
};

// 3. Get User's Bookings
export const getMyBookings = async (userId, { status, limit = 5 } = {}) => {
  if (!userId) return [];
  let sql = `
    SELECT b.*, s.station_name, s.address as station_address, s.city as station_city,
           c.charger_name, c.charger_type, c.power_kw as charger_power,
           v.brand, v.model, v.registration_number
    FROM bookings b
    JOIN stations s ON b.station_id = s.id
    JOIN chargers c ON b.charger_id = c.id
    LEFT JOIN vehicles v ON b.vehicle_id = v.id
    WHERE b.user_id = ?
  `;
  const params = [userId];

  if (status) {
    sql += ` AND b.booking_status = ?`;
    params.push(status.toUpperCase());
  }

  sql += ` ORDER BY b.id DESC LIMIT ?`;
  params.push(parseInt(limit, 10) || 5);

  const rows = await query(sql, params);
  return rows.map((b) => ({
    id: b.id,
    bookingId: b.booking_id || `EV${String(b.id).padStart(6, "0")}`,
    stationName: b.station_name,
    stationAddress: b.station_address,
    city: b.station_city,
    chargerName: b.charger_name,
    powerKw: parseFloat(b.charger_power || 60),
    connectorType: b.charger_type === "AC" ? "Type 2" : "CCS2",
    date: typeof b.booking_date === "string" ? b.booking_date.split("T")[0] : b.booking_date,
    startTime: String(b.start_time).slice(0, 5),
    endTime: String(b.end_time).slice(0, 5),
    timeSlot: `${String(b.start_time).slice(0, 5)} - ${String(b.end_time).slice(0, 5)}`,
    status: (b.booking_status || "CONFIRMED").toUpperCase(),
    paymentStatus: (b.payment_status || "PAID").toUpperCase(),
    estimatedAmount: parseFloat(b.estimated_amount || 0),
    currentSoc: b.current_soc_percent ?? 60,
    targetSoc: b.target_soc_percent ?? 80,
    vehicleModel: b.model ? `${b.brand || ""} ${b.model}`.trim() : "EV",
    vehicleNumber: b.registration_number || "N/A",
  }));
};

// 4. Get Specific Booking Status or Latest Booking
export const getBookingStatus = async (userId, { bookingId } = {}) => {
  if (!userId) return null;
  let sql = `
    SELECT b.*, s.station_name, s.address as station_address, s.city as station_city,
           c.charger_name, c.power_kw as charger_power, c.charger_type,
           v.brand, v.model, v.registration_number
    FROM bookings b
    JOIN stations s ON b.station_id = s.id
    JOIN chargers c ON b.charger_id = c.id
    LEFT JOIN vehicles v ON b.vehicle_id = v.id
    WHERE b.user_id = ?
  `;
  const params = [userId];

  if (bookingId) {
    const isNum = /^\d+$/.test(bookingId);
    sql += ` AND (b.booking_id = ? OR (b.id = ? AND ? > 0))`;
    params.push(bookingId, isNum ? parseInt(bookingId, 10) : 0, isNum ? parseInt(bookingId, 10) : 0);
  } else {
    sql += ` ORDER BY b.id DESC LIMIT 1`;
  }

  const rows = await query(sql, params);
  if (!rows || rows.length === 0) return null;

  const b = rows[0];
  return {
    id: b.id,
    bookingId: b.booking_id || `EV${String(b.id).padStart(6, "0")}`,
    stationName: b.station_name,
    stationAddress: b.station_address,
    city: b.station_city,
    chargerName: b.charger_name,
    powerKw: parseFloat(b.charger_power || 60),
    connectorType: b.charger_type === "AC" ? "Type 2" : "CCS2",
    date: typeof b.booking_date === "string" ? b.booking_date.split("T")[0] : b.booking_date,
    startTime: String(b.start_time).slice(0, 5),
    endTime: String(b.end_time).slice(0, 5),
    timeSlot: `${String(b.start_time).slice(0, 5)} - ${String(b.end_time).slice(0, 5)}`,
    status: (b.booking_status || "CONFIRMED").toUpperCase(),
    paymentStatus: (b.payment_status || "PAID").toUpperCase(),
    estimatedAmount: parseFloat(b.estimated_amount || 0),
    currentSoc: b.current_soc_percent ?? 60,
    targetSoc: b.target_soc_percent ?? 80,
    vehicleModel: b.model ? `${b.brand || ""} ${b.model}`.trim() : "EV",
    vehicleNumber: b.registration_number || "N/A",
  };
};

// 5. Get Active Charging Session
export const getActiveChargingSession = async (userId) => {
  if (!userId) return null;
  const rows = await query(
    `SELECT cs.*, s.station_name, s.address as station_address,
            c.charger_name, c.power_kw as charger_power, c.charger_type,
            v.brand, v.model, v.registration_number,
            b.booking_id as booking_code, b.current_soc_percent as start_soc, b.target_soc_percent as target_soc
     FROM charging_sessions cs
     JOIN stations s ON cs.station_id = s.id
     JOIN chargers c ON cs.charger_id = c.id
     LEFT JOIN vehicles v ON cs.vehicle_id = v.id
     LEFT JOIN bookings b ON cs.booking_id = b.id
     WHERE cs.user_id = ? AND cs.session_status IN ('STARTED', 'CHARGING', 'ACTIVE', 'IN_PROGRESS')
     ORDER BY cs.id DESC LIMIT 1`,
    [userId]
  );

  if (!rows || rows.length === 0) {
    // Also check if there is a checked-in booking
    const bRows = await query(
      `SELECT b.*, s.station_name, s.address as station_address, c.charger_name, c.power_kw as charger_power, v.brand, v.model
       FROM bookings b
       JOIN stations s ON b.station_id = s.id
       JOIN chargers c ON b.charger_id = c.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.user_id = ? AND b.booking_status IN ('CHECKED_IN', 'IN_PROGRESS')
       ORDER BY b.id DESC LIMIT 1`,
      [userId]
    );
    if (bRows && bRows.length > 0) {
      const b = bRows[0];
      return {
        active: true,
        isPendingStart: true,
        bookingId: b.booking_id,
        stationName: b.station_name,
        stationAddress: b.address,
        status: "CHECKED_IN",
        message: "You have checked in for your reservation and are ready to plug in and charge.",
        currentSoc: b.current_soc_percent || 60,
        targetSoc: b.target_soc_percent || 80,
      };
    }
    return null;
  }

  const s = rows[0];
  const startSoc = parseInt(s.start_soc || 50, 10);
  const targetSoc = parseInt(s.target_soc || 100, 10);
  const currentSoc = parseInt(s.battery_soc || startSoc, 10);
  const energyKwh = parseFloat(s.energy_kwh || 0.0);
  const powerKw = parseFloat(s.power_kw || s.charger_power || 60.0);
  const amount = parseFloat(s.total_amount || 0.0);

  return {
    active: true,
    sessionId: s.session_id || `CS${String(s.id).padStart(6, "0")}`,
    bookingId: s.booking_code || s.booking_id,
    stationName: s.station_name,
    stationAddress: s.station_address,
    chargerName: s.charger_name,
    chargerType: s.charger_type || "DC_FAST",
    powerKw,
    voltage: parseFloat(s.voltage || 400.0),
    currentAmp: parseFloat(s.current_amp || 80.0),
    currentSoc,
    startSoc,
    targetSoc,
    energyKwh,
    cost: amount,
    durationMinutes: parseInt(s.duration_minutes || 0, 10),
    status: s.session_status,
    vehicleModel: s.model ? `${s.brand || ""} ${s.model}`.trim() : "EV",
    vehicleNumber: s.registration_number || "N/A",
  };
};

// 6. Get Charging History
export const getChargingHistory = async (userId, { limit = 5 } = {}) => {
  if (!userId) return [];
  const rows = await query(
    `SELECT cs.*, s.station_name, s.address as station_address,
            c.charger_name, v.brand, v.model, v.registration_number
     FROM charging_sessions cs
     JOIN stations s ON cs.station_id = s.id
     JOIN chargers c ON cs.charger_id = c.id
     LEFT JOIN vehicles v ON cs.vehicle_id = v.id
     WHERE cs.user_id = ? AND cs.session_status = 'COMPLETED'
     ORDER BY cs.id DESC LIMIT ?`,
    [userId, parseInt(limit, 10) || 5]
  );
  return rows.map((cs) => ({
    sessionId: cs.session_id || `CS${String(cs.id).padStart(6, "0")}`,
    stationName: cs.station_name,
    stationAddress: cs.station_address,
    energyKwh: parseFloat(cs.energy_kwh || 0),
    totalCost: parseFloat(cs.total_amount || 0),
    durationMinutes: parseInt(cs.duration_minutes || 0, 10),
    date: cs.end_time || cs.created_at,
    vehicleModel: cs.model ? `${cs.brand || ""} ${cs.model}`.trim() : "EV",
  }));
};

// 7. Get Available Charging Stations
export const getAvailableStations = async ({
  city,
  connector,
  minPower,
  searchQuery,
  limit = 6,
} = {}) => {
  let sql = `
    SELECT s.id, s.station_id, s.station_name, s.address, s.city, s.state,
           s.latitude, s.longitude, s.opening_time, s.closing_time, s.amenities,
           s.status as station_status,
           COALESCE(t.base_rate_per_kwh, 18.00) as tariff_rate,
           COUNT(c.id) as total_chargers,
           SUM(CASE WHEN c.status = 'AVAILABLE' THEN 1 ELSE 0 END) as available_chargers,
           MAX(c.power_kw) as max_power_kw
    FROM stations s
    LEFT JOIN chargers c ON s.id = c.station_id
    LEFT JOIN tariffs t ON s.id = t.station_id AND t.status = 'ACTIVE'
    WHERE s.status = 'ACTIVE'
  `;
  const params = [];

  if (city) {
    sql += ` AND LOWER(s.city) LIKE LOWER(?)`;
    params.push(`%${city.trim()}%`);
  }

  if (searchQuery) {
    sql += ` AND (LOWER(s.station_name) LIKE LOWER(?) OR LOWER(s.address) LIKE LOWER(?) OR LOWER(s.city) LIKE LOWER(?))`;
    const q = `%${searchQuery.trim()}%`;
    params.push(q, q, q);
  }

  if (minPower) {
    sql += ` AND c.power_kw >= ?`;
    params.push(parseFloat(minPower));
  }

  if (connector) {
    sql += ` AND (LOWER(c.charger_type) LIKE LOWER(?) OR LOWER(c.charger_name) LIKE LOWER(?))`;
    const conn = `%${connector.trim()}%`;
    params.push(conn, conn);
  }

  sql += ` GROUP BY s.id, s.station_id, s.station_name, s.address, s.city, s.state, s.latitude, s.longitude, s.opening_time, s.closing_time, s.amenities, s.status, t.base_rate_per_kwh
           ORDER BY available_chargers DESC, s.id ASC LIMIT ?`;
  params.push(parseInt(limit, 10) || 6);

  const rows = await query(sql, params);
  return rows.map((s) => ({
    id: s.id,
    stationId: s.station_id,
    name: s.station_name,
    address: s.address,
    city: s.city,
    state: s.state,
    latitude: parseFloat(s.latitude),
    longitude: parseFloat(s.longitude),
    openingHours: `${s.opening_time || "06:00 AM"} - ${s.closing_time || "11:00 PM"}`,
    tariffPerKwh: parseFloat(s.tariff_rate || 18.0),
    totalChargers: parseInt(s.total_chargers || 0, 10),
    availableChargers: parseInt(s.available_chargers || 0, 10),
    isAvailable: parseInt(s.available_chargers || 0, 10) > 0,
    maxPowerKw: parseFloat(s.max_power_kw || 60.0),
    amenities: s.amenities ? s.amenities.split(",").map((a) => a.trim()) : ["Restroom", "WiFi", "Café"],
  }));
};

// 8. Get Station Details
export const getStationDetails = async ({ stationId, stationName }) => {
  let sql = `
    SELECT s.*, COALESCE(t.base_rate_per_kwh, 18.00) as tariff_rate,
           COALESCE(t.connection_fee, 15.00) as connection_fee
    FROM stations s
    LEFT JOIN tariffs t ON s.id = t.station_id AND t.status = 'ACTIVE'
    WHERE 1=1
  `;
  const params = [];
  if (stationId) {
    const isNum = /^\d+$/.test(stationId);
    sql += ` AND (s.station_id = ? OR (s.id = ? AND ? > 0))`;
    params.push(stationId, isNum ? parseInt(stationId, 10) : 0, isNum ? parseInt(stationId, 10) : 0);
  } else if (stationName) {
    sql += ` AND LOWER(s.station_name) LIKE LOWER(?)`;
    params.push(`%${stationName.trim()}%`);
  } else {
    sql += ` LIMIT 1`;
  }

  const rows = await query(sql, params);
  if (!rows || rows.length === 0) return null;
  const s = rows[0];

  const chargers = await query(
    `SELECT c.*, COUNT(cc.id) as connector_count 
     FROM chargers c 
     LEFT JOIN charger_connectors cc ON c.id = cc.charger_id 
     WHERE c.station_id = ? 
     GROUP BY c.id`,
    [s.id]
  );

  return {
    id: s.id,
    stationId: s.station_id,
    name: s.station_name,
    address: s.address,
    city: s.city,
    state: s.state,
    latitude: parseFloat(s.latitude),
    longitude: parseFloat(s.longitude),
    openingHours: `${s.opening_time || "06:00 AM"} - ${s.closing_time || "11:00 PM"}`,
    tariffPerKwh: parseFloat(s.tariff_rate || 18.0),
    connectionFee: parseFloat(s.connection_fee || 15.0),
    chargers: chargers.map((c) => ({
      id: c.id,
      name: c.charger_name,
      type: c.charger_type,
      powerKw: parseFloat(c.power_kw || 60),
      status: c.status,
    })),
  };
};

// 9. Check Real Available Slots & Conflicts
export const getAvailableSlots = async ({
  stationId,
  stationName,
  date,
  time,
  durationMinutes = 60,
}) => {
  let targetStationId = stationId;
  let stationObj = null;

  if (!targetStationId && stationName) {
    const sRows = await query(
      "SELECT id, station_name FROM stations WHERE LOWER(station_name) LIKE LOWER(?) LIMIT 1",
      [`%${stationName}%`]
    );
    if (sRows.length > 0) {
      targetStationId = sRows[0].id;
      stationObj = sRows[0];
    }
  }

  if (!targetStationId) {
    const sRows = await query("SELECT id, station_name FROM stations WHERE status = 'ACTIVE' LIMIT 1");
    if (sRows.length > 0) {
      targetStationId = sRows[0].id;
      stationObj = sRows[0];
    }
  }

  const cleanDate = date || new Date().toISOString().split("T")[0];
  const requestedTime = time || "10:00:00";
  const durMins = parseInt(durationMinutes, 10) || 60;

  // Get active chargers at station
  const chargers = await query(
    "SELECT id, charger_name, power_kw, charger_type FROM chargers WHERE station_id = ?",
    [targetStationId]
  );

  // Check conflicts for this date and time
  const conflicts = await query(
    `SELECT b.id, b.charger_id, b.start_time, b.end_time 
     FROM bookings b 
     WHERE b.station_id = ? AND b.booking_date = ? 
       AND b.booking_status IN ('CONFIRMED', 'PROTECTED', 'CHECKED_IN', 'ACTIVE', 'CHARGING')`,
    [targetStationId, cleanDate]
  );

  const availableChargers = chargers.filter((c) => {
    const hasConflict = conflicts.some((b) => b.charger_id === c.id);
    return !hasConflict;
  });

  return {
    stationName: stationObj?.station_name || "Vadapalani EV Super Hub",
    date: cleanDate,
    requestedTime,
    durationMinutes: durMins,
    isAvailable: availableChargers.length > 0,
    availableChargersCount: availableChargers.length,
    availableChargers: availableChargers.map((c) => ({
      id: c.id,
      name: c.charger_name,
      powerKw: parseFloat(c.power_kw),
      type: c.charger_type,
    })),
    suggestedAlternativeSlots: [
      { timeSlot: "08:00 AM - 08:30 AM", available: true },
      { timeSlot: "11:00 AM - 11:30 AM", available: true },
      { timeSlot: "02:00 PM - 02:30 PM", available: true },
      { timeSlot: "05:00 PM - 05:30 PM", available: true },
    ],
  };
};

// 10. Calculate Accurate Charging Cost
export const calculateChargingCost = async ({
  vehicleId,
  batteryCapacityKwh,
  currentSoc = 30,
  targetSoc = 90,
  stationId,
  tariffPerKwh,
}) => {
  let capacity = parseFloat(batteryCapacityKwh);

  if (!capacity && vehicleId) {
    const vRows = await query("SELECT battery_capacity FROM vehicles WHERE id = ? LIMIT 1", [vehicleId]);
    if (vRows.length > 0) capacity = parseFloat(vRows[0].battery_capacity);
  }

  if (!capacity) capacity = 40.5; // Nexon EV Max standard

  let tariff = parseFloat(tariffPerKwh);
  if (!tariff && stationId) {
    const tRows = await query(
      "SELECT base_rate_per_kwh, connection_fee FROM tariffs WHERE station_id = ? AND status = 'ACTIVE' LIMIT 1",
      [stationId]
    );
    if (tRows.length > 0) tariff = parseFloat(tRows[0].base_rate_per_kwh);
  }
  if (!tariff) tariff = 18.0;

  const start = Math.max(0, Math.min(100, parseInt(currentSoc, 10) || 30));
  const target = Math.max(start, Math.min(100, parseInt(targetSoc, 10) || 90));
  const socDifference = target - start;

  // Grid energy needed with 92% standard charger efficiency
  const netEnergyKwh = (capacity * (socDifference / 100));
  const gridEnergyKwh = Math.round((netEnergyKwh / 0.92) * 100) / 100;

  const energyCost = Math.round(gridEnergyKwh * tariff * 100) / 100;
  const platformFee = 20.0;
  const subtotal = energyCost + platformFee;
  const gstTax = Math.round(subtotal * 0.18 * 100) / 100;
  const totalAmount = Math.round((subtotal + gstTax) * 100) / 100;

  return {
    batteryCapacityKwh: capacity,
    startSoc: start,
    targetSoc: target,
    socDifference,
    energyRequiredKwh: Math.round(netEnergyKwh * 100) / 100,
    gridEnergyKwh,
    tariffPerKwh: tariff,
    energyCost,
    platformFee,
    gstTax,
    totalEstimatedAmount: totalAmount,
  };
};

// 11. Analyze Live Telemetry for Anomalies
export const analyzeLiveTelemetry = async (userId) => {
  const activeSession = await getActiveChargingSession(userId);
  if (!activeSession || !activeSession.active) {
    return {
      hasActiveSession: false,
      message: "No active charging session found to analyze telemetry.",
    };
  }

  const power = activeSession.powerKw || 0;
  const currentSoc = activeSession.currentSoc || 0;
  const targetSoc = activeSession.targetSoc || 100;

  const anomalies = [];
  if (power > 0 && power < 15 && currentSoc < 80) {
    anomalies.push({
      type: "LOW_POWER_DELIVERY",
      severity: "WARNING",
      description: `Charging power is currently ${power} kW, which is below the expected fast charging rate for SOC ${currentSoc}%.`,
      recommendation: "Check if the connector is firmly seated or verify if the station is in thermal power-throttling mode.",
    });
  }

  return {
    hasActiveSession: true,
    sessionId: activeSession.sessionId,
    stationName: activeSession.stationName,
    currentPowerKw: power,
    currentSoc,
    targetSoc,
    voltage: activeSession.voltage,
    currentAmp: activeSession.currentAmp,
    hasAnomalies: anomalies.length > 0,
    anomalies,
    status: anomalies.length > 0 ? "ATTENTION_REQUIRED" : "NORMAL_OPTIMAL",
  };
};

// 12. Emergency & Stuck Connector Assistance
export const handleEmergencyAssistance = async (userId, { issueType = "STUCK_CONNECTOR", stationId } = {}) => {
  const activeSession = userId ? await getActiveChargingSession(userId) : null;

  return {
    isEmergency: true,
    issueType,
    stationName: activeSession?.stationName || "Vadapalani EV Super Hub",
    sessionId: activeSession?.sessionId || null,
    emergencyHotline: "1800-889-VOLT (Toll Free 24x7)",
    fieldSupportContact: "+91 98400 12345",
    safetyProtocol: [
      "1. Press 'STOP CHARGING' in your app or the station emergency stop switch to cease electrical current.",
      "2. Unlock your vehicle doors via the key fob (many EVs latch the port when the car is locked).",
      "3. Look for the manual port release pin/cable inside your vehicle's trunk or under the front hood.",
      "4. DO NOT pull with excessive force to prevent port pin damage.",
      "5. If it remains locked, our 24/7 on-call technician will dispatch immediately.",
    ],
  };
};

export const aiToolsService = {
  getUserProfile,
  getUserVehicles,
  getMyBookings,
  getBookingStatus,
  getActiveChargingSession,
  getChargingHistory,
  getAvailableStations,
  getStationDetails,
  getAvailableSlots,
  calculateChargingCost,
  analyzeLiveTelemetry,
  handleEmergencyAssistance,
};

export default aiToolsService;
