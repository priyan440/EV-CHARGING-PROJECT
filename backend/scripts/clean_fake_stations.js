import { query, transaction } from "../config/db.js";

async function cleanup() {
  try {
    console.log("Checking stations before cleanup...");
    const stations = await query("SELECT id, station_name, address, owner_id FROM stations");
    console.log("Current stations:", stations);

    // Update Station 1 to have realistic name and address
    await query(
      "UPDATE stations SET station_name = 'Vadapalani EV Super Hub', address = '183, Arcot Road, Vadapalani, Chennai' WHERE id = 1"
    );
    console.log("Updated Station 1 to realistic name.");

    // Delete fake/test stations (IDs 2 to 9) and their dependent records safely
    const testStations = await query(
      "SELECT id FROM stations WHERE id > 1 AND (station_name LIKE '%Metro Hub%' OR station_name LIKE '%GreenCharge Marina Hub%')"
    );
    const testStationIds = testStations.map(s => s.id);
    console.log("Test station IDs to remove:", testStationIds);

    if (testStationIds.length > 0) {
      const placeholders = testStationIds.map(() => '?').join(',');
      
      // Delete charging sessions for test stations
      await query(`DELETE FROM charging_sessions WHERE station_id IN (${placeholders})`, testStationIds);
      // Delete bookings for test stations
      await query(`DELETE FROM bookings WHERE station_id IN (${placeholders})`, testStationIds);
      // Delete station connectors for test stations
      await query(`DELETE FROM station_connectors WHERE station_id IN (${placeholders})`, testStationIds);
      // Delete chargers for test stations
      await query(`DELETE FROM chargers WHERE station_id IN (${placeholders})`, testStationIds);
      // Delete tariffs for test stations
      await query(`DELETE FROM tariffs WHERE station_id IN (${placeholders})`, testStationIds);
      // Delete stations
      await query(`DELETE FROM stations WHERE id IN (${placeholders})`, testStationIds);
      console.log("Successfully removed test stations.");
    }

    // Remove automated test users
    const testUsers = await query("SELECT id FROM users WHERE email LIKE '%@evtest.com' OR email LIKE '%@test.com'");
    const testUserIds = testUsers.map(u => u.id);
    if (testUserIds.length > 0) {
      const uPlaceholders = testUserIds.map(() => '?').join(',');
      await query(`DELETE FROM audit_logs WHERE user_id IN (${uPlaceholders})`, testUserIds);
      await query(`DELETE FROM notifications WHERE user_id IN (${uPlaceholders})`, testUserIds);
      await query(`DELETE FROM vehicles WHERE user_id IN (${uPlaceholders})`, testUserIds);
      await query(`DELETE FROM bookings WHERE user_id IN (${uPlaceholders})`, testUserIds);
      await query(`DELETE FROM users WHERE id IN (${uPlaceholders})`, testUserIds);
      console.log("Successfully removed test users.");
    }

    // Check remaining stations
    const remaining = await query("SELECT id, station_name, address, owner_id, status FROM stations");
    console.log("Remaining legitimate stations:", remaining);

    // Ensure Station 1 has proper connectors (CCS2, Type 2, CHAdeMO)
    const connCount = await query("SELECT COUNT(*) as count FROM station_connectors WHERE station_id = 1");
    console.log("Station 1 connector count:", connCount[0].count);

    process.exit(0);
  } catch (err) {
    console.error("Cleanup error:", err);
    process.exit(1);
  }
}

cleanup();
