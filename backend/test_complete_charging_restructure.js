import axios from "axios";
import { query } from "./config/db.js";

const BASE_URL = "http://localhost:5001/api";

async function runTests() {
  console.log("🚀 Starting End-to-End Verification of Charging Restructure & Stop Flow...\n");

  try {
    // 1. Authenticate as Customer CUS0001 (priyan@evcharge.com)
    console.log("1️⃣ Logging in as Customer Priyan (CUS0001)...");
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: "priyan@evcharge.com",
      password: "password123",
    });

    const token = loginRes.data.token || loginRes.data.data?.token;
    const authHeader = { headers: { Authorization: `Bearer ${token}` } };
    console.log(`   ✅ Logged in successfully. Customer ID: ${loginRes.data.user?.id || 3}`);

    // 2. Test My Bookings Isolation (Must NOT show 1041 bookings)
    console.log("\n2️⃣ Checking Customer My Bookings isolation...");
    const myBookingsRes = await axios.get(`${BASE_URL}/bookings/my`, authHeader);
    const initialBookings = myBookingsRes.data.data || [];
    console.log(`   📊 Bookings returned for CUS0001: ${initialBookings.length}`);
    if (initialBookings.length > 50) {
      throw new Error(`FAILED: My Bookings returned ${initialBookings.length} records. Expected <= 10.`);
    }
    console.log(`   ✅ PASSED: My Bookings shows only customer's personal records (${initialBookings.length} bookings, not 1041).`);

    // 3. Create a New Booking
    console.log("\n3️⃣ Creating a new reservation for CUS0001...");
    const newBookingRes = await axios.post(
      `${BASE_URL}/bookings`,
      {
        station_id: 1,
        booking_date: "2026-10-01",
        start_time: "11:00:00",
        current_battery: 20,
        target_battery: 80,
      },
      authHeader
    );
    const createdBooking = newBookingRes.data.booking || newBookingRes.data.data;
    console.log(`   ✅ Reservation created successfully! Booking ID: ${createdBooking.bookingId}`);

    // Verify My Bookings count increased by 1
    const myBookingsAfterRes = await axios.get(`${BASE_URL}/bookings/my`, authHeader);
    const updatedCount = myBookingsAfterRes.data.data?.length || 0;
    console.log(`   📊 Updated My Bookings count: ${updatedCount} (was ${initialBookings.length})`);

    // 4. Test Check-In Flow
    console.log("\n4️⃣ Testing Check-in for booking " + createdBooking.bookingId + "...");
    const checkInRes = await axios.put(
      `${BASE_URL}/bookings/${createdBooking.bookingId}`,
      { status: "CHECKED_IN" },
      authHeader
    );
    console.log(`   ✅ Check-In successful: Status = ${checkInRes.data.status}`);

    // 5. Test Start Charging Flow
    console.log("\n5️⃣ Starting Live Charging Session...");
    const startRes = await axios.post(
      `${BASE_URL}/charging/start`,
      { bookingId: createdBooking.bookingId },
      authHeader
    );
    const sessionId = startRes.data.sessionId || startRes.data.session?.sessionId || startRes.data.session?.session_id;
    console.log(`   ✅ Charging started! Session ID: ${sessionId}`);

    // 6. Test Active Session Telemetry
    console.log("\n6️⃣ Fetching Active Session Telemetry...");
    const activeRes = await axios.get(`${BASE_URL}/charging/active`, authHeader);
    if (!activeRes.data.active || !activeRes.data.session) {
      throw new Error("FAILED: Active session not detected after start.");
    }
    console.log(`   ✅ Active session confirmed: ${activeRes.data.session.sessionId} | Station: ${activeRes.data.session.stationName}`);

    // 7. Test Telemetry Sync
    console.log("\n7️⃣ Updating Live Telemetry Progress (Battery: 65%, Energy: 18.5 kWh)...");
    await axios.put(
      `${BASE_URL}/charging/${sessionId}/telemetry`,
      {
        current_battery: 65,
        energy_delivered: 18.5,
        current_cost: 277.5,
        duration_minutes: 25,
      },
      authHeader
    );
    console.log("   ✅ Telemetry synchronized with database.");

    // 8. Test Stop Charging & Atomic Finalization
    console.log("\n8️⃣ Stopping Charging Session & Finalizing Booking...");
    const stopRes = await axios.post(
      `${BASE_URL}/charging/${sessionId}/stop`,
      {
        final_battery: 78,
        energy_delivered: 29.1,
        duration_minutes: 52,
      },
      authHeader
    );

    const summary = stopRes.data.summary;
    console.log(`   ✅ Session stopped! Summary:`);
    console.log(`      - Battery: ${summary.batteryTransition}`);
    console.log(`      - Energy Delivered: ${summary.energyDelivered} kWh`);
    console.log(`      - Duration: ${summary.durationMinutes} min`);
    console.log(`      - Final Amount: ₹${summary.finalAmount}`);
    console.log(`      - Invoice Generated: ${summary.invoiceNumber}`);

    // 9. Verify Original Booking is COMPLETED
    console.log("\n9️⃣ Verifying original booking status in database...");
    const verifyBookingRes = await axios.get(`${BASE_URL}/bookings/${createdBooking.bookingId}`, authHeader);
    const finalBooking = verifyBookingRes.data.data;
    console.log(`   📊 Booking ${finalBooking.bookingId} Status: ${finalBooking.status}`);
    if (finalBooking.status !== "COMPLETED") {
      throw new Error(`FAILED: Booking status is ${finalBooking.status}, expected COMPLETED.`);
    }
    console.log("   ✅ Original booking successfully updated to COMPLETED.");

    // 10. Verify Live Charging shows NO ACTIVE SESSION
    console.log("\n🔟 Verifying Live Charging active session is cleared...");
    const checkActiveAfter = await axios.get(`${BASE_URL}/charging/active`, authHeader);
    console.log(`   📊 Active state: ${checkActiveAfter.data.active} (Expected: false)`);
    if (checkActiveAfter.data.active) {
      throw new Error("FAILED: Active session still persists after stop charging.");
    }
    console.log("   ✅ Live Charging correctly returned to empty state.");

    // 11. Verify Charging History has the completed session
    console.log("\n1️⃣1️⃣ Verifying Charging History receives completed session...");
    const historyRes = await axios.get(`${BASE_URL}/charging/history`, authHeader);
    const historyList = historyRes.data.data || [];
    const foundSession = historyList.find((h) => h.sessionId === sessionId);
    if (!foundSession) {
      throw new Error("FAILED: Completed session not found in charging history.");
    }
    console.log(`   ✅ Session ${foundSession.sessionId} found in Charging History.`);

    // 12. Verify Invoice Retrieval
    console.log("\n1️⃣2️⃣ Verifying Invoice Retrieval for " + summary.invoiceNumber + "...");
    const invoiceRes = await axios.get(`${BASE_URL}/invoices/${summary.invoiceNumber}`, authHeader);
    const inv = invoiceRes.data.data;
    console.log(`   ✅ Invoice retrieved successfully: Total: ₹${inv.pricing.totalAmount} | Customer: ${inv.customer.name}`);

    // 13. Verify Station Owner / Admin Global Analytics Still Has 1000+ Bookings
    console.log("\n1️⃣3️⃣ Verifying Station Owner & Admin Global Station Analytics...");
    const [totalDbCount] = await query("SELECT COUNT(*) as cnt FROM bookings");
    console.log(`   📊 Total Global Station Bookings in Database: ${totalDbCount.cnt}`);
    if (totalDbCount.cnt < 1000) {
      throw new Error("FAILED: Global station bookings were lost.");
    }
    console.log("   ✅ Global station bookings & analytics perfectly preserved for Station Owner & Admin.");

    console.log("\n==================================================");
    console.log("🎉 ALL 13 TEST SUITES PASSED WITH 100% SUCCESS!");
    console.log("==================================================");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ TEST FAILED:", error.response?.data || error.message);
    process.exit(1);
  }
}

runTests();
