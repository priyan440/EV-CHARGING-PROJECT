import { query, transaction } from "../config/db.js";
import { parsePagination, buildPaginationMeta } from "../utils/pagination.js";

// Helper: Check owner access for a station
const checkStationOwnership = async (stationId, user) => {
  const isNum = /^\d+$/.test(String(stationId));
  const numId = isNum ? parseInt(stationId, 10) : 0;
  const rows = await query(
    `SELECT id, station_id, owner_id, station_name FROM stations WHERE id = ? OR station_id = ?`,
    [numId, String(stationId)]
  );
  if (!rows || rows.length === 0) return null;

  const station = rows[0];
  const role = (user?.role || "").toUpperCase();
  if (role !== "ADMIN" && station.owner_id !== user.id) {
    return { unauthorized: true, station };
  }
  return { authorized: true, station };
};

/**
 * 1. GET TARIFFS (PUBLIC OR FILTERED BY OWNER / STATION) WITH PAGINATION
 * GET /api/tariffs
 */
export const getTariffs = async (req, res) => {
  try {
    const { stationId, station_id, status } = req.query;
    const { page, limit, offset, search } = parsePagination(req, 10, 50);

    let whereClauses = ["1=1"];
    let params = [];

    const stId = stationId || station_id;
    if (stId) {
      const isNum = /^\d+$/.test(stId);
      whereClauses.push("(s.id = ? OR s.station_id = ?)");
      params.push(isNum ? parseInt(stId, 10) : 0, String(stId));
    }

    if (status && status !== "ALL") {
      whereClauses.push("t.status = ?");
      params.push(status.toUpperCase());
    }

    if (search) {
      whereClauses.push("(s.station_name LIKE ? OR t.tariff_id LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereSql = whereClauses.join(" AND ");

    const [countRow] = await query(
      `SELECT COUNT(*) as total 
       FROM tariffs t 
       JOIN stations s ON t.station_id = s.id 
       WHERE ${whereSql}`,
      params
    );
    const totalItems = countRow?.total || 0;

    const rows = await query(
      `SELECT t.*, s.station_name, s.station_id as station_code, s.city, s.owner_id 
       FROM tariffs t 
       JOIN stations s ON t.station_id = s.id 
       WHERE ${whereSql} 
       ORDER BY t.id DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const pagination = buildPaginationMeta(totalItems, page, limit);

    res.json({
      success: true,
      data: rows.map((t) => ({
        id: t.id,
        tariffId: t.tariff_id,
        tariff_id: t.tariff_id,
        stationId: t.station_id,
        station_id: t.station_id,
        stationName: t.station_name,
        chargerType: t.charger_type || "ALL",
        baseRate: parseFloat(t.base_rate_per_kwh),
        pricePerKwh: parseFloat(t.base_rate_per_kwh),
        peakRate: parseFloat(t.peak_rate_per_kwh),
        offPeakRate: parseFloat(t.off_peak_rate_per_kwh),
        connectionFee: parseFloat(t.connection_fee),
        idleFee: parseFloat(t.idle_fee_per_minute),
        taxPercentage: parseFloat(t.tax_percentage || 18.0),
        peakStart: t.peak_start || "18:00",
        peakEnd: t.peak_end || "22:00",
        effectiveFrom: t.effective_from,
        effectiveTo: t.effective_to,
        status: t.status,
        active: t.status === "ACTIVE",
      })),
      pagination,
    });
  } catch (error) {
    console.error("getTariffs error:", error);
    res.status(500).json({ success: false, message: "Error fetching tariffs.", error: error.message });
  }
};

/**
 * 2. CREATE NEW TARIFF
 * POST /api/tariffs
 */
export const createTariff = async (req, res) => {
  try {
    const {
      stationId,
      station_id,
      chargerType = "ALL",
      baseRate = 18.0,
      pricePerKwh,
      peakRate = 22.0,
      offPeakRate = 14.0,
      connectionFee = 15.0,
      idleFee = 2.0,
      taxPercentage = 18.0,
      peakStart = "18:00",
      peakEnd = "22:00",
      effectiveFrom,
      effectiveTo,
    } = req.body;

    const stId = stationId || station_id;
    if (!stId) return res.status(400).json({ success: false, message: "Station ID is required." });

    const access = await checkStationOwnership(stId, req.user);
    if (!access) return res.status(404).json({ success: false, message: "Station not found." });
    if (access.unauthorized) return res.status(403).json({ success: false, message: "Unauthorized." });

    const cleanBaseRate = parseFloat(pricePerKwh || baseRate) || 18.0;
    const cleanPeakRate = parseFloat(peakRate) || 22.0;
    const cleanOffPeakRate = parseFloat(offPeakRate) || 14.0;
    const cleanConnFee = parseFloat(connectionFee) || 15.0;
    const cleanIdleFee = parseFloat(idleFee) || 2.0;
    const cleanTax = parseFloat(taxPercentage) || 18.0;

    const maxRows = await query("SELECT COALESCE(MAX(id), 0) as maxId FROM tariffs");
    const nextId = (maxRows[0]?.maxId || 0) + 1;
    const tariffCode = `TAR${String(nextId).padStart(6, "0")}`;

    await transaction(async (connection) => {
      // 1. Insert new Tariff
      const [insertRes] = await connection.execute(
        `INSERT INTO tariffs (tariff_id, station_id, charger_type, base_rate_per_kwh, peak_rate_per_kwh, off_peak_rate_per_kwh, connection_fee, idle_fee_per_minute, tax_percentage, peak_start, peak_end, effective_from, effective_to, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()), ?, 'ACTIVE')`,
        [tariffCode, access.station.id, chargerType, cleanBaseRate, cleanPeakRate, cleanOffPeakRate, cleanConnFee, cleanIdleFee, cleanTax, peakStart, peakEnd, effectiveFrom || null, effectiveTo || null]
      );

      const insertedId = insertRes.insertId;

      // 2. Log initial tariff creation to tariff_history
      const histCode = `THIST${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
      await connection.execute(
        `INSERT INTO tariff_history (history_id, tariff_id, station_id, charger_type, base_rate_per_kwh, peak_rate_per_kwh, off_peak_rate_per_kwh, connection_fee, idle_fee_per_minute, tax_percentage, peak_start, peak_end, change_reason, changed_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Initial tariff configuration', ?)`,
        [histCode, insertedId, access.station.id, chargerType, cleanBaseRate, cleanPeakRate, cleanOffPeakRate, cleanConnFee, cleanIdleFee, cleanTax, peakStart, peakEnd, req.user?.id || null]
      );
    });

    const [created] = await query("SELECT * FROM tariffs WHERE tariff_id = ?", [tariffCode]);

    res.status(201).json({
      success: true,
      message: "Dynamic tariff created successfully and persisted in MySQL.",
      data: created,
    });
  } catch (error) {
    console.error("createTariff error:", error);
    res.status(500).json({ success: false, message: "Error creating tariff.", error: error.message });
  }
};

/**
 * 3. UPDATE TARIFF WITH HISTORY PRESERVATION
 * PUT /api/tariffs/:id
 */
export const updateTariff = async (req, res) => {
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

    const currentTariff = existing[0];
    const access = await checkStationOwnership(currentTariff.station_id, req.user);
    if (!access) return res.status(404).json({ success: false, message: "Station not found." });
    if (access.unauthorized) return res.status(403).json({ success: false, message: "Unauthorized." });

    const {
      baseRate,
      pricePerKwh,
      peakRate,
      offPeakRate,
      connectionFee,
      idleFee,
      taxPercentage,
      peakStart,
      peakEnd,
      status,
      changeReason = "Owner price adjustment",
      effectiveTo,
    } = req.body;

    const newBaseRate = baseRate !== undefined || pricePerKwh !== undefined ? parseFloat(baseRate || pricePerKwh) : parseFloat(currentTariff.base_rate_per_kwh);
    const newPeakRate = peakRate !== undefined ? parseFloat(peakRate) : parseFloat(currentTariff.peak_rate_per_kwh);
    const newOffPeakRate = offPeakRate !== undefined ? parseFloat(offPeakRate) : parseFloat(currentTariff.off_peak_rate_per_kwh);
    const newConnFee = connectionFee !== undefined ? parseFloat(connectionFee) : parseFloat(currentTariff.connection_fee);
    const newIdleFee = idleFee !== undefined ? parseFloat(idleFee) : parseFloat(currentTariff.idle_fee_per_minute);
    const newTax = taxPercentage !== undefined ? parseFloat(taxPercentage) : parseFloat(currentTariff.tax_percentage || 18.0);
    const newPeakStart = peakStart || currentTariff.peak_start;
    const newPeakEnd = peakEnd || currentTariff.peak_end;
    const newStatus = status ? status.toUpperCase() : currentTariff.status;

    await transaction(async (connection) => {
      // 1. Preserve historical tariff snapshot before applying changes
      const histCode = `THIST${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
      await connection.execute(
        `INSERT INTO tariff_history (history_id, tariff_id, station_id, charger_type, base_rate_per_kwh, peak_rate_per_kwh, off_peak_rate_per_kwh, connection_fee, idle_fee_per_minute, tax_percentage, peak_start, peak_end, effective_from, effective_to, change_reason, changed_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
        [
          histCode,
          currentTariff.id,
          currentTariff.station_id,
          currentTariff.charger_type,
          currentTariff.base_rate_per_kwh,
          currentTariff.peak_rate_per_kwh,
          currentTariff.off_peak_rate_per_kwh,
          currentTariff.connection_fee,
          currentTariff.idle_fee_per_minute,
          currentTariff.tax_percentage || 18.0,
          currentTariff.peak_start,
          currentTariff.peak_end,
          currentTariff.effective_from,
          changeReason,
          req.user?.id || null,
        ]
      );

      // 2. Update active tariff with new rates
      await connection.execute(
        `UPDATE tariffs SET
           base_rate_per_kwh = ?,
           peak_rate_per_kwh = ?,
           off_peak_rate_per_kwh = ?,
           connection_fee = ?,
           idle_fee_per_minute = ?,
           tax_percentage = ?,
           peak_start = ?,
           peak_end = ?,
           effective_from = NOW(),
           effective_to = ?,
           status = ?,
           updated_at = NOW()
         WHERE id = ?`,
        [newBaseRate, newPeakRate, newOffPeakRate, newConnFee, newIdleFee, newTax, newPeakStart, newPeakEnd, effectiveTo || null, newStatus, currentTariff.id]
      );
    });

    const [updated] = await query("SELECT * FROM tariffs WHERE id = ?", [currentTariff.id]);

    res.json({
      success: true,
      message: "Tariff updated successfully. Historical price snapshot preserved.",
      data: updated,
    });
  } catch (error) {
    console.error("updateTariff error:", error);
    res.status(500).json({ success: false, message: "Error updating tariff.", error: error.message });
  }
};

/**
 * 4. GET TARIFF CHANGE HISTORY
 * GET /api/tariffs/history
 */
export const getTariffHistory = async (req, res) => {
  try {
    const { stationId } = req.query;
    const { page, limit, offset } = parsePagination(req, 10, 50);

    let whereSql = "1=1";
    let params = [];

    if (stationId) {
      const isNum = /^\d+$/.test(stationId);
      whereSql = "(s.id = ? OR s.station_id = ?)";
      params = [isNum ? parseInt(stationId, 10) : 0, String(stationId)];
    }

    const [countRow] = await query(
      `SELECT COUNT(*) as total 
       FROM tariff_history th 
       JOIN stations s ON th.station_id = s.id 
       WHERE ${whereSql}`,
      params
    );
    const totalItems = countRow?.total || 0;

    const rows = await query(
      `SELECT th.*, s.station_name, s.station_id as station_code, u.name as changed_by_name 
       FROM tariff_history th 
       JOIN stations s ON th.station_id = s.id 
       LEFT JOIN users u ON th.changed_by = u.id 
       WHERE ${whereSql} 
       ORDER BY th.id DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const pagination = buildPaginationMeta(totalItems, page, limit);

    res.json({
      success: true,
      data: rows,
      pagination,
    });
  } catch (error) {
    console.error("getTariffHistory error:", error);
    res.status(500).json({ success: false, message: "Error fetching tariff history.", error: error.message });
  }
};

/**
 * 5. PUBLIC TRANSPARENT PRICING & COST ESTIMATE API
 * GET /api/tariffs/calculate & POST /api/tariffs/calculate
 */
export const calculateTariffEstimate = async (req, res) => {
  try {
    const source = req.method === "POST" ? req.body : req.query;
    const {
      stationId,
      station_id,
      chargerId,
      connectorType = "CCS2",
      kwh,
      energyKwh = 20.0,
      durationMinutes = 60,
      requestedTime,
    } = source;

    const stId = stationId || station_id;
    if (!stId) {
      return res.status(400).json({ success: false, message: "stationId is required." });
    }

    const isNum = /^\d+$/.test(stId);
    const stRows = await query(
      `SELECT s.id, s.station_id, s.station_name, s.city 
       FROM stations s 
       WHERE s.id = ? OR s.station_id = ?`,
      [isNum ? parseInt(stId, 10) : 0, String(stId)]
    );

    if (!stRows || stRows.length === 0) {
      return res.status(404).json({ success: false, message: "Station not found." });
    }

    const station = stRows[0];

    // Fetch active tariff for this station
    const tariffRows = await query(
      `SELECT * FROM tariffs WHERE station_id = ? AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1`,
      [station.id]
    );

    const tariff = tariffRows[0] || {
      base_rate_per_kwh: 18.0,
      peak_rate_per_kwh: 22.0,
      off_peak_rate_per_kwh: 14.0,
      connection_fee: 15.0,
      idle_fee_per_minute: 2.0,
      tax_percentage: 18.0,
      peak_start: "18:00",
      peak_end: "22:00",
    };

    const baseRate = parseFloat(tariff.base_rate_per_kwh);
    const peakRate = parseFloat(tariff.peak_rate_per_kwh);
    const offPeakRate = parseFloat(tariff.off_peak_rate_per_kwh);
    const connFee = parseFloat(tariff.connection_fee);
    const idleFeePerMin = parseFloat(tariff.idle_fee_per_minute);
    const taxPct = parseFloat(tariff.tax_percentage || 18.0);

    // Determine if requested time is Peak, Off-Peak or Standard
    const now = requestedTime ? new Date(requestedTime) : new Date();
    const currentHourMin = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const isPeak = currentHourMin >= tariff.peak_start && currentHourMin <= tariff.peak_end;
    const isOffPeak = currentHourMin >= "23:00" || currentHourMin < "06:00";

    let applicableRate = baseRate;
    let rateType = "STANDARD";

    if (isPeak) {
      applicableRate = peakRate;
      rateType = "PEAK";
    } else if (isOffPeak) {
      applicableRate = offPeakRate;
      rateType = "OFF_PEAK";
    }

    const cleanKwh = parseFloat(kwh || energyKwh) || 20.0;
    const cleanDuration = parseInt(durationMinutes, 10) || 60;

    const energyCost = cleanKwh * applicableRate;
    const subtotal = energyCost + connFee;
    const taxAmount = (subtotal * taxPct) / 100.0;
    const totalEstimate = subtotal + taxAmount;

    res.json({
      success: true,
      station: {
        id: station.id,
        stationId: station.station_id,
        stationName: station.station_name,
        city: station.city,
      },
      pricingDetails: {
        rateType,
        applicableRatePerKwh: applicableRate,
        baseRatePerKwh: baseRate,
        peakRatePerKwh: peakRate,
        offPeakRatePerKwh: offPeakRate,
        peakWindow: `${tariff.peak_start} - ${tariff.peak_end}`,
        connectionFee: connFee,
        idleFeePerMinute: idleFeePerMin,
        taxPercentage: taxPct,
      },
      breakdown: {
        requestedEnergyKwh: cleanKwh,
        durationMinutes: cleanDuration,
        energyCharge: parseFloat(energyCost.toFixed(2)),
        connectionFee: parseFloat(connFee.toFixed(2)),
        subtotal: parseFloat(subtotal.toFixed(2)),
        taxAmount: parseFloat(taxAmount.toFixed(2)),
        totalEstimatedAmount: parseFloat(totalEstimate.toFixed(2)),
      },
      disclaimer: "Final charge calculated from verified session measurements and applicable time-of-use tariff snapshot.",
    });
  } catch (error) {
    console.error("calculateTariffEstimate error:", error);
    res.status(500).json({ success: false, message: "Error calculating price estimate.", error: error.message });
  }
};

export default {
  getTariffs,
  createTariff,
  updateTariff,
  getTariffHistory,
  calculateTariffEstimate,
};
