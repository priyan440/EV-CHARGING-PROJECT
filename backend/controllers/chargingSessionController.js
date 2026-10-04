import { query, transaction } from "../config/db.js";
import { getIO, emitSessionStarted, emitSessionStopped } from "../services/socketService.js";
import { startSimulatedCharging, stopSimulatedCharging } from "../services/chargerSimulator.js";

// Helper to generate unique session ID e.g. CS000001
const generateSessionId = async (connection) => {
  const [rows] = await connection.execute(
    "SELECT COALESCE(MAX(id), 0) as maxId FROM charging_sessions"
  );
  const nextId = (rows[0]?.maxId || 0) + 1;
  return `CS${String(nextId).padStart(6, "0")}`;
};

/**
 * Format charging session for frontend
 */
export const formatSession = (s) => {
  const soc = parseInt(s.battery_soc, 10) || 20;
  const energy = parseFloat(s.energy_kwh) || 0.0;
  const power = parseFloat(s.power_kw) || 50.0;
  const duration = parseInt(s.duration_minutes, 10) || 0;
  const amount = parseFloat(s.total_amount) || 0.0;

  return {
    id: s.id,
    sessionId: s.session_id || `CS${String(s.id).padStart(6, "0")}`,
    session_id: s.session_id || `CS${String(s.id).padStart(6, "0")}`,
    bookingId: s.booking_code || s.booking_id,
    booking_id: s.booking_id,
    userId: s.user_id,
    customerName: s.customer_name || "EV Customer",
    stationId: s.station_id,
    stationName: s.station_name || "EV Station",
    stationAddress: s.station_address || "Address not provided",
    chargerId: s.charger_id_code || `CHG${String(s.charger_id).padStart(6, "0")}`,
    chargerNumericId: s.charger_id,
    chargerName: s.charger_name || "DC Fast Charger",
    chargerType: s.charger_type || "DC_FAST",
    connectorId: s.connector_id ? `CON${String(s.connector_id).padStart(6, "0")}` : "Bay #1",
    connectorType: s.charger_type === "AC" ? "Type 2 AC" : "CCS2 DC Fast",
    vehicleId: s.vehicle_id,
    vehicleNumber: s.registration_number || "N/A",
    vehicleModel: s.model ? `${s.brand || ""} ${s.model}`.trim() : "Standard EV",
    status: s.session_status || "CHARGING",
    sessionStatus: s.session_status || "CHARGING",
    session_status: s.session_status || "CHARGING",
    startTime: s.start_time,
    endTime: s.end_time,
    initialMeter: parseFloat(s.initial_meter) || 0.0,
    finalMeter: parseFloat(s.final_meter) || 0.0,
    energyKwh: energy,
    energyDelivered: energy,
    energy_kwh: energy,
    powerKw: power,
    chargingPower: power,
    voltage: parseFloat(s.voltage) || 400.0,
    currentAmp: parseFloat(s.current_amp) || 80.0,
    batterySoc: soc,
    batteryLevel: soc,
    currentBattery: soc,
    startingBattery: Math.max(10, soc),
    targetBattery: 80,
    durationMinutes: duration,
    totalAmount: amount,
    currentCost: amount,
    createdAt: s.created_at,
  };
};

const SESSIONS_JOIN_QUERY = `
  SELECT cs.*,
         u.name as customer_name, u.email as customer_email,
         s.station_name, s.address as station_address, s.owner_id,
         v.registration_number, v.brand, v.model,
         c.charger_name, c.charger_type, c.power_kw as charger_power, c.charger_id as charger_id_code,
         b.booking_id as booking_code, b.tariff_rate_snapshot, b.connection_fee_snapshot
  FROM charging_sessions cs
  JOIN users u ON cs.user_id = u.id
  JOIN stations s ON cs.station_id = s.id
  JOIN chargers c ON cs.charger_id = c.id
  LEFT JOIN vehicles v ON cs.vehicle_id = v.id
  LEFT JOIN bookings b ON cs.booking_id = b.id
`;

/**
 * GET /api/charging/active (Strictly Read-Only GET)
 */
export const getActiveSession = async (req, res) => {
  try {
    const userId = req.user.id;

    const rows = await query(
      `${SESSIONS_JOIN_QUERY}
       WHERE cs.user_id = ? AND cs.session_status IN ('STARTED', 'CHARGING', 'ACTIVE', 'IN_PROGRESS')
       ORDER BY cs.id DESC LIMIT 1`,
      [userId]
    );

    if (!rows || rows.length === 0) {
      return res.json({
        success: true,
        active: false,
        session: null,
        message: "No active charging session found.",
      });
    }

    const sessionData = formatSession(rows[0]);

    res.json({
      success: true,
      active: true,
      session: sessionData,
      data: sessionData,
    });
  } catch (error) {
    console.error("Get Active Session Error:", error);
    res.status(500).json({ success: false, message: "Error fetching active session", error: error.message });
  }
};

/**
 * POST /api/charging/start
 */
export const startSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      booking_id,
      bookingId,
      station_id,
      stationId,
      charger_id,
      chargerId,
      vehicle_id,
      vehicleId,
    } = req.body;

    const bId = booking_id || bookingId;
    let numericBookingId = null;
    let bookingRow = null;

    if (bId) {
      const isNumeric = /^\d+$/.test(bId);
      const bRows = await query(
        "SELECT * FROM bookings WHERE (id = ? OR booking_id = ?) AND user_id = ?",
        [isNumeric ? parseInt(bId, 10) : 0, bId, userId]
      );
      if (bRows && bRows.length > 0) {
        bookingRow = bRows[0];
        numericBookingId = bookingRow.id;
      } else {
        return res.status(404).json({ success: false, message: "Booking not found or not owned by you." });
      }
    } else {
      // Find latest confirmed or checked-in booking for this user
      const bRows = await query(
        "SELECT * FROM bookings WHERE user_id = ? AND booking_status IN ('CHECKED_IN', 'CONFIRMED', 'PROTECTED', 'IN_PROGRESS', 'CHARGING') ORDER BY id DESC LIMIT 1",
        [userId]
      );
      if (bRows && bRows.length > 0) {
        bookingRow = bRows[0];
        numericBookingId = bookingRow.id;
      }
    }

    if (!bookingRow && (!station_id && !stationId)) {
      return res.status(400).json({ success: false, message: "A valid booking or station/charger selection is required to start charging." });
    }

    const sId = bookingRow?.station_id || station_id || stationId;
    const cId = bookingRow?.charger_id || charger_id || chargerId;
    const vId = bookingRow?.vehicle_id || vehicle_id || vehicleId;
    const connId = bookingRow?.connector_id || null;

    if (!sId || !cId) {
      return res.status(400).json({ success: false, message: "Station ID and Charger ID are required." });
    }

    // Check if an active session already exists for this booking or user
    const existing = await query(
      `SELECT * FROM charging_sessions 
       WHERE (booking_id = ? AND session_status IN ('STARTED', 'CHARGING', 'ACTIVE', 'IN_PROGRESS'))
          OR (user_id = ? AND session_status IN ('STARTED', 'CHARGING', 'ACTIVE', 'IN_PROGRESS'))
       ORDER BY id DESC LIMIT 1`,
      [numericBookingId || 0, userId]
    );

    if (existing && existing.length > 0) {
      const fullRows = await query(`${SESSIONS_JOIN_QUERY} WHERE cs.id = ?`, [existing[0].id]);
      const sessionData = fullRows.length > 0 ? formatSession(fullRows[0]) : formatSession(existing[0]);

      // Resume simulator if needed
      startSimulatedCharging({
        chargerId: sessionData.chargerNumericId || cId,
        stationId: sId,
        sessionId: sessionData.sessionId,
        numericSessionId: existing[0].id,
        targetPowerKw: sessionData.powerKw || 50.0,
        ratePerKwh: parseFloat(bookingRow?.tariff_rate_snapshot) || 18.0,
        connectionFee: parseFloat(bookingRow?.connection_fee_snapshot) || 15.0,
      });

      return res.status(200).json({
        success: true,
        message: "Active charging session resumed!",
        sessionId: sessionData.sessionId,
        session: sessionData,
        data: sessionData,
      });
    }

    // Start session atomically in MySQL
    const result = await transaction(async (connection) => {
      const sessionId = await generateSessionId(connection);
      const startSoc = parseInt(bookingRow?.current_soc_percent, 10) || 60;
      const targetSoc = parseInt(bookingRow?.target_soc_percent, 10) || 80;

      const [sessionRes] = await connection.execute(
        `INSERT INTO charging_sessions 
         (session_id, booking_id, user_id, vehicle_id, station_id, charger_id, connector_id, start_time, initial_meter, power_kw, voltage, current_amp, battery_soc, session_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 0.00, 50.00, 400.00, 80.00, ?, 'CHARGING')`,
        [sessionId, numericBookingId || null, userId, vId || null, sId, cId, connId, startSoc]
      );

      // Update Charger to CHARGING
      await connection.execute("UPDATE chargers SET status = 'CHARGING' WHERE id = ?", [cId]);

      // Update Booking status to CHARGING
      if (numericBookingId) {
        await connection.execute("UPDATE bookings SET booking_status = 'CHARGING' WHERE id = ?", [numericBookingId]);
      }

      return {
        id: sessionRes.insertId,
        session_id: sessionId,
      };
    });

    const fullRows = await query(`${SESSIONS_JOIN_QUERY} WHERE cs.id = ?`, [result.id]);
    const sessionData = fullRows.length > 0 ? formatSession(fullRows[0]) : result;

    const startSoc = parseInt(bookingRow?.current_soc_percent, 10) || 60;
    const targetSoc = parseInt(bookingRow?.target_soc_percent, 10) || 80;

    // Start server-side telemetry simulator
    startSimulatedCharging({
      chargerId: cId,
      stationId: sId,
      sessionId: result.session_id,
      numericSessionId: result.id,
      targetPowerKw: sessionData.powerKw || 50.0,
      ratePerKwh: parseFloat(bookingRow?.tariff_per_kwh || bookingRow?.tariff_rate_snapshot) || 15.0,
      connectionFee: parseFloat(bookingRow?.platform_fee || bookingRow?.connection_fee_snapshot) || 10.0,
      batteryStart: startSoc,
      batteryTarget: targetSoc,
    });

    try {
      emitSessionStarted(sessionData);
    } catch (e) {}

    res.status(201).json({
      success: true,
      message: "Charging session started successfully!",
      sessionId: result.session_id,
      session: sessionData,
      data: sessionData,
    });
  } catch (error) {
    console.error("Start Session Error:", error);
    res.status(500).json({ success: false, message: "Error starting session", error: error.message });
  }
};

/**
 * POST /api/charging/stop & POST /api/charging/:sessionId/stop
 */
export const stopSession = async (req, res) => {
  try {
    const userId = req.user?.id;
    const targetSessionId = req.params?.sessionId || req.params?.id || req.body?.session_id || req.body?.sessionId;

    let session = null;

    if (targetSessionId && targetSessionId !== "undefined" && targetSessionId !== "null") {
      const isNumeric = /^\d+$/.test(targetSessionId);
      const sRows = await query(
        "SELECT * FROM charging_sessions WHERE id = ? OR session_id = ? OR booking_id = ?",
        [isNumeric ? parseInt(targetSessionId, 10) : 0, targetSessionId, isNumeric ? parseInt(targetSessionId, 10) : 0]
      );
      if (sRows && sRows.length > 0) {
        session = sRows[0];
      }
    }

    if (!session && userId) {
      const sRows = await query(
        "SELECT * FROM charging_sessions WHERE user_id = ? AND session_status IN ('ACTIVE', 'CHARGING', 'STARTED', 'IN_PROGRESS') ORDER BY id DESC LIMIT 1",
        [userId]
      );
      if (sRows && sRows.length > 0) {
        session = sRows[0];
      }
    }

    if (!session) {
      return res.status(404).json({ success: false, message: "No active charging session found." });
    }

    // Stop background simulator
    if (session.charger_id) {
      stopSimulatedCharging(session.charger_id);
    }

    const {
      energy_delivered,
      energyKwh,
      energy_kwh,
      current_cost,
      totalAmount,
      total_amount,
      duration_minutes,
      durationMinutes,
      final_battery,
      batterySoc,
      battery_soc,
    } = req.body || {};

    const cleanEnergy = parseFloat(energy_delivered || energy_kwh || energyKwh || session.energy_kwh) || 0.0;
    const cleanAmount = parseFloat(current_cost || total_amount || totalAmount || session.total_amount) || 0.0;
    const cleanDuration = parseInt(duration_minutes || durationMinutes || session.duration_minutes, 10) || 1;
    const cleanSoc = parseInt(final_battery || battery_soc || batterySoc || session.battery_soc, 10) || 80;

    await transaction(async (connection) => {
      // Mark Session Completed
      await connection.execute(
        `UPDATE charging_sessions 
         SET session_status = 'COMPLETED', end_time = NOW(), final_meter = energy_kwh, energy_kwh = ?, total_amount = ?, duration_minutes = ?, battery_soc = ?
         WHERE id = ?`,
        [cleanEnergy, cleanAmount, cleanDuration, cleanSoc, session.id]
      );

      // Make Charger Available
      if (session.charger_id) {
        await connection.execute("UPDATE chargers SET status = 'AVAILABLE' WHERE id = ?", [session.charger_id]);
      }

      // Update Booking
      if (session.booking_id) {
        await connection.execute("UPDATE bookings SET booking_status = 'COMPLETED' WHERE id = ?", [session.booking_id]);
      }

      // Update Vehicle Latest Known SOC in MySQL on session completion
      if (session.vehicle_id) {
        const [vehRow] = await connection.execute("SELECT current_soc_percent FROM vehicles WHERE id = ?", [session.vehicle_id]);
        const prevSoc = vehRow.length > 0 && vehRow[0].current_soc_percent !== null ? parseFloat(vehRow[0].current_soc_percent) : null;
        const finalSoc = cleanSoc || 100.0;

        await connection.execute(
          "UPDATE vehicles SET current_soc_percent = ?, soc_updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [finalSoc, session.vehicle_id]
        );

        await connection.execute(
          `INSERT INTO vehicle_soc_history (vehicle_id, previous_soc_percent, new_soc_percent, source, recorded_at)
           VALUES (?, ?, ?, 'CHARGING_COMPLETED', CURRENT_TIMESTAMP)`,
          [session.vehicle_id, prevSoc, finalSoc]
        );
      }
    });

    const fullRows = await query(`${SESSIONS_JOIN_QUERY} WHERE cs.id = ?`, [session.id]);
    const sessionData = fullRows.length > 0 ? formatSession(fullRows[0]) : session;

    try {
      emitSessionStopped(sessionData);
    } catch (e) {}

    res.json({
      success: true,
      message: "Charging session completed successfully!",
      summary: sessionData,
      data: sessionData,
    });
  } catch (error) {
    console.error("Stop Session Error:", error);
    res.status(500).json({ success: false, message: "Error stopping session", error: error.message });
  }
};

/**
 * GET /api/charging/history
 */
export const getSessionHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = (req.user.role || "").toUpperCase();

    let sql = SESSIONS_JOIN_QUERY;
    let params = [];

    if (role === "ADMIN") {
      sql += " ORDER BY cs.id DESC";
    } else if (role === "STATION_OWNER" || role === "OWNER") {
      sql += " WHERE s.owner_id = ? ORDER BY cs.id DESC";
      params.push(userId);
    } else {
      sql += " WHERE cs.user_id = ? ORDER BY cs.id DESC";
      params.push(userId);
    }

    const rows = await query(sql, params);
    const formatted = rows.map(formatSession);

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching session history", error: error.message });
  }
};

export const startChargingSession = startSession;
export const stopChargingSession = stopSession;
export const getChargingHistory = getSessionHistory;

export const updateLiveTelemetry = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { current_battery, energy_delivered, current_cost, duration_minutes } = req.body;
    
    if (sessionId) {
      const isNum = /^\d+$/.test(sessionId);
      await query(
        `UPDATE charging_sessions 
         SET battery_soc = COALESCE(?, battery_soc),
             energy_kwh = COALESCE(?, energy_kwh),
             total_amount = COALESCE(?, total_amount),
             duration_minutes = COALESCE(?, duration_minutes)
         WHERE id = ? OR session_id = ?`,
        [
          current_battery !== undefined ? current_battery : null,
          energy_delivered !== undefined ? energy_delivered : null,
          current_cost !== undefined ? current_cost : null,
          duration_minutes !== undefined ? duration_minutes : null,
          isNum ? parseInt(sessionId, 10) : 0,
          sessionId,
        ]
      );
    }
    res.json({ success: true, message: "Telemetry updated." });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};

/**
 * Authoritative backend EV charging cost, energy and duration estimation calculator
 */
export const calculateChargingEstimate = async ({
  vehicleId,
  stationId,
  connectorId,
  currentSoc,
  targetSoc,
}) => {
  const curSoc = parseInt(currentSoc, 10);
  const tgtSoc = parseInt(targetSoc, 10);

  // 1. Validation Rules
  if (isNaN(curSoc) || curSoc < 0 || curSoc > 100) {
    const err = new Error("Current battery level must be between 0% and 100%.");
    err.statusCode = 400;
    throw err;
  }
  if (isNaN(tgtSoc) || tgtSoc < 0 || tgtSoc > 100) {
    const err = new Error("Target battery level must be between 0% and 100%.");
    err.statusCode = 400;
    throw err;
  }
  if (curSoc === 100) {
    const err = new Error("Vehicle battery is already fully charged.");
    err.statusCode = 400;
    throw err;
  }
  if (tgtSoc === curSoc) {
    const err = new Error("No additional charging is required.");
    err.statusCode = 400;
    throw err;
  }
  if (tgtSoc < curSoc) {
    const err = new Error("Target battery level must be greater than the current battery level.");
    err.statusCode = 400;
    throw err;
  }

  // 2. Fetch Vehicle from MySQL
  let batteryCapacityKwh = 40.0;
  let vehicleMaxPowerKw = 150.0;
  let vehicleName = "Electric Vehicle";
  let vehicleConnector = "CCS2";

  if (vehicleId) {
    const isVehNum = /^\d+$/.test(vehicleId);
    const vehRows = await query(
      "SELECT v.*, ct.connector_name FROM vehicles v LEFT JOIN connector_types ct ON v.connector_type_id = ct.id WHERE v.id = ? OR v.vehicle_id = ? LIMIT 1",
      [isVehNum ? parseInt(vehicleId, 10) : 0, String(vehicleId)]
    );
    if (vehRows && vehRows.length > 0) {
      const v = vehRows[0];
      batteryCapacityKwh = parseFloat(v.battery_capacity_kwh || v.battery_capacity) || 40.0;
      vehicleMaxPowerKw = parseFloat(v.max_charging_power_kw) || 150.0;
      vehicleName = `${v.brand || ""} ${v.model}`.trim() || "Electric Vehicle";
      vehicleConnector = v.connector_name || v.connector_type || "CCS2";
    }
  }

  // 3. Fetch Station and Tariff from MySQL
  let tariffPerKwh = 15.00;
  let efficiencyPercent = 90.00;
  let stationMaxPowerKw = 150.0;
  let stationName = "EV Charging Station";

  if (stationId) {
    const isStnNum = /^\d+$/.test(stationId);
    const stnRows = await query(
      "SELECT * FROM stations WHERE id = ? OR station_id = ? LIMIT 1",
      [isStnNum ? parseInt(stationId, 10) : 0, String(stationId)]
    );
    if (stnRows && stnRows.length > 0) {
      const s = stnRows[0];
      tariffPerKwh = parseFloat(s.energy_tariff_per_kwh) || 15.00;
      efficiencyPercent = parseFloat(s.charging_efficiency_percent) || 90.00;
      stationMaxPowerKw = parseFloat(s.max_power) || 150.0;
      stationName = s.station_name || "EV Charging Station";

      // Also check active tariff for this station
      const tRows = await query(
        "SELECT base_rate_per_kwh FROM tariffs WHERE station_id = ? AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1",
        [s.id]
      );
      if (tRows && tRows.length > 0 && parseFloat(tRows[0].base_rate_per_kwh) > 0) {
        tariffPerKwh = parseFloat(tRows[0].base_rate_per_kwh);
      }
    }
  }

  // 4. Fetch Connector Power if specified
  let connectorPowerKw = 150.0;
  let connectorNumber = "Connector 01";
  if (connectorId) {
    const isConnNum = /^\d+$/.test(connectorId);
    const connRows = await query(
      "SELECT * FROM station_connectors WHERE id = ? OR connector_id = ? LIMIT 1",
      [isConnNum ? parseInt(connectorId, 10) : 0, String(connectorId)]
    );
    if (connRows && connRows.length > 0) {
      connectorPowerKw = parseFloat(connRows[0].power_kw) || 150.0;
      connectorNumber = connRows[0].connector_number || "Connector 01";
    }
  }

  // 5. Calculate Energy & Realistic Piecewise Charging Time
  const socDifference = Math.max(0, tgtSoc - curSoc);
  const energyRequiredKwh = Math.round((batteryCapacityKwh * (socDifference / 100)) * 100) / 100;

  // Realistic Piecewise Charging Curve Efficiency Factors
  const intervals = [
    { start: 0, end: 50, factor: 0.95 },
    { start: 50, end: 80, factor: 0.90 },
    { start: 80, end: 90, factor: 0.75 },
    { start: 90, end: 100, factor: 0.50 },
  ];

  const maxDeliverablePower = Math.min(vehicleMaxPowerKw, connectorPowerKw, stationMaxPowerKw);
  let totalChargingHours = 0;
  let totalWeightedFactor = 0;

  if (socDifference > 0 && maxDeliverablePower > 0) {
    for (const seg of intervals) {
      const segStart = Math.max(curSoc, seg.start);
      const segEnd = Math.min(tgtSoc, seg.end);
      if (segEnd > segStart) {
        const segDelta = segEnd - segStart;
        const segEnergy = batteryCapacityKwh * (segDelta / 100);
        const segEffectivePower = maxDeliverablePower * seg.factor;
        totalChargingHours += segEnergy / segEffectivePower;
        totalWeightedFactor += seg.factor * (segDelta / socDifference);
      }
    }
  }

  const estimatedMinutes = Math.max(1, Math.round(totalChargingHours * 60));
  const effectiveEfficiency = totalWeightedFactor > 0 ? totalWeightedFactor : (efficiencyPercent / 100 || 0.90);
  const chargingEfficiency = Math.round(effectiveEfficiency * 100) / 100;
  efficiencyPercent = Math.round(effectiveEfficiency * 100);
  const effectivePowerKw = Math.round((maxDeliverablePower * (totalWeightedFactor || 0.90)) * 10) / 10;
  const estimatedGridEnergyKwh = Math.round((energyRequiredKwh / effectiveEfficiency) * 100) / 100;
  const estimatedEnergyCost = Math.round((energyRequiredKwh * tariffPerKwh) * 100) / 100;

  let estimatedChargingTime = `${estimatedMinutes} minutes`;
  if (estimatedMinutes >= 60) {
    const h = Math.floor(estimatedMinutes / 60);
    const m = estimatedMinutes % 60;
    estimatedChargingTime = m > 0 ? `${h} hr ${m} min` : `${h} hr`;
  }

  // 7. Fee & Billing Breakdown
  const platformFee = 10.00;
  const parkingFee = 0.00;
  const subtotal = Math.round((estimatedEnergyCost + platformFee + parkingFee) * 100) / 100;
  const taxAmount = Math.round((subtotal * 0.18) * 100) / 100;
  const totalEstimatedAmount = Math.round((subtotal + taxAmount) * 100) / 100;

  return {
    vehicleName,
    vehicleConnector,
    stationName,
    connectorNumber,
    currentSoc: curSoc,
    current_soc_percent: curSoc,
    targetSoc: tgtSoc,
    target_soc_percent: tgtSoc,
    socDifference,
    batteryCapacityKwh,
    battery_capacity_kwh: batteryCapacityKwh,
    energyRequiredKwh,
    energy_required_kwh: energyRequiredKwh,
    chargingEfficiencyPercent: efficiencyPercent,
    chargingEfficiency,
    estimatedGridEnergyKwh,
    estimated_grid_energy_kwh: estimatedGridEnergyKwh,
    tariffPerKwh,
    tariff_per_kwh: tariffPerKwh,
    estimatedEnergyCost,
    estimated_energy_cost: estimatedEnergyCost,
    platformFee,
    platform_fee: platformFee,
    parkingFee,
    taxAmount,
    tax_amount: taxAmount,
    subtotal,
    totalEstimatedAmount,
    total_amount: totalEstimatedAmount,
    effectivePowerKw,
    effective_charging_power_kw: effectivePowerKw,
    estimatedDurationMinutes: estimatedMinutes,
    estimatedChargingTime,
    estimated_charging_time: estimatedChargingTime,
    isEstimate: true,
    notice: "Charging cost is an estimate because live vehicle/charger energy telemetry is not connected.",
  };
};

/**
 * POST /api/charging/estimate or GET /api/charging/estimate
 */
export const estimateChargingCost = async (req, res) => {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    const {
      vehicleId,
      vehicle_id,
      stationId,
      station_id,
      connectorId,
      connector_id,
      currentSoc,
      current_soc,
      currentBattery,
      current_battery,
      targetSoc,
      target_soc,
      targetBattery,
      target_battery,
    } = params;

    const estimate = await calculateChargingEstimate({
      vehicleId: vehicleId || vehicle_id,
      stationId: stationId || station_id,
      connectorId: connectorId || connector_id,
      currentSoc: currentSoc ?? current_soc ?? currentBattery ?? current_battery ?? 60,
      targetSoc: targetSoc ?? target_soc ?? targetBattery ?? target_battery ?? 80,
    });

    res.json({
      success: true,
      data: estimate,
      ...estimate,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to calculate charging cost estimate.",
    });
  }
};

export const getInvoiceByIdentifier = async (req, res) => {
  res.json({ success: true, data: { id: 1, invoiceNumber: req.params.identifier, status: "PAID" } });
};

export default {
  getActiveSession,
  startSession,
  stopSession,
  getSessionHistory,
  startChargingSession,
  stopChargingSession,
  getChargingHistory,
  updateLiveTelemetry,
  getInvoiceByIdentifier,
  calculateChargingEstimate,
  estimateChargingCost,
  formatSession,
};
