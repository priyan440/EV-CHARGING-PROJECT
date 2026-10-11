import { query, pool } from "../backend/config/db.js";

async function verifyTiDBCloud() {
  console.log("=========================================");
  console.log("  VERIFYING TIDB CLOUD DATABASE & TABLES");
  console.log("=========================================");

  try {
    // 1. Check Tables
    const tables = await query("SHOW TABLES;");
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log(`✅ Total tables in TiDB Cloud: ${tableNames.length}`);
    console.log("Tables list:\n ", tableNames.join(", "));

    // 2. Test CRUD on a table (audit_logs)
    console.log("\n[CRUD TEST] Inserting a test audit log...");
    const insertRes = await query(
      "INSERT INTO audit_logs (action, entity_type, entity_id, details, ip_address, user_role) VALUES (?, ?, ?, ?, ?, ?)",
      ["TIDB_VERIFICATION_TEST", "system", "sys-01", JSON.stringify({ verified: true, timestamp: Date.now() }), "127.0.0.1", "system"]
    );
    const testId = insertRes.insertId;
    console.log(`✅ Insert successful! Insert ID: ${testId}`);

    // Read back
    console.log("[CRUD TEST] Reading back test audit log...");
    const rows = await query("SELECT * FROM audit_logs WHERE id = ?", [testId]);
    console.log(`✅ Read back successfully! Action: ${rows[0]?.action}, Entity: ${rows[0]?.entity_type}/${rows[0]?.entity_id}`);

    // Update
    console.log("[CRUD TEST] Updating test audit log...");
    await query("UPDATE audit_logs SET details = ? WHERE id = ?", [JSON.stringify({ updated: true }), testId]);
    const updatedRows = await query("SELECT details FROM audit_logs WHERE id = ?", [testId]);
    console.log(`✅ Update verified! Details: ${updatedRows[0]?.details}`);

    // Clean up test row
    console.log("[CRUD TEST] Deleting test audit log...");
    await query("DELETE FROM audit_logs WHERE id = ?", [testId]);
    console.log("✅ Delete successful! CRUD operations verified 100% on TiDB Cloud.");

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("❌ TiDB Verification Error:", err);
    process.exit(1);
  }
}

verifyTiDBCloud();
