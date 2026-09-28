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
