import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 text-slate-900 dark:text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-extrabold text-lg tracking-tight">{title}</h3>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <FiX size={20} />
              </button>
            )}
          </div>

          {/* Body */}
          <div>{children}</div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default Modal;
