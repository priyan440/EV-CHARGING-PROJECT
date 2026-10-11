import bcrypt from "bcryptjs";
import { query, transaction } from "../config/db.js";
import { formatBooking } from "./bookingController.js";
import {
  emitChargerStatusChanged,
  emitBookingCreated,
  emitBookingUpdated,
  emitPaymentUpdated,
  emitMaintenanceUpdated,
  emitFaultDetected,
  emitStationUpdated,
} from "../services/socketService.js";
import {
  deriveChargerStatus,
  isChargerOnline,
  recordAuditLog,
  CHARGER_STATUSES,
  OWNER_STATUSES,
  STATION_APPROVAL_STATUSES,
} from "../utils/statusMapping.js";

// Helper: Format sequential IDs safely from MySQL table
const getNextSequenceId = async (prefix, table) => {
  try {
    const rows = await query(`SELECT COALESCE(MAX(id), 0) as maxId FROM \`${table}\``);
    const nextNum = (rows[0]?.maxId || 0) + 1;
    return `${prefix}${String(nextNum).padStart(6, "0")}`;
  } catch {
    return `${prefix}${Date.now().toString().slice(-6)}`;
  }
};

/**
 * 1. ADMIN DASHBOARD STATS
 * GET /api/admin/stats & GET /api/admin/dashboard
 * Real database statistics computed strictly via normalized MySQL queries
 */
export const getStats = async (req, res) => {
  try {
    const [userCount] = await query("SELECT COUNT(*) as count FROM users WHERE role IN ('USER', 'CUSTOMER')");
    const [ownerCount] = await query("SELECT COUNT(*) as count FROM users WHERE role IN ('STATION_OWNER', 'OWNER')");
    const [verifiedOwnerCount] = await query("SELECT COUNT(*) as count FROM users WHERE role IN ('STATION_OWNER', 'OWNER') AND status = 'ACTIVE'");
    const [pendingOwnerCount] = await query("SELECT COUNT(*) as count FROM users WHERE role IN ('STATION_OWNER', 'OWNER') AND status = 'PENDING'");
    const [techCount] = await query("SELECT COUNT(*) as count FROM users WHERE role IN ('TECHNICIAN', 'TECH')");
    const [vehicleCount] = await query("SELECT COUNT(*) as count FROM vehicles");

    const [stationCount] = await query("SELECT COUNT(*) as count FROM stations");
    const [activeStationCount] = await query("SELECT COUNT(*) as count FROM stations WHERE status = 'ACTIVE' AND approval_status = 'APPROVED'");
    const [pendingStationCount] = await query("SELECT COUNT(*) as count FROM stations WHERE approval_status = 'PENDING' OR status = 'PENDING'");
    const [rejectedStationCount] = await query("SELECT COUNT(*) as count FROM stations WHERE approval_status = 'REJECTED'");

    const [chargerCount] = await query("SELECT COUNT(*) as count FROM chargers");
    const [availableChargerCount] = await query("SELECT COUNT(*) as count FROM chargers WHERE status = 'AVAILABLE'");
    const [chargingChargerCount] = await query("SELECT COUNT(*) as count FROM chargers WHERE status IN ('CHARGING', 'OCCUPIED')");
    const [faultedChargerCount] = await query("SELECT COUNT(*) as count FROM chargers WHERE status IN ('FAULTED', 'MAINTENANCE')");
    const [offlineChargerCount] = await query(
      "SELECT COUNT(*) as count FROM chargers WHERE status = 'OFFLINE' OR (status != 'CHARGING' AND is_simulated = 0 AND (last_heartbeat IS NULL OR TIMESTAMPDIFF(SECOND, last_heartbeat, NOW()) > heartbeat_timeout_seconds))"
    );

    const [todayBookingCount] = await query(
      "SELECT COUNT(*) as count FROM bookings WHERE DATE(booking_date) = CURRENT_DATE() OR DATE(created_at) = CURRENT_DATE()"
    );
    const [activeBookingCount] = await query(
      "SELECT COUNT(*) as count FROM bookings WHERE booking_status IN ('CONFIRMED', 'ACTIVE', 'IN_PROGRESS', 'PROTECTED', 'CHECKED_IN')"
    );
    const [completedBookingCount] = await query(
      "SELECT COUNT(*) as count FROM bookings WHERE booking_status = 'COMPLETED'"
    );
    const [cancelledBookingCount] = await query(
      "SELECT COUNT(*) as count FROM bookings WHERE booking_status = 'CANCELLED'"
    );

    const [revenueSum] = await query(
      "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_status = 'SUCCESS'"
    );
    const [todayRevenueSum] = await query(
      "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_status = 'SUCCESS' AND (DATE(paid_at) = CURRENT_DATE() OR DATE(created_at) = CURRENT_DATE())"
    );
    const [successPayCount] = await query(
      "SELECT COUNT(*) as count FROM payments WHERE payment_status = 'SUCCESS'"
    );
    const [refundedPayCount] = await query(
      "SELECT COUNT(*) as count FROM payments WHERE payment_status = 'REFUNDED'"
    );

    const [maintCount] = await query("SELECT COUNT(*) as count FROM maintenance_tickets WHERE status NOT IN ('RESOLVED', 'CLOSED')");

    const [activeSessionCount] = await query("SELECT COUNT(*) as count FROM charging_sessions WHERE session_status IN ('CHARGING', 'STARTED', 'ACTIVE')");
    const [completedSessionCount] = await query("SELECT COUNT(*) as count FROM charging_sessions WHERE session_status = 'COMPLETED'");
    const [totalEnergySum] = await query("SELECT COALESCE(SUM(energy_kwh), 0) as totalEnergy FROM charging_sessions");

    const [powerSum] = await query("SELECT COALESCE(SUM(max_power), 0) as totalMaxPower FROM stations WHERE approval_status = 'APPROVED'");
    const totalCapacityKw = parseFloat(powerSum?.totalMaxPower) || 0;

    const stationCapacityList = await query(
      `SELECT s.id, s.station_id, s.station_name, s.city, s.max_power, s.total_slots, s.available_slots, s.status, s.approval_status,
              u.name as owner_name, u.email as owner_email,
              COALESCE((SELECT COUNT(*) FROM chargers c WHERE c.station_id = s.id), 0) as charger_count,
              COALESCE((SELECT COUNT(*) FROM chargers c WHERE c.station_id = s.id AND c.status = 'AVAILABLE'), 0) as available_chargers,
              COALESCE((SELECT COUNT(*) FROM chargers c WHERE c.station_id = s.id AND c.status IN ('CHARGING', 'OCCUPIED')), 0) as charging_now,
              COALESCE((SELECT COUNT(*) FROM bookings b WHERE b.station_id = s.id AND b.booking_status IN ('CONFIRMED', 'ACTIVE', 'IN_PROGRESS')), 0) as active_bookings
       FROM stations s
       LEFT JOIN users u ON s.owner_id = u.id
       ORDER BY s.id ASC`
    );

    const rawRecentBookings = await query(
      `SELECT b.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
              s.station_name, s.address as station_address, s.station_id as station_id_code,
              v.registration_number, v.registration_number as vehicle_number, v.brand, v.model, v.vehicle_type,
              c.charger_name, c.charger_type, c.power_kw
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       LEFT JOIN stations s ON b.station_id = s.id
       LEFT JOIN chargers c ON b.charger_id = c.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       ORDER BY b.id DESC LIMIT 10`
    );
    const recentBookings = rawRecentBookings.map((b) => formatBooking(b));

    const monthlyStats = await query(
      `SELECT DATE_FORMAT(COALESCE(paid_at, created_at), '%b') as month,
              COUNT(id) as bookings,
              COALESCE(SUM(amount), 0) as revenue
       FROM payments 
       WHERE payment_status = 'SUCCESS'
       GROUP BY DATE_FORMAT(COALESCE(paid_at, created_at), '%b'), MONTH(COALESCE(paid_at, created_at))
       ORDER BY MONTH(COALESCE(paid_at, created_at)) ASC`
    );

    res.json({
      success: true,
      stats: {
        totalUsers: (userCount?.count || 0) + (ownerCount?.count || 0) + (techCount?.count || 0),
        totalCustomers: userCount?.count || 0,
        totalStationOwners: ownerCount?.count || 0,
        verifiedOwners: verifiedOwnerCount?.count || 0,
        pendingOwners: pendingOwnerCount?.count || 0,
        totalOwners: ownerCount?.count || 0,
        totalTechnicians: techCount?.count || 0,
        totalVehicles: vehicleCount?.count || 0,
        totalStations: stationCount?.count || 0,
        totalChargingStations: stationCount?.count || 0,
        activeStations: activeStationCount?.count || 0,
        pendingApprovals: pendingStationCount?.count || 0,
        pendingStations: pendingStationCount?.count || 0,
        rejectedStations: rejectedStationCount?.count || 0,
        totalChargers: chargerCount?.count || 0,
        totalChargingSlots: chargerCount?.count || 0,
        totalConnectors: chargerCount?.count || 0,
        availableSlots: availableChargerCount?.count || 0,
        availableChargers: availableChargerCount?.count || 0,
        chargingChargers: chargingChargerCount?.count || 0,
        chargingNow: chargingChargerCount?.count || 0,
        faultedChargers: faultedChargerCount?.count || 0,
        offlineChargers: offlineChargerCount?.count || 0,
        occupiedSlots: Math.max(0, (chargerCount?.count || 0) - (availableChargerCount?.count || 0)),
        activeSessions: activeSessionCount?.count || 0,
        completedSessions: completedSessionCount?.count || 0,
        totalEnergyKwh: parseFloat(totalEnergySum?.totalEnergy) || 0,
        todayBookings: todayBookingCount?.count || 0,
        activeBookings: activeBookingCount?.count || 0,
        completedBookings: completedBookingCount?.count || 0,
        cancelledBookings: cancelledBookingCount?.count || 0,
        totalBookings: (activeBookingCount?.count || 0) + (completedBookingCount?.count || 0) + (cancelledBookingCount?.count || 0),
        successfulPayments: successPayCount?.count || 0,
        refundedPayments: refundedPayCount?.count || 0,
        todayRevenue: parseFloat(todayRevenueSum?.total) || 0,
        totalRevenue: parseFloat(revenueSum?.total) || 0,
        revenue: parseFloat(revenueSum?.total) || 0,
        activeFaults: maintCount?.count || 0,
        unresolvedFaults: maintCount?.count || 0,
        pendingMaintenance: maintCount?.count || 0,
        maintenanceTickets: maintCount?.count || 0,
        totalMaxPower: totalCapacityKw,
      },
      stationCapacityList,
      recentBookings,
      monthlyStats,
    });
  } catch (error) {
    console.error("Admin Stats Error:", error);
    res.status(500).json({ success: false, message: "Error fetching admin stats", error: error.message });
  }
};

/**
 * 2. CUSTOMER / USER MANAGEMENT (CRUD + Pagination)
 */
export const getAllCustomers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { search, role, status } = req.query;

    let whereClause = "WHERE 1=1";
    const params = [];

    if (role && role !== "ALL") {
      whereClause += " AND u.role = ?";
      params.push(role.toUpperCase());
    }

    if (status && status !== "ALL") {
      whereClause += " AND u.status = ?";
      params.push(status.toUpperCase());
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      whereClause += " AND (LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(u.user_id) LIKE ? OR LOWER(u.phone) LIKE ?)";
      params.push(q, q, q, q);
    }

    const [countRow] = await query(`SELECT COUNT(*) as total FROM users u ${whereClause}`, params);
    const total = countRow?.total || 0;

    const users = await query(
      `SELECT u.id, u.user_id, u.name, u.email, u.phone, u.role, u.status, u.wallet_balance, u.company_name, u.city, u.state, u.created_at,
              (SELECT COUNT(*) FROM vehicles v WHERE v.user_id = u.id) as vehicle_count,
              (SELECT COUNT(*) FROM bookings b WHERE b.user_id = u.id) as booking_count
       FROM users u
       ${whereClause}
       ORDER BY u.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const formatted = users.map((u) => ({
      id: u.id,
      user_id: u.user_id || `USR${String(u.id).padStart(6, "0")}`,
      counterId: u.user_id || `USR${String(u.id).padStart(6, "0")}`,
      customerId: u.user_id || `USR${String(u.id).padStart(6, "0")}`,
      name: u.name,
      email: u.email,
      phone: u.phone || "—",
      role: u.role,
      status: u.status || "ACTIVE",
      walletBalance: parseFloat(u.wallet_balance) || 0,
      wallet_balance: parseFloat(u.wallet_balance) || 0,
      companyName: u.company_name || "—",
      city: u.city || "Chennai",
      state: u.state || "Tamil Nadu",
      vehicleCount: parseInt(u.vehicle_count, 10) || 0,
      bookingCount: parseInt(u.booking_count, 10) || 0,
      createdAt: u.created_at,
    }));

    res.json({
      success: true,
      count: formatted.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: formatted,
      users: formatted,
      customers: formatted,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching customers", error: error.message });
  }
};

export const getAllUsers = getAllCustomers;

export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    const users = await query(
      `SELECT u.id, u.user_id, u.name, u.email, u.phone, u.role, u.status, u.wallet_balance, u.company_name, u.address, u.city, u.state, u.pincode, u.created_at
       FROM users u
       WHERE u.id = ? OR u.user_id = ?`,
      [isNum ? parseInt(id, 10) : 0, id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const u = users[0];
    const vehicles = await query("SELECT * FROM vehicles WHERE user_id = ?", [u.id]);
    const bookings = await query(
      `SELECT b.*, s.station_name, c.charger_name 
       FROM bookings b 
       LEFT JOIN stations s ON b.station_id = s.id 
       LEFT JOIN chargers c ON b.charger_id = c.id 
       WHERE b.user_id = ? 
       ORDER BY b.id DESC LIMIT 10`,
      [u.id]
    );

    res.json({
      success: true,
      data: {
        ...u,
        counterId: u.user_id,
        walletBalance: parseFloat(u.wallet_balance) || 0,
        vehicles,
        bookings: bookings.map(formatBooking),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching customer details", error: error.message });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const { name, email, phone, password = "password123", role = "CUSTOMER", status = "ACTIVE", walletBalance = 2500.0, city = "Chennai", address = "" } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: "Name and Email are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await query("SELECT id FROM users WHERE LOWER(email) = ?", [cleanEmail]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "A user with this email already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const prefix = role.toUpperCase().startsWith("OWN") ? "OWN" : role.toUpperCase().startsWith("TECH") ? "TECH" : "CUS";
    const user_id = await getNextSequenceId(prefix, "users");

    const insertRes = await query(
      `INSERT INTO users (user_id, name, email, password_hash, phone, role, status, wallet_balance, city, address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, name.trim(), cleanEmail, hashedPassword, (phone || "").trim(), role.toUpperCase(), status.toUpperCase(), parseFloat(walletBalance) || 0, city, address]
    );

    await recordAuditLog(query, {
      userId: req.user?.id,
      userRole: req.user?.role || "ADMIN",
      action: "CREATE_USER",
      entityType: "USER",
      entityId: insertRes.insertId,
      newValue: { user_id, name: name.trim(), email: cleanEmail, role },
    });

    res.status(201).json({
      success: true,
      message: `User ${user_id} created successfully!`,
      data: { id: insertRes.insertId, user_id, name: name.trim(), email: cleanEmail, role, status },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating customer", error: error.message });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, status, walletBalance, city, address, companyName } = req.body;
    const isNum = /^\d+$/.test(id);

    const existingUsers = await query("SELECT * FROM users WHERE id = ? OR user_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    if (existingUsers.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    const prev = existingUsers[0];

    await query(
      `UPDATE users SET 
         name = COALESCE(?, name),
         email = COALESCE(?, email),
         phone = COALESCE(?, phone),
         role = COALESCE(?, role),
         status = COALESCE(?, status),
         wallet_balance = COALESCE(?, wallet_balance),
         city = COALESCE(?, city),
         address = COALESCE(?, address),
         company_name = COALESCE(?, company_name)
       WHERE id = ?`,
      [
        name ? name.trim() : null,
        email ? email.trim().toLowerCase() : null,
        phone ? phone.trim() : null,
        role ? role.toUpperCase() : null,
        status ? status.toUpperCase() : null,
        walletBalance !== undefined ? parseFloat(walletBalance) : null,
        city || null,
        address || null,
        companyName || null,
        prev.id,
      ]
    );

    await recordAuditLog(query, {
      userId: req.user?.id,
      userRole: req.user?.role || "ADMIN",
      action: "UPDATE_USER",
      entityType: "USER",
      entityId: prev.id,
      oldValue: { name: prev.name, email: prev.email, role: prev.role, status: prev.status },
      newValue: { name, email, role, status },
    });

    res.json({ success: true, message: "User updated successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating customer", error: error.message });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    const existingUsers = await query("SELECT id, user_id, email, name FROM users WHERE id = ? OR user_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    if (existingUsers.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    const target = existingUsers[0];

    await query("DELETE FROM users WHERE id = ?", [target.id]);

    await recordAuditLog(query, {
      userId: req.user?.id,
      userRole: req.user?.role || "ADMIN",
      action: "DELETE_USER",
      entityType: "USER",
      entityId: target.id,
      oldValue: target,
    });

    res.json({ success: true, message: `User ${target.user_id} deleted successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting customer", error: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!role) return res.status(400).json({ success: false, message: "Role is required." });

    const isNum = /^\d+$/.test(id);
    await query("UPDATE users SET role = ? WHERE id = ? OR user_id = ?", [role.toUpperCase(), isNum ? parseInt(id, 10) : 0, id]);

    await recordAuditLog(query, {
      userId: req.user?.id,
      userRole: req.user?.role || "ADMIN",
      action: "UPDATE_USER_ROLE",
      entityType: "USER",
      entityId: id,
      newValue: { role: role.toUpperCase() },
    });

    res.json({ success: true, message: `User role updated to ${role}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating user role", error: error.message });
  }
};

/**
 * 3. OWNER VERIFICATION & MANAGEMENT (A. Owner and Station Verification Center)
 */
export const getAllOwners = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { search, status } = req.query;

    let whereSql = "WHERE u.role IN ('STATION_OWNER', 'OWNER')";
    const params = [];

    if (status && status !== "ALL") {
      const s = status.toUpperCase();
      if (s === "PENDING") {
        whereSql += " AND (u.status = 'PENDING' OR so.verification_status = 'PENDING')";
      } else if (s === "VERIFIED" || s === "APPROVED" || s === "ACTIVE") {
        whereSql += " AND (u.status = 'ACTIVE' OR so.verification_status = 'VERIFIED')";
      } else if (s === "SUSPENDED") {
        whereSql += " AND (u.status = 'SUSPENDED' OR so.verification_status = 'SUSPENDED')";
      } else if (s === "REJECTED") {
        whereSql += " AND (u.status = 'INACTIVE' OR so.verification_status = 'REJECTED')";
      }
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      whereSql += ` AND (LOWER(u.user_id) LIKE ? OR LOWER(u.name) LIKE ? OR LOWER(u.company_name) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(u.phone) LIKE ?)`;
      params.push(q, q, q, q, q);
    }

    const [countRow] = await query(
      `SELECT COUNT(*) as total 
       FROM users u 
       LEFT JOIN station_owners so ON u.id = so.user_id 
       ${whereSql}`,
      params
    );
    const total = countRow?.total || 0;

    const owners = await query(
      `SELECT u.id, u.user_id, u.name, u.company_name, u.email, u.phone, u.role, u.status, u.city, u.address, u.created_at,
              so.verification_status, so.rejection_reason, so.suspension_reason, so.reviewed_at,
              admin_user.name as reviewed_by_name,
              COALESCE((SELECT COUNT(*) FROM stations s WHERE s.owner_id = u.id), 0) as station_count,
              COALESCE((SELECT COUNT(*) FROM chargers c JOIN stations s ON c.station_id = s.id WHERE s.owner_id = u.id), 0) as charger_count,
              COALESCE((SELECT SUM(p.amount) FROM payments p JOIN bookings b ON (p.booking_id = b.id OR p.booking_id = b.booking_id) JOIN stations s ON b.station_id = s.id WHERE s.owner_id = u.id AND p.payment_status = 'SUCCESS'), 0) as total_revenue
       FROM users u
       LEFT JOIN station_owners so ON u.id = so.user_id
       LEFT JOIN users admin_user ON so.reviewed_by = admin_user.id
       ${whereSql}
       ORDER BY u.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const formatted = owners.map((o) => {
      const canonicalId = o.user_id || `OWN${String(o.id).padStart(6, "0")}`;
      let verificationStatus = o.verification_status;
      if (!verificationStatus) {
        verificationStatus = o.status === "ACTIVE" ? "VERIFIED" : o.status === "SUSPENDED" ? "SUSPENDED" : o.status === "PENDING" ? "PENDING" : "REJECTED";
      }

      return {
        id: o.id,
        counterId: canonicalId,
        ownerId: canonicalId,
        user_id: canonicalId,
        name: o.name,
        companyName: o.company_name || o.name,
        company_name: o.company_name || o.name,
        businessName: o.company_name || o.name,
        email: o.email,
        phone: o.phone || "—",
        role: o.role,
        status: o.status || "ACTIVE",
        owner_status: verificationStatus,
        verificationStatus,
        rejectionReason: o.rejection_reason,
        suspensionReason: o.suspension_reason,
        reviewedAt: o.reviewed_at,
        reviewedByName: o.reviewed_by_name,
        city: o.city || "Chennai",
        address: o.address || "—",
        stationCount: parseInt(o.station_count, 10) || 0,
        chargerCount: parseInt(o.charger_count, 10) || 0,
        totalRevenue: parseFloat(o.total_revenue) || 0,
        createdAt: o.created_at,
      };
    });

    res.json({
      success: true,
      count: formatted.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: formatted,
      owners: formatted,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching owners", error: error.message });
  }
};

export const getPendingOwners = async (req, res) => {
  try {
    const owners = await query(
      `SELECT u.id, u.user_id, u.name, u.company_name, u.email, u.phone, u.role, u.status, u.city, u.address, u.created_at,
              so.verification_status 
       FROM users u 
       LEFT JOIN station_owners so ON u.id = so.user_id
       WHERE u.role IN ('STATION_OWNER', 'OWNER') AND (u.status = 'PENDING' OR so.verification_status = 'PENDING')
       ORDER BY u.id DESC`
    );

    const formatted = owners.map((o) => ({
      ...o,
      counter_id: o.user_id || `OWN${String(o.id).padStart(6, "0")}`,
      counterId: o.user_id || `OWN${String(o.id).padStart(6, "0")}`,
      businessName: o.company_name || o.name,
      owner_status: "PENDING",
      verificationStatus: "PENDING",
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching pending owners", error: error.message });
  }
};

export const approveOwner = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    const adminId = req.user?.id || 1;

    const owners = await query("SELECT id, user_id, name, email FROM users WHERE id = ? OR user_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    if (owners.length === 0) return res.status(404).json({ success: false, message: "Owner not found." });
    const owner = owners[0];

    await query("UPDATE users SET status = 'ACTIVE' WHERE id = ?", [owner.id]);

    const existingProfile = await query("SELECT id FROM station_owners WHERE user_id = ?", [owner.id]);
    if (existingProfile.length > 0) {
      await query(
        "UPDATE station_owners SET verification_status = 'VERIFIED', reviewed_by = ?, reviewed_at = NOW(), rejection_reason = NULL, suspension_reason = NULL WHERE user_id = ?",
        [adminId, owner.id]
      );
    } else {
      await query(
        "INSERT INTO station_owners (user_id, owner_code, verification_status, reviewed_by, reviewed_at) VALUES (?, ?, 'VERIFIED', ?, NOW())",
        [owner.id, owner.user_id, adminId]
      );
    }

    await recordAuditLog(query, {
      userId: adminId,
      userRole: req.user?.role || "ADMIN",
      action: "APPROVE_OWNER",
      entityType: "OWNER",
      entityId: owner.id,
      newValue: { status: "ACTIVE", verification_status: "VERIFIED" },
    });

    res.json({ success: true, message: `Station Owner ${owner.name} approved successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error approving owner", error: error.message });
  }
};

export const rejectOwner = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = "Credentials could not be verified" } = req.body;
    const isNum = /^\d+$/.test(id);
    const adminId = req.user?.id || 1;

    const owners = await query("SELECT id, user_id, name FROM users WHERE id = ? OR user_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    if (owners.length === 0) return res.status(404).json({ success: false, message: "Owner not found." });
    const owner = owners[0];

    await query("UPDATE users SET status = 'INACTIVE' WHERE id = ?", [owner.id]);

    const existingProfile = await query("SELECT id FROM station_owners WHERE user_id = ?", [owner.id]);
    if (existingProfile.length > 0) {
      await query(
        "UPDATE station_owners SET verification_status = 'REJECTED', rejection_reason = ?, reviewed_by = ?, reviewed_at = NOW() WHERE user_id = ?",
        [reason, adminId, owner.id]
      );
    } else {
      await query(
        "INSERT INTO station_owners (user_id, owner_code, verification_status, rejection_reason, reviewed_by, reviewed_at) VALUES (?, ?, 'REJECTED', ?, ?, NOW())",
        [owner.id, owner.user_id, reason, adminId]
      );
    }

    await recordAuditLog(query, {
      userId: adminId,
      userRole: req.user?.role || "ADMIN",
      action: "REJECT_OWNER",
      entityType: "OWNER",
      entityId: owner.id,
      newValue: { status: "INACTIVE", verification_status: "REJECTED", reason },
    });

    res.json({ success: true, message: `Station Owner registration rejected.` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error rejecting owner", error: error.message });
  }
};

export const suspendOwner = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = "Administrative suspension for compliance check" } = req.body;
    const isNum = /^\d+$/.test(id);
    const adminId = req.user?.id || 1;

    const owners = await query("SELECT id, user_id, name FROM users WHERE id = ? OR user_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    if (owners.length === 0) return res.status(404).json({ success: false, message: "Owner not found." });
    const owner = owners[0];

    await query("UPDATE users SET status = 'SUSPENDED' WHERE id = ?", [owner.id]);

    await query(
      "UPDATE station_owners SET verification_status = 'SUSPENDED', suspension_reason = ?, reviewed_by = ?, reviewed_at = NOW() WHERE user_id = ?",
      [reason, adminId, owner.id]
    );

    await recordAuditLog(query, {
      userId: adminId,
      userRole: req.user?.role || "ADMIN",
      action: "SUSPEND_OWNER",
      entityType: "OWNER",
      entityId: owner.id,
      newValue: { status: "SUSPENDED", verification_status: "SUSPENDED", reason },
    });

    res.json({ success: true, message: `Station Owner ${owner.name} suspended.` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error suspending owner", error: error.message });
  }
};

export const reactivateOwner = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    const adminId = req.user?.id || 1;

    const owners = await query("SELECT id, user_id, name FROM users WHERE id = ? OR user_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    if (owners.length === 0) return res.status(404).json({ success: false, message: "Owner not found." });
    const owner = owners[0];

    await query("UPDATE users SET status = 'ACTIVE' WHERE id = ?", [owner.id]);
    await query(
      "UPDATE station_owners SET verification_status = 'VERIFIED', suspension_reason = NULL, reviewed_by = ?, reviewed_at = NOW() WHERE user_id = ?",
      [adminId, owner.id]
    );

    await recordAuditLog(query, {
      userId: adminId,
      userRole: req.user?.role || "ADMIN",
      action: "REACTIVATE_OWNER",
      entityType: "OWNER",
      entityId: owner.id,
      newValue: { status: "ACTIVE", verification_status: "VERIFIED" },
    });

    res.json({ success: true, message: `Station Owner ${owner.name} reactivated successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error reactivating owner", error: error.message });
  }
};

export const createOwner = async (req, res) => {
  try {
    const { name, email, phone, mobile, companyName, businessName, password = "password123", city = "Chennai", address = "", status = "ACTIVE" } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, message: "Name and Email are required." });

    const cleanEmail = email.trim().toLowerCase();
    const existing = await query("SELECT id FROM users WHERE LOWER(email) = ?", [cleanEmail]);
    if (existing.length > 0) return res.status(400).json({ success: false, message: "Email already registered." });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user_id = await getNextSequenceId("OWN", "users");

    const insertRes = await query(
      `INSERT INTO users (user_id, name, email, password_hash, phone, role, status, company_name, city, address)
       VALUES (?, ?, ?, ?, ?, 'STATION_OWNER', ?, ?, ?, ?)`,
      [user_id, name.trim(), cleanEmail, hashedPassword, (phone || mobile || "").trim(), status, companyName || businessName || name.trim(), city, address]
    );

    await query(
      `INSERT INTO station_owners (user_id, owner_code, business_name, business_email, business_phone, verification_status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [insertRes.insertId, user_id, companyName || businessName || name.trim(), cleanEmail, (phone || mobile || "").trim(), status === "ACTIVE" ? "VERIFIED" : "PENDING"]
    );

    await recordAuditLog(query, {
      userId: req.user?.id,
      userRole: req.user?.role || "ADMIN",
      action: "CREATE_OWNER",
      entityType: "OWNER",
      entityId: insertRes.insertId,
      newValue: { user_id, name: name.trim(), email: cleanEmail },
    });

    res.status(201).json({
      success: true,
      message: `Station Owner ${user_id} created successfully!`,
      data: { id: insertRes.insertId, user_id, counterId: user_id, name: name.trim(), email: cleanEmail },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating owner", error: error.message });
  }
};

export const updateOwner = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, companyName, city, address, status, verificationStatus } = req.body;
    const isNum = /^\d+$/.test(id);

    const prevRows = await query("SELECT * FROM users WHERE (id = ? OR user_id = ?) AND role IN ('STATION_OWNER', 'OWNER')", [isNum ? parseInt(id, 10) : 0, id]);
    if (prevRows.length === 0) return res.status(404).json({ success: false, message: "Owner not found." });
    const prev = prevRows[0];

    await query(
      `UPDATE users SET 
         name = COALESCE(?, name),
         email = COALESCE(?, email),
         phone = COALESCE(?, phone),
         company_name = COALESCE(?, company_name),
         city = COALESCE(?, city),
         address = COALESCE(?, address),
         status = COALESCE(?, status)
       WHERE id = ?`,
      [
        name ? name.trim() : null,
        email ? email.trim().toLowerCase() : null,
        phone ? phone.trim() : null,
        companyName || null,
        city || null,
        address || null,
        status ? status.toUpperCase() : null,
        prev.id,
      ]
    );

    if (verificationStatus) {
      await query(
        "UPDATE station_owners SET verification_status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE user_id = ?",
        [verificationStatus.toUpperCase(), req.user?.id || 1, prev.id]
      );
    }

    await recordAuditLog(query, {
      userId: req.user?.id,
      userRole: req.user?.role || "ADMIN",
      action: "UPDATE_OWNER",
      entityType: "OWNER",
      entityId: prev.id,
      oldValue: prev,
      newValue: { name, email, phone, companyName, status, verificationStatus },
    });

    res.json({ success: true, message: "Station Owner updated successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating owner", error: error.message });
  }
};

export const deleteOwner = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    const [owner] = await query("SELECT id, user_id, name FROM users WHERE (id = ? OR user_id = ?) AND role IN ('STATION_OWNER', 'OWNER')", [isNum ? parseInt(id, 10) : 0, id]);
    if (!owner) return res.status(404).json({ success: false, message: "Owner not found." });

    await query("DELETE FROM users WHERE id = ?", [owner.id]);

    await recordAuditLog(query, {
      userId: req.user?.id,
      userRole: req.user?.role || "ADMIN",
      action: "DELETE_OWNER",
      entityType: "OWNER",
      entityId: owner.id,
      oldValue: owner,
    });

    res.json({ success: true, message: `Station Owner ${owner.user_id} deleted successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting owner", error: error.message });
  }
};

/**
 * 4. TECHNICIANS MANAGEMENT (CRUD)
 */
export const getAllTechnicians = async (req, res) => {
  try {
    const { search, status } = req.query;
    let sql = `
      SELECT u.id, u.user_id, u.name, u.email, u.phone, u.role, u.status, u.city, u.address, u.created_at,
             COALESCE((SELECT COUNT(*) FROM maintenance_tickets mt WHERE mt.technician_id = u.id AND mt.status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS')), 0) as active_tickets,
             COALESCE((SELECT COUNT(*) FROM maintenance_tickets mt WHERE mt.technician_id = u.id AND mt.status IN ('RESOLVED', 'CLOSED')), 0) as resolved_tickets
      FROM users u
      WHERE u.role IN ('TECHNICIAN', 'TECH')
    `;
    const params = [];

    if (status && status !== "ALL") {
      sql += ` AND u.status = ?`;
      params.push(status.toUpperCase());
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      sql += ` AND (LOWER(u.user_id) LIKE ? OR LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(u.phone) LIKE ?)`;
      params.push(q, q, q, q);
    }

    sql += ` ORDER BY u.id DESC`;
    const techs = await query(sql, params);

    const formatted = techs.map((t) => ({
      id: t.id,
      counterId: t.user_id || `TECH${String(t.id).padStart(4, "0")}`,
      technicianId: t.user_id || `TECH${String(t.id).padStart(4, "0")}`,
      name: t.name,
      email: t.email,
      phone: t.phone || "—",
      role: t.role,
      status: t.status || "ACTIVE",
      city: t.city || "Chennai",
      address: t.address || "—",
      activeTickets: parseInt(t.active_tickets, 10) || 0,
      resolvedTickets: parseInt(t.resolved_tickets, 10) || 0,
      createdAt: t.created_at,
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching technicians", error: error.message });
  }
};

export const createTechnician = async (req, res) => {
  try {
    const { name, email, phone, password = "password123", city = "Chennai", address = "", status = "ACTIVE" } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, message: "Name and Email are required." });

    const cleanEmail = email.trim().toLowerCase();
    const existing = await query("SELECT id FROM users WHERE LOWER(email) = ?", [cleanEmail]);
    if (existing.length > 0) return res.status(400).json({ success: false, message: "Email already exists." });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user_id = await getNextSequenceId("TECH", "users");

    const insertRes = await query(
      `INSERT INTO users (user_id, name, email, password_hash, phone, role, status, city, address)
       VALUES (?, ?, ?, ?, ?, 'TECHNICIAN', ?, ?, ?)`,
      [user_id, name.trim(), cleanEmail, hashedPassword, (phone || "").trim(), status, city, address]
    );

    await recordAuditLog(query, {
      userId: req.user?.id,
      userRole: req.user?.role || "ADMIN",
      action: "CREATE_TECHNICIAN",
      entityType: "TECHNICIAN",
      entityId: insertRes.insertId,
      newValue: { user_id, name: name.trim(), email: cleanEmail },
    });

    res.status(201).json({
      success: true,
      message: `Technician ${user_id} created successfully!`,
      data: { id: insertRes.insertId, user_id, counterId: user_id, name: name.trim(), email: cleanEmail },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating technician", error: error.message });
  }
};

export const updateTechnician = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, city, address, status } = req.body;
    const isNum = /^\d+$/.test(id);

    await query(
      `UPDATE users SET 
         name = COALESCE(?, name),
         email = COALESCE(?, email),
         phone = COALESCE(?, phone),
         city = COALESCE(?, city),
         address = COALESCE(?, address),
         status = COALESCE(?, status)
       WHERE (id = ? OR user_id = ?) AND role IN ('TECHNICIAN', 'TECH')`,
      [
        name ? name.trim() : null,
        email ? email.trim().toLowerCase() : null,
        phone ? phone.trim() : null,
        city || null,
        address || null,
        status ? status.toUpperCase() : null,
        isNum ? parseInt(id, 10) : 0,
        id,
      ]
    );

    res.json({ success: true, message: "Technician updated successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating technician", error: error.message });
  }
};

export const deleteTechnician = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    await query("DELETE FROM users WHERE (id = ? OR user_id = ?) AND role IN ('TECHNICIAN', 'TECH')", [isNum ? parseInt(id, 10) : 0, id]);
    res.json({ success: true, message: "Technician deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting technician", error: error.message });
  }
};

/**
 * 5. STATIONS APPROVAL & MANAGEMENT (A. Owner and Station Verification Center)
 */
export const getStationsAdmin = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { search, status, approvalStatus, city, ownerId } = req.query;

    let whereSql = "WHERE 1=1";
    const params = [];

    if (approvalStatus && approvalStatus !== "ALL") {
      whereSql += " AND s.approval_status = ?";
      params.push(approvalStatus.toUpperCase());
    } else if (status && status !== "ALL") {
      whereSql += " AND s.approval_status = ?";
      params.push(status.toUpperCase());
    }

    if (city && city !== "ALL") {
      whereSql += " AND LOWER(s.city) = ?";
      params.push(city.toLowerCase());
    }

    if (ownerId) {
      whereSql += " AND s.owner_id = ?";
      params.push(parseInt(ownerId, 10) || 0);
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      whereSql += " AND (LOWER(s.station_name) LIKE ? OR LOWER(s.station_id) LIKE ? OR LOWER(s.city) LIKE ? OR LOWER(u.name) LIKE ? OR LOWER(u.company_name) LIKE ?)";
      params.push(q, q, q, q, q);
    }

    const [countRow] = await query(`SELECT COUNT(*) as total FROM stations s LEFT JOIN users u ON s.owner_id = u.id ${whereSql}`, params);
    const total = countRow?.total || 0;

    const stations = await query(
      `SELECT s.*, u.name as owner_name, u.email as owner_email, u.phone as owner_phone, u.company_name as owner_company,
              admin_user.name as reviewed_by_name,
              COALESCE((SELECT COUNT(*) FROM chargers c WHERE c.station_id = s.id), 0) as charger_count,
              COALESCE((SELECT COUNT(*) FROM chargers c WHERE c.station_id = s.id AND c.status = 'AVAILABLE'), 0) as available_chargers,
              COALESCE((SELECT COUNT(*) FROM station_photos sp WHERE sp.station_id = s.id), 0) as photo_count
       FROM stations s
       LEFT JOIN users u ON s.owner_id = u.id
       LEFT JOIN users admin_user ON s.reviewed_by = admin_user.id
       ${whereSql}
       ORDER BY s.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const formatted = stations.map((s) => ({
      id: s.id,
      stationId: s.station_id,
      station_id: s.station_id,
      name: s.station_name,
      stationName: s.station_name,
      station_name: s.station_name,
      address: s.address,
      city: s.city || "Chennai",
      state: s.state || "Tamil Nadu",
      latitude: parseFloat(s.latitude),
      longitude: parseFloat(s.longitude),
      maxPower: parseFloat(s.max_power) || 120.0,
      totalSlots: parseInt(s.total_slots, 10) || parseInt(s.charger_count, 10) || 4,
      availableSlots: parseInt(s.available_chargers, 10) || 0,
      status: s.status || "ACTIVE",
      approvalStatus: s.approval_status || "PENDING",
      approval_status: s.approval_status || "PENDING",
      approvalNotes: s.approval_notes,
      reviewedAt: s.reviewed_at,
      reviewedByName: s.reviewed_by_name,
      ownerId: s.owner_id,
      ownerName: s.owner_name || "Independent Operator",
      ownerEmail: s.owner_email,
      ownerCompany: s.owner_company || s.owner_name,
      chargerCount: parseInt(s.charger_count, 10) || 0,
      photoCount: parseInt(s.photo_count, 10) || 0,
      image: s.image,
      createdAt: s.created_at,
    }));

    res.json({
      success: true,
      count: formatted.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: formatted,
      stations: formatted,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching stations", error: error.message });
  }
};

export const getPendingStations = async (req, res) => {
  try {
    const stations = await query(
      `SELECT s.*, u.name as owner_name, u.email as owner_email, u.phone as owner_phone, u.company_name as owner_company,
              COALESCE((SELECT COUNT(*) FROM chargers c WHERE c.station_id = s.id), 0) as charger_count,
              COALESCE((SELECT COUNT(*) FROM station_photos sp WHERE sp.station_id = s.id), 0) as photo_count
       FROM stations s
       LEFT JOIN users u ON s.owner_id = u.id
       WHERE s.approval_status = 'PENDING' OR s.status = 'PENDING'
       ORDER BY s.id DESC`
    );

    const formatted = stations.map((s) => ({
      id: s.id,
      stationId: s.station_id,
      station_id: s.station_id,
      stationName: s.station_name,
      address: s.address,
      city: s.city,
      maxPower: parseFloat(s.max_power) || 120,
      totalSlots: s.total_slots || s.charger_count || 4,
      status: s.status,
      approval_status: "PENDING",
      approvalStatus: "PENDING",
      ownerName: s.owner_name,
      ownerCompany: s.owner_company || s.owner_name,
      ownerEmail: s.owner_email,
      chargerCount: s.charger_count,
      photoCount: s.photo_count,
      createdAt: s.created_at,
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching pending stations", error: error.message });
  }
};

export const getStationPhotosAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    const stationRows = await query("SELECT id FROM stations WHERE id = ? OR station_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    if (stationRows.length === 0) return res.status(404).json({ success: false, message: "Station not found." });

    const photos = await query("SELECT * FROM station_photos WHERE station_id = ? ORDER BY is_primary DESC, id ASC", [stationRows[0].id]);
    res.json({ success: true, data: photos });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching station photos", error: error.message });
  }
};

export const approveStation = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    const adminId = req.user?.id || 1;

    const stations = await query("SELECT id, station_id, station_name, owner_id FROM stations WHERE id = ? OR station_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    if (stations.length === 0) return res.status(404).json({ success: false, message: "Station not found." });
    const station = stations[0];

    await query(
      "UPDATE stations SET approval_status = 'APPROVED', status = 'ACTIVE', reviewed_by = ?, reviewed_at = NOW(), approval_notes = NULL WHERE id = ?",
      [adminId, station.id]
    );

    await recordAuditLog(query, {
      userId: adminId,
      userRole: req.user?.role || "ADMIN",
      action: "APPROVE_STATION",
      entityType: "STATION",
      entityId: station.id,
      newValue: { approval_status: "APPROVED", status: "ACTIVE" },
    });

    emitStationUpdated({ id: station.id, stationId: station.station_id, status: "ACTIVE", approvalStatus: "APPROVED" });

    res.json({ success: true, message: `Station "${station.station_name}" approved and published to Live EV Map!` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error approving station", error: error.message });
  }
};

export const rejectStation = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = "Station electrical or location verification rejected" } = req.body;
    const isNum = /^\d+$/.test(id);
    const adminId = req.user?.id || 1;

    const stations = await query("SELECT id, station_id, station_name FROM stations WHERE id = ? OR station_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    if (stations.length === 0) return res.status(404).json({ success: false, message: "Station not found." });
    const station = stations[0];

    await query(
      "UPDATE stations SET approval_status = 'REJECTED', status = 'INACTIVE', approval_notes = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?",
      [reason, adminId, station.id]
    );

    await recordAuditLog(query, {
      userId: adminId,
      userRole: req.user?.role || "ADMIN",
      action: "REJECT_STATION",
      entityType: "STATION",
      entityId: station.id,
      newValue: { approval_status: "REJECTED", status: "INACTIVE", reason },
    });

    emitStationUpdated({ id: station.id, stationId: station.station_id, status: "INACTIVE", approvalStatus: "REJECTED" });

    res.json({ success: true, message: `Station "${station.station_name}" rejected.` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error rejecting station", error: error.message });
  }
};

export const suspendStation = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = "Suspended due to safety inspection or compliance notice" } = req.body;
    const isNum = /^\d+$/.test(id);
    const adminId = req.user?.id || 1;

    const stations = await query("SELECT id, station_id, station_name FROM stations WHERE id = ? OR station_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    if (stations.length === 0) return res.status(404).json({ success: false, message: "Station not found." });
    const station = stations[0];

    await query(
      "UPDATE stations SET approval_status = 'SUSPENDED', status = 'INACTIVE', approval_notes = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?",
      [reason, adminId, station.id]
    );

    await recordAuditLog(query, {
      userId: adminId,
      userRole: req.user?.role || "ADMIN",
      action: "SUSPEND_STATION",
      entityType: "STATION",
      entityId: station.id,
      newValue: { approval_status: "SUSPENDED", status: "INACTIVE", reason },
    });

    emitStationUpdated({ id: station.id, stationId: station.station_id, status: "INACTIVE", approvalStatus: "SUSPENDED" });

    res.json({ success: true, message: `Station "${station.station_name}" suspended from public view.` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error suspending station", error: error.message });
  }
};

export const reactivateStation = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    const adminId = req.user?.id || 1;

    const stations = await query("SELECT id, station_id, station_name FROM stations WHERE id = ? OR station_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    if (stations.length === 0) return res.status(404).json({ success: false, message: "Station not found." });
    const station = stations[0];

    await query(
      "UPDATE stations SET approval_status = 'APPROVED', status = 'ACTIVE', approval_notes = NULL, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?",
      [adminId, station.id]
    );

    await recordAuditLog(query, {
      userId: adminId,
      userRole: req.user?.role || "ADMIN",
      action: "REACTIVATE_STATION",
      entityType: "STATION",
      entityId: station.id,
      newValue: { approval_status: "APPROVED", status: "ACTIVE" },
    });

    emitStationUpdated({ id: station.id, stationId: station.station_id, status: "ACTIVE", approvalStatus: "APPROVED" });

    res.json({ success: true, message: `Station "${station.station_name}" reactivated and published.` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error reactivating station", error: error.message });
  }
};

export const createStationAdmin = async (req, res) => {
  try {
    const { ownerId, stationName, address, city = "Chennai", state = "Tamil Nadu", pincode = "600001", latitude = 13.0827, longitude = 80.2707, totalSlots = 4, maxPower = 120.0, openingTime = "06:00 AM", closingTime = "11:00 PM", contactNumber = "9876543210", amenities = "WiFi, Restroom", image, status = "ACTIVE", approvalStatus = "APPROVED" } = req.body;

    if (!stationName || !address) {
      return res.status(400).json({ success: false, message: "Station name and address are required." });
    }

    let resolvedOwnerId = parseInt(ownerId, 10);
    if (!resolvedOwnerId) {
      const defaultOwner = await query("SELECT id FROM users WHERE role IN ('STATION_OWNER', 'OWNER') LIMIT 1");
      resolvedOwnerId = defaultOwner[0]?.id || 1;
    }

    const station_id = await getNextSequenceId("STA", "stations");

    const insertRes = await query(
      `INSERT INTO stations (station_id, owner_id, station_name, address, city, state, pincode, latitude, longitude, total_slots, available_slots, max_power, opening_time, closing_time, contact_number, amenities, image, status, approval_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [station_id, resolvedOwnerId, stationName.trim(), address.trim(), city, state, pincode, parseFloat(latitude), parseFloat(longitude), parseInt(totalSlots, 10) || 4, parseInt(totalSlots, 10) || 4, parseFloat(maxPower) || 120.0, openingTime, closingTime, contactNumber, amenities, image || null, status, approvalStatus]
    );

    const stId = insertRes.insertId;

    // Create initial chargers for slots
    const slotsCount = parseInt(totalSlots, 10) || 4;
    for (let i = 1; i <= slotsCount; i++) {
      const chgCode = `${station_id}-CHG${String(i).padStart(2, "0")}`;
      const chgType = i % 2 === 0 ? "DC_FAST" : "CCS2";
      const pwr = chgType === "DC_FAST" ? 60.0 : 50.0;

      const chgRes = await query(
        `INSERT INTO chargers (charger_id, station_id, charger_name, charger_type, power_kw, status, connector_count, last_heartbeat)
         VALUES (?, ?, ?, ?, ?, 'AVAILABLE', 1, NOW())`,
        [chgCode, stId, `Bay ${i} (${chgType})`, chgType, pwr]
      );

      await query(
        `INSERT INTO charger_connectors (connector_id, charger_id, connector_type, power_kw, status)
         VALUES (?, ?, ?, ?, 'AVAILABLE')`,
        [`${chgCode}-CON01`, chgRes.insertId, chgType, pwr]
      );
    }

    // Create default energy config
    await query(
      `INSERT INTO station_energy_configs (station_id, site_power_limit_kw, other_building_load_kw, safety_reserve_kw, control_mode, grid_cost_per_kwh, demand_charge_per_kw)
       VALUES (?, ?, 30.00, 20.00, 'MONITOR', 8.50, 250.00)
       ON DUPLICATE KEY UPDATE site_power_limit_kw = VALUES(site_power_limit_kw)`,
      [stId, parseFloat(maxPower) || 120.0]
    );

    await recordAuditLog(query, {
      userId: req.user?.id,
      userRole: req.user?.role || "ADMIN",
      action: "CREATE_STATION",
      entityType: "STATION",
      entityId: stId,
      newValue: { station_id, stationName, city, totalSlots },
    });

    res.status(201).json({
      success: true,
      message: `Station ${station_id} created with ${slotsCount} configured chargers!`,
      data: { id: stId, station_id, stationName, city },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating station", error: error.message });
  }
};

export const updateStationAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    const { stationName, address, city, state, pincode, latitude, longitude, maxPower, openingTime, closingTime, contactNumber, amenities, status, approvalStatus } = req.body;

    const prevRows = await query("SELECT * FROM stations WHERE id = ? OR station_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    if (prevRows.length === 0) return res.status(404).json({ success: false, message: "Station not found." });
    const prev = prevRows[0];

    await query(
      `UPDATE stations SET 
         station_name = COALESCE(?, station_name),
         address = COALESCE(?, address),
         city = COALESCE(?, city),
         state = COALESCE(?, state),
         pincode = COALESCE(?, pincode),
         latitude = COALESCE(?, latitude),
         longitude = COALESCE(?, longitude),
         max_power = COALESCE(?, max_power),
         opening_time = COALESCE(?, opening_time),
         closing_time = COALESCE(?, closing_time),
         contact_number = COALESCE(?, contact_number),
         amenities = COALESCE(?, amenities),
         status = COALESCE(?, status),
         approval_status = COALESCE(?, approval_status)
       WHERE id = ?`,
      [
        stationName ? stationName.trim() : null,
        address ? address.trim() : null,
        city || null,
        state || null,
        pincode || null,
        latitude !== undefined ? parseFloat(latitude) : null,
        longitude !== undefined ? parseFloat(longitude) : null,
        maxPower !== undefined ? parseFloat(maxPower) : null,
        openingTime || null,
        closingTime || null,
        contactNumber || null,
        amenities || null,
        status || null,
        approvalStatus || null,
        prev.id,
      ]
    );

    await recordAuditLog(query, {
      userId: req.user?.id,
      userRole: req.user?.role || "ADMIN",
      action: "UPDATE_STATION",
      entityType: "STATION",
      entityId: prev.id,
      oldValue: prev,
      newValue: { stationName, city, status, approvalStatus },
    });

    res.json({ success: true, message: "Station updated successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating station", error: error.message });
  }
};

export const deleteStationAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    const prevRows = await query("SELECT id, station_id, station_name FROM stations WHERE id = ? OR station_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    if (prevRows.length === 0) return res.status(404).json({ success: false, message: "Station not found." });
    const target = prevRows[0];

    await query("DELETE FROM stations WHERE id = ?", [target.id]);

    await recordAuditLog(query, {
      userId: req.user?.id,
      userRole: req.user?.role || "ADMIN",
      action: "DELETE_STATION",
      entityType: "STATION",
      entityId: target.id,
      oldValue: target,
    });

    res.json({ success: true, message: `Station ${target.station_id} deleted successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting station", error: error.message });
  }
};

/**
 * 6. NETWORK LIVE MONITOR (B. Network Live Monitor & Safe Remote Commands)
 */
export const getNetworkLiveMonitor = async (req, res) => {
  try {
    const { ownerId, stationId, city, status, lastSeenFilter } = req.query;

    let whereSql = "WHERE 1=1";
    const params = [];

    if (ownerId && ownerId !== "ALL") {
      whereSql += " AND s.owner_id = ?";
      params.push(parseInt(ownerId, 10) || 0);
    }

    if (stationId && stationId !== "ALL") {
      const isNum = /^\d+$/.test(stationId);
      whereSql += " AND (s.id = ? OR s.station_id = ?)";
      params.push(isNum ? parseInt(stationId, 10) : 0, stationId);
    }

    if (city && city !== "ALL") {
      whereSql += " AND LOWER(s.city) = ?";
      params.push(city.toLowerCase());
    }

    const chargers = await query(
      `SELECT c.*, 
              s.id as station_db_id, s.station_id as station_code, s.station_name, s.city as station_city, s.address as station_address, s.status as station_status, s.approval_status as station_approval,
              u.id as owner_db_id, u.user_id as owner_code, u.name as owner_name, u.company_name as owner_company, u.phone as owner_phone
       FROM chargers c
       JOIN stations s ON c.station_id = s.id
       LEFT JOIN users u ON s.owner_id = u.id
       ${whereSql}
       ORDER BY s.id ASC, c.id ASC`,
      params
    );

    // Fetch active sessions for all queried chargers
    const activeSessions = await query(
      `SELECT cs.*, u.name as driver_name, u.phone as driver_phone, v.registration_number, v.model as vehicle_model
       FROM charging_sessions cs
       LEFT JOIN users u ON cs.user_id = u.id
       LEFT JOIN vehicles v ON cs.vehicle_id = v.id
       WHERE cs.session_status IN ('CHARGING', 'STARTED', 'ACTIVE')`
    );

    // Fetch open maintenance faults
    const openFaults = await query(
      `SELECT mt.*, u.name as technician_name 
       FROM maintenance_tickets mt 
       LEFT JOIN users u ON mt.technician_id = u.id 
       WHERE mt.status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS')`
    );

    const now = Date.now();
    const formatted = chargers.map((c) => {
      const session = activeSessions.find((s) => s.charger_id === c.id);
      const fault = openFaults.find((f) => f.charger_id === c.id);

      const timeoutSec = c.heartbeat_timeout_seconds || 60;
      const lastHbTime = c.last_heartbeat ? new Date(c.last_heartbeat).getTime() : 0;
      const secondsSinceLastHeartbeat = lastHbTime > 0 ? Math.round((now - lastHbTime) / 1000) : 9999;
      const online = isChargerOnline(c.last_heartbeat, timeoutSec) || Boolean(c.is_simulated);
      const isStale = secondsSinceLastHeartbeat > timeoutSec;

      const derivedStatus = deriveChargerStatus(c, session);

      return {
        id: c.id,
        chargerId: c.charger_id,
        charger_id: c.charger_id,
        name: c.charger_name,
        chargerName: c.charger_name,
        chargerType: c.charger_type || "DC_FAST",
        powerKw: parseFloat(c.power_kw) || 60.0,
        status: derivedStatus,
        rawStatus: c.status,
        isOnline: online,
        isStaleCommunication: isStale && !c.is_simulated,
        secondsSinceLastHeartbeat,
        lastHeartbeat: c.last_heartbeat,
        isSimulated: Boolean(c.is_simulated),
        station: {
          id: c.station_db_id,
          stationId: c.station_code,
          name: c.station_name,
          city: c.station_city,
          address: c.station_address,
          status: c.station_status,
          approvalStatus: c.station_approval,
        },
        owner: {
          id: c.owner_db_id,
          ownerId: c.owner_code,
          name: c.owner_company || c.owner_name || "Network Operator",
          phone: c.owner_phone,
        },
        activeSession: session
          ? {
              sessionId: session.session_id,
              driverName: session.driver_name || "EV Driver",
              driverPhone: session.driver_phone,
              vehicleNumber: session.registration_number || "TN01EV0001",
              vehicleModel: session.vehicle_model || "EV 4W",
              startTime: session.start_time,
              powerKw: parseFloat(session.power_kw) || 50.0,
              energyKwh: parseFloat(session.energy_kwh) || 0.0,
              batterySoc: session.battery_soc || 50,
              durationMinutes: session.duration_minutes || 0,
              totalAmount: parseFloat(session.total_amount) || 0.0,
            }
          : null,
        fault: fault
          ? {
              ticketId: fault.ticket_id,
              issueType: fault.issue_type,
              severity: fault.severity || fault.priority || "MEDIUM",
              status: fault.status,
              openedAt: fault.opened_at,
              technician: fault.technician_name,
            }
          : null,
      };
    });

    // Filter by derived status if requested
    let result = formatted;
    if (status && status !== "ALL") {
      result = result.filter((c) => c.status === status.toUpperCase());
    }

    if (lastSeenFilter === "STALE") {
      result = result.filter((c) => c.isStaleCommunication);
    } else if (lastSeenFilter === "ONLINE") {
      result = result.filter((c) => c.isOnline);
    } else if (lastSeenFilter === "OFFLINE") {
      result = result.filter((c) => !c.isOnline);
    }

    res.json({
      success: true,
      count: result.length,
      total: formatted.length,
      data: result,
      summary: {
        total: formatted.length,
        available: formatted.filter((c) => c.status === "AVAILABLE").length,
        charging: formatted.filter((c) => c.status === "CHARGING").length,
        reserved: formatted.filter((c) => c.status === "RESERVED").length,
        occupied: formatted.filter((c) => c.status === "OCCUPIED").length,
        faulted: formatted.filter((c) => c.status === "FAULTED" || c.status === "MAINTENANCE").length,
        offline: formatted.filter((c) => c.status === "OFFLINE" || !c.isOnline).length,
        staleWarnings: formatted.filter((c) => c.isStaleCommunication).length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching network live monitor", error: error.message });
  }
};

/**
 * Safe Remote Command Execution
 * POST /api/admin/chargers/:id/remote-command
 */
export const sendRemoteChargerCommand = async (req, res) => {
  try {
    const { id } = req.params;
    const { command, payload = {}, isSimulator = true } = req.body;
    const isNum = /^\d+$/.test(id);
    const adminId = req.user?.id || 1;

    const allowedCommands = ["REMOTE_START", "REMOTE_STOP", "RESET", "SET_AVAILABILITY", "UNLOCK_CONNECTOR", "SIMULATE_FAULT"];
    if (!command || !allowedCommands.includes(command.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid command. Allowed: ${allowedCommands.join(", ")}`,
      });
    }

    const chargers = await query("SELECT c.*, s.id as station_db_id FROM chargers c JOIN stations s ON c.station_id = s.id WHERE c.id = ? OR c.charger_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    if (chargers.length === 0) return res.status(404).json({ success: false, message: "Target charger not found." });
    const charger = chargers[0];

    const commandId = await getNextSequenceId("CMD", "remote_commands");
    const cmdType = command.toUpperCase();

    // 1. Record command in pending state
    const cmdInsert = await query(
      `INSERT INTO remote_commands (command_id, charger_id, station_id, user_id, command_type, target_payload, status, is_simulated)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
      [commandId, charger.id, charger.station_id, adminId, cmdType, JSON.stringify(payload), isSimulator ? 1 : 0]
    );

    let resultingStatus = charger.status;
    let commandStatus = "ACCEPTED";
    let responseNote = `Command ${cmdType} accepted and executed successfully (Simulated)`;

    // 2. Execute command action safely
    if (cmdType === "REMOTE_START") {
      resultingStatus = "CHARGING";
      await query("UPDATE chargers SET status = 'CHARGING', is_simulated = 1, last_heartbeat = NOW() WHERE id = ?", [charger.id]);
    } else if (cmdType === "REMOTE_STOP") {
      resultingStatus = "AVAILABLE";
      await query("UPDATE chargers SET status = 'AVAILABLE', last_heartbeat = NOW() WHERE id = ?", [charger.id]);
      await query("UPDATE charging_sessions SET session_status = 'COMPLETED', end_time = NOW() WHERE charger_id = ? AND session_status = 'CHARGING'", [charger.id]);
    } else if (cmdType === "RESET") {
      resultingStatus = "AVAILABLE";
      await query("UPDATE chargers SET status = 'AVAILABLE', error_code = NULL, error_message = NULL, last_heartbeat = NOW() WHERE id = ?", [charger.id]);
    } else if (cmdType === "SET_AVAILABILITY") {
      resultingStatus = payload.status ? payload.status.toUpperCase() : "AVAILABLE";
      await query("UPDATE chargers SET status = ?, last_heartbeat = NOW() WHERE id = ?", [resultingStatus, charger.id]);
    } else if (cmdType === "SIMULATE_FAULT") {
      resultingStatus = "FAULTED";
      await query("UPDATE chargers SET status = 'FAULTED', error_code = 'ERR_OVERTEMP', error_message = 'Over-temperature threshold exceeded', last_heartbeat = NOW() WHERE id = ?", [charger.id]);
    }

    // 3. Update command lifecycle in database
    await query("UPDATE remote_commands SET status = 'COMPLETED', response_payload = ? WHERE id = ?", [
      JSON.stringify({ resultingStatus, timestamp: new Date().toISOString() }),
      cmdInsert.insertId,
    ]);

    // 4. Record audit log
    await recordAuditLog(query, {
      userId: adminId,
      userRole: req.user?.role || "ADMIN",
      action: `REMOTE_${cmdType}`,
      entityType: "CHARGER",
      entityId: charger.id,
      oldValue: { status: charger.status },
      newValue: { command: cmdType, resultingStatus, isSimulated: isSimulator },
    });

    // 5. Emit real-time updates to sockets
    emitChargerStatusChanged({
      chargerId: charger.charger_id,
      id: charger.id,
      stationId: charger.station_id,
      status: resultingStatus,
      isSimulated: isSimulator,
    });

    res.json({
      success: true,
      commandId,
      status: "COMPLETED",
      resultingStatus,
      message: responseNote,
      charger: {
        id: charger.id,
        chargerId: charger.charger_id,
        status: resultingStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error executing remote command", error: error.message });
  }
};

/**
 * 7. INCIDENT & MAINTENANCE CENTER (C. Incident and Maintenance Center)
 */
export const getMaintenanceAdmin = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { search, status, priority, severity, stationId } = req.query;

    let whereSql = "WHERE 1=1";
    const params = [];

    if (status && status !== "ALL") {
      whereSql += " AND mt.status = ?";
      params.push(status.toUpperCase());
    }

    if (priority && priority !== "ALL") {
      whereSql += " AND mt.priority = ?";
      params.push(priority.toUpperCase());
    }

    if (severity && severity !== "ALL") {
      whereSql += " AND mt.severity = ?";
      params.push(severity.toUpperCase());
    }

    if (stationId && stationId !== "ALL") {
      whereSql += " AND mt.station_id = ?";
      params.push(parseInt(stationId, 10) || 0);
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      whereSql += " AND (LOWER(mt.ticket_id) LIKE ? OR LOWER(mt.issue_type) LIKE ? OR LOWER(mt.description) LIKE ? OR LOWER(s.station_name) LIKE ? OR LOWER(tech.name) LIKE ?)";
      params.push(q, q, q, q, q);
    }

    const [countRow] = await query(
      `SELECT COUNT(*) as total 
       FROM maintenance_tickets mt 
       JOIN stations s ON mt.station_id = s.id 
       LEFT JOIN users tech ON mt.technician_id = tech.id 
       ${whereSql}`,
      params
    );
    const total = countRow?.total || 0;

    const tickets = await query(
      `SELECT mt.*, 
              s.station_name, s.station_id as station_code, s.city as station_city,
              c.charger_name, c.charger_id as charger_code,
              tech.name as technician_name, tech.email as technician_email, tech.phone as technician_phone,
              admin_user.name as assigned_by_name
       FROM maintenance_tickets mt
       JOIN stations s ON mt.station_id = s.id
       LEFT JOIN chargers c ON mt.charger_id = c.id
       LEFT JOIN users tech ON mt.technician_id = tech.id
       LEFT JOIN users admin_user ON mt.assigned_by = admin_user.id
       ${whereSql}
       ORDER BY FIELD(mt.status, 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'), mt.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const formatted = tickets.map((t) => ({
      id: t.id,
      ticketId: t.ticket_id,
      ticket_id: t.ticket_id,
      stationId: t.station_id,
      stationName: t.station_name,
      stationCode: t.station_code,
      stationCity: t.station_city,
      chargerId: t.charger_id,
      chargerName: t.charger_name || "General Station",
      chargerCode: t.charger_code,
      issueType: t.issue_type,
      description: t.description,
      priority: t.priority || "MEDIUM",
      severity: t.severity || t.priority || "MEDIUM",
      source: t.source || "MANUAL",
      faultCode: t.fault_code || "—",
      status: t.status || "OPEN",
      openedAt: t.opened_at,
      assignedAt: t.assigned_at,
      startedAt: t.started_at,
      resolvedAt: t.resolved_at,
      resolutionNotes: t.resolution_notes,
      technicianId: t.technician_id,
      technicianName: t.technician_name || "Unassigned",
      technicianPhone: t.technician_phone || "—",
      assignedByName: t.assigned_by_name,
      createdAt: t.created_at,
    }));

    res.json({
      success: true,
      count: formatted.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: formatted,
      tickets: formatted,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching maintenance incidents", error: error.message });
  }
};

export const getIncidentsAdmin = getMaintenanceAdmin;

export const createMaintenanceAdmin = async (req, res) => {
  try {
    const { stationId, chargerId, technicianId, issueType, description, priority = "MEDIUM", severity = "MEDIUM", faultCode, source = "MANUAL" } = req.body;
    const adminId = req.user?.id || 1;

    if (!stationId || !issueType || !description) {
      return res.status(400).json({ success: false, message: "Station, Issue Type, and Description are required." });
    }

    const isStationNum = /^\d+$/.test(stationId);
    const stationRows = await query("SELECT id, station_name FROM stations WHERE id = ? OR station_id = ?", [isStationNum ? parseInt(stationId, 10) : 0, stationId]);
    if (stationRows.length === 0) return res.status(404).json({ success: false, message: "Station not found." });
    const station = stationRows[0];

    let resolvedChargerId = null;
    if (chargerId) {
      const isChargerNum = /^\d+$/.test(chargerId);
      const chargerRows = await query("SELECT id FROM chargers WHERE id = ? OR charger_id = ?", [isChargerNum ? parseInt(chargerId, 10) : 0, chargerId]);
      if (chargerRows.length > 0) resolvedChargerId = chargerRows[0].id;
    }

    // DUPLICATE PREVENTION: Prevent multiple identical open tickets for same charger and fault code
    if (resolvedChargerId && faultCode) {
      const existingOpen = await query(
        "SELECT id, ticket_id FROM maintenance_tickets WHERE charger_id = ? AND fault_code = ? AND status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS')",
        [resolvedChargerId, faultCode]
      );
      if (existingOpen.length > 0) {
        return res.json({
          success: true,
          duplicateIgnored: true,
          message: `Active incident ${existingOpen[0].ticket_id} already exists for this charger fault. Duplicate creation prevented.`,
          data: { id: existingOpen[0].id, ticket_id: existingOpen[0].ticket_id },
        });
      }
    }

    const ticket_id = await getNextSequenceId("INC", "maintenance_tickets");

    const insertRes = await query(
      `INSERT INTO maintenance_tickets (ticket_id, station_id, charger_id, technician_id, assigned_by, issue_type, description, priority, severity, fault_code, source, status, assigned_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ticket_id,
        station.id,
        resolvedChargerId,
        technicianId ? parseInt(technicianId, 10) : null,
        technicianId ? adminId : null,
        issueType.trim(),
        description.trim(),
        priority.toUpperCase(),
        severity.toUpperCase(),
        faultCode || null,
        source.toUpperCase(),
        technicianId ? "ASSIGNED" : "OPEN",
        technicianId ? new Date() : null,
      ]
    );

    // If charger was specified, set charger to FAULTED or MAINTENANCE
    if (resolvedChargerId) {
      await query("UPDATE chargers SET status = 'FAULTED', error_code = ? WHERE id = ?", [faultCode || "ERR_INCIDENT", resolvedChargerId]);
      emitFaultDetected({ chargerId: resolvedChargerId, stationId: station.id, ticketId: ticket_id, issueType });
    }

    await recordAuditLog(query, {
      userId: adminId,
      userRole: req.user?.role || "ADMIN",
      action: "CREATE_INCIDENT",
      entityType: "MAINTENANCE",
      entityId: insertRes.insertId,
      newValue: { ticket_id, issueType, stationId: station.id, chargerId: resolvedChargerId, priority, severity },
    });

    emitMaintenanceUpdated({ ticketId: ticket_id, stationId: station.id, status: technicianId ? "ASSIGNED" : "OPEN" });

    res.status(201).json({
      success: true,
      message: `Incident ${ticket_id} created successfully.`,
      data: { id: insertRes.insertId, ticket_id, issueType, status: technicianId ? "ASSIGNED" : "OPEN" },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating maintenance ticket", error: error.message });
  }
};

export const createIncidentAdmin = createMaintenanceAdmin;

export const updateMaintenanceAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    const { technicianId, status, priority, severity, resolutionNotes, issueType, description } = req.body;
    const adminId = req.user?.id || 1;

    const tickets = await query("SELECT * FROM maintenance_tickets WHERE id = ? OR ticket_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    if (tickets.length === 0) return res.status(404).json({ success: false, message: "Incident ticket not found." });
    const prev = tickets[0];

    const isResolving = status && ["RESOLVED", "CLOSED"].includes(status.toUpperCase());
    const isAssigning = technicianId && (!prev.technician_id || parseInt(technicianId, 10) !== prev.technician_id);

    await query(
      `UPDATE maintenance_tickets SET 
         technician_id = COALESCE(?, technician_id),
         assigned_by = COALESCE(?, assigned_by),
         assigned_at = CASE WHEN ? IS NOT NULL AND assigned_at IS NULL THEN NOW() ELSE assigned_at END,
         status = COALESCE(?, status),
         priority = COALESCE(?, priority),
         severity = COALESCE(?, severity),
         resolution_notes = COALESCE(?, resolution_notes),
         resolved_at = CASE WHEN ? = 1 THEN NOW() ELSE resolved_at END,
         issue_type = COALESCE(?, issue_type),
         description = COALESCE(?, description)
       WHERE id = ?`,
      [
        technicianId !== undefined ? (technicianId ? parseInt(technicianId, 10) : null) : null,
        isAssigning ? adminId : null,
        isAssigning ? 1 : null,
        status ? status.toUpperCase() : null,
        priority ? priority.toUpperCase() : null,
        severity ? severity.toUpperCase() : null,
        resolutionNotes || null,
        isResolving ? 1 : 0,
        issueType || null,
        description || null,
        prev.id,
      ]
    );

    // If resolved, restore charger status if needed
    if (isResolving && prev.charger_id) {
      await query("UPDATE chargers SET status = 'AVAILABLE', error_code = NULL, error_message = NULL WHERE id = ? AND status = 'FAULTED'", [prev.charger_id]);
      emitChargerStatusChanged({ id: prev.charger_id, status: "AVAILABLE" });
    }

    await recordAuditLog(query, {
      userId: adminId,
      userRole: req.user?.role || "ADMIN",
      action: "UPDATE_INCIDENT",
      entityType: "MAINTENANCE",
      entityId: prev.id,
      oldValue: prev,
      newValue: { status, technicianId, resolutionNotes, severity },
    });

    emitMaintenanceUpdated({ ticketId: prev.ticket_id, id: prev.id, status: status || prev.status });

    res.json({ success: true, message: `Incident ticket ${prev.ticket_id} updated successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating incident", error: error.message });
  }
};

export const updateIncidentAdmin = updateMaintenanceAdmin;

export const deleteMaintenanceAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    await query("DELETE FROM maintenance_tickets WHERE id = ? OR ticket_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    res.json({ success: true, message: "Incident ticket deleted." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting incident", error: error.message });
  }
};

export const deleteIncidentAdmin = deleteMaintenanceAdmin;

/**
 * 8. PAYMENT RECONCILIATION (D. Payment Reconciliation)
 */
export const getPaymentsAdmin = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { search, status, gateway, reconciliationStatus } = req.query;

    let whereSql = "WHERE 1=1";
    const params = [];

    if (status && status !== "ALL") {
      whereSql += " AND p.payment_status = ?";
      params.push(status.toUpperCase());
    }

    if (gateway && gateway !== "ALL") {
      whereSql += " AND LOWER(p.gateway) = ?";
      params.push(gateway.toLowerCase());
    }

    if (reconciliationStatus && reconciliationStatus !== "ALL") {
      whereSql += " AND p.reconciliation_status = ?";
      params.push(reconciliationStatus.toUpperCase());
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      whereSql += " AND (LOWER(p.payment_id) LIKE ? OR LOWER(p.gateway_payment_id) LIKE ? OR LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(b.booking_id) LIKE ?)";
      params.push(q, q, q, q, q);
    }

    const [countRow] = await query(
      `SELECT COUNT(*) as total 
       FROM payments p 
       LEFT JOIN users u ON p.user_id = u.id 
       LEFT JOIN bookings b ON (p.booking_id = b.id OR p.booking_id = b.booking_id)
       ${whereSql}`,
      params
    );
    const total = countRow?.total || 0;

    const payments = await query(
      `SELECT p.*, 
              u.name as user_name, u.email as user_email, u.phone as user_phone, u.user_id as user_code,
              b.booking_id as booking_code, b.booking_status, b.start_time as booking_start, b.end_time as booking_end,
              s.station_name, s.city as station_city,
              cs.session_id as session_code, cs.session_status, cs.energy_kwh,
              admin_user.name as refunded_by_name
       FROM payments p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN bookings b ON (p.booking_id = b.id OR p.booking_id = b.booking_id)
       LEFT JOIN stations s ON b.station_id = s.id
       LEFT JOIN charging_sessions cs ON (p.session_id = cs.id OR b.id = cs.booking_id)
       LEFT JOIN users admin_user ON p.refunded_by = admin_user.id
       ${whereSql}
       ORDER BY p.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const formatted = payments.map((p) => {
      // Determine reconciliation integrity status
      let reconStatus = p.reconciliation_status || "MATCHED";
      let reconNote = "Verified record";

      if (p.payment_status === "SUCCESS" && (!p.booking_code && !p.session_code)) {
        reconStatus = "UNMATCHED";
        reconNote = "Payment recorded without linked booking/session";
      } else if (p.payment_status === "SUCCESS" && p.booking_status === "CANCELLED") {
        reconStatus = "DISCREPANCY";
        reconNote = "Payment captured but booking marked cancelled";
      }

      return {
        id: p.id,
        paymentId: p.payment_id,
        payment_id: p.payment_id,
        bookingId: p.booking_code || (p.booking_id ? `BKG${String(p.booking_id).padStart(6, "0")}` : "—"),
        sessionId: p.session_code || "—",
        userId: p.user_id,
        userCode: p.user_code,
        userName: p.user_name || "EV Driver",
        userEmail: p.user_email,
        stationName: p.station_name || "EV Charging Station",
        stationCity: p.station_city || "Chennai",
        amount: parseFloat(p.amount) || 0.0,
        currency: p.currency || "INR",
        gateway: p.gateway || "RAZORPAY",
        gatewayPaymentId: p.gateway_payment_id || p.gateway_order_id || "—",
        paymentMethod: p.payment_method || "CARD",
        paymentStatus: p.payment_status || "SUCCESS",
        status: p.payment_status || "SUCCESS",
        reconciliationStatus: reconStatus,
        reconciliationNote: reconNote,
        refundAmount: parseFloat(p.refund_amount) || 0.0,
        refundReason: p.refund_reason,
        refundedAt: p.refunded_at,
        refundedByName: p.refunded_by_name,
        energyKwh: parseFloat(p.energy_kwh) || 0.0,
        paidAt: p.paid_at || p.created_at,
        createdAt: p.created_at,
      };
    });

    res.json({
      success: true,
      count: formatted.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: formatted,
      payments: formatted,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching payments reconciliation", error: error.message });
  }
};

export const getPaymentsReconciliation = getPaymentsAdmin;

export const refundPaymentAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { refundAmount, reason = "Customer requested authorized refund" } = req.body;
    const isNum = /^\d+$/.test(id);
    const adminId = req.user?.id || 1;

    const payments = await query("SELECT * FROM payments WHERE id = ? OR payment_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    if (payments.length === 0) return res.status(404).json({ success: false, message: "Payment record not found." });
    const payment = payments[0];

    if (payment.payment_status === "REFUNDED") {
      return res.status(400).json({ success: false, message: "Payment has already been refunded." });
    }

    const amountToRefund = refundAmount !== undefined ? parseFloat(refundAmount) : parseFloat(payment.amount);

    await query(
      `UPDATE payments SET 
         payment_status = 'REFUNDED',
         refund_amount = ?,
         refund_reason = ?,
         refunded_by = ?,
         refunded_at = NOW(),
         reconciliation_status = 'RECONCILED'
       WHERE id = ?`,
      [amountToRefund, reason.trim(), adminId, payment.id]
    );

    // If payment was made via wallet, credit balance back
    if (payment.payment_method === "WALLET" && payment.user_id) {
      await query("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?", [amountToRefund, payment.user_id]);
      const txId = await getNextSequenceId("WTX", "wallet_transactions");
      const [uRow] = await query("SELECT wallet_balance FROM users WHERE id = ?", [payment.user_id]);
      await query(
        `INSERT INTO wallet_transactions (transaction_id, user_id, type, amount, balance_after, description, booking_id)
         VALUES (?, ?, 'CREDIT', ?, ?, ?, ?)`,
        [txId, payment.user_id, amountToRefund, uRow?.wallet_balance || 0, `Refund: ${reason}`, payment.booking_id]
      );
    }

    await recordAuditLog(query, {
      userId: adminId,
      userRole: req.user?.role || "ADMIN",
      action: "REFUND_PAYMENT",
      entityType: "PAYMENT",
      entityId: payment.id,
      oldValue: { status: payment.payment_status, amount: payment.amount },
      newValue: { status: "REFUNDED", refundAmount: amountToRefund, reason },
    });

    emitPaymentUpdated({ id: payment.id, paymentId: payment.payment_id, paymentStatus: "REFUNDED", refundAmount: amountToRefund });

    res.json({
      success: true,
      message: `Refund of ₹${amountToRefund.toFixed(2)} processed successfully for payment ${payment.payment_id}.`,
      payment: {
        id: payment.id,
        paymentId: payment.payment_id,
        paymentStatus: "REFUNDED",
        refundAmount: amountToRefund,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error processing refund", error: error.message });
  }
};

export const updatePaymentAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    const { paymentStatus, reconciliationStatus } = req.body;

    await query(
      `UPDATE payments SET 
         payment_status = COALESCE(?, payment_status),
         reconciliation_status = COALESCE(?, reconciliation_status)
       WHERE id = ? OR payment_id = ?`,
      [paymentStatus ? paymentStatus.toUpperCase() : null, reconciliationStatus ? reconciliationStatus.toUpperCase() : null, isNum ? parseInt(id, 10) : 0, id]
    );

    res.json({ success: true, message: "Payment updated." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating payment", error: error.message });
  }
};

/**
 * 9. CHARGERS MANAGEMENT (CRUD)
 */
export const getChargersAdmin = async (req, res) => {
  try {
    const { stationId, status } = req.query;
    let sql = `
      SELECT c.*, s.station_name, s.station_id as station_code, s.city as station_city
      FROM chargers c
      JOIN stations s ON c.station_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (stationId && stationId !== "ALL") {
      const isNum = /^\d+$/.test(stationId);
      sql += ` AND (s.id = ? OR s.station_id = ?)`;
      params.push(isNum ? parseInt(stationId, 10) : 0, stationId);
    }

    if (status && status !== "ALL") {
      sql += ` AND c.status = ?`;
      params.push(status.toUpperCase());
    }

    sql += ` ORDER BY c.station_id ASC, c.id ASC`;
    const chargers = await query(sql, params);

    const formatted = chargers.map((c) => ({
      id: c.id,
      chargerId: c.charger_id,
      charger_id: c.charger_id,
      name: c.charger_name,
      chargerName: c.charger_name,
      stationId: c.station_id,
      stationName: c.station_name,
      stationCode: c.station_code,
      stationCity: c.station_city,
      chargerType: c.charger_type || "DC_FAST",
      powerKw: parseFloat(c.power_kw) || 60.0,
      status: c.status || "AVAILABLE",
      connectorCount: c.connector_count || 1,
      lastHeartbeat: c.last_heartbeat,
      isOnline: isChargerOnline(c.last_heartbeat, c.heartbeat_timeout_seconds || 60),
      isSimulated: Boolean(c.is_simulated),
      createdAt: c.created_at,
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching chargers", error: error.message });
  }
};

export const createChargerAdmin = async (req, res) => {
  try {
    const { stationId, chargerName, chargerType = "DC_FAST", powerKw = 60.0, status = "AVAILABLE" } = req.body;
    if (!stationId || !chargerName) return res.status(400).json({ success: false, message: "Station and Charger Name are required." });

    const isNum = /^\d+$/.test(stationId);
    const stationRows = await query("SELECT id, station_id FROM stations WHERE id = ? OR station_id = ?", [isNum ? parseInt(stationId, 10) : 0, stationId]);
    if (stationRows.length === 0) return res.status(404).json({ success: false, message: "Station not found." });
    const station = stationRows[0];

    const charger_id = await getNextSequenceId("CHG", "chargers");

    const insertRes = await query(
      `INSERT INTO chargers (charger_id, station_id, charger_name, charger_type, power_kw, status, last_heartbeat)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [charger_id, station.id, chargerName.trim(), chargerType.toUpperCase(), parseFloat(powerKw) || 60.0, status.toUpperCase()]
    );

    await query(
      `INSERT INTO charger_connectors (connector_id, charger_id, connector_type, power_kw, status)
       VALUES (?, ?, ?, ?, ?)`,
      [`${charger_id}-CON01`, insertRes.insertId, chargerType.toUpperCase(), parseFloat(powerKw) || 60.0, status.toUpperCase()]
    );

    await query("UPDATE stations SET total_slots = total_slots + 1, available_slots = available_slots + 1 WHERE id = ?", [station.id]);

    await recordAuditLog(query, {
      userId: req.user?.id,
      userRole: req.user?.role || "ADMIN",
      action: "CREATE_CHARGER",
      entityType: "CHARGER",
      entityId: insertRes.insertId,
      newValue: { charger_id, chargerName, stationId: station.id, chargerType, powerKw },
    });

    emitChargerStatusChanged({ id: insertRes.insertId, chargerId: charger_id, status: status.toUpperCase() });

    res.status(201).json({
      success: true,
      message: `Charger ${charger_id} created successfully!`,
      data: { id: insertRes.insertId, charger_id, chargerName },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating charger", error: error.message });
  }
};

export const updateChargerAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    const { chargerName, chargerType, powerKw, status } = req.body;

    const prevRows = await query("SELECT * FROM chargers WHERE id = ? OR charger_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    if (prevRows.length === 0) return res.status(404).json({ success: false, message: "Charger not found." });
    const prev = prevRows[0];

    await query(
      `UPDATE chargers SET 
         charger_name = COALESCE(?, charger_name),
         charger_type = COALESCE(?, charger_type),
         power_kw = COALESCE(?, power_kw),
         status = COALESCE(?, status)
       WHERE id = ?`,
      [
        chargerName ? chargerName.trim() : null,
        chargerType ? chargerType.toUpperCase() : null,
        powerKw !== undefined ? parseFloat(powerKw) : null,
        status ? status.toUpperCase() : null,
        prev.id,
      ]
    );

    await recordAuditLog(query, {
      userId: req.user?.id,
      userRole: req.user?.role || "ADMIN",
      action: "UPDATE_CHARGER",
      entityType: "CHARGER",
      entityId: prev.id,
      oldValue: prev,
      newValue: { chargerName, chargerType, powerKw, status },
    });

    if (status) emitChargerStatusChanged({ id: prev.id, chargerId: prev.charger_id, status });

    res.json({ success: true, message: "Charger updated successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating charger", error: error.message });
  }
};

export const deleteChargerAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    const prevRows = await query("SELECT id, charger_id, station_id FROM chargers WHERE id = ? OR charger_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    if (prevRows.length === 0) return res.status(404).json({ success: false, message: "Charger not found." });
    const target = prevRows[0];

    await query("DELETE FROM chargers WHERE id = ?", [target.id]);
    await query("UPDATE stations SET total_slots = GREATEST(1, total_slots - 1), available_slots = GREATEST(0, available_slots - 1) WHERE id = ?", [target.station_id]);

    await recordAuditLog(query, {
      userId: req.user?.id,
      userRole: req.user?.role || "ADMIN",
      action: "DELETE_CHARGER",
      entityType: "CHARGER",
      entityId: target.id,
      oldValue: target,
    });

    res.json({ success: true, message: `Charger ${target.charger_id} deleted successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting charger", error: error.message });
  }
};

/**
 * 10. BOOKINGS MANAGEMENT (CRUD)
 */
export const getBookingsAdmin = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { search, status, paymentStatus, stationId } = req.query;

    let whereSql = "WHERE 1=1";
    const params = [];

    if (status && status !== "ALL") {
      whereSql += " AND b.booking_status = ?";
      params.push(status.toUpperCase());
    }

    if (paymentStatus && paymentStatus !== "ALL") {
      whereSql += " AND b.payment_status = ?";
      params.push(paymentStatus.toUpperCase());
    }

    if (stationId && stationId !== "ALL") {
      const isNum = /^\d+$/.test(stationId);
      whereSql += " AND (s.id = ? OR s.station_id = ?)";
      params.push(isNum ? parseInt(stationId, 10) : 0, stationId);
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      whereSql += " AND (LOWER(b.booking_id) LIKE ? OR LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(s.station_name) LIKE ? OR LOWER(v.registration_number) LIKE ?)";
      params.push(q, q, q, q, q);
    }

    const [countRow] = await query(
      `SELECT COUNT(*) as total 
       FROM bookings b 
       LEFT JOIN users u ON b.user_id = u.id 
       LEFT JOIN stations s ON b.station_id = s.id 
       LEFT JOIN vehicles v ON b.vehicle_id = v.id 
       ${whereSql}`,
      params
    );
    const total = countRow?.total || 0;

    const rawBookings = await query(
      `SELECT b.*, 
              u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
              s.station_name, s.address as station_address, s.city as station_city, s.station_id as station_id_code,
              v.registration_number, v.brand, v.model, v.vehicle_type,
              c.charger_name, c.charger_type, c.power_kw
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       LEFT JOIN stations s ON b.station_id = s.id
       LEFT JOIN chargers c ON b.charger_id = c.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       ${whereSql}
       ORDER BY b.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const formatted = rawBookings.map(formatBooking);

    res.json({
      success: true,
      count: formatted.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: formatted,
      bookings: formatted,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching bookings", error: error.message });
  }
};

export const createBookingAdmin = async (req, res) => {
  try {
    const { userId, stationId, chargerId, bookingDate, startTime, endTime = "07:00:00", durationMinutes = 60, estimatedAmount = 400.0 } = req.body;
    if (!userId || !stationId || !chargerId || !bookingDate || !startTime) {
      return res.status(400).json({ success: false, message: "User, Station, Charger, Date, and Start Time are required." });
    }

    const booking_id = await getNextSequenceId("BKG", "bookings");

    const insertRes = await query(
      `INSERT INTO bookings (booking_id, user_id, station_id, charger_id, booking_date, start_time, end_time, duration_minutes, estimated_amount, booking_status, payment_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', 'SUCCESS')`,
      [booking_id, parseInt(userId, 10), parseInt(stationId, 10), parseInt(chargerId, 10), bookingDate, startTime, endTime, parseInt(durationMinutes, 10) || 60, parseFloat(estimatedAmount) || 400.0]
    );

    emitBookingCreated({ id: insertRes.insertId, bookingId: booking_id, stationId, status: "CONFIRMED" });

    res.status(201).json({
      success: true,
      message: `Booking ${booking_id} created successfully!`,
      data: { id: insertRes.insertId, booking_id },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating booking", error: error.message });
  }
};

export const updateBookingAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    const { bookingStatus, paymentStatus, startTime, endTime } = req.body;

    const prevRows = await query("SELECT * FROM bookings WHERE id = ? OR booking_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    if (prevRows.length === 0) return res.status(404).json({ success: false, message: "Booking not found." });
    const prev = prevRows[0];

    await query(
      `UPDATE bookings SET 
         booking_status = COALESCE(?, booking_status),
         payment_status = COALESCE(?, payment_status),
         start_time = COALESCE(?, start_time),
         end_time = COALESCE(?, end_time)
       WHERE id = ?`,
      [
        bookingStatus ? bookingStatus.toUpperCase() : null,
        paymentStatus ? paymentStatus.toUpperCase() : null,
        startTime || null,
        endTime || null,
        prev.id,
      ]
    );

    emitBookingUpdated({ id: prev.id, bookingId: prev.booking_id, bookingStatus, paymentStatus });

    res.json({ success: true, message: "Booking updated successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating booking", error: error.message });
  }
};

export const deleteBookingAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    await query("DELETE FROM bookings WHERE id = ? OR booking_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    res.json({ success: true, message: "Booking deleted." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting booking", error: error.message });
  }
};

/**
 * 11. CHARGING SESSIONS
 */
export const getSessionsAdmin = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { status, stationId } = req.query;

    let whereSql = "WHERE 1=1";
    const params = [];

    if (status && status !== "ALL") {
      whereSql += " AND cs.session_status = ?";
      params.push(status.toUpperCase());
    }

    if (stationId && stationId !== "ALL") {
      const isNum = /^\d+$/.test(stationId);
      whereSql += " AND (s.id = ? OR s.station_id = ?)";
      params.push(isNum ? parseInt(stationId, 10) : 0, stationId);
    }

    const [countRow] = await query(`SELECT COUNT(*) as total FROM charging_sessions cs JOIN stations s ON cs.station_id = s.id ${whereSql}`, params);
    const total = countRow?.total || 0;

    const sessions = await query(
      `SELECT cs.*, 
              u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
              s.station_name, s.city as station_city, s.station_id as station_code,
              c.charger_name, c.charger_type, c.power_kw as charger_max_power,
              v.registration_number, v.model as vehicle_model
       FROM charging_sessions cs
       JOIN stations s ON cs.station_id = s.id
       LEFT JOIN users u ON cs.user_id = u.id
       LEFT JOIN chargers c ON cs.charger_id = c.id
       LEFT JOIN vehicles v ON cs.vehicle_id = v.id
       ${whereSql}
       ORDER BY cs.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      count: sessions.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: sessions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching charging sessions", error: error.message });
  }
};

/**
 * 12. SECURITY AND AUDIT CENTER (E. Security and Audit Center)
 */
export const getAuditLogsAdmin = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { entityType, action, search, startDate, endDate } = req.query;

    let whereSql = "WHERE 1=1";
    const params = [];

    if (entityType && entityType !== "ALL") {
      whereSql += " AND al.entity_type = ?";
      params.push(entityType.toUpperCase());
    }

    if (action && action !== "ALL") {
      whereSql += " AND al.action LIKE ?";
      params.push(`%${action.toUpperCase()}%`);
    }

    if (startDate) {
      whereSql += " AND DATE(al.created_at) >= ?";
      params.push(startDate);
    }

    if (endDate) {
      whereSql += " AND DATE(al.created_at) <= ?";
      params.push(endDate);
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      whereSql += " AND (LOWER(al.action) LIKE ? OR LOWER(al.entity_id) LIKE ? OR LOWER(u.name) LIKE ? OR LOWER(al.details) LIKE ?)";
      params.push(q, q, q, q);
    }

    const [countRow] = await query(`SELECT COUNT(*) as total FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id ${whereSql}`, params);
    const total = countRow?.total || 0;

    const logs = await query(
      `SELECT al.*, u.name as user_name, u.email as user_email, u.role as actor_role
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereSql}
       ORDER BY al.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const formatted = logs.map((l) => ({
      id: l.id,
      userId: l.user_id,
      userName: l.user_name || "System Automated",
      userEmail: l.user_email || "system@voltcharge.internal",
      role: l.user_role || l.actor_role || "ADMIN",
      action: l.action,
      entityType: l.entity_type,
      entityId: l.entity_id,
      oldValue: l.old_value,
      newValue: l.new_value,
      details: l.details,
      ipAddress: l.ip_address || "127.0.0.1",
      createdAt: l.created_at,
    }));

    res.json({
      success: true,
      count: formatted.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: formatted,
      auditLogs: formatted,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching audit logs", error: error.message });
  }
};

/**
 * 13. NETWORK ANALYTICS (F. Network Analytics)
 */
export const getAnalyticsAdmin = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateWhere = "";
    const params = [];
    if (startDate && endDate) {
      dateWhere = "WHERE DATE(COALESCE(paid_at, created_at)) BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }

    // Revenue by month
    const revenueByMonth = await query(
      `SELECT DATE_FORMAT(COALESCE(paid_at, created_at), '%b %Y') as period,
              COUNT(id) as totalTransactions,
              COALESCE(SUM(amount), 0) as revenue
       FROM payments 
       WHERE payment_status = 'SUCCESS'
       GROUP BY DATE_FORMAT(COALESCE(paid_at, created_at), '%b %Y'), YEAR(COALESCE(paid_at, created_at)), MONTH(COALESCE(paid_at, created_at))
       ORDER BY YEAR(COALESCE(paid_at, created_at)) ASC, MONTH(COALESCE(paid_at, created_at)) ASC
       LIMIT 12`
    );

    // Energy delivered by month from sessions
    const energyByMonth = await query(
      `SELECT DATE_FORMAT(created_at, '%b %Y') as period,
              COUNT(id) as totalSessions,
              COALESCE(SUM(energy_kwh), 0) as totalEnergyKwh
       FROM charging_sessions
       WHERE session_status = 'COMPLETED'
       GROUP BY DATE_FORMAT(created_at, '%b %Y'), YEAR(created_at), MONTH(created_at)
       ORDER BY YEAR(created_at) ASC, MONTH(created_at) ASC
       LIMIT 12`
    );

    // Charger status distribution
    const [statusCounts] = await query(
      `SELECT 
         COUNT(*) as total,
         COALESCE(SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END), 0) as available,
         COALESCE(SUM(CASE WHEN status = 'CHARGING' THEN 1 ELSE 0 END), 0) as charging,
         COALESCE(SUM(CASE WHEN status = 'RESERVED' THEN 1 ELSE 0 END), 0) as reserved,
         COALESCE(SUM(CASE WHEN status IN ('FAULTED', 'MAINTENANCE') THEN 1 ELSE 0 END), 0) as faulted,
         COALESCE(SUM(CASE WHEN status = 'OFFLINE' THEN 1 ELSE 0 END), 0) as offline
       FROM chargers`
    );

    // Top utilized stations
    const topStations = await query(
      `SELECT s.id, s.station_name, s.city,
              COUNT(b.id) as totalBookings,
              COALESCE(SUM(p.amount), 0) as totalRevenue,
              COALESCE(SUM(cs.energy_kwh), 0) as totalEnergy
       FROM stations s
       LEFT JOIN bookings b ON s.id = b.station_id
       LEFT JOIN payments p ON (b.id = p.booking_id AND p.payment_status = 'SUCCESS')
       LEFT JOIN charging_sessions cs ON (b.id = cs.booking_id AND cs.session_status = 'COMPLETED')
       GROUP BY s.id
       ORDER BY totalRevenue DESC
       LIMIT 5`
    );

    res.json({
      success: true,
      revenueByMonth,
      energyByMonth,
      chargerDistribution: statusCounts,
      topStations,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error generating network analytics", error: error.message });
  }
};

export const getReports = getAnalyticsAdmin;

export const getDynamicSlotAnalytics = async (req, res) => {
  try {
    const stats = await query(
      `SELECT s.id, s.station_name, s.max_power, s.total_slots,
              (SELECT COUNT(*) FROM bookings b WHERE b.station_id = s.id AND b.booking_status = 'CONFIRMED') as confirmed_bookings,
              (SELECT COUNT(*) FROM chargers c WHERE c.station_id = s.id AND c.status = 'AVAILABLE') as available_chargers
       FROM stations s`
    );
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching slot analytics", error: error.message });
  }
};

export const getPendingNetworks = async (req, res) => res.json({ success: true, count: 0, data: [] });
export const approveNetwork = async (req, res) => res.json({ success: true, message: "Network approved." });
export const rejectNetwork = async (req, res) => res.json({ success: true, message: "Network rejected." });

export default {
  getStats,
  getAllUsers,
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  updateUserRole,
  getAllOwners,
  getPendingOwners,
  approveOwner,
  rejectOwner,
  suspendOwner,
  reactivateOwner,
  createOwner,
  updateOwner,
  deleteOwner,
  getAllTechnicians,
  createTechnician,
  updateTechnician,
  deleteTechnician,
  getStationsAdmin,
  getPendingStations,
  getStationPhotosAdmin,
  approveStation,
  rejectStation,
  suspendStation,
  reactivateStation,
  createStationAdmin,
  updateStationAdmin,
  deleteStationAdmin,
  getNetworkLiveMonitor,
  sendRemoteChargerCommand,
  getMaintenanceAdmin,
  getIncidentsAdmin,
  createMaintenanceAdmin,
  createIncidentAdmin,
  updateMaintenanceAdmin,
  updateIncidentAdmin,
  deleteMaintenanceAdmin,
  deleteIncidentAdmin,
  getPaymentsAdmin,
  getPaymentsReconciliation,
  refundPaymentAdmin,
  updatePaymentAdmin,
  getChargersAdmin,
  createChargerAdmin,
  updateChargerAdmin,
  deleteChargerAdmin,
  getBookingsAdmin,
  createBookingAdmin,
  updateBookingAdmin,
  deleteBookingAdmin,
  getSessionsAdmin,
  getAuditLogsAdmin,
  getAnalyticsAdmin,
  getReports,
  getDynamicSlotAnalytics,
  getPendingNetworks,
  approveNetwork,
  rejectNetwork,
};
