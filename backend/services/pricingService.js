/**
 * Centralized Backend EV Charging Price Calculation Service
 */

export const DEFAULT_PRICING_CONFIG = {
  defaultRatePerKwh: 18.0,
  defaultServiceFee: 20.0,
  defaultTaxPercent: 18.0, // 18% GST
};

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

  const calcEnergyKwh =
    energyKwh !== null && energyKwh !== undefined && !isNaN(energyKwh) && energyKwh > 0
      ? parseFloat(energyKwh)
      : Math.round(cleanCap * (socDelta / 100) * 10) / 10;

  const subtotal = Math.round(calcEnergyKwh * cleanRate * 100) / 100;
  const cleanServiceFee = Math.max(0, parseFloat(serviceFee) || 0);
  const taxableAmount = subtotal + cleanServiceFee;
  const tax = Math.round(taxableAmount * (taxPercent / 100) * 100) / 100;
  const cleanDiscount = Math.max(0, parseFloat(discount) || 0);
  const totalAmount = Math.max(0, Math.round((subtotal + cleanServiceFee + tax - cleanDiscount) * 100) / 100);

  return {
    chargingRate: cleanRate,
    durationMinutes: parseInt(durationMinutes, 10) || 60,
    energyKwh: calcEnergyKwh,
    subtotal,
    serviceFee: cleanServiceFee,
    tax,
    taxPercent,
    discount: cleanDiscount,
    totalAmount,
  };
}

export default {
  DEFAULT_PRICING_CONFIG,
  calculateChargingPrice,
};
