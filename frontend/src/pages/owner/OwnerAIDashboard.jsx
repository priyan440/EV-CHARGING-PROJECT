import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BrainCircuit,
  Zap,
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Cpu,
  DollarSign,
  BarChart3,
  Calendar,
  Sparkles,
  RefreshCw,
  Send,
  MessageSquare,
  Bot,
  User,
  HelpCircle
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useSystemState } from "../../contexts/SystemStateContext";
import { stationIntelligenceService } from "../../services/stationIntelligenceService";
import { queryOwnerAI } from "../../services/ownerService";

export default function OwnerAIDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { stations, bookings, payments, maintenance } = useSystemState();

  const [loading, setLoading] = useState(true);
  const [intelligence, setIntelligence] = useState(null);
  const [toast, setToast] = useState("");

  // AI Assistant Chat State
  const [queryInput, setQueryInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    {
      role: "assistant",
      text: "Hello! I am your AI Operations Assistant connected directly to your MySQL station database. Ask me about your real-time revenues, charger health, fault rates, or peak charging hours.",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const ownerCounterId = currentUser?.counterId || currentUser?.ownerId || "OWN0001";

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await stationIntelligenceService.fetchOwnerIntelligence(ownerCounterId, {
        stations,
        bookings,
        payments,
        maintenance,
      });
      setIntelligence(data);
    } catch {
      const data = stationIntelligenceService.getOwnerIntelligence(ownerCounterId, {
        stations,
        bookings,
        payments,
        maintenance,
      });
      setIntelligence(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [stations, bookings, payments, maintenance]);

  const handleAskAI = async (e, textPrompt) => {
    if (e) e.preventDefault();
    const promptToUse = textPrompt || queryInput;
    if (!promptToUse.trim() || aiLoading) return;

    const userMsg = {
      role: "user",
      text: promptToUse,
      timestamp: new Date().toLocaleTimeString(),
    };

    setChatHistory((prev) => [...prev, userMsg]);
    setQueryInput("");
    setAiLoading(true);

    try {
      const res = await queryOwnerAI(promptToUse);
      const answer = res.answer || res.message || (typeof res === "string" ? res : JSON.stringify(res));

      const aiMsg = {
        role: "assistant",
        text: answer,
        timestamp: new Date().toLocaleTimeString(),
      };
      setChatHistory((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("AI query failed:", err);
      const errorMsg = {
        role: "assistant",
        text:
          err.response?.data?.message ||
          "Unable to query the database. Please check your backend connection.",
        timestamp: new Date().toLocaleTimeString(),
      };
      setChatHistory((prev) => [...prev, errorMsg]);
    } finally {
      setAiLoading(false);
    }
  };

  const sampleQuestions = [
    "What was today's revenue?",
    "Which charger generated the most revenue?",
    "How many chargers are currently offline?",
    "What are my peak charging hours?",
    "Which station has the highest utilization?",
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        <p className="text-xs font-mono text-slate-500 uppercase tracking-wider font-semibold">
          Synthesizing AI Station Intelligence & Telemetry...
        </p>
      </div>
    );
  }

  const { todayIntelligence, revenueIntelligence, recommendations, healthScore } =
    intelligence || {
      todayIntelligence: {
        totalRevenue: 28400,
        energyDeliveredKwh: 340,
        activeChargersCount: 6,
        totalChargersCount: 8,
        activeSessionsCount: 4,
        peakTimeWindow: "05:00 PM - 09:00 PM",
      },
      revenueIntelligence: {
        peakHoursPrediction: "17:00 - 21:00",
        expectedDailyRevenue: 34000,
        chargerPerformance: [],
      },
      recommendations: [],
      healthScore: 94,
    };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="theme-card p-6 md:p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 text-[10px] font-extrabold uppercase font-mono tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
              <Sparkles size={12} className="animate-pulse text-emerald-500" />
              AI STATION INTELLIGENCE
            </span>
            <span className="px-3 py-1 text-[10px] font-extrabold font-mono tracking-wider bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-full border border-cyan-500/30">
              ID: {ownerCounterId}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)]">
            AI Operations & Assistant Hub
          </h1>

          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Real-time neural synthesis of charger telemetry, database revenue transactions, and dynamic load recommendations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="theme-input hover:border-emerald-500 font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-sm"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Re-evaluate Engine
          </button>
        </div>
      </div>

      {/* Interactive AI Assistant Chat Component */}
      <div className="rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                Ask Database AI Assistant
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400">
                  ONLINE
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Answers are dynamically computed from your active MySQL records.
              </p>
            </div>
          </div>
        </div>

        {/* Chat History Box */}
        <div className="p-5 max-h-[300px] overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-[#070D1E]">
          {chatHistory.map((msg, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`p-3.5 rounded-2xl max-w-lg text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-purple-600 text-white font-medium rounded-tr-none shadow-md shadow-purple-600/20"
                    : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-800 shadow-sm"
                }`}
              >
                <p>{msg.text}</p>
                <span className="block text-[9px] font-mono opacity-50 mt-1 text-right">
                  {msg.timestamp}
                </span>
              </div>

              {msg.role === "user" && (
                <div className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {aiLoading && (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
                <Bot className="w-4 h-4 animate-bounce" />
              </div>
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-500" />
                Analyzing MySQL station records...
              </div>
            </div>
          )}
        </div>

        {/* Quick Sample Questions Chips */}
        <div className="px-5 py-2.5 bg-slate-100/60 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0 flex items-center gap-1">
            <HelpCircle className="w-3 h-3" /> Quick Query:
          </span>
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleAskAI(null, q)}
              className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 hover:bg-purple-500 hover:text-white text-slate-600 dark:text-slate-300 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 transition shrink-0 cursor-pointer shadow-sm"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Query Input Form */}
        <form
          onSubmit={(e) => handleAskAI(e, queryInput)}
          className="p-4 bg-white dark:bg-[#0B1329] border-t border-slate-200 dark:border-slate-800 flex items-center gap-3"
        >
          <input
            type="text"
            placeholder="Type your question (e.g., 'What was today's revenue?', 'Which charger has highest fault rate?')..."
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            disabled={aiLoading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            disabled={aiLoading || !queryInput.trim()}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-lg shadow-purple-600/30 disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Ask</span>
          </button>
        </form>
      </div>

      {/* Grid: 1. Core Health & Heuristics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <ShieldCheck size={24} />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Station Health</span>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono flex items-center gap-1.5">
              <span>{healthScore}%</span>
              <span className="text-[10px] font-sans font-bold text-emerald-500 uppercase">Optimal</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
            <DollarSign size={24} />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Projected Daily</span>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
              ₹{(revenueIntelligence?.expectedDailyRevenue || 34000).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
            <Clock size={24} />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Peak Demand Slot</span>
            <div className="text-sm font-extrabold text-purple-600 dark:text-purple-400 font-mono">
              {todayIntelligence?.peakTimeWindow || "17:00 - 21:00"}
            </div>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Zap size={24} />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Gun Saturation</span>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
              {todayIntelligence?.activeChargersCount || 4} / {todayIntelligence?.totalChargersCount || 6} Active
            </div>
          </div>
        </div>
      </div>

      {/* 2. AI Smart Recommendations Directives */}
      {recommendations && recommendations.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <BrainCircuit size={16} className="text-purple-500" /> Prescriptive AI Action Cards
            </h2>
            <span className="text-[10px] font-mono text-emerald-500 font-bold">
              {recommendations.length} High-Yield Directives
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec) => {
              const isHigh = rec.priority === "HIGH";
              const isMed = rec.priority === "MEDIUM";

              return (
                <div
                  key={rec.id}
                  className="p-5 rounded-3xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-500/50 transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase tracking-wider border ${
                          isHigh
                            ? "bg-red-500/10 text-red-500 border-red-500/30"
                            : isMed
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                            : "bg-blue-500/10 text-blue-500 border-blue-500/30"
                        }`}
                      >
                        {rec.priority} PRIORITY
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 font-bold">{rec.category}</span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {rec.title}
                    </h3>

                    <div className="p-2.5 my-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      📊 {rec.expectedMetric}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {rec.explanation}
                    </p>

                    <div className="mt-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300">
                      <strong className="block text-[10px] uppercase tracking-wider font-extrabold text-emerald-600 dark:text-emerald-400 mb-0.5">
                        Recommendation:
                      </strong>
                      {rec.recommendedAction}
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(rec.actionRoute || "/owner/dashboard")}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer group"
                  >
                    <span>{rec.actionLabel || "Review Action"}</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
