import axios from "axios";
import { aiToolsService } from "./aiToolsService.js";

/**
 * aiAgentService.js
 * Core AI Agent Orchestrator for VoltBot.
 * Handles OpenAI tool calling when configured, or executes intelligent natural-language
 * tool routing against real MySQL data.
 */

// Tool schemas for LLM tool calling
const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "getAvailableStations",
      description: "Search active EV charging stations by city, connector type, power, or keyword.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name e.g. Chennai, Madurai, Bangalore" },
          connector: { type: "string", description: "Connector type e.g. CCS2, Type 2, DC Fast" },
          minPower: { type: "number", description: "Minimum power in kW e.g. 50, 150" },
          searchQuery: { type: "string", description: "Search keyword" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getMyBookings",
      description: "Retrieve real bookings for the authenticated user.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status e.g. CONFIRMED, CHECKED_IN, COMPLETED" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getBookingStatus",
      description: "Check the exact status and details of a specific booking or latest booking.",
      parameters: {
        type: "object",
        properties: {
          bookingId: { type: "string", description: "Booking ID e.g. EV000053" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getActiveChargingSession",
      description: "Check if user has an active live charging session and get real-time telemetry (SOC, Power, Energy).",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculateChargingCost",
      description: "Calculate accurate charging energy and cost based on battery capacity, start SOC, target SOC, and tariff.",
      parameters: {
        type: "object",
        properties: {
          currentSoc: { type: "number", description: "Starting battery percentage e.g. 30" },
          targetSoc: { type: "number", description: "Target battery percentage e.g. 90" },
          batteryCapacityKwh: { type: "number", description: "Battery capacity in kWh e.g. 40.5" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getAvailableSlots",
      description: "Check slot availability and conflicts for a station, date, and time.",
      parameters: {
        type: "object",
        properties: {
          stationName: { type: "string", description: "Station name" },
          date: { type: "string", description: "Date YYYY-MM-DD" },
          time: { type: "string", description: "Time HH:MM" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyzeLiveTelemetry",
      description: "Analyze live telemetry for anomalies or charging speed bottlenecks.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "handleEmergencyAssistance",
      description: "Provide emergency safety assistance, stuck connector release guide, and support hotline.",
      parameters: {
        type: "object",
        properties: {
          issueType: { type: "string", description: "Type of issue e.g. STUCK_CONNECTOR, POWER_FAULT" },
        },
      },
    },
  },
];

/**
 * Execute tool function on backend
 */
async function executeTool(name, args, userId) {
  switch (name) {
    case "getAvailableStations":
      return await aiToolsService.getAvailableStations(args);
    case "getMyBookings":
      return await aiToolsService.getMyBookings(userId, args);
    case "getBookingStatus":
      return await aiToolsService.getBookingStatus(userId, args);
    case "getActiveChargingSession":
      return await aiToolsService.getActiveChargingSession(userId);
    case "getChargingHistory":
      return await aiToolsService.getChargingHistory(userId, args);
    case "getStationDetails":
      return await aiToolsService.getStationDetails(args);
    case "getAvailableSlots":
      return await aiToolsService.getAvailableSlots(args);
    case "calculateChargingCost":
      return await aiToolsService.calculateChargingCost(args);
    case "getUserVehicles":
      return await aiToolsService.getUserVehicles(userId);
    case "analyzeLiveTelemetry":
      return await aiToolsService.analyzeLiveTelemetry(userId);
    case "handleEmergencyAssistance":
      return await aiToolsService.handleEmergencyAssistance(userId, args);
    default:
      return null;
  }
}

/**
 * Intelligent Intent & Tool Execution Engine
 */
async function executeLocalAIEngine(message, userId, userProfile, vehicles) {
  const q = (message || "").toLowerCase().trim();

  // 1. SPECIFIC BOOKING ID QUERY (e.g. EV000053, BK000001)
  const bookingMatch = q.match(/(ev|bk)\d{4,8}/i);
  if (bookingMatch) {
    const bookingCode = bookingMatch[0].toUpperCase();
    const booking = await aiToolsService.getBookingStatus(userId, { bookingId: bookingCode });
    if (booking) {
      return {
        text: `🔍 **Reservation Found:** Booking **${booking.bookingId}** at **${booking.stationName}** is currently **${booking.status}** (Payment: **${booking.paymentStatus}**). Scheduled for ${booking.date} (${booking.timeSlot}).`,
        type: "booking_card",
        data: booking,
        suggestions: ["⚡ View Live Charging", "📍 View Station on Map", "Check another booking"],
      };
    } else {
      return {
        text: `I searched the database for reservation **${bookingCode}**, but could not find a matching record associated with your account.`,
        type: "text",
        suggestions: ["🔍 Show My Recent Bookings", "⚡ Book Charging Slot", "Find Fast Stations"],
      };
    }
  }

  // 2. ACTIVE CHARGING & TELEMETRY
  if (
    q.includes("am i charging") ||
    q.includes("charging now") ||
    q.includes("active charging") ||
    q.includes("live charging") ||
    q.includes("current battery") ||
    q.includes("charging status") ||
    q.includes("how much battery")
  ) {
    const active = await aiToolsService.getActiveChargingSession(userId);
    if (active && active.active) {
      if (active.isPendingStart) {
        return {
          text: `⚡ **Checked-In & Ready:** You have checked in for booking **${active.bookingId}** at **${active.stationName}**. Please plug in your vehicle to begin the live charging session.`,
          type: "text",
          suggestions: ["⚡ Proceed to Live Charging", "🎫 View QR Pass", "Station directions"],
        };
      }
      return {
        text: `⚡ **Live Charging Telemetry:** Your vehicle is actively charging at **${active.stationName}** on **${active.chargerName}** (${active.powerKw} kW). Current battery is **${active.currentSoc}%** (Target: ${active.targetSoc}%). ${active.energyKwh} kWh delivered so far.`,
        type: "charging_card",
        data: active,
        suggestions: ["⚡ Open Live Charging Page", "🛑 Stop Charging Session", "View Live Telemetry"],
      };
    } else {
      return {
        text: "You currently don't have an active charging session. Would you like to locate an available fast charging station or reserve a slot?",
        type: "text",
        suggestions: ["⚡ Find Nearby Fast Chargers", "📅 Reserve a Slot", "🔍 Check My Bookings"],
      };
    }
  }

  // 3. MY BOOKINGS / TRACK BOOKINGS
  if (
    q.includes("my booking") ||
    q.includes("track booking") ||
    q.includes("check booking") ||
    q.includes("my reservation") ||
    q.includes("booking status") ||
    q.includes("my slot")
  ) {
    const bookings = await aiToolsService.getMyBookings(userId, { limit: 5 });
    if (bookings && bookings.length > 0) {
      const latest = bookings[0];
      return {
        text: `📋 **Your Bookings:** You have **${bookings.length} reservation(s)** in your account. Your latest reservation is **${latest.bookingId}** at **${latest.stationName}** (${latest.status}).`,
        type: "booking_card",
        data: latest,
        allBookings: bookings,
        suggestions: ["🎫 View Digital QR Pass", "⚡ Proceed to Live Charging", "Find another station"],
      };
    } else {
      return {
        text: "You don't have any bookings registered in your account yet. You can reserve an available connector bay in advance!",
        type: "text",
        suggestions: ["⚡ Book a Charging Slot", "📍 Find Nearby Stations", "💰 Check Tariffs"],
      };
    }
  }

  // 4. COST ESTIMATION & CALCULATOR
  if (
    q.includes("cost") ||
    q.includes("price") ||
    q.includes("tariff") ||
    q.includes("how much") ||
    q.includes("rate") ||
    q.includes("estimate")
  ) {
    // Extract SOC numbers if mentioned (e.g. 30% to 90%, 20 to 80)
    const socMatches = q.match(/(\d{1,3})\s*(?:%|\s*to|\s*-)\s*(\d{1,3})%/i) || q.match(/(\d{1,3})\s*to\s*(\d{1,3})/i);
    let startSoc = 30;
    let targetSoc = 90;
    if (socMatches) {
      startSoc = parseInt(socMatches[1], 10);
      targetSoc = parseInt(socMatches[2], 10);
    }

    const userCar = vehicles && vehicles.length > 0 ? vehicles[0] : null;
    const capacity = userCar ? userCar.batteryCapacityKwh : 40.5;

    const costCalc = await aiToolsService.calculateChargingCost({
      batteryCapacityKwh: capacity,
      currentSoc: startSoc,
      targetSoc: targetSoc,
    });

    return {
      text: `💰 **Charging Cost Breakdown:** For charging **${startSoc}% → ${targetSoc}%** (${costCalc.energyRequiredKwh} kWh energy delivered on ${userCar ? userCar.fullName : "Nexon EV 40.5 kWh"}):\n- **Base Tariff:** ₹${costCalc.tariffPerKwh.toFixed(2)}/kWh\n- **Energy Cost:** ₹${costCalc.energyCost.toFixed(2)}\n- **Platform Fee:** ₹${costCalc.platformFee.toFixed(2)}\n- **GST (18%):** ₹${costCalc.gstTax.toFixed(2)}\n- **Total Estimated Amount:** **₹${costCalc.totalEstimatedAmount.toFixed(2)}**`,
      type: "cost_estimate",
      data: costCalc,
      suggestions: ["⚡ Book This Charging Slot", "📍 Find Nearest DC Fast Station", "Check slot availability"],
    };
  }

  // 5. STUCK CONNECTOR / EMERGENCY ASSISTANCE
  if (
    q.includes("stuck") ||
    q.includes("emergency") ||
    q.includes("locked") ||
    q.includes("cannot remove") ||
    q.includes("stopped unexpectedly") ||
    q.includes("help") ||
    q.includes("danger") ||
    q.includes("fault")
  ) {
    const emergencyData = await aiToolsService.handleEmergencyAssistance(userId, { issueType: "STUCK_CONNECTOR" });
    return {
      text: `🚨 **Safety Assistance & Connector Release Protocol:**\n1. Ensure charging is completely stopped via the app or station Stop button.\n2. Unlock your vehicle with your smart key fob (locks frequently latch with vehicle security).\n3. Use the vehicle's manual emergency release ring located inside the trunk or under the hood.\n4. Call our 24x7 toll-free dispatch hotline at **${emergencyData.emergencyHotline}** for instant technician dispatch.`,
      type: "emergency_guide",
      data: emergencyData,
      suggestions: ["📞 Call 24/7 Field Dispatch", "🛑 Confirm Session Stopped", "View Station Location"],
    };
  }

  // 6. ANOMALY DETECTION / TELEMETRY ANALYSIS
  if (
    q.includes("anomaly") ||
    q.includes("slow") ||
    q.includes("power low") ||
    q.includes("why is charging") ||
    q.includes("speed")
  ) {
    const telemetry = await aiToolsService.analyzeLiveTelemetry(userId);
    if (!telemetry.hasActiveSession) {
      return {
        text: "You don't have an active charging session right now to run telemetry diagnostics. Once a session starts, I continuously analyze power, voltage, and temperature in real time.",
        type: "text",
        suggestions: ["⚡ Find Fast Stations", "📅 Check My Bookings", "💰 Calculate Cost"],
      };
    }
    return {
      text: telemetry.hasAnomalies
        ? `⚠️ **Telemetry Diagnostic Alert:** ${telemetry.anomalies[0].description} Recommendation: ${telemetry.anomalies[0].recommendation}`
        : `✅ **Telemetry Diagnostic:** Charging is operating within optimal parameters at **${telemetry.currentPowerKw} kW** (${telemetry.voltage}V / ${telemetry.currentAmp}A). Battery SOC is **${telemetry.currentSoc}%**.`,
      type: "anomaly_alert",
      data: telemetry,
      suggestions: ["⚡ Open Live Charging", "View Full Telemetry", "Call Technician Support"],
    };
  }

  // 7. SLOT AVAILABILITY CHECK
  if (
    q.includes("can i charge") ||
    q.includes("available slot") ||
    q.includes("at 8 am") ||
    q.includes("tomorrow") ||
    q.includes("can i book")
  ) {
    const timeMatch = q.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    const requestedTime = timeMatch ? timeMatch[0] : "08:00 AM";

    const slotInfo = await aiToolsService.getAvailableSlots({
      time: requestedTime,
      durationMinutes: 60,
    });

    return {
      text: slotInfo.isAvailable
        ? `✅ **Slot Available:** Connectors at **${slotInfo.stationName}** are available around **${requestedTime}**. You can proceed to reserve your charging bay.`
        : `⚠️ **Slot Busy:** ${requestedTime} has high booking occupancy at **${slotInfo.stationName}**. Recommended alternative available times: **08:30 AM**, **11:00 AM**, **02:00 PM**.`,
      type: "slot_availability",
      data: slotInfo,
      suggestions: ["⚡ Book Slot Now", "📍 Explore Other Stations", "💰 Check Tariffs"],
    };
  }

  // 8. FIND CHARGERS / STATIONS SEARCH
  let cityParam = null;
  if (q.includes("chennai")) cityParam = "Chennai";
  else if (q.includes("madurai")) cityParam = "Madurai";
  else if (q.includes("bangalore") || q.includes("bengaluru")) cityParam = "Bangalore";
  else if (q.includes("coimbatore")) cityParam = "Coimbatore";

  let connectorParam = null;
  if (q.includes("ccs2") || q.includes("dc fast") || q.includes("fast")) connectorParam = "CCS2";
  else if (q.includes("type 2") || q.includes("ac")) connectorParam = "Type 2";

  let minPower = null;
  if (q.includes("150") || q.includes("120") || q.includes("fast")) minPower = 60;

  const stations = await aiToolsService.getAvailableStations({
    city: cityParam,
    connector: connectorParam,
    minPower,
    limit: 4,
  });

  if (stations && stations.length > 0) {
    const totalAvail = stations.reduce((acc, s) => acc + s.availableChargers, 0);
    return {
      text: `⚡ **Live Station Query Results:** Found **${stations.length} active station(s)** from our database. Currently **${totalAvail} charging bay(s) are available** for instant reservation:`,
      type: "station_list",
      data: stations,
      suggestions: [
        `⚡ Book at ${stations[0]?.name || "Station"}`,
        "💰 Estimate Charging Cost",
        "🔍 Check My Bookings",
      ],
    };
  }

  return {
    text: "I am VoltBot AI, your real-time EV assistant connected to live station telemetry, reservations, and battery diagnostics. How may I assist your charging journey today?",
    type: "text",
    suggestions: [
      "📍 Find Available DC Fast Chargers",
      "🔍 Track My Booking Status",
      "💰 Estimate Charging Cost",
      "🚨 Connector is Stuck / Emergency",
    ],
  };
}

/**
 * Main chat handler: Orchestrates LLM + Tool Execution
 */
export const processAIChat = async ({ message, history = [], userId = null }) => {
  try {
    // 1. Fetch authenticated user context
    const userProfile = userId ? await aiToolsService.getUserProfile(userId) : null;
    const vehicles = userId ? await aiToolsService.getUserVehicles(userId) : [];

    const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;

    // If OpenAI API key is present and configured, use OpenAI Responses/Chat API with tools
    if (apiKey && apiKey.startsWith("sk-") && apiKey.length > 20) {
      try {
        const systemPrompt = `You are VoltBot AI, an intelligent EV Charging Assistant directly connected to the EV Charging Station Management System.
You have access to real-time database tools for stations, bookings, charging sessions, cost calculation, and telemetry.
Authenticated User: ${userProfile ? `ID: ${userProfile.userId}, Name: ${userProfile.name}, Role: ${userProfile.role}` : "Visitor / Unauthenticated"}
Registered Vehicles: ${JSON.stringify(vehicles)}
CRITICAL RULES:
1. ALWAYS use the provided tools to retrieve real data. NEVER invent fake station names, bookings, or tariffs.
2. If data is not found, state clearly that it was not found in the database.
3. Keep responses concise, helpful, and formatted with markdown.`;

        const messages = [
          { role: "system", content: systemPrompt },
          ...history.slice(-4).map((h) => ({
            role: h.sender === "user" ? "user" : "assistant",
            content: h.text,
          })),
          { role: "user", content: message },
        ];

        const response = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-4o-mini",
            messages,
            tools: TOOL_DEFINITIONS,
            tool_choice: "auto",
            temperature: 0.2,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            timeout: 10000,
          }
        );

        const choice = response.data?.choices?.[0];
        if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
          const toolCall = choice.message.tool_calls[0];
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments || "{}");

          const toolResult = await executeTool(toolName, toolArgs, userId);

          // Second pass: Send tool result back to LLM to summarize
          const followUpMessages = [
            ...messages,
            choice.message,
            {
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult),
            },
          ];

          const summaryRes = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
              model: "gpt-4o-mini",
              messages: followUpMessages,
              temperature: 0.2,
            },
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              timeout: 10000,
            }
          );

          const finalSummary = summaryRes.data?.choices?.[0]?.message?.content || "";

          // Map tool to card type
          let cardType = "text";
          if (toolName === "getAvailableStations") cardType = "station_list";
          else if (toolName === "getMyBookings" || toolName === "getBookingStatus") cardType = "booking_card";
          else if (toolName === "getActiveChargingSession") cardType = "charging_card";
          else if (toolName === "calculateChargingCost") cardType = "cost_estimate";
          else if (toolName === "getAvailableSlots") cardType = "slot_availability";
          else if (toolName === "analyzeLiveTelemetry") cardType = "anomaly_alert";
          else if (toolName === "handleEmergencyAssistance") cardType = "emergency_guide";

          return {
            success: true,
            text: finalSummary,
            type: cardType,
            data: toolResult,
            engine: "OPENAI_INTEGRATED",
            suggestions: [
              "⚡ Find Available Stations",
              "🔍 Track My Booking Status",
              "💰 Estimate Charging Cost",
            ],
          };
        }

        if (choice?.message?.content) {
          return {
            success: true,
            text: choice.message.content,
            type: "text",
            engine: "OPENAI_INTEGRATED",
            suggestions: ["📍 Explore Stations", "📅 Check My Bookings", "💰 Tariffs"],
          };
        }
      } catch (openAiErr) {
        console.warn("OpenAI API call error, falling back to database engine:", openAiErr.message);
      }
    }

    // High-performance direct Database Agent Engine (Zero Seed Data, Real MySQL)
    const localResult = await executeLocalAIEngine(message, userId, userProfile, vehicles);
    return {
      success: true,
      ...localResult,
      engine: "EV_DATABASE_AGENT",
    };
  } catch (error) {
    console.error("processAIChat error:", error);
    return {
      success: false,
      text: "I encountered an error retrieving real-time EV network data. Please try again in a moment.",
      type: "text",
      suggestions: ["📍 Find Stations", "🔍 Check Bookings", "💰 Tariffs"],
    };
  }
};

export const aiAgentService = {
  processAIChat,
  executeTool,
};

export default aiAgentService;
