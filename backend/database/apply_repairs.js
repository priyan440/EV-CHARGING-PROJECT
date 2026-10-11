import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { queryRaw, query } from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function applyRepairs() {
  try {
    console.log("🛠️  Applying Database Repairs for Admin & Control Center...");

    // 1. Run migration 004 & 005 SQL
    const migrationFile = path.join(__dirname, "migrations", "004_admin_control_center_repairs.sql");
    if (fs.existsSync(migrationFile)) {
      const sql = fs.readFileSync(migrationFile, "utf-8");
      await queryRaw(sql);
    }

    const migration005File = path.join(__dirname, "migrations", "005_station_expenses_and_profitability.sql");
    if (fs.existsSync(migration005File)) {
      const sql005 = fs.readFileSync(migration005File, "utf-8");
      await queryRaw(sql005);
    }

    // Helper to check column existence
    const hasColumn = async (table, column) => {
      try {
        const rows = await queryRaw(`SHOW COLUMNS FROM ${table} LIKE '${column}'`);
        return rows && rows.length > 0;
      } catch {
        return false;
      }
    };

    // 2. Add columns to chargers
    if (!(await hasColumn("chargers", "last_heartbeat"))) {
      await queryRaw("ALTER TABLE chargers ADD COLUMN last_heartbeat TIMESTAMP NULL AFTER status");
      console.log("➕ Added last_heartbeat to chargers");
    }
    if (!(await hasColumn("chargers", "heartbeat_timeout_seconds"))) {
      await queryRaw("ALTER TABLE chargers ADD COLUMN heartbeat_timeout_seconds INT DEFAULT 60 AFTER last_heartbeat");
      console.log("➕ Added heartbeat_timeout_seconds to chargers");
    }
    if (!(await hasColumn("chargers", "is_online"))) {
      await queryRaw("ALTER TABLE chargers ADD COLUMN is_online TINYINT(1) DEFAULT 1 AFTER heartbeat_timeout_seconds");
      console.log("➕ Added is_online to chargers");
    }
    if (!(await hasColumn("chargers", "is_simulated"))) {
      await queryRaw("ALTER TABLE chargers ADD COLUMN is_simulated TINYINT(1) DEFAULT 0 AFTER is_online");
      console.log("➕ Added is_simulated to chargers");
    }
    if (!(await hasColumn("chargers", "error_code"))) {
      await queryRaw("ALTER TABLE chargers ADD COLUMN error_code VARCHAR(100) NULL AFTER is_simulated");
      console.log("➕ Added error_code to chargers");
    }
    if (!(await hasColumn("chargers", "error_message"))) {
      await queryRaw("ALTER TABLE chargers ADD COLUMN error_message TEXT NULL AFTER error_code");
      console.log("➕ Added error_message to chargers");
    }

    // Modify chargers status enum to include UNAVAILABLE
    try {
      await queryRaw(
        "ALTER TABLE chargers MODIFY COLUMN status ENUM('AVAILABLE', 'RESERVED', 'CHARGING', 'OCCUPIED', 'FAULTED', 'MAINTENANCE', 'OFFLINE', 'UNAVAILABLE') DEFAULT 'AVAILABLE'"
      );
    } catch (err) {
      console.warn("Chargers status modify warning:", err.message);
    }

    // Modify charger_connectors status enum to include UNAVAILABLE
    try {
      await queryRaw(
        "ALTER TABLE charger_connectors MODIFY COLUMN status ENUM('AVAILABLE', 'RESERVED', 'CHARGING', 'OCCUPIED', 'FAULTED', 'MAINTENANCE', 'OFFLINE', 'UNAVAILABLE') DEFAULT 'AVAILABLE'"
      );
    } catch (err) {
      console.warn("Connectors status modify warning:", err.message);
    }

    // 3. Add columns to stations
    if (!(await hasColumn("stations", "approval_notes"))) {
      await queryRaw("ALTER TABLE stations ADD COLUMN approval_notes TEXT NULL AFTER approval_status");
      console.log("➕ Added approval_notes to stations");
    }
    if (!(await hasColumn("stations", "reviewed_by"))) {
      await queryRaw("ALTER TABLE stations ADD COLUMN reviewed_by INT NULL AFTER approval_notes");
      console.log("➕ Added reviewed_by to stations");
    }
    if (!(await hasColumn("stations", "reviewed_at"))) {
      await queryRaw("ALTER TABLE stations ADD COLUMN reviewed_at TIMESTAMP NULL AFTER reviewed_by");
      console.log("➕ Added reviewed_at to stations");
    }

    // 4. Add columns to station_owners
    if (!(await hasColumn("station_owners", "rejection_reason"))) {
      await queryRaw("ALTER TABLE station_owners ADD COLUMN rejection_reason TEXT NULL AFTER verification_status");
      console.log("➕ Added rejection_reason to station_owners");
    }
    if (!(await hasColumn("station_owners", "suspension_reason"))) {
      await queryRaw("ALTER TABLE station_owners ADD COLUMN suspension_reason TEXT NULL AFTER rejection_reason");
      console.log("➕ Added suspension_reason to station_owners");
    }
    if (!(await hasColumn("station_owners", "reviewed_by"))) {
      await queryRaw("ALTER TABLE station_owners ADD COLUMN reviewed_by INT NULL AFTER suspension_reason");
      console.log("➕ Added reviewed_by to station_owners");
    }
    if (!(await hasColumn("station_owners", "reviewed_at"))) {
      await queryRaw("ALTER TABLE station_owners ADD COLUMN reviewed_at TIMESTAMP NULL AFTER reviewed_by");
      console.log("➕ Added reviewed_at to station_owners");
    }

    // 5. Add columns to maintenance_tickets
    if (!(await hasColumn("maintenance_tickets", "severity"))) {
      await queryRaw("ALTER TABLE maintenance_tickets ADD COLUMN severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM' AFTER priority");
      console.log("➕ Added severity to maintenance_tickets");
    }
    if (!(await hasColumn("maintenance_tickets", "source"))) {
      await queryRaw("ALTER TABLE maintenance_tickets ADD COLUMN source ENUM('SYSTEM_AUTO', 'OCPP_FAULT', 'MANUAL', 'USER_REPORT') DEFAULT 'MANUAL' AFTER severity");
      console.log("➕ Added source to maintenance_tickets");
    }
    if (!(await hasColumn("maintenance_tickets", "fault_code"))) {
      await queryRaw("ALTER TABLE maintenance_tickets ADD COLUMN fault_code VARCHAR(100) NULL AFTER source");
      console.log("➕ Added fault_code to maintenance_tickets");
    }
    if (!(await hasColumn("maintenance_tickets", "assigned_by"))) {
      await queryRaw("ALTER TABLE maintenance_tickets ADD COLUMN assigned_by INT NULL AFTER technician_id");
      console.log("➕ Added assigned_by to maintenance_tickets");
    }

    // 6. Add columns to payments
    if (!(await hasColumn("payments", "refund_amount"))) {
      await queryRaw("ALTER TABLE payments ADD COLUMN refund_amount DECIMAL(10,2) DEFAULT 0.00 AFTER payment_status");
      console.log("➕ Added refund_amount to payments");
    }
    if (!(await hasColumn("payments", "refund_reason"))) {
      await queryRaw("ALTER TABLE payments ADD COLUMN refund_reason VARCHAR(255) NULL AFTER refund_amount");
      console.log("➕ Added refund_reason to payments");
    }
    if (!(await hasColumn("payments", "refunded_at"))) {
      await queryRaw("ALTER TABLE payments ADD COLUMN refunded_at TIMESTAMP NULL AFTER refund_reason");
      console.log("➕ Added refunded_at to payments");
    }
    if (!(await hasColumn("payments", "refunded_by"))) {
      await queryRaw("ALTER TABLE payments ADD COLUMN refunded_by INT NULL AFTER refunded_at");
      console.log("➕ Added refunded_by to payments");
    }
    if (!(await hasColumn("payments", "session_id"))) {
      await queryRaw("ALTER TABLE payments ADD COLUMN session_id INT NULL AFTER booking_id");
      console.log("➕ Added session_id to payments");
    }
    if (!(await hasColumn("payments", "reconciliation_status"))) {
      await queryRaw("ALTER TABLE payments ADD COLUMN reconciliation_status ENUM('MATCHED', 'UNMATCHED', 'DISCREPANCY', 'RECONCILED', 'SUCCESS', 'PENDING', 'REFUNDED', 'FAILED', 'DISPUTED') DEFAULT 'MATCHED' AFTER payment_status");
      console.log("➕ Added reconciliation_status to payments");
    } else {
      try {
        await queryRaw("ALTER TABLE payments MODIFY COLUMN reconciliation_status ENUM('MATCHED', 'UNMATCHED', 'DISCREPANCY', 'RECONCILED', 'SUCCESS', 'PENDING', 'REFUNDED', 'FAILED', 'DISPUTED') DEFAULT 'MATCHED'");
      } catch (e) {}
    }

    // 7. Add columns to audit_logs
    if (!(await hasColumn("audit_logs", "details"))) {
      await queryRaw("ALTER TABLE audit_logs ADD COLUMN details TEXT NULL AFTER new_value");
      console.log("➕ Added details to audit_logs");
    }
    if (!(await hasColumn("audit_logs", "ip_address"))) {
      await queryRaw("ALTER TABLE audit_logs ADD COLUMN ip_address VARCHAR(45) NULL AFTER details");
      console.log("➕ Added ip_address to audit_logs");
    }
    if (!(await hasColumn("audit_logs", "user_role"))) {
      await queryRaw("ALTER TABLE audit_logs ADD COLUMN user_role VARCHAR(50) NULL AFTER user_id");
      console.log("➕ Added user_role to audit_logs");
    }

    // 8. Ensure station_owners records exist for all owners in users table
    const ownersWithoutProfile = await query(
      `SELECT u.id, u.user_id, u.name, u.email, u.phone, u.company_name, u.status 
       FROM users u 
       WHERE u.role IN ('STATION_OWNER', 'OWNER') 
       AND u.id NOT IN (SELECT user_id FROM station_owners)`
    );

    for (const o of ownersWithoutProfile) {
      const vStatus = o.status === "ACTIVE" ? "VERIFIED" : o.status === "SUSPENDED" ? "SUSPENDED" : "PENDING";
      await query(
        `INSERT INTO station_owners (user_id, owner_code, business_name, business_email, business_phone, verification_status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [o.id, o.user_id, o.company_name || o.name, o.email, o.phone, vStatus]
      );
    }

    // Set initial last_heartbeat for existing chargers if null
    await queryRaw("UPDATE chargers SET last_heartbeat = NOW() WHERE last_heartbeat IS NULL");

    console.log("✅ Database Repairs Migration applied successfully!");
    return true;
  } catch (err) {
    console.error("❌ applyRepairs error:", err.message);
    throw err;
  }
}

if (process.argv[1] && process.argv[1].includes("apply_repairs.js")) {
  applyRepairs()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
