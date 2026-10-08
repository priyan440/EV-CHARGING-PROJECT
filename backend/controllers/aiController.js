import { processAIChat } from "../services/aiAgentService.js";
import { aiToolsService } from "../services/aiToolsService.js";

/**
 * aiController.js
 * Controller handling real-time AI Agent requests from VoltBot UI.
 */

export const handleChat = async (req, res) => {
  try {
    const { message, history } = req.body;
    const userId = req.user?.id || null;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message string is required.",
      });
    }

    const response = await processAIChat({
      message: message.trim(),
      history: Array.isArray(history) ? history : [],
      userId,
    });

    return res.json(response);
  } catch (error) {
    console.error("AI Controller handleChat error:", error);
    return res.status(500).json({
      success: false,
      text: "VoltBot AI encountered an internal error while querying the EV network.",
      error: error.message,
    });
  }
};

export const getAIStatus = async (req, res) => {
  try {
    const hasKey = Boolean(process.env.OPENAI_API_KEY || process.env.AI_API_KEY);
    const stations = await aiToolsService.getAvailableStations({ limit: 10 });
    const totalAvailSlots = stations.reduce((acc, s) => acc + s.availableChargers, 0);

    return res.json({
      success: true,
      status: "ONLINE",
      agent: "VoltBot AI 2.0",
      capabilities: [
        "REAL_TIME_STATION_SEARCH",
        "BOOKING_STATUS_TRACKING",
        "LIVE_CHARGING_TELEMETRY",
        "DYNAMIC_COST_ESTIMATION",
        "SLOT_CONFLICT_CHECK",
        "ANOMALY_DETECTION",
        "EMERGENCY_RELEASE_ASSIST",
      ],
      llmIntegrated: hasKey,
      liveStationsCount: stations.length,
      liveAvailableSlots: totalAvailSlots,
      database: "CONNECTED_MYSQL",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      status: "DEGRADED",
      error: error.message,
    });
  }
};

export const aiController = {
  handleChat,
  getAIStatus,
};

export default aiController;
