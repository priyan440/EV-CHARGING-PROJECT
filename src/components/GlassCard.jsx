import React from 'react';
import { motion } from 'framer-motion';

const GlassCard = ({ children, className = '', hover = true, onClick, delay = 0 }) => {
  const baseClasses = 'bg-white p-6 rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_-2px_rgba(37,99,235,0.06)] relative overflow-hidden';
  const hoverClasses = hover ? 'hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200 cursor-pointer' : '';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay }}
      className={`${baseClasses} ${hoverClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;
