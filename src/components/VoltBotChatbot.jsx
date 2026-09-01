import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageSquare, FiX, FiSend, FiZap, FiHelpCircle, FiShield, FiBatteryCharging } from 'react-icons/fi';

const PRESET_PROMPTS = [
  '⚡ Find 250 kW fast chargers near me',
  '📊 How is peak hour tariff calculated?',
  '🔧 What to do if charger connector gets stuck?',
  '🚨 Emergency roadside battery boost'
];

const INITIAL_MESSAGES = [
  {
    sender: 'bot',
    text: 'Greetings! I am **VoltBot**, your AI EV charging assistant. How can I power up your journey today?',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
];

const VoltBotChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMsg = {
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsTyping(true);

    setTimeout(() => {
      let botResponse = "I'm checking our live VoltCharge telemetry. Please make sure your EV connector is locked firmly.";
      const qLower = query.toLowerCase();

      if (qLower.includes('fast') || qLower.includes('charger') || qLower.includes('250')) {
        botResponse = "📍 **Downtown VoltHub HQ** (Station ST001) has 250 kW NACS fast chargers available right now! Current tariff is ₹18.50/kWh.";
      } else if (qLower.includes('tariff') || qLower.includes('price') || qLower.includes('peak')) {
        botResponse = "⚡ Base tariff is **₹18.50/kWh** for AC and **₹22.00/kWh** for Fast DC. Peak hours run between 18:00 and 21:00 with a 1.25x surge factor.";
      } else if (qLower.includes('stuck') || qLower.includes('lock') || qLower.includes('rfid') || qLower.includes('fail')) {
        botResponse = "🔧 If your connector is locked: 1. Stop session from Customer Dashboard. 2. Pull emergency manual unlock ring in your EV trunk lid. 3. Contact Field Tech Dave (TECH001) via Emergency Support tab.";
      } else if (qLower.includes('emergency') || qLower.includes('roadside') || qLower.includes('boost')) {
        botResponse = "🚨 **VoltCharge Mobile Rescue Unit** dispatched alert! Call emergency hotline: **+1 (800) 555-VOLT**. A technician with a portable DC fast pack is standby.";
      } else {
        botResponse = `Thanks for asking! Regarding "${query}", all VoltHub bays feature CCS2 and NACS dual connectors with dynamic load balancing. You can reserve a bay from the Book Charging Slot tab!`;
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: botResponse,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setIsTyping(false);
    }, 700);
  };

  return (
    <>
      {/* FLOATING TRIGGER BUTTON */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-full shadow-lg shadow-blue-500/30 flex items-center gap-2 cursor-pointer text-sm"
      >
        <FiZap className="w-5 h-5 text-white animate-pulse" />
        <span>Ask VoltBot AI</span>
      </motion.button>

      {/* CHAT DRAWER */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-22 right-6 z-50 w-80 sm:w-96 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col h-[500px]"
          >
            {/* CHAT HEADER */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
                  ⚡
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">VoltBot AI Assistant</h4>
                  <span className="text-[10px] text-blue-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                    Online • System Telemetry Connected
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* MESSAGES LIST */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-blue-600 text-white font-medium rounded-tr-none shadow-xs'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-xs'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 px-1">{m.time}</span>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-white p-2.5 rounded-xl border border-slate-200 w-24">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce delay-100" />
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce delay-200" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* PRESET PROMPTS */}
            <div className="p-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar">
              {PRESET_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-600 border border-blue-200 rounded-full text-[10px] text-blue-700 hover:text-white font-bold whitespace-nowrap transition cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* INPUT FIELD */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask VoltBot anything..."
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600 placeholder:text-slate-400 font-medium"
              />
              <button
                type="submit"
                className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold hover:bg-blue-700 transition cursor-pointer"
              >
                <FiSend size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VoltBotChatbot;
