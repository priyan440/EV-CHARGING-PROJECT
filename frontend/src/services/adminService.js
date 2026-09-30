import api from "./api";

export const adminService = {
  // Get real-time SQL statistics
  getStats: async () => {
    try {
      const res = await api.get("/admin/stats");
      return res.data;
    } catch (err) {
      console.warn("adminService getStats error:", err.message);
      return { success: false, stats: null };
    }
  },

  // Get all registered platform users
  getUsers: async () => {
    try {
      const res = await api.get("/admin/users");
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  // Get all station owners
  getOwners: async () => {
    try {
      const res = await api.get("/admin/owners");
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  // Get pending owners awaiting approval
  getPendingOwners: async () => {
    try {
      const res = await api.get("/admin/pending-owners");
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  approveOwner: async (ownerId) => {
    try {
      const res = await api.put(`/admin/owners/${ownerId}/approve`);
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  rejectOwner: async (ownerId) => {
    try {
      const res = await api.put(`/admin/owners/${ownerId}/reject`);
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  // Get all admin stations
  getStations: async () => {
    try {
      const res = await api.get("/admin/stations");
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  // Get pending stations awaiting approval
  getPendingStations: async () => {
    try {
      const res = await api.get("/admin/pending-stations");
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  approveStation: async (stationId) => {
    try {
      const res = await api.put(`/admin/stations/${stationId}/approve`);
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  rejectStation: async (stationId) => {
    try {
      const res = await api.put(`/admin/stations/${stationId}/reject`);
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  suspendStation: async (stationId) => {
    try {
      const res = await api.put(`/admin/stations/${stationId}/suspend`);
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  // Networks
  getPendingNetworks: async () => {
    try {
      const res = await api.get("/admin/pending-networks");
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  approveNetwork: async (networkId) => {
    try {
      const res = await api.put(`/admin/networks/${networkId}/approve`);
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  rejectNetwork: async (networkId) => {
    try {
      const res = await api.put(`/admin/networks/${networkId}/reject`);
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  // Update user role
  updateUserRole: async (userId, role) => {
    try {
      const res = await api.put(`/admin/users/${userId}/role`, { role });
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },
};

export default adminService;
