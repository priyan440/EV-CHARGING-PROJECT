/**
 * chargingSimulatorService.js
 * What-If Charging Simulator Engine for EV Charging System.
 * Simulates non-linear charging taper curves, calculates precise energy requirements,
 * duration, cost, range additions, and compares multi-station charging options.
 */

export const chargingSimulatorService = {
  /**
   * Calculate charging physics & economics with Li-ion taper curve
   */
  simulateCharging: (params) => {
    const {
      batteryCapacity = 40.5,
      currentSoc = 20,
      targetSoc = 80,
      chargerKw = 60,
      vehicleMaxKw = 50,
      pricePerKwh = 18.5,
      serviceFee = 20,
      taxRate = 0.18,
      kmPerKwh = 7.4,
    } = params;

    const boundedCurrent = Math.max(0, Math.min(99, parseInt(currentSoc, 10) || 0));
    const boundedTarget = Math.max(boundedCurrent + 1, Math.min(100, parseInt(targetSoc, 10) || 80));
    const deltaSoc = boundedTarget - boundedCurrent;

    // Total net energy required (kWh)
    const energyRequiredKwh = parseFloat((((deltaSoc) / 100) * batteryCapacity).toFixed(2));

    // Non-linear duration calculation (Tapering above 80% SOC)
    const effectiveMaxKw = Math.min(chargerKw, vehicleMaxKw || 60);

    let durationHours = 0;

    // Fast charge phase: up to 80%
    const fastPhaseStart = boundedCurrent;
    const fastPhaseEnd = Math.min(80, boundedTarget);
    if (fastPhaseEnd > fastPhaseStart) {
      const fastKwh = ((fastPhaseEnd - fastPhaseStart) / 100) * batteryCapacity;
      const effectiveFastKw = Math.max(7, effectiveMaxKw * 0.9); // 90% thermal efficiency
      durationHours += fastKwh / effectiveFastKw;
    }

    // Tapering phase: above 80% (Power progressively scales down to 20-35% to protect cells)
    if (boundedTarget > 80) {
      const taperPhaseStart = Math.max(80, boundedCurrent);
      const taperPhaseEnd = boundedTarget;
      const taperKwh = ((taperPhaseEnd - taperPhaseStart) / 100) * batteryCapacity;
      const effectiveTaperKw = Math.max(3.3, effectiveMaxKw * 0.32); // Tapering rate
      durationHours += taperKwh / effectiveTaperKw;
    }

    const totalMinutes = Math.max(5, Math.round(durationHours * 60));

    // Financial calculations
    const energyCost = energyRequiredKwh * pricePerKwh;
    const subtotal = energyCost + serviceFee;
    const taxAmount = subtotal * taxRate;
    const totalCost = parseFloat((subtotal + taxAmount).toFixed(2));

    // Estimated range gained
    const rangeGainedKm = Math.round(energyRequiredKwh * kmPerKwh);

    // Completion timestamp
    const now = new Date();
    const completionDate = new Date(now.getTime() + totalMinutes * 60000);
    const completionTimeStr = completionDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    return {
      currentSoc: boundedCurrent,
      targetSoc: boundedTarget,
      deltaSoc,
      batteryCapacity,
      chargerKw,
      energyRequiredKwh,
      totalMinutes,
      formattedDuration: totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m` : `${totalMinutes} mins`,
      energyCost: parseFloat(energyCost.toFixed(2)),
      serviceFee,
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      totalCost,
      rangeGainedKm,
      completionTimeStr,
    };
  },

  /**
   * Generate multi-option comparison matrix based on user's priority
   */
  compareOptions: (inputs, priority = "BALANCED") => {
    const { batteryCapacity = 40.5, currentSoc = 20, targetSoc = 80 } = inputs;

    const baseOptions = [
      {
        id: "OPT_AC",
        name: "Standard AC Charger",
        stationName: "Forum Vijaya Mall Station",
        chargerType: "Type 2 AC",
        powerKw: 22,
        pricePerKwh: 14.0,
        distanceKm: 3.2,
        availability: "Available",
        waitingQueue: "No wait",
      },
      {
        id: "OPT_DC_FAST",
        name: "DC Fast Charger",
        stationName: "Tata Power EZ Charge",
        chargerType: "CCS2 Fast",
        powerKw: 60,
        pricePerKwh: 18.5,
        distanceKm: 4.8,
        availability: "Available",
        waitingQueue: "No wait",
      },
      {
        id: "OPT_HYPER",
        name: "HyperCharge Ultra",
        stationName: "Jio-bp Pulse Express Hub",
        chargerType: "CCS2 Ultra",
        powerKw: 120,
        pricePerKwh: 21.0,
        distanceKm: 6.5,
        availability: "Available",
        waitingQueue: "No wait",
      },
      {
        id: "OPT_ALT_STATION",
        name: "Zeon Industrial Pod",
        stationName: "Zeon Charging Guindy",
        chargerType: "CCS2 SuperCharge",
        powerKw: 150,
        pricePerKwh: 19.5,
        distanceKm: 8.1,
        availability: "2 in Queue",
        waitingQueue: "6 mins",
      },
    ];

    // Compute simulation for each option
    const calculatedOptions = baseOptions.map((opt) => {
      const sim = chargingSimulatorService.simulateCharging({
        batteryCapacity,
        currentSoc,
        targetSoc,
        chargerKw: opt.powerKw,
        pricePerKwh: opt.pricePerKwh,
      });

      return {
        ...opt,
        durationMinutes: sim.totalMinutes,
        formattedDuration: sim.formattedDuration,
        cost: sim.totalCost,
        energyKwh: sim.energyRequiredKwh,
        rangeGained: sim.rangeGainedKm,
      };
    });

    // Score according to selected priority
    let recommendedId = "OPT_DC_FAST";
    if (priority === "LOWEST_COST") {
      const cheapest = [...calculatedOptions].sort((a, b) => a.cost - b.cost)[0];
      recommendedId = cheapest?.id || "OPT_AC";
    } else if (priority === "FASTEST") {
      const fastest = [...calculatedOptions].sort((a, b) => a.durationMinutes - b.durationMinutes)[0];
      recommendedId = fastest?.id || "OPT_HYPER";
    } else if (priority === "NEAREST") {
      const nearest = [...calculatedOptions].sort((a, b) => a.distanceKm - b.distanceKm)[0];
      recommendedId = nearest?.id || "OPT_AC";
    } else {
      // Balanced: best combination of duration, cost and distance
      const sorted = [...calculatedOptions].sort((a, b) => {
        const scoreA = a.durationMinutes * 0.4 + a.cost * 0.4 + a.distanceKm * 2;
        const scoreB = b.durationMinutes * 0.4 + b.cost * 0.4 + b.distanceKm * 2;
        return scoreA - scoreB;
      });
      recommendedId = sorted[0]?.id || "OPT_DC_FAST";
    }

    return calculatedOptions.map((opt) => ({
      ...opt,
      isRecommended: opt.id === recommendedId,
    }));
  },
};
