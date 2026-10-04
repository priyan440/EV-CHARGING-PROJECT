import express from "express";
import { query } from "../config/db.js";
import { authenticate, optionalAuth } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

/**
 * GET /api/tariffs
 * Get active tariffs (filter by station_id or all)
 */
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { station_id, stationId } = req.query;
    let sql = `
      SELECT t.*, s.station_name, s.station_id as station_code, s.city
      FROM tariffs t
      JOIN stations s ON t.station_id = s.id
      WHERE t.status = 'ACTIVE'
    `;
    let params = [];

    const stId = station_id || stationId;
    if (stId) {
      const isNum = /^\d+$/.test(stId);
      sql += " AND (s.id = ? OR s.station_id = ?)";
      params.push(isNum ? parseInt(stId, 10) : 0, String(stId));
    }

    sql += " ORDER BY t.id DESC";
    const rows = await query(sql, params);

    res.json({
      success: true,
      count: rows.length,
      data: rows.map((t) => ({
        id: t.id,
        tariffId: t.tariff_id,
        tariff_id: t.tariff_id,
        stationId: t.station_id,
        station_id: t.station_id,
        stationName: t.station_name,
        pricePerKwh: parseFloat(t.base_rate_per_kwh),
        baseRate: parseFloat(t.base_rate_per_kwh),
        peakRate: parseFloat(t.peak_rate_per_kwh),
        offPeakRate: parseFloat(t.off_peak_rate_per_kwh),
        connectionFee: parseFloat(t.connection_fee),
        idleFee: parseFloat(t.idle_fee_per_minute),
        peakStart: t.peak_start,
        peakEnd: t.peak_end,
        status: t.status,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching tariffs.", error: error.message });
  }
});

/**
 * POST /api/tariffs
 * Create tariff for a station (Owner or Admin)
 */
router.post("/", authenticate, authorizeRoles("STATION_OWNER", "OWNER", "ADMIN"), async (req, res) => {
  try {
    const userId = req.user.id;
    const role = (req.user.role || "").toUpperCase();
    const {
      station_id,
      stationId,
      base_rate_per_kwh,
      baseRate = 18.0,
      pricePerKwh,
      peak_rate_per_kwh,
      peakRate = 22.0,
      off_peak_rate_per_kwh,
      offPeakRate = 14.0,
      connection_fee,
      connectionFee = 15.0,
      idle_fee_per_minute,
      idleFee = 2.0,
      peak_start = "18:00",
      peak_end = "22:00",
    } = req.body;

    const stId = station_id || stationId;
    if (!stId) {
      return res.status(400).json({ success: false, message: "Station ID is required." });
    }

    const isNum = /^\d+$/.test(stId);
    let checkSql = "SELECT id, owner_id FROM stations WHERE (id = ? OR station_id = ?)";
    let checkParams = [isNum ? parseInt(stId, 10) : 0, String(stId)];
    const stRows = await query(checkSql, checkParams);

    if (!stRows || stRows.length === 0) {
      return res.status(404).json({ success: false, message: "Station not found." });
    }

    if (role !== "ADMIN" && stRows[0].owner_id !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized to add tariffs to this station." });
    }

    const targetStationId = stRows[0].id;
    const maxRows = await query("SELECT COALESCE(MAX(id), 0) as maxId FROM tariffs");
    const nextId = (maxRows[0]?.maxId || 0) + 1;
    const tariffCode = `TAR${String(nextId).padStart(6, "0")}`;

    const cleanBaseRate = parseFloat(base_rate_per_kwh || baseRate || pricePerKwh) || 18.0;
    const cleanPeakRate = parseFloat(peak_rate_per_kwh || peakRate) || 22.0;
    const cleanOffPeakRate = parseFloat(off_peak_rate_per_kwh || offPeakRate) || 14.0;
    const cleanConnFee = parseFloat(connection_fee || connectionFee) || 15.0;
    const cleanIdleFee = parseFloat(idle_fee_per_minute || idleFee) || 2.0;

    await query(
      `INSERT INTO tariffs 
       (tariff_id, station_id, base_rate_per_kwh, peak_rate_per_kwh, off_peak_rate_per_kwh, connection_fee, idle_fee_per_minute, peak_start, peak_end, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [tariffCode, targetStationId, cleanBaseRate, cleanPeakRate, cleanOffPeakRate, cleanConnFee, cleanIdleFee, peak_start, peak_end]
    );

    const inserted = await query("SELECT * FROM tariffs WHERE tariff_id = ?", [tariffCode]);

    res.status(201).json({
      success: true,
      message: "Tariff created successfully.",
      data: inserted[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating tariff.", error: error.message });
  }
});

/**
 * PUT /api/tariffs/:id
 * Update tariff
 */
router.put("/:id", authenticate, authorizeRoles("STATION_OWNER", "OWNER", "ADMIN"), async (req, res) => {
  try {
    const tariffId = req.params.id;
    const isNum = /^\d+$/.test(tariffId);
    const existing = await query("SELECT * FROM tariffs WHERE id = ? OR tariff_id = ?", [
      isNum ? parseInt(tariffId, 10) : 0,
      String(tariffId),
    ]);

    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Tariff not found." });
    }

    const {
      baseRate,
      base_rate_per_kwh,
      pricePerKwh,
      peakRate,
      peak_rate_per_kwh,
      offPeakRate,
      off_peak_rate_per_kwh,
      connectionFee,
      connection_fee,
      idleFee,
      idle_fee_per_minute,
      status,
    } = req.body;

    const cleanBaseRate = parseFloat(baseRate || base_rate_per_kwh || pricePerKwh) || parseFloat(existing[0].base_rate_per_kwh);
    const cleanPeakRate = parseFloat(peakRate || peak_rate_per_kwh) || parseFloat(existing[0].peak_rate_per_kwh);
    const cleanOffPeakRate = parseFloat(offPeakRate || off_peak_rate_per_kwh) || parseFloat(existing[0].off_peak_rate_per_kwh);
    const cleanConnFee = parseFloat(connectionFee || connection_fee) || parseFloat(existing[0].connection_fee);
    const cleanIdleFee = parseFloat(idleFee || idle_fee_per_minute) || parseFloat(existing[0].idle_fee_per_minute);
    const cleanStatus = status ? status.toUpperCase() : existing[0].status;

    await query(
      `UPDATE tariffs 
       SET base_rate_per_kwh = ?, peak_rate_per_kwh = ?, off_peak_rate_per_kwh = ?, connection_fee = ?, idle_fee_per_minute = ?, status = ?
       WHERE id = ?`,
      [cleanBaseRate, cleanPeakRate, cleanOffPeakRate, cleanConnFee, cleanIdleFee, cleanStatus, existing[0].id]
    );

    const updated = await query("SELECT * FROM tariffs WHERE id = ?", [existing[0].id]);
    res.json({ success: true, message: "Tariff updated successfully.", data: updated[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating tariff.", error: error.message });
  }
});

/**
 * DELETE /api/tariffs/:id
 * Deactivates tariff (preserves historical data integrity)
 */
router.delete("/:id", authenticate, authorizeRoles("STATION_OWNER", "OWNER", "ADMIN"), async (req, res) => {
  try {
    const tariffId = req.params.id;
    const isNum = /^\d+$/.test(tariffId);
    await query("UPDATE tariffs SET status = 'INACTIVE' WHERE id = ? OR tariff_id = ?", [
      isNum ? parseInt(tariffId, 10) : 0,
      String(tariffId),
    ]);
    res.json({ success: true, message: "Tariff deactivated successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deactivating tariff.", error: error.message });
  }
});

export default router;
