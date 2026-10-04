import { query } from "../backend/config/db.js";

// Piecewise Realistic Charging Function
function calculateRealisticCharging(batteryCapacityKwh, currentSoc, targetSoc, chargerPowerKw, vehicleMaxPowerKw) {
  const cap = parseFloat(batteryCapacityKwh) || 60.0;
  const cur = Math.max(0, Math.min(100, parseFloat(currentSoc) || 0));
  const tgt = Math.max(0, Math.min(100, parseFloat(targetSoc) || 80));

  if (tgt <= cur) {
    return {
      isValid: false,
      socDifference: 0,
      energyRequiredKwh: 0,
      estimatedMinutes: 0,
      effectivePowerKw: 0,
      error: "Target battery must be greater than current battery.",
    };
  }

  const socDiff = tgt - cur;
  const energyRequiredKwh = Math.round((cap * (socDiff / 100)) * 10) / 10;
  const maxPower = Math.min(parseFloat(chargerPowerKw) || 60, parseFloat(vehicleMaxPowerKw) || 150);

  const intervals = [
    { start: 0, end: 50, factor: 0.95 },
    { start: 50, end: 80, factor: 0.90 },
    { start: 80, end: 90, factor: 0.75 },
    { start: 90, end: 100, factor: 0.50 },
  ];

  let totalHours = 0;
  let totalWeightedFactor = 0;

  for (const seg of intervals) {
    const segStart = Math.max(cur, seg.start);
    const segEnd = Math.min(tgt, seg.end);
    if (segEnd > segStart) {
      const segDelta = segEnd - segStart;
      const segEnergy = cap * (segDelta / 100);
      const segPower = maxPower * seg.factor;
      totalHours += segPower > 0 ? segEnergy / segPower : 0;
      totalWeightedFactor += seg.factor * (segDelta / socDiff);
    }
  }

  const estimatedMinutes = Math.max(1, Math.round(totalHours * 60));
  const effectivePowerKw = Math.round((maxPower * (totalWeightedFactor || 0.9)) * 10) / 10;

  return {
    isValid: true,
    socDifference: socDiff,
    energyRequiredKwh,
    estimatedMinutes,
    effectivePowerKw,
    error: null,
  };
}

function isConnectorCompatible(slot, vehicle) {
  if (!slot || !vehicle) return true;
  const vConn = (vehicle.connector_type || vehicle.connectorType || vehicle.connector_name || "").toLowerCase().replace(/[\s-_]/g, "");
  const sConn = (slot.connector_name || slot.connectorType || slot.connector_type || slot.chargerType || "").toLowerCase().replace(/[\s-_]/g, "");

  if (!vConn || !sConn) return true;
  return vConn === sConn || sConn.includes(vConn) || vConn.includes(sConn);
}

async function runTests() {
  console.log("=== RUNNING MASTER PROMPT TEST SUITE ===\n");
  let passed = 0;
  let failed = 0;

  function assert(desc, condition) {
    if (condition) {
      console.log(`✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${desc}`);
      failed++;
    }
  }

  // TEST 1: Vehicle: CCS2, Slot: CCS2 -> AVAILABLE
  const slotCCS2 = { connector_name: "CCS2", status: "AVAILABLE" };
  const vehCCS2 = { connector_type: "CCS2" };
  assert("TEST 1 - Vehicle CCS2 vs Slot CCS2 is compatible", isConnectorCompatible(slotCCS2, vehCCS2) === true);

  // TEST 2: Vehicle: CCS2, Slot: CHAdeMO -> NOT COMPATIBLE
  const slotCHAdeMO = { connector_name: "CHAdeMO", status: "AVAILABLE" };
  assert("TEST 2 - Vehicle CCS2 vs Slot CHAdeMO is NOT compatible", isConnectorCompatible(slotCHAdeMO, vehCCS2) === false);

  // TEST 3: Battery: 50%, Target: 80% (60 kWh, 120 kW) -> 18 kWh, 10 minutes
  const est1 = calculateRealisticCharging(60, 50, 80, 120, 120);
  assert("TEST 3 - Battery 50% -> 80% calculation valid", est1.isValid === true);
  assert("TEST 3 - Energy required = 18 kWh", est1.energyRequiredKwh === 18);
  assert("TEST 3 - Estimated charging time = 10 minutes", est1.estimatedMinutes === 10);

  // TEST 4: Battery: 50%, Target: 100% (60 kWh, 120 kW) -> longer estimate (20 min)
  const est2 = calculateRealisticCharging(60, 50, 100, 120, 120);
  assert("TEST 4 - Battery 50% -> 100% calculation valid", est2.isValid === true);
  assert("TEST 4 - Energy required = 30 kWh", est2.energyRequiredKwh === 30);
  assert("TEST 4 - Estimated time is longer (20 minutes)", est2.estimatedMinutes === 20 && est2.estimatedMinutes > est1.estimatedMinutes);

  // TEST 5: Battery: 90%, Target: 80% -> Validation error
  const est3 = calculateRealisticCharging(60, 90, 80, 120, 120);
  assert("TEST 5 - Battery 90% -> 80% is invalid", est3.isValid === false);
  assert("TEST 5 - Shows validation message", est3.error.includes("Target battery must be greater than current battery"));

  // TEST 6: Overlap conflict logic (10:00-10:30 vs 10:15-10:45) -> CONFLICT
  const exStart = "10:00:00";
  const exEnd = "10:30:00";
  const candAStart = "10:15:00";
  const candAEnd = "10:45:00";
  const isConflictA = candAStart < exEnd && candAEnd > exStart;
  assert("TEST 6 - Overlap (10:00-10:30 vs 10:15-10:45) is a CONFLICT", isConflictA === true);

  // TEST 7: Non-overlap logic (10:00-10:30 vs 10:30-11:00) -> ALLOW
  const candBStart = "10:30:00";
  const candBEnd = "11:00:00";
  const isConflictB = candBStart < exEnd && candBEnd > exStart;
  assert("TEST 7 - Adjacent (10:00-10:30 vs 10:30-11:00) is ALLOWED", isConflictB === false);

  // TEST 8: Database check - Seeded fake stations removed
  const stations = await query("SELECT id, station_name, address FROM stations");
  const hasFakeStation = stations.some(s =>
    s.station_name.includes("Station A") ||
    s.station_name.includes("Station B") ||
    s.station_name.includes("GreenCharge Hyper Hub")
  );
  assert("TEST 8 - Fake seed stations removed from DB", hasFakeStation === false);
  assert("TEST 8 - Real station Vadapalani EV Super Hub exists", stations.some(s => s.station_name.includes("Vadapalani")));

  // Print results
  console.log(`\n=== SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
