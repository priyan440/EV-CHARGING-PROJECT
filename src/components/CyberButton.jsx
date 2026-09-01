import React from 'react';
import { motion } from 'framer-motion';

const CyberButton = ({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  className = '',
  disabled = false,
  icon: Icon
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/25 border-0';
      case 'secondary':
        return 'bg-sky-500 hover:bg-sky-600 text-white font-bold shadow-md shadow-sky-500/20 border-0';
      case 'accent':
        return 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md border-0';
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md border-0';
      case 'glass':
        return 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 font-bold shadow-xs';
      default:
        return 'bg-blue-600 text-white font-bold';
    }
  };

  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer select-none text-sm outline-none tracking-wide disabled:opacity-50 disabled:cursor-not-allowed ${getVariantStyles()} ${className}`}
    >
      {Icon && <Icon className="w-4.5 h-4.5" />}
      {children}
    </motion.button>
  );
};

export default CyberButton;
