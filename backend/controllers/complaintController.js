import { query } from "../config/db.js";
import { getIO } from "../services/socketService.js";

/**
 * Format complaint row for client response
 */
export const formatComplaint = (c) => {
  if (!c) return null;
  return {
    id: c.id,
    complaintId: c.complaint_code || `CMP${String(c.id).padStart(6, "0")}`,
    complaintCode: c.complaint_code || `CMP${String(c.id).padStart(6, "0")}`,
    userId: c.user_id,
    customerName: c.customer_name || c.user_name || "User",
    customerEmail: c.customer_email || c.user_email || "",
    customerPhone: c.customer_phone || "",
    bookingId: c.booking_code || (c.booking_id ? `EV${String(c.booking_id).padStart(6, "0")}` : null),
    stationId: c.station_id,
    stationName: c.station_name || "EV Charging Station",
    stationAddress: c.station_address || "",
    ownerId: c.owner_id,
    ownerName: c.owner_name,
    subject: c.subject,
    category: c.subject,
    description: c.description,
    message: c.description,
    priority: c.priority || "MEDIUM",
    status: c.status || "OPEN",
    assignedTo: c.assigned_to,
    assignedName: c.assigned_name,
    resolution: c.resolution || "",
    resolvedAt: c.resolved_at,
    createdAt: c.created_at,
    date: c.created_at,
    updatedAt: c.updated_at,
  };
};

const COMPLAINTS_BASE_SQL = `
  SELECT 
    c.*,
    u.name as customer_name,
    u.email as customer_email,
    u.phone as customer_phone,
    s.station_name,
    s.address as station_address,
    s.owner_id,
    o.name as owner_name,
    b.booking_id as booking_code,
    a.name as assigned_name
  FROM complaints c
  JOIN users u ON c.user_id = u.id
  LEFT JOIN stations s ON c.station_id = s.id
  LEFT JOIN users o ON s.owner_id = o.id
  LEFT JOIN bookings b ON c.booking_id = b.id
  LEFT JOIN users a ON c.assigned_to = a.id
`;

/**
 * GET /api/complaints
 * Fetches complaints according to role:
 * - ADMIN: all complaints
 * - STATION_OWNER / OWNER: complaints for stations owned by this owner
 * - USER / CUSTOMER: complaints created by this user
 */
export const getComplaints = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = (req.user.role || "").toUpperCase();

    let sql = COMPLAINTS_BASE_SQL;
    let params = [];

    if (role === "ADMIN") {
      sql += " ORDER BY c.id DESC";
    } else if (role === "STATION_OWNER" || role === "OWNER") {
      sql += " WHERE s.owner_id = ? ORDER BY c.id DESC";
      params.push(userId);
    } else {
      sql += " WHERE c.user_id = ? ORDER BY c.id DESC";
      params.push(userId);
    }

    const rows = await query(sql, params);
    const data = (rows || []).map(formatComplaint).filter(Boolean);

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Get Complaints Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching complaints from MySQL.",
      error: error.message,
    });
  }
};

/**
 * GET /api/complaints/:id
 */
export const getComplaintById = async (req, res) => {
  try {
    const complaintId = req.params.id;
    const userId = req.user.id;
    const role = (req.user.role || "").toUpperCase();

    const isNum = /^\d+$/.test(complaintId);
    const sql = `${COMPLAINTS_BASE_SQL} WHERE c.id = ? OR c.complaint_code = ? LIMIT 1`;
    const rows = await query(sql, [isNum ? parseInt(complaintId, 10) : 0, complaintId]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: "Complaint not found." });
    }

    const c = rows[0];

    // Role ownership check
    if (role !== "ADMIN") {
      if ((role === "STATION_OWNER" || role === "OWNER") && c.owner_id !== userId) {
        return res.status(403).json({ success: false, message: "Unauthorized access to this station's complaint." });
      }
      if (role === "USER" && c.user_id !== userId) {
        return res.status(403).json({ success: false, message: "Unauthorized access to this complaint." });
      }
    }

    res.json({
      success: true,
      data: formatComplaint(c),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching complaint details.", error: error.message });
  }
};

/**
 * POST /api/complaints
 * User raises a new complaint
 */
export const createComplaint = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      station_id,
      stationId,
      booking_id,
      bookingId,
      subject,
      category,
      description,
      priority = "MEDIUM",
    } = req.body;

    const cleanSubject = (subject || category || "").trim();
    const cleanDesc = (description || "").trim();

    if (!cleanSubject || !cleanDesc) {
      return res.status(400).json({
        success: false,
        message: "Subject/category and description are required to submit a complaint.",
      });
    }

    // Resolve numeric station id if station code was passed
    let numericStationId = null;
    const stId = station_id || stationId;
    if (stId) {
      const isNum = /^\d+$/.test(stId);
      const stRows = await query("SELECT id FROM stations WHERE id = ? OR station_id = ?", [
        isNum ? parseInt(stId, 10) : 0,
        String(stId),
      ]);
      if (stRows && stRows.length > 0) {
        numericStationId = stRows[0].id;
      }
    }

    // Resolve numeric booking id if code was passed
    let numericBookingId = null;
    const bkId = booking_id || bookingId;
    if (bkId) {
      const isNum = /^\d+$/.test(bkId);
      const bkRows = await query("SELECT id FROM bookings WHERE id = ? OR booking_id = ?", [
        isNum ? parseInt(bkId, 10) : 0,
        String(bkId),
      ]);
      if (bkRows && bkRows.length > 0) {
        numericBookingId = bkRows[0].id;
      }
    }

    // Generate unique complaint code
    const maxRows = await query("SELECT COALESCE(MAX(id), 0) as maxId FROM complaints");
    const nextId = (maxRows[0]?.maxId || 0) + 1;
    const complaintCode = `CMP${String(nextId).padStart(6, "0")}`;

    const cleanPriority = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes((priority || "").toUpperCase())
      ? priority.toUpperCase()
      : "MEDIUM";

    const result = await query(
      `INSERT INTO complaints 
       (complaint_code, user_id, booking_id, station_id, subject, description, priority, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN')`,
      [complaintCode, userId, numericBookingId, numericStationId, cleanSubject, cleanDesc, cleanPriority]
    );

    const insertedId = result.insertId;
    const createdRows = await query(`${COMPLAINTS_BASE_SQL} WHERE c.id = ?`, [insertedId]);
    const formatted = formatComplaint(createdRows[0]);

    // Real-time notification broadcast
    try {
      const io = getIO();
      if (io) {
        io.emit("COMPLAINT_CREATED", formatted);
      }
    } catch (e) {
      console.warn("Socket broadcast notice:", e.message);
    }

    res.status(201).json({
      success: true,
      message: "Complaint ticket submitted successfully!",
      data: formatted,
    });
  } catch (error) {
    console.error("Create Complaint Error:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting complaint ticket to MySQL.",
      error: error.message,
    });
  }
};

/**
 * PUT /api/complaints/:id
 * Station Owner or Admin updates complaint status / resolution
 */
export const updateComplaint = async (req, res) => {
  try {
    const complaintId = req.params.id;
    const userId = req.user.id;
    const role = (req.user.role || "").toUpperCase();

    const isNum = /^\d+$/.test(complaintId);
    const existing = await query(
      `SELECT c.*, s.owner_id 
       FROM complaints c 
       LEFT JOIN stations s ON c.station_id = s.id 
       WHERE c.id = ? OR c.complaint_code = ? LIMIT 1`,
      [isNum ? parseInt(complaintId, 10) : 0, complaintId]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Complaint not found." });
    }

    const c = existing[0];

    // Permission check: only ADMIN or Station Owner of that station can resolve/update
    if (role !== "ADMIN" && c.owner_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this complaint.",
      });
    }

    const { status, resolution, assigned_to, assignedTo } = req.body;

    let newStatus = c.status;
    if (status) {
      const upper = status.toUpperCase();
      if (["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].includes(upper)) {
        newStatus = upper;
      } else if (upper === "RESOLVE") {
        newStatus = "RESOLVED";
      }
    }

    const newResolution = resolution !== undefined ? resolution : c.resolution;
    const newAssigned = assigned_to || assignedTo || c.assigned_to;
    const isNowResolved = newStatus === "RESOLVED" || newStatus === "CLOSED";
    const resolvedAt = isNowResolved ? new Date() : (newStatus === "OPEN" ? null : c.resolved_at);

    await query(
      `UPDATE complaints 
       SET status = ?, resolution = ?, assigned_to = ?, resolved_at = ?
       WHERE id = ?`,
      [newStatus, newResolution, newAssigned, resolvedAt, c.id]
    );

    const updatedRows = await query(`${COMPLAINTS_BASE_SQL} WHERE c.id = ?`, [c.id]);
    const formatted = formatComplaint(updatedRows[0]);

    // Real-time notification broadcast
    try {
      const io = getIO();
      if (io) {
        io.emit("COMPLAINT_UPDATED", formatted);
      }
    } catch (e) {
      console.warn("Socket broadcast notice:", e.message);
    }

    res.json({
      success: true,
      message: `Complaint ticket status updated to ${newStatus}.`,
      data: formatted,
    });
  } catch (error) {
    console.error("Update Complaint Error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating complaint.",
      error: error.message,
    });
  }
};
