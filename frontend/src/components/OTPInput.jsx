import React, { useRef, useState, useEffect } from "react";

/**
 * Professional 6-Digit EV-Themed OTP Input Component
 * Features: Auto-advance, backspace navigation, paste handling, numeric filtering
 */
export default function OTPInput({ length = 6, value = "", onChange, onComplete, disabled = false }) {
  const [otp, setOtp] = useState(Array(length).fill(""));
  const inputRefs = useRef([]);

  // Sync internal state if parent controls value string
  useEffect(() => {
    if (typeof value === "string") {
      const charArray = value.split("").slice(0, length);
      const newOtp = Array(length).fill("");
      charArray.forEach((char, i) => {
        if (/^\d$/.test(char)) {
          newOtp[i] = char;
        }
      });
      setOtp(newOtp);
    }
  }, [value, length]);

  const handleChange = (e, index) => {
    const val = e.target.value;
    if (!/^\d*$/.test(val)) return; // Allow numbers only

    const digit = val.slice(-1); // Take last entered digit
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    const combined = newOtp.join("");
    if (onChange) onChange(combined);

    // Auto-focus next input box
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Trigger onComplete callback if 6 digits filled
    if (combined.length === length && !combined.includes("")) {
      if (onComplete) onComplete(combined);
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const newOtp = [...otp];

      if (otp[index]) {
        // Clear current box if filled
        newOtp[index] = "";
        setOtp(newOtp);
        if (onChange) onChange(newOtp.join(""));
      } else if (index > 0) {
        // Move to previous box and clear it
        newOtp[index - 1] = "";
        setOtp(newOtp);
        if (onChange) onChange(newOtp.join(""));
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (!/^\d+$/.test(pastedData)) return; // Only numeric paste

    const digits = pastedData.slice(0, length).split("");
    const newOtp = Array(length).fill("");
    digits.forEach((digit, i) => {
      newOtp[i] = digit;
    });

    setOtp(newOtp);
    const combined = newOtp.join("");
    if (onChange) onChange(combined);

    // Focus last filled box or next empty box
    const nextFocusIndex = Math.min(digits.length, length - 1);
    inputRefs.current[nextFocusIndex]?.focus();

    if (combined.length === length) {
      if (onComplete) onComplete(combined);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 my-2" onPaste={handlePaste}>
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-extrabold font-mono rounded-xl border transition-all duration-200 outline-none shadow-sm ${
            digit
              ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/20 scale-[1.03]"
              : "bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-emerald-500/60"}`}
        />
      ))}
    </div>
  );
}
