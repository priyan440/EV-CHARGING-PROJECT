// Vehicle Management Service connected to MySQL Backend API
import api from "./api";

export const vehicleService = {
  // Fetch vehicles directly from MySQL Backend for authenticated user
  fetchVehicles: async () => {
    try {
      const res = await api.get("/vehicles");
      if (res.data?.success && Array.isArray(res.data.data)) {
        return res.data.data;
      }
      if (Array.isArray(res.data)) {
        return res.data;
      }
      return [];
    } catch (err) {
      console.warn("vehicleService.fetchVehicles error:", err.message);
      return [];
    }
  },

  // Alias for getVehicles (async)
  getVehicles: async () => {
    return vehicleService.fetchVehicles();
  },

  // Fetch vehicles for specific user
  getUserVehicles: async (userId) => {
    try {
      const res = await api.get(`/vehicles/user/${userId}`);
      return res.data?.data || [];
    } catch (err) {
      console.warn("vehicleService.getUserVehicles error:", err.message);
      return [];
    }
  },

  getVehicleById: async (id) => {
    try {
      const res = await api.get(`/vehicles/${id}`);
      if (res.data?.success && res.data.data) {
        return res.data.data;
      }
      return null;
    } catch (err) {
      console.warn("vehicleService.getVehicleById error:", err.message);
      return null;
    }
  },

  // Get all standard connector types (CCS2, Type 2, CHAdeMO, GB/T)
  getConnectorTypes: async () => {
    try {
      const res = await api.get("/connector-types");
      return res.data?.data || [
        { id: 1, connector_name: "CCS2", name: "CCS2", max_power_kw: 350 },
        { id: 2, connector_name: "Type 2", name: "Type 2", max_power_kw: 43 },
        { id: 3, connector_name: "CHAdeMO", name: "CHAdeMO", max_power_kw: 100 },
        { id: 4, connector_name: "GB/T", name: "GB/T", max_power_kw: 120 },
      ];
    } catch (err) {
      console.warn("vehicleService.getConnectorTypes notice:", err.message);
      return [
        { id: 1, connector_name: "CCS2", name: "CCS2", max_power_kw: 350 },
        { id: 2, connector_name: "Type 2", name: "Type 2", max_power_kw: 43 },
        { id: 3, connector_name: "CHAdeMO", name: "CHAdeMO", max_power_kw: 100 },
        { id: 4, connector_name: "GB/T", name: "GB/T", max_power_kw: 120 },
      ];
    }
  },

  // Create / Register vehicle in MySQL database
  createVehicle: async (vehicleData) => {
    const payload = {
      registration_number: (
        vehicleData.registration_number ||
        vehicleData.registrationNumber ||
        vehicleData.vehicleNumber ||
        vehicleData.vehicle_number ||
        vehicleData.number ||
        "TN01EV0001"
      )
        .toUpperCase()
        .replace(/\s+/g, "")
        .trim(),
      vehicle_type: vehicleData.vehicle_type || vehicleData.vehicleType || "Car",
      brand: vehicleData.brand || vehicleData.manufacturer || "Tata Motors",
      model: vehicleData.model || "Nexon EV Max",
      battery_capacity: parseFloat(vehicleData.battery_capacity || vehicleData.batteryCapacity) || 40.5,
      connector_type: vehicleData.connector_type || vehicleData.connectorType || "CCS2",
      connector_type_id: vehicleData.connector_type_id || vehicleData.connectorTypeId,
      max_charging_power_kw: parseFloat(vehicleData.max_charging_power_kw || vehicleData.maxChargingPowerKw) || 50.0,
      current_soc_percent: parseFloat(vehicleData.current_soc_percent || vehicleData.currentSocPercent || vehicleData.batteryPercentage) || 75.0,
    };

    try {
      const res = await api.post("/vehicles", payload);
      const vehicleRecord = res.data?.data || res.data;
      return {
        success: true,
        data: vehicleRecord,
        vehicle: vehicleRecord,
        message: res.data?.message || "Vehicle added successfully!",
      };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to add vehicle";
      return {
        success: false,
        message: msg,
      };
    }
  },

  // Add vehicle: persists to MySQL with connector_type_id
  addVehicle: async (vehicleData) => {
    const res = await vehicleService.createVehicle(vehicleData);
    if (!res.success) {
      throw new Error(res.message);
    }
    return res.data;
  },

  // Update vehicle: updates MySQL
  updateVehicle: async (id, updates) => {
    const payload = {
      vehicle_number: (updates.vehicleNumber || updates.vehicle_number)?.toUpperCase().trim(),
      vehicle_type: updates.vehicleType || updates.vehicle_type,
      brand: updates.brand || updates.manufacturer,
      model: updates.model,
      battery_capacity: parseFloat(updates.batteryCapacity || updates.battery_capacity),
      connector_type: updates.connectorType || updates.connector_type,
      connector_type_id: updates.connectorTypeId || updates.connector_type_id,
    };

    try {
      const res = await api.put(`/vehicles/${id}`, payload);
      if (res.data?.success && res.data.data) {
        return res.data.data;
      }
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to update vehicle";
      throw new Error(msg);
    }
  },

  // Update vehicle latest known battery SOC (manual user reading)
  updateBatteryLevel: async (id, currentSoc) => {
    try {
      const res = await api.patch(`/vehicles/${id}/soc`, { currentSoc: parseFloat(currentSoc) });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to update battery level";
      throw new Error(msg);
    }
  },

  // Get vehicle SOC history
  getVehicleSocHistory: async (id) => {
    try {
      const res = await api.get(`/vehicles/${id}/soc-history`);
      return res.data?.data || [];
    } catch (err) {
      console.warn("getVehicleSocHistory error:", err.message);
      return [];
    }
  },

  // Delete vehicle: deletes from MySQL
  deleteVehicle: async (id) => {
    try {
      const res = await api.delete(`/vehicles/${id}`);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to delete vehicle";
      throw new Error(msg);
    }
  },

  setPrimaryVehicle: async (id) => {
    return id;
  },
};

export default vehicleService;
