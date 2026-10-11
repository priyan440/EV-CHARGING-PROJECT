import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { queryRaw, query } from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function applyEnhancements() {
  try {
    console.log("🚀 Applying Station Owner & Energy Enhancements Migration...");
    const migrationFile = path.join(__dirname, "migrations", "003_station_owner_energy_enhancements.sql");
    const sql = fs.readFileSync(migrationFile, "utf-8");
    await queryRaw(sql);
    console.log("✅ Core tables created (station_photos, tariff_history, station_energy_configs, charger_energy_readings, load_allocation_history, energy_cost_records, smart_control_logs).");

    // Add nullable columns to stations if not exists
    const [stationCols] = await queryRaw("SHOW COLUMNS FROM stations LIKE 'description'");
    if (!stationCols || stationCols.length === 0) {
      await queryRaw("ALTER TABLE stations ADD COLUMN description TEXT NULL AFTER amenities");
      console.log("➕ Added description column to stations");
    }

    const [tariffTax] = await queryRaw("SHOW COLUMNS FROM tariffs LIKE 'tax_percentage'");
    if (!tariffTax || tariffTax.length === 0) {
      await queryRaw("ALTER TABLE tariffs ADD COLUMN tax_percentage DECIMAL(5,2) DEFAULT 18.00 AFTER idle_fee_per_minute");
      await queryRaw("ALTER TABLE tariffs ADD COLUMN charger_type VARCHAR(50) DEFAULT 'ALL' AFTER station_id");
      await queryRaw("ALTER TABLE tariffs ADD COLUMN effective_to TIMESTAMP NULL AFTER effective_from");
      console.log("➕ Added tax_percentage, charger_type, effective_to to tariffs");
    }

    // Ensure default energy configs exist for any existing stations
    const stations = await query("SELECT id, max_power FROM stations");
    for (const st of stations) {
      const existing = await query("SELECT id FROM station_energy_configs WHERE station_id = ?", [st.id]);
      if (existing.length === 0) {
        const powerLimit = parseFloat(st.max_power) || 250.0;
        await query(
          `INSERT INTO station_energy_configs (station_id, site_power_limit_kw, other_building_load_kw, safety_reserve_kw, control_mode, grid_cost_per_kwh, demand_charge_per_kw)
           VALUES (?, ?, 30.00, 20.00, 'MONITOR', 8.50, 250.00)`,
          [st.id, powerLimit]
        );
      }
    }
    console.log(`✅ Verified energy configs for ${stations.length} stations.`);

    console.log("🎉 Database Migration completed successfully!");
    return true;
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    throw err;
  }
}

if (process.argv[1] && process.argv[1].includes("apply_enhancements.js")) {
  applyEnhancements()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
