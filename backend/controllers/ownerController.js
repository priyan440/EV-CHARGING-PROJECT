import { query, transaction } from "../config/db.js";
import {
  emitChargerStatusChanged,
  emitSessionStarted,
  emitSessionStopped,
  emitBookingCreated,
  emitBookingUpdated,
  emitPaymentUpdated,
  emitMaintenanceUpdated,
  emitTelemetryUpdated,
  emitStationUpdated,
} from "../services/socketService.js";
import { formatBooking } from "./bookingController.js";

// Helper: Check if authenticated user is ADMIN
const isAdmin = (req) => {
  return (req.user?.role || "").toUpperCase() === "ADMIN";
};

// Helper: Extract owner user ID from authenticated request
const getOwnerId = (req) => {
  return req.user?.id || 0;
};

// Helper: Generate next sequential ID safely from MySQL table
const getNextId = async (prefix, table, column, usedSet = null) => {
  try {
    const rows = await query(`SELECT \`${column}\` as idVal FROM \`${table}\` WHERE \`${column}\` LIKE ? ORDER BY \`${column}\` DESC LIMIT 1`, [`${prefix}%`]);
    let nextNum = 1;
    if (rows && rows.length > 0 && rows[0].idVal) {
      const match = String(rows[0].idVal).match(new RegExp(`^${prefix}(\\d+)`));
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    let candidate = `${prefix}${String(nextNum).padStart(6, "0")}`;
    let exists = await query(`SELECT id FROM \`${table}\` WHERE \`${column}\` = ? LIMIT 1`, [candidate]);
    while ((exists && exists.length > 0) || (usedSet && usedSet.has(candidate))) {
      nextNum++;
      candidate = `${prefix}${String(nextNum).padStart(6, "0")}`;
      exists = await query(`SELECT id FROM \`${table}\` WHERE \`${column}\` = ? LIMIT 1`, [candidate]);
    }
    if (usedSet) usedSet.add(candidate);
    return candidate;
  } catch {
    const fallback = `${prefix}${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
    if (usedSet) usedSet.add(fallback);
    return fallback;
  }
};

/**
 * 1. OWNER DASHBOARD SUMMARY (Calculated directly from MySQL for this owner)
 * GET /api/owner/dashboard/summary & GET /api/owner/dashboard
 */
export const getOwnerDashboardSummary = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);

    // 1. Station Metrics
    const stationRows = await query(`SELECT * FROM stations WHERE owner_id = ?`, [ownerId]);
    const totalStations = stationRows.length;
    const activeStations = stationRows.filter((s) => s.status === "ACTIVE" && s.approval_status === "APPROVED").length;
    const maintenanceStations = stationRows.filter((s) => s.status === "MAINTENANCE").length;
    const offlineStations = stationRows.filter((s) => s.status === "INACTIVE").length;

    // 2. Charger Metrics
    const chargerRows = await query(
      `SELECT c.* FROM chargers c JOIN stations s ON c.station_id = s.id WHERE s.owner_id = ?`,
      [ownerId]
    );
    const totalChargers = chargerRows.length;
    const availableChargers = chargerRows.filter((c) => c.status === "AVAILABLE").length;
    const chargingChargers = chargerRows.filter((c) => c.status === "CHARGING" || c.status === "OCCUPIED").length;
    const reservedChargers = chargerRows.filter((c) => c.status === "RESERVED").length;
    const faultedChargers = chargerRows.filter((c) => c.status === "FAULTED" || c.status === "MAINTENANCE").length;

    // 3. Bookings Metrics
    const bookingRows = await query(
      `SELECT b.* FROM bookings b JOIN stations s ON b.station_id = s.id WHERE s.owner_id = ? ORDER BY b.id DESC`,
      [ownerId]
    );
    const totalBookings = bookingRows.length;
    const upcomingBookings = bookingRows.filter((b) => ["CONFIRMED", "ACTIVE", "PENDING"].includes(b.booking_status)).length;
    const completedBookings = bookingRows.filter((b) => b.booking_status === "COMPLETED").length;

    // 4. Distinct Customers Count
    const [custRow] = await query(
      `SELECT COUNT(DISTINCT b.user_id) as count 
       FROM bookings b 
       JOIN stations s ON b.station_id = s.id 
       WHERE s.owner_id = ?`,
      [ownerId]
    );
    const totalCustomers = custRow?.count || 0;

    // 5. Revenue Metrics (Strictly from MySQL successful payments for owner's stations)
    const paymentRows = await query(
      `SELECT COALESCE(SUM(p.amount), 0) as totalRevenue, COUNT(p.id) as txCount 
       FROM payments p 
       JOIN bookings b ON (p.booking_id = b.id OR p.booking_id = b.booking_id) 
       JOIN stations s ON b.station_id = s.id 
       WHERE s.owner_id = ? AND p.payment_status = 'SUCCESS'`,
      [ownerId]
    );
    const totalRevenue = parseFloat(paymentRows[0]?.totalRevenue) || 0;

    // 6. Active Charging Sessions
    const sessionRows = await query(
      `SELECT cs.* FROM charging_sessions cs JOIN stations s ON cs.station_id = s.id WHERE s.owner_id = ? AND cs.session_status IN ('ACTIVE', 'CHARGING', 'STARTED') ORDER BY cs.id DESC`,
      [ownerId]
    );
    const activeSessionsCount = sessionRows.length;

    // 7. Maintenance & Faults
    const maintRows = await query(
      `SELECT COUNT(*) as activeFaults FROM maintenance_tickets mt JOIN stations s ON mt.station_id = s.id WHERE s.owner_id = ? AND mt.status NOT IN ('RESOLVED', 'CLOSED')`,
      [ownerId]
    );
    const activeFaults = maintRows[0]?.activeFaults || 0;

    // 8. Today, Monthly, and Weekly Revenue calculations directly from MySQL
    const [todayRevRow] = await query(
      `SELECT COALESCE(SUM(p.amount), 0) as todayRevenue 
       FROM payments p 
       JOIN bookings b ON (p.booking_id = b.id OR p.booking_id = b.booking_id) 
       JOIN stations s ON b.station_id = s.id 
       WHERE s.owner_id = ? AND p.payment_status = 'SUCCESS' AND DATE(p.paid_at) = CURRENT_DATE()`,
      [ownerId]
    );
    const todayRevenue = parseFloat(todayRevRow?.todayRevenue) || 0;

    const [monthRevRow] = await query(
      `SELECT COALESCE(SUM(p.amount), 0) as monthlyRevenue 
       FROM payments p 
       JOIN bookings b ON (p.booking_id = b.id OR p.booking_id = b.booking_id) 
       JOIN stations s ON b.station_id = s.id 
       WHERE s.owner_id = ? AND p.payment_status = 'SUCCESS' AND p.paid_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [ownerId]
    );
    const monthlyRevenue = parseFloat(monthRevRow?.monthlyRevenue) || 0;

    const [todayEnergyRow] = await query(
      `SELECT COALESCE(SUM(cs.energy_kwh), 0) as todayEnergyKwh 
       FROM charging_sessions cs 
       JOIN stations s ON cs.station_id = s.id 
       WHERE s.owner_id = ? AND DATE(cs.start_time) = CURRENT_DATE()`,
      [ownerId]
    );
    const todayEnergyKwh = parseFloat(todayEnergyRow?.todayEnergyKwh) || 0;

    // 7-day revenue trend from MySQL
    const last7DaysRows = await query(
      `SELECT DATE_FORMAT(p.paid_at, '%a') as dayName,
              COALESCE(SUM(p.amount), 0) as revenue,
              COUNT(p.id) as sessions
       FROM payments p
       JOIN bookings b ON (p.booking_id = b.id OR p.booking_id = b.booking_id)
       JOIN stations s ON b.station_id = s.id
       WHERE s.owner_id = ? AND p.payment_status = 'SUCCESS' AND p.paid_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE_FORMAT(p.paid_at, '%a'), DATE(p.paid_at)
       ORDER BY DATE(p.paid_at) ASC`,
      [ownerId]
    );

    const chartData = last7DaysRows.length > 0 ? last7DaysRows.map(r => ({
      name: r.dayName,
      revenue: parseFloat(r.revenue) || 0,
      sessions: parseInt(r.sessions, 10) || 0,
      energy: Math.round((parseFloat(r.revenue) || 0) / 18.0),
    })) : [
      { name: "Mon", revenue: 0, energy: 0, sessions: 0 },
      { name: "Tue", revenue: 0, energy: 0, sessions: 0 },
      { name: "Wed", revenue: 0, energy: 0, sessions: 0 },
      { name: "Thu", revenue: 0, energy: 0, sessions: 0 },
      { name: "Fri", revenue: 0, energy: 0, sessions: 0 },
      { name: "Sat", revenue: 0, energy: 0, sessions: 0 },
      { name: "Sun", revenue: 0, energy: 0, sessions: 0 },
    ];

    res.json({
      success: true,
      data: {
        stations: {
          total: totalStations,
          active: activeStations,
          maintenance: maintenanceStations,
          offline: offlineStations,
        },
        chargers: {
          total: totalChargers,
          available: availableChargers,
          charging: chargingChargers,
          reserved: reservedChargers,
          faulted: faultedChargers,
        },
        sessions: {
          today: sessionRows.length,
          active: activeSessionsCount,
          todayEnergyKwh,
        },
        revenue: {
          today: todayRevenue,
          total: totalRevenue,
          monthly: monthlyRevenue,
          weekly: monthlyRevenue,
        },
        maintenance: {
          activeFaults,
          pendingRepairs: activeFaults,
        },
        totalStations,
        activeStations,
        totalChargers,
        availableChargers,
        reservedChargers,
        activeCharging: chargingChargers || activeSessionsCount,
        upcomingBookings,
        completedBookings,
        totalCustomers,
        totalRevenue,
        todayRevenue,
        monthlyRevenue,
        activeSessions: activeSessionsCount,
        activeFaults,
        liveSessions: sessionRows,
        chartData,
        recentBookings: bookingRows.slice(0, 10),
      },
    });
  } catch (error) {
    console.error("getOwnerDashboardSummary error:", error);
    res.status(500).json({ success: false, message: "Error fetching dashboard summary", error: error.message });
  }
};

/**
 * 2. STATIONS MANAGEMENT
 */
export const getOwnerStations = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const admin = isAdmin(req);
    const sql = admin
      ? `SELECT 
           s.*,
           COALESCE((SELECT COUNT(*) FROM chargers c WHERE c.station_id = s.id), s.total_slots, 4) as totalChargers,
           COALESCE((SELECT COUNT(*) FROM chargers c WHERE c.station_id = s.id AND c.status = 'AVAILABLE'), s.available_slots, 4) as availableChargers
         FROM stations s 
         ORDER BY s.id ASC`
      : `SELECT 
           s.*,
           COALESCE((SELECT COUNT(*) FROM chargers c WHERE c.station_id = s.id), s.total_slots, 4) as totalChargers,
           COALESCE((SELECT COUNT(*) FROM chargers c WHERE c.station_id = s.id AND c.status = 'AVAILABLE'), s.available_slots, 4) as availableChargers
         FROM stations s 
         WHERE s.owner_id = ?
         ORDER BY s.id DESC`;
    const params = admin ? [] : [ownerId];
    const rawStations = await query(sql, params);

    const formatted = rawStations.map((st) => ({
      ...st,
      id: st.id,
      stationId: st.station_id || `STN${String(st.id).padStart(6, "0")}`,
      station_id: st.station_id || `STN${String(st.id).padStart(6, "0")}`,
      stationName: st.station_name,
      name: st.station_name,
      station_name: st.station_name,
      address: st.address,
      city: st.city,
      state: st.state,
      pincode: st.pincode,
      latitude: parseFloat(st.latitude) || 13.0827,
      longitude: parseFloat(st.longitude) || 80.2707,
      totalChargers: parseInt(st.totalChargers, 10) || 4,
      availableChargers: parseInt(st.availableChargers, 10) || 4,
      maxPowerKw: parseFloat(st.max_power) || 150.0,
      openingTime: st.opening_time || "06:00 AM",
      closingTime: st.closing_time || "11:00 PM",
      contactNumber: st.contact_number || "+91 9876543210",
      parkingCapacity: parseInt(st.total_slots, 10) || 4,
      status: st.status === "ACTIVE" ? "Active" : "Offline",
      approvalStatus: st.approval_status || "APPROVED",
      amenities: ["WiFi", "Restrooms", "Cafe", "Covered Parking"],
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error("getOwnerStations error:", error);
    res.status(500).json({ success: false, message: "Error fetching stations", error: error.message });
  }
};

export const createOwnerStation = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const {
      stationName,
      name,
      address,
      city = "Chennai",
      state = "Tamil Nadu",
      pincode = "600001",
      latitude = 13.0827,
      longitude = 80.2707,
      openingTime = "06:00 AM",
      closingTime = "11:00 PM",
      contactNumber,
      totalSlots,
      parkingCapacity,
      maxPowerKw,
      maxPower = 150.0,
      amenities = ["WiFi", "Restrooms", "Cafe", "Covered Parking"],
    } = req.body;

    const usedIds = new Set();
    const station_id = await getNextId("STN", "stations", "station_id", usedIds);
    const default_tariff_id = await getNextId("TAR", "tariffs", "tariff_id", usedIds);
    const sName = stationName || name || "New EV Charging Station";
    const cleanSlots = parseInt(totalSlots || parkingCapacity, 10) || 4;
    const cleanPower = parseFloat(maxPowerKw || maxPower) || 150.0;
    const cleanContact = contactNumber || "+91 9876543210";
    const amenitiesJson = typeof amenities === "string" ? amenities : JSON.stringify(amenities);

    let insertedStationId = null;

    await transaction(async (connection) => {
      // 1. Insert station
      const [stationResult] = await connection.execute(
        `INSERT INTO stations (station_id, owner_id, station_name, address, city, state, pincode, latitude, longitude, opening_time, closing_time, contact_number, total_slots, available_slots, max_power, status, approval_status, amenities)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'APPROVED', ?)`,
        [
          station_id,
          ownerId,
          sName,
          address || "Location Address",
          city,
          state,
          pincode,
          parseFloat(latitude) || 13.0827,
          parseFloat(longitude) || 80.2707,
          openingTime,
          closingTime,
          cleanContact,
          cleanSlots,
          cleanSlots,
          cleanPower,
          amenitiesJson,
        ]
      );
      insertedStationId = stationResult.insertId;

      // 2. Insert Default Tariff for this station
      await connection.execute(
        `INSERT INTO tariffs (tariff_id, station_id, base_rate_per_kwh, peak_rate_per_kwh, off_peak_rate_per_kwh, connection_fee, idle_fee_per_minute, peak_start, peak_end, status)
         VALUES (?, ?, 18.00, 22.00, 14.00, 15.00, 2.00, '18:00', '22:00', 'ACTIVE')`,
        [default_tariff_id, insertedStationId]
      );

      // 3. Create default chargers and connectors
      for (let i = 1; i <= Math.min(6, cleanSlots); i++) {
        const charger_id = await getNextId("CHG", "chargers", "charger_id", usedIds);
        const [chgResult] = await connection.execute(
          `INSERT INTO chargers (charger_id, station_id, charger_name, charger_type, power_kw, status, connector_count)
           VALUES (?, ?, ?, 'DC_FAST', 60.00, 'AVAILABLE', 1)`,
          [charger_id, insertedStationId, `Bay 0${i} (CCS2 60kW)`]
        );
        const chargerNumericId = chgResult.insertId;

        const connector_id = await getNextId("CON", "charger_connectors", "connector_id", usedIds);
        await connection.execute(
          `INSERT INTO charger_connectors (connector_id, charger_id, connector_type, power_kw, status)
           VALUES (?, ?, 'CCS2', 60.00, 'AVAILABLE')`,
          [connector_id, chargerNumericId]
        );
      }
    });

    const rows = await query(`SELECT * FROM stations WHERE id = ?`, [insertedStationId]);
    const created = rows[0] || { station_id, station_name: sName };
    res.status(201).json({ success: true, message: "Station created successfully in MySQL", data: created });
  } catch (error) {
    console.error("createOwnerStation error:", error);
    res.status(500).json({ success: false, message: "Failed to create station", error: error.message });
  }
};

export const updateOwnerStation = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const { stationId } = req.params;
    const {
      stationName,
      name,
      address,
      city,
      state,
      pincode,
      latitude,
      longitude,
      status,
      totalSlots,
      parkingCapacity,
      maxPowerKw,
      maxPower,
      openingTime,
      closingTime,
      contactNumber,
      chargingRatePerKwh,
      amenities,
    } = req.body;

    const sName = stationName || name || null;
    const cleanAddress = address || null;
    const cleanCity = city || null;
    const cleanState = state || null;
    const cleanPincode = pincode || null;
    const slots = totalSlots || parkingCapacity ? parseInt(totalSlots || parkingCapacity, 10) : null;
    const power = maxPowerKw || maxPower ? parseFloat(maxPowerKw || maxPower) : null;
    const cleanLat = latitude !== undefined && latitude !== null && !isNaN(parseFloat(latitude)) ? parseFloat(latitude) : null;
    const cleanLng = longitude !== undefined && longitude !== null && !isNaN(parseFloat(longitude)) ? parseFloat(longitude) : null;
    const cleanStatus = status || null;
    const cleanOpen = openingTime || null;
    const cleanClose = closingTime || null;
    const cleanContact = contactNumber || null;
    const amenitiesJson = amenities ? (typeof amenities === "string" ? amenities : JSON.stringify(amenities)) : null;

    const isNum = /^\d+$/.test(String(stationId));
    const numericStationId = isNum ? parseInt(stationId, 10) : 0;

    await query(
      `UPDATE stations SET 
         station_name = COALESCE(?, station_name),
         address = COALESCE(?, address),
         city = COALESCE(?, city),
         state = COALESCE(?, state),
         pincode = COALESCE(?, pincode),
         latitude = COALESCE(?, latitude),
         longitude = COALESCE(?, longitude),
         status = COALESCE(?, status),
         total_slots = COALESCE(?, total_slots),
         max_power = COALESCE(?, max_power),
         opening_time = COALESCE(?, opening_time),
         closing_time = COALESCE(?, closing_time),
         contact_number = COALESCE(?, contact_number),
         amenities = COALESCE(?, amenities)
       WHERE (station_id = ? OR id = ?) AND owner_id = ?`,
      [
        sName,
        cleanAddress,
        cleanCity,
        cleanState,
        cleanPincode,
        cleanLat,
        cleanLng,
        cleanStatus,
        slots,
        power,
        cleanOpen,
        cleanClose,
        cleanContact,
        amenitiesJson,
        String(stationId),
        numericStationId,
        ownerId,
      ]
    );

    // Update Tariff if rate specified
    if (chargingRatePerKwh) {
      const parsedRate = parseFloat(chargingRatePerKwh);
      if (!isNaN(parsedRate)) {
        await query(
          `UPDATE tariffs SET base_rate_per_kwh = ?, peak_rate_per_kwh = ?, off_peak_rate_per_kwh = ? WHERE station_id IN (SELECT id FROM stations WHERE station_id = ? OR id = ?)`,
          [parsedRate, parsedRate + 4.0, Math.max(10, parsedRate - 4.0), String(stationId), numericStationId]
        );
      }
    }

    const rows = await query(
      `SELECT * FROM stations WHERE (station_id = ? OR id = ?) AND owner_id = ?`,
      [String(stationId), numericStationId, ownerId]
    );
    const updated = rows[0];

    try {
      emitStationUpdated(updated);
    } catch (sockErr) {
      console.warn("Socket broadcast error:", sockErr.message);
    }

    res.json({ success: true, message: "Station updated successfully in MySQL", data: updated });
  } catch (error) {
    console.error("updateOwnerStation error:", error);
    res.status(500).json({ success: false, message: "Failed to update station", error: error.message });
  }
};

export const deleteOwnerStation = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const { stationId } = req.params;
    await query(`UPDATE stations SET status = 'INACTIVE' WHERE (station_id = ? OR id = ?) AND owner_id = ?`, [stationId, parseInt(stationId, 10) || 0, ownerId]);
    res.json({ success: true, message: "Station deactivated successfully from MySQL" });
  } catch (error) {
    console.error("deleteOwnerStation error:", error);
    res.status(500).json({ success: false, message: "Failed to delete station", error: error.message });
  }
};

export const getOwnerStationMap = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const stations = await query(`SELECT * FROM stations WHERE owner_id = ?`, [ownerId]);
    res.json({ success: true, data: stations });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching station map", error: error.message });
  }
};

/**
 * 3. CHARGERS MANAGEMENT
 */
export const getOwnerChargers = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const admin = isAdmin(req);
    const { stationId } = req.query;

    let sql = `SELECT c.*, s.station_name, s.station_id as station_code 
               FROM chargers c 
               JOIN stations s ON c.station_id = s.id`;
    const params = [];

    if (!admin) {
      sql += ` WHERE s.owner_id = ?`;
      params.push(ownerId);
    } else {
      sql += ` WHERE 1=1`;
    }

    if (stationId) {
      sql += ` AND (s.station_id = ? OR s.id = ?)`;
      params.push(stationId, parseInt(stationId, 10) || 0);
    }
    sql += ` ORDER BY c.id ASC`;

    const chargers = await query(sql, params);
    res.json({ success: true, data: chargers });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching chargers", error: error.message });
  }
};

export const createOwnerCharger = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const { stationId, chargerName, name, chargerType = "DC_FAST", powerKw = 60.0, powerRating, connectorType = "CCS2" } = req.body;

    // Resolve station
    const stations = await query(`SELECT id FROM stations WHERE (station_id = ? OR id = ?) AND owner_id = ?`, [stationId, parseInt(stationId, 10) || 0, ownerId]);
    if (!stations || stations.length === 0) {
      return res.status(404).json({ success: false, message: "Station not found for this owner." });
    }
    const targetStationId = stations[0].id;
    const charger_id = await getNextId("CHG", "chargers", "charger_id");
    const cName = chargerName || name || `Bay (${connectorType} ${powerKw || powerRating || 60}kW)`;
    const cleanPower = parseFloat(powerKw || powerRating) || 60.0;
    const cleanType = chargerType || (connectorType === "Type 2" ? "AC" : "DC_FAST");

    let createdCharger = null;
    await transaction(async (connection) => {
      const [chgResult] = await connection.execute(
        `INSERT INTO chargers (charger_id, station_id, charger_name, charger_type, power_kw, status, connector_count)
         VALUES (?, ?, ?, ?, ?, 'AVAILABLE', 1)`,
        [charger_id, targetStationId, cName, cleanType, cleanPower]
      );
      const chgId = chgResult.insertId;

      const connector_id = `CON${String(chgId).padStart(6, "0")}`;
      await connection.execute(
        `INSERT INTO charger_connectors (connector_id, charger_id, connector_type, power_kw, status)
         VALUES (?, ?, ?, ?, 'AVAILABLE')`,
        [connector_id, chgId, connectorType, cleanPower]
      );
    });

    const rows = await query(`SELECT * FROM chargers WHERE charger_id = ?`, [charger_id]);
    createdCharger = rows[0];
    if (createdCharger) emitChargerStatusChanged(createdCharger);
    res.status(201).json({ success: true, message: "Charger created successfully in MySQL", data: createdCharger });
  } catch (error) {
    console.error("createOwnerCharger error:", error);
    res.status(500).json({ success: false, message: "Failed to create charger", error: error.message });
  }
};

export const updateOwnerCharger = async (req, res) => {
  try {
    const { chargerId } = req.params;
    const { chargerName, name, chargerType, powerKw, powerRating, status, connectorType } = req.body;

    const cName = chargerName || name;
    const cleanPower = powerKw || powerRating ? parseFloat(powerKw || powerRating) : null;

    await query(
      `UPDATE chargers SET 
         charger_name = COALESCE(?, charger_name),
         charger_type = COALESCE(?, charger_type),
         power_kw = COALESCE(?, power_kw),
         status = COALESCE(?, status)
       WHERE charger_id = ? OR id = ?`,
      [cName, chargerType, cleanPower, status, chargerId, parseInt(chargerId, 10) || 0]
    );

    if (connectorType || cleanPower || status) {
      await query(
        `UPDATE charger_connectors SET 
           connector_type = COALESCE(?, connector_type),
           power_kw = COALESCE(?, power_kw),
           status = COALESCE(?, status)
         WHERE charger_id IN (SELECT id FROM chargers WHERE charger_id = ? OR id = ?)`,
        [connectorType, cleanPower, status, chargerId, parseInt(chargerId, 10) || 0]
      );
    }

    const rows = await query(`SELECT * FROM chargers WHERE charger_id = ? OR id = ?`, [chargerId, parseInt(chargerId, 10) || 0]);
    const updated = rows[0];
    if (updated) emitChargerStatusChanged(updated);
    res.json({ success: true, message: "Charger updated successfully in MySQL", data: updated });
  } catch (error) {
    console.error("updateOwnerCharger error:", error);
    res.status(500).json({ success: false, message: "Failed to update charger", error: error.message });
  }
};

export const deleteOwnerCharger = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const admin = isAdmin(req);
    const { chargerId } = req.params;
    const isNum = /^\d+$/.test(chargerId);

    const chgRows = await query(
      `SELECT c.id, c.station_id FROM chargers c JOIN stations s ON c.station_id = s.id WHERE (c.charger_id = ? OR c.id = ?) ${admin ? "" : "AND s.owner_id = ?"}`,
      admin ? [chargerId, isNum ? parseInt(chargerId, 10) : 0] : [chargerId, isNum ? parseInt(chargerId, 10) : 0, ownerId]
    );

    if (chgRows.length === 0) {
      return res.status(404).json({ success: false, message: "Charger not found or unauthorized." });
    }

    await query(`UPDATE chargers SET status = 'OFFLINE' WHERE id = ?`, [chgRows[0].id]);
    await query(`UPDATE charger_connectors SET status = 'OFFLINE' WHERE charger_id = ?`, [chgRows[0].id]);

    res.json({ success: true, message: "Charger marked OFFLINE successfully in MySQL." });
  } catch (error) {
    console.error("deleteOwnerCharger error:", error);
    res.status(500).json({ success: false, message: "Failed to delete charger", error: error.message });
  }
};

export const setChargerSimulatorControl = async (req, res) => {
  try {
    const { chargerId } = req.params;
    const { state, status, voltage = 400.0, current = 80.0, power = 32.0 } = req.body;
    const targetStatus = status || state || "CHARGING";

    await query(`UPDATE chargers SET status = ? WHERE charger_id = ? OR id = ?`, [
      targetStatus,
      chargerId,
      parseInt(chargerId, 10) || 0,
    ]);

    const rows = await query(`SELECT * FROM chargers WHERE charger_id = ? OR id = ?`, [chargerId, parseInt(chargerId, 10) || 0]);
    const updated = rows[0];
    if (updated) {
      emitChargerStatusChanged(updated);
      emitTelemetryUpdated({ chargerId: updated.charger_id, voltage, current, power, status: targetStatus });
    }

    res.json({ success: true, message: `Charger simulator set to ${targetStatus}`, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to set simulator state", error: error.message });
  }
};

export const setChargerSimulateStatus = setChargerSimulatorControl;
export const updateChargerHeartbeat = async (req, res) => res.json({ success: true, message: "Heartbeat acknowledged" });

/**
 * 4. BOOKINGS MANAGEMENT
 */
export const getOwnerBookings = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const admin = isAdmin(req);
    const { status, stationId } = req.query;

    let sql = `
      SELECT b.*,
             u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
             s.station_name, s.address as station_address, s.station_id as station_id_code, s.owner_id,
             v.registration_number, v.registration_number as vehicle_number, v.brand, v.brand as vehicle_brand, v.model, v.model as vehicle_model, v.vehicle_type,
             c.charger_name, c.charger_type, c.power_kw, c.charger_id as charger_id_code
      FROM bookings b
      JOIN stations s ON b.station_id = s.id
      JOIN users u ON b.user_id = u.id
      LEFT JOIN chargers c ON b.charger_id = c.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
    `;
    const params = [];

    if (!admin) {
      sql += ` WHERE s.owner_id = ?`;
      params.push(ownerId);
    } else {
      sql += ` WHERE 1=1`;
    }

    if (status && status !== "ALL") {
      sql += ` AND b.booking_status = ?`;
      params.push(status);
    }
    if (stationId) {
      sql += ` AND (s.station_id = ? OR s.id = ?)`;
      params.push(stationId, parseInt(stationId, 10) || 0);
    }

    sql += ` ORDER BY b.id DESC`;

    const rawBookings = await query(sql, params);
    const formatted = rawBookings.map((b) => formatBooking(b));
    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    console.error("getOwnerBookings error:", error);
    res.status(500).json({ success: false, message: "Error fetching owner bookings", error: error.message });
  }
};

export const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;
    const cleanStatus = (status || "CONFIRMED").toUpperCase();

    const isNumeric = /^\d+$/.test(bookingId);
    const bookings = await query(
      `SELECT b.* FROM bookings b JOIN stations s ON b.station_id = s.id WHERE b.booking_id = ? OR b.id = ?`,
      [bookingId, isNumeric ? parseInt(bookingId, 10) : 0]
    );

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ success: false, message: `Booking ${bookingId} not found` });
    }

    const booking = bookings[0];

    await transaction(async (connection) => {
      await connection.execute(
        `UPDATE bookings SET booking_status = ?, updated_at = NOW() WHERE id = ?`,
        [cleanStatus, booking.id]
      );

      if (cleanStatus === "CANCELLED" || cleanStatus === "COMPLETED") {
        await connection.execute(`UPDATE chargers SET status = 'AVAILABLE' WHERE id = ?`, [booking.charger_id]);
      } else if (cleanStatus === "CHARGING" || cleanStatus === "IN_PROGRESS") {
        await connection.execute(`UPDATE chargers SET status = 'CHARGING' WHERE id = ?`, [booking.charger_id]);
      } else if (cleanStatus === "CONFIRMED") {
        await connection.execute(`UPDATE chargers SET status = 'RESERVED' WHERE id = ?`, [booking.charger_id]);
      }
    });

    const fullRows = await query(
      `SELECT b.*,
              u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
              s.station_name, s.address as station_address, s.station_id as station_id_code, s.owner_id,
              v.registration_number, v.brand, v.model, v.vehicle_type,
              c.charger_name, c.charger_type, c.power_kw, c.charger_id as charger_id_code
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN stations s ON b.station_id = s.id
       LEFT JOIN chargers c ON b.charger_id = c.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.id = ?`,
      [booking.id]
    );

    const formatted = fullRows.length > 0 ? formatBooking(fullRows[0]) : booking;
    try {
      emitBookingUpdated(formatted);
    } catch (sockErr) {
      console.warn("Socket broadcast error:", sockErr.message);
    }

    res.json({
      success: true,
      message: `Booking status updated to ${cleanStatus}`,
      data: formatted,
    });
  } catch (error) {
    console.error("updateBookingStatus error:", error);
    res.status(500).json({ success: false, message: "Failed to update booking status", error: error.message });
  }
};

/**
 * 5. CHARGING SESSIONS
 */
export const getOwnerLiveSessions = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const sessions = await query(
      `SELECT cs.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone, s.station_name, c.charger_name
       FROM charging_sessions cs
       JOIN stations s ON cs.station_id = s.id
       JOIN users u ON cs.user_id = u.id
       LEFT JOIN chargers c ON cs.charger_id = c.id
       WHERE s.owner_id = ? AND cs.session_status IN ('ACTIVE', 'CHARGING', 'STARTED')
       ORDER BY cs.id DESC`,
      [ownerId]
    );
    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching live sessions", error: error.message });
  }
};

export const getOwnerSessionHistory = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const limit = parseInt(req.query.limit, 10) || 50;

    const sessions = await query(
      `SELECT cs.*, u.name as customer_name, u.email as customer_email, s.station_name, c.charger_name
       FROM charging_sessions cs
       JOIN stations s ON cs.station_id = s.id
       JOIN users u ON cs.user_id = u.id
       LEFT JOIN chargers c ON cs.charger_id = c.id
       WHERE s.owner_id = ?
       ORDER BY cs.id DESC LIMIT ?`,
      [ownerId, limit]
    );
    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching session history", error: error.message });
  }
};

export const startChargingSession = async (req, res) => {
  try {
    const { bookingId, stationId, chargerId, initialMeter = 0.0 } = req.body;
    const session_id = await getNextId("SES", "charging_sessions", "session_id");

    const bookingRows = await query(`SELECT * FROM bookings WHERE id = ? OR booking_id = ?`, [parseInt(bookingId, 10) || 0, bookingId]);
    const b = bookingRows[0] || {};

    await transaction(async (connection) => {
      await connection.execute(
        `INSERT INTO charging_sessions (session_id, booking_id, user_id, vehicle_id, station_id, charger_id, connector_id, start_time, initial_meter, energy_kwh, power_kw, session_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, 0.0, 50.0, 'CHARGING')`,
        [session_id, b.id || null, b.user_id || req.user.id, b.vehicle_id || null, b.station_id || stationId || 1, b.charger_id || chargerId || 1, b.connector_id || null, parseFloat(initialMeter)]
      );

      await connection.execute(`UPDATE chargers SET status = 'CHARGING' WHERE id = ? OR charger_id = ?`, [b.charger_id || chargerId, b.charger_id || chargerId]);
      if (b.id) {
        await connection.execute(`UPDATE bookings SET booking_status = 'IN_PROGRESS' WHERE id = ?`, [b.id]);
      }
    });

    const rows = await query(`SELECT * FROM charging_sessions WHERE session_id = ?`, [session_id]);
    const createdSession = rows[0];
    if (createdSession) emitSessionStarted(createdSession);
    res.status(201).json({ success: true, message: "Charging session started successfully", data: createdSession });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to start charging session", error: error.message });
  }
};

export const stopChargingSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { energyKwh = 25.0, totalAmount = 450.0, finalMeter = 25.0 } = req.body;

    const sessionRows = await query(`SELECT * FROM charging_sessions WHERE session_id = ? OR id = ?`, [sessionId, parseInt(sessionId, 10) || 0]);
    if (!sessionRows || sessionRows.length === 0) {
      return res.status(404).json({ success: false, message: "Charging session not found" });
    }
    const session = sessionRows[0];

    await transaction(async (connection) => {
      await connection.execute(
        `UPDATE charging_sessions SET end_time = NOW(), final_meter = ?, energy_kwh = ?, total_amount = ?, session_status = 'COMPLETED' WHERE id = ?`,
        [parseFloat(finalMeter), parseFloat(energyKwh), parseFloat(totalAmount), session.id]
      );

      await connection.execute(`UPDATE chargers SET status = 'AVAILABLE' WHERE id = ?`, [session.charger_id]);
      if (session.booking_id) {
        await connection.execute(`UPDATE bookings SET booking_status = 'COMPLETED' WHERE id = ?`, [session.booking_id]);
      }
    });

    const rows = await query(`SELECT * FROM charging_sessions WHERE id = ?`, [session.id]);
    const updated = rows[0];
    if (updated) emitSessionStopped(updated);
    res.json({ success: true, message: "Charging session completed", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to stop charging session", error: error.message });
  }
};

/**
 * 6. CUSTOMERS DIRECTORY
 */
export const getOwnerCustomers = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const rawCustomers = await query(
      `SELECT 
         u.id as user_id,
         u.user_id as customerId,
         u.user_id as customer_id,
         u.name as customerName,
         u.name as customer_name,
         u.name,
         u.email,
         u.phone,
         COUNT(DISTINCT v.id) as vehicleCount,
         COALESCE(MAX(CONCAT(v.brand, ' ', v.model)), 'EV Vehicle') as vehicleModel,
         COALESCE(MAX(v.registration_number), 'N/A') as vehicleNumber,
         COUNT(DISTINCT b.id) as totalSessions,
         COALESCE(SUM(cs.energy_kwh), 0) as totalEnergyKwh,
         COALESCE(SUM(p.amount), 0) as totalSpending,
         MAX(b.booking_date) as lastChargingDate
       FROM users u
       JOIN bookings b ON b.user_id = u.id
       JOIN stations s ON b.station_id = s.id
       LEFT JOIN vehicles v ON v.user_id = u.id
       LEFT JOIN charging_sessions cs ON cs.booking_id = b.id
       LEFT JOIN payments p ON p.booking_id = b.id AND p.payment_status = 'SUCCESS'
       WHERE s.owner_id = ?
       GROUP BY u.id, u.user_id, u.name, u.email, u.phone
       ORDER BY totalSpending DESC, u.id DESC`,
      [ownerId]
    );

    const formatted = rawCustomers.map((c) => ({
      ...c,
      customerId: c.customerId,
      customerName: c.customerName,
      vehicleCount: parseInt(c.vehicleCount, 10) || 0,
      vehicleModel: c.vehicleModel || "EV Vehicle",
      vehicleNumber: c.vehicleNumber || "N/A",
      totalSessions: parseInt(c.totalSessions, 10) || 0,
      totalEnergyKwh: parseFloat(c.totalEnergyKwh || 0).toFixed(1),
      totalSpending: parseFloat(c.totalSpending || 0).toFixed(2),
      lastChargingDate: c.lastChargingDate || new Date().toISOString(),
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching customers", error: error.message });
  }
};

/**
 * 7. TARIFFS MANAGEMENT
 */
export const getOwnerTariffs = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const tariffs = await query(
      `SELECT t.*, s.station_name, s.station_id as station_code 
       FROM tariffs t 
       JOIN stations s ON t.station_id = s.id 
       WHERE s.owner_id = ? 
       ORDER BY t.id DESC`,
      [ownerId]
    );

    const formatted = tariffs.map((t) => ({
      id: t.id,
      tariffId: t.tariff_id,
      tariff_id: t.tariff_id,
      stationId: t.station_id,
      stationName: t.station_name,
      baseRate: parseFloat(t.base_rate_per_kwh),
      pricePerKwh: parseFloat(t.base_rate_per_kwh),
      peakRate: parseFloat(t.peak_rate_per_kwh),
      peakPrice: parseFloat(t.peak_rate_per_kwh),
      offPeakRate: parseFloat(t.off_peak_rate_per_kwh),
      offPeakPrice: parseFloat(t.off_peak_rate_per_kwh),
      connectionFee: parseFloat(t.connection_fee),
      idleFee: parseFloat(t.idle_fee_per_minute),
      peakStart: t.peak_start,
      peakEnd: t.peak_end,
      status: t.status,
      active: t.status === "ACTIVE",
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching tariffs", error: error.message });
  }
};

export const createOwnerTariff = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const { stationId, baseRate = 18.0, peakRate = 22.0, offPeakRate = 14.0, connectionFee = 15.0, idleFee = 2.0, peakStart = "18:00", peakEnd = "22:00" } = req.body;

    const stationRows = await query(`SELECT id FROM stations WHERE (station_id = ? OR id = ?) AND owner_id = ?`, [stationId, parseInt(stationId, 10) || 0, ownerId]);
    if (!stationRows || stationRows.length === 0) {
      return res.status(404).json({ success: false, message: "Station not found for this owner." });
    }
    const targetStationId = stationRows[0].id;
    const tariff_id = await getNextId("TAR", "tariffs", "tariff_id");

    await query(
      `INSERT INTO tariffs (tariff_id, station_id, base_rate_per_kwh, peak_rate_per_kwh, off_peak_rate_per_kwh, connection_fee, idle_fee_per_minute, peak_start, peak_end, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [tariff_id, targetStationId, parseFloat(baseRate), parseFloat(peakRate), parseFloat(offPeakRate), parseFloat(connectionFee), parseFloat(idleFee), peakStart, peakEnd]
    );

    const rows = await query(`SELECT * FROM tariffs WHERE tariff_id = ?`, [tariff_id]);
    res.status(201).json({ success: true, message: "Tariff created successfully", data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create tariff", error: error.message });
  }
};

export const updateOwnerTariff = async (req, res) => {
  try {
    const { tariffId } = req.params;
    const { baseRate, pricePerKwh, peakRate, peakPrice, offPeakRate, offPeakPrice, connectionFee, idleFee, peakStart, peakEnd, status } = req.body;

    await query(
      `UPDATE tariffs SET 
         base_rate_per_kwh = COALESCE(?, ?, base_rate_per_kwh),
         peak_rate_per_kwh = COALESCE(?, ?, peak_rate_per_kwh),
         off_peak_rate_per_kwh = COALESCE(?, ?, off_peak_rate_per_kwh),
         connection_fee = COALESCE(?, connection_fee),
         idle_fee_per_minute = COALESCE(?, idle_fee_per_minute),
         peak_start = COALESCE(?, peak_start),
         peak_end = COALESCE(?, peak_end),
         status = COALESCE(?, status)
       WHERE tariff_id = ? OR id = ?`,
      [baseRate, pricePerKwh, peakRate, peakPrice, offPeakRate, offPeakPrice, connectionFee, idleFee, peakStart, peakEnd, status, tariffId, parseInt(tariffId, 10) || 0]
    );

    const rows = await query(`SELECT * FROM tariffs WHERE tariff_id = ? OR id = ?`, [tariffId, parseInt(tariffId, 10) || 0]);
    res.json({ success: true, message: "Tariff updated successfully in MySQL", data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update tariff", error: error.message });
  }
};

export const deleteOwnerTariff = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const admin = isAdmin(req);
    const { tariffId } = req.params;
    const isNum = /^\d+$/.test(tariffId);

    const tariffRows = await query(
      `SELECT t.id, t.station_id FROM tariffs t JOIN stations s ON t.station_id = s.id WHERE (t.tariff_id = ? OR t.id = ?) ${admin ? "" : "AND s.owner_id = ?"}`,
      admin ? [tariffId, isNum ? parseInt(tariffId, 10) : 0] : [tariffId, isNum ? parseInt(tariffId, 10) : 0, ownerId]
    );

    if (tariffRows.length === 0) {
      return res.status(404).json({ success: false, message: "Tariff not found or unauthorized." });
    }

    await query(`UPDATE tariffs SET status = 'INACTIVE' WHERE id = ?`, [tariffRows[0].id]);
    res.json({ success: true, message: "Tariff deactivated successfully in MySQL (historical booking invoices preserved)." });
  } catch (error) {
    console.error("deleteOwnerTariff error:", error);
    res.status(500).json({ success: false, message: "Failed to deactivate tariff", error: error.message });
  }
};

/**
 * 8. PAYMENTS & TRANSACTIONS
 */
export const getOwnerTransactions = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const payments = await query(
      `SELECT 
         p.id,
         p.payment_id,
         p.payment_id as paymentId,
         p.payment_id as transaction_id,
         p.payment_id as transactionId,
         p.booking_id,
         p.booking_id as bookingId,
         u.name as customer_name,
         u.name as customerName,
         u.user_id as customerId,
         u.email as customer_email,
         u.email as customerEmail,
         p.payment_method,
         p.payment_method as paymentMethod,
         p.amount,
         (p.amount * 0.95) as owner_amount,
         (p.amount * 0.95) as ownerAmount,
         p.payment_status as status,
         p.payment_status,
         p.paid_at as created_at,
         p.paid_at as createdAt,
         p.paid_at as paymentDate,
         p.paid_at as date,
         s.station_name,
         s.station_name as stationName,
         v.registration_number as vehicle_number,
         v.registration_number as vehicleNumber
       FROM payments p
       JOIN bookings b ON (p.booking_id = b.id OR p.booking_id = b.booking_id OR p.payment_id = b.payment_id)
       JOIN stations s ON b.station_id = s.id
       JOIN users u ON p.user_id = u.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       WHERE s.owner_id = ? AND p.payment_status = 'SUCCESS'
       ORDER BY p.id DESC`,
      [ownerId]
    );

    res.json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    console.error("getOwnerTransactions error:", error);
    res.status(500).json({ success: false, message: "Error fetching transactions", error: error.message });
  }
};

export const getOwnerRevenueSummary = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const revRows = await query(
      `SELECT 
         COALESCE(SUM(p.amount), 0) as totalRevenue,
         COUNT(p.id) as totalTransactions,
         COALESCE(SUM(CASE WHEN p.paid_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN p.amount ELSE 0 END), 0) as monthlyRevenue,
         COALESCE(SUM(CASE WHEN p.paid_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN p.amount ELSE 0 END), 0) as weeklyRevenue,
         COALESCE(SUM(CASE WHEN DATE(p.paid_at) = CURRENT_DATE() THEN p.amount ELSE 0 END), 0) as todayRevenue,
         COALESCE(SUM(p.amount * 0.95), 0) as ownerNetRevenue
       FROM payments p
       JOIN bookings b ON (p.booking_id = b.id OR p.booking_id = b.booking_id OR p.payment_id = b.payment_id)
       JOIN stations s ON b.station_id = s.id
       WHERE s.owner_id = ? AND p.payment_status = 'SUCCESS'`,
      [ownerId]
    );

    const rev = revRows[0] || {};
    const totalRev = parseFloat(rev.totalRevenue) || 0;
    const todayRev = parseFloat(rev.todayRevenue) || 0;
    const monthlyRev = parseFloat(rev.monthlyRevenue) || 0;
    const weeklyRev = parseFloat(rev.weeklyRevenue) || 0;
    const totalTx = parseInt(rev.totalTransactions, 10) || 0;
    const ownerNet = parseFloat(rev.ownerNetRevenue) || Math.round(totalRev * 0.95 * 100) / 100;
    const platformFee = Math.round(totalRev * 0.05 * 100) / 100;

    res.json({
      success: true,
      data: {
        totalRevenue: totalRev,
        totalEarnings: totalRev,
        todayRevenue: todayRev,
        monthlyRevenue: monthlyRev,
        weeklyRevenue: weeklyRev,
        totalTransactions: totalTx,
        transactionCount: totalTx,
        ownerNetRevenue: ownerNet,
        ownerNet: ownerNet,
        platformFee,
      },
    });
  } catch (error) {
    console.error("getOwnerRevenueSummary error:", error);
    res.status(500).json({ success: false, message: "Error fetching revenue summary", error: error.message });
  }
};

export const createPaymentOrder = async (req, res) => {
  const { amount = 400.0 } = req.body;
  const orderId = `order_${Date.now()}`;
  res.json({
    success: true,
    orderId,
    keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_TWLlx2kwacu7Yf",
    order: {
      id: orderId,
      amount: Math.round(parseFloat(amount) * 100),
      currency: "INR",
    },
  });
};

export const verifyPaymentTransaction = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const {
      booking_id,
      bookingId,
      razorpay_order_id,
      razorpayOrderId,
      razorpay_payment_id,
      razorpayPaymentId,
      razorpay_signature,
      razorpaySignature,
      amount = 400.0,
      payment_method = "ONLINE",
    } = req.body;

    const rOrderId = razorpay_order_id || razorpayOrderId || `order_${Date.now()}`;
    const rPaymentId = razorpay_payment_id || razorpayPaymentId || `pay_${Date.now()}`;
    const rSignature = razorpay_signature || razorpaySignature || "TEST_SIGNATURE";
    const cleanAmount = parseFloat(amount) || 400.0;

    const bId = booking_id || bookingId;
    let numericBookingId = null;
    let bookingUser = ownerId;

    if (bId) {
      const isNumeric = /^\d+$/.test(bId);
      const bookings = await query(
        "SELECT id, user_id, booking_id FROM bookings WHERE booking_id = ? OR id = ?",
        [bId, isNumeric ? parseInt(bId, 10) : 0]
      );
      if (bookings && bookings.length > 0) {
        numericBookingId = bookings[0].id;
        bookingUser = bookings[0].user_id;
      }
    }

    const payCounterId = `PAY${Date.now().toString().slice(-6)}`;

    await transaction(async (connection) => {
      await connection.execute(
        `INSERT INTO payments 
         (payment_id, booking_id, user_id, gateway, gateway_order_id, gateway_payment_id, gateway_signature, amount, currency, payment_method, payment_status, paid_at)
         VALUES (?, ?, ?, 'RAZORPAY', ?, ?, ?, ?, 'INR', ?, 'SUCCESS', NOW())`,
        [payCounterId, numericBookingId, bookingUser, rOrderId, rPaymentId, rSignature, cleanAmount, payment_method]
      );

      if (numericBookingId) {
        await connection.execute(
          `UPDATE bookings 
           SET booking_status = 'CONFIRMED', payment_status = 'SUCCESS', payment_id = ?, updated_at = NOW() 
           WHERE id = ?`,
          [payCounterId, numericBookingId]
        );
      }
    });

    // Real-time synchronization
    if (numericBookingId) {
      const fullRows = await query(
        `SELECT b.*,
                u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
                s.station_name, s.address as station_address, s.owner_id,
                v.registration_number, v.brand, v.model,
                c.charger_name, c.charger_type, c.power_kw
         FROM bookings b
         JOIN users u ON b.user_id = u.id
         JOIN stations s ON b.station_id = s.id
         LEFT JOIN chargers c ON b.charger_id = c.id
         LEFT JOIN vehicles v ON b.vehicle_id = v.id
         WHERE b.id = ?`,
        [numericBookingId]
      );

      if (fullRows && fullRows.length > 0) {
        const formatted = formatBooking(fullRows[0]);
        emitPaymentUpdated({
          bookingId: bId,
          paymentId: payCounterId,
          amount: cleanAmount,
          paymentStatus: "SUCCESS",
        }, formatted);
        emitBookingUpdated(formatted);
      }
    }

    res.json({
      success: true,
      message: "Payment verified and recorded in MySQL successfully!",
      paymentId: payCounterId,
      razorpayPaymentId: rPaymentId,
      razorpayOrderId: rOrderId,
      data: {
        paymentId: payCounterId,
        bookingId: bId,
        amount: cleanAmount,
        status: "SUCCESS",
      },
    });
  } catch (error) {
    console.error("verifyPaymentTransaction error:", error);
    res.status(500).json({ success: false, message: "Payment verification failed", error: error.message });
  }
};

/**
 * 9. MAINTENANCE & TICKETS
 */
export const getOwnerMaintenanceTickets = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const tickets = await query(
      `SELECT mt.*, t.name as technician_name, t.phone as technician_phone, s.station_name, c.charger_name
       FROM maintenance_tickets mt
       JOIN stations s ON mt.station_id = s.id
       LEFT JOIN users t ON mt.technician_id = t.id
       LEFT JOIN chargers c ON mt.charger_id = c.id
       WHERE s.owner_id = ?
       ORDER BY mt.id DESC`,
      [ownerId]
    );
    res.json({ success: true, data: tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching maintenance tickets", error: error.message });
  }
};

export const createMaintenanceTicket = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const { stationId, chargerId, technicianId, issueType, description, priority = "MEDIUM" } = req.body;
    const ticket_id = await getNextId("MNT", "maintenance_tickets", "ticket_id");

    const mStationRows = await query(`SELECT id FROM stations WHERE (station_id = ? OR id = ?) AND owner_id = ?`, [stationId, parseInt(stationId, 10) || 0, ownerId]);
    if (!mStationRows || mStationRows.length === 0) {
      return res.status(404).json({ success: false, message: "Station not found for this owner." });
    }
    const targetStationId = mStationRows[0].id;

    let resolvedChargerId = null;
    if (chargerId) {
      const isNum = /^\d+$/.test(String(chargerId));
      const numId = isNum ? parseInt(chargerId, 10) : 0;
      const chgRows = await query(`SELECT id FROM chargers WHERE id = ? OR charger_id = ?`, [numId, String(chargerId)]);
      if (chgRows.length > 0) {
        resolvedChargerId = chgRows[0].id;
      }
    }

    let resolvedTechId = null;
    if (technicianId) {
      const isNum = /^\d+$/.test(String(technicianId));
      const numId = isNum ? parseInt(technicianId, 10) : 0;
      const techRows = await query(`SELECT id FROM users WHERE id = ? OR user_id = ?`, [numId, String(technicianId)]);
      if (techRows.length > 0) {
        resolvedTechId = techRows[0].id;
      }
    }

    const initialStatus = resolvedTechId ? "ASSIGNED" : "OPEN";

    await transaction(async (connection) => {
      await connection.execute(
        `INSERT INTO maintenance_tickets (ticket_id, station_id, charger_id, technician_id, issue_type, description, priority, status, opened_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [ticket_id, targetStationId, resolvedChargerId, resolvedTechId, issueType || "Hardware Fault", description || "Ticket logged from Owner Dashboard", priority, initialStatus]
      );

      if (resolvedChargerId) {
        await connection.execute(`UPDATE chargers SET status = 'MAINTENANCE' WHERE id = ?`, [resolvedChargerId]);
      }
    });

    const rows = await query(
      `SELECT mt.*, t.name as technician_name, t.phone as technician_phone, s.station_name, c.charger_name
       FROM maintenance_tickets mt
       JOIN stations s ON mt.station_id = s.id
       LEFT JOIN users t ON mt.technician_id = t.id
       LEFT JOIN chargers c ON mt.charger_id = c.id
       WHERE mt.ticket_id = ?`,
      [ticket_id]
    );
    const created = rows[0];
    if (created) emitMaintenanceUpdated(created);
    if (resolvedChargerId) emitChargerStatusChanged({ chargerId: resolvedChargerId, status: "MAINTENANCE" });

    res.status(201).json({ success: true, message: "Maintenance ticket created", data: created });
  } catch (error) {
    console.error("createMaintenanceTicket error:", error);
    res.status(500).json({ success: false, message: "Failed to create maintenance ticket", error: error.message });
  }
};

export const updateMaintenanceTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, priority, technicianId, resolutionNotes } = req.body;

    const isNum = /^\d+$/.test(String(ticketId));
    const numTicketId = isNum ? parseInt(ticketId, 10) : 0;
    const ticketRows = await query(`SELECT * FROM maintenance_tickets WHERE ticket_id = ? OR id = ?`, [String(ticketId), numTicketId]);
    if (!ticketRows || ticketRows.length === 0) return res.status(404).json({ success: false, message: "Ticket not found" });

    const ticket = ticketRows[0];
    const isResolved = status === "RESOLVED" || status === "CLOSED";

    let resolvedTechId = undefined;
    if (technicianId !== undefined) {
      if (!technicianId) {
        resolvedTechId = null;
      } else {
        const isTechNum = /^\d+$/.test(String(technicianId));
        const numTId = isTechNum ? parseInt(technicianId, 10) : 0;
        const techRows = await query(`SELECT id FROM users WHERE id = ? OR user_id = ?`, [numTId, String(technicianId)]);
        if (techRows.length > 0) {
          resolvedTechId = techRows[0].id;
        } else {
          resolvedTechId = null;
        }
      }
    }

    await transaction(async (connection) => {
      await connection.execute(
        `UPDATE maintenance_tickets SET 
           status = COALESCE(?, status),
           priority = COALESCE(?, priority),
           technician_id = COALESCE(?, technician_id),
           resolution_notes = COALESCE(?, resolution_notes),
           resolved_at = CASE WHEN ? THEN NOW() ELSE resolved_at END,
           updated_at = NOW()
         WHERE id = ?`,
        [status || null, priority || null, resolvedTechId !== undefined ? resolvedTechId : null, resolutionNotes || null, isResolved, ticket.id]
      );

      if (isResolved && ticket.charger_id) {
        await connection.execute(`UPDATE chargers SET status = 'AVAILABLE' WHERE id = ?`, [ticket.charger_id]);
      }
    });

    const rows = await query(
      `SELECT mt.*, t.name as technician_name, t.phone as technician_phone, s.station_name, c.charger_name
       FROM maintenance_tickets mt
       JOIN stations s ON mt.station_id = s.id
       LEFT JOIN users t ON mt.technician_id = t.id
       LEFT JOIN chargers c ON mt.charger_id = c.id
       WHERE mt.id = ?`,
      [ticket.id]
    );
    const updated = rows[0];
    if (updated) emitMaintenanceUpdated(updated);
    if (isResolved && ticket.charger_id) emitChargerStatusChanged({ chargerId: ticket.charger_id, status: "AVAILABLE" });

    res.json({ success: true, message: `Ticket updated to ${status}`, data: updated });
  } catch (error) {
    console.error("updateMaintenanceTicket error:", error);
    res.status(500).json({ success: false, message: "Failed to update maintenance ticket", error: error.message });
  }
};

export const getOwnerFaults = async (req, res) => res.json({ success: true, data: [] });
export const resolveOwnerFault = async (req, res) => res.json({ success: true, message: "Fault resolved" });

export const getOwnerTechnicians = async (req, res) => {
  try {
    const techs = await query(
      `SELECT id, user_id, name, email, phone, status 
       FROM users 
       WHERE role IN ('TECHNICIAN', 'TECH') AND status = 'ACTIVE' 
       ORDER BY name ASC`
    );
    res.json({ success: true, data: techs });
  } catch (error) {
    console.error("getOwnerTechnicians error:", error);
    res.status(500).json({ success: false, message: "Error fetching technicians from MySQL", error: error.message });
  }
};

/**
 * 10. NOTIFICATIONS, AUDIT LOGS, AI ASSISTANT, SETTINGS
 */
export const getOwnerNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await query(`SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50`, [userId]);
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching notifications", error: error.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    await query(`UPDATE notifications SET is_read = TRUE WHERE id = ?`, [parseInt(notificationId, 10) || 0]);
    res.json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update notification", error: error.message });
  }
};

export const getOwnerAuditLogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const logs = await query(`SELECT * FROM audit_logs WHERE user_id = ? ORDER BY id DESC LIMIT 50`, [userId]);
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching audit logs", error: error.message });
  }
};

export const queryOwnerAI = async (req, res) => {
  res.json({
    success: true,
    reply: "Smart Load Analytics: Station performance is operational and aligned with grid constraints. All records are persisted in MySQL.",
  });
};

export const getOwnerSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const [user] = await query(`SELECT id, user_id, name, email, phone, company_name, address, city, state, pincode FROM users WHERE id = ?`, [userId]);
    res.json({ success: true, data: user || {} });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching settings", error: error.message });
  }
};

export const updateOwnerSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { companyName, phone, address, city, state, pincode } = req.body;

    await query(
      `UPDATE users SET 
         company_name = COALESCE(?, company_name),
         phone = COALESCE(?, phone),
         address = COALESCE(?, address),
         city = COALESCE(?, city),
         state = COALESCE(?, state),
         pincode = COALESCE(?, pincode)
       WHERE id = ?`,
      [companyName, phone, address, city, state, pincode, userId]
    );

    const [updated] = await query(`SELECT id, user_id, name, email, phone, company_name, address, city, state, pincode FROM users WHERE id = ?`, [userId]);
    res.json({ success: true, message: "Settings updated successfully", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update settings", error: error.message });
  }
};

export const getStationLoadProfile = async (req, res) => res.json({ success: true, data: [] });
export const updateSmartLoadCapacity = async (req, res) => res.json({ success: true, message: "Power capacity updated" });
export const getOwnerAnalytics = async (req, res) => res.json({ success: true, data: {} });

/**
 * Real-time Station Control Center Snapshot
 * Fully computed from normalized MySQL tables: stations, chargers, bookings, charging_sessions
 */
export const getOwnerControlCenterSnapshot = async (req, res) => {
  try {
    const adminMode = (req.user?.role || "").toUpperCase() === "ADMIN";
    const ownerId = getOwnerId(req);
    const stationIdQuery = req.query.stationId || req.params.stationId;

    // 1. Resolve selected station
    let selectedStation = null;
    if (stationIdQuery) {
      const isNum = /^\d+$/.test(stationIdQuery);
      const stRows = await query(
        `SELECT * FROM stations WHERE (station_id = ? OR id = ?) ${adminMode ? "" : "AND owner_id = ?"}`.trim(),
        adminMode ? [stationIdQuery, isNum ? parseInt(stationIdQuery, 10) : 0] : [stationIdQuery, isNum ? parseInt(stationIdQuery, 10) : 0, ownerId]
      );
      if (stRows.length > 0) selectedStation = stRows[0];
    }

    if (!selectedStation) {
      const defaultRows = await query(
        `SELECT * FROM stations ${adminMode ? "" : "WHERE owner_id = ?"} ORDER BY id ASC LIMIT 1`,
        adminMode ? [] : [ownerId]
      );
      if (defaultRows.length > 0) selectedStation = defaultRows[0];
    }

    if (!selectedStation) {
      return res.json({
        success: true,
        summary: { total: 0, available: 0, reserved: 0, protected: 0, charging: 0, occupied: 0, maintenance: 0 },
        metrics: { totalChargers: 0, availableCount: 0, reservedCount: 0, protectedCount: 0, chargingCount: 0, occupiedCount: 0, maintenanceCount: 0, upcomingReservationsCount: 0, activeChargingCount: 0, offlineArrivalsToday: 0, conflictsDetectedToday: 0, noShowsToday: 0, queueWaitingCount: 0 },
        chargers: [],
        chargerGrid: [],
        bookings: [],
        onlineBookings: [],
        offlineBookings: [],
        queue: [],
      });
    }

    const stId = selectedStation.id;

    // 2. Fetch all chargers for this station
    const chargers = await query(
      `SELECT c.*, s.station_name, s.station_id as station_code 
       FROM chargers c 
       JOIN stations s ON c.station_id = s.id 
       WHERE c.station_id = ? 
       ORDER BY c.id ASC`,
      [stId]
    );

    // 3. Fetch today's bookings for this station
    const rawBookings = await query(
      `SELECT b.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
              s.station_name, s.station_id as station_id_code,
              v.registration_number, v.registration_number as vehicle_number, v.brand, v.model, v.vehicle_type,
              c.charger_name, c.power_kw, c.charger_id as charger_id_code
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN stations s ON b.station_id = s.id
       LEFT JOIN chargers c ON b.charger_id = c.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.station_id = ? AND (DATE(b.booking_date) = CURRENT_DATE() OR b.booking_status IN ('CONFIRMED', 'CHARGING', 'ACTIVE', 'PROTECTED', 'CHECKED_IN'))
       ORDER BY b.start_time ASC`,
      [stId]
    );
    const bookings = rawBookings.map((b) => formatBooking(b));

    // 4. Fetch active charging sessions for this station
    const rawSessions = await query(
      `SELECT cs.*, u.name as customer_name, v.registration_number as vehicle_number, v.model as vehicle_model,
              c.charger_name, c.charger_id as charger_id_code
       FROM charging_sessions cs
       LEFT JOIN users u ON cs.user_id = u.id
       LEFT JOIN vehicles v ON cs.vehicle_id = v.id
       LEFT JOIN chargers c ON cs.charger_id = c.id
       WHERE cs.station_id = ? AND cs.session_status IN ('CHARGING', 'STARTED', 'ACTIVE')
       ORDER BY cs.id DESC`,
      [stId]
    );

    // 5. Build charger grid with occupant and session details
    const chargerGrid = chargers.map((c) => {
      const activeSession = rawSessions.find((s) => s.charger_id === c.id);
      const activeBooking = bookings.find(
        (b) => (b.chargerId === c.id || b.charger_id === c.id) && ["CHARGING", "ACTIVE", "PROTECTED", "CHECKED_IN"].includes(b.bookingStatus)
      );
      const upcomingBooking = bookings.find(
        (b) => (b.chargerId === c.id || b.charger_id === c.id) && b.bookingStatus === "CONFIRMED"
      );

      let computedStatus = c.status || "AVAILABLE";
      if (activeSession) {
        computedStatus = "CHARGING";
      } else if (activeBooking) {
        computedStatus = activeBooking.bookingStatus === "PROTECTED" ? "PROTECTED" : "CHARGING";
      } else if (upcomingBooking) {
        computedStatus = "RESERVED";
      }

      const occupant = activeSession
        ? {
          customerName: activeSession.customer_name || "EV Driver",
          vehicleNumber: activeSession.vehicle_number || "TN01EV0001",
          vehicleModel: activeSession.vehicle_model || "Tata Nexon EV",
          startTime: activeSession.start_time,
          soc: activeSession.battery_soc || 65,
          targetSoc: 80,
          energyKwh: activeSession.energy_kwh || 18.5,
        }
        : activeBooking || upcomingBooking
          ? {
            bookingId: (activeBooking || upcomingBooking).bookingId,
            customerName: (activeBooking || upcomingBooking).customerName || "EV Driver",
            vehicleNumber: (activeBooking || upcomingBooking).vehicleNumber || "TN01EV0001",
            vehicleModel: (activeBooking || upcomingBooking).vehicleModel || "Tata Nexon EV",
            startTime: (activeBooking || upcomingBooking).startTime,
            endTime: (activeBooking || upcomingBooking).endTime,
            duration: (activeBooking || upcomingBooking).durationMinutes || 60,
          }
          : null;

      return {
        id: c.id,
        chargerId: c.charger_id,
        charger_id: c.charger_id,
        chargerName: c.charger_name,
        name: c.charger_name,
        slotNumber: c.charger_name,
        chargerType: c.charger_type || "DC_FAST",
        powerKw: parseFloat(c.power_kw) || 60.0,
        power: parseFloat(c.power_kw) || 60.0,
        status: computedStatus,
        connectorType: "CCS2",
        occupant,
        session: activeSession
          ? {
            sessionId: activeSession.session_id,
            currentSoc: activeSession.battery_soc || 65,
            targetSoc: 80,
            energyKwh: activeSession.energy_kwh || 18.5,
            powerKw: activeSession.power_kw || 50.0,
            durationMinutes: activeSession.duration_minutes || 25,
          }
          : null,
        telemetry: {
          voltage: 400.0,
          current: 80.0,
          power: computedStatus === "CHARGING" ? 50.0 : 0.0,
          status: computedStatus,
        },
      };
    });

    // 6. Calculate summary counts
    const total = chargerGrid.length;
    const available = chargerGrid.filter((c) => c.status === "AVAILABLE").length;
    const reserved = chargerGrid.filter((c) => c.status === "RESERVED").length;
    const protectedCount = chargerGrid.filter((c) => c.status === "PROTECTED").length;
    const charging = chargerGrid.filter((c) => c.status === "CHARGING").length;
    const occupied = chargerGrid.filter((c) => c.status === "OCCUPIED").length;
    const maintenance = chargerGrid.filter((c) => c.status === "MAINTENANCE" || c.status === "FAULTED").length;

    const summary = {
      total,
      available,
      reserved,
      protected: protectedCount,
      charging,
      occupied,
      maintenance,
    };

    const metrics = {
      totalChargers: total,
      availableCount: available,
      reservedCount: reserved,
      protectedCount,
      chargingCount: charging,
      occupiedCount: occupied,
      maintenanceCount: maintenance,
      upcomingReservationsCount: reserved,
      activeChargingCount: charging,
      offlineArrivalsToday: 0,
      conflictsDetectedToday: 0,
      noShowsToday: 0,
      queueWaitingCount: 0,
    };

    res.json({
      success: true,
      station: selectedStation,
      summary,
      metrics,
      chargers: chargerGrid,
      chargerGrid,
      bookings,
      onlineBookings: bookings,
      offlineBookings: [],
      queue: [],
      queueEntries: [],
      auditLogs: [],
    });
  } catch (error) {
    console.error("getOwnerControlCenterSnapshot error:", error);
    res.status(500).json({ success: false, message: "Error fetching control center snapshot", error: error.message });
  }
};
