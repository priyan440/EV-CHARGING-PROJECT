/**
 * pricingCalculator.js
 * Utility to calculate time-of-day and utilization-based dynamic charging tariffs.
 */

export const DEFAULT_PRICING_RULE = {
  peak_start: "18:00:00",
  peak_end: "21:00:00",
  peak_multiplier: 1.25,
  offpeak_discount: 0.15,
  utilization_threshold: 0.75,
  max_multiplier: 1.50,
};

/**
 * Normalize time input to HH:MM:SS format
 */
export function normalizeTimeString(timeInput) {
  if (!timeInput) {
    const now = new Date();
    return now.toTimeString().split(" ")[0]; // "HH:MM:SS"
  }

  // Handle ISO string e.g. "2026-09-22T18:30:00.000Z"
  if (typeof timeInput === "string" && timeInput.includes("T")) {
    const timePart = timeInput.split("T")[1];
    return timePart.slice(0, 8);
  }

  // Handle "02:00 PM" format
  if (typeof timeInput === "string" && (timeInput.includes("AM") || timeInput.includes("PM"))) {
    const [timeVal, modifier] = timeInput.trim().split(" ");
    let [hours, minutes] = timeVal.split(":");
    let h = parseInt(hours, 10);
    if (modifier.toUpperCase() === "PM" && h < 12) h += 12;
    if (modifier.toUpperCase() === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${minutes || "00"}:00`;
  }

  // Handle "14:30" format
  if (typeof timeInput === "string" && timeInput.includes(":")) {
    const parts = timeInput.split(":");
    const h = String(parseInt(parts[0], 10) || 0).padStart(2, "0");
    const m = String(parseInt(parts[1], 10) || 0).padStart(2, "0");
    const s = String(parseInt(parts[2], 10) || 0).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  return "12:00:00";
}

/**
 * Compute dynamic price quote for a station
 */
export function computeDynamicPrice({
  basePricePerKwh = 18.0,
  time = null,
  slots = [],
  rule = null,
}) {
  const activeRule = rule ? { ...DEFAULT_PRICING_RULE, ...rule } : DEFAULT_PRICING_RULE;
  const timeStr = normalizeTimeString(time);

  // 1. Time of Day Evaluation
  let timeMultiplier = 1.0;
  let isPeak = false;
  let isOffPeak = false;

  const peakStart = activeRule.peak_start || "18:00:00";
  const peakEnd = activeRule.peak_end || "21:00:00";

  if (timeStr >= peakStart && timeStr <= peakEnd) {
    isPeak = true;
    timeMultiplier = parseFloat(activeRule.peak_multiplier) || 1.25;
  } else if (timeStr >= "23:00:00" || timeStr <= "06:00:00") {
    isOffPeak = true;
    timeMultiplier = 1.0 - (parseFloat(activeRule.offpeak_discount) || 0.15);
  }

  // 2. Station Utilization Evaluation
  let utilization = 0;
  let utilizationMultiplier = 1.0;

  if (Array.isArray(slots) && slots.length > 0) {
    const occupied = slots.filter(
      (s) => s.status === "OCCUPIED" || s.status === "RESERVED" || s.rawStatus === "OCCUPIED" || s.rawStatus === "RESERVED"
    ).length;
    utilization = occupied / slots.length;

    const threshold = parseFloat(activeRule.utilization_threshold) || 0.75;
    if (utilization >= threshold && threshold < 1.0) {
      const surgeIntensity = (utilization - threshold) / (1.0 - threshold);
      utilizationMultiplier = 1.0 + surgeIntensity * 0.20; // Up to +20% surge for high congestion
    }
  }

  // 3. Combined Multiplier Capping
  const rawMultiplier = timeMultiplier * utilizationMultiplier;
  const maxCap = parseFloat(activeRule.max_multiplier) || 1.50;
  const minFloor = 1.0 - (parseFloat(activeRule.offpeak_discount) || 0.15);

  const finalMultiplier = Math.max(minFloor, Math.min(maxCap, rawMultiplier));
  const roundedMultiplier = Math.round(finalMultiplier * 100) / 100;
  const effectivePricePerKwh = Math.round(basePricePerKwh * finalMultiplier * 100) / 100;

  // 4. Live Badge Generation
  const percentageDelta = Math.round((finalMultiplier - 1.0) * 100);
  let badge = "Standard Rate";
  let badgeType = "standard";

  if (percentageDelta > 0) {
    badge = `Peak +${percentageDelta}%`;
    badgeType = "peak";
  } else if (percentageDelta < 0) {
    badge = `Off-peak ${percentageDelta}%`;
    badgeType = "discount";
  }

  return {
    basePricePerKwh: parseFloat(basePricePerKwh),
    effectivePricePerKwh,
    multiplier: roundedMultiplier,
    percentageDelta,
    isPeak,
    isOffPeak,
    badge,
    badgeType,
    time: timeStr,
    utilization: Math.round(utilization * 100) / 100,
    rule: activeRule,
  };
}

export default {
  DEFAULT_PRICING_RULE,
  normalizeTimeString,
  computeDynamicPrice,
};
