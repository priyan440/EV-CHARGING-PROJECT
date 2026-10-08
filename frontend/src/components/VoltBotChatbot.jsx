import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FiSend,
  FiX,
  FiZap,
  FiShield,
  FiPhone,
  FiCheckCircle,
  FiAlertTriangle,
  FiClock,
  FiMapPin,
  FiCalendar,
  FiDollarSign,
  FiMaximize2,
  FiMinimize2,
  FiVolume2,
  FiVolumeX,
  FiMic,
  FiMicOff,
  FiTrash2,
  FiArrowRight,
  FiCopy,
  FiCheck,
  FiActivity,
  FiCompass,
  FiCpu,
  FiRadio,
} from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { chatbotService } from '../services/chatbotService';

// Web Audio tone synthesizer for chat sound feedback
const playChime = (type = 'receive') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'send') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
      osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
    }
  } catch {
    // AudioContext blocked
  }
};

const QUICK_ACTIONS = [
  { id: 'stations', label: '⚡ Live Stations', prompt: 'Find available DC fast charging stations near me' },
  { id: 'bookings', label: '🔍 Track My Booking', prompt: 'What is the status of my charging booking?' },
  { id: 'charging', label: '🔋 Am I Charging?', prompt: 'Am I charging right now? Check my live battery status' },
  { id: 'cost', label: '💰 Estimate Cost', prompt: 'How much will it cost to charge from 30% to 90%?' },
  { id: 'emergency', label: '🚨 Stuck Connector / SOS', prompt: 'My charging connector is stuck in vehicle' },
];

const INITIAL_MESSAGES = [
  {
    sender: 'bot',
    text: `⚡ **Greetings! I am VoltBot AI 2.0**, your real-time EV charging copilot directly connected to MySQL database & live telemetry.
    
Ask me anything about live stations, your reservations, charging telemetry, tariffs, or emergency assistance.`,
    type: 'text',
    suggestions: [
      '⚡ Find Available Stations in Chennai',
      '🔍 What is my booking status?',
      '🔋 Am I charging right now?',
      '💰 Estimate Cost for 30% to 90%',
      '🚨 Connector is Stuck / Emergency',
    ],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
];

export default function VoltBotChatbot() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceOutEnabled, setVoiceOutEnabled] = useState(false);
  const [systemTelemetry, setSystemTelemetry] = useState(null);

  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem('voltbot_history');
      return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
    } catch {
      return INITIAL_MESSAGES;
    }
  });

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Fetch real system telemetry status on mount & when opened
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await chatbotService.getAISystemStatus();
        if (res.success) {
          setSystemTelemetry(res);
        }
      } catch {}
    };
    fetchStatus();
  }, [isOpen]);

  // Persist session history
  useEffect(() => {
    try {
      sessionStorage.setItem('voltbot_history', JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  // Dismiss tooltip after 8s
  useEffect(() => {
    const timer = setTimeout(() => setShowTooltip(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  // Text-To-Speech helper
  const speakText = (text) => {
    if (!voiceOutEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*_`#]/g, '').replace(/\[.*?\]\(.*?\)/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {}
  };

  // Speech-To-Text helper
  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by your browser. Please type your message.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        handleSend(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Main message sender calling real backend AI endpoint
  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    if (soundEnabled) playChime('send');

    const userMsg = {
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsTyping(true);

    try {
      const botResponse = await chatbotService.sendAIMessage(query, messages);
      const newBotMsg = {
        sender: 'bot',
        text: botResponse.text || "I've processed your query.",
        type: botResponse.type || 'text',
        data: botResponse.data || null,
        suggestions: botResponse.suggestions || [
          '⚡ Find Stations',
          '🔍 Track Bookings',
          '💰 Tariffs',
        ],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, newBotMsg]);
      if (soundEnabled) playChime('receive');
      if (voiceOutEnabled) speakText(newBotMsg.text);
    } catch (err) {
      const errorMsg = {
        sender: 'bot',
        text: 'I could not connect to the live EV network servers. Please check your connection.',
        type: 'text',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages(INITIAL_MESSAGES);
    sessionStorage.removeItem('voltbot_history');
  };

  // Format markdown into bold text & linebreaks
  const renderFormattedText = (txt) => {
    if (!txt) return null;
    const lines = txt.split('\n');
    return lines.map((line, idx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={idx} className={line.trim() === '' ? 'h-2' : 'min-h-[1.25rem]'}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-bold text-[var(--text-primary)]">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <>
      {/* ============================================================ */}
      {/* FLOATING TRIGGER BUTTON & TOOLTIP BUBBLE                     */}
      {/* ============================================================ */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 pointer-events-auto">
        {/* Tooltip on initial load */}
        <AnimatePresence>
          {showTooltip && !isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="bg-slate-900 dark:bg-slate-800 text-white text-xs px-3.5 py-2.5 rounded-2xl shadow-xl border border-blue-500/30 flex items-center gap-2 max-w-xs cursor-pointer"
              onClick={() => {
                setIsOpen(true);
                setShowTooltip(false);
              }}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <div className="text-[11px] leading-snug">
                <span className="font-bold text-blue-400">VoltBot AI Agent</span>: Real database & live telemetry copilot!
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTooltip(false);
                }}
                className="text-slate-400 hover:text-white ml-1 text-xs"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Circular Pulse Button */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            setIsOpen(!isOpen);
            setShowTooltip(false);
          }}
          className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-xl shadow-blue-600/35 hover:shadow-blue-500/50 transition-all border-2 border-white/20 cursor-pointer group"
          aria-label="Open VoltBot AI Chatbot"
        >
          {isOpen ? (
            <FiX size={24} className="transition-transform group-hover:rotate-90" />
          ) : (
            <>
              <FiCpu size={24} className="animate-pulse" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-slate-900 rounded-full animate-pulse" />
            </>
          )}
        </motion.button>
      </div>

      {/* ============================================================ */}
      {/* CHATBOT DRAWER MODAL                                         */}
      {/* ============================================================ */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.94 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-24 right-4 sm:right-6 z-50 flex flex-col rounded-3xl overflow-hidden shadow-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] backdrop-blur-2xl transition-all ${
              isExpanded
                ? 'w-[94vw] sm:w-[680px] h-[85vh] max-h-[820px]'
                : 'w-[92vw] sm:w-[420px] h-[600px] max-h-[85vh]'
            }`}
          >
            {/* 1. HEADER */}
            <div className="p-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white flex items-center justify-between shadow-md relative overflow-hidden shrink-0">
              <div className="flex items-center gap-3 relative z-10">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner">
                    <FiZap size={20} className="text-cyan-300" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-blue-900 rounded-full animate-ping" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-sm text-white tracking-wide">VoltBot AI 2.0</h4>
                    <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-cyan-400/20 text-cyan-200 border border-cyan-400/30 rounded-full font-mono uppercase">
                      EV AGENT
                    </span>
                  </div>
                  <p className="text-[10px] text-blue-200 flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>
                      {systemTelemetry?.liveStationsCount
                        ? `${systemTelemetry.liveStationsCount} Stations Live • ${systemTelemetry.liveAvailableSlots} Free Bays`
                        : 'Connected to Live MySQL EV Network'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1 relative z-10 text-white/80">
                <button
                  onClick={() => setVoiceOutEnabled(!voiceOutEnabled)}
                  className={`p-2 rounded-xl hover:bg-white/10 transition cursor-pointer ${
                    voiceOutEnabled ? 'text-cyan-300 bg-white/10' : ''
                  }`}
                  title={voiceOutEnabled ? 'Mute AI voice output' : 'Enable voice responses'}
                >
                  {voiceOutEnabled ? <FiVolume2 size={15} /> : <FiVolumeX size={15} />}
                </button>

                <button
                  onClick={clearChat}
                  className="p-2 rounded-xl hover:bg-white/10 transition cursor-pointer"
                  title="Clear conversation history"
                >
                  <FiTrash2 size={15} />
                </button>

                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 rounded-xl hover:bg-white/10 transition hidden sm:flex cursor-pointer"
                  title={isExpanded ? 'Collapse drawer' : 'Expand drawer'}
                >
                  {isExpanded ? <FiMinimize2 size={15} /> : <FiMaximize2 size={15} />}
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl hover:bg-white/10 transition cursor-pointer"
                  title="Close VoltBot"
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>

            {/* 2. MESSAGES STREAM */}
            <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3.5 bg-[var(--bg-surface-raised)] text-[var(--text-primary)]">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  {/* Message Bubble */}
                  <div
                    className={`max-w-[90%] sm:max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs transition-all ${
                      m.sender === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-tr-none shadow-blue-500/20'
                        : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-tl-none'
                    }`}
                  >
                    {/* Render Text Body */}
                    <div className="space-y-1.5">{renderFormattedText(m.text)}</div>

                    {/* ==================================================== */}
                    {/* RICH CARD: LIVE STATIONS LIST                        */}
                    {/* ==================================================== */}
                    {m.type === 'station_list' && Array.isArray(m.data) && (
                      <div className="mt-3 space-y-2 border-t border-[var(--border-subtle)] pt-2.5">
                        <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block font-mono">
                          Live Database Stations:
                        </span>
                        {m.data.map((st) => (
                          <div
                            key={st.id || st.stationId}
                            className="p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h5 className="font-bold text-xs text-[var(--text-primary)] line-clamp-1">
                                  {st.name}
                                </h5>
                                <p className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1 mt-0.5">
                                  <FiMapPin size={11} className="text-blue-500" />
                                  <span>{st.address || st.city}</span>
                                </p>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold shrink-0 ${
                                  st.availableChargers > 0
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                }`}
                              >
                                {st.availableChargers > 0 ? `${st.availableChargers} Free` : 'Occupied'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)]">
                              <span>⚡ Max {st.maxPowerKw || 60} kW</span>
                              <span>₹{st.tariffPerKwh || 18}/kWh</span>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => {
                                  setIsOpen(false);
                                  navigate(`/customer/book?stationId=${st.id || st.stationId}`);
                                }}
                                className="flex-1 py-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
                              >
                                <FiZap size={11} />
                                <span>Book Slot</span>
                              </button>
                              <button
                                onClick={() => {
                                  setIsOpen(false);
                                  navigate(`/dashboard`);
                                }}
                                className="py-1.5 px-2.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold text-[10px] transition cursor-pointer"
                              >
                                View Map
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ==================================================== */}
                    {/* RICH CARD: REAL-TIME BOOKING TRACKING                */}
                    {/* ==================================================== */}
                    {m.type === 'booking_card' && m.data && (
                      <div className="mt-3 p-3.5 rounded-xl bg-[var(--bg-surface-raised)] border border-blue-500/30 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                              {m.data.bookingId}
                            </span>
                            <button
                              onClick={() => handleCopy(m.data.bookingId, m.data.bookingId)}
                              className="text-[var(--text-muted)] hover:text-blue-500 cursor-pointer"
                              title="Copy Booking ID"
                            >
                              {copiedId === m.data.bookingId ? <FiCheck size={12} className="text-emerald-500" /> : <FiCopy size={12} />}
                            </button>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            {m.data.status || 'Confirmed'}
                          </span>
                        </div>

                        <div className="space-y-1 text-[11px]">
                          <p className="font-semibold text-[var(--text-primary)] line-clamp-1">
                            📍 {m.data.stationName || 'VoltCharge Hub'}
                          </p>
                          <div className="flex items-center gap-3 text-[var(--text-secondary)] text-[10px]">
                            <span>📅 {m.data.date}</span>
                            <span>⏰ {m.data.timeSlot || m.data.startTime}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] pt-1">
                            <span>Vehicle: <b>{m.data.vehicleModel || 'EV'}</b></span>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              ₹{parseFloat(m.data.estimatedAmount || 0).toFixed(2)} ({m.data.paymentStatus || 'PAID'})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => {
                              setIsOpen(false);
                              navigate(`/my-bookings`);
                            }}
                            className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <FiCheckCircle size={12} />
                            <span>View My Bookings</span>
                          </button>
                          {['CHECKED_IN', 'IN_PROGRESS', 'CHARGING', 'ACTIVE'].includes(m.data.status) && (
                            <button
                              onClick={() => {
                                setIsOpen(false);
                                navigate(`/sessions/${m.data.bookingId}`);
                              }}
                              className="py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] transition cursor-pointer"
                            >
                              Live Charging
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ==================================================== */}
                    {/* RICH CARD: LIVE CHARGING TELEMETRY                   */}
                    {/* ==================================================== */}
                    {m.type === 'charging_card' && m.data && (
                      <div className="mt-3 p-3.5 rounded-xl bg-[var(--bg-surface-raised)] border border-emerald-500/40 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                          <span className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            Live Charging Telemetry
                          </span>
                          <span className="font-mono font-bold text-emerald-500 text-xs">
                            {m.data.currentSoc}% → {m.data.targetSoc}%
                          </span>
                        </div>

                        {/* SOC Progress Bar */}
                        <div className="w-full bg-[var(--bg-surface)] h-2 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                          <div
                            style={{ width: `${Math.min(100, m.data.currentSoc || 50)}%` }}
                            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 animate-pulse"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] text-[var(--text-secondary)]">
                          <div>Power: <b className="text-[var(--text-primary)]">{m.data.powerKw} kW</b></div>
                          <div>Energy: <b className="text-[var(--text-primary)]">{m.data.energyKwh} kWh</b></div>
                          <div>Voltage: <b className="text-[var(--text-primary)]">{m.data.voltage} V</b></div>
                          <div>Duration: <b className="text-[var(--text-primary)]">{m.data.durationMinutes} min</b></div>
                        </div>

                        <button
                          onClick={() => {
                            setIsOpen(false);
                            navigate(`/sessions/${m.data.bookingId || m.data.sessionId}`);
                          }}
                          className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <FiZap size={12} />
                          <span>Open Live Charging Dashboard</span>
                        </button>
                      </div>
                    )}

                    {/* ==================================================== */}
                    {/* RICH CARD: COST CALCULATION BREAKDOWN                */}
                    {/* ==================================================== */}
                    {m.type === 'cost_estimate' && m.data && (
                      <div className="mt-3 p-3.5 rounded-xl bg-[var(--bg-surface-raised)] border border-cyan-500/30 space-y-2 text-[11px]">
                        <div className="flex justify-between font-bold text-xs text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-1.5">
                          <span>Battery Capacity:</span>
                          <span className="font-mono text-cyan-500">{m.data.batteryCapacityKwh} kWh</span>
                        </div>
                        <div className="space-y-1 text-[10px] text-[var(--text-secondary)]">
                          <div className="flex justify-between">
                            <span>Energy Required:</span>
                            <span>{m.data.energyRequiredKwh} kWh</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Base Rate:</span>
                            <span>₹{m.data.tariffPerKwh}/kWh</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Energy Cost:</span>
                            <span>₹{m.data.energyCost?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Platform Fee:</span>
                            <span>₹{m.data.platformFee?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>GST (18%):</span>
                            <span>₹{m.data.gstTax?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-black text-xs text-[var(--text-primary)] pt-1 border-t border-[var(--border-subtle)]">
                            <span>Total Estimated Cost:</span>
                            <span className="text-emerald-500 font-mono">₹{m.data.totalEstimatedAmount?.toFixed(2)}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setIsOpen(false);
                            navigate('/customer/book');
                          }}
                          className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <FiZap size={11} />
                          <span>Book Slot at this Rate</span>
                        </button>
                      </div>
                    )}

                    {/* ==================================================== */}
                    {/* RICH CARD: EMERGENCY SAFETY & STUCK CONNECTOR        */}
                    {/* ==================================================== */}
                    {m.type === 'emergency_guide' && m.data && (
                      <div className="mt-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/40 space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-rose-500 font-bold">
                          <FiAlertTriangle size={15} />
                          <span>Safety & Manual Release Guide</span>
                        </div>
                        <div className="space-y-1 text-[10px] text-[var(--text-secondary)] leading-normal">
                          {m.data.safetyProtocol?.map((step, sIdx) => (
                            <div key={sIdx} className="bg-[var(--bg-surface)] p-1.5 rounded border border-[var(--border-subtle)]">
                              {step}
                            </div>
                          ))}
                        </div>
                        <a
                          href="tel:18008898658"
                          className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition text-center"
                        >
                          <FiPhone size={13} className="animate-bounce" />
                          <span>Call 24x7 SOS Hotline: {m.data.emergencyHotline}</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <span className="text-[9px] text-[var(--text-muted)] mt-1 px-1 font-mono">
                    {m.time}
                  </span>

                  {/* Suggestion Chips */}
                  {m.suggestions && Array.isArray(m.suggestions) && idx === messages.length - 1 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 max-w-[95%]">
                      {m.suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => handleSend(sug)}
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 border border-blue-500/30 transition-all cursor-pointer"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-surface)] p-3 rounded-2xl border border-[var(--border-subtle)] w-60 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce delay-100" />
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce delay-200" />
                  <span className="text-[10px] font-mono">Querying EV Database...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* 3. QUICK ACTION CHIPS HORIZONTAL SCROLLER */}
            <div className="px-3 py-2 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleSend(action.prompt)}
                  className="px-2.5 py-1 bg-[var(--bg-surface-raised)] hover:bg-blue-600 hover:text-white border border-[var(--border-subtle)] rounded-full text-[10px] text-[var(--text-secondary)] hover:text-white font-bold whitespace-nowrap transition cursor-pointer"
                >
                  {action.label}
                </button>
              ))}
            </div>

            {/* 4. INPUT & VOICE CONTROLS */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] flex items-center gap-2 shrink-0"
            >
              {/* Voice Speech-To-Text Button */}
              <button
                type="button"
                onClick={toggleListening}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/40'
                    : 'bg-[var(--bg-surface-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
                }`}
                title={isListening ? 'Listening... click to stop' : 'Voice Input (Hands-free)'}
              >
                {isListening ? <FiMicOff size={16} /> : <FiMic size={16} />}
              </button>

              {/* Text Input Field */}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? 'Listening to your voice...' : 'Ask VoltBot (e.g., Track booking EV000053)...'}
                className="theme-input flex-1 px-3.5 py-2.5 rounded-2xl text-xs"
              />

              {/* Submit Send Button */}
              <button
                type="submit"
                disabled={!input.trim()}
                className="w-10 h-10 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center font-bold transition shadow-md shadow-blue-500/20 cursor-pointer"
                title="Send Message"
              >
                <FiSend size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
