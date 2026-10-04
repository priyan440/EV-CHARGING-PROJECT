import api from "./api";

/**
 * Service for Helpdesk & Complaints Ticketing
 * Interacts directly with Express & MySQL backend.
 */
export const complaintService = {
  getComplaints: async () => {
    try {
      const res = await api.get("/complaints");
      return res.data?.data || res.data || [];
    } catch (err) {
      console.warn("Error fetching complaints from MySQL:", err.message);
      return [];
    }
  },

  getComplaintById: async (id) => {
    const res = await api.get(`/complaints/${id}`);
    return res.data?.data || res.data;
  },

  createComplaint: async (complaintData) => {
    const res = await api.post("/complaints", complaintData);
    return res.data;
  },

  updateComplaint: async (id, updateData) => {
    const res = await api.put(`/complaints/${id}`, updateData);
    return res.data;
  },
};

export default complaintService;
