// VoltBot AI Intelligent Real-Time Chatbot Service
// Handles natural language processing, real-time station availability telemetry,
// booking tracking, dynamic tariff estimation, and emergency roadside diagnostics.

export const INDIAN_EV_DATABASE = {
  "tata nexon ev": { brand: "Tata", model: "Nexon EV Max", batteryKwh: 40.5, maxDcKw: 50, connector: "CCS2" },
  "tata punch ev": { brand: "Tata", model: "Punch EV", batteryKwh: 35.0, maxDcKw: 45, connector: "CCS2" },
  "tata tiago ev": { brand: "Tata", model: "Tiago EV", batteryKwh: 24.0, maxDcKw: 25, connector: "CCS2" },
  "mg zs ev": { brand: "MG", model: "ZS EV", batteryKwh: 50.3, maxDcKw: 60, connector: "CCS2" },
  "mg comet ev": { brand: "MG", model: "Comet EV", batteryKwh: 17.3, maxDcKw: 3.3, connector: "Type 2" },
  "hyundai ioniq 5": { brand: "Hyundai", model: "Ioniq 5", batteryKwh: 72.6, maxDcKw: 250, connector: "CCS2" },
  "hyundai kona": { brand: "Hyundai", model: "Kona Electric", batteryKwh: 39.2, maxDcKw: 50, connector: "CCS2" },
  "mahindra xuv400": { brand: "Mahindra", model: "XUV400", batteryKwh: 39.4, maxDcKw: 50, connector: "CCS2" },
  "byd atto 3": { brand: "BYD", model: "Atto 3", batteryKwh: 60.5, maxDcKw: 80, connector: "CCS2" },
  "ather 450x": { brand: "Ather", model: "450X", batteryKwh: 3.7, maxDcKw: 3.0, connector: "Ather Grid" },
  "ola s1 pro": { brand: "Ola", model: "S1 Pro", batteryKwh: 4.0, maxDcKw: 3.0, connector: "Ola Hypercharger" },
};

/**
 * Process user input against real-time application context
 * @param {string} rawInput 
 * @param {object} context - { stations, bookings, currentUser, systemSettings }
 */
export function processChatbotMessage(rawInput, context = {}) {
  const query = (rawInput || "").trim();
  const q = query.toLowerCase();
  const { stations = [], bookings = [], currentUser = null, systemSettings = {} } = context;

  // 1. CHECK SPECIFIC BOOKING ID QUERY (e.g. BK000001, BK000002)
  const bookingIdMatch = q.match(/bk\d{5,8}/i);
  if (bookingIdMatch) {
    const targetId = bookingIdMatch[0].toUpperCase();
    const found = bookings.find((b) => b.bookingId.toUpperCase() === targetId);
    if (found) {
      return {
        sender: "bot",
        text: `🔍 **Found Booking Pass:** Reservation **${found.bookingId}** is recorded in real-time system logs.`,
        type: "booking_card",
        data: found,
        suggestions: ["🎫 View Digital QR Pass", "⚡ Open Live Session", "Check station availability"],
      };
    } else {
      return {
        sender: "bot",
        text: `⚠️ I couldn't find a live booking with ID **${targetId}**. Would you like to check your active bookings or reserve a fresh slot?`,
        type: "text",
        suggestions: ["🔍 Check My Recent Bookings", "⚡ Book Charging Slot", "Find Fast Stations"],
      };
    }
  }

  // 2. CHECK MY BOOKINGS / TRACK BOOKING
  if (
    q.includes("my booking") ||
    q.includes("track booking") ||
    q.includes("check booking") ||
    q.includes("my slot") ||
    q.includes("my reservation") ||
    q.includes("booking status")
  ) {
    const userBookings = bookings.filter(
      (b) =>
        (currentUser && (b.counterId === currentUser.counterId || b.customerName === currentUser.name)) ||
        b.counterId === "CUS0001"
    );

    if (userBookings.length > 0) {
      const latest = userBookings[0];
      return {
        sender: "bot",
        text: `🔍 **Real-Time Booking Telemetry:** You have **${userBookings.length} booking(s)** registered. Here is your latest scheduled session:`,
        type: "booking_card",
        data: latest,
        suggestions: ["🎫 View Digital Pass / QR", "⚡ Live Charging Session", "Find another station"],
      };
    } else {
      return {
        sender: "bot",
        text: "You don't have any active bookings right now. You can book an EV charging slot in less than 30 seconds!",
        type: "text",
        suggestions: ["⚡ Book a Charging Slot", "📍 Explore Stations Nearby", "💰 Check Tariffs"],
      };
    }
  }

  // 3. REAL-TIME STATIONS & CHARGER SLOTS AVAILABILITY
  if (
    q.includes("station") ||
    q.includes("slot") ||
    q.includes("charger") ||
    q.includes("fast") ||
    q.includes("available") ||
    q.includes("chennai") ||
    q.includes("madurai") ||
    q.includes("bangalore") ||
    q.includes("coimbatore") ||
    q.includes("delhi") ||
    q.includes("ccs2") ||
    q.includes("kw") ||
    q.includes("near me") ||
    q.includes("find")
  ) {
    let matchedStations = [...stations];

    // City Filter
    if (q.includes("chennai")) matchedStations = matchedStations.filter((s) => s.city?.toLowerCase() === "chennai");
    else if (q.includes("madurai")) matchedStations = matchedStations.filter((s) => s.city?.toLowerCase() === "madurai");
    else if (q.includes("bangalore") || q.includes("bengaluru")) matchedStations = matchedStations.filter((s) => s.city?.toLowerCase().includes("bangal"));
    else if (q.includes("coimbatore")) matchedStations = matchedStations.filter((s) => s.city?.toLowerCase().includes("coimbatore"));

    // Fast Charging / High Power filter
    if (q.includes("fast") || q.includes("120") || q.includes("150") || q.includes("240") || q.includes("250")) {
      matchedStations = matchedStations.filter((s) =>
        s.chargers?.some((c) => c.powerKw >= 60 || c.connector === "CCS2")
      );
    }

    // Connector type filter
    if (q.includes("type 2") || q.includes("type2")) {
      matchedStations = matchedStations.filter((s) =>
        s.chargers?.some((c) => c.connector?.toLowerCase().includes("type 2"))
      );
    } else if (q.includes("chademo")) {
      matchedStations = matchedStations.filter((s) =>
        s.chargers?.some((c) => c.connector?.toLowerCase().includes("chademo"))
      );
    }

    if (matchedStations.length === 0) {
      matchedStations = stations.slice(0, 3);
    }

    const displayStations = matchedStations.slice(0, 3);
    const totalAvailSlots = displayStations.reduce(
      (acc, s) => acc + (s.chargers?.filter((c) => c.status === "Available").length || 0),
      0
    );

    return {
      sender: "bot",
      text: `⚡ **Real-Time Station Check:** Found **${matchedStations.length} station(s)** matching your request. Currently **${totalAvailSlots} bays are available** for instant reservation:`,
      type: "station_list",
      data: displayStations,
      suggestions: [
        `⚡ Book at ${displayStations[0]?.name?.split("-")[0]?.trim() || "Station"}`,
        "💰 Estimate Charging Cost",
        "🔍 Track My Booking",
      ],
    };
  }

  // 4. REAL-TIME TARIFF, PRICING & COST ESTIMATOR
  if (
    q.includes("tariff") ||
    q.includes("price") ||
    q.includes("cost") ||
    q.includes("rate") ||
    q.includes("calculate") ||
    q.includes("estimate") ||
    q.includes("kwh") ||
    q.includes("nexon") ||
    q.includes("how much")
  ) {
    // Detect vehicle from query or fallback to user / default
    let vehicle = { brand: "Tata", model: "Nexon EV Max", batteryKwh: 40.5, maxDcKw: 50 };
    for (const [key, val] of Object.entries(INDIAN_EV_DATABASE)) {
      if (q.includes(key) || q.includes(val.brand.toLowerCase()) || q.includes(val.model.toLowerCase())) {
        vehicle = val;
        break;
      }
    }
    if (currentUser?.vehicle?.batteryCapacity) {
      vehicle.batteryKwh = currentUser.vehicle.batteryCapacity;
      vehicle.model = currentUser.vehicle.model || vehicle.model;
    }

    // Battery percentages
    let startPct = 20;
    let targetPct = 80;
    const pctMatches = q.match(/(\d{1,2})\s*%\s*(?:to|-)?\s*(\d{1,2})\s*%/);
    if (pctMatches) {
      startPct = parseInt(pctMatches[1], 10);
      targetPct = parseInt(pctMatches[2], 10);
    }

    const energyNeededKwh = Number((((targetPct - startPct) / 100) * vehicle.batteryKwh).toFixed(1));
    const ratePerKwh = 18.5;
    const baseAmount = Number((energyNeededKwh * ratePerKwh).toFixed(1));
    const serviceFee = systemSettings.serviceFee || 20;
    const tax = Number((baseAmount * 0.18).toFixed(1));
    const totalCost = Number((baseAmount + serviceFee + tax).toFixed(1));

    // Time estimate for 60kW DC Fast and 22kW AC
    const fastTimeMins = Math.round((energyNeededKwh / 50) * 60);
    const acTimeMins = Math.round((energyNeededKwh / 7.2) * 60);

    return {
      sender: "bot",
      text: `📊 **Real-Time EV Tariff & Time Calculator:** Here is the live estimate for **${vehicle.brand} ${vehicle.model}** (${vehicle.batteryKwh} kWh pack):`,
      type: "tariff_calculator",
      data: {
        vehicleName: `${vehicle.brand} ${vehicle.model}`,
        batteryKwh: vehicle.batteryKwh,
        startPct,
        targetPct,
        energyNeededKwh,
        ratePerKwh,
        baseAmount,
        serviceFee,
        tax,
        totalCost,
        fastTimeMins,
        acTimeMins,
      },
      suggestions: ["⚡ Book Slot at ₹18.50/kWh", "Find 60kW Fast Chargers", "Emergency Support"],
    };
  }

  // 5. EMERGENCY, STUCK CONNECTOR, BREAKDOWN & HARDWARE DIAGNOSTICS
  if (
    q.includes("stuck") ||
    q.includes("lock") ||
    q.includes("unplug") ||
    q.includes("emergency") ||
    q.includes("sos") ||
    q.includes("smoke") ||
    q.includes("fire") ||
    q.includes("danger") ||
    q.includes("help") ||
    q.includes("technician") ||
    q.includes("breakdown") ||
    q.includes("overheat") ||
    q.includes("rfid fail")
  ) {
    return {
      sender: "bot",
      text: "🚨 **VoltCharge Real-Time Emergency Protocol Activated!** Follow these urgent diagnostic steps to safely disconnect or request immediate roadside dispatch:",
      type: "emergency_card",
      data: {
        hotline: "+91 1800 555 8658",
        steps: [
          "1. **Press Emergency Stop Button** on the charging station kiosk immediately.",
          "2. **Stop Session in App**: Click 'Stop Session' inside Customer Dashboard > Live Charging.",
          "3. **Mechanical Emergency Unlock**: Open your EV trunk lid, pull the bright orange manual connector release ring located behind the charge port wall.",
          "4. **Unlock Car Doors**: Press the key fob 'Unlock' button 3 times consecutively to trigger auto-pin release.",
          "5. **Field Support Dispatch**: Contact our 24/7 Rapid Response Tech Team via the button below.",
        ],
      },
      suggestions: ["🚨 Call Emergency 24/7 Hotline", "Report Complaint to Support", "Find Alternative Station"],
    };
  }

  // 6. CONNECTOR TYPE & EV COMPATIBILITY ADVISOR
  if (
    q.includes("connector") ||
    q.includes("ccs2") ||
    q.includes("type 2") ||
    q.includes("chademo") ||
    q.includes("gbt") ||
    q.includes("plug") ||
    q.includes("compatible") ||
    q.includes("adapter")
  ) {
    return {
      sender: "bot",
      text: `🔌 **Indian EV Connector Compatibility Guide:**
• **CCS2 (Combined Charging System 2)**: The universal standard for all DC Fast Chargers in India. Supported by Tata (Nexon, Punch, Tiago), MG ZS, Hyundai (Ioniq 5, Kona), Mahindra (XUV400), BYD, and luxury EVs. Speeds from 30 kW up to 250 kW.
• **Type 2 (AC Gun)**: Standard for AC destination chargers (3.3 kW to 22 kW). Found at shopping malls, hotels, and home charging points.
• **CHAdeMO**: Japanese DC fast-charging standard used by older Nissan and specialized fleets.
• **GB/T**: Chinese standard used on select electric commercial vans and retrofits.

All VoltCharge stations feature verified **CCS2 and Type 2 dual-gun configurations** with automated safety interlocks.`,
      type: "text",
      suggestions: ["⚡ Check Available CCS2 Slots", "💰 Calculate Charging Cost", "🚨 Emergency Help"],
    };
  }

  // 7. GREETING & GENERAL CAPABILITIES
  return {
    sender: "bot",
    text: `⚡ **Greetings! I am VoltBot AI 2.0**, your real-time intelligent EV charging copilot.

I am connected to live station telemetry across India. Here is what I can do for you in real-time:
• 🟢 **Live Station & Slot Checking**: Check free bays, power ratings, and peak hours.
• 🎫 **Track Your Bookings**: Real-time reservation status and digital QR passes.
• 💰 **Tariff & Duration Estimator**: Exact cost & charging time for your EV model.
• 🚨 **Emergency Roadside & Unlock**: Stuck connector release & 24/7 technician dispatch.

Tap an option below or ask me anything!`,
    type: "text",
    suggestions: [
      "⚡ Check Live Stations in Chennai",
      "🔍 Track My Booking Status",
      "💰 Estimate Cost for Tata Nexon EV",
      "🚨 Connector is Stuck / Emergency",
      "🔌 Connector Guide",
    ],
  };
}
