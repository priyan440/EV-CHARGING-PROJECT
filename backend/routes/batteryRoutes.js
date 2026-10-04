import express from "express";
import { query } from "../config/db.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/battery
 * Returns battery telemetry for the logged-in user's vehicles (or all for admin)
 */
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    let sql = `
      SELECT 
        v.id as vehicle_id,
        v.registration_number,
        v.brand,
        v.model,
        v.battery_capacity,
        v.current_soc_percent,
        v.soc_updated_at,
        b.battery_type,
        b.health_percentage,
        b.temperature,
        b.last_updated
      FROM vehicles v
      LEFT JOIN battery_details b ON v.id = b.vehicle_id
    `;
    let params = [];

    if (!isAdmin) {
      sql += " WHERE v.user_id = ?";
      params.push(userId);
    }

    sql += " ORDER BY v.id DESC";
    const rows = await query(sql, params);

    res.json({
      success: true,
      count: rows.length,
      data: rows.map((r) => ({
        vehicleId: r.vehicle_id,
        registrationNumber: r.registration_number,
        vehicleName: `${r.brand} ${r.model}`,
        batteryCapacity: parseFloat(r.battery_capacity) || null,
        batteryType: r.battery_type || "Lithium-ion",
        currentPercentage: r.current_soc_percent !== null ? parseFloat(r.current_soc_percent) : null,
        healthPercentage: r.health_percentage !== null ? parseFloat(r.health_percentage) : null,
        temperature: r.temperature !== null ? parseFloat(r.temperature) : null,
        lastUpdated: r.last_updated || r.soc_updated_at || null,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching battery details", error: error.message });
  }
});

/**
 * GET /api/battery/:vehicleId
 */
router.get("/:vehicleId", async (req, res) => {
  try {
    const vehicleId = req.params.vehicleId;
    const isNum = /^\d+$/.test(vehicleId);

    const rows = await query(
      `SELECT 
        v.id as vehicle_id,
        v.registration_number,
        v.brand,
        v.model,
        v.battery_capacity,
        v.current_soc_percent,
        v.soc_updated_at,
        b.battery_type,
        b.health_percentage,
        b.temperature,
        b.last_updated
      FROM vehicles v
      LEFT JOIN battery_details b ON v.id = b.vehicle_id
      WHERE v.id = ? OR v.vehicle_id = ?
      LIMIT 1`,
      [isNum ? parseInt(vehicleId, 10) : 0, String(vehicleId)]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: "Vehicle battery details not found." });
    }

    const r = rows[0];
    res.json({
      success: true,
      data: {
        vehicleId: r.vehicle_id,
        registrationNumber: r.registration_number,
        vehicleName: `${r.brand} ${r.model}`,
        batteryCapacity: parseFloat(r.battery_capacity) || null,
        batteryType: r.battery_type || "Lithium-ion",
        currentPercentage: r.current_soc_percent !== null ? parseFloat(r.current_soc_percent) : null,
        healthPercentage: r.health_percentage !== null ? parseFloat(r.health_percentage) : null,
        temperature: r.temperature !== null ? parseFloat(r.temperature) : null,
        lastUpdated: r.last_updated || r.soc_updated_at || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching battery telemetry.", error: error.message });
  }
});

/**
 * POST /api/battery/:vehicleId
 * Record real battery telemetry for a vehicle
 */
router.post("/:vehicleId", async (req, res) => {
  try {
    const vehicleId = req.params.vehicleId;
    const isNum = /^\d+$/.test(vehicleId);

    const vRows = await query(
      "SELECT id, battery_capacity FROM vehicles WHERE id = ? OR vehicle_id = ?",
      [isNum ? parseInt(vehicleId, 10) : 0, String(vehicleId)]
    );

    if (!vRows || vRows.length === 0) {
      return res.status(404).json({ success: false, message: "Vehicle not found." });
    }

    const vId = vRows[0].id;
    const {
      battery_capacity,
      batteryCapacity,
      battery_type,
      batteryType = "Lithium-ion",
      current_percentage,
      currentPercentage,
      health_percentage,
      healthPercentage,
      temperature,
    } = req.body;

    const cap = parseFloat(battery_capacity || batteryCapacity) || parseFloat(vRows[0].battery_capacity);
    const soc = current_percentage !== undefined ? parseFloat(current_percentage) : (currentPercentage !== undefined ? parseFloat(currentPercentage) : null);
    const health = health_percentage !== undefined ? parseFloat(health_percentage) : (healthPercentage !== undefined ? parseFloat(healthPercentage) : null);
    const temp = temperature !== undefined ? parseFloat(temperature) : null;

    // Update vehicle's current_soc_percent
    if (soc !== null) {
      await query("UPDATE vehicles SET current_soc_percent = ?, soc_updated_at = NOW() WHERE id = ?", [soc, vId]);
    }

    // Upsert into battery_details
    await query(
      `INSERT INTO battery_details 
       (vehicle_id, battery_capacity, battery_type, current_percentage, health_percentage, temperature, last_updated)
       VALUES (?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         battery_capacity = VALUES(battery_capacity),
         battery_type = VALUES(battery_type),
         current_percentage = VALUES(current_percentage),
         health_percentage = VALUES(health_percentage),
         temperature = VALUES(temperature),
         last_updated = NOW()`,
      [vId, cap, battery_type || batteryType, soc, health, temp]
    );

    res.json({
      success: true,
      message: "Battery telemetry recorded successfully in MySQL.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating battery telemetry.", error: error.message });
  }
});

export default router;
