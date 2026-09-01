import mongoose from "mongoose";

const systemSettingSchema = new mongoose.Schema(
  {
    taxPercentage: { type: Number, default: 18 },
    serviceFee: { type: Number, default: 20 },
    platformCommissionPercent: { type: Number, default: 5 },
    bookingHoldMinutes: { type: Number, default: 10 },
    noShowGraceMinutes: { type: Number, default: 15 },
    cancellationPolicy: {
      moreThan2HoursRefundPercent: { type: Number, default: 100 },
      oneToTwoHoursRefundPercent: { type: Number, default: 75 },
      lessThan1HourRefundPercent: { type: Number, default: 50 }
    },
    peakPricingRateMultiplier: { type: Number, default: 1.25 }
  },
  { timestamps: true }
);

export const SystemSetting = mongoose.model("SystemSetting", systemSettingSchema);
