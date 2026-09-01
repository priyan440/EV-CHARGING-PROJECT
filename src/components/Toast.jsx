import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiCheckCircle, FiAlertCircle, FiInfo, FiXCircle, FiX } from "react-icons/fi";

function Toast({ message, type = "success", onClose }) {
  if (!message) return null;

  const icons = {
    success: <FiCheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />,
    error: <FiXCircle className="w-5 h-5 text-rose-500 shrink-0" />,
    warning: <FiAlertCircle className="w-5 h-5 text-amber-500 shrink-0" />,
    info: <FiInfo className="w-5 h-5 text-sky-500 shrink-0" />,
  };

  const borderColors = {
    success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
    error: "border-rose-500/40 bg-rose-500/10 text-rose-900 dark:text-rose-200",
    warning: "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200",
    info: "border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-200",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className={`fixed top-5 right-5 z-50 p-4 rounded-2xl border shadow-2xl backdrop-blur-md flex items-center gap-3 max-w-md ${
          borderColors[type] || borderColors.success
        }`}
      >
        {icons[type] || icons.success}
        <span className="text-xs font-bold flex-1 leading-snug">{message}</span>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800/20 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <FiX size={16} />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default Toast;
