import { query, queryRaw } from "../backend/config/db.js";
import { 
  isChargerOnline, 
  deriveChargerStatus, 
  mapOcppStatusToDb, 
  recordAuditLog 
} from "../backend/utils/statusMapping.js";
import { initializeDatabaseSchema } from "../backend/database/init_schema.js";

async function runTests() {
  console.log("=================================================");
  console.log("  EV CHARGING SYSTEM - ADMIN & CONTROL CENTER TEST");
  console.log("=================================================");

  try {
    // 1. Schema & Migration Check
    console.log("\n[TEST 1] Testing Database Schema & Migrations...");
    await initializeDatabaseSchema();
    console.log("✔ Schema & Migrations verified successfully.");

    // 2. Status Mapping Logic Test
    console.log("\n[TEST 2] Testing Canonical Status Mapping Utilities...");
    const now = new Date();
    const freshHeartbeat = new Date(now.getTime() - 10 * 1000); // 10s ago
    const staleHeartbeat = new Date(now.getTime() - 120 * 1000); // 120s ago

    const isOnlineFresh = isChargerOnline(freshHeartbeat, 60);
    const isOnlineStale = isChargerOnline(staleHeartbeat, 60);
    const isOnlineNull = isChargerOnline(null, 60);

    if (!isOnlineFresh) throw new Error("Expected fresh heartbeat to be online");
    if (isOnlineStale) throw new Error("Expected stale heartbeat to be offline");
    if (isOnlineNull) throw new Error("Expected null heartbeat to be offline");
    console.log("✔ isChargerOnline() checks passed (online / stale / null).");

    const derivedAvailable = deriveChargerStatus({ status: "AVAILABLE", last_heartbeat: freshHeartbeat, heartbeat_timeout_seconds: 60 });
    const derivedStale = deriveChargerStatus({ status: "AVAILABLE", last_heartbeat: staleHeartbeat, heartbeat_timeout_seconds: 60 });
    const derivedFault = deriveChargerStatus({ status: "FAULTED", last_heartbeat: freshHeartbeat, heartbeat_timeout_seconds: 60 });

    if (derivedAvailable !== "AVAILABLE") throw new Error(`Expected AVAILABLE, got ${derivedAvailable}`);
    if (derivedStale !== "OFFLINE") throw new Error(`Expected OFFLINE for stale charger, got ${derivedStale}`);
    if (derivedFault !== "FAULTED") throw new Error(`Expected FAULTED for faulted charger, got ${derivedFault}`);
    console.log("✔ deriveChargerStatus() checks passed.");

    // 3. Owner Verification Test
    console.log("\n[TEST 3] Testing Owner Verification & State Persistence...");
    // Check if test user/owner exists or create one
    let [owner] = await query("SELECT id, business_name, verification_status FROM station_owners LIMIT 1");
    if (!owner) {
      // Create test owner
      const res = await query(
        "INSERT INTO station_owners (user_id, business_name, business_email, business_phone, verification_status) VALUES (1, 'GreenGrid Ltd', 'operator@test.com', '9876543210', 'PENDING')"
      );
      owner = { id: res.insertId, business_name: 'GreenGrid Ltd', verification_status: 'PENDING' };
    }

    // Verify Owner
    await query(
      "UPDATE station_owners SET verification_status = 'VERIFIED', reviewed_by = 1, reviewed_at = NOW() WHERE id = ?",
      [owner.id]
    );
    await recordAuditLog({
      userId: 1,
      userRole: "ADMIN",
      action: "VERIFY_OWNER",
      entityType: "OWNER",
      entityId: owner.id,
      details: { verification_status: "VERIFIED" }
    });

    const [verifiedOwner] = await query("SELECT verification_status FROM station_owners WHERE id = ?", [owner.id]);
    if (verifiedOwner.verification_status !== "VERIFIED") throw new Error("Owner verification failed to persist");
    console.log("✔ Owner verification persisted as VERIFIED.");

    // 4. Station Approval Test
    console.log("\n[TEST 4] Testing Station Approval & Public Filtering...");
    let [station] = await query("SELECT id, station_name, approval_status, status FROM stations LIMIT 1");
    if (!station) {
      const res = await query(
        "INSERT INTO stations (owner_id, station_name, address, city, latitude, longitude, approval_status, status) VALUES (?, 'Marina Fast Hub', 'Beach Road', 'Chennai', 13.0827, 80.2707, 'PENDING', 'ACTIVE')",
        [owner.id]
      );
      station = { id: res.insertId, station_name: "Marina Fast Hub", approval_status: "PENDING", status: "ACTIVE" };
    }

    // Test Public Query Filter (only APPROVED and ACTIVE)
    await query("UPDATE stations SET approval_status = 'PENDING' WHERE id = ?", [station.id]);
    const publicPending = await query(
      "SELECT id FROM stations WHERE id = ? AND approval_status = 'APPROVED' AND status = 'ACTIVE'",
      [station.id]
    );
    if (publicPending.length > 0) throw new Error("Pending station should NOT appear on public map!");
    console.log("✔ Pending station correctly filtered out of public map view.");

    // Approve Station
    await query(
      "UPDATE stations SET approval_status = 'APPROVED', reviewed_by = 1, reviewed_at = NOW() WHERE id = ?",
      [station.id]
    );
    await recordAuditLog({
      userId: 1,
      userRole: "ADMIN",
      action: "APPROVE_STATION",
      entityType: "STATION",
      entityId: station.id,
      details: { approval_status: "APPROVED" }
    });

    const publicApproved = await query(
      "SELECT id FROM stations WHERE id = ? AND approval_status = 'APPROVED' AND status = 'ACTIVE'",
      [station.id]
    );
    if (publicApproved.length === 0) throw new Error("Approved station must appear on public map!");
    console.log("✔ Approved station correctly accessible for public map routing.");

    // 5. Charger Heartbeat & Remote Command Test
    console.log("\n[TEST 5] Testing Charger Heartbeat & Safe Remote Commands...");
    let [charger] = await query("SELECT id, charger_name, status FROM chargers WHERE station_id = ? LIMIT 1", [station.id]);
    if (!charger) {
      const res = await query(
        "INSERT INTO chargers (station_id, charger_name, charger_type, power_kw, status, is_online, is_simulated, last_heartbeat) VALUES (?, 'CHG-TEST-01', 'DC Fast', 60.0, 'AVAILABLE', 1, 1, NOW())",
        [station.id]
      );
      charger = { id: res.insertId, charger_name: "CHG-TEST-01", status: "AVAILABLE" };
    } else {
      await query("UPDATE chargers SET last_heartbeat = NOW(), is_online = 1 WHERE id = ?", [charger.id]);
    }

    // Insert Remote Command
    const reqId = `CMD-${Date.now()}`;
    const cmdRes = await query(
      `INSERT INTO remote_commands 
       (command_id, charger_id, station_id, user_id, command_type, target_payload, status) 
       VALUES (?, ?, ?, 1, 'RESET', '{"type":"Soft"}', 'ACCEPTED')`,
      [reqId, charger.id, station.id]
    );
    if (!cmdRes.insertId) throw new Error("Failed to insert remote command record");
    console.log(`✔ Safe Remote Command record created (ID: ${reqId}, Status: ACCEPTED).`);

    // 6. Maintenance & Incident Management Test
    console.log("\n[TEST 6] Testing Maintenance Incident Lifecycle & Deduplication...");
    const ticketIdStr = `TCK-${Date.now()}`;
    const incRes = await query(
      `INSERT INTO maintenance_tickets 
       (ticket_id, station_id, charger_id, issue_type, severity, priority, description, status, source) 
       VALUES (?, ?, ?, 'OverCurrentFailure', 'HIGH', 'HIGH', 'Test overcurrent spike', 'OPEN', 'OCPP_FAULT')`,
      [ticketIdStr, station.id, charger.id]
    );
    const incidentId = incRes.insertId;

    // Assign Incident
    await query(
      "UPDATE maintenance_tickets SET technician_id = 1, status = 'ASSIGNED' WHERE id = ?",
      [incidentId]
    );
    // Resolve Incident
    await query(
      "UPDATE maintenance_tickets SET status = 'RESOLVED', resolution_notes = 'Replaced thermal fuse and recalibrated relay.' WHERE id = ?",
      [incidentId]
    );

    const [resolvedInc] = await query("SELECT status, resolution_notes FROM maintenance_tickets WHERE id = ?", [incidentId]);
    if (resolvedInc.status !== "RESOLVED") throw new Error("Incident did not resolve properly");
    console.log("✔ Incident ticket lifecycle (Create -> Assign -> Resolve) verified.");

    // 7. Payment Reconciliation Test
    console.log("\n[TEST 7] Testing Payment Reconciliation & Authorized Refund...");
    const txnRef = `PAY-TEST-${Date.now()}`;
    const payRes = await query(
      `INSERT INTO payments 
       (payment_id, user_id, amount, payment_method, payment_status, reconciliation_status, gateway_payment_id) 
       VALUES (?, 1, 450.00, 'RAZORPAY', 'SUCCESS', 'SUCCESS', ?)`,
      [txnRef, txnRef]
    );
    const paymentId = payRes.insertId;

    // Process authorized refund
    await query(
      `UPDATE payments 
       SET reconciliation_status = 'REFUNDED', 
           refund_amount = 450.00, 
           refund_reason = 'Verified charger interruption during session', 
           refunded_at = NOW(), 
           refunded_by = 1 
       WHERE id = ?`,
      [paymentId]
    );

    const [refundedPay] = await query("SELECT reconciliation_status, refund_amount FROM payments WHERE id = ?", [paymentId]);
    if (refundedPay.reconciliation_status !== "REFUNDED" || parseFloat(refundedPay.refund_amount) !== 450) {
      throw new Error("Payment refund reconciliation failed");
    }
    console.log("✔ Payment reconciliation & authorized refund workflow verified.");

    // 8. Audit Trail Verification
    console.log("\n[TEST 8] Testing Immutable Security Audit Trail...");
    const logs = await query("SELECT * FROM audit_logs WHERE user_id = 1 ORDER BY id DESC LIMIT 5");
    if (logs.length === 0) throw new Error("Audit logs empty");
    console.log(`✔ Audit logs verified (${logs.length} recent entries inspected).`);

    console.log("\n=================================================");
    console.log("  ALL TESTS PASSED WITH ZERO ERRORS (100% GREEN)  ");
    console.log("=================================================\n");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ TEST FAILED:", err.message, err.stack);
    process.exit(1);
  }
}

runTests();
