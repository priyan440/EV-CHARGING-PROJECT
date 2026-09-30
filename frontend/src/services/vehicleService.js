// Vehicle Management Service connected to MySQL Backend API with Local Storage sync
import api from "./api";
import { getNextVehicleId } from "../utils/idGenerator";

const VEHICLES_KEY = "ev_vehicles";

const INITIAL_VEHICLES = [
  {
    id: 1,
    vehicleId: "VEH001",
    customerId: "CUS0003",
    userId: 3,
    ownerName: "Priyan Customer",
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
    isPrimary: true,
  },
  {
    id: 2,
    vehicleId: "VEH002",
    customerId: "CUS0003",
    userId: 3,
    ownerName: "Priyan Customer",
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
    isPrimary: false,
  },
];

function getStoredVehicles() {
  try {
    const existing = localStorage.getItem(VEHICLES_KEY);
    if (existing) {
      const parsed = JSON.parse(existing);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Ignore error
  }
  return INITIAL_VEHICLES;
}

export const vehicleService = {
  // Fetch vehicles directly from MySQL Backend
  fetchVehicles: async () => {
    try {
      const res = await api.get("/vehicles");
      if (res.data?.success && Array.isArray(res.data.data)) {
        localStorage.setItem(VEHICLES_KEY, JSON.stringify(res.data.data));
        return res.data.data;
      }
    } catch (err) {
      console.warn("vehicleService.fetchVehicles offline fallback:", err.message);
    }
    return getStoredVehicles();
  },

  // Synchronous getter for instant UI render
  getVehicles: (customerId = null) => {
    const list = getStoredVehicles();
    if (!customerId) return list;
    const filtered = list.filter(
      (v) =>
        (v.customerId || "").toUpperCase() === customerId.toUpperCase() ||
        (v.userId && `CUS${String(v.userId).padStart(4, "0")}` === customerId.toUpperCase())
    );
    return filtered.length > 0 ? filtered : list;
  },

  getVehicleById: (id) => {
    const list = getStoredVehicles();
    return list.find((v) => v.id === id || v.vehicleId === id || String(v.id) === String(id)) || list[0] || null;
  },

  // Add vehicle: persists to MySQL and updates local cache
  addVehicle: async (vehicleData) => {
    const list = getStoredVehicles();

    const payload = {
      vehicle_number: (vehicleData.vehicleNumber || vehicleData.number || "TN01EV0001").toUpperCase().trim(),
      vehicle_type: vehicleData.vehicleType || "Car",
      brand: vehicleData.brand || vehicleData.manufacturer || "Tata Motors",
      model: vehicleData.model || "Nexon EV Max",
      battery_capacity: parseFloat(vehicleData.batteryCapacity) || 40.5,
    };

    let backendVehicle = null;
    try {
      const res = await api.post("/vehicles", payload);
      if (res.data?.success && res.data.data) {
        backendVehicle = res.data.data;
      }
    } catch (err) {
      console.warn("vehicleService.addVehicle backend notice:", err.message);
    }

    const newId = backendVehicle ? backendVehicle.id : getNextVehicleId();
    const newVehicle = {
      id: newId,
      vehicleId: `VEH${String(newId).padStart(3, "0")}`,
      customerId: vehicleData.customerId || "CUS0001",
      ownerName: vehicleData.ownerName || "Priyan",
      manufacturer: payload.brand,
      brand: payload.brand,
      model: payload.model,
      vehicleNumber: payload.vehicle_number,
      vehicleType: payload.vehicle_type,
      batteryCapacity: payload.battery_capacity,
      batteryPercentage: parseInt(vehicleData.batteryPercentage, 10) || 70,
      connectorType: vehicleData.connectorType || "CCS2",
      range: Math.round(payload.battery_capacity * 7.5),
      isPrimary: list.length === 0,
      createdAt: new Date().toISOString(),
    };

    const updatedList = [newVehicle, ...list.filter((v) => v.vehicleNumber !== newVehicle.vehicleNumber)];
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(updatedList));
    return newVehicle;
  },

  // Update vehicle: updates MySQL and local cache
  updateVehicle: async (id, updates) => {
    try {
      const payload = {
        vehicle_number: updates.vehicleNumber || updates.vehicle_number,
        vehicle_type: updates.vehicleType || updates.vehicle_type,
        brand: updates.brand || updates.manufacturer,
        model: updates.model,
        battery_capacity: updates.batteryCapacity || updates.battery_capacity,
      };
      await api.put(`/vehicles/${id}`, payload);
    } catch (err) {
      console.warn("vehicleService.updateVehicle backend notice:", err.message);
    }

    const list = getStoredVehicles();
    const updatedList = list.map((v) => {
      if (v.id === id || String(v.id) === String(id)) {
        return { ...v, ...updates };
      }
      return v;
    });
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(updatedList));
    return updatedList.find((v) => v.id === id || String(v.id) === String(id));
  },

  // Delete vehicle: deletes from MySQL and local cache
  deleteVehicle: async (id) => {
    try {
      await api.delete(`/vehicles/${id}`);
    } catch (err) {
      console.warn("vehicleService.deleteVehicle backend notice:", err.message);
    }

    const list = getStoredVehicles();
    const updatedList = list.filter((v) => v.id !== id && String(v.id) !== String(id));
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(updatedList));
    return updatedList;
  },

  setPrimaryVehicle: (id, customerId = null) => {
    const list = getStoredVehicles();
    const updatedList = list.map((v) => ({
      ...v,
      isPrimary: v.id === id || String(v.id) === String(id),
    }));
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(updatedList));
    return updatedList;
  },
};

export default vehicleService;
