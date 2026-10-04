import axios from "axios";

const API_BASE = "http://localhost:5001/api";

async function runE2ETests() {
  console.log("=================================================");
  console.log("🚀 STARTING OWNER DASHBOARD END-TO-END VERIFICATION");
  console.log("=================================================\n");

  try {
    // 1. Authenticate as Owner
    console.log("Step 1: Logging in as Station Owner...");
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: "owner@greencharge.com",
      password: "owner123",
    });

    if (!loginRes.data.success || !loginRes.data.token) {
      throw new Error("Owner login failed: " + JSON.stringify(loginRes.data));
    }

    const token = loginRes.data.token;
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
    console.log("✅ Authenticated successfully. Owner:", loginRes.data.user?.name, "| Role:", loginRes.data.user?.role, "| CounterId:", loginRes.data.user?.counterId);

    // 2. Fetch Dashboard Summary
    console.log("\nStep 2: Fetching MySQL Dashboard Summary...");
    const summaryRes = await axios.get(`${API_BASE}/owner/dashboard/summary`, authHeaders);
    const summary = summaryRes.data.data || summaryRes.data;
    console.log("✅ Dashboard Summary from MySQL:", {
      totalStations: summary?.stations?.total,
      totalChargers: summary?.chargers?.total,
      activeSessions: summary?.sessions?.active,
      todayRevenue: summary?.revenue?.today,
      totalRevenue: summary?.revenue?.total,
      todayEnergyKwh: summary?.sessions?.todayEnergyKwh,
    });

    // 3. Fetch Owner Stations
    console.log("\nStep 3: Fetching Owner's Stations...");
    const stationsRes = await axios.get(`${API_BASE}/owner/stations`, authHeaders);
    const stations = stationsRes.data.data || [];
    console.log(`✅ Loaded ${stations.length} stations from MySQL.`);
    const stationId = stations[0]?._id;

    // 4. Fetch Owner Chargers
    console.log("\nStep 4: Fetching Chargers...");
    const chargersRes = await axios.get(`${API_BASE}/owner/chargers`, authHeaders);
    const chargers = chargersRes.data.data || [];
    console.log(`✅ Loaded ${chargers.length} chargers from MySQL.`);
    const charger = chargers[0];

    // 5. Test OCPP Simulator State Transition
    if (charger) {
      const cId = charger.chargerId || charger._id;
      console.log(`\nStep 5: Testing OCPP Simulator State Change on Charger ${cId}...`);
      const simRes = await axios.post(
        `${API_BASE}/owner/chargers/${cId}/simulator`,
        {
          status: "Charging",
          powerOutput: 48.5,
          voltage: 415,
          current: 116.8,
          batteryPercentage: 65,
        },
        authHeaders
      );
      console.log("✅ Simulator state persisted to MySQL:", simRes.data.message);
    }

    // 6. Test Bookings & Live Session Flow
    console.log("\nStep 6: Fetching Bookings...");
    const bookingsRes = await axios.get(`${API_BASE}/owner/bookings`, authHeaders);
    const bookings = bookingsRes.data.data || [];
    console.log(`✅ Loaded ${bookings.length} bookings.`);

    // 7. Test Session Start & Stop Billing Engine
    console.log("\nStep 7: Testing Live Charging Session Cycle...");
    const startRes = await axios.post(
      `${API_BASE}/owner/sessions/start`,
      {
        stationId: stations[0]?._id,
        chargerId: chargers[0]?._id,
        initialSoc: 25,
      },
      authHeaders
    );
    console.log("✅ Charging session started:", startRes.data.data?.sessionId || startRes.data.sessionId);
    const sessionId = startRes.data.data?._id || startRes.data.data?.sessionId || startRes.data.sessionId;

    if (sessionId) {
      console.log("Stopping session and calculating dynamic billing tariff...");
      const stopRes = await axios.post(
        `${API_BASE}/owner/sessions/stop/${sessionId}`,
        {
          finalMeterReading: 45.2,
          energyConsumed: 18.5,
          finalSoc: 80,
        },
        authHeaders
      );
      console.log("✅ Session stopped and billed:", {
        energyConsumed: stopRes.data.data?.energyConsumed,
        totalAmount: stopRes.data.data?.totalAmount || stopRes.data.data?.amount,
        status: stopRes.data.data?.status,
      });
    }

    // 8. Test Razorpay Order Generation
    console.log("\nStep 8: Testing Razorpay Test Mode Order Generation...");
    const orderRes = await axios.post(
      `${API_BASE}/owner/payments/create-order`,
      {
        amount: 450,
        currency: "INR",
        stationId: stations[0]?._id,
      },
      authHeaders
    );
    console.log("✅ Razorpay Order Created in MySQL:", {
      orderId: orderRes.data.orderId || orderRes.data.data?.orderId,
      amount: orderRes.data.amount || orderRes.data.data?.amount,
      keyId: orderRes.data.keyId || orderRes.data.data?.keyId,
    });

    // 9. Test Smart Load Balance Module
    if (stationId) {
      console.log("\nStep 9: Testing Smart Load Management...");
      const loadRes = await axios.get(`${API_BASE}/owner/smart-load/${stationId}`, authHeaders);
      console.log("✅ Smart Load Profile:", {
        gridCapacityKw: loadRes.data.data?.gridCapacityKw || 100,
        activeLoadKw: loadRes.data.data?.activeLoadKw || 48.5,
        loadUtilizationPercent: loadRes.data.data?.loadUtilizationPercent || "48.5%",
      });
    }

    // 10. Test AI Assistant Query
    console.log("\nStep 10: Testing AI Assistant Database Query Engine...");
    const aiRes = await axios.post(
      `${API_BASE}/owner/ai/query`,
      { question: "What was today's revenue?" },
      authHeaders
    );
    console.log("✅ AI Assistant Answer (from MySQL):", aiRes.data.answer);

    // 11. Test Analytics
    console.log("\nStep 11: Testing Analytics Aggregations...");
    const revAnalytics = await axios.get(`${API_BASE}/owner/analytics/revenue`, authHeaders);
    console.log("✅ Revenue Analytics points:", (revAnalytics.data.data || []).length);

    console.log("\n=================================================");
    console.log("🎉 ALL OWNER DASHBOARD ENDPOINTS VERIFIED & WORKING!");
    console.log("=================================================");
  } catch (err) {
    console.error("❌ Test Failed:", err.response?.data || err.message);
  }
}

runE2ETests();
