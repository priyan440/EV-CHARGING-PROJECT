import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  FiMessageSquare,
  FiActivity,
  FiCompass,
} from 'react-icons/fi';
import { useSystemState } from '../contexts/SystemStateContext';
import { useAuth } from '../contexts/AuthContext';
import { processChatbotMessage } from '../services/chatbotService';

// Audio tone synthesizer for notification chimes (Web Audio API)
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
    // AudioContext blocked or not supported
  }
};

const QUICK_ACTIONS = [
  { id: 'stations', label: '⚡ Live Stations', prompt: 'Check live charging stations availability near me' },
  { id: 'bookings', label: '🔍 Track Booking', prompt: 'Track my active charging booking status' },
  { id: 'tariff', label: '💰 Tariff Calculator', prompt: 'Calculate charging cost and time for Tata Nexon EV 20% to 80%' },
  { id: 'emergency', label: '🚨 Emergency SOS', prompt: 'Emergency connector stuck in car and station fault' },
  { id: 'connectors', label: '🔌 Connector Guide', prompt: 'Show EV connector types and compatibility' },
];

const INITIAL_MESSAGES = [
  {
    sender: 'bot',
    text: `⚡ **Greetings! I am VoltBot AI 2.0**, your real-time EV charging copilot.

I am connected live to station telemetry across the network. How can I power up your journey today?`,
    type: 'text',
    suggestions: [
      '⚡ Check Live Stations in Chennai',
      '🔍 Track My Booking Status',
      '💰 Estimate Cost for Tata Nexon EV',
      '🚨 Connector is Stuck / Emergency',
    ],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
];

export default function VoltBotChatbot() {
  const navigate = useNavigate();
  const { stations, bookings, systemSettings } = useSystemState();
  const { currentUser } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceOutEnabled, setVoiceOutEnabled] = useState(false);
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

  // Persist session history
  useEffect(() => {
    try {
      sessionStorage.setItem('voltbot_history', JSON.stringify(messages));
    } catch {
      // Storage quota
    }
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  // Dismiss tooltip after 8s
  useEffect(() => {
    const timer = setTimeout(() => setShowTooltip(false), 9000);
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
    } catch {
      // Speech synthesis error
    }
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

  const handleSend = (textToSend) => {
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

    // Context for live query checking
    const ctx = {
      stations: stations || [],
      bookings: bookings || [],
      currentUser: currentUser || null,
      systemSettings: systemSettings || {},
    };

    setTimeout(() => {
      const botResponse = processChatbotMessage(query, ctx);
      const newBotMsg = {
        ...botResponse,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, newBotMsg]);
      setIsTyping(false);
      if (soundEnabled) playChime('receive');
      if (voiceOutEnabled) speakText(botResponse.text);
    }, 600);
  };

  const clearChat = () => {
    setMessages(INITIAL_MESSAGES);
    sessionStorage.removeItem('voltbot_history');
  };

  // Format simple markdown into bold text & linebreaks
  const renderFormattedText = (txt) => {
    if (!txt) return null;
    const lines = txt.split('\n');
    return lines.map((line, idx) => {
      // Split bold markers **word**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={idx} className={line.trim() === '' ? 'h-2' : 'min-h-[1.25rem]'}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-bold text-slate-900 dark:text-white">
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
                <span className="font-bold text-blue-400">Ask VoltBot AI 2.0</span>: Real-time stations, bookings & tariff checks!
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTooltip(false);
                }}
                className="text-slate-400 hover:text-white p-0.5"
              >
                <FiX size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The Main Glowing Trigger Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setIsOpen(!isOpen);
            setShowTooltip(false);
          }}
          className="relative group flex items-center gap-2.5 px-4 sm:px-5 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold rounded-full shadow-xl shadow-blue-500/35 border border-white/20 cursor-pointer overflow-hidden transition-all duration-300"
          aria-label="Open VoltBot AI Chatbot"
        >
          {/* Animated Sheen effect */}
          <div className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000" />

          {/* Pulse ring indicator */}
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" />
          </span>

          <FiZap className="w-5 h-5 text-amber-300 group-hover:rotate-12 transition-transform duration-300 shrink-0" />

          <span className="text-xs sm:text-sm font-black tracking-wide">
            {isOpen ? 'Close VoltBot' : 'Ask VoltBot AI'}
          </span>

          {!isOpen && (
            <span className="hidden sm:inline-block text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono font-semibold">
              Live 2.0
            </span>
          )}
        </motion.button>
      </div>

      {/* ============================================================ */}
      {/* CHAT DRAWER / WINDOW                                         */}
      {/* ============================================================ */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.92 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed bottom-22 right-3 sm:right-6 z-50 bg-white/95 dark:bg-[#091124]/95 backdrop-blur-2xl border border-slate-200 dark:border-blue-900/60 shadow-2xl rounded-3xl overflow-hidden flex flex-col transition-all duration-300 ${
              isExpanded
                ? 'w-[95vw] sm:w-[580px] h-[85vh] max-h-[740px]'
                : 'w-[92vw] sm:w-[420px] h-[580px] max-h-[80vh]'
            }`}
          >
            {/* 1. HEADER */}
            <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 via-[#0B1530] to-slate-900 text-white border-b border-slate-800 flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-black shadow-md shadow-blue-500/30">
                    <FiZap size={20} className="text-amber-300" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-black text-sm text-white tracking-wide">VoltBot AI</h4>
                    <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-300 text-[9px] font-mono font-bold rounded-md border border-blue-500/30">
                      TELEMETRY
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Checking Online
                    </span>
                    <span>•</span>
                    <span className="font-mono text-cyan-400">{stations?.length || 24} Stations Live</span>
                  </div>
                </div>
              </div>

              {/* Header Action Tools */}
              <div className="flex items-center gap-1">
                {/* Voice Read Aloud Toggle */}
                <button
                  onClick={() => setVoiceOutEnabled(!voiceOutEnabled)}
                  className={`p-2 rounded-xl text-xs transition cursor-pointer ${
                    voiceOutEnabled ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title={voiceOutEnabled ? 'Voice Output ON' : 'Voice Output Muted'}
                >
                  {voiceOutEnabled ? <FiVolume2 size={15} /> : <FiVolumeX size={15} />}
                </button>

                {/* Sound chime toggle */}
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-2 rounded-xl text-xs transition cursor-pointer ${
                    soundEnabled ? 'text-blue-400 hover:text-blue-300' : 'text-slate-500'
                  }`}
                  title={soundEnabled ? 'Sound Chimes Enabled' : 'Sound Chimes Disabled'}
                >
                  <FiActivity size={15} />
                </button>

                {/* Expand / Minimize Window */}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer hidden sm:block"
                  title={isExpanded ? 'Restore Normal Size' : 'Expand Size'}
                >
                  {isExpanded ? <FiMinimize2 size={15} /> : <FiMaximize2 size={15} />}
                </button>

                {/* Clear Chat */}
                <button
                  onClick={clearChat}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                  title="Clear Chat History"
                >
                  <FiTrash2 size={15} />
                </button>

                {/* Close Drawer */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer ml-1"
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>

            {/* 2. REAL-TIME TELEMETRY STATS BANNER */}
            <div className="bg-slate-100 dark:bg-slate-900/90 px-3.5 py-1.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 font-mono shrink-0">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>GRID TELEMETRY: OPTIMAL</span>
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                LATENCY: ~12ms
              </span>
            </div>

            {/* 3. MESSAGES STREAM */}
            <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3.5 bg-slate-50 dark:bg-[#070D1E]/70 text-slate-800 dark:text-slate-100">
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
                        : 'bg-white dark:bg-[#0F1B38] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-blue-900/40 rounded-tl-none shadow-slate-200/50 dark:shadow-none'
                    }`}
                  >
                    {/* Render Text Body */}
                    <div className="space-y-1.5">{renderFormattedText(m.text)}</div>

                    {/* ==================================================== */}
                    {/* RICH CARD: LIVE STATIONS LIST                        */}
                    {/* ==================================================== */}
                    {m.type === 'station_list' && Array.isArray(m.data) && (
                      <div className="mt-3 space-y-2 border-t border-slate-200 dark:border-slate-800 pt-2.5">
                        <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block font-mono">
                          Live Station Telemetry:
                        </span>
                        {m.data.map((st) => {
                          const availCount = st.chargers?.filter((c) => c.status === 'Available').length || 0;
                          const totalCount = st.chargers?.length || 0;
                          return (
                            <div
                              key={st.id}
                              className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B1530] border border-slate-200 dark:border-blue-900/50 space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h5 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                                    {st.name}
                                  </h5>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                    <FiMapPin size={11} className="text-blue-500" />
                                    <span>{st.location || st.city}</span>
                                    <span>•</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                      {st.operator || 'VoltHub'}
                                    </span>
                                  </p>
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold shrink-0 ${
                                    availCount > 0
                                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                                      : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                                  }`}
                                >
                                  {availCount > 0 ? `${availCount}/${totalCount} Free` : 'Fully Occupied'}
                                </span>
                              </div>

                              {/* Chargers breakdown */}
                              <div className="flex flex-wrap gap-1">
                                {st.chargers?.slice(0, 3).map((chg, cIdx) => (
                                  <span
                                    key={cIdx}
                                    className="text-[9px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono"
                                  >
                                    ⚡ {chg.connector} {chg.powerKw}kW (₹{chg.pricePerKwh}/kWh)
                                  </span>
                                ))}
                              </div>

                              {/* Interactive Actions */}
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  onClick={() => {
                                    setIsOpen(false);
                                    navigate(`/customer/book?stationId=${st.id}`);
                                  }}
                                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer shadow-xs"
                                >
                                  <FiZap size={11} />
                                  <span>Book Slot</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setIsOpen(false);
                                    navigate(`/customer/stations/${st.id}`);
                                  }}
                                  className="py-1.5 px-2.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-[10px] transition cursor-pointer"
                                >
                                  Details
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ==================================================== */}
                    {/* RICH CARD: REAL-TIME BOOKING TRACKING                */}
                    {/* ==================================================== */}
                    {m.type === 'booking_card' && m.data && (
                      <div className="mt-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B1530] border border-blue-200 dark:border-blue-900/60 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                              {m.data.bookingId}
                            </span>
                            <button
                              onClick={() => handleCopy(m.data.bookingId, m.data.bookingId)}
                              className="text-slate-400 hover:text-blue-500"
                              title="Copy Booking ID"
                            >
                              {copiedId === m.data.bookingId ? <FiCheck size={12} className="text-emerald-500" /> : <FiCopy size={12} />}
                            </button>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                            {m.data.status || 'Confirmed'}
                          </span>
                        </div>

                        <div className="space-y-1 text-[11px]">
                          <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                            📍 {m.data.stationName || 'VoltHub Station'}
                          </p>
                          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[10px]">
                            <span>📅 {m.data.date}</span>
                            <span>⏰ {m.data.time}</span>
                            <span>⏳ {m.data.duration}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-300 pt-1">
                            <span>Vehicle: <b>{m.data.vehicleModel || m.data.vehicleNumber || 'Tata Nexon EV'}</b></span>
                            <span className="font-mono font-bold text-blue-600 dark:text-cyan-400">
                              ₹{m.data.totalAmount || '238.10'} ({m.data.paymentStatus || 'Paid'})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => {
                              setIsOpen(false);
                              navigate(`/booking/verify/${m.data.bookingId}`);
                            }}
                            className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <FiCheckCircle size={12} />
                            <span>View Digital QR Pass</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsOpen(false);
                              navigate(`/customer/bookings`);
                            }}
                            className="py-1.5 px-2.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[10px] font-semibold"
                          >
                            All Bookings
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ==================================================== */}
                    {/* RICH CARD: TARIFF & TIME ESTIMATOR                   */}
                    {/* ==================================================== */}
                    {m.type === 'tariff_calculator' && m.data && (
                      <div className="mt-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B1530] border border-cyan-300 dark:border-cyan-900/60 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            ⚡ {m.data.vehicleName}
                          </span>
                          <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                            {m.data.batteryKwh} kWh Pack
                          </span>
                        </div>

                        {/* Battery calculation range */}
                        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] space-y-1">
                          <div className="flex justify-between font-semibold">
                            <span>Charge Range: {m.data.startPct}% → {m.data.targetPct}%</span>
                            <span className="text-blue-600 dark:text-blue-400">+{m.data.energyNeededKwh} kWh</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden flex">
                            <div style={{ width: `${m.data.startPct}%` }} className="bg-amber-400 h-full" />
                            <div style={{ width: `${m.data.targetPct - m.data.startPct}%` }} className="bg-emerald-500 h-full animate-pulse" />
                          </div>
                        </div>

                        {/* Charging times comparison */}
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900">
                            <span className="text-slate-500 dark:text-slate-400 block">50kW DC Fast</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400 text-xs">
                              ~{m.data.fastTimeMins} mins
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <span className="text-slate-500 dark:text-slate-400 block">7.2kW AC Wallbox</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                              ~{(m.data.acTimeMins / 60).toFixed(1)} hrs
                            </span>
                          </div>
                        </div>

                        {/* Price breakdown */}
                        <div className="pt-1 text-[10px] space-y-0.5 text-slate-600 dark:text-slate-300">
                          <div className="flex justify-between">
                            <span>Base Energy ({m.data.energyNeededKwh} kWh @ ₹{m.data.ratePerKwh})</span>
                            <span>₹{m.data.baseAmount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Platform Service Fee</span>
                            <span>₹{m.data.serviceFee}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>18% GST</span>
                            <span>₹{m.data.tax}</span>
                          </div>
                          <div className="flex justify-between font-bold text-xs text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
                            <span>Estimated Total</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-mono">₹{m.data.totalCost}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setIsOpen(false);
                            navigate('/customer/book');
                          }}
                          className="w-full py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <FiZap size={12} />
                          <span>Reserve Charging Bay at this Rate</span>
                        </button>
                      </div>
                    )}

                    {/* ==================================================== */}
                    {/* RICH CARD: EMERGENCY RESCUE PROTOCOL                 */}
                    {/* ==================================================== */}
                    {m.type === 'emergency_card' && m.data && (
                      <div className="mt-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 space-y-2.5 text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
                          <FiAlertTriangle size={16} />
                          <span>Immediate Safe Actions Required</span>
                        </div>

                        <div className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300 leading-normal">
                          {m.data.steps?.map((step, sIdx) => (
                            <div key={sIdx} className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-rose-200 dark:border-rose-900/60">
                              {renderFormattedText(step)}
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <a
                            href={`tel:${m.data.hotline}`}
                            className="flex-1 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/30 transition text-center"
                          >
                            <FiPhone size={14} className="animate-bounce" />
                            <span>Call SOS Hotline: {m.data.hotline}</span>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Message Timestamp */}
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 px-1 font-mono">
                    {m.time}
                  </span>

                  {/* Suggestion Chips */}
                  {m.suggestions && Array.isArray(m.suggestions) && idx === messages.length - 1 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 max-w-[95%]">
                      {m.suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => handleSend(sug)}
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-600 hover:text-white text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/70 transition-all cursor-pointer shadow-2xs"
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
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-white dark:bg-[#0F1B38] p-3 rounded-2xl border border-slate-200 dark:border-blue-900/40 w-36 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce delay-100" />
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce delay-200" />
                  <span className="text-[10px] font-mono text-slate-400">Checking...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* 4. QUICK ACTION CHIPS HORIZONTAL SCROLLER */}
            <div className="px-3 py-2 bg-white dark:bg-[#091124] border-t border-slate-200 dark:border-slate-800 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleSend(action.prompt)}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800/80 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 border border-slate-200 dark:border-slate-700 rounded-full text-[10px] text-slate-700 dark:text-slate-300 font-bold whitespace-nowrap transition cursor-pointer"
                >
                  {action.label}
                </button>
              ))}
            </div>

            {/* 5. INPUT & VOICE CONTROLS */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 bg-white dark:bg-[#091124] border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0"
            >
              {/* Voice Speech-To-Text Button */}
              <button
                type="button"
                onClick={toggleListening}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/40'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
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
                placeholder={isListening ? 'Listening to your voice...' : 'Ask VoltBot (e.g., Check slots in Chennai)...'}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-medium"
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
