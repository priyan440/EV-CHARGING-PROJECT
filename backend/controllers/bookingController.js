import { query, transaction } from "../config/db.js";
import {
  emitBookingCreated,
  emitBookingUpdated,
  emitBookingCancelled,
  emitBookingCompleted,
} from "../services/socketService.js";
import { calculateChargingEstimate } from "./chargingSessionController.js";

// Helper to generate next unique booking ID (e.g. EV000001, EV000002)
const generateNextBookingId = async (connection) => {
  const [rows] = await connection.execute(
    "SELECT COALESCE(MAX(id), 0) as maxId FROM bookings"
  );
  const nextId = (rows[0]?.maxId || 0) + 1;
  return `EV${String(nextId).padStart(6, "0")}`;
};

// Helper to add minutes to HH:MM or HH:MM:SS string
export const calculateEndTimeString = (startTimeStr, durationMinutes) => {
  try {
    const parts = (startTimeStr || "10:00:00").split(":");
    let hours = parseInt(parts[0], 10) || 10;
    let minutes = parseInt(parts[1], 10) || 0;

    let totalMins = hours * 60 + minutes + Math.round(durationMinutes);
    let endHours = Math.floor(totalMins / 60) % 24;
    let endMins = totalMins % 60;

    return `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}:00`;
  } catch {
    return "11:00:00";
  }
};

// Helper to format minutes into human string
const formatDurationHuman = (minutes) => {
  const mins = Math.round(minutes || 60);
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs > 0 && remMins > 0) return `${hrs} hr ${remMins} min`;
  if (hrs > 0) return `${hrs} hr`;
  return `${mins} min`;
};

// Helper to format booking for frontend with all relational data
export const formatBooking = (b) => {
  const amount = parseFloat(b.estimated_amount || b.amount) || 0;
  const tariffRate = b.tariff_per_kwh !== null && b.tariff_per_kwh !== undefined
    ? parseFloat(b.tariff_per_kwh)
    : (b.tariff_rate_snapshot !== null && b.tariff_rate_snapshot !== undefined
      ? parseFloat(b.tariff_rate_snapshot)
      : (b.rate_per_kwh !== null && b.rate_per_kwh !== undefined ? parseFloat(b.rate_per_kwh) : 15.0));
      
  const platformFee = b.platform_fee !== null && b.platform_fee !== undefined
    ? parseFloat(b.platform_fee)
    : (b.connection_fee_snapshot !== null && b.connection_fee_snapshot !== undefined ? parseFloat(b.connection_fee_snapshot) : 10.0);
    
  const energyCost = b.estimated_energy_cost !== null && b.estimated_energy_cost !== undefined
    ? parseFloat(b.estimated_energy_cost)
    : 0;

  const energyReq = b.energy_required_kwh !== null && b.energy_required_kwh !== undefined
    ? parseFloat(b.energy_required_kwh)
    : 0;

  const gridEnergy = b.estimated_grid_energy_kwh !== null && b.estimated_grid_energy_kwh !== undefined
    ? parseFloat(b.estimated_grid_energy_kwh)
    : 0;

  const currentSoc = b.current_soc_percent !== null && b.current_soc_percent !== undefined
    ? parseInt(b.current_soc_percent, 10)
    : 60;

  const targetSoc = b.target_soc_percent !== null && b.target_soc_percent !== undefined
    ? parseInt(b.target_soc_percent, 10)
    : 80;

  const batteryCapacity = b.battery_capacity_kwh_snapshot !== null && b.battery_capacity_kwh_snapshot !== undefined
    ? parseFloat(b.battery_capacity_kwh_snapshot)
    : (parseFloat(b.battery_capacity) || 40.5);

  const durationMins = parseInt(b.duration_minutes || b.duration, 10) || 60;
  const rawStatus = (b.booking_status || b.status || "CONFIRMED").toUpperCase();
  const rawPaymentStatus = (b.payment_status || "PENDING").toUpperCase();

  const rawDate = b.booking_date
    ? (typeof b.booking_date === "string" ? b.booking_date.split("T")[0] : new Date(b.booking_date).toISOString().split("T")[0])
    : null;

  const startTimeStr = b.start_time ? String(b.start_time).slice(0, 8) : null;
  const endTimeStr = b.end_time ? String(b.end_time).slice(0, 8) : (startTimeStr ? calculateEndTimeString(startTimeStr, durationMins) : null);

  const connectorName = b.connector_number || (b.connector_id_code ? `Connector ${b.connector_id_code}` : `Connector 01`);
  const connectorTypeName = b.connector_type_name || b.vehicle_connector_type || b.connector_type || "CCS2";
  const powerKw = parseFloat(b.connector_power_kw || b.power_kw) || 150.0;
  const effectivePowerKw = parseFloat(b.effective_charging_power_kw) || powerKw;

  return {
    id: b.id,
    bookingId: b.booking_id || `EV${String(b.id).padStart(4, "0")}`,
    booking_id: b.booking_id || `EV${String(b.id).padStart(4, "0")}`,
    bookingCode: b.booking_id || `EV${String(b.id).padStart(4, "0")}`,
    userId: b.user_id,
    user_id: b.user_id,
    customerName: b.customer_name || b.user_name || null,
    customerEmail: b.customer_email || b.user_email || null,
    customerPhone: b.customer_phone || b.user_phone || null,
    
    // Vehicle & Battery Specs
    vehicleId: b.vehicle_id,
    vehicle_id: b.vehicle_id,
    vehicleNumber: b.registration_number || b.vehicle_number || null,
    registrationNumber: b.registration_number || b.vehicle_number || null,
    vehicleModel: b.model ? `${b.brand || ""} ${b.model}`.trim() : (b.vehicle_model || null),
    vehicleBrand: b.brand || null,
    vehicleType: b.vehicle_type || "4W",
    vehicleConnectorType: connectorTypeName,
    batteryCapacity,
    batteryCapacityKwh: batteryCapacity,
    battery_capacity_kwh: batteryCapacity,
    
    // SOC Requirements & Energy Estimates
    currentSoc,
    current_soc: currentSoc,
    current_soc_percent: currentSoc,
    currentBattery: currentSoc,
    targetSoc,
    target_soc: targetSoc,
    target_soc_percent: targetSoc,
    targetBattery: targetSoc,
    socDifference: targetSoc - currentSoc,
    energyRequiredKwh: energyReq,
    energy_required_kwh: energyReq,
    estimatedGridEnergyKwh: gridEnergy,
    estimated_grid_energy_kwh: gridEnergy,
    chargingEfficiency: b.charging_efficiency_snapshot ? parseFloat(b.charging_efficiency_snapshot) / 100 : 0.9,
    chargingEfficiencyPercent: b.charging_efficiency_snapshot ? parseFloat(b.charging_efficiency_snapshot) : 90.0,
    
    // Station
    stationId: b.station_id,
    station_id: b.station_id,
    stationIdCode: b.station_id_code || (b.station_id ? `STA${String(b.station_id).padStart(3, "0")}` : null),
    stationName: b.station_name || null,
    stationAddress: b.station_address || b.address || null,
    
    // Connector & Bay
    connectorId: b.connector_id,
    connector_id: b.connector_id,
    connectorNumber: connectorName,
    connector_number: connectorName,
    connectorType: connectorTypeName,
    connector_type: connectorTypeName,
    connectorTypeId: b.connector_type_id || null,
    powerKw,
    power_kw: powerKw,
    power: `${powerKw} kW`,
    effectivePowerKw,
    effective_charging_power_kw: effectivePowerKw,
    
    // Legacy Charger Compatibility
    chargerId: b.charger_id_code || (b.charger_id ? `CHG${String(b.charger_id).padStart(6, "0")}` : null),
    charger_id: b.charger_id,
    chargerDbId: b.charger_id,
    chargerName: b.charger_name || null,
    tariffId: b.tariff_id,
    tariff_id: b.tariff_id,
    
    // Timing
    bookingDate: rawDate,
    booking_date: rawDate,
    date: rawDate,
    startTime: startTimeStr,
    start_time: startTimeStr,
    endTime: endTimeStr,
    end_time: endTimeStr,
    timeSlot: startTimeStr && endTimeStr ? `${startTimeStr.slice(0, 5)} - ${endTimeStr.slice(0, 5)}` : null,
    duration: formatDurationHuman(durationMins),
    durationMinutes: durationMins,
    duration_minutes: durationMins,
    estimatedChargingTime: b.estimated_charging_time || `${durationMins} minutes`,
    estimated_charging_time: b.estimated_charging_time || `${durationMins} minutes`,
    
    // Financials & Itemized Billing
    tariffRate,
    tariff_rate_snapshot: tariffRate,
    tariffPerKwh: tariffRate,
    tariff_per_kwh: tariffRate,
    estimatedEnergyCost: energyCost,
    estimated_energy_cost: energyCost,
    platformFee,
    platform_fee: platformFee,
    connectionFee: platformFee,
    connection_fee_snapshot: platformFee,
    taxAmount: b.tax_amount !== null && b.tax_amount !== undefined ? parseFloat(b.tax_amount) : 0,
    tax_amount: b.tax_amount !== null && b.tax_amount !== undefined ? parseFloat(b.tax_amount) : 0,
    amount,
    totalAmount: amount,
    finalAmount: amount,
    estimatedAmount: amount,
    estimated_amount: amount,
    price: amount,
    payment: `₹${amount.toFixed(2)}`,
    
    // Status & Disclaimers
    isEstimate: true,
    notice: "Charging cost is an estimate because live vehicle/charger energy telemetry is not connected.",
    status: rawStatus,
    bookingStatus: rawStatus,
    booking_status: rawStatus,
    paymentStatus: rawPaymentStatus,
    payment_status: rawPaymentStatus,
    paymentId: b.payment_id || null,
    payment_id: b.payment_id || null,
    createdAt: b.created_at,
    created_at: b.created_at,
  };
};

/**
 * Base SELECT query for bookings with comprehensive relational JOINs
 */
const BOOKINGS_JOIN_QUERY = `
  SELECT b.*,
         u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
         s.station_name, s.address as station_address, s.station_id as station_id_code, s.owner_id, s.energy_tariff_per_kwh, s.charging_efficiency_percent,
         v.registration_number, v.brand, v.model, v.vehicle_type, v.connector_type as vehicle_connector_type, v.battery_capacity, v.battery_capacity_kwh, v.max_charging_power_kw,
         sc.connector_number, sc.connector_id as connector_id_code, sc.power_kw as connector_power_kw, sc.status as connector_operational_status,
         ct.connector_name as connector_type_name,
         c.charger_name, c.charger_type, c.power_kw, c.charger_id as charger_id_code
  FROM bookings b
  JOIN users u ON b.user_id = u.id
  JOIN stations s ON b.station_id = s.id
  LEFT JOIN station_connectors sc ON b.connector_id = sc.id
  LEFT JOIN connector_types ct ON sc.connector_type_id = ct.id
  LEFT JOIN chargers c ON b.charger_id = c.id
  LEFT JOIN vehicles v ON b.vehicle_id = v.id
`;

/**
 * GET /api/available-connectors
 * Dynamic Real-Time Availability & Compatibility API
 * Returns station connectors filtered/matched by vehicle connector type and checking booking overlaps
 */
export const getAvailableConnectors = async (req, res) => {
  try {
    const {
      vehicleId,
      vehicle_id,
      stationId,
      station_id,
      date,
      booking_date,
      startTime,
      start_time,
      duration = 1,
      duration_minutes,
    } = req.query;

    const rawVehicleId = vehicleId || vehicle_id;
    const rawStationId = stationId || station_id;
    const rawDate = date || booking_date;
    const rawStartTime = startTime || start_time;

    if (!rawVehicleId) {
      return res.status(400).json({ success: false, message: "vehicleId parameter is required." });
    }
    if (!rawStationId) {
      return res.status(400).json({ success: false, message: "stationId parameter is required." });
    }
    if (!rawDate) {
      return res.status(400).json({ success: false, message: "date parameter is required (YYYY-MM-DD)." });
    }
    if (!rawStartTime) {
      return res.status(400).json({ success: false, message: "startTime parameter is required (HH:MM or HH:MM:SS)." });
    }

    // 1. Resolve Vehicle and its Connector Type
    const isVehNumeric = /^\d+$/.test(rawVehicleId);
    const vehRows = await query(
      `SELECT v.*, ct.id as ct_id, ct.connector_name, ct.max_power_kw 
       FROM vehicles v 
       LEFT JOIN connector_types ct ON v.connector_type_id = ct.id 
       WHERE v.id = ? OR v.vehicle_id = ? 
       LIMIT 1`,
      [isVehNumeric ? parseInt(rawVehicleId, 10) : 0, rawVehicleId]
    );

    if (!vehRows || vehRows.length === 0) {
      return res.status(404).json({ success: false, message: `Vehicle #${rawVehicleId} not found.` });
    }

    const vehicle = vehRows[0];
    let vehicleConnectorTypeId = vehicle.connector_type_id || vehicle.ct_id;
    let vehicleConnectorName = vehicle.connector_name || vehicle.connector_type || "CCS2";

    // Fallback connector type resolution
    if (!vehicleConnectorTypeId) {
      const matchedType = await query(
        "SELECT id, connector_name FROM connector_types WHERE UPPER(connector_name) = UPPER(?) LIMIT 1",
        [vehicleConnectorName]
      );
      if (matchedType && matchedType.length > 0) {
        vehicleConnectorTypeId = matchedType[0].id;
        vehicleConnectorName = matchedType[0].connector_name;
      } else {
        vehicleConnectorTypeId = 1;
        vehicleConnectorName = "CCS2";
      }
    }

    // 2. Resolve Station
    const isStnNumeric = /^\d+$/.test(rawStationId);
    const stnRows = await query(
      "SELECT * FROM stations WHERE id = ? OR station_id = ? LIMIT 1",
      [isStnNumeric ? parseInt(rawStationId, 10) : 0, rawStationId]
    );

    if (!stnRows || stnRows.length === 0) {
      return res.status(404).json({ success: false, message: `Charging station #${rawStationId} not found.` });
    }
    const station = stnRows[0];

    // 3. Compute Duration and Time Range
    const durHoursOrMins = parseFloat(duration);
    const durMins = duration_minutes
      ? parseInt(duration_minutes, 10)
      : durHoursOrMins <= 8
      ? Math.round(durHoursOrMins * 60)
      : Math.round(durHoursOrMins);

    if (isNaN(durMins) || durMins <= 0) {
      return res.status(400).json({ success: false, message: "Invalid charging duration." });
    }

    const cleanDate = typeof rawDate === "string" ? rawDate.split("T")[0] : rawDate;
    const cleanStartTime = rawStartTime.length === 5 ? `${rawStartTime}:00` : rawStartTime.slice(0, 8);
    const cleanEndTime = calculateEndTimeString(cleanStartTime, durMins);

    // Validate past time check
    const todayStr = new Date().toISOString().split("T")[0];
    if (cleanDate < todayStr) {
      return res.status(400).json({ success: false, message: "Booking date cannot be in the past." });
    }

    // 4. Fetch All Station Connectors
    let stationConnectors = await query(
      `SELECT sc.*, ct.connector_name, ct.max_power_kw as type_max_power, ct.description as type_description
       FROM station_connectors sc
       JOIN connector_types ct ON sc.connector_type_id = ct.id
       WHERE sc.station_id = ?
       ORDER BY sc.id ASC`,
      [station.id]
    );

    // Empty array if no connectors exist yet for this station
    stationConnectors = stationConnectors || [];


    // 5. Query Overlapping Bookings for Station & Date
    // Overlap logic: requestedStart < existingEnd AND requestedEnd > existingStart
    const overlappingBookings = await query(
      `SELECT id, booking_id, connector_id, charger_id, start_time, end_time, booking_status
       FROM bookings
       WHERE station_id = ?
         AND booking_date = ?
         AND booking_status NOT IN ('CANCELLED', 'EXPIRED', 'NO_SHOW')
         AND (start_time < ? AND end_time > ?)`,
      [station.id, cleanDate, cleanEndTime, cleanStartTime]
    );

    const bookedConnectorIds = new Set(
      (overlappingBookings || []).map((b) => b.connector_id).filter(Boolean)
    );

    // Also map by charger_id if connector_id is not set on older legacy bookings
    const bookedChargerIds = new Set(
      (overlappingBookings || []).map((b) => b.charger_id).filter(Boolean)
    );

    // Get Active Tariff for Station Pricing
    const tariffRows = await query(
      "SELECT base_rate_per_kwh, peak_rate_per_kwh, off_peak_rate_per_kwh, connection_fee FROM tariffs WHERE station_id = ? AND status = 'ACTIVE' LIMIT 1",
      [station.id]
    );
    const basePrice = tariffRows.length > 0 ? parseFloat(tariffRows[0].base_rate_per_kwh) : 18.0;

    // 6. Process Each Connector Status & Compatibility
    const processedConnectors = stationConnectors.map((c) => {
      const isCompatible = Number(c.connector_type_id) === Number(vehicleConnectorTypeId);
      const isBooked = bookedConnectorIds.has(c.id) || (c.charger_id && bookedChargerIds.has(c.charger_id));
      const opStatus = (c.status || "AVAILABLE").toUpperCase();

      let effectiveStatus = opStatus;
      let isAvailable = false;
      let statusReason = "";

      if (opStatus === "MAINTENANCE") {
        effectiveStatus = "MAINTENANCE";
        isAvailable = false;
        statusReason = "Under maintenance";
      } else if (opStatus === "FAULT" || opStatus === "FAULTED") {
        effectiveStatus = "FAULT";
        isAvailable = false;
        statusReason = "Technical fault reported";
      } else if (opStatus === "OFFLINE") {
        effectiveStatus = "OFFLINE";
        isAvailable = false;
        statusReason = "Connector offline";
      } else if (isBooked) {
        effectiveStatus = "OCCUPIED";
        isAvailable = false;
        statusReason = "Booked for selected time slot";
      } else if (!isCompatible) {
        effectiveStatus = "AVAILABLE";
        isAvailable = false; // Not selectable because incompatible
        statusReason = `Incompatible (Requires ${vehicleConnectorName})`;
      } else {
        effectiveStatus = "AVAILABLE";
        isAvailable = true;
        statusReason = "Available to book";
      }

      return {
        id: c.id,
        connectorId: c.connector_id || `CON${String(c.id).padStart(6, "0")}`,
        connector_id: c.connector_id || `CON${String(c.id).padStart(6, "0")}`,
        connectorNumber: c.connector_number,
        connector_number: c.connector_number,
        stationId: c.station_id,
        station_id: c.station_id,
        connectorTypeId: c.connector_type_id,
        connector_type_id: c.connector_type_id,
        connectorType: c.connector_name,
        connector_type: c.connector_name,
        powerKw: parseFloat(c.power_kw),
        power_kw: parseFloat(c.power_kw),
        operationalStatus: opStatus,
        status: effectiveStatus,
        effectiveStatus,
        isCompatible,
        isAvailable,
        statusReason,
        pricePerKwh: basePrice,
        chargerId: c.charger_id || c.id,
      };
    });

    const compatibleConnectors = processedConnectors.filter((c) => c.isCompatible);
    const availableConnectors = compatibleConnectors.filter((c) => c.isAvailable);

    res.json({
      success: true,
      vehicle: {
        id: vehicle.id,
        vehicleId: vehicle.vehicle_id || `VEH${String(vehicle.id).padStart(6, "0")}`,
        registrationNumber: vehicle.registration_number,
        model: `${vehicle.brand || ""} ${vehicle.model}`.trim(),
        connectorTypeId: vehicleConnectorTypeId,
        connectorType: vehicleConnectorName,
      },
      station: {
        id: station.id,
        stationId: station.station_id || `STA${String(station.id).padStart(3, "0")}`,
        stationName: station.station_name,
        address: station.address,
        status: station.status,
      },
      timeSlot: {
        date: cleanDate,
        startTime: cleanStartTime,
        endTime: cleanEndTime,
        durationMinutes: durMins,
        durationHours: durMins / 60,
      },
      count: compatibleConnectors.length,
      availableCount: availableConnectors.length,
      connectors: compatibleConnectors, // Compatible connectors for user's vehicle
      availableConnectors,
      allStationConnectors: processedConnectors, // All station connectors for full visibility
    });
  } catch (error) {
    console.error("Get Available Connectors Error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving available connectors",
      error: error.message,
    });
  }
};

/**
 * GET /api/bookings
 * Returns bookings for authenticated user (Customer gets their bookings, Owner gets their station bookings, Admin gets all)
 */
export const getBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = (req.user.role || "").toUpperCase();

    let sql = BOOKINGS_JOIN_QUERY;
    let params = [];

    if (role === "ADMIN") {
      sql += " ORDER BY b.id DESC";
    } else if (role === "STATION_OWNER" || role === "OWNER") {
      sql += " WHERE s.owner_id = ? ORDER BY b.id DESC";
      params.push(userId);
    } else {
      sql += " WHERE b.user_id = ? ORDER BY b.id DESC";
      params.push(userId);
    }

    const rows = await query(sql, params);
    const formatted = rows.map(formatBooking);

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("Get Bookings Error:", error);
    res.status(500).json({ success: false, message: "Error fetching bookings", error: error.message });
  }
};

/**
 * GET /api/bookings/my-bookings
 */
export const getCustomerBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const sql = `${BOOKINGS_JOIN_QUERY} WHERE b.user_id = ? ORDER BY b.id DESC`;
    const rows = await query(sql, [userId]);
    const formatted = rows.map(formatBooking);

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching customer bookings", error: error.message });
  }
};

/**
 * GET /api/bookings/owner-bookings
 */
export const getOwnerBookings = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const sql = `${BOOKINGS_JOIN_QUERY} WHERE s.owner_id = ? ORDER BY b.id DESC`;
    const rows = await query(sql, [ownerId]);
    const formatted = rows.map(formatBooking);

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching owner bookings", error: error.message });
  }
};

/**
 * GET /api/bookings/:bookingId or /:id
 */
export const getBookingById = async (req, res) => {
  try {
    const idOrCode = req.params.bookingId || req.params.id;
    const isNumeric = /^\d+$/.test(idOrCode);

    const sql = `${BOOKINGS_JOIN_QUERY} WHERE b.id = ? OR b.booking_id = ? LIMIT 1`;
    const rows = await query(sql, [isNumeric ? parseInt(idOrCode, 10) : 0, idOrCode]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    res.json({
      success: true,
      data: formatBooking(rows[0]),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching booking", error: error.message });
  }
};

/**
 * GET /api/bookings/slot-bookings
 * Return existing active bookings for a specific connector and date so UI can mark booked slots
 */
export const getSlotBookings = async (req, res) => {
  try {
    const { station_id, stationId, connector_id, connectorId, charger_id, chargerId, date, booking_date, bookingDate } = req.query;
    const connId = connector_id || connectorId || charger_id || chargerId;
    const bDate = booking_date || bookingDate || date;
    const sId = station_id || stationId;

    if (!connId || !bDate) {
      return res.json({ success: true, data: [] });
    }

    const cleanDate = typeof bDate === "string" ? bDate.split("T")[0] : bDate;
    const rows = await query(
      `SELECT id, booking_id, start_time, end_time, duration_minutes, booking_status 
       FROM bookings 
       WHERE (connector_id = ? OR charger_id = ?)
         AND (? IS NULL OR station_id = ?)
         AND booking_date = ?
         AND booking_status NOT IN ('CANCELLED', 'EXPIRED', 'NO_SHOW')
       ORDER BY start_time ASC`,
      [connId, connId, sId || null, sId || null, cleanDate]
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching slot bookings", error: error.message });
  }
};

/**
 * POST /api/bookings/check-availability
 * Double Booking Prevention validation endpoint
 */
export const checkAvailability = async (req, res) => {
  try {
    const { station_id, stationId, connector_id, connectorId, charger_id, chargerId, booking_date, bookingDate, start_time, startTime, end_time, endTime, duration_minutes = 60, durationMinutes = 60 } = req.body;

    const targetConnectorId = connector_id || connectorId || charger_id || chargerId;
    const bDate = booking_date || bookingDate;
    const sTime = start_time || startTime;
    const eTime = end_time || endTime;
    const durMins = parseInt(duration_minutes || durationMinutes, 10) || 60;
    const sId = station_id || stationId;

    if (!targetConnectorId || !bDate || !sTime) {
      return res.status(400).json({
        success: false,
        message: "connector_id, booking_date, and start_time are required.",
      });
    }

    const cleanDate = typeof bDate === "string" ? bDate.split("T")[0] : bDate;
    const cleanStartTime = sTime.length === 5 ? `${sTime}:00` : sTime.slice(0, 8);
    const cleanEndTime = eTime ? (eTime.length === 5 ? `${eTime}:00` : eTime.slice(0, 8)) : calculateEndTimeString(cleanStartTime, durMins);

    const conflicts = await query(
      `SELECT id, booking_id, start_time, end_time 
       FROM bookings 
       WHERE (? IS NULL OR station_id = ?)
         AND (connector_id = ? OR charger_id = ?) 
         AND booking_date = ?
         AND booking_status NOT IN ('CANCELLED', 'EXPIRED', 'NO_SHOW')
         AND (start_time < ? AND end_time > ?)`,
      [sId || null, sId || null, targetConnectorId, targetConnectorId, cleanDate, cleanEndTime, cleanStartTime]
    );

    const isAvailable = conflicts.length === 0;

    if (!isAvailable) {
      return res.status(409).json({
        success: false,
        isAvailable: false,
        available: false,
        message: "Charging slot is already booked for the selected time.",
        conflictCount: conflicts.length,
        conflicts,
      });
    }

    res.json({
      success: true,
      isAvailable: true,
      available: true,
      message: "Slot is available for reservation.",
      conflictCount: 0,
      conflicts: [],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error checking slot availability", error: error.message });
  }
};

/**
 * POST /api/bookings
 * Create Booking with Atomic Double-Booking Validation, Connector Compatibility, Locking & MySQL Transaction
 */
export const createBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      station_id,
      stationId,
      connector_id,
      connectorId,
      charger_id,
      chargerId,
      vehicle_id,
      vehicleId,
      booking_date,
      bookingDate,
      start_time,
      startTime,
      duration = 60,
      duration_minutes,
      durationMinutes,
      energy_kwh,
      amount,
      totalAmount,
      payment_id,
      paymentId,
      transactionId,
      payment_status,
      status,
    } = req.body;

    const sId = parseInt(station_id || stationId, 10);
    const connParam = connector_id || connectorId || charger_id || chargerId;
    const vIdParam = vehicle_id || vehicleId;
    const rawDate = booking_date || bookingDate;
    const sTime = start_time || startTime;
    const durMins = parseInt(duration_minutes || durationMinutes || duration, 10) || 60;

    if (!sId || isNaN(sId)) {
      return res.status(400).json({ success: false, message: "Valid numeric station_id is required." });
    }
    if (!vIdParam) {
      return res.status(400).json({ success: false, message: "vehicle_id is required." });
    }
    if (!connParam) {
      return res.status(400).json({ success: false, message: "connector_id is required." });
    }
    if (!rawDate) {
      return res.status(400).json({ success: false, message: "booking_date is required (YYYY-MM-DD)." });
    }
    if (!sTime) {
      return res.status(400).json({ success: false, message: "start_time is required (HH:MM:SS)." });
    }

    const cleanDate = typeof rawDate === "string" ? rawDate.split("T")[0] : rawDate;
    const cleanStartTime = sTime.length === 5 ? `${sTime}:00` : sTime.slice(0, 8);
    const cleanEndTime = calculateEndTimeString(cleanStartTime, durMins);
    const payRef = payment_id || paymentId || transactionId || null;
    const isPaid = !!payRef || (payment_status || "").toUpperCase() === "PAID" || (payment_status || "").toUpperCase() === "SUCCESS";

    const resultData = await transaction(async (connection) => {
      // 1. Validate Vehicle ownership & retrieve connector type
      const isVehNum = /^\d+$/.test(vIdParam);
      const [vehRows] = await connection.execute(
        "SELECT id, user_id, registration_number, brand, model, connector_type_id, connector_type FROM vehicles WHERE id = ? OR vehicle_id = ?",
        [isVehNum ? parseInt(vIdParam, 10) : 0, String(vIdParam)]
      );

      if (vehRows.length === 0) {
        const err = new Error("Selected vehicle not found.");
        err.statusCode = 404;
        throw err;
      }

      const vehicle = vehRows[0];
      if (vehicle.user_id !== userId && req.user.role !== "ADMIN") {
        const err = new Error("Selected vehicle does not belong to the logged-in user.");
        err.statusCode = 403;
        throw err;
      }

      let vehConnTypeId = vehicle.connector_type_id;
      if (!vehConnTypeId) {
        const [ctRows] = await connection.execute(
          "SELECT id FROM connector_types WHERE UPPER(connector_name) = UPPER(?) LIMIT 1",
          [vehicle.connector_type || "CCS2"]
        );
        vehConnTypeId = ctRows.length > 0 ? ctRows[0].id : 1;
      }

      // 2. Validate Station exists and is active
      const [stationRows] = await connection.execute(
        "SELECT id, station_name, owner_id, status, approval_status FROM stations WHERE id = ? FOR UPDATE",
        [sId]
      );
      if (stationRows.length === 0) {
        const err = new Error("Selected charging station does not exist.");
        err.statusCode = 404;
        throw err;
      }
      const station = stationRows[0];
      if (station.status === "INACTIVE" || station.approval_status === "REJECTED" || station.approval_status === "SUSPENDED") {
        const err = new Error("Selected charging station is currently inactive or suspended.");
        err.statusCode = 400;
        throw err;
      }

      // 3. Validate Connector belongs to Station and is compatible with Vehicle
      const isConnNum = /^\d+$/.test(String(connParam));
      const [connRows] = await connection.execute(
        `SELECT sc.*, ct.connector_name 
         FROM station_connectors sc
         JOIN connector_types ct ON sc.connector_type_id = ct.id
         WHERE (sc.id = ? OR sc.connector_id = ?) AND sc.station_id = ? 
         FOR UPDATE`,
        [isConnNum ? parseInt(connParam, 10) : 0, String(connParam), sId]
      );

      let connector;
      let connectorDbId;
      let chargerDbId;

      if (connRows.length > 0) {
        connector = connRows[0];
        connectorDbId = parseInt(connector.id, 10);
        chargerDbId = typeof connector.charger_id === 'number' 
          ? connector.charger_id 
          : (parseInt(connector.charger_id, 10) || connectorDbId);
      } else {
        // Fallback check against chargers table for stations configured directly with chargers
        const [chgRows] = await connection.execute(
          "SELECT * FROM chargers WHERE (id = ? OR charger_id = ?) AND station_id = ? FOR UPDATE",
          [isConnNum ? parseInt(connParam, 10) : 0, String(connParam), sId]
        );
        if (chgRows.length === 0) {
          const err = new Error(`Connector #${connParam} does not belong to station #${sId} or does not exist.`);
          err.statusCode = 404;
          throw err;
        }
        connector = chgRows[0];
        connector.connector_type_id = vehConnTypeId;
        connectorDbId = parseInt(connector.id, 10);
        chargerDbId = parseInt(connector.id, 10);
      }

      // 4. Validate Connector Compatibility
      if (Number(connector.connector_type_id) !== Number(vehConnTypeId)) {
        const err = new Error(
          `Incompatible connector: Your vehicle requires a ${vehicle.connector_type || "compatible"} connector, but this connector is ${connector.connector_name || "different"}.`
        );
        err.statusCode = 400;
        throw err;
      }

      // 5. Validate Connector Operational Status
      const opStatus = (connector.status || "AVAILABLE").toUpperCase();
      if (opStatus === "MAINTENANCE") {
        const err = new Error(`Connector #${connector.connector_number || connParam} is currently under maintenance and cannot be booked.`);
        err.statusCode = 400;
        throw err;
      }
      if (opStatus === "FAULT" || opStatus === "FAULTED") {
        const err = new Error(`Connector #${connector.connector_number || connParam} has a technical fault and is unavailable.`);
        err.statusCode = 400;
        throw err;
      }
      if (opStatus === "OFFLINE") {
        const err = new Error(`Connector #${connector.connector_number || connParam} is currently offline.`);
        err.statusCode = 400;
        throw err;
      }

      // 6. Double Booking Check with row lock (Schedule-based conflict detection)
      // requestedStart < existingEnd AND requestedEnd > existingStart
      const [conflictRows] = await connection.execute(
        `SELECT id, booking_id, start_time, end_time FROM bookings 
         WHERE (connector_id = ? OR charger_id = ?)
           AND booking_date = ?
           AND booking_status NOT IN ('CANCELLED', 'EXPIRED', 'NO_SHOW')
           AND (start_time < ? AND end_time > ?) 
         FOR UPDATE`,
        [connectorDbId, chargerDbId, cleanDate, cleanEndTime, cleanStartTime]
      );

      if (conflictRows.length > 0) {
        const conflictErr = new Error("Charging slot is already booked for the selected time.");
        conflictErr.statusCode = 409;
        throw conflictErr;
      }

      // 7. Look up ACTIVE tariff for station
      const [tariffRows] = await connection.execute(
        "SELECT id, base_rate_per_kwh, peak_rate_per_kwh, off_peak_rate_per_kwh, connection_fee, idle_fee_per_minute FROM tariffs WHERE station_id = ? AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1",
        [sId]
      );
      const tariffId = tariffRows.length > 0 ? tariffRows[0].id : null;

      // 8. Calculate Authoritative SOC-Based Energy, Grid Consumption & Price
      const userCurrentSoc = Number(req.body.current_soc_percent ?? req.body.current_soc ?? req.body.current_battery ?? req.body.currentSoc ?? req.body.currentBattery ?? 60);
      const userTargetSoc = Number(req.body.target_soc_percent ?? req.body.target_soc ?? req.body.target_battery ?? req.body.targetSoc ?? req.body.targetBattery ?? 80);

      if (userTargetSoc <= userCurrentSoc) {
        const err = new Error("Target battery must be greater than current battery.");
        err.statusCode = 400;
        throw err;
      }

      const estimate = await calculateChargingEstimate({
        vehicleId: vehicle.id,
        stationId: sId,
        connectorId: connectorDbId,
        currentSoc: userCurrentSoc,
        targetSoc: userTargetSoc,
      });

      const finalEstimatedAmount = estimate.totalEstimatedAmount;

      // 9. Generate Booking ID (e.g. EV0001)
      const bookingCode = await generateNextBookingId(connection);

      // 10. Insert into bookings with complete snapshots (NEVER mark CONFIRMED before payment)
      const initialStatus = isPaid ? "CONFIRMED" : (status && status !== "CONFIRMED" ? status : "PENDING_PAYMENT").toUpperCase();
      const initialPaymentStatus = isPaid ? "PAID" : "PENDING";

      const [bookingResult] = await connection.execute(
        `INSERT INTO bookings 
         (booking_id, user_id, vehicle_id, station_id, charger_id, connector_id, tariff_id, 
          booking_date, start_time, end_time, duration_minutes,
          current_soc_percent, target_soc_percent, battery_capacity_kwh_snapshot,
          energy_required_kwh, estimated_grid_energy_kwh, tariff_per_kwh, charging_efficiency_snapshot,
          estimated_energy_cost, platform_fee, tax_amount, effective_charging_power_kw, estimated_charging_time,
          tariff_rate_snapshot, connection_fee_snapshot, estimated_amount, 
          booking_status, payment_status, payment_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bookingCode,
          userId,
          vehicle.id,
          sId,
          chargerDbId,
          connectorDbId,
          tariffId,
          cleanDate,
          cleanStartTime,
          cleanEndTime,
          durMins,
          estimate.currentSoc,
          estimate.targetSoc,
          estimate.batteryCapacityKwh,
          estimate.energyRequiredKwh,
          estimate.estimatedGridEnergyKwh,
          estimate.tariffPerKwh,
          estimate.chargingEfficiencyPercent,
          estimate.estimatedEnergyCost,
          estimate.platformFee,
          estimate.taxAmount,
          estimate.effectivePowerKw,
          estimate.estimatedChargingTime,
          estimate.tariffPerKwh,
          estimate.platformFee,
          finalEstimatedAmount,
          initialStatus,
          initialPaymentStatus,
          payRef || null,
        ]
      );
      const newBookingId = bookingResult.insertId;

      // Link payment record if reference present
      if (payRef) {
        await connection.execute(
          "UPDATE payments SET booking_id = ?, updated_at = NOW() WHERE payment_id = ? OR gateway_payment_id = ?",
          [newBookingId, payRef, payRef]
        );
      }

      return {
        id: newBookingId,
        booking_id: bookingCode,
        station_id: sId,
        vehicle_id: vehicle.id,
        connector_id: connectorDbId,
        charger_id: chargerDbId,
        tariff_id: tariffId,
        estimated_amount: finalEstimatedAmount,
        booking_status: initialStatus,
        payment_status: initialPaymentStatus,
        owner_id: station.owner_id,
      };
    });

    const fullRows = await query(`${BOOKINGS_JOIN_QUERY} WHERE b.id = ?`, [resultData.id]);
    const formatted = fullRows.length > 0 ? formatBooking(fullRows[0]) : resultData;

    try {
      emitBookingCreated(formatted);
    } catch (e) {}

    res.status(201).json({
      success: true,
      message: "Booking confirmed successfully!",
      bookingId: resultData.booking_id,
      booking_id: resultData.booking_id,
      id: resultData.id,
      data: formatted,
    });
  } catch (error) {
    console.error("Create Booking Error:", error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to create booking.",
    });
  }
};

/**
 * POST /api/bookings/:bookingId/cancel or /:id/cancel or PUT /:bookingId/cancel
 */
export const cancelBooking = async (req, res) => {
  try {
    const bookingIdParam = req.params.bookingId || req.params.id;
    const userId = req.user.id;
    const role = (req.user.role || "").toUpperCase();
    const isAdmin = role === "ADMIN";

    const isNumeric = /^\d+$/.test(bookingIdParam);
    const rows = await query("SELECT * FROM bookings WHERE id = ? OR booking_id = ?", [
      isNumeric ? parseInt(bookingIdParam, 10) : 0,
      bookingIdParam,
    ]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    const booking = rows[0];

    // Check permissions
    if (!isAdmin && booking.user_id !== userId) {
      const stRows = await query("SELECT owner_id FROM stations WHERE id = ?", [booking.station_id]);
      const isOwner = stRows.length > 0 && stRows[0].owner_id === userId;
      if (!isOwner) {
        return res.status(403).json({ success: false, message: "Not authorized to cancel this booking." });
      }
    }

    await transaction(async (connection) => {
      await connection.execute(
        "UPDATE bookings SET booking_status = 'CANCELLED', updated_at = NOW() WHERE id = ?",
        [booking.id]
      );
      await connection.execute(
        "UPDATE payments SET payment_status = 'REFUNDED', updated_at = NOW() WHERE booking_id = ?",
        [booking.id]
      );
    });

    const fullRows = await query(`${BOOKINGS_JOIN_QUERY} WHERE b.id = ?`, [booking.id]);
    const formatted = fullRows.length > 0 ? formatBooking(fullRows[0]) : booking;

    try {
      emitBookingCancelled(formatted);
    } catch (e) {}

    res.json({
      success: true,
      message: "Booking cancelled and slot released successfully.",
      data: formatted,
    });
  } catch (error) {
    console.error("Cancel Booking Error:", error);
    res.status(500).json({ success: false, message: "Error cancelling booking", error: error.message });
  }
};

/**
 * POST /api/bookings/offline
 */
export const createOfflineBooking = async (req, res) => {
  return createBooking(req, res);
};

/**
 * GET /api/bookings/user/:userId
 */
export const getUserBookings = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const sql = `${BOOKINGS_JOIN_QUERY} WHERE b.user_id = ? ORDER BY b.id DESC`;
    const rows = await query(sql, [targetUserId]);
    const formatted = rows.map(formatBooking);

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching user bookings", error: error.message });
  }
};

/**
 * PUT /api/bookings/:bookingId or /:id
 */
export const updateBooking = async (req, res) => {
  try {
    const bookingIdParam = req.params.bookingId || req.params.id;
    const { status, booking_status, payment_status } = req.body;
    const cleanStatus = (booking_status || status || "CONFIRMED").toUpperCase();

    const isNumeric = /^\d+$/.test(bookingIdParam);
    const rows = await query("SELECT * FROM bookings WHERE id = ? OR booking_id = ?", [
      isNumeric ? parseInt(bookingIdParam, 10) : 0,
      bookingIdParam,
    ]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    const booking = rows[0];

    // Check-in validation
    if (cleanStatus === "CHECKED_IN" || cleanStatus === "IN_PROGRESS") {
      if (booking.user_id !== req.user.id && req.user.role !== "ADMIN" && req.user.role !== "STATION_OWNER") {
        return res.status(403).json({ success: false, message: "Not authorized to check in for this booking." });
      }
    }

    await transaction(async (connection) => {
      const updates = ["booking_status = ?"];
      const params = [cleanStatus];

      if (payment_status) {
        updates.push("payment_status = ?");
        params.push(payment_status.toUpperCase());
      }

      params.push(booking.id);
      await connection.execute(`UPDATE bookings SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ?`, params);

      // On charging completion, update vehicle latest known SOC to target SOC
      if (cleanStatus === "COMPLETED" && booking.vehicle_id) {
        const targetSoc = booking.target_soc_percent !== null && booking.target_soc_percent !== undefined
          ? parseFloat(booking.target_soc_percent)
          : 100.0;
        const [vehRow] = await connection.execute("SELECT current_soc_percent FROM vehicles WHERE id = ?", [booking.vehicle_id]);
        const prevSoc = vehRow.length > 0 && vehRow[0].current_soc_percent !== null ? parseFloat(vehRow[0].current_soc_percent) : null;

        await connection.execute(
          "UPDATE vehicles SET current_soc_percent = ?, soc_updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [targetSoc, booking.vehicle_id]
        );

        await connection.execute(
          `INSERT INTO vehicle_soc_history (vehicle_id, previous_soc_percent, new_soc_percent, source, recorded_at)
           VALUES (?, ?, ?, 'CHARGING_COMPLETED', CURRENT_TIMESTAMP)`,
          [booking.vehicle_id, prevSoc, targetSoc]
        );
      }
    });

    const fullRows = await query(`${BOOKINGS_JOIN_QUERY} WHERE b.id = ?`, [booking.id]);
    const formatted = fullRows.length > 0 ? formatBooking(fullRows[0]) : booking;

    try {
      emitBookingUpdated(formatted);
    } catch (e) {}

    res.json({
      success: true,
      message: "Booking updated successfully.",
      data: formatted,
    });
  } catch (error) {
    console.error("updateBooking error:", error);
    res.status(500).json({ success: false, message: "Error updating booking", error: error.message });
  }
};

/**
 * DELETE /api/bookings/:bookingId or /:id
 */
export const deleteBooking = async (req, res) => {
  try {
    const bookingIdParam = req.params.bookingId || req.params.id;
    const isNumeric = /^\d+$/.test(bookingIdParam);
    await query("DELETE FROM bookings WHERE id = ? OR booking_id = ?", [
      isNumeric ? parseInt(bookingIdParam, 10) : 0,
      bookingIdParam,
    ]);
    res.json({ success: true, message: "Booking deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting booking", error: error.message });
  }
};

/**
 * GET /api/bookings/stats
 */
export const getDashboardStatsEndpoint = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = (req.user.role || "").toUpperCase();

    let bookingFilter = "";
    let params = [];

    if (role === "STATION_OWNER" || role === "OWNER") {
      bookingFilter = "WHERE s.owner_id = ?";
      params = [userId];
    } else if (role !== "ADMIN") {
      bookingFilter = "WHERE b.user_id = ?";
      params = [userId];
    }

    const [bStats] = await query(
      `SELECT 
         COUNT(*) as totalBookings,
         COUNT(CASE WHEN b.booking_status IN ('CONFIRMED', 'ACTIVE', 'IN_PROGRESS') THEN 1 END) as activeBookings,
         COUNT(CASE WHEN b.booking_status = 'COMPLETED' THEN 1 END) as completedBookings,
         COALESCE(SUM(CASE WHEN b.payment_status = 'SUCCESS' THEN b.estimated_amount ELSE 0 END), 0) as totalRevenue
       FROM bookings b
       JOIN stations s ON b.station_id = s.id
       ${bookingFilter}`,
      params
    );

    res.json({
      success: true,
      stats: {
        totalBookings: bStats?.totalBookings || 0,
        activeBookings: bStats?.activeBookings || 0,
        completedBookings: bStats?.completedBookings || 0,
        totalRevenue: parseFloat(bStats?.totalRevenue || 0),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching booking stats", error: error.message });
  }
};

export default {
  getAvailableConnectors,
  getBookings,
  getCustomerBookings,
  getOwnerBookings,
  getUserBookings,
  getBookingById,
  checkAvailability,
  createBooking,
  createOfflineBooking,
  updateBooking,
  cancelBooking,
  deleteBooking,
  getDashboardStatsEndpoint,
  formatBooking,
};
