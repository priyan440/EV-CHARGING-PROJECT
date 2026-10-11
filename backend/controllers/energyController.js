import { query, transaction } from "../config/db.js";
import { parsePagination, buildPaginationMeta } from "../utils/pagination.js";

// Helper: Check owner access for a station
const checkStationOwnership = async (stationId, user) => {
  const isNum = /^\d+$/.test(String(stationId));
  const numId = isNum ? parseInt(stationId, 10) : 0;
  const rows = await query(
    `SELECT id, station_id, owner_id, station_name, max_power FROM stations WHERE id = ? OR station_id = ?`,
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
 * 1. GET STATION ENERGY CONFIG
 * GET /api/owner/energy/stations/:stationId/config
 */
export const getStationEnergyConfig = async (req, res) => {
  try {
    const { stationId } = req.params;
    const access = await checkStationOwnership(stationId, req.user);
    if (!access) return res.status(404).json({ success: false, message: "Station not found." });
    if (access.unauthorized) return res.status(403).json({ success: false, message: "Unauthorized." });

    const rows = await query(
      `SELECT * FROM station_energy_configs WHERE station_id = ?`,
      [access.station.id]
    );

    let config = rows[0];
    if (!config) {
      // Auto-initialize default energy configuration if not yet populated
      const defaultPower = parseFloat(access.station.max_power) || 250.0;
      await query(
        `INSERT INTO station_energy_configs (station_id, site_power_limit_kw, other_building_load_kw, safety_reserve_kw, control_mode, grid_cost_per_kwh, demand_charge_per_kw)
         VALUES (?, ?, 30.00, 20.00, 'MONITOR', 8.50, 250.00)`,
        [access.station.id, defaultPower]
      );
      const created = await query(`SELECT * FROM station_energy_configs WHERE station_id = ?`, [access.station.id]);
      config = created[0];
    }

    const siteLimit = parseFloat(config.site_power_limit_kw) || 250.0;
    const buildingLoad = parseFloat(config.other_building_load_kw) || 30.0;
    const safetyReserve = parseFloat(config.safety_reserve_kw) || 20.0;
    const availableCapacity = Math.max(0, siteLimit - buildingLoad - safetyReserve);

    res.json({
      success: true,
      stationId: access.station.station_id,
      stationName: access.station.station_name,
      data: {
        id: config.id,
        stationId: config.station_id,
        sitePowerLimitKw: siteLimit,
        otherBuildingLoadKw: buildingLoad,
        safetyReserveKw: safetyReserve,
        availableChargingCapacityKw: availableCapacity,
        controlMode: config.control_mode || "MONITOR",
        gridCostPerKwh: parseFloat(config.grid_cost_per_kwh) || 8.50,
        demandChargePerKw: parseFloat(config.demand_charge_per_kw) || 250.00,
        overloadThresholdPct: parseFloat(config.overload_threshold_pct) || 90.00,
        updatedAt: config.updated_at,
      },
    });
  } catch (error) {
    console.error("getStationEnergyConfig error:", error);
    res.status(500).json({ success: false, message: "Error fetching energy configuration.", error: error.message });
  }
};

/**
 * 2. UPDATE STATION ENERGY CONFIG
 * PUT /api/owner/energy/stations/:stationId/config
 */
export const updateStationEnergyConfig = async (req, res) => {
  try {
    const { stationId } = req.params;
    const access = await checkStationOwnership(stationId, req.user);
    if (!access) return res.status(404).json({ success: false, message: "Station not found." });
    if (access.unauthorized) return res.status(403).json({ success: false, message: "Unauthorized." });

    const {
      sitePowerLimitKw,
      otherBuildingLoadKw,
      safetyReserveKw,
      controlMode,
      gridCostPerKwh,
      demandChargePerKw,
      overloadThresholdPct,
    } = req.body;

    const cleanLimit = sitePowerLimitKw !== undefined ? parseFloat(sitePowerLimitKw) : null;
    const cleanBuilding = otherBuildingLoadKw !== undefined ? parseFloat(otherBuildingLoadKw) : null;
    const cleanReserve = safetyReserveKw !== undefined ? parseFloat(safetyReserveKw) : null;
    const cleanMode = controlMode && ["MONITOR", "SMART_CONTROL"].includes(controlMode.toUpperCase()) ? controlMode.toUpperCase() : null;
    const cleanGridCost = gridCostPerKwh !== undefined ? parseFloat(gridCostPerKwh) : null;
    const cleanDemand = demandChargePerKw !== undefined ? parseFloat(demandChargePerKw) : null;
    const cleanOverload = overloadThresholdPct !== undefined ? parseFloat(overloadThresholdPct) : null;

    if (cleanMode === "SMART_CONTROL") {
      // Audit log the switch to SMART_CONTROL
      await query(
        `INSERT INTO smart_control_logs (station_id, user_id, command_type, target_power_limit_kw, notes)
         VALUES (?, ?, 'ENABLE_SMART_CONTROL', ?, 'Switched load control mode to SMART_CONTROL via dashboard')`,
        [access.station.id, req.user.id, cleanLimit || 250.0]
      );
    }

    await query(
      `UPDATE station_energy_configs SET
         site_power_limit_kw = COALESCE(?, site_power_limit_kw),
         other_building_load_kw = COALESCE(?, other_building_load_kw),
         safety_reserve_kw = COALESCE(?, safety_reserve_kw),
         control_mode = COALESCE(?, control_mode),
         grid_cost_per_kwh = COALESCE(?, grid_cost_per_kwh),
         demand_charge_per_kw = COALESCE(?, demand_charge_per_kw),
         overload_threshold_pct = COALESCE(?, overload_threshold_pct),
         updated_at = NOW()
       WHERE station_id = ?`,
      [cleanLimit, cleanBuilding, cleanReserve, cleanMode, cleanGridCost, cleanDemand, cleanOverload, access.station.id]
    );

    const rows = await query(`SELECT * FROM station_energy_configs WHERE station_id = ?`, [access.station.id]);
    const config = rows[0];

    res.json({
      success: true,
      message: "Energy configuration updated successfully in MySQL.",
      data: config,
    });
  } catch (error) {
    console.error("updateStationEnergyConfig error:", error);
    res.status(500).json({ success: false, message: "Error updating energy configuration.", error: error.message });
  }
};

/**
 * 3. GET DEDICATED ENERGY DASHBOARD METRICS
 * GET /api/owner/energy/stations/:stationId/dashboard
 */
export const getStationEnergyDashboard = async (req, res) => {
  try {
    const { stationId } = req.params;
    const access = await checkStationOwnership(stationId, req.user);
    if (!access) return res.status(404).json({ success: false, message: "Station not found." });
    if (access.unauthorized) return res.status(403).json({ success: false, message: "Unauthorized." });

    const stId = access.station.id;

    // 1. Fetch Energy Config
    let [config] = await query(`SELECT * FROM station_energy_configs WHERE station_id = ?`, [stId]);
    if (!config) {
      const defaultPower = parseFloat(access.station.max_power) || 250.0;
      await query(
        `INSERT INTO station_energy_configs (station_id, site_power_limit_kw, other_building_load_kw, safety_reserve_kw, control_mode, grid_cost_per_kwh, demand_charge_per_kw)
         VALUES (?, ?, 30.00, 20.00, 'MONITOR', 8.50, 250.00)`,
        [stId, defaultPower]
      );
      const created = await query(`SELECT * FROM station_energy_configs WHERE station_id = ?`, [stId]);
      config = created[0];
    }

    const siteLimit = parseFloat(config.site_power_limit_kw) || 250.0;
    const buildingLoad = parseFloat(config.other_building_load_kw) || 30.0;
    const safetyReserve = parseFloat(config.safety_reserve_kw) || 20.0;
    const gridCostPerKwh = parseFloat(config.grid_cost_per_kwh) || 8.50;
    const overloadThresholdPct = parseFloat(config.overload_threshold_pct) || 90.00;

    // Available Charging Capacity formula: MAX(0, site power limit - other building load - safety reserve)
    const availableChargingCapacity = Math.max(0, siteLimit - buildingLoad - safetyReserve);

    // 2. Fetch Chargers & Active Sessions
    const chargers = await query(
      `SELECT c.*, cc.connector_type 
       FROM chargers c 
       LEFT JOIN charger_connectors cc ON cc.charger_id = c.id 
       WHERE c.station_id = ? 
       ORDER BY c.id ASC`,
      [stId]
    );

    const activeSessions = await query(
      `SELECT cs.*, u.name as customer_name, v.model as vehicle_model, v.registration_number 
       FROM charging_sessions cs 
       LEFT JOIN users u ON cs.user_id = u.id 
       LEFT JOIN vehicles v ON cs.vehicle_id = v.id 
       WHERE cs.station_id = ? AND cs.session_status IN ('CHARGING', 'ACTIVE', 'STARTED')`,
      [stId]
    );

    // 3. Compute Per-Charger Power Allocation
    let totalRequestedPower = 0;
    const chargerAllocations = chargers.map((chg) => {
      const activeSess = activeSessions.find((s) => s.charger_id === chg.id);
      const isCharging = Boolean(activeSess) || ["CHARGING", "OCCUPIED"].includes(chg.status);
      const maxChgPower = parseFloat(chg.power_kw) || 60.0;
      const requestedPower = isCharging ? (parseFloat(activeSess?.power_kw) || maxChgPower) : 0;
      totalRequestedPower += requestedPower;

      return {
        id: chg.id,
        chargerId: chg.charger_id,
        chargerName: chg.charger_name,
        chargerType: chg.charger_type,
        connectorType: chg.connector_type || "CCS2",
        status: chg.status,
        ratedPowerKw: maxChgPower,
        requestedPowerKw: requestedPower,
        allocatedPowerKw: 0, // Computed below
        activeSession: activeSess
          ? {
              sessionId: activeSess.session_id,
              customerName: activeSess.customer_name || "EV Driver",
              vehicleModel: activeSess.vehicle_model || "Tata Nexon EV",
              vehicleNumber: activeSess.registration_number || "TN01EV0001",
              energyKwh: parseFloat(activeSess.energy_kwh) || 0,
              batterySoc: activeSess.battery_soc || 55,
              durationMinutes: activeSess.duration_minutes || 20,
            }
          : null,
      };
    });

    // Allocate power: if totalRequested exceeds available capacity, dynamically scale or prioritize
    let totalAllocatedPower = 0;
    const scaleFactor = totalRequestedPower > 0 && totalRequestedPower > availableChargingCapacity
      ? availableChargingCapacity / totalRequestedPower
      : 1.0;

    chargerAllocations.forEach((item) => {
      if (item.requestedPowerKw > 0) {
        item.allocatedPowerKw = parseFloat((item.requestedPowerKw * scaleFactor).toFixed(2));
        totalAllocatedPower += item.allocatedPowerKw;
      }
    });

    // 4. Energy Consumed & Costs from MySQL
    const [todayEnergyRow] = await query(
      `SELECT COALESCE(SUM(energy_kwh), 0) as todayKwh, COUNT(id) as sessionCount 
       FROM charging_sessions 
       WHERE station_id = ? AND DATE(start_time) = CURRENT_DATE()`,
      [stId]
    );
    const todayKwh = parseFloat(todayEnergyRow?.todayKwh) || 0;

    const [monthEnergyRow] = await query(
      `SELECT COALESCE(SUM(energy_kwh), 0) as monthKwh 
       FROM charging_sessions 
       WHERE station_id = ? AND start_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [stId]
    );
    const monthKwh = parseFloat(monthEnergyRow?.monthKwh) || 0;

    // Payments / Revenue for cost reconciliation
    const [todayRevRow] = await query(
      `SELECT COALESCE(SUM(p.amount), 0) as todayRevenue 
       FROM payments p 
       JOIN bookings b ON (p.booking_id = b.id OR p.booking_id = b.booking_id) 
       WHERE b.station_id = ? AND p.payment_status = 'SUCCESS' AND DATE(p.paid_at) = CURRENT_DATE()`,
      [stId]
    );
    const todayRevenue = parseFloat(todayRevRow?.todayRevenue) || 0;

    const [monthRevRow] = await query(
      `SELECT COALESCE(SUM(p.amount), 0) as monthlyRevenue 
       FROM payments p 
       JOIN bookings b ON (p.booking_id = b.id OR p.booking_id = b.booking_id) 
       WHERE b.station_id = ? AND p.payment_status = 'SUCCESS' AND p.paid_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [stId]
    );
    const monthlyRevenue = parseFloat(monthRevRow?.monthlyRevenue) || 0;

    // Cost calculations
    const estimatedDailyCost = parseFloat((todayKwh * gridCostPerKwh).toFixed(2));
    const estimatedMonthlyCost = parseFloat((monthKwh * gridCostPerKwh).toFixed(2));
    const dailyNetMargin = parseFloat((todayRevenue - estimatedDailyCost).toFixed(2));
    const monthlyNetMargin = parseFloat((monthlyRevenue - estimatedMonthlyCost).toFixed(2));

    // Overload & Peak demand analysis
    const currentTotalLoad = buildingLoad + totalAllocatedPower;
    const currentUtilizationPct = siteLimit > 0 ? (currentTotalLoad / siteLimit) * 100 : 0;
    const isOverloaded = currentUtilizationPct >= overloadThresholdPct;

    // Hourly load profile trend
    const hourlyProfile = [
      { hour: "00:00", gridLoad: buildingLoad, chargingLoad: 0, capacity: availableChargingCapacity },
      { hour: "04:00", gridLoad: buildingLoad, chargingLoad: 0, capacity: availableChargingCapacity },
      { hour: "08:00", gridLoad: buildingLoad + 15, chargingLoad: Math.min(availableChargingCapacity, totalAllocatedPower * 0.7), capacity: availableChargingCapacity },
      { hour: "12:00", gridLoad: buildingLoad + 25, chargingLoad: Math.min(availableChargingCapacity, totalAllocatedPower * 0.9), capacity: availableChargingCapacity },
      { hour: "16:00", gridLoad: buildingLoad + 20, chargingLoad: Math.min(availableChargingCapacity, totalAllocatedPower), capacity: availableChargingCapacity },
      { hour: "20:00", gridLoad: buildingLoad + 10, chargingLoad: Math.min(availableChargingCapacity, totalAllocatedPower * 0.8), capacity: availableChargingCapacity },
      { hour: "23:00", gridLoad: buildingLoad, chargingLoad: Math.min(availableChargingCapacity, totalAllocatedPower * 0.3), capacity: availableChargingCapacity },
    ];

    res.json({
      success: true,
      stationId: access.station.station_id,
      stationName: access.station.station_name,
      telemetryNotice: "SIMULATED / LABELED TELEMETRY DATA SOURCE (MySQL RELATIONAL ENGINE)",
      data: {
        config: {
          sitePowerLimitKw: siteLimit,
          otherBuildingLoadKw: buildingLoad,
          safetyReserveKw: safetyReserve,
          availableChargingCapacityKw: availableChargingCapacity,
          controlMode: config.control_mode || "MONITOR",
          gridCostPerKwh,
          overloadThresholdPct,
        },
        currentLoad: {
          totalRequestedPowerKw: totalRequestedPower,
          totalAllocatedPowerKw: totalAllocatedPower,
          currentTotalSiteLoadKw: parseFloat(currentTotalLoad.toFixed(2)),
          utilizationPercentage: parseFloat(currentUtilizationPct.toFixed(1)),
          isOverloaded,
          safetyBufferRemainingKw: Math.max(0, siteLimit - currentTotalLoad),
        },
        energyAndCosts: {
          todayEnergyKwh: todayKwh,
          monthlyEnergyKwh: monthKwh,
          estimatedDailyEnergyCost: estimatedDailyCost,
          estimatedMonthlyEnergyCost: estimatedMonthlyCost,
          todayRevenue,
          monthlyRevenue,
          dailyNetMargin,
          monthlyNetMargin,
          costBasis: "ESTIMATED_GRID_TARIFF",
        },
        chargers: chargerAllocations,
        activeSessionsCount: activeSessions.length,
        hourlyProfile,
      },
    });
  } catch (error) {
    console.error("getStationEnergyDashboard error:", error);
    res.status(500).json({ success: false, message: "Error fetching energy dashboard.", error: error.message });
  }
};

/**
 * 4. SMART LOAD DISTRIBUTION ALGORITHM
 * POST /api/owner/energy/stations/:stationId/smart-allocate
 */
export const smartAllocatePower = async (req, res) => {
  try {
    const { stationId } = req.params;
    const access = await checkStationOwnership(stationId, req.user);
    if (!access) return res.status(404).json({ success: false, message: "Station not found." });
    if (access.unauthorized) return res.status(403).json({ success: false, message: "Unauthorized." });

    const stId = access.station.id;
    let [config] = await query(`SELECT * FROM station_energy_configs WHERE station_id = ?`, [stId]);
    const siteLimit = parseFloat(config?.site_power_limit_kw) || 250.0;
    const buildingLoad = parseFloat(config?.other_building_load_kw) || 30.0;
    const safetyReserve = parseFloat(config?.safety_reserve_kw) || 20.0;
    const availableCapacity = Math.max(0, siteLimit - buildingLoad - safetyReserve);

    const chargers = await query(`SELECT * FROM chargers WHERE station_id = ?`, [stId]);
    const activeSessions = await query(
      `SELECT * FROM charging_sessions WHERE station_id = ? AND session_status IN ('CHARGING', 'ACTIVE')`,
      [stId]
    );

    let totalRequested = 0;
    const requests = chargers.map((c) => {
      const active = activeSessions.find((s) => s.charger_id === c.id);
      const reqKw = active ? (parseFloat(active.power_kw) || parseFloat(c.power_kw) || 60.0) : 0;
      totalRequested += reqKw;
      return { chargerId: c.id, chargerCode: c.charger_id, requestedKw: reqKw, active: Boolean(active) };
    });

    const scale = totalRequested > availableCapacity && totalRequested > 0 ? availableCapacity / totalRequested : 1.0;
    const allocations = requests.map((r) => ({
      chargerId: r.chargerId,
      chargerCode: r.chargerCode,
      requestedKw: r.requestedKw,
      allocatedKw: parseFloat((r.requestedKw * scale).toFixed(2)),
    }));

    const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedKw, 0);

    // Save allocation record to MySQL
    await query(
      `INSERT INTO load_allocation_history 
       (station_id, total_capacity_kw, building_load_kw, available_charging_kw, total_requested_kw, total_allocated_kw, active_chargers_count, allocations_json, mode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        stId,
        siteLimit,
        buildingLoad,
        availableCapacity,
        totalRequested,
        totalAllocated,
        activeSessions.length,
        JSON.stringify(allocations),
        config?.control_mode || "MONITOR",
      ]
    );

    res.json({
      success: true,
      message: `Power safely allocated across ${activeSessions.length} active bays without exceeding site limit (${availableCapacity}kW max).`,
      data: {
        availableCapacityKw: availableCapacity,
        totalRequestedKw: totalRequested,
        totalAllocatedKw: totalAllocated,
        allocations,
      },
    });
  } catch (error) {
    console.error("smartAllocatePower error:", error);
    res.status(500).json({ success: false, message: "Error performing smart load allocation.", error: error.message });
  }
};

/**
 * 5. RECORD TELEMETRY READING
 * POST /api/owner/energy/stations/:stationId/telemetry
 */
export const recordEnergyTelemetry = async (req, res) => {
  try {
    const { stationId } = req.params;
    const access = await checkStationOwnership(stationId, req.user);
    if (!access) return res.status(404).json({ success: false, message: "Station not found." });

    const { chargerId, meterValueKwh, instantaneousPowerKw, voltage = 400.0, currentAmp = 80.0, batterySoc, readingType = "SIMULATED" } = req.body;

    const chgRows = await query(`SELECT id FROM chargers WHERE id = ? OR charger_id = ?`, [chargerId, String(chargerId)]);
    if (!chgRows || chgRows.length === 0) {
      return res.status(404).json({ success: false, message: "Charger not found." });
    }

    const reading_id = `TEL${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
    const cleanType = ["MEASURED", "SIMULATED", "ESTIMATED"].includes(readingType.toUpperCase()) ? readingType.toUpperCase() : "SIMULATED";

    await query(
      `INSERT INTO charger_energy_readings 
       (reading_id, station_id, charger_id, reading_type, meter_value_kwh, instantaneous_power_kw, voltage, current_amp, battery_soc, reading_source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DEMO_TELEMETRY_ENGINE')`,
      [reading_id, access.station.id, chgRows[0].id, cleanType, parseFloat(meterValueKwh || 0), parseFloat(instantaneousPowerKw || 0), parseFloat(voltage), parseFloat(currentAmp), batterySoc || null]
    );

    res.status(201).json({ success: true, message: "Telemetry reading recorded in MySQL.", readingId: reading_id });
  } catch (error) {
    console.error("recordEnergyTelemetry error:", error);
    res.status(500).json({ success: false, message: "Failed to record telemetry.", error: error.message });
  }
};

/**
 * 6. GET ENERGY HISTORY WITH SERVER-SIDE PAGINATION
 * GET /api/owner/energy/stations/:stationId/history
 */
export const getStationEnergyHistory = async (req, res) => {
  try {
    const { stationId } = req.params;
    const access = await checkStationOwnership(stationId, req.user);
    if (!access) return res.status(404).json({ success: false, message: "Station not found." });
    if (access.unauthorized) return res.status(403).json({ success: false, message: "Unauthorized." });

    const { page, limit, offset } = parsePagination(req, 10, 50);

    const [countRow] = await query(
      `SELECT COUNT(*) as total FROM load_allocation_history WHERE station_id = ?`,
      [access.station.id]
    );
    const totalItems = countRow?.total || 0;

    const rows = await query(
      `SELECT * FROM load_allocation_history WHERE station_id = ? ORDER BY id DESC LIMIT ? OFFSET ?`,
      [access.station.id, limit, offset]
    );

    const pagination = buildPaginationMeta(totalItems, page, limit);

    res.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        stationId: r.station_id,
        totalCapacityKw: parseFloat(r.total_capacity_kw),
        buildingLoadKw: parseFloat(r.building_load_kw),
        availableChargingKw: parseFloat(r.available_charging_kw),
        totalRequestedKw: parseFloat(r.total_requested_kw),
        totalAllocatedKw: parseFloat(r.total_allocated_kw),
        activeChargersCount: r.active_chargers_count,
        allocations: r.allocations_json ? JSON.parse(r.allocations_json) : [],
        mode: r.mode,
        timestamp: r.timestamp,
      })),
      pagination,
    });
  } catch (error) {
    console.error("getStationEnergyHistory error:", error);
    res.status(500).json({ success: false, message: "Error fetching energy history.", error: error.message });
  }
};

/**
 * 7. GET ENERGY COST RECORDS
 * GET /api/owner/energy/stations/:stationId/cost-reports
 */
export const getEnergyCostReports = async (req, res) => {
  try {
    const { stationId } = req.params;
    const access = await checkStationOwnership(stationId, req.user);
    if (!access) return res.status(404).json({ success: false, message: "Station not found." });
    if (access.unauthorized) return res.status(403).json({ success: false, message: "Unauthorized." });

    const { page, limit, offset } = parsePagination(req, 10, 50);

    const [countRow] = await query(
      `SELECT COUNT(*) as total FROM energy_cost_records WHERE station_id = ?`,
      [access.station.id]
    );
    const totalItems = countRow?.total || 0;

    const rows = await query(
      `SELECT * FROM energy_cost_records WHERE station_id = ? ORDER BY record_date DESC LIMIT ? OFFSET ?`,
      [access.station.id, limit, offset]
    );

    const pagination = buildPaginationMeta(totalItems, page, limit);

    res.json({
      success: true,
      data: rows,
      pagination,
    });
  } catch (error) {
    console.error("getEnergyCostReports error:", error);
    res.status(500).json({ success: false, message: "Error fetching cost reports.", error: error.message });
  }
};

export default {
  getStationEnergyConfig,
  updateStationEnergyConfig,
  getStationEnergyDashboard,
  smartAllocatePower,
  recordEnergyTelemetry,
  getStationEnergyHistory,
  getEnergyCostReports,
};
