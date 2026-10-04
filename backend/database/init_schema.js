import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { queryRaw } from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initializes and verifies clean normalized relational MySQL schema with ZERO seed data.
 */
export const initializeDatabaseSchema = async () => {
  try {
    console.log("🔄 Initializing clean MySQL schema (Zero Seed Data)...");

    const schemaPath = path.join(__dirname, "schema.sql");
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, "utf8");
      await queryRaw(schemaSql);
      console.log("✅ Relational MySQL Schema verified successfully");
    }

    console.log("✨ Single Source of Truth MySQL Database is ready (Empty State - Zero Seed Data)");
    return true;
  } catch (error) {
    console.error("❌ Database schema initialization error:", error.message);
    return false;
  }
};

export default initializeDatabaseSchema;

if (process.argv[1] && process.argv[1].includes("init_schema.js")) {
  initializeDatabaseSchema().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
