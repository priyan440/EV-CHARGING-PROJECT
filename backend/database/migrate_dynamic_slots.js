import { query } from "../config/db.js";

async function applyDynamicSlotMigration() {
  try {
    console.log("Applying Dynamic EV Charging Slot Optimization Schema...");

    const ensureColumn = async (table, column, definition) => {
      const cols = await query(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
        [table, column]
      );
      if (cols.length === 0) {
        console.log(`Adding column ${table}.${column}...`);
        await query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      } else {
        console.log(`Column ${table}.${column} already exists.`);
      }
    };

    // 1. Bookings columns
    await ensureColumn("bookings", "estimated_charging_minutes", "INT DEFAULT 15");
    await ensureColumn("bookings", "recommended_duration_minutes", "INT DEFAULT 15");
    await ensureColumn("bookings", "buffer_minutes", "INT DEFAULT 5");
    await ensureColumn("bookings", "reserved_duration_minutes", "INT DEFAULT 20");
    await ensureColumn("bookings", "actual_charging_minutes", "INT NULL");
    await ensureColumn("bookings", "actual_start_time", "DATETIME NULL");
    await ensureColumn("bookings", "actual_end_time", "DATETIME NULL");

    // 2. Charging Sessions columns
    await ensureColumn("charging_sessions", "actual_charging_minutes", "INT NULL");
    await ensureColumn("charging_sessions", "estimated_charging_minutes", "INT NULL");

    // 3. Stations settings
    await ensureColumn("stations", "charging_efficiency_percent", "DECIMAL(5,2) DEFAULT 90.00");
    await ensureColumn("stations", "safety_buffer_minutes", "INT DEFAULT 5");

    console.log("Dynamic Charging Slot Schema migration applied successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
}

applyDynamicSlotMigration();
