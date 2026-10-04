import { query } from "../config/db.js";

async function main() {
  const rows = await query("SELECT booking_id, user_id, station_id, vehicle_id, booking_date, start_time, duration_minutes, estimated_amount, booking_status, payment_status, payment_id FROM bookings ORDER BY id DESC LIMIT 2");
  console.log("LATEST BOOKINGS:", JSON.stringify(rows, null, 2));
  process.exit(0);
}

main();
