import { query } from "../config/db.js";

async function run() {
  try {
    await query(`ALTER TABLE bookings MODIFY COLUMN booking_status ENUM('PENDING','PENDING_PAYMENT','PAYMENT_PENDING','CONFIRMED','PROTECTED','CHECKED_IN','ACTIVE','CHARGING','IN_PROGRESS','COMPLETED','CANCELLED','PAYMENT_FAILED','NO_SHOW','EXPIRED') DEFAULT 'PENDING_PAYMENT'`);
    console.log("Enum successfully modified to include PENDING_PAYMENT and PAYMENT_FAILED");
  } catch (err) {
    console.error("Migration error:", err.message);
  } finally {
    process.exit(0);
  }
}

run();
