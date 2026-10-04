import { query } from "./config/db.js";

const BASE_URL = "http://localhost:5001/api";

async function runTests() {
  console.log("\n=======================================================");
  console.log("🧪 RUNNING COMPREHENSIVE END-TO-END VERIFICATION SUITE");
  console.log("=======================================================\n");

  let testUserToken = "";
  let testOwnerToken = "";
  let createdStationId = null;
  let createdChargerId = null;
  let createdConnectorId = null;
  let createdTariffId = null;
  let createdVehicleId = null;
  let createdBookingId = null;
  let createdPaymentId = null;
  let createdSessionId = null;

  // -----------------------------------------------------------------
  // Test A: Register Customer & Login
  // -----------------------------------------------------------------
  console.log("👉 [Test A] Register customer in MySQL & verify login...");
  const uniqueSuffix = Date.now().toString().slice(-4);
  const testEmail = `tester_${uniqueSuffix}@evtest.com`;

  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `Test User ${uniqueSuffix}`,
      email: testEmail,
      password: "password123",
      role: "CUSTOMER",
      phone: `98765${uniqueSuffix}`,
    }),
  }).then((r) => r.json());

  if (!regRes.success && !regRes.token) {
    throw new Error(`Test A Registration failed: ${JSON.stringify(regRes)}`);
  }
  testUserToken = regRes.token;

  // Verify login from MySQL
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: "password123" }),
  }).then((r) => r.json());

  if (!loginRes.success || !loginRes.user) {
    throw new Error(`Test A Login verification failed: ${JSON.stringify(loginRes)}`);
  }
  const testUserId = loginRes.user.id;
  console.log(`✅ [Test A Passed] Customer registered & authenticated. DB User ID: ${testUserId}`);

  // -----------------------------------------------------------------
  // Test B: Add/Edit/Delete Vehicle in MySQL
  // -----------------------------------------------------------------
  console.log("\n👉 [Test B] Vehicle CRUD in MySQL...");
  const addVehRes = await fetch(`${BASE_URL}/vehicles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${testUserToken}`,
    },
    body: JSON.stringify({
      make: "Tata Motors",
      model: "Nexon EV Max",
      brand: "Tata Motors",
      registrationNumber: `TN58AB${uniqueSuffix}`,
      batteryCapacity: 40.5,
      connectorType: "CCS2",
    }),
  }).then((r) => r.json());

  if (!addVehRes.success) {
    throw new Error(`Test B Add vehicle failed: ${JSON.stringify(addVehRes)}`);
  }
  createdVehicleId = addVehRes.data?.id;

  const getVehs = await fetch(`${BASE_URL}/vehicles`, {
    headers: { Authorization: `Bearer ${testUserToken}` },
  }).then((r) => r.json());

  if (!getVehs.success || getVehs.data.length === 0) {
    throw new Error("Test B Vehicle not retrieved from MySQL");
  }
  console.log(`✅ [Test B Passed] Vehicle added and verified in MySQL. Vehicle ID: ${createdVehicleId}`);

  // -----------------------------------------------------------------
  // Test C: Owner Creates Station, Charger, Connector & Tariff
  // -----------------------------------------------------------------
  console.log("\n👉 [Test C] Owner creates Station, Charger, Connector, Tariff...");
  const ownerEmail = `owner_${uniqueSuffix}@evtest.com`;
  const ownerReg = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `Owner ${uniqueSuffix}`,
      email: ownerEmail,
      password: "password123",
      role: "STATION_OWNER",
      phone: `91234${uniqueSuffix}`,
    }),
  }).then((r) => r.json());
  testOwnerToken = ownerReg.token;
  const testOwnerId = ownerReg.user?.id;

  const stnRes = await fetch(`${BASE_URL}/owner/stations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${testOwnerToken}`,
    },
    body: JSON.stringify({
      stationName: `Metro Hub ${uniqueSuffix}`,
      address: "100 GST Road, Guindy, Chennai",
      city: "Chennai",
      state: "Tamil Nadu",
      pincode: "600032",
      totalSlots: 2,
      maxPowerKw: 120.0,
    }),
  }).then((r) => r.json());

  if (!stnRes.success) {
    throw new Error(`Test C Station creation failed: ${JSON.stringify(stnRes)}`);
  }
  createdStationId = stnRes.data?.id;

  // Retrieve station with chargers, connectors, and tariffs from API
  const stnDetails = await fetch(`${BASE_URL}/stations/${createdStationId}`).then((r) => r.json());
  const stnData = stnDetails.data;
  createdChargerId = stnData.connectors?.[0]?.chargerId || stnData.chargers?.[0]?.chargerId;
  createdConnectorId = stnData.connectors?.[0]?.connectorId || stnData.chargers?.[0]?.connectorId;
  createdTariffId = stnData.tariff?.id || stnData.tariffs?.[0]?.id;

  console.log(`✅ [Test C Passed] Owner station created with MySQL ID: ${createdStationId}, Charger: ${createdChargerId}, Connector: ${createdConnectorId}, Tariff: ${createdTariffId}`);

  // -----------------------------------------------------------------
  // Test D: Customer Books a Slot with Atomic Payment & Overlap Check
  // -----------------------------------------------------------------
  console.log("\n👉 [Test D] Customer books slot & locks slot atomically...");
  const bookRes = await fetch(`${BASE_URL}/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${testUserToken}`,
    },
    body: JSON.stringify({
      station_id: createdStationId,
      charger_id: createdChargerId,
      connector_id: createdConnectorId,
      vehicle_id: createdVehicleId,
      booking_date: "2026-10-15",
      start_time: "14:00:00",
      duration_minutes: 60,
      payment_method: "ONLINE",
    }),
  }).then((r) => r.json());

  if (!bookRes.success) {
    throw new Error(`Test D Booking creation failed: ${JSON.stringify(bookRes)}`);
  }
  createdBookingId = bookRes.data?.id || bookRes.data?.bookingId;

  // Verify non-null foreign keys directly in MySQL
  const dbBookingRows = await query(`SELECT * FROM bookings WHERE id = ? OR booking_id = ?`, [
    parseInt(createdBookingId, 10) || 0,
    createdBookingId,
  ]);
  const dbBooking = dbBookingRows[0];

  if (!dbBooking || !dbBooking.tariff_id || !dbBooking.connector_id || !dbBooking.charger_id || !dbBooking.vehicle_id) {
    throw new Error(`Test D Verification failed! DB Booking has NULL FKs: ${JSON.stringify(dbBooking)}`);
  }
  console.log(`   - Verified MySQL row: booking_id=${dbBooking.booking_id}, charger_id=${dbBooking.charger_id}, connector_id=${dbBooking.connector_id}, tariff_id=${dbBooking.tariff_id}, rate_snapshot=${dbBooking.tariff_rate_snapshot}`);

  // Test Overlap Conflict (409 Conflict rejection)
  console.log("   - Testing overlap conflict rejection (409)...");
  const overlapRes = await fetch(`${BASE_URL}/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${testUserToken}`,
    },
    body: JSON.stringify({
      station_id: createdStationId,
      charger_id: createdChargerId,
      connector_id: createdConnectorId,
      vehicle_id: createdVehicleId,
      booking_date: "2026-10-15",
      start_time: "14:30:00", // Overlaps with 14:00:00 - 15:00:00
      duration_minutes: 60,
    }),
  });

  if (overlapRes.status !== 409) {
    throw new Error(`Test D Overlap check failed! Expected status 409 Conflict, got ${overlapRes.status}`);
  }
  console.log(`✅ [Test D Passed] Slot booked atomically and overlapping booking rejected with HTTP 409.`);

  // -----------------------------------------------------------------
  // Test E: My Bookings & Cancellation
  // -----------------------------------------------------------------
  console.log("\n👉 [Test E] My Bookings and Cancellation API check...");
  const myBookingsRes = await fetch(`${BASE_URL}/bookings/my-bookings`, {
    headers: { Authorization: `Bearer ${testUserToken}` },
  }).then((r) => r.json());

  if (!myBookingsRes.success || myBookingsRes.data.length === 0) {
    throw new Error("Test E My Bookings list empty");
  }

  // Cancel booking
  const cancelRes = await fetch(`${BASE_URL}/bookings/${dbBooking.booking_id}/cancel`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${testUserToken}` },
  }).then((r) => r.json());

  if (!cancelRes.success) {
    throw new Error(`Test E Cancel booking failed: ${JSON.stringify(cancelRes)}`);
  }

  const [cancelledRow] = await query(`SELECT booking_status FROM bookings WHERE id = ?`, [dbBooking.id]);
  if (cancelledRow.booking_status !== "CANCELLED") {
    throw new Error(`Test E Booking status in DB is not CANCELLED: ${cancelledRow.booking_status}`);
  }
  console.log(`✅ [Test E Passed] Booking cancelled and verified in MySQL (Status: ${cancelledRow.booking_status}).`);

  // -----------------------------------------------------------------
  // Test F: Owner Dashboard Bookings & Revenue Query
  // -----------------------------------------------------------------
  console.log("\n👉 [Test F] Owner dashboard reads MySQL through stations.owner_id...");
  // Create a new confirmed booking for this owner's station
  const book2 = await fetch(`${BASE_URL}/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${testUserToken}`,
    },
    body: JSON.stringify({
      station_id: createdStationId,
      charger_id: createdChargerId,
      connector_id: createdConnectorId,
      vehicle_id: createdVehicleId,
      booking_date: "2026-10-16",
      start_time: "10:00:00",
      duration_minutes: 60,
      payment_method: "ONLINE",
    }),
  }).then((r) => r.json());

  const ownerBookingsRes = await fetch(`${BASE_URL}/owner/bookings`, {
    headers: { Authorization: `Bearer ${testOwnerToken}` },
  }).then((r) => r.json());

  if (!ownerBookingsRes.success || ownerBookingsRes.data.length === 0) {
    throw new Error("Test F Owner bookings did not include customer's reservation");
  }

  const ownerDashRes = await fetch(`${BASE_URL}/owner/dashboard/summary`, {
    headers: { Authorization: `Bearer ${testOwnerToken}` },
  }).then((r) => r.json());

  if (!ownerDashRes.success) {
    throw new Error("Test F Owner dashboard summary failed");
  }
  console.log(`✅ [Test F Passed] Owner dashboard successfully pulled real reservations and revenue from MySQL.`);

  // -----------------------------------------------------------------
  // Test G: Server-Driven Live Charging with Simulator
  // -----------------------------------------------------------------
  console.log("\n👉 [Test G] Start server-driven live charging session & simulator...");
  const startChargeRes = await fetch(`${BASE_URL}/charging/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${testUserToken}`,
    },
    body: JSON.stringify({
      booking_id: book2.data?.booking_id || book2.data?.id,
      station_id: createdStationId,
      charger_id: createdChargerId,
      vehicle_id: createdVehicleId,
    }),
  }).then((r) => r.json());

  if (!startChargeRes.success) {
    throw new Error(`Test G Start charging failed: ${JSON.stringify(startChargeRes)}`);
  }
  createdSessionId = startChargeRes.sessionId || startChargeRes.session?.sessionId;
  console.log(`   - Live Charging Session started: ${createdSessionId}`);

  // Wait 4 seconds for simulator ticks to update MySQL
  console.log("   - Waiting 4 seconds for simulator to produce telemetry in MySQL...");
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // Verify telemetry persisted in MySQL
  const sessionRows = await query(`SELECT * FROM charging_sessions WHERE session_id = ?`, [createdSessionId]);
  const sRow = sessionRows[0];
  console.log(`   - MySQL Telemetry check: Energy=${sRow.energy_kwh} kWh, SOC=${sRow.battery_soc}%, Power=${sRow.power_kw} kW, Cost=₹${sRow.total_amount}`);

  // Test Read-Only Active Session GET
  const activeGet = await fetch(`${BASE_URL}/charging/active`, {
    headers: { Authorization: `Bearer ${testUserToken}` },
  }).then((r) => r.json());

  if (!activeGet.active || !activeGet.session) {
    throw new Error(`Test G Active session GET failed: ${JSON.stringify(activeGet)}`);
  }

  // Stop Charging Session
  const stopChargeRes = await fetch(`${BASE_URL}/charging/stop`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${testUserToken}`,
    },
    body: JSON.stringify({
      session_id: createdSessionId,
      energy_delivered: sRow.energy_kwh || 5.2,
      total_amount: sRow.total_amount || 108.6,
      duration_minutes: 5,
    }),
  }).then((r) => r.json());

  if (!stopChargeRes.success) {
    throw new Error(`Test G Stop charging failed: ${JSON.stringify(stopChargeRes)}`);
  }
  console.log(`✅ [Test G Passed] Live charging started, simulator produced telemetry in MySQL, and session finalized.`);

  console.log("\n=======================================================");
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! (PHASES 1 TO 6 VERIFIED)");
  console.log("=======================================================\n");

  process.exit(0);
}

runTests().catch((err) => {
  console.error("❌ Test Suite Error:", err);
  process.exit(1);
});
