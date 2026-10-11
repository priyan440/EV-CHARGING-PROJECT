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
    const res = await api.post("/admin/customers", customerData);
    return res.data;
  },

  updateCustomer: async (customerId, customerData) => {
    const res = await api.put(`/admin/customers/${customerId}`, customerData);
    return res.data;
  },

  deleteCustomer: async (customerId) => {
    const res = await api.delete(`/admin/customers/${customerId}`);
    return res.data;
  },

  updateUserRole: async (userId, role) => {
    try {
      const res = await api.put(`/admin/users/${userId}/role`, { role });
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  // 3. Station Owners Management & Verification Center (A. Owner Verification)
  getOwners: async (params = {}) => {
    try {
      const res = await api.get("/admin/owners", { params });
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  createOwner: async (ownerData) => {
    const res = await api.post("/admin/owners", ownerData);
    return res.data;
  },

  updateOwner: async (ownerId, ownerData) => {
    const res = await api.put(`/admin/owners/${ownerId}`, ownerData);
    return res.data;
  },

  deleteOwner: async (ownerId) => {
    const res = await api.delete(`/admin/owners/${ownerId}`);
    return res.data;
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

  rejectOwner: async (ownerId, reason = "Credentials rejected by administrator") => {
    try {
      const res = await api.put(`/admin/owners/${ownerId}/reject`, { reason });
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  suspendOwner: async (ownerId, reason = "Suspended by administrator") => {
    try {
      const res = await api.put(`/admin/owners/${ownerId}/suspend`, { reason });
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  reactivateOwner: async (ownerId) => {
    try {
      const res = await api.put(`/admin/owners/${ownerId}/reactivate`);
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
    const res = await api.post("/admin/technicians", techData);
    return res.data;
  },

  updateTechnician: async (techId, techData) => {
    const res = await api.put(`/admin/technicians/${techId}`, techData);
    return res.data;
  },

  deleteTechnician: async (techId) => {
    const res = await api.delete(`/admin/technicians/${techId}`);
    return res.data;
  },

  // 5. Stations Management & Verification Center (A. Station Verification)
  getStations: async (params = {}) => {
    try {
      const res = await api.get("/admin/stations", { params });
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  getStationPhotos: async (stationId) => {
    try {
      const res = await api.get(`/admin/stations/${stationId}/photos`);
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  createStation: async (stationData) => {
    const res = await api.post("/admin/stations", stationData);
    return res.data;
  },

  updateStation: async (stationId, stationData) => {
    const res = await api.put(`/admin/stations/${stationId}`, stationData);
    return res.data;
  },

  deleteStation: async (stationId) => {
    const res = await api.delete(`/admin/stations/${stationId}`);
    return res.data;
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

  rejectStation: async (stationId, reason = "Station electrical/location parameters rejected") => {
    try {
      const res = await api.put(`/admin/stations/${stationId}/reject`, { reason });
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  suspendStation: async (stationId, reason = "Suspended by administrator") => {
    try {
      const res = await api.put(`/admin/stations/${stationId}/suspend`, { reason });
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  reactivateStation: async (stationId) => {
    try {
      const res = await api.put(`/admin/stations/${stationId}/reactivate`);
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  // 6. Network Live Monitor & Safe Remote Commands (B. Network Live Monitor & Remote Control Safety)
  getNetworkLiveMonitor: async (params = {}) => {
    try {
      const res = await api.get("/admin/network/monitor", { params });
      return res.data;
    } catch (err) {
      return { success: false, data: [], summary: {} };
    }
  },

  sendRemoteCommand: async (chargerId, command, payload = {}, isSimulator = true) => {
    try {
      const res = await api.post(`/admin/chargers/${chargerId}/remote-command`, {
        command,
        payload,
        isSimulator,
      });
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  },

  // 7. Chargers Management (CRUD)
  getChargers: async (params = {}) => {
    try {
      const res = await api.get("/admin/chargers", { params });
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  createCharger: async (chargerData) => {
    const res = await api.post("/admin/chargers", chargerData);
    return res.data;
  },

  updateCharger: async (chargerId, chargerData) => {
    const res = await api.put(`/admin/chargers/${chargerId}`, chargerData);
    return res.data;
  },

  deleteCharger: async (chargerId) => {
    const res = await api.delete(`/admin/chargers/${chargerId}`);
    return res.data;
  },

  // 8. Bookings Management (CRUD)
  getBookings: async (params = {}) => {
    try {
      const res = await api.get("/admin/bookings", { params });
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  createBooking: async (bookingData) => {
    const res = await api.post("/admin/bookings", bookingData);
    return res.data;
  },

  updateBooking: async (bookingId, bookingData) => {
    const res = await api.put(`/admin/bookings/${bookingId}`, bookingData);
    return res.data;
  },

  deleteBooking: async (bookingId) => {
    const res = await api.delete(`/admin/bookings/${bookingId}`);
    return res.data;
  },

  // 9. Payment Reconciliation (D. Payment Reconciliation)
  getPayments: async (params = {}) => {
    try {
      const res = await api.get("/admin/payments", { params });
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  getPaymentsReconciliation: async (params = {}) => {
    try {
      const res = await api.get("/admin/payments/reconciliation", { params });
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  refundPayment: async (paymentId, refundData = {}) => {
    try {
      const res = await api.post(`/admin/payments/${paymentId}/refund`, refundData);
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  },

  updatePayment: async (paymentId, data) => {
    const res = await api.put(`/admin/payments/${paymentId}`, data);
    return res.data;
  },

  // 10. Sessions Management
  getSessions: async (params = {}) => {
    try {
      const res = await api.get("/admin/sessions", { params });
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  // 11. Incident and Maintenance Center (C. Incident and Maintenance Center)
  getMaintenance: async (params = {}) => {
    try {
      const res = await api.get("/admin/maintenance", { params });
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  getIncidents: async (params = {}) => {
    return adminService.getMaintenance(params);
  },

  createIncident: async (incidentData) => {
    const res = await api.post("/admin/incidents", incidentData);
    return res.data;
  },

  updateIncident: async (incidentId, incidentData) => {
    const res = await api.put(`/admin/incidents/${incidentId}`, incidentData);
    return res.data;
  },

  deleteIncident: async (incidentId) => {
    const res = await api.delete(`/admin/incidents/${incidentId}`);
    return res.data;
  },

  createMaintenance: async (data) => {
    return adminService.createIncident(data);
  },

  updateMaintenance: async (id, data) => {
    return adminService.updateIncident(id, data);
  },

  deleteMaintenance: async (id) => {
    return adminService.deleteIncident(id);
  },

  // 12. Security and Audit Center (E. Security and Audit Center)
  getAuditLogs: async (params = {}) => {
    try {
      const res = await api.get("/admin/audit-logs", { params });
      return res.data;
    } catch (err) {
      return { success: false, data: [] };
    }
  },

  // 13. Network Analytics & Reports (F. Network Analytics)
  getAnalytics: async (params = {}) => {
    try {
      const res = await api.get("/admin/analytics", { params });
      return res.data;
    } catch (err) {
      return { success: false, data: {} };
    }
  },

  getReports: async (params = {}) => {
    try {
      const res = await api.get("/admin/reports", { params });
      return res.data;
    } catch (err) {
      return { success: false, data: {} };
    }
  },
};

export default adminService;
