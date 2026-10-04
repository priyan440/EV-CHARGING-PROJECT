import { query } from "./config/db.js";
import { formatBooking } from "./controllers/bookingController.js";

async function testBookingRetrievalAndCreation() {
  console.log("Testing SQL Join Query for Bookings...");
  try {
    const BOOKINGS_JOIN_QUERY = `
      SELECT b.*,
             u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
             s.station_name, s.address as station_address, s.station_id as station_id_code, s.owner_id, s.energy_tariff_per_kwh, s.charging_efficiency_percent,
             v.registration_number, v.brand, v.model, v.vehicle_type, v.connector_type as vehicle_connector_type, v.battery_capacity, v.battery_capacity_kwh, v.max_charging_power_kw,
             sc.connector_number, sc.connector_id as connector_id_code, sc.power_kw as connector_power_kw, sc.status as connector_operational_status,
             ct.connector_name as connector_type_name,
             c.charger_name, c.charger_type, c.power_kw, c.charger_id as charger_id_code
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN stations s ON b.station_id = s.id
      LEFT JOIN station_connectors sc ON b.connector_id = sc.id
      LEFT JOIN connector_types ct ON sc.connector_type_id = ct.id
      LEFT JOIN chargers c ON b.charger_id = c.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
    `;

    const rows = await query(`${BOOKINGS_JOIN_QUERY} ORDER BY b.id DESC LIMIT 5`);
    console.log(`✅ Successfully queried bookings. Found ${rows.length} rows.`);
    if (rows.length > 0) {
      const formatted = formatBooking(rows[0]);
      console.log("Sample Formatted Booking:", {
        id: formatted.id,
        bookingId: formatted.bookingId,
        stationName: formatted.stationName,
        connectorNumber: formatted.connectorNumber,
        connectorType: formatted.connectorType,
        energyRequiredKwh: formatted.energyRequiredKwh,
        estimatedGridEnergyKwh: formatted.estimatedGridEnergyKwh,
        currentSoc: formatted.currentSoc,
        targetSoc: formatted.targetSoc,
        totalAmount: formatted.totalAmount,
        status: formatted.status,
      });
    }
    console.log("🎉 All booking queries and joins are working perfectly!");
    process.exit(0);
  } catch (err) {
    console.error("❌ SQL Query Test Failed:", err);
    process.exit(1);
  }
}

testBookingRetrievalAndCreation();
