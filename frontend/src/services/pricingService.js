/**
 * Centralized EV Charging Price Calculation Service
 * Standardized formula used across Booking, Confirmation, Payment, History, Owner Revenue & Admin Analytics.
 */

export const DEFAULT_PRICING_CONFIG = {
  defaultRatePerKwh: 18.0,
  defaultServiceFee: 20.0,
  defaultTaxPercent: 18.0, // 18% GST
  defaultEfficiency: 0.90,  // 90% charger efficiency
};

/**
 * Calculate accurate charging subtotal, service fee, GST tax, discount, and final total amount.
 *
 * @param {Object} params
 * @param {number} params.ratePerKwh - Station/charger configured rate per kWh (or per hour)
 * @param {number} params.batteryCapacityKwh - Vehicle battery capacity in kWh (e.g. 60 kWh)
 * @param {number} params.currentSoc - Current battery state of charge (e.g. 20%)
 * @param {number} params.targetSoc - Target battery state of charge (e.g. 80%)
 * @param {number} [params.energyKwh] - Direct energy required in kWh if already known
 * @param {number} [params.durationMinutes] - Duration in minutes (e.g. 60)
 * @param {number} [params.serviceFee] - Applicable service connection fee (e.g. 20)
 * @param {number} [params.taxPercent] - Applicable GST % (e.g. 18%)
 * @param {number} [params.discount] - Discount amount in INR (e.g. 0)
 * @returns {Object} Comprehensive pricing breakdown
 */
export function calculateChargingPrice({
  ratePerKwh = DEFAULT_PRICING_CONFIG.defaultRatePerKwh,
  batteryCapacityKwh = 60.0,
  currentSoc = 20,
  targetSoc = 80,
  energyKwh = null,
  durationMinutes = 60,
  serviceFee = DEFAULT_PRICING_CONFIG.defaultServiceFee,
  taxPercent = DEFAULT_PRICING_CONFIG.defaultTaxPercent,
  discount = 0.0,
}) {
  const cleanRate = Math.max(1, parseFloat(ratePerKwh) || DEFAULT_PRICING_CONFIG.defaultRatePerKwh);
  const cleanCap = Math.max(5, parseFloat(batteryCapacityKwh) || 60.0);
  const cleanCurSoc = Math.max(0, Math.min(100, parseInt(currentSoc, 10) || 20));
  const cleanTgtSoc = Math.max(cleanCurSoc, Math.min(100, parseInt(targetSoc, 10) || 80));
  const socDelta = cleanTgtSoc - cleanCurSoc;

  // 1. Calculate Required Energy (kWh)
  const calcEnergyKwh =
    energyKwh !== null && energyKwh !== undefined && !isNaN(energyKwh) && energyKwh > 0
      ? parseFloat(energyKwh)
      : Math.round(cleanCap * (socDelta / 100) * 10) / 10;

  // 2. Subtotal (Energy / Charging Cost) = Charging Rate × Energy (or Duration)
  const subtotal = Math.round(calcEnergyKwh * cleanRate * 100) / 100;

  // 3. Applicable Service Fee
  const cleanServiceFee = Math.max(0, parseFloat(serviceFee) || 0);

  // 4. Tax (18% GST on subtotal + service fee)
  const taxableAmount = subtotal + cleanServiceFee;
  const tax = Math.round(taxableAmount * (taxPercent / 100) * 100) / 100;

  // 5. Discount
  const cleanDiscount = Math.max(0, parseFloat(discount) || 0);

  // 6. Final Total Amount = Subtotal + Service Fee + Tax - Discount
  const totalAmount = Math.max(0, Math.round((subtotal + cleanServiceFee + tax - cleanDiscount) * 100) / 100);

  return {
    chargingRate: cleanRate,
    chargingRateFormatted: `₹${cleanRate.toFixed(2)}/kWh`,
    durationMinutes: parseInt(durationMinutes, 10) || 60,
    durationFormatted: `${parseInt(durationMinutes, 10) || 60} mins`,
    energyKwh: calcEnergyKwh,
    energyKwhFormatted: `${calcEnergyKwh.toFixed(1)} kWh`,
    subtotal,
    subtotalFormatted: `₹${subtotal.toFixed(2)}`,
    serviceFee: cleanServiceFee,
    serviceFeeFormatted: `₹${cleanServiceFee.toFixed(2)}`,
    tax,
    taxPercent,
    taxFormatted: `₹${tax.toFixed(2)} (${taxPercent}% GST)`,
    discount: cleanDiscount,
    discountFormatted: `₹${cleanDiscount.toFixed(2)}`,
    totalAmount,
    totalAmountFormatted: `₹${totalAmount.toFixed(2)}`,
  };
}

export default {
  DEFAULT_PRICING_CONFIG,
  calculateChargingPrice,
};
