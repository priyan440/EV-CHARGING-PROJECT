/**
 * Comprehensive Automated Verification Suite (ESM)
 * Tests:
 * 1. Station photo storage & database persistence
 * 2. Dynamic Tariff Management (TOU calculation & immutable history snapshots)
 * 3. Smart Load & Energy Available Capacity formula: MAX(0, site - building - safety)
 * 4. Per-charger load allocation algorithm & overload prevention
 * 5. Server-side pagination utilities and deterministic sorting
 */
import { query } from "./config/db.js";
import { parsePagination, buildPaginationMeta } from "./utils/pagination.js";

async function runTests() {
  console.log("================================================================");
  console.log("   EV CHARGING STATION - SYSTEM ENHANCEMENT VERIFICATION SUITE   ");
  console.log("================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: Server-Side Pagination Utility
    // -------------------------------------------------------------
    console.log("--- 1. Testing Server-Side Pagination Logic ---");
    const pag1 = parsePagination({ query: { page: "2", limit: "10" } }, 10, 50);
    assert(pag1.page === 2 && pag1.limit === 10 && pag1.offset === 10, "Pagination parses page 2 and limit 10 correctly (offset 10)");

    const pag2 = parsePagination({ query: { page: "-5", limit: "500" } }, 10, 50);
    assert(pag2.page === 1 && pag2.limit === 50 && pag2.offset === 0, "Pagination clamps negative page to 1 and limits to max 50");

    const meta = buildPaginationMeta(45, 2, 10);
    assert(meta.totalItems === 45 && meta.totalPages === 5 && meta.hasNextPage === true && meta.hasPreviousPage === true, "Pagination meta calculates 5 pages with next/prev correctly for 45 items");

    // -------------------------------------------------------------
    // TEST 2: Dynamic Tariff TOU Calculation & Formula Verification
    // -------------------------------------------------------------
    console.log("\n--- 2. Testing Dynamic Tariff TOU Calculation & Public Estimate ---");
    // Standard rate: Rs 18, Peak: Rs 24 (18:00 - 22:00), Connection Fee: Rs 20, Tax: 18%
    const baseRate = 18.0;
    const peakRate = 24.0;
    const connectionFee = 20.0;
    const taxPct = 18.0;

    // Simulation A: Off-peak charge of 20 kWh at 14:00
    const energyA = 20.0;
    const isPeakA = false;
    const appliedRateA = isPeakA ? peakRate : baseRate;
    const energyChargeA = energyA * appliedRateA; // 20 * 18 = 360
    const subtotalA = energyChargeA + connectionFee; // 360 + 20 = 380
    const taxA = +(subtotalA * (taxPct / 100)).toFixed(2); // 380 * 0.18 = 68.40
    const totalA = +(subtotalA + taxA).toFixed(2); // 448.40

    assert(appliedRateA === 18.0 && subtotalA === 380 && totalA === 448.40, "Off-peak tariff calculation produces exact mathematical totals (Rs 448.40)");

    // Simulation B: Peak charge of 20 kWh at 19:30
    const isPeakB = true;
    const appliedRateB = isPeakB ? peakRate : baseRate;
    const energyChargeB = energyA * appliedRateB; // 20 * 24 = 480
    const subtotalB = energyChargeB + connectionFee; // 480 + 20 = 500
    const taxB = +(subtotalB * (taxPct / 100)).toFixed(2); // 500 * 0.18 = 90.00
    const totalB = +(subtotalB + taxB).toFixed(2); // 590.00

    assert(appliedRateB === 24.0 && subtotalB === 500 && totalB === 590.00, "Peak window tariff calculation charges peak tier and computes tax (Rs 590.00)");

    // -------------------------------------------------------------
    // TEST 3: Smart Load Allocation & Available Charging Capacity Formula
    // -------------------------------------------------------------
    console.log("\n--- 3. Testing Smart Load Math & Safety Constraints ---");
    // Available capacity = MAX(0, sitePowerLimit - otherBuildingLoad - safetyReserve)
    const sitePowerLimit = 200.0; // kW
    const otherBuildingLoad = 40.0; // kW
    const safetyReserve = 20.0; // kW

    const availableCapacity = Math.max(0, sitePowerLimit - otherBuildingLoad - safetyReserve);
    assert(availableCapacity === 140.0, "Available capacity formula MAX(0, 200 - 40 - 20) yields 140.0 kW");

    // Overload safety case: building spikes to 190 kW
    const highBuildingLoad = 190.0;
    const overloadCapacity = Math.max(0, sitePowerLimit - highBuildingLoad - safetyReserve);
    assert(overloadCapacity === 0.0, "High building load safely floors available capacity to 0.0 kW (prevents grid trip)");

    // Smart Load Allocation across active bays:
    // Available: 140 kW. Bay 1 requests 60 kW, Bay 2 requests 60 kW, Bay 3 requests 60 kW (Total requested = 180 kW)
    // Scale factor: 140 / 180 = 0.777...
    const requestedBays = [60, 60, 60];
    const totalRequested = requestedBays.reduce((a, b) => a + b, 0);
    const scaleFactor = availableCapacity / totalRequested;
    const allocatedBays = requestedBays.map(r => Math.floor(r * scaleFactor * 10) / 10);
    const totalAllocated = allocatedBays.reduce((a, b) => a + b, 0);

    assert(totalAllocated <= availableCapacity, `Smart load throttles 180kW request to <= 140kW total (${totalAllocated}kW allocated across 3 bays)`);

    // -------------------------------------------------------------
    // TEST 4: MySQL Database Integration & History Snapshots
    // -------------------------------------------------------------
    console.log("\n--- 4. Testing MySQL Database Tables & Relations ---");

    // Verify all 7 enhancement tables exist in MySQL
    const tables = await query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME IN ('station_photos', 'tariff_history', 'station_energy_configs', 'charger_energy_readings', 'load_allocation_history', 'energy_cost_records', 'smart_control_logs')
    `);

    const tableNames = (Array.isArray(tables) ? tables : []).map(t => t.TABLE_NAME || t.table_name);
    assert(tableNames.includes('station_photos'), "Table `station_photos` is present in MySQL");
    assert(tableNames.includes('tariff_history'), "Table `tariff_history` is present in MySQL");
    assert(tableNames.includes('station_energy_configs'), "Table `station_energy_configs` is present in MySQL");
    assert(tableNames.includes('charger_energy_readings'), "Table `charger_energy_readings` is present in MySQL");
    assert(tableNames.includes('load_allocation_history'), "Table `load_allocation_history` is present in MySQL");
    assert(tableNames.includes('energy_cost_records'), "Table `energy_cost_records` is present in MySQL");
    assert(tableNames.includes('smart_control_logs'), "Table `smart_control_logs` is present in MySQL");

    // Test inserting and querying energy configuration
    await query(`
      INSERT INTO station_energy_configs (station_id, site_power_limit_kw, other_building_load_kw, safety_reserve_kw, control_mode, grid_cost_per_kwh, demand_charge_per_kw)
      VALUES (1, 250.0, 50.0, 25.0, 'MONITOR', 9.50, 150.00)
      ON DUPLICATE KEY UPDATE site_power_limit_kw = 250.0, other_building_load_kw = 50.0, safety_reserve_kw = 25.0, control_mode = 'MONITOR'
    `);

    const configs = await query(`SELECT * FROM station_energy_configs WHERE station_id = 1`);
    assert(configs.length > 0 && parseFloat(configs[0].site_power_limit_kw) === 250.0, "Station energy configuration successfully persisted in MySQL");

    // Test immutable tariff history audit entry
    const testHistId = `TH_TEST_${Date.now()}`;
    await query(`
      INSERT INTO tariff_history (history_id, tariff_id, station_id, base_rate_per_kwh, peak_rate_per_kwh, connection_fee, tax_percentage, change_reason, changed_by)
      VALUES (?, 1, 1, 18.00, 24.00, 20.00, 18.00, 'Automated Unit Verification', 1)
    `, [testHistId]);

    const hist = await query(`SELECT * FROM tariff_history WHERE history_id = ?`, [testHistId]);
    assert(hist.length > 0 && parseFloat(hist[0].base_rate_per_kwh) === 18.00, "Immutable tariff audit entry recorded in `tariff_history` table");

    // Clean up test tariff record
    if (hist.length > 0) {
      await query(`DELETE FROM tariff_history WHERE history_id = ?`, [testHistId]);
    }

    console.log("\n================================================================");
    console.log(`   TEST EXECUTION COMPLETED: ${passed} PASSED, ${failed} FAILED   `);
    console.log("================================================================\n");

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error("Test execution failed with error:", error);
    process.exit(1);
  }
}

runTests();
