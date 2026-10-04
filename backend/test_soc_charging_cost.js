import { query } from "./config/db.js";
import { calculateChargingEstimate } from "./controllers/chargingSessionController.js";
import jwt from "jsonwebtoken";
import http from "http";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key_change_in_production_12345";

async function runAllTests() {
  console.log("==================================================================");
  console.log("🧪 STARTING COMPREHENSIVE SOC CHARGING COST & ENERGY TEST SUITE");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  // Set up temporary test vehicle in MySQL with 60 kWh
  await query("DELETE FROM vehicles WHERE registration_number = 'TNTESTSOC60'");
  const insertVeh = await query(
    `INSERT INTO vehicles (vehicle_id, user_id, registration_number, vehicle_type, connector_type_id, brand, model, battery_capacity, battery_capacity_kwh, max_charging_power_kw, connector_type)
     VALUES ('VEH_TEST_60KWH', 1, 'TNTESTSOC60', '4W', 1, 'TestBrand', 'Model 60kWh', 60.00, 60.00, 150.00, 'CCS2')`
  );
  const testVeh60Id = insertVeh.insertId;

  // Set up temporary test vehicle in MySQL for Tata Nexon EV (40.5 kWh)
  await query("DELETE FROM vehicles WHERE registration_number = 'TNTESTNEXON'");
  const insertNexon = await query(
    `INSERT INTO vehicles (vehicle_id, user_id, registration_number, vehicle_type, connector_type_id, brand, model, battery_capacity, battery_capacity_kwh, max_charging_power_kw, connector_type)
     VALUES ('VEH_TEST_NEXON', 1, 'TNTESTNEXON', '4W', 1, 'Tata Motors', 'Nexon EV Max', 40.50, 40.50, 50.00, 'CCS2')`
  );
  const testNexonId = insertNexon.insertId;

  // Set up temporary test vehicle in MySQL with 50 kWh
  await query("DELETE FROM vehicles WHERE registration_number = 'TNTESTSOC50'");
  const insertVeh50 = await query(
    `INSERT INTO vehicles (vehicle_id, user_id, registration_number, vehicle_type, connector_type_id, brand, model, battery_capacity, battery_capacity_kwh, max_charging_power_kw, connector_type)
     VALUES ('VEH_TEST_50KWH', 1, 'TNTESTSOC50', '4W', 1, 'TestBrand', 'Model 50kWh', 50.00, 50.00, 120.00, 'CCS2')`
  );
  const testVeh50Id = insertVeh50.insertId;

  // Ensure Station 1 has energy_tariff_per_kwh = 15.00
  await query("UPDATE stations SET energy_tariff_per_kwh = 15.00, charging_efficiency_percent = 90.00 WHERE id = 1");
  await query("UPDATE tariffs SET base_rate_per_kwh = 15.00 WHERE station_id = 1 AND status = 'ACTIVE'");

  // TEST 1: Battery 60 kWh, Current 60%, Target 80% -> Expected: 12 kWh required (NOT 36 kWh)
  console.log("--- TEST 1: Battery 60 kWh | Current 60% -> Target 80% ---");
  try {
    const res1 = await calculateChargingEstimate({
      vehicleId: testVeh60Id,
      stationId: 1,
      currentSoc: 60,
      targetSoc: 80,
    });
    console.log(`Result: Energy = ${res1.energyRequiredKwh} kWh, Grid Energy = ${res1.estimatedGridEnergyKwh} kWh, Cost = ₹${res1.estimatedEnergyCost}`);
    if (res1.energyRequiredKwh === 12.00 && res1.estimatedGridEnergyKwh === 13.33) {
      console.log("✅ TEST 1 PASSED: Exactly 12.00 kWh required and 13.33 kWh grid energy (NOT 36 kWh)!\n");
      passed++;
    } else {
      console.error(`❌ TEST 1 FAILED: Expected 12.00 kWh and 13.33 kWh, got ${res1.energyRequiredKwh} / ${res1.estimatedGridEnergyKwh}\n`);
      failed++;
    }
  } catch (err) {
    console.error("❌ TEST 1 ERROR:", err.message);
    failed++;
  }

  // TEST 2: Battery 60 kWh, Current 40%, Target 80% -> Expected: 24 kWh
  console.log("--- TEST 2: Battery 60 kWh | Current 40% -> Target 80% ---");
  try {
    const res2 = await calculateChargingEstimate({
      vehicleId: testVeh60Id,
      stationId: 1,
      currentSoc: 40,
      targetSoc: 80,
    });
    console.log(`Result: Energy = ${res2.energyRequiredKwh} kWh`);
    if (res2.energyRequiredKwh === 24.00) {
      console.log("✅ TEST 2 PASSED: Exactly 24.00 kWh required!\n");
      passed++;
    } else {
      console.error(`❌ TEST 2 FAILED: Expected 24.00 kWh, got ${res2.energyRequiredKwh}\n`);
      failed++;
    }
  } catch (err) {
    console.error("❌ TEST 2 ERROR:", err.message);
    failed++;
  }

  // TEST 3: Battery 60 kWh, Current 70%, Target 80% -> Expected: 6 kWh
  console.log("--- TEST 3: Battery 60 kWh | Current 70% -> Target 80% ---");
  try {
    const res3 = await calculateChargingEstimate({
      vehicleId: testVeh60Id,
      stationId: 1,
      currentSoc: 70,
      targetSoc: 80,
    });
    console.log(`Result: Energy = ${res3.energyRequiredKwh} kWh`);
    if (res3.energyRequiredKwh === 6.00) {
      console.log("✅ TEST 3 PASSED: Exactly 6.00 kWh required!\n");
      passed++;
    } else {
      console.error(`❌ TEST 3 FAILED: Expected 6.00 kWh, got ${res3.energyRequiredKwh}\n`);
      failed++;
    }
  } catch (err) {
    console.error("❌ TEST 3 ERROR:", err.message);
    failed++;
  }

  // TEST 4: Battery 60 kWh, Current 20%, Target 80% -> Expected: 36 kWh
  console.log("--- TEST 4: Battery 60 kWh | Current 20% -> Target 80% ---");
  try {
    const res4 = await calculateChargingEstimate({
      vehicleId: testVeh60Id,
      stationId: 1,
      currentSoc: 20,
      targetSoc: 80,
    });
    console.log(`Result: Energy = ${res4.energyRequiredKwh} kWh`);
    if (res4.energyRequiredKwh === 36.00) {
      console.log("✅ TEST 4 PASSED: Exactly 36.00 kWh required (when user truly starts at 20%)!\n");
      passed++;
    } else {
      console.error(`❌ TEST 4 FAILED: Expected 36.00 kWh, got ${res4.energyRequiredKwh}\n`);
      failed++;
    }
  } catch (err) {
    console.error("❌ TEST 4 ERROR:", err.message);
    failed++;
  }

  // TEST 5: Current 80%, Target 60% -> Expected: Validation error
  console.log("--- TEST 5: Current 80% -> Target 60% (Reverse SOC) ---");
  try {
    await calculateChargingEstimate({
      vehicleId: testVeh60Id,
      stationId: 1,
      currentSoc: 80,
      targetSoc: 60,
    });
    console.error("❌ TEST 5 FAILED: Expected validation error but request succeeded.\n");
    failed++;
  } catch (err) {
    console.log(`Result caught expected validation error: "${err.message}"`);
    if (err.message.includes("Target battery level must be greater")) {
      console.log("✅ TEST 5 PASSED: Validation error correctly triggered!\n");
      passed++;
    } else {
      console.error("❌ TEST 5 FAILED with unexpected error message.\n");
      failed++;
    }
  }

  // TEST 6: Current 80%, Target 80% -> Expected: "No additional charging is required."
  console.log("--- TEST 6: Current 80% -> Target 80% (Equal SOC) ---");
  try {
    await calculateChargingEstimate({
      vehicleId: testVeh60Id,
      stationId: 1,
      currentSoc: 80,
      targetSoc: 80,
    });
    console.error("❌ TEST 6 FAILED: Expected 'No additional charging is required.' error.\n");
    failed++;
  } catch (err) {
    console.log(`Result caught expected error: "${err.message}"`);
    if (err.message.includes("No additional charging is required")) {
      console.log("✅ TEST 6 PASSED: Correctly rejected with 'No additional charging is required.'!\n");
      passed++;
    } else {
      console.error("❌ TEST 6 FAILED with unexpected error.\n");
      failed++;
    }
  }

  // TEST 7: Current 100%, Target 100% -> Expected: "Vehicle battery is already fully charged."
  console.log("--- TEST 7: Current 100% (Full Battery) ---");
  try {
    await calculateChargingEstimate({
      vehicleId: testVeh60Id,
      stationId: 1,
      currentSoc: 100,
      targetSoc: 100,
    });
    console.error("❌ TEST 7 FAILED: Expected full battery error.\n");
    failed++;
  } catch (err) {
    console.log(`Result caught expected error: "${err.message}"`);
    if (err.message.includes("already fully charged")) {
      console.log("✅ TEST 7 PASSED: Correctly rejected with 'Vehicle battery is already fully charged.'!\n");
      passed++;
    } else {
      console.error("❌ TEST 7 FAILED with unexpected error.\n");
      failed++;
    }
  }

  // TEST 8: Current 60%, Target 90%, Battery 50 kWh -> Expected: 15 kWh
  console.log("--- TEST 8: Battery 50 kWh | Current 60% -> Target 90% ---");
  try {
    const res8 = await calculateChargingEstimate({
      vehicleId: testVeh50Id,
      stationId: 1,
      currentSoc: 60,
      targetSoc: 90,
    });
    console.log(`Result: Energy = ${res8.energyRequiredKwh} kWh`);
    if (res8.energyRequiredKwh === 15.00) {
      console.log("✅ TEST 8 PASSED: Exactly 15.00 kWh required!\n");
      passed++;
    } else {
      console.error(`❌ TEST 8 FAILED: Expected 15.00 kWh, got ${res8.energyRequiredKwh}\n`);
      failed++;
    }
  } catch (err) {
    console.error("❌ TEST 8 ERROR:", err.message);
    failed++;
  }

  // TEST 9: Tata Nexon EV (40.5 kWh), Current 60%, Target 80%, Tariff ₹15/kWh
  console.log("--- TEST 9: Tata Nexon EV (40.5 kWh) | Current 60% -> Target 80% @ ₹15/kWh ---");
  try {
    const res9 = await calculateChargingEstimate({
      vehicleId: testNexonId,
      stationId: 1,
      currentSoc: 60,
      targetSoc: 80,
    });
    console.log(`Result: Energy = ${res9.energyRequiredKwh} kWh, Grid = ${res9.estimatedGridEnergyKwh} kWh, Cost = ₹${res9.estimatedEnergyCost}`);
    if (res9.energyRequiredKwh === 8.10 && res9.estimatedGridEnergyKwh === 9.00 && res9.estimatedEnergyCost === 135.00) {
      console.log("✅ TEST 9 PASSED: Exactly 8.10 kWh energy, 9.00 kWh grid energy, ₹135.00 energy cost!\n");
      passed++;
    } else {
      console.error(`❌ TEST 9 FAILED: Expected 8.10 kWh, 9.00 kWh, ₹135.00, got ${res9.energyRequiredKwh} / ${res9.estimatedGridEnergyKwh} / ₹${res9.estimatedEnergyCost}\n`);
      failed++;
    }
  } catch (err) {
    console.error("❌ TEST 9 ERROR:", err.message);
    failed++;
  }

  // Cleanup test vehicles
  await query("DELETE FROM vehicles WHERE id IN (?, ?, ?)", [testVeh60Id, testNexonId, testVeh50Id]);

  console.log("==================================================================");
  console.log(`🏁 TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch((e) => {
  console.error("Fatal test suite error:", e);
  process.exit(1);
});
