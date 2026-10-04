import api from "./api";

export const adminService = {
  // 1. Dashboard Statistics
  getStats: async () => {
    try {
      const res = await api.get("/admin/stats");
      return res.data;
    } catch (err) {
      console.warn("adminService getStats error:", err.message);
      return { success: false, stats: null };
    }
  },

  // 2. Customers Management (CRUD)
  getCustomers: async (params = {}) => {
    try {
      const res = await api.get("/admin/customers", { params });
      return res.data;
    } catch (err) {
      console.warn("adminService getCustomers error:", err.message);
      return { success: false, data: [] };
    }
  },

  getUsers: async (params = {}) => {
    return adminService.getCustomers(params);
  },

  getCustomer: async (customerId) => {
    try {
      const res = await api.get(`/admin/customers/${customerId}`);
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  createCustomer: async (customerData) => {
    try {
      const res = await api.post("/admin/customers", customerData);
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  updateCustomer: async (customerId, customerData) => {
    try {
      const res = await api.put(`/admin/customers/${customerId}`, customerData);
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  deleteCustomer: async (customerId) => {
    try {
      const res = await api.delete(`/admin/customers/${customerId}`);
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  updateUserRole: async (userId, role) => {
    try {
      const res = await api.put(`/admin/users/${userId}/role`, { role });
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  // 3. Station Owners Management (CRUD)
  getOwners: async (params = {}) => {
    try {
      const res = await api.get("/admin/owners", { params });
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  createOwner: async (ownerData) => {
    try {
      const res = await api.post("/admin/owners", ownerData);
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  updateOwner: async (ownerId, ownerData) => {
    try {
      const res = await api.put(`/admin/owners/${ownerId}`, ownerData);
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  deleteOwner: async (ownerId) => {
    try {
      const res = await api.delete(`/admin/owners/${ownerId}`);
      return res.data;
    } catch (err) {
      throw err;
    }
  },

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

  // 4. Technicians Management (CRUD)
  getTechnicians: async (params = {}) => {
    try {
      const res = await api.get("/admin/technicians", { params });
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  createTechnician: async (techData) => {
    try {
      const res = await api.post("/admin/technicians", techData);
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  updateTechnician: async (techId, techData) => {
    try {
      const res = await api.put(`/admin/technicians/${techId}`, techData);
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  deleteTechnician: async (techId) => {
    try {
      const res = await api.delete(`/admin/technicians/${techId}`);
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  // 5. Stations Management (CRUD)
  getStations: async (params = {}) => {
    try {
      const res = await api.get("/admin/stations", { params });
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  createStation: async (stationData) => {
    try {
      const res = await api.post("/admin/stations", stationData);
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  updateStation: async (stationId, stationData) => {
    try {
      const res = await api.put(`/admin/stations/${stationId}`, stationData);
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  deleteStation: async (stationId) => {
    try {
      const res = await api.delete(`/admin/stations/${stationId}`);
      return res.data;
    } catch (err) {
      throw err;
    }
  },

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

  // 6. Chargers Management (CRUD)
  getChargers: async (params = {}) => {
    try {
      const res = await api.get("/admin/chargers", { params });
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  createCharger: async (chargerData) => {
    try {
      const res = await api.post("/admin/chargers", chargerData);
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  updateCharger: async (chargerId, chargerData) => {
    try {
      const res = await api.put(`/admin/chargers/${chargerId}`, chargerData);
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  deleteCharger: async (chargerId) => {
    try {
      const res = await api.delete(`/admin/chargers/${chargerId}`);
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  // 7. Bookings Management (CRUD)
  getBookings: async (params = {}) => {
    try {
      const res = await api.get("/admin/bookings", { params });
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  createBooking: async (bookingData) => {
    try {
      const res = await api.post("/admin/bookings", bookingData);
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  updateBooking: async (bookingId, bookingData) => {
    try {
      const res = await api.put(`/admin/bookings/${bookingId}`, bookingData);
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  deleteBooking: async (bookingId) => {
    try {
      const res = await api.delete(`/admin/bookings/${bookingId}`);
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  // 8. Payments Management
  getPayments: async (params = {}) => {
    try {
      const res = await api.get("/admin/payments", { params });
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  updatePayment: async (paymentId, data) => {
    try {
      const res = await api.put(`/admin/payments/${paymentId}`, data);
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  // 9. Sessions Management
  getSessions: async () => {
    try {
      const res = await api.get("/admin/sessions");
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  // 10. Maintenance Management (CRUD)
  getMaintenance: async () => {
    try {
      const res = await api.get("/admin/maintenance");
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  createMaintenance: async (data) => {
    try {
      const res = await api.post("/admin/maintenance", data);
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  updateMaintenance: async (id, data) => {
    try {
      const res = await api.put(`/admin/maintenance/${id}`, data);
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  deleteMaintenance: async (id) => {
    try {
      const res = await api.delete(`/admin/maintenance/${id}`);
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  // 11. Audit Logs
  getAuditLogs: async () => {
    try {
      const res = await api.get("/admin/audit-logs");
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  // 12. Reports
  getReports: async () => {
    try {
      const res = await api.get("/admin/reports");
      return res.data;
    } catch (err) {
      return { success: false, data: {} };
    }
  },
};

export default adminService;
