import { query } from "../config/db.js";

/**
 * Calculate charging session bill based on active MySQL database tariff
 */
export const calculateSessionBill = async ({
  ownerId = "OWNER0001",
  stationId = null,
  chargerType = "DC Fast",
  energyKwh = 0,
  durationMinutes = 0,
  idleMinutes = 0,
  startTime = new Date(),
}) => {
  let tariff = null;

  try {
    let sql = "SELECT * FROM tariffs WHERE 1=1";
    const params = [];
    if (stationId) {
      sql += " AND station_id = ?";
      params.push(stationId);
    }
    sql += " ORDER BY id DESC LIMIT 1";

    const rows = await query(sql, params);
    if (rows && rows.length > 0) {
      tariff = {
        pricePerKwh: parseFloat(rows[0].rate_per_kwh) || 18.0,
        connectionFee: parseFloat(rows[0].base_fee) || 0.0,
        peakPrice: parseFloat(rows[0].peak_rate) || 22.0,
        offPeakPrice: parseFloat(rows[0].off_peak_rate) || 14.0,
        taxPercent: parseFloat(rows[0].tax_percentage) || 18.0,
        peakStart: "18:00",
        peakEnd: "22:00",
      };
    }
  } catch (err) {
    console.warn("Tariff query fallback notice:", err.message);
  }

  // Default fallback tariff if none in MySQL
  if (!tariff) {
    tariff = {
      pricePerKwh: 18.0,
      pricePerMinute: 0.0,
      connectionFee: 20.0,
      idleFee: 0.0,
      peakPrice: 22.0,
      offPeakPrice: 14.0,
      peakStart: "18:00",
      peakEnd: "22:00",
      taxPercent: 18.0,
    };
  }

  // Determine if start time falls into peak hours
  const dateObj = new Date(startTime);
  const currentHour = dateObj.getHours();
  const currentMin = dateObj.getMinutes();
  const currentTimeVal = currentHour * 60 + currentMin;

  const [peakStartH, peakStartM] = (tariff.peakStart || "18:00").split(":").map(Number);
  const [peakEndH, peakEndM] = (tariff.peakEnd || "22:00").split(":").map(Number);
  const peakStartVal = peakStartH * 60 + peakStartM;
  const peakEndVal = peakEndH * 60 + peakEndM;

  const isPeak = currentTimeVal >= peakStartVal && currentTimeVal <= peakEndVal;
  const ratePerKwh = isPeak ? tariff.peakPrice : tariff.pricePerKwh;

  // Energy & Duration Cost Calculation
  const energyCost = Math.round(energyKwh * ratePerKwh * 100) / 100;
  const timeCost = Math.round(durationMinutes * (tariff.pricePerMinute || 0) * 100) / 100;
  const connectionFee = tariff.connectionFee || 0;
  const idleFee = Math.round(idleMinutes * (tariff.idleFee || 0) * 100) / 100;

  const subtotal = Math.round((energyCost + timeCost + connectionFee + idleFee) * 100) / 100;
  const taxRate = (tariff.taxPercent || 18) / 100;
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

  return {
    energyKwh,
    durationMinutes,
    ratePerKwh,
    isPeak,
    energyCost,
    timeCost,
    connectionFee,
    idleFee,
    subtotal,
    taxAmount,
    totalAmount,
    currency: "INR",
  };
};

export default { calculateSessionBill };
