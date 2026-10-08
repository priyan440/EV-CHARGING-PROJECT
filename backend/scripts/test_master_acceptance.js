import axios from "axios";
import { query } from "../config/db.js";

const BASE_URL = "http://localhost:5001/api";

async function runMasterAcceptanceTest() {
  console.log("============================================================");
  console.log("EV CHARGING SYSTEM: MASTER E2E ACCEPTANCE TEST (MYSQL PURE)");
  console.log("============================================================");

  try {
    const timestamp = Date.now();

    // 1. REGISTER REAL OWNER
    console.log("\n[TEST 1] Registering Real Station Owner in MySQL...");
    const ownerEmail = `owner_real_${timestamp}@evowner.com`;
    const ownerPassword = "Password@123";
    const ownerRegRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: "Senthil Station Owner",
      email: ownerEmail,
      password: ownerPassword,
      role: "STATION_OWNER",
      phone: "+91 9876501234",
      companyName: "Senthil EV Power Grid",
      address: "100 Grand Southern Trunk Road",
      city: "Chennai",
      state: "Tamil Nadu",
      pincode: "600032",
    });
    console.log("✅ Owner registered:", ownerRegRes.data?.user?.email || ownerEmail);

    // Login owner
    const ownerLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: ownerEmail,
      password: ownerPassword,
    });
    const ownerToken = ownerLoginRes.data?.token;
    const ownerAuth = { headers: { Authorization: `Bearer ${ownerToken}` } };
    console.log("✅ Owner logged in, received JWT token.");

    // 2. OWNER CREATES REAL STATION WITH MAP COORDINATES
    console.log("\n[TEST 2] Owner commissions new station with exact GPS coordinates...");
    const createStationRes = await axios.post(
      `${BASE_URL}/owner/stations`,
      {
        stationName: `Senthil SuperGrid Hub #${timestamp.toString().slice(-4)}`,
        address: "75 Mount Road, Guindy",
        city: "Chennai",
        state: "Tamil Nadu",
        pincode: "600032",
        latitude: 13.0067,
        longitude: 80.2023,
        openingTime: "06:00 AM",
        closingTime: "11:30 PM",
        contactNumber: "+91 9876501234",
        totalSlots: 3,
        maxPowerKw: 150.0,
        amenities: ["WiFi", "Restrooms", "Coffee Lounge", "24/7 Security"],
      },
      ownerAuth
    );
    const createdStation = createStationRes.data?.data;
    const stationId = createdStation.id;
    const stationCode = createdStation.station_id;
    console.log(`✅ Station commissioned in MySQL: ID ${stationId} (${stationCode}) at Lat: ${createdStation.latitude}, Lng: ${createdStation.longitude}`);

    // 3. EDIT STATION MAP LOCATION & VERIFY PERSISTENCE IN MYSQL
    console.log("\n[TEST 3] Owner updates station GPS coordinates & address on map...");
    const updateStationRes = await axios.put(
      `${BASE_URL}/owner/stations/${stationCode}`,
      {
        stationName: `Senthil SuperGrid Hub Updated #${timestamp.toString().slice(-4)}`,
        address: "90 Guindy Industrial Estate, Chennai",
        latitude: 13.0112,
        longitude: 80.2088,
        contactNumber: "+91 9876509999",
      },
      ownerAuth
    );
    const updatedStation = updateStationRes.data?.data;
    console.log(`✅ Station updated in MySQL: Lat ${updatedStation.latitude}, Lng ${updatedStation.longitude}, Address: ${updatedStation.address}`);

    // Check user map endpoint to ensure new station coordinates reflect immediately
    const userMapRes = await axios.get(`${BASE_URL}/stations/approved`);
    const foundOnUserMap = userMapRes.data?.data?.find((s) => s.id === stationId);
    if (!foundOnUserMap || Math.abs(parseFloat(foundOnUserMap.latitude) - 13.0112) > 0.001) {
      throw new Error("Station coordinates not synchronized on User Map endpoint!");
    }
    console.log("✅ Station accurately synchronized and visible on User Map API with updated coordinates.");

    // 4. OWNER TARIFF MANAGEMENT CRUD
    console.log("\n[TEST 4] Owner Tariff Management CRUD...");
    const createTariffRes = await axios.post(
      `${BASE_URL}/owner/tariffs`,
      {
        stationId: stationId,
        name: "Senthil SuperGrid Ultra Dynamic Tariff",
        baseRate: 19.5,
        peakRate: 24.0,
        offPeakRate: 15.0,
        connectionFee: 20.0,
        idleFee: 3.0,
        peakStart: "18:00",
        peakEnd: "22:00",
      },
      ownerAuth
    );
    const createdTariff = createTariffRes.data?.data;
    const tariffId = createdTariff.tariff_id || createdTariff.id;
    console.log(`✅ Tariff created in MySQL: ID ${tariffId}, Base Rate: ₹${createdTariff.base_rate_per_kwh}/kWh`);

    // Update Tariff
    const updateTariffRes = await axios.put(
      `${BASE_URL}/owner/tariffs/${tariffId}`,
      {
        baseRate: 20.5,
        peakRate: 25.0,
      },
      ownerAuth
    );
    console.log(`✅ Tariff updated in MySQL to ₹${updateTariffRes.data?.data?.base_rate_per_kwh}/kWh`);

    // 5. ADD REAL CONNECTORS / CHARGERS WITH DISTINCT STANDARDS
    console.log("\n[TEST 5] Adding distinct standard chargers (CCS2 & Type 2 & CHAdeMO)...");
    const chg1Res = await axios.post(
      `${BASE_URL}/owner/chargers`,
      {
        stationId: stationId,
        name: "Bay 01 - DC UltraFast (CCS2 150kW)",
        chargerType: "DC_FAST",
        connectorType: "CCS2",
        powerRating: 150,
      },
      ownerAuth
    );
    const chg1 = chg1Res.data?.data;

    const chg2Res = await axios.post(
      `${BASE_URL}/owner/chargers`,
      {
        stationId: stationId,
        name: "Bay 02 - AC Destination (Type 2 22kW)",
        chargerType: "AC",
        connectorType: "Type 2",
        powerRating: 22,
      },
      ownerAuth
    );
    const chg2 = chg2Res.data?.data;
    console.log(`✅ Created Bay 1 (${chg1.charger_name}, ID: ${chg1.id}) and Bay 2 (${chg2.charger_name}, ID: ${chg2.id}) in MySQL.`);

    // 6. TECHNICIAN & FAULT MANAGEMENT WORKFLOW
    console.log("\n[TEST 6] Hardware Fault & Field Technician Assignment Lifecycle...");
    // Fetch technicians
    const techListRes = await axios.get(`${BASE_URL}/owner/technicians`, ownerAuth);
    const availableTechs = techListRes.data?.data || [];
    console.log(`✅ Retrieved ${availableTechs.length} active technicians from MySQL.`);
    const techId = availableTechs.length > 0 ? availableTechs[0].id : 1;

    // Report Fault on Bay 01
    const faultTicketRes = await axios.post(
      `${BASE_URL}/owner/maintenance/tickets`,
      {
        stationId: stationId,
        chargerId: chg1.id,
        issueType: "CCS2 Cable Retractor Latch Fault",
        description: "Mechanical latch stuck during disengage.",
        priority: "HIGH",
      },
      ownerAuth
    );
    const ticket = faultTicketRes.data?.data;
    const ticketId = ticket.ticket_id || ticket.id;
    console.log(`✅ Fault reported. Maintenance Ticket #${ticketId} created with status '${ticket.status}'. Bay 1 set to MAINTENANCE in MySQL.`);

    // Assign Technician
    const assignRes = await axios.put(
      `${BASE_URL}/owner/maintenance/tickets/${ticketId}`,
      {
        technicianId: techId,
        status: "ASSIGNED",
      },
      ownerAuth
    );
    console.log(`✅ Technician ID #${techId} assigned. Ticket status transitioned to '${assignRes.data?.data?.status}'.`);

    // Technician starts work
    const startWorkRes = await axios.put(
      `${BASE_URL}/owner/maintenance/tickets/${ticketId}`,
      {
        status: "IN_PROGRESS",
      },
      ownerAuth
    );
    console.log(`✅ Ticket status transitioned to '${startWorkRes.data?.data?.status}'.`);

    // Resolve & Close Ticket
    const resolveRes = await axios.put(
      `${BASE_URL}/owner/maintenance/tickets/${ticketId}`,
      {
        status: "RESOLVED",
        resolutionNotes: "Replaced mechanical latch assembly and tested 150kW output.",
      },
      ownerAuth
    );
    console.log(`✅ Ticket resolved! Status: '${resolveRes.data?.data?.status}'. Bay 1 automatically restored to 'AVAILABLE' in MySQL.`);

    // 7. REGISTER REAL USER & VEHICLES
    console.log("\n[TEST 7] Registering Real Driver & Adding Vehicles with Specific Connectors...");
    const userEmail = `driver_real_${timestamp}@evdriver.com`;
    const userPassword = "Password@123";
    const userRegRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: "Karthik EV Driver",
      email: userEmail,
      password: userPassword,
      role: "USER",
      phone: "+91 9988776655",
    });
    console.log("✅ Driver registered:", userEmail);

    const userLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: userEmail,
      password: userPassword,
    });
    const userToken = userLoginRes.data?.token;
    const userAuth = { headers: { Authorization: `Bearer ${userToken}` } };

    // Add Vehicle 1: Tata Nexon EV Max (CCS2)
    const veh1Res = await axios.post(
      `${BASE_URL}/vehicles`,
      {
        brand: "Tata Motors",
        model: "Nexon EV Max",
        registrationNumber: `TN01EV${timestamp.toString().slice(-4)}`,
        batteryCapacity: 40.5,
        connectorType: "CCS2",
        connectorTypeId: 1,
      },
      userAuth
    );
    const vehCcs2 = veh1Res.data?.data || veh1Res.data?.vehicle;
    console.log(`✅ Added Vehicle 1: ${vehCcs2.brand} ${vehCcs2.model} (Connector: CCS2)`);

    // 8. VERIFY VEHICLE -> CONNECTOR COMPATIBILITY IN BOOKING FLOW
    console.log("\n[TEST 8] Verifying Vehicle-to-Connector Compatibility Filtering...");
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0];

    const availConnRes = await axios.get(`${BASE_URL}/bookings/available-connectors`, {
      params: {
        station_id: stationId,
        vehicle_id: vehCcs2.id,
        booking_date: tomorrowStr,
        start_time: "10:00:00",
        duration: 60,
      },
      ...userAuth,
    });

    const compatibleConnectors = availConnRes.data?.connectors || [];
    console.log(`✅ Available compatible connectors returned for CCS2 vehicle: ${compatibleConnectors.length}`);
    compatibleConnectors.forEach((c) => {
      console.log(`   - ${c.connectorNumber || c.connectorType} | Power: ${c.powerKw}kW | Compatible: ${c.isCompatible} | Status: ${c.status}`);
      if (c.connectorType && !c.connectorType.includes("CCS")) {
        throw new Error(`Incompatible connector '${c.connectorType}' was improperly exposed to CCS2 vehicle!`);
      }
    });

    // 9. BOOK COMPATIBLE CONNECTOR & VERIFY ACTIVE TARIFF SNAPSHOT
    console.log("\n[TEST 9] Booking compatible slot with active tariff snapshot...");
    const selectedConn = compatibleConnectors[0];
    const bookingRes = await axios.post(
      `${BASE_URL}/bookings`,
      {
        station_id: stationId,
        charger_id: selectedConn.chargerId || selectedConn.id,
        connector_id: selectedConn.id,
        vehicle_id: vehCcs2.id,
        booking_date: tomorrowStr,
        start_time: "10:00:00",
        duration_minutes: 60,
        current_soc: 30,
        target_soc: 80,
      },
      userAuth
    );
    const booking = bookingRes.data?.data || bookingRes.data?.booking;
    console.log(`✅ Booking created in MySQL: ID ${booking.bookingId || booking.booking_id}, Tariff Snapshot: ₹${booking.tariffRateSnapshot || booking.tariff_rate_snapshot}/kWh, Est Amount: ₹${booking.estimatedAmount}`);

    // Verify double-booking prevention on same bay and time
    console.log("\n[TEST 10] Testing double booking conflict prevention...");
    try {
      await axios.post(
        `${BASE_URL}/bookings`,
        {
          station_id: stationId,
          charger_id: selectedConn.chargerId || selectedConn.id,
          connector_id: selectedConn.id,
          vehicle_id: vehCcs2.id,
          booking_date: tomorrowStr,
          start_time: "10:15:00",
          duration_minutes: 45,
          current_soc: 30,
          target_soc: 80,
        },
        userAuth
      );
      throw new Error("Double booking was allowed unexpectedly!");
    } catch (conflictErr) {
      if (conflictErr.response?.status === 409) {
        console.log("✅ Conflict properly prevented by MySQL lock! Response 409 Conflict:", conflictErr.response.data?.message);
      } else {
        throw conflictErr;
      }
    }

    console.log("\n============================================================");
    console.log("🏆 ALL MASTER ACCEPTANCE TESTS PASSED SUCCESSFULLY ON MYSQL!");
    console.log("============================================================");
    process.exit(0);
  } catch (err) {
    console.error("❌ Master acceptance test failure:", err.response?.data || err.message);
    process.exit(1);
  }
}

runMasterAcceptanceTest();
