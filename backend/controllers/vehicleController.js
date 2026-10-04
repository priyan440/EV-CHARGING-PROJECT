import { query } from "../config/db.js";

/**
 * Helper to format vehicle record with full connector specifications
 */
export const formatVehicleRecord = (v) => {
  if (!v) return null;
  const connName = v.connector_name || v.connector_type || "CCS2";
  const connId = v.connector_type_id || v.conn_type_id || (connName.toUpperCase() === "TYPE 2" ? 2 : connName.toUpperCase() === "CHADEMO" ? 3 : connName.toUpperCase() === "GB/T" ? 4 : 1);
  const batteryCap = parseFloat(v.battery_capacity_kwh || v.battery_capacity) || 40.5;
  const currentSoc = v.current_soc_percent !== null && v.current_soc_percent !== undefined
    ? parseFloat(v.current_soc_percent)
    : (v.battery_percentage !== null && v.battery_percentage !== undefined ? parseFloat(v.battery_percentage) : 75.0);
  const socUpdatedAt = v.soc_updated_at || v.updated_at || v.created_at || new Date().toISOString();

  return {
    id: v.id,
    vehicleId: v.vehicle_id || `VEH${String(v.id).padStart(6, "0")}`,
    vehicle_id: v.vehicle_id || `VEH${String(v.id).padStart(6, "0")}`,
    userId: v.user_id,
    user_id: v.user_id,
    ownerName: v.owner_name || null,
    ownerEmail: v.owner_email || null,
    registrationNumber: v.registration_number,
    registration_number: v.registration_number,
    vehicleNumber: v.registration_number,
    vehicle_number: v.registration_number,
    vehicleType: v.vehicle_type || "4W",
    vehicle_type: v.vehicle_type || "4W",
    brand: v.brand || "Tata Motors",
    manufacturer: v.brand || "Tata Motors",
    model: v.model,
    batteryCapacity: batteryCap,
    batteryCapacityKwh: batteryCap,
    battery_capacity: batteryCap,
    battery_capacity_kwh: batteryCap,
    current_soc_percent: currentSoc,
    currentSoc: currentSoc,
    batteryPercentage: currentSoc,
    batteryLevel: currentSoc,
    soc_updated_at: socUpdatedAt,
    socUpdatedAt: socUpdatedAt,
    maxChargingPowerKw: parseFloat(v.max_charging_power_kw) || 150.0,
    max_charging_power_kw: parseFloat(v.max_charging_power_kw) || 150.0,
    connectorTypeId: connId,
    connector_type_id: connId,
    connectorType: connName,
    connector_type: connName,
    connectorName: connName,
    connectorDescription: v.connector_desc || v.description || null,
    connectorMaxPower: parseFloat(v.max_power_kw) || 150.0,
    range: Math.round(batteryCap * 7.5),
    createdAt: v.created_at,
    created_at: v.created_at,
    updatedAt: v.updated_at,
    updated_at: v.updated_at,
  };
};

/**
 * Base SQL for joining vehicles with connector_types
 */
const VEHICLES_JOIN_QUERY = `
  SELECT 
    v.*,
    ct.id as conn_type_id,
    ct.connector_name,
    ct.max_power_kw,
    ct.description as connector_desc,
    u.name as owner_name,
    u.email as owner_email
  FROM vehicles v
  LEFT JOIN connector_types ct ON v.connector_type_id = ct.id
  LEFT JOIN users u ON v.user_id = u.id
`;

/**
 * GET /api/vehicles
 * Get vehicles for authenticated user (or all vehicles if Admin)
 */
export const getVehicles = async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === "ADMIN";
    const requestedUserId = req.query.userId;

    let sql = `${VEHICLES_JOIN_QUERY} WHERE v.user_id = ? ORDER BY v.id DESC`;
    let params = [userId];

    if (isAdmin && requestedUserId) {
      sql = `${VEHICLES_JOIN_QUERY} WHERE v.user_id = ? ORDER BY v.id DESC`;
      params = [requestedUserId];
    } else if (isAdmin && !requestedUserId && req.query.all === "true") {
      sql = `${VEHICLES_JOIN_QUERY} ORDER BY v.id DESC`;
      params = [];
    }

    const vehicles = await query(sql, params);
    const formatted = (vehicles || []).map(formatVehicleRecord).filter(Boolean);

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("Get Vehicles Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching vehicles",
      error: error.message,
    });
  }
};

/**
 * GET /api/vehicles/user/:userId
 * Get registered vehicles for a specific user ID
 */
export const getUserVehicles = async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    const authUserId = req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    // Permission check
    if (!isAdmin && authUserId !== targetUserId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view vehicles for this user.",
      });
    }

    const sql = `${VEHICLES_JOIN_QUERY} WHERE v.user_id = ? ORDER BY v.id DESC`;
    const rows = await query(sql, [targetUserId]);
    const formatted = (rows || []).map(formatVehicleRecord).filter(Boolean);

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("Get User Vehicles Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user vehicles",
      error: error.message,
    });
  }
};

/**
 * GET /api/vehicles/:id
 * Get single vehicle by ID
 */
export const getVehicleById = async (req, res) => {
  try {
    const vehicleId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    const isNumeric = /^\d+$/.test(vehicleId);
    const sql = `${VEHICLES_JOIN_QUERY} WHERE v.id = ? OR v.vehicle_id = ? LIMIT 1`;
    const rows = await query(sql, [isNumeric ? parseInt(vehicleId, 10) : 0, vehicleId]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    const v = rows[0];

    // Ownership check
    if (!isAdmin && v.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this vehicle.",
      });
    }

    res.json({
      success: true,
      data: formatVehicleRecord(v),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching vehicle", error: error.message });
  }
};

/**
 * GET /api/connector-types
 * List all available connector types in MySQL
 */
export const getConnectorTypes = async (req, res) => {
  try {
    const rows = await query("SELECT * FROM connector_types ORDER BY id ASC");
    res.json({
      success: true,
      count: (rows || []).length,
      data: (rows || []).map((r) => ({
        id: r.id,
        connectorTypeId: r.id,
        connector_type_id: r.id,
        connectorName: r.connector_name,
        connector_name: r.connector_name,
        name: r.connector_name,
        maxPowerKw: parseFloat(r.max_power_kw),
        max_power_kw: parseFloat(r.max_power_kw),
        description: r.description,
        createdAt: r.created_at,
        created_at: r.created_at,
      })),
    });
  } catch (error) {
    console.error("Get Connector Types Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching connector types",
      error: error.message,
    });
  }
};

/**
 * Helper to resolve connector_type_id from ID or name
 */
const resolveConnectorTypeId = async (typeId, typeName) => {
  if (typeId && !isNaN(parseInt(typeId, 10))) {
    const rows = await query("SELECT id, connector_name FROM connector_types WHERE id = ?", [parseInt(typeId, 10)]);
    if (rows && rows.length > 0) return { id: rows[0].id, name: rows[0].connector_name };
  }

  if (typeName) {
    const cleanName = typeName.trim();
    const rows = await query("SELECT id, connector_name FROM connector_types WHERE UPPER(connector_name) = UPPER(?)", [cleanName]);
    if (rows && rows.length > 0) return { id: rows[0].id, name: rows[0].connector_name };
  }

  // Fallback to CCS2
  const ccs2Rows = await query("SELECT id, connector_name FROM connector_types WHERE connector_name = 'CCS2' LIMIT 1");
  return ccs2Rows && ccs2Rows.length > 0 ? { id: ccs2Rows[0].id, name: ccs2Rows[0].connector_name } : { id: 1, name: "CCS2" };
};

/**
 * POST /api/vehicles
 * Create a new vehicle for logged-in user
 */
export const createVehicle = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      registration_number,
      registrationNumber,
      vehicle_number,
      vehicleNumber,
      vehicle_type,
      vehicleType = "4W",
      brand,
      manufacturer,
      model,
      battery_capacity,
      batteryCapacity = 40.0,
      connector_type,
      connectorType,
      connector_type_id,
      connectorTypeId,
    } = req.body;

    const rawNumber = registration_number || registrationNumber || vehicle_number || vehicleNumber;
    if (!rawNumber || !rawNumber.trim()) {
      return res.status(400).json({ success: false, message: "Registration number is required." });
    }

    const cleanNumber = rawNumber.trim().toUpperCase();
    const cleanBrand = brand || manufacturer || "Tata Motors";
    const cleanModel = model ? model.trim() : "Nexon EV Max";
    const cleanType = vehicle_type || vehicleType || "4W";
    const cleanCapacity = parseFloat(battery_capacity || batteryCapacity) || 40.0;

    // Resolve Connector Type
    const reqConnTypeId = connector_type_id || connectorTypeId;
    const reqConnName = connector_type || connectorType;
    const resolvedConn = await resolveConnectorTypeId(reqConnTypeId, reqConnName);

    // Check duplicate registration number
    const existing = await query("SELECT id FROM vehicles WHERE registration_number = ?", [cleanNumber]);
    if (existing && existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Vehicle with registration number "${cleanNumber}" is already registered.`,
      });
    }

    // Generate dynamic vehicle_id
    const maxRows = await query("SELECT COALESCE(MAX(id), 0) as maxId FROM vehicles");
    const nextId = (maxRows[0]?.maxId || 0) + 1;
    const vehicle_id = `VEH${String(nextId).padStart(6, "0")}`;

    const cleanMaxPower = parseFloat(req.body.max_charging_power_kw || req.body.maxChargingPowerKw) || 50.0;
    const cleanSoc = parseFloat(req.body.current_soc_percent || req.body.currentSocPercent || req.body.batteryPercentage || req.body.battery_percentage) || 75.0;

    const result = await query(
      `INSERT INTO vehicles (vehicle_id, user_id, registration_number, vehicle_type, connector_type_id, brand, model, battery_capacity, battery_capacity_kwh, current_soc_percent, max_charging_power_kw, connector_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [vehicle_id, userId, cleanNumber, cleanType, resolvedConn.id, cleanBrand, cleanModel, cleanCapacity, cleanCapacity, cleanSoc, cleanMaxPower, resolvedConn.name]
    );

    const insertedId = result.insertId;

    // Fetch full record
    const createdRows = await query(`${VEHICLES_JOIN_QUERY} WHERE v.id = ?`, [insertedId]);
    const formatted = formatVehicleRecord(createdRows[0]);

    res.status(201).json({
      success: true,
      message: "Vehicle added successfully!",
      data: formatted,
    });
  } catch (error) {
    console.error("Create Vehicle Error:", error);
    res.status(500).json({
      success: false,
      message: "Error adding vehicle.",
      error: error.message,
    });
  }
};

/**
 * PUT /api/vehicles/:id
 * Update an existing vehicle
 */
export const updateVehicle = async (req, res) => {
  try {
    const vehicleId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    // Verify existing vehicle
    const existing = await query("SELECT * FROM vehicles WHERE id = ?", [vehicleId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Vehicle not found." });
    }

    if (!isAdmin && existing[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this vehicle.",
      });
    }

    const {
      registration_number,
      registrationNumber,
      vehicle_number,
      vehicleNumber,
      vehicle_type,
      vehicleType,
      brand,
      manufacturer,
      model,
      battery_capacity,
      batteryCapacity,
      connector_type,
      connectorType,
      connector_type_id,
      connectorTypeId,
    } = req.body;

    const cleanNumber = (registration_number || registrationNumber || vehicle_number || vehicleNumber || existing[0].registration_number).toUpperCase().trim();
    const cleanType = vehicle_type || vehicleType || existing[0].vehicle_type;
    const cleanBrand = brand || manufacturer || existing[0].brand;
    const cleanModel = model ? model.trim() : existing[0].model;
    const cleanCapacity = parseFloat(battery_capacity || batteryCapacity) || parseFloat(existing[0].battery_capacity);

    // Resolve Connector Type
    const reqConnTypeId = connector_type_id || connectorTypeId;
    const reqConnName = connector_type || connectorType || existing[0].connector_type;
    const resolvedConn = await resolveConnectorTypeId(reqConnTypeId, reqConnName);

    // Check duplicate registration number if changed
    if (cleanNumber !== existing[0].registration_number) {
      const dup = await query("SELECT id FROM vehicles WHERE registration_number = ? AND id != ?", [cleanNumber, vehicleId]);
      if (dup && dup.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Vehicle with registration number "${cleanNumber}" is already registered.`,
        });
      }
    }

    await query(
      `UPDATE vehicles 
       SET registration_number = ?, vehicle_type = ?, connector_type_id = ?, brand = ?, model = ?, battery_capacity = ?, connector_type = ?
       WHERE id = ?`,
      [cleanNumber, cleanType, resolvedConn.id, cleanBrand, cleanModel, cleanCapacity, resolvedConn.name, vehicleId]
    );

    const updatedRows = await query(`${VEHICLES_JOIN_QUERY} WHERE v.id = ?`, [vehicleId]);
    const formatted = formatVehicleRecord(updatedRows[0]);

    res.json({
      success: true,
      message: "Vehicle updated successfully!",
      data: formatted,
    });
  } catch (error) {
    console.error("Update Vehicle Error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating vehicle.",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/vehicles/:id
 * Delete a vehicle
 */
export const deleteVehicle = async (req, res) => {
  try {
    const vehicleId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    const existing = await query("SELECT * FROM vehicles WHERE id = ?", [vehicleId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Vehicle not found." });
    }

    if (!isAdmin && existing[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this vehicle.",
      });
    }

    await query("DELETE FROM vehicles WHERE id = ?", [vehicleId]);

    res.json({
      success: true,
      message: "Vehicle deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Vehicle Error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting vehicle.",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/vehicles/:id/soc
 * Update vehicle battery SOC (manual user reading)
 */
export const updateVehicleSoc = async (req, res) => {
  try {
    const vehicleId = req.params.id || req.params.vehicleId;
    const userId = req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    const { currentSoc, current_soc, current_soc_percent, batteryPercentage } = req.body;
    const rawSoc = currentSoc ?? current_soc ?? current_soc_percent ?? batteryPercentage;

    if (rawSoc === undefined || rawSoc === null || isNaN(rawSoc)) {
      return res.status(400).json({
        success: false,
        message: "A valid numeric battery percentage (currentSoc) between 0 and 100 is required.",
      });
    }

    const socNum = parseFloat(rawSoc);
    if (socNum < 0 || socNum > 100) {
      return res.status(400).json({
        success: false,
        message: "Battery level must be between 0% and 100%.",
      });
    }

    // Verify existing vehicle
    const isNum = /^\d+$/.test(vehicleId);
    const existing = await query(
      "SELECT * FROM vehicles WHERE id = ? OR vehicle_id = ?",
      [isNum ? parseInt(vehicleId, 10) : 0, String(vehicleId)]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Vehicle not found." });
    }

    const vehicle = existing[0];
    if (!isAdmin && vehicle.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update battery level for this vehicle.",
      });
    }

    const prevSoc = vehicle.current_soc_percent !== null ? parseFloat(vehicle.current_soc_percent) : null;

    // Update MySQL vehicle
    await query(
      "UPDATE vehicles SET current_soc_percent = ?, soc_updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [socNum, vehicle.id]
    );

    // Record in history table
    try {
      await query(
        `INSERT INTO vehicle_soc_history (vehicle_id, previous_soc_percent, new_soc_percent, source, recorded_at)
         VALUES (?, ?, ?, 'USER_UPDATE', CURRENT_TIMESTAMP)`,
        [vehicle.id, prevSoc, socNum]
      );
    } catch (histErr) {
      console.warn("Failed to record SOC history:", histErr.message);
    }

    const updatedRows = await query(`${VEHICLES_JOIN_QUERY} WHERE v.id = ?`, [vehicle.id]);
    const formatted = formatVehicleRecord(updatedRows[0]);

    res.json({
      success: true,
      message: `Battery level for ${formatted.brand} ${formatted.model} updated to ${socNum}%.`,
      data: formatted,
      vehicle: formatted,
    });
  } catch (error) {
    console.error("Update Vehicle SOC Error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating vehicle battery level.",
      error: error.message,
    });
  }
};

/**
 * GET /api/vehicles/:id/soc-history
 * Get recent SOC history for a vehicle
 */
export const getVehicleSocHistory = async (req, res) => {
  try {
    const vehicleId = req.params.id || req.params.vehicleId;
    const isNum = /^\d+$/.test(vehicleId);
    const rows = await query(
      `SELECT h.*, v.brand, v.model, v.registration_number
       FROM vehicle_soc_history h
       JOIN vehicles v ON h.vehicle_id = v.id
       WHERE v.id = ? OR v.vehicle_id = ?
       ORDER BY h.recorded_at DESC
       LIMIT 20`,
      [isNum ? parseInt(vehicleId, 10) : 0, String(vehicleId)]
    );

    res.json({
      success: true,
      data: rows || [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching vehicle SOC history.",
      error: error.message,
    });
  }
};
