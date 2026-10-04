import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config();

export async function resetDatabase() {
  console.log("=================================================");
  console.log("🔄 STARTING MYSQL DATABASE REINITIALIZATION");
  console.log(`📦 Target Database: ${process.env.DB_NAME || "ev_charging_system"}`);
  console.log("=================================================\n");

  const dbHost = process.env.DB_HOST || "localhost";
  const dbUser = process.env.DB_USER || "root";
  const dbPassword = process.env.DB_PASSWORD || "root123";
  const dbPort = parseInt(process.env.DB_PORT || "3306", 10);
  const dbName = process.env.DB_NAME || "ev_charging_system";

  // 1. Initial connection without selecting database to create/drop database cleanly
  const rootConn = await mysql.createConnection({
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    port: dbPort,
    multipleStatements: true,
  });

  try {
    console.log("1. Creating database if not exists...");
    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await rootConn.query(`USE \`${dbName}\`;`);

    console.log("2. Dropping existing application tables...");
    await rootConn.query("SET FOREIGN_KEY_CHECKS = 0;");
    const tablesToDrop = [
      "audit_logs",
      "notifications",
      "maintenance_tickets",
      "charging_sessions",
      "payments",
      "bookings",
      "tariffs",
      "charger_connectors",
      "chargers",
      "stations",
      "vehicles",
      "users",
      "charging_stations",
      "charging_slots",
      "pricing_rules",
      "customers",
      "owners",
      "technicians",
      "work_orders",
      "fault_reports",
      "invoices"
    ];
    for (const tbl of tablesToDrop) {
      await rootConn.query(`DROP TABLE IF EXISTS \`${tbl}\`;`);
    }
    await rootConn.query("SET FOREIGN_KEY_CHECKS = 1;");

    console.log("3. Applying normalized clean schema...");
    const schemaPath = path.join(__dirname, "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");
    await rootConn.query(schemaSql);
    console.log("✅ All relational tables, foreign keys, and indexes created successfully (Empty state).");

    console.log("\n=================================================");
    console.log("✨ DATABASE RESET COMPLETE - ZERO MOCK DATA INSERTED");
    console.log("   Single Source of Truth is clean and ready for real operations.");
    console.log("=================================================");
    return true;
  } catch (error) {
    console.error("❌ Database reset error:", error);
    throw error;
  } finally {
    await rootConn.end();
  }
}

if (process.argv[1] && process.argv[1].endsWith("db_reset.js")) {
  resetDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
