/**
 * vehicleHealthService.js
 * EV Vehicle Health & Battery Analytics Service.
 * Provides battery diagnostics, charging behavior analysis, health degradation trends, and preservation tips.
 */

export const vehicleHealthService = {
  /**
   * Compute comprehensive vehicle health metrics for any EV vehicle
   */
  getVehicleHealthProfile: (vehicle) => {
    if (!vehicle) return null;

    const batteryCap = parseFloat(vehicle.batteryCapacity) || 40.5;
    const currentSoc = parseInt(vehicle.batteryPercentage, 10) || 65;
    const baseRange = vehicle.range || Math.round(batteryCap * 7.5);
    const estimatedRange = Math.round((currentSoc / 100) * baseRange);

    // Deterministic metrics based on registration / vehicle data
    const metrics = vehicle.metrics || {};
    const batteryHealth = metrics.batteryHealth || (vehicle.registrationYear <= 2022 ? 93 : 97);
    const totalSessions = metrics.sessionsCount || 19;
    const totalKwh = metrics.totalChargedKwh || Math.round(totalSessions * 24.8);
    const avgChargingTime = metrics.avgChargingTimeMins || 42;
    const avgCost = metrics.avgChargingCost || 320;

    // Split AC vs DC
    const dcSessions = Math.round(totalSessions * 0.7);
    const acSessions = totalSessions - dcSessions;
    const fastChargingRatio = Math.round((dcSessions / totalSessions) * 100);

    // 6-Month Battery Health Degradation Curve
    const healthTrend = [
      { month: "Month 1", health: 100, rangeKm: baseRange },
      { month: "Month 2", health: 99.5, rangeKm: Math.round(baseRange * 0.995) },
      { month: "Month 3", health: 98.8, rangeKm: Math.round(baseRange * 0.988) },
      { month: "Month 4", health: 98.1, rangeKm: Math.round(baseRange * 0.981) },
      { month: "Month 5", health: 97.4, rangeKm: Math.round(baseRange * 0.974) },
      { month: "Month 6", health: batteryHealth, rangeKm: Math.round((batteryHealth / 100) * baseRange) },
    ];

    // Charging behavior diagnostics
    const behavior = {
      fastChargingRatio: `${fastChargingRatio}% DC Fast`,
      slowChargingRatio: `${100 - fastChargingRatio}% AC Standard`,
      avgDepthOfDischarge: "24% (Healthy margin)",
      chargingFrequency: "3.2 sessions / week",
      preferredChargingTime: "Evening (07:30 PM)",
      temperatureStatus: "Normal (28.4°C)",
      cellVoltageDelta: "0.012 V (Optimal balance)",
      estimatedCyclesCompleted: Math.round(totalKwh / batteryCap) || 48,
    };

    // Smart Recommendations tailored to vehicle habits
    const recommendations = [
      {
        id: "REC_V01",
        type: "LONGEVITY",
        title: "Frequent DC Fast Charging Detected",
        advice: "70% of your recent sessions were high-power DC fast charges. Scheduling an occasional AC slow charge helps equalize cell voltages and extends pack lifespan.",
        priority: "MEDIUM",
        badge: "Battery Chemistry",
      },
      {
        id: "REC_V02",
        type: "CHARGING_LIMIT",
        title: "Optimal Daily Charging Limit: 80%",
        advice: "Setting your regular daily charge limit to 80% reduces thermal strain on lithium-ion cells. Reserve 100% full charges for long-distance road trips.",
        priority: "HIGH",
        badge: "Daily Practice",
      },
      {
        id: "REC_V03",
        type: "TEMPERATURE",
        title: "Pre-Conditioning in Warm Weather",
        advice: "Plug into a level-2 charger 15 minutes before departure to let the battery thermal management system optimize temperatures without depleting driving range.",
        priority: "LOW",
        badge: "Thermal Tip",
      },
    ];

    return {
      vehicleId: vehicle.id,
      vehicleName: `${vehicle.brand || vehicle.manufacturer || "Tata"} ${vehicle.model || "Nexon EV"}`,
      vehicleNumber: vehicle.vehicleNumber || vehicle.number,
      connectorType: vehicle.connectorType || "CCS2",
      batteryCapacityKwh: batteryCap,
      currentBatteryPercentage: currentSoc,
      batteryHealthPercentage: batteryHealth,
      estimatedRangeKm: estimatedRange,
      totalMaxRangeKm: baseRange,
      lastSession: vehicle.lastChargingSession || "Yesterday, 04:30 PM",
      totalSessions,
      acSessions,
      dcSessions,
      totalKwhCharged: totalKwh,
      avgChargingTimeMinutes: avgChargingTime,
      avgCostPerSession: avgCost,
      healthTrend,
      behavior,
      recommendations,
      isCriticalBattery: currentSoc <= 20,
      telemetryDisclaimer: "Simulated Vehicle Telemetry / OBD-II Diagnostic Profile (Ready for OEM Vehicle Telematics API Integration)",
    };
  },
};
