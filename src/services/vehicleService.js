// Vehicle Management Service with localStorage persistence
import { getNextVehicleId } from "../utils/idGenerator";

const VEHICLES_KEY = "ev_vehicles";

const INITIAL_VEHICLES = [
  {
    id: "VEH001",
    customerId: "CUS0001",
    ownerName: "Priyan",
    manufacturer: "Tata Motors",
    brand: "Tata Motors",
    model: "Nexon EV Max",
    vehicleNumber: "TN58AB1234",
    vehicleType: "Car",
    batteryCapacity: 40.5,
    batteryPercentage: 65,
    connectorType: "CCS2",
    maxChargingPower: 50,
    range: 312,
    color: "Intensi-Teal",
    registrationYear: 2023,
    registrationDate: "2023-04-12",
    lastChargingSession: "Yesterday, 04:30 PM",
    isPrimary: true,
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    metrics: {
      batteryHealth: 98,
      totalChargedKwh: 486.2,
      sessionsCount: 19,
      avgChargingTimeMins: 42,
      avgChargingCost: 320,
      co2SavedKg: 408.4,
    },
  },
  {
    id: "VEH002",
    customerId: "CUS0001",
    ownerName: "Priyan",
    manufacturer: "MG Motor",
    brand: "MG Motor",
    model: "ZS EV Exclusive",
    vehicleNumber: "TN01AB5678",
    vehicleType: "Car",
    batteryCapacity: 50.3,
    batteryPercentage: 42,
    connectorType: "CCS2",
    maxChargingPower: 60,
    range: 461,
    color: "Glaze Red",
    registrationYear: 2024,
    registrationDate: "2024-01-18",
    lastChargingSession: "3 days ago",
    isPrimary: false,
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    metrics: {
      batteryHealth: 100,
      totalChargedKwh: 231.5,
      sessionsCount: 8,
      avgChargingTimeMins: 48,
      avgChargingCost: 380,
      co2SavedKg: 194.5,
    },
  },
  {
    id: "VEH003",
    customerId: "CUS0002",
    ownerName: "Rajesh Kumar",
    manufacturer: "Tata Motors",
    brand: "Tata Motors",
    model: "Nexon EV Prime",
    vehicleNumber: "TN69AZ7708",
    vehicleType: "Car",
    batteryCapacity: 30.2,
    batteryPercentage: 65,
    connectorType: "CCS2",
    maxChargingPower: 30,
    range: 260,
    color: "Signature Teal Blue",
    registrationYear: 2022,
    registrationDate: "2022-09-05",
    lastChargingSession: "4 days ago",
    isPrimary: true,
    createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
    metrics: {
      batteryHealth: 94,
      totalChargedKwh: 580.0,
      sessionsCount: 26,
      avgChargingTimeMins: 50,
      avgChargingCost: 290,
      co2SavedKg: 487.2,
    },
  },
];

function initVehicles() {
  try {
    const existing = localStorage.getItem(VEHICLES_KEY);
    if (!existing) {
      localStorage.setItem(VEHICLES_KEY, JSON.stringify(INITIAL_VEHICLES));
      return INITIAL_VEHICLES;
    }
    const parsed = JSON.parse(existing);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(VEHICLES_KEY, JSON.stringify(INITIAL_VEHICLES));
      return INITIAL_VEHICLES;
    }
    return parsed;
  } catch {
    return INITIAL_VEHICLES;
  }
}

export const vehicleService = {
  getVehicles: (customerId = null) => {
    const list = initVehicles();
    if (!customerId) return list;
    const filtered = list.filter(
      (v) => (v.customerId || "").toUpperCase() === customerId.toUpperCase()
    );
    return filtered.length > 0 ? filtered : list;
  },

  getVehicleById: (id) => {
    const list = initVehicles();
    return list.find((v) => v.id === id || v.id === `VEH_${id}`) || list[0] || null;
  },

  addVehicle: (vehicleData) => {
    const list = initVehicles();
    const newId = getNextVehicleId();
    const isFirstForCustomer = !list.some(
      (v) => v.customerId === (vehicleData.customerId || "CUS0001")
    );

    const newVehicle = {
      id: newId,
      customerId: vehicleData.customerId || "CUS0001",
      ownerName: vehicleData.ownerName || "Priyan",
      manufacturer: vehicleData.manufacturer || vehicleData.brand || "Tata Motors",
      brand: vehicleData.brand || vehicleData.manufacturer || "Tata Motors",
      model: vehicleData.model || "Nexon EV Max",
      vehicleNumber: (vehicleData.vehicleNumber || vehicleData.number || "TN01EV0001").toUpperCase(),
      vehicleType: vehicleData.vehicleType || "Car",
      batteryCapacity: parseFloat(vehicleData.batteryCapacity || vehicleData.batteryCapacityKb) || 40.5,
      batteryPercentage: parseInt(vehicleData.batteryPercentage, 10) || 50,
      connectorType: vehicleData.connectorType || vehicleData.connector || "CCS2",
      maxChargingPower: parseFloat(vehicleData.maxChargingPower) || 50,
      range: parseInt(vehicleData.range, 10) || Math.round((parseFloat(vehicleData.batteryCapacity) || 40) * 7.5),
      color: vehicleData.color || "Midnight Navy",
      registrationYear: parseInt(vehicleData.registrationYear, 10) || new Date().getFullYear(),
      registrationDate: vehicleData.registrationDate || new Date().toISOString().split("T")[0],
      lastChargingSession: "Never",
      isPrimary: vehicleData.isPrimary !== undefined ? vehicleData.isPrimary : isFirstForCustomer,
      createdAt: new Date().toISOString(),
      metrics: {
        batteryHealth: 100,
        totalChargedKwh: 0,
        sessionsCount: 0,
        avgChargingTimeMins: 35,
        avgChargingCost: 0,
        co2SavedKg: 0,
      },
    };

    // If set to primary, unset others for this customer
    let updatedList = list;
    if (newVehicle.isPrimary) {
      updatedList = list.map((v) =>
        v.customerId === newVehicle.customerId ? { ...v, isPrimary: false } : v
      );
    }

    updatedList.unshift(newVehicle);
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(updatedList));
    return newVehicle;
  },

  updateVehicle: (id, updates) => {
    const list = initVehicles();
    const updatedList = list.map((v) => {
      if (v.id === id) {
        return { ...v, ...updates };
      }
      return v;
    });
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(updatedList));
    return updatedList.find((v) => v.id === id);
  },

  deleteVehicle: (id) => {
    const list = initVehicles();
    const updatedList = list.filter((v) => v.id !== id);
    // If deleted vehicle was primary and remaining vehicles exist, make first one primary
    const deletedWasPrimary = list.find((v) => v.id === id)?.isPrimary;
    if (deletedWasPrimary && updatedList.length > 0) {
      updatedList[0].isPrimary = true;
    }
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(updatedList));
    return updatedList;
  },

  setPrimaryVehicle: (id, customerId = null) => {
    const list = initVehicles();
    const updatedList = list.map((v) => {
      if (customerId && v.customerId !== customerId) return v;
      return {
        ...v,
        isPrimary: v.id === id,
      };
    });
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(updatedList));
    return updatedList;
  },
};
