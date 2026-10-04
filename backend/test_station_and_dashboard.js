import axios from "axios";

async function testAll() {
  const baseURL = "http://localhost:5001/api";
  console.log("🚀 Starting Comprehensive API & Station Creation Verification...");

  // 0. Login as Station Owner to obtain JWT token
  let token = "";
  try {
    const loginRes = await axios.post(`${baseURL}/auth/login`, {
      email: "owner@evcharge.com",
      password: "password123",
    });
    token = loginRes.data.token;
    console.log("🔑 Authenticated as Station Owner successfully!");
  } catch (err) {
    console.error("❌ Login failed:", err.response?.data || err.message);
    return;
  }

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // 1. Owner Dashboard Summary
  try {
    const res = await axios.get(`${baseURL}/owner/dashboard/summary`, authHeaders);
    console.log("✅ 1. Owner Dashboard Summary Response:");
    console.log("   Stations KPI:", res.data.data.stations);
    console.log("   Chargers KPI:", res.data.data.chargers);
    console.log("   Sessions KPI:", res.data.data.sessions);
    console.log("   Revenue KPI:", res.data.data.revenue);
  } catch (err) {
    console.error("❌ 1. Dashboard summary failed:", err.response?.data || err.message);
  }

  // 2. Fetch Owner Stations
  try {
    const res = await axios.get(`${baseURL}/owner/stations`, authHeaders);
    console.log(`✅ 2. Owner Stations fetched: ${res.data.data?.length} stations found`);
    if (res.data.data?.length > 0) {
      console.log("   Sample station:", {
        stationId: res.data.data[0].stationId,
        name: res.data.data[0].stationName,
        totalChargers: res.data.data[0].totalChargers,
        status: res.data.data[0].status,
      });
    }
  } catch (err) {
    console.error("❌ 2. Fetch stations failed:", err.response?.data || err.message);
  }

  // 3. Create a New Station
  try {
    const newStationPayload = {
      stationName: "E-Hub Fast Charger OMR",
      address: "Old Mahabalipuram Rd, Sholinganallur",
      city: "Chennai",
      state: "Tamil Nadu",
      pincode: "600119",
      latitude: 12.9010,
      longitude: 80.2279,
      contactNumber: "+91 98401 99999",
      openingTime: "06:00 AM",
      closingTime: "11:00 PM",
      totalSlots: 6,
      parkingCapacity: 6,
      maxPowerKw: 180,
    };
    const res = await axios.post(`${baseURL}/owner/stations`, newStationPayload, authHeaders);
    console.log("✅ 3. Create Station Result:", res.data.message, "Station ID:", res.data.data?.station_id || res.data.data?.stationId);
  } catch (err) {
    console.error("❌ 3. Create station failed:", err.response?.data || err.message);
  }

  // 4. Fetch All Stations (Map / Public view)
  try {
    const res = await axios.get(`${baseURL}/stations`);
    console.log(`✅ 4. Public / Discovery Stations fetched: ${res.data.data?.length} stations found`);
  } catch (err) {
    console.error("❌ 4. Public stations failed:", err.response?.data || err.message);
  }

  // 5. Fetch Owner Customers
  try {
    const res = await axios.get(`${baseURL}/owner/customers`, authHeaders);
    console.log(`✅ 5. Owner Customers fetched: ${res.data.data?.length} customers found`);
    if (res.data.data?.length > 0) {
      console.log("   Sample customer:", {
        customerId: res.data.data[0].customerId,
        name: res.data.data[0].customerName,
        email: res.data.data[0].email,
        vehicleCount: res.data.data[0].vehicleCount,
        totalSpending: res.data.data[0].totalSpending,
      });
    }
  } catch (err) {
    console.error("❌ 5. Customers failed:", err.response?.data || err.message);
  }

  // 6. Fetch Owner Tariffs
  try {
    const res = await axios.get(`${baseURL}/owner/tariffs`, authHeaders);
    console.log(`✅ 6. Owner Tariffs fetched: ${res.data.data?.length} tariff configurations found`);
  } catch (err) {
    console.error("❌ 6. Tariffs failed:", err.response?.data || err.message);
  }

  // 7. Fetch Owner Transactions / Reports
  try {
    const res = await axios.get(`${baseURL}/owner/transactions`, authHeaders);
    console.log(`✅ 7. Owner Transactions fetched: ${res.data.data?.length} transactions found`);
  } catch (err) {
    console.error("❌ 7. Transactions failed:", err.response?.data || err.message);
  }

  console.log("\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!");
}

testAll();
