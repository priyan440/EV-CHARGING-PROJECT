import { query } from "../config/db.js";

async function updateSchema() {
  try {
    console.log("Modifying bookings.payment_status...");
    await query("ALTER TABLE bookings MODIFY COLUMN payment_status ENUM('PENDING', 'SUCCESS', 'PAID', 'FAILED', 'REFUNDED') DEFAULT 'PENDING'");
    
    console.log("Modifying payments.payment_status...");
    await query("ALTER TABLE payments MODIFY COLUMN payment_status ENUM('PENDING', 'SUCCESS', 'PAID', 'FAILED', 'REFUNDED') DEFAULT 'PENDING'");

    console.log("Modifying bookings.booking_status...");
    await query("ALTER TABLE bookings MODIFY COLUMN booking_status ENUM('PENDING', 'CONFIRMED', 'PROTECTED', 'CHECKED_IN', 'ACTIVE', 'CHARGING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'EXPIRED') DEFAULT 'CONFIRMED'");

    console.log("Schema updated successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Schema update error:", err);
    process.exit(1);
  }
}

updateSchema();
