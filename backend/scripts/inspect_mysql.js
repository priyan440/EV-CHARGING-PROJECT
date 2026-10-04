import { query } from "../config/db.js";

async function inspectMySQL() {
  console.log("==========================================");
  console.log("AUDITING MYSQL DATABASE TABLES & COUNTS");
  console.log("==========================================");

  try {
    const tables = await query("SHOW TABLES");
    for (const t of tables) {
      const tableName = Object.values(t)[0];
      const countRes = await query(`SELECT COUNT(*) as c FROM \`${tableName}\``);
      console.log(`- ${tableName.padEnd(25)} : ${countRes[0].c} records`);
    }

    console.log("\n--- SAMPLE BOOKING JOIN RECORD ---");
    const sampleBooking = await query(`
      SELECT b.id, b.booking_id, b.booking_date, b.start_time, b.end_time, b.estimated_amount, b.booking_status, b.payment_status,
             u.name as customer_name, u.email as customer_email,
             s.station_name, s.owner_id,
             v.registration_number, v.model,
             c.charger_name, c.charger_type
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN stations s ON b.station_id = s.id
      JOIN chargers c ON b.charger_id = c.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      ORDER BY b.id DESC LIMIT 1
    `);
    console.log(sampleBooking[0] || "No bookings found");

    console.log("\n--- SAMPLE PAYMENT RECORD ---");
    const samplePayment = await query("SELECT * FROM payments ORDER BY id DESC LIMIT 1");
    console.log(samplePayment[0] || "No payments found");

    process.exit(0);
  } catch (err) {
    console.error("Inspection error:", err);
    process.exit(1);
  }
}

inspectMySQL();
