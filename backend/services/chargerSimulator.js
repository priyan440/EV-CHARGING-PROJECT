import { query } from "../config/db.js";
import {
  emitChargerStatusChanged,
  emitTelemetryUpdated,
  emitSessionStarted,
  emitSessionStopped,
} from "./socketService.js";

// In-memory active simulator tickers mapped by numeric charger ID / key
const activeSimulators = new Map();

/**
 * Start or resume a charger simulator loop in MySQL
 */
export const startSimulatedCharging = ({
  chargerId,
  stationId = 1,
  sessionId,
  numericSessionId,
  targetPowerKw = 50.0,
  batteryStart = 20,
  batteryTarget = 80,
  ratePerKwh = 18.0,
  connectionFee = 15.0,
}) => {
  const chargerKey = String(chargerId);

  // Clear any existing timer for this charger
  if (activeSimulators.has(chargerKey)) {
    clearInterval(activeSimulators.get(chargerKey));
    activeSimulators.delete(chargerKey);
  }

  let soc = Math.max(10, parseInt(batteryStart, 10) || 20);
  let energyDelivered = 0.0;
  let elapsedMinutes = 0;
  let elapsedSeconds = 0;

  console.log(`⚡ [Simulator] Starting charging session simulator for Charger #${chargerId} (Session: ${sessionId || numericSessionId})`);

  const interval = setInterval(async () => {
    elapsedSeconds += 3;
    elapsedMinutes = Math.max(1, Math.floor(elapsedSeconds / 60));

    // Realistic power fluctuations: ±2 kW around targetPowerKw
    const jitter = (Math.random() * 4 - 2);
    const currentPower = Math.max(15.0, Math.min(150.0, targetPowerKw + jitter));
    const voltage = 398.0 + (Math.random() * 6.0); // 398 - 404 V
    const current = Math.round((currentPower * 1000.0) / voltage); // Amps

    // In 3 seconds at currentPower kW: energy (kWh) = currentPower * (3 / 3600)
    const tickEnergy = (currentPower * 3.0) / 3600.0;
    energyDelivered += tickEnergy;

    // Increment SOC (~0.6% - 1.0% per tick)
    soc = Math.min(batteryTarget, Math.round((soc + 0.6) * 10) / 10);

    // Compute cost strictly from tariff snapshot
    const totalAmount = Math.round((connectionFee + (energyDelivered * ratePerKwh)) * 100) / 100;

    const cleanEnergy = Math.round(energyDelivered * 100) / 100;
    const cleanPower = Math.round(currentPower * 10) / 10;
    const cleanVoltage = Math.round(voltage * 10) / 10;

    const telemetry = {
      chargerId,
      stationId,
      sessionId: sessionId || numericSessionId,
      session_id: sessionId,
      powerKw: cleanPower,
      chargingPower: cleanPower,
      voltage: cleanVoltage,
      currentAmp: current,
      current,
      energyKwh: cleanEnergy,
      energyDelivered: cleanEnergy,
      batterySoc: Math.round(soc),
      currentBattery: Math.round(soc),
      batteryLevel: Math.round(soc),
      startingBattery: batteryStart,
      targetBattery: batteryTarget,
      durationMinutes: elapsedMinutes,
      elapsedMinutes,
      currentCost: totalAmount,
      totalAmount,
      status: "CHARGING",
      sessionStatus: "CHARGING",
      timestamp: new Date().toISOString(),
    };

    // Emit live telemetry to all dashboards & customer sockets
    try {
      emitTelemetryUpdated(telemetry);
    } catch (sockErr) {
      // ignore
    }

    // Persist every tick to MySQL charging_sessions table
    try {
      const isNum = /^\d+$/.test(String(sessionId || numericSessionId));
      await query(
        `UPDATE charging_sessions 
         SET energy_kwh = ?,
             battery_soc = ?,
             power_kw = ?,
             voltage = ?,
             current_amp = ?,
             total_amount = ?,
             duration_minutes = ?
         WHERE session_id = ? OR id = ?`,
        [
          cleanEnergy,
          Math.round(soc),
          cleanPower,
          cleanVoltage,
          current,
          totalAmount,
          elapsedMinutes,
          sessionId || "",
          isNum ? parseInt(sessionId || numericSessionId, 10) : (numericSessionId || 0),
        ]
      );
    } catch (err) {
      console.warn("Simulator MySQL sync notice:", err.message);
    }

    // Auto-stop when battery target is reached
    if (soc >= batteryTarget) {
      console.log(`🔋 [Simulator] Target SOC ${batteryTarget}% reached on Charger #${chargerId}`);
      stopSimulatedCharging(chargerId);
    }
  }, 3000);

  activeSimulators.set(chargerKey, interval);
  return interval;
};

/**
 * Stop a running charger simulator
 */
export const stopSimulatedCharging = (chargerId) => {
  const chargerKey = String(chargerId);
  if (activeSimulators.has(chargerKey)) {
    clearInterval(activeSimulators.get(chargerKey));
    activeSimulators.delete(chargerKey);
    console.log(`🔌 [Simulator] Stopped simulation on Charger #${chargerId}`);
  }
};

/**
 * Direct simulator control
 */
export const setSimulatorState = async (chargerId, state, options = {}) => {
  const { stationId = 1, voltage = 400.0, current = 0.0, power = 0.0 } = options;

  if (state === "CHARGING") {
    startSimulatedCharging({
      chargerId,
      stationId,
      targetPowerKw: power || 50.0,
      batteryStart: options.batteryStart || 20,
      batteryTarget: options.batteryTarget || 80,
      ratePerKwh: options.ratePerKwh || 18.0,
    });
  } else {
    stopSimulatedCharging(chargerId);
  }

  try {
    await query(`UPDATE chargers SET status = ? WHERE id = ? OR charger_id = ?`, [state, parseInt(chargerId, 10) || 0, chargerId]);
  } catch {}

  emitChargerStatusChanged({ chargerId, status: state });
  emitTelemetryUpdated({ chargerId, voltage, current, power, status: state, timestamp: new Date().toISOString() });

  return { success: true, chargerId, state };
};

export default {
  startSimulatedCharging,
  stopSimulatedCharging,
  setSimulatorState,
};
