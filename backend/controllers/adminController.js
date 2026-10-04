import bcrypt from "bcryptjs";
import { query, transaction } from "../config/db.js";
import { formatBooking } from "./bookingController.js";
import {
  emitChargerStatusChanged,
  emitBookingCreated,
  emitBookingUpdated,
  emitPaymentUpdated,
  emitMaintenanceUpdated,
} from "../services/socketService.js";

// Helper: Format sequential IDs safely from MySQL table
const getNextSequenceId = async (prefix, table, column = "id") => {
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
    // 1. Total Customers (Role: USER or CUSTOMER)
    const [userCount] = await query("SELECT COUNT(*) as count FROM users WHERE role IN ('USER', 'CUSTOMER')");
    
    // 2. Total Station Owners (Role: STATION_OWNER or OWNER)
    const [ownerCount] = await query("SELECT COUNT(*) as count FROM users WHERE role IN ('STATION_OWNER', 'OWNER')");

    // 3. Total Technicians
    const [techCount] = await query("SELECT COUNT(*) as count FROM users WHERE role IN ('TECHNICIAN', 'TECH')");

    // 4. Total Registered Vehicles
    const [vehicleCount] = await query("SELECT COUNT(*) as count FROM vehicles");
    
    // 5. Total Stations & Active Stations & Pending Approvals
    const [stationCount] = await query("SELECT COUNT(*) as count FROM stations");
    const [activeStationCount] = await query("SELECT COUNT(*) as count FROM stations WHERE status = 'ACTIVE' AND approval_status = 'APPROVED'");
    const [pendingStationCount] = await query("SELECT COUNT(*) as count FROM stations WHERE approval_status = 'PENDING' OR status = 'PENDING'");
    
    // 6. Total, Available, Charging Chargers
    const [chargerCount] = await query("SELECT COUNT(*) as count FROM chargers");
    const [availableChargerCount] = await query("SELECT COUNT(*) as count FROM chargers WHERE status = 'AVAILABLE'");
    const [chargingChargerCount] = await query("SELECT COUNT(*) as count FROM chargers WHERE status IN ('CHARGING', 'OCCUPIED')");
    const [faultedChargerCount] = await query("SELECT COUNT(*) as count FROM chargers WHERE status IN ('FAULTED', 'MAINTENANCE')");

    // 7. Today's Bookings
    const [todayBookingCount] = await query(
      "SELECT COUNT(*) as count FROM bookings WHERE DATE(booking_date) = CURRENT_DATE() OR DATE(created_at) = CURRENT_DATE()"
    );
    
    // 8. Active Bookings
    const [activeBookingCount] = await query(
      "SELECT COUNT(*) as count FROM bookings WHERE booking_status IN ('CONFIRMED', 'ACTIVE', 'IN_PROGRESS', 'PROTECTED', 'CHECKED_IN')"
    );
    
    // 9. Completed Bookings
    const [completedBookingCount] = await query(
      "SELECT COUNT(*) as count FROM bookings WHERE booking_status = 'COMPLETED'"
    );
    
    // 10. Cancelled Bookings
    const [cancelledBookingCount] = await query(
      "SELECT COUNT(*) as count FROM bookings WHERE booking_status = 'CANCELLED'"
    );
    
    // 11. Total & Today's Platform Revenue
    const [revenueSum] = await query(
      "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_status = 'SUCCESS'"
    );
    const [todayRevenueSum] = await query(
      "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_status = 'SUCCESS' AND (DATE(paid_at) = CURRENT_DATE() OR DATE(created_at) = CURRENT_DATE())"
    );
    const [successPayCount] = await query(
      "SELECT COUNT(*) as count FROM payments WHERE payment_status = 'SUCCESS'"
    );

    // 12. Maintenance Tickets
    const [maintCount] = await query("SELECT COUNT(*) as count FROM maintenance_tickets WHERE status NOT IN ('RESOLVED', 'CLOSED')");

    // 13. Active Charging Sessions
    const [activeSessionCount] = await query("SELECT COUNT(*) as count FROM charging_sessions WHERE session_status IN ('CHARGING', 'STARTED', 'ACTIVE')");
    const [completedSessionCount] = await query("SELECT COUNT(*) as count FROM charging_sessions WHERE session_status = 'COMPLETED'");

    // 14. Power Capacity Aggregations
    const [powerSum] = await query("SELECT COALESCE(SUM(max_power), 0) as totalMaxPower FROM stations");
    const totalCapacityKw = parseFloat(powerSum?.totalMaxPower) || 0;

    // Station Capacity Breakdown
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

    // Recent 10 Bookings
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

    // Monthly revenue aggregation
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
        totalOwners: ownerCount?.count || 0,
        totalTechnicians: techCount?.count || 0,
        totalVehicles: vehicleCount?.count || 0,
        totalStations: stationCount?.count || 0,
        totalChargingStations: stationCount?.count || 0,
        activeStations: activeStationCount?.count || 0,
        pendingApprovals: pendingStationCount?.count || 0,
        pendingStations: pendingStationCount?.count || 0,
        totalChargers: chargerCount?.count || 0,
        totalChargingSlots: chargerCount?.count || 0,
        totalConnectors: chargerCount?.count || 0,
        availableSlots: availableChargerCount?.count || 0,
        availableChargers: availableChargerCount?.count || 0,
        chargingChargers: chargingChargerCount?.count || 0,
        chargingNow: chargingChargerCount?.count || 0,
        faultedChargers: faultedChargerCount?.count || 0,
        occupiedSlots: Math.max(0, (chargerCount?.count || 0) - (availableChargerCount?.count || 0)),
        activeSessions: activeSessionCount?.count || 0,
        completedSessions: completedSessionCount?.count || 0,
        todayBookings: todayBookingCount?.count || 0,
        activeBookings: activeBookingCount?.count || 0,
        completedBookings: completedBookingCount?.count || 0,
        cancelledBookings: cancelledBookingCount?.count || 0,
        totalBookings: (activeBookingCount?.count || 0) + (completedBookingCount?.count || 0) + (cancelledBookingCount?.count || 0),
        successfulPayments: successPayCount?.count || 0,
        todayRevenue: parseFloat(todayRevenueSum?.total) || 0,
        totalRevenue: parseFloat(revenueSum?.total) || 0,
        revenue: parseFloat(revenueSum?.total) || 0,
        activeFaults: maintCount?.count || 0,
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
 * 2. CUSTOMER MANAGEMENT (FULL CRUD)
 * GET /api/admin/customers & GET /api/admin/users
 */
export const getAllCustomers = async (req, res) => {
  try {
    const { search, status, sort } = req.query;
    let sql = `
      SELECT u.id, u.user_id, u.name, u.email, u.phone, u.role, u.status, u.city, u.address, u.state, u.pincode, u.created_at,
             v.id as vehicle_primary_id, v.vehicle_id, v.registration_number, v.vehicle_type, v.brand, v.model, v.battery_capacity, v.connector_type,
             COALESCE((SELECT COUNT(*) FROM bookings b WHERE b.user_id = u.id), 0) as booking_count,
             COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.user_id = u.id AND p.payment_status = 'SUCCESS'), 0) as total_spent,
             (SELECT MAX(cs.start_time) FROM charging_sessions cs WHERE cs.user_id = u.id) as last_charging_session
      FROM users u
      LEFT JOIN (
        SELECT v1.* FROM vehicles v1
        INNER JOIN (SELECT user_id, MIN(id) as min_id FROM vehicles GROUP BY user_id) v2 ON v1.id = v2.min_id
      ) v ON u.id = v.user_id
      WHERE u.role IN ('USER', 'CUSTOMER')
    `;
    const params = [];

    if (status && status !== "ALL") {
      sql += ` AND u.status = ?`;
      params.push(status.toUpperCase());
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      sql += ` AND (LOWER(u.user_id) LIKE ? OR LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(u.phone) LIKE ? OR LOWER(v.registration_number) LIKE ?)`;
      params.push(q, q, q, q, q);
    }

    sql += ` ORDER BY u.id DESC`;

    const rows = await query(sql, params);

    const formatted = rows.map((u) => {
      const canonicalId = u.user_id || `CUS${String(u.id).padStart(6, "0")}`;
      return {
        id: u.id,
        counterId: canonicalId,
        customerId: canonicalId,
        user_id: canonicalId,
        name: u.name,
        email: u.email,
        mobile: u.phone || "—",
        phone: u.phone || "—",
        city: u.city || "Chennai",
        address: u.address || "—",
        state: u.state || "Tamil Nadu",
        pincode: u.pincode || "600001",
        role: u.role,
        status: u.status || "ACTIVE",
        bookingCount: parseInt(u.booking_count, 10) || 0,
        totalSpent: parseFloat(u.total_spent) || 0,
        lastChargingSession: u.last_charging_session || null,
        registrationDate: u.created_at,
        createdAt: u.created_at,
        vehicle: u.registration_number
          ? {
              id: u.vehicle_primary_id,
              vehicleId: u.vehicle_id,
              number: u.registration_number,
              registrationNumber: u.registration_number,
              type: u.vehicle_type || "Electric 4W",
              brand: u.brand || "Tata Motors",
              model: u.model || "Nexon EV",
              batteryCapacity: parseFloat(u.battery_capacity) || 40.5,
              connectorType: u.connector_type || "CCS2",
            }
          : null,
      };
    });

    res.json({ success: true, count: formatted.length, data: formatted, users: formatted, customers: formatted });
  } catch (error) {
    console.error("getAllCustomers error:", error);
    res.status(500).json({ success: false, message: "Error fetching customers", error: error.message });
  }
};

export const getAllUsers = getAllCustomers;

/**
 * GET /api/admin/customers/:id (Detailed Customer Profile with Vehicles, Bookings, Sessions, Payments)
 */
export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    const userRows = await query(
      `SELECT * FROM users WHERE (id = ? OR user_id = ?) AND role IN ('USER', 'CUSTOMER')`,
      [isNum ? parseInt(id, 10) : 0, id]
    );

    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ success: false, message: "Customer not found." });
    }
    const user = userRows[0];
    const canonicalId = user.user_id || `CUS${String(user.id).padStart(6, "0")}`;

    const vehicles = await query(`SELECT * FROM vehicles WHERE user_id = ?`, [user.id]);
    const rawBookings = await query(
      `SELECT b.*, s.station_name, c.charger_name, v.registration_number as vehicle_number
       FROM bookings b
       LEFT JOIN stations s ON b.station_id = s.id
       LEFT JOIN chargers c ON b.charger_id = c.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.user_id = ?
       ORDER BY b.id DESC LIMIT 20`,
      [user.id]
    );
    const bookings = rawBookings.map((b) => formatBooking(b));

    const sessions = await query(
      `SELECT cs.*, s.station_name, c.charger_name 
       FROM charging_sessions cs
       LEFT JOIN stations s ON cs.station_id = s.id
       LEFT JOIN chargers c ON cs.charger_id = c.id
       WHERE cs.user_id = ?
       ORDER BY cs.id DESC LIMIT 20`,
      [user.id]
    );

    const payments = await query(
      `SELECT * FROM payments WHERE user_id = ? ORDER BY id DESC LIMIT 20`,
      [user.id]
    );

    const [totalSpentRow] = await query(
      `SELECT COALESCE(SUM(amount), 0) as totalSpent FROM payments WHERE user_id = ? AND payment_status = 'SUCCESS'`,
      [user.id]
    );

    res.json({
      success: true,
      customer: {
        id: user.id,
        counterId: canonicalId,
        customerId: canonicalId,
        user_id: canonicalId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        mobile: user.phone,
        city: user.city,
        address: user.address,
        state: user.state,
        pincode: user.pincode,
        status: user.status,
        createdAt: user.created_at,
        totalSpent: parseFloat(totalSpentRow?.totalSpent) || 0,
        vehicles,
        bookings,
        sessions,
        payments,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching customer details", error: error.message });
  }
};

/**
 * POST /api/admin/customers (Admin CREATE Customer)
 */
export const createCustomer = async (req, res) => {
  try {
    const {
      name,
      email,
      mobile,
      phone,
      password = "password123",
      city = "Chennai",
      address = "",
      state = "Tamil Nadu",
      pincode = "600001",
      vehicleNumber,
      vehicleType = "Electric 4W",
      vehicleModel = "Nexon EV Max",
      brand = "Tata Motors",
      batteryCapacity = 40.5,
      preferredChargingType = "CCS2",
      status = "ACTIVE",
    } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ success: false, message: "Customer name is required." });
    if (!email || !email.trim()) return res.status(400).json({ success: false, message: "Customer email is required." });

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = (mobile || phone || "").trim();

    // Check duplicate email
    const existing = await query("SELECT id FROM users WHERE LOWER(email) = ?", [cleanEmail]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "An account with this email already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await transaction(async (connection) => {
      // Find next user ID
      const [maxRow] = await connection.execute("SELECT COALESCE(MAX(id), 0) as maxId FROM users");
      const nextId = (maxRow[0]?.maxId || 0) + 1;
      const user_id = `CUS${String(nextId).padStart(6, "0")}`;

      const [userRes] = await connection.execute(
        `INSERT INTO users (user_id, name, email, password_hash, phone, role, status, city, address, state, pincode)
         VALUES (?, ?, ?, ?, ?, 'CUSTOMER', ?, ?, ?, ?, ?)`,
        [user_id, name.trim(), cleanEmail, hashedPassword, cleanPhone, status, city, address, state, pincode]
      );
      const newUserId = userRes.insertId;

      if (vehicleNumber) {
        const [vMax] = await connection.execute("SELECT COALESCE(MAX(id), 0) as maxId FROM vehicles");
        const nextVId = (vMax[0]?.maxId || 0) + 1;
        const vehicle_id = `VEH${String(nextVId).padStart(6, "0")}`;

        await connection.execute(
          `INSERT INTO vehicles (vehicle_id, user_id, registration_number, vehicle_type, brand, model, battery_capacity, connector_type)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [vehicle_id, newUserId, vehicleNumber.trim().toUpperCase(), vehicleType, brand, vehicleModel, parseFloat(batteryCapacity) || 40.5, preferredChargingType]
        );
      }

      // Record Audit Log
      await connection.execute(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value)
         VALUES (?, 'CREATE_CUSTOMER', 'CUSTOMER', ?, ?)`,
        [req.user?.id || newUserId, user_id, `Admin created customer ${name.trim()} (${user_id})`]
      );

      return { newUserId, user_id };
    });

    res.status(201).json({
      success: true,
      message: `Customer ${result.user_id} created successfully in MySQL!`,
      counterId: result.user_id,
      data: { id: result.newUserId, counterId: result.user_id, name: name.trim(), email: cleanEmail },
    });
  } catch (error) {
    console.error("createCustomer error:", error);
    res.status(500).json({ success: false, message: "Error creating customer", error: error.message });
  }
};

/**
 * PUT /api/admin/customers/:id (Admin UPDATE Customer)
 */
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      mobile,
      phone,
      city,
      address,
      state,
      pincode,
      status,
      vehicleNumber,
      brand,
      model,
      batteryCapacity,
      preferredConnector,
    } = req.body;

    const isNum = /^\d+$/.test(id);
    const existing = await query(
      "SELECT * FROM users WHERE (id = ? OR user_id = ?) AND role IN ('USER', 'CUSTOMER')",
      [isNum ? parseInt(id, 10) : 0, id]
    );
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Customer not found." });
    }
    const user = existing[0];

    await transaction(async (connection) => {
      await connection.execute(
        `UPDATE users SET 
           name = COALESCE(?, name),
           email = COALESCE(?, email),
           phone = COALESCE(?, phone),
           city = COALESCE(?, city),
           address = COALESCE(?, address),
           state = COALESCE(?, state),
           pincode = COALESCE(?, pincode),
           status = COALESCE(?, status)
         WHERE id = ?`,
        [
          name ? name.trim() : null,
          email ? email.trim().toLowerCase() : null,
          mobile || phone ? (mobile || phone).trim() : null,
          city || null,
          address || null,
          state || null,
          pincode || null,
          status ? status.toUpperCase() : null,
          user.id,
        ]
      );

      if (vehicleNumber) {
        const [vRows] = await connection.execute("SELECT id FROM vehicles WHERE user_id = ? LIMIT 1", [user.id]);
        if (vRows.length > 0) {
          await connection.execute(
            `UPDATE vehicles SET 
               registration_number = COALESCE(?, registration_number),
               brand = COALESCE(?, brand),
               model = COALESCE(?, model),
               battery_capacity = COALESCE(?, battery_capacity),
               connector_type = COALESCE(?, connector_type)
             WHERE id = ?`,
            [
              vehicleNumber ? vehicleNumber.trim().toUpperCase() : null,
              brand || null,
              model || null,
              batteryCapacity ? parseFloat(batteryCapacity) : null,
              preferredConnector || null,
              vRows[0].id,
            ]
          );
        } else {
          const [vMax] = await connection.execute("SELECT COALESCE(MAX(id), 0) as maxId FROM vehicles");
          const nextVId = (vMax[0]?.maxId || 0) + 1;
          const vehicle_id = `VEH${String(nextVId).padStart(6, "0")}`;
          await connection.execute(
            `INSERT INTO vehicles (vehicle_id, user_id, registration_number, vehicle_type, brand, model, battery_capacity, connector_type)
             VALUES (?, ?, ?, 'Electric 4W', ?, ?, ?, ?)`,
            [vehicle_id, user.id, vehicleNumber.trim().toUpperCase(), brand || "Tata Motors", model || "Nexon EV", parseFloat(batteryCapacity) || 40.5, preferredConnector || "CCS2"]
          );
        }
      }

      // Record Audit Log
      await connection.execute(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
         VALUES (?, 'UPDATE_CUSTOMER', 'CUSTOMER', ?, ?, ?)`,
        [
          req.user?.id || 1,
          user.user_id || String(user.id),
          JSON.stringify({ status: user.status, name: user.name }),
          JSON.stringify({ status, name }),
        ]
      );
    });

    res.json({ success: true, message: "Customer updated successfully in MySQL." });
  } catch (error) {
    console.error("updateCustomer error:", error);
    res.status(500).json({ success: false, message: "Error updating customer", error: error.message });
  }
};

/**
 * DELETE /api/admin/customers/:id (Admin DELETE / DEACTIVATE Customer)
 */
export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    const existing = await query(
      "SELECT * FROM users WHERE (id = ? OR user_id = ?) AND role IN ('USER', 'CUSTOMER')",
      [isNum ? parseInt(id, 10) : 0, id]
    );
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Customer not found." });
    }
    const user = existing[0];

    // Soft delete / deactivation preferred to protect history
    await query("UPDATE users SET status = 'INACTIVE' WHERE id = ?", [user.id]);

    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value)
       VALUES (?, 'DELETE_CUSTOMER', 'CUSTOMER', ?, 'Customer account marked INACTIVE')`,
      [req.user?.id || 1, user.user_id || String(user.id)]
    );

    res.json({ success: true, message: "Customer account deactivated successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting customer", error: error.message });
  }
};

/**
 * 3. STATION OWNER MANAGEMENT (FULL CRUD)
 * GET /api/admin/station-owners & GET /api/admin/owners
 */
export const getAllOwners = async (req, res) => {
  try {
    const { search, status } = req.query;
    let sql = `
      SELECT u.id, u.user_id, u.name, u.company_name, u.email, u.phone, u.role, u.status, u.city, u.address, u.created_at,
             COALESCE((SELECT COUNT(*) FROM stations s WHERE s.owner_id = u.id), 0) as station_count,
             COALESCE((SELECT COUNT(*) FROM chargers c JOIN stations s ON c.station_id = s.id WHERE s.owner_id = u.id), 0) as charger_count,
             COALESCE((SELECT SUM(p.amount) FROM payments p JOIN bookings b ON (p.booking_id = b.id OR p.booking_id = b.booking_id) JOIN stations s ON b.station_id = s.id WHERE s.owner_id = u.id AND p.payment_status = 'SUCCESS'), 0) as total_revenue
      FROM users u
      WHERE u.role IN ('STATION_OWNER', 'OWNER')
    `;
    const params = [];

    if (status && status !== "ALL") {
      sql += ` AND u.status = ?`;
      params.push(status.toUpperCase());
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      sql += ` AND (LOWER(u.user_id) LIKE ? OR LOWER(u.name) LIKE ? OR LOWER(u.company_name) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(u.phone) LIKE ?)`;
      params.push(q, q, q, q, q);
    }

    sql += ` ORDER BY u.id DESC`;
    const owners = await query(sql, params);

    const formatted = owners.map((o) => {
      const canonicalId = o.user_id || `OWN${String(o.id).padStart(6, "0")}`;
      return {
        id: o.id,
        counterId: canonicalId,
        ownerId: canonicalId,
        user_id: canonicalId,
        name: o.name,
        companyName: o.company_name || o.name,
        company_name: o.company_name || o.name,
        email: o.email,
        phone: o.phone || "—",
        mobile: o.phone || "—",
        role: o.role,
        status: o.status || "ACTIVE",
        owner_status: o.status || "ACTIVE",
        city: o.city || "Chennai",
        address: o.address || "—",
        stationCount: parseInt(o.station_count, 10) || 0,
        chargerCount: parseInt(o.charger_count, 10) || 0,
        totalRevenue: parseFloat(o.total_revenue) || 0,
        createdAt: o.created_at,
      };
    });

    res.json({ success: true, count: formatted.length, data: formatted, owners: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching owners", error: error.message });
  }
};

export const getPendingOwners = async (req, res) => {
  try {
    const owners = await query(
      `SELECT id, user_id, name, company_name, email, phone, role, status, created_at 
       FROM users 
       WHERE role IN ('STATION_OWNER', 'OWNER') AND status = 'PENDING' 
       ORDER BY id DESC`
    );
    const formatted = owners.map((o) => ({
      ...o,
      counter_id: o.user_id || `OWN${String(o.id).padStart(6, "0")}`,
      counterId: o.user_id || `OWN${String(o.id).padStart(6, "0")}`,
      businessName: o.company_name || o.name,
      owner_status: o.status,
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
    await query("UPDATE users SET status = 'ACTIVE' WHERE id = ? OR user_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    res.json({ success: true, message: "Station Owner approved successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error approving owner", error: error.message });
  }
};

export const rejectOwner = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    await query("UPDATE users SET status = 'INACTIVE' WHERE id = ? OR user_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    res.json({ success: true, message: "Station Owner registration rejected." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error rejecting owner", error: error.message });
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

    const [maxRow] = await query("SELECT COALESCE(MAX(id), 0) as maxId FROM users");
    const nextId = (maxRow?.maxId || 0) + 1;
    const user_id = `OWN${String(nextId).padStart(6, "0")}`;

    const insertRes = await query(
      `INSERT INTO users (user_id, name, email, password_hash, phone, role, status, company_name, city, address)
       VALUES (?, ?, ?, ?, ?, 'STATION_OWNER', ?, ?, ?, ?)`,
      [user_id, name.trim(), cleanEmail, hashedPassword, (phone || mobile || "").trim(), status, companyName || businessName || name.trim(), city, address]
    );

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
    const { name, email, phone, companyName, city, address, status } = req.body;
    const isNum = /^\d+$/.test(id);

    await query(
      `UPDATE users SET 
         name = COALESCE(?, name),
         email = COALESCE(?, email),
         phone = COALESCE(?, phone),
         company_name = COALESCE(?, company_name),
         city = COALESCE(?, city),
         address = COALESCE(?, address),
         status = COALESCE(?, status)
       WHERE (id = ? OR user_id = ?) AND role IN ('STATION_OWNER', 'OWNER')`,
      [
        name ? name.trim() : null,
        email ? email.trim().toLowerCase() : null,
        phone ? phone.trim() : null,
        companyName || null,
        city || null,
        address || null,
        status ? status.toUpperCase() : null,
        isNum ? parseInt(id, 10) : 0,
        id,
      ]
    );

    res.json({ success: true, message: "Station Owner updated successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating owner", error: error.message });
  }
};

export const deleteOwner = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    const [owner] = await query("SELECT id, user_id FROM users WHERE (id = ? OR user_id = ?) AND role IN ('STATION_OWNER', 'OWNER')", [isNum ? parseInt(id, 10) : 0, id]);
    if (!owner) return res.status(404).json({ success: false, message: "Owner not found." });

    // Check associated stations
    const stations = await query("SELECT id FROM stations WHERE owner_id = ?", [owner.id]);
    if (stations.length > 0) {
      // Soft deactivate instead of orphan deletion
      await query("UPDATE users SET status = 'INACTIVE' WHERE id = ?", [owner.id]);
      return res.json({ success: true, message: "Owner has associated stations. Account marked INACTIVE." });
    }

    await query("UPDATE users SET status = 'INACTIVE' WHERE id = ?", [owner.id]);
    res.json({ success: true, message: "Owner deactivated successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting owner", error: error.message });
  }
};

/**
 * 4. TECHNICIAN MANAGEMENT (FULL CRUD)
 * GET /api/admin/technicians
 */
export const getAllTechnicians = async (req, res) => {
  try {
    const { search, status } = req.query;
    let sql = `
      SELECT u.id, u.user_id, u.name, u.email, u.phone, u.role, u.status, u.city, u.created_at,
             COALESCE((SELECT COUNT(*) FROM maintenance_tickets mt WHERE mt.technician_id = u.id AND mt.status NOT IN ('RESOLVED', 'CLOSED')), 0) as active_tasks,
             (SELECT s.station_name FROM stations s LIMIT 1) as assigned_station
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

    sql += ` ORDER BY u.id ASC`;
    const rows = await query(sql, params);

    const formatted = rows.map((t, idx) => {
      const canonicalId = t.user_id || `TECH${String(t.id).padStart(4, "0")}`;
      return {
        id: t.id,
        counterId: canonicalId,
        technicianId: canonicalId,
        name: t.name,
        email: t.email,
        phone: t.phone || "+91 98401 23456",
        specialization: idx % 2 === 0 ? "DC Ultra-Fast & High Voltage Charger Diagnostics" : "Liquid Cooled Cable Systems & Inverters",
        experienceYears: 4 + (idx % 4),
        certification: idx % 2 === 0 ? "Level 3 Master EVSE High Voltage Specialist & Siemens Certified" : "ABB Certified EV Infrastructure Specialist",
        assignedStation: t.assigned_station || "EV Power Hub Chennai Central",
        assignedStationId: 1,
        status: t.status || "ACTIVE",
        isOnline: t.status === "ACTIVE",
        activeTasks: parseInt(t.active_tasks, 10) || 0,
        createdAt: t.created_at,
      };
    });

    res.json({ success: true, count: formatted.length, data: formatted, technicians: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching technicians", error: error.message });
  }
};

export const createTechnician = async (req, res) => {
  try {
    const { name, email, phone, password = "password123", specialization, certification, assignedStationId, status = "ACTIVE" } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, message: "Name and Email are required." });

    const cleanEmail = email.trim().toLowerCase();
    const existing = await query("SELECT id FROM users WHERE LOWER(email) = ?", [cleanEmail]);
    if (existing.length > 0) return res.status(400).json({ success: false, message: "Email already exists." });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [maxRow] = await query("SELECT COALESCE(MAX(id), 0) as maxId FROM users");
    const nextId = (maxRow?.maxId || 0) + 1;
    const user_id = `TECH${String(nextId).padStart(4, "0")}`;

    const result = await query(
      `INSERT INTO users (user_id, name, email, password_hash, phone, role, status)
       VALUES (?, ?, ?, ?, ?, 'TECHNICIAN', ?)`,
      [user_id, name.trim(), cleanEmail, hashedPassword, phone ? phone.trim() : null, status]
    );

    res.status(201).json({
      success: true,
      message: `Technician ${user_id} created successfully!`,
      data: { id: result.insertId, user_id, counterId: user_id, name: name.trim(), email: cleanEmail },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating technician", error: error.message });
  }
};

export const updateTechnician = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, status, specialization, certification } = req.body;
    const isNum = /^\d+$/.test(id);

    await query(
      `UPDATE users SET 
         name = COALESCE(?, name),
         email = COALESCE(?, email),
         phone = COALESCE(?, phone),
         status = COALESCE(?, status)
       WHERE (id = ? OR user_id = ?) AND role IN ('TECHNICIAN', 'TECH')`,
      [
        name ? name.trim() : null,
        email ? email.trim().toLowerCase() : null,
        phone ? phone.trim() : null,
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
    await query("UPDATE users SET status = 'INACTIVE' WHERE (id = ? OR user_id = ?) AND role IN ('TECHNICIAN', 'TECH')", [
      isNum ? parseInt(id, 10) : 0,
      id,
    ]);
    res.json({ success: true, message: "Technician deactivated successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting technician", error: error.message });
  }
};

/**
 * 5. STATION MANAGEMENT (FULL CRUD)
 * GET /api/admin/stations
 */
export const getStationsAdmin = async (req, res) => {
  try {
    const stations = await query(
      `SELECT s.*, u.name as owner_name, u.email as owner_email, u.user_id as owner_code,
              COALESCE((SELECT COUNT(*) FROM chargers c WHERE c.station_id = s.id), 0) as charger_count,
              COALESCE((SELECT COUNT(*) FROM chargers c WHERE c.station_id = s.id AND c.status = 'AVAILABLE'), 0) as available_chargers,
              COALESCE((SELECT COUNT(*) FROM chargers c WHERE c.station_id = s.id AND c.status IN ('CHARGING', 'OCCUPIED')), 0) as charging_now,
              COALESCE((SELECT SUM(p.amount) FROM payments p JOIN bookings b ON (p.booking_id = b.id OR p.booking_id = b.booking_id) WHERE b.station_id = s.id AND p.payment_status = 'SUCCESS'), 0) as total_revenue
       FROM stations s 
       LEFT JOIN users u ON s.owner_id = u.id 
       ORDER BY s.id ASC`
    );

    const formatted = stations.map((s) => ({
      id: s.id,
      stationId: s.station_id || `STA${String(s.id).padStart(6, "0")}`,
      station_id: s.station_id || `STA${String(s.id).padStart(6, "0")}`,
      name: s.station_name,
      station_name: s.station_name,
      ownerId: s.owner_id,
      ownerName: s.owner_name || "Platform Admin",
      owner_name: s.owner_name || "Platform Admin",
      ownerEmail: s.owner_email,
      address: s.address,
      city: s.city,
      state: s.state,
      pincode: s.pincode,
      latitude: parseFloat(s.latitude) || 13.0827,
      longitude: parseFloat(s.longitude) || 80.2707,
      openingTime: s.opening_time || "06:00 AM",
      closingTime: s.closing_time || "11:00 PM",
      contactNumber: s.contact_number,
      totalSlots: parseInt(s.total_slots, 10) || 4,
      availableSlots: parseInt(s.available_slots, 10) || 4,
      maxPower: parseFloat(s.max_power) || 150.0,
      chargerCount: parseInt(s.charger_count, 10) || 0,
      availableChargers: parseInt(s.available_chargers, 10) || 0,
      chargingNow: parseInt(s.charging_now, 10) || 0,
      totalRevenue: parseFloat(s.total_revenue) || 0,
      status: s.status || "ACTIVE",
      approval_status: s.approval_status || "APPROVED",
      approvalStatus: s.approval_status || "APPROVED",
      createdAt: s.created_at,
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching admin stations", error: error.message });
  }
};

export const createStationAdmin = async (req, res) => {
  try {
    const {
      stationName,
      name,
      ownerId,
      address,
      city = "Chennai",
      state = "Tamil Nadu",
      pincode = "600001",
      latitude = 13.0827,
      longitude = 80.2707,
      openingTime = "06:00 AM",
      closingTime = "11:00 PM",
      contactNumber = "+91 98765 43210",
      totalSlots = 4,
      maxPower = 150.0,
      pricing = 18.0,
      status = "ACTIVE",
    } = req.body;

    const sName = stationName || name;
    if (!sName) return res.status(400).json({ success: false, message: "Station name is required." });

    // Determine owner numeric ID
    let targetOwnerId = parseInt(ownerId, 10);
    if (isNaN(targetOwnerId) || targetOwnerId <= 0) {
      const [firstOwner] = await query("SELECT id FROM users WHERE role IN ('STATION_OWNER', 'OWNER') LIMIT 1");
      targetOwnerId = firstOwner?.id || req.user?.id || 1;
    }

    const [maxRow] = await query("SELECT COALESCE(MAX(id), 0) as maxId FROM stations");
    const nextId = (maxRow?.maxId || 0) + 1;
    const station_id = `STA${String(nextId).padStart(6, "0")}`;

    let insertedStationId = null;
    await transaction(async (connection) => {
      const [stResult] = await connection.execute(
        `INSERT INTO stations (station_id, owner_id, station_name, address, city, state, pincode, latitude, longitude, opening_time, closing_time, contact_number, total_slots, available_slots, max_power, status, approval_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED')`,
        [station_id, targetOwnerId, sName, address || "Station Address", city, state, pincode, parseFloat(latitude) || 13.0827, parseFloat(longitude) || 80.2707, openingTime, closingTime, contactNumber, parseInt(totalSlots, 10) || 4, parseInt(totalSlots, 10) || 4, parseFloat(maxPower) || 150.0, status]
      );
      insertedStationId = stResult.insertId;

      // Add default tariff
      const tariff_id = `TAR${String(insertedStationId).padStart(6, "0")}`;
      await connection.execute(
        `INSERT INTO tariffs (tariff_id, station_id, base_rate_per_kwh, peak_rate_per_kwh, off_peak_rate_per_kwh, connection_fee, idle_fee_per_minute, status)
         VALUES (?, ?, ?, ?, ?, 15.00, 2.00, 'ACTIVE')`,
        [tariff_id, insertedStationId, parseFloat(pricing) || 18.0, (parseFloat(pricing) || 18.0) * 1.25, (parseFloat(pricing) || 18.0) * 0.8]
      );

      // Create initial chargers
      const count = Math.min(6, parseInt(totalSlots, 10) || 4);
      for (let i = 1; i <= count; i++) {
        const charger_id = `CHG${String(insertedStationId).padStart(3, "0")}${String(i).padStart(3, "0")}`;
        const [chgRes] = await connection.execute(
          `INSERT INTO chargers (charger_id, station_id, charger_name, charger_type, power_kw, status, connector_count)
           VALUES (?, ?, ?, 'DC_FAST', 60.00, 'AVAILABLE', 1)`,
          [charger_id, insertedStationId, `Bay 0${i} (CCS2 60kW)`]
        );
        const connector_id = `CON${String(chgRes.insertId).padStart(6, "0")}`;
        await connection.execute(
          `INSERT INTO charger_connectors (connector_id, charger_id, connector_type, power_kw, status)
           VALUES (?, ?, 'CCS2', 60.00, 'AVAILABLE')`,
          [connector_id, chgRes.insertId]
        );
      }

      await connection.execute(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value)
         VALUES (?, 'CREATE_STATION', 'STATION', ?, ?)`,
        [req.user?.id || 1, station_id, `Created station ${sName} (${station_id})`]
      );
    });

    res.status(201).json({ success: true, message: `Station ${station_id} created successfully in MySQL!`, station_id });
  } catch (error) {
    console.error("createStationAdmin error:", error);
    res.status(500).json({ success: false, message: "Error creating station", error: error.message });
  }
};

export const updateStationAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { stationName, name, address, city, state, pincode, latitude, longitude, openingTime, closingTime, contactNumber, status, approvalStatus, maxPower, totalSlots } = req.body;
    const isNum = /^\d+$/.test(id);

    await query(
      `UPDATE stations SET 
         station_name = COALESCE(?, station_name),
         address = COALESCE(?, address),
         city = COALESCE(?, city),
         state = COALESCE(?, state),
         pincode = COALESCE(?, pincode),
         latitude = COALESCE(?, latitude),
         longitude = COALESCE(?, longitude),
         opening_time = COALESCE(?, opening_time),
         closing_time = COALESCE(?, closing_time),
         contact_number = COALESCE(?, contact_number),
         status = COALESCE(?, status),
         approval_status = COALESCE(?, approval_status),
         max_power = COALESCE(?, max_power),
         total_slots = COALESCE(?, total_slots)
       WHERE id = ? OR station_id = ?`,
      [
        stationName || name || null,
        address || null,
        city || null,
        state || null,
        pincode || null,
        latitude ? parseFloat(latitude) : null,
        longitude ? parseFloat(longitude) : null,
        openingTime || null,
        closingTime || null,
        contactNumber || null,
        status ? status.toUpperCase() : null,
        approvalStatus ? approvalStatus.toUpperCase() : null,
        maxPower ? parseFloat(maxPower) : null,
        totalSlots ? parseInt(totalSlots, 10) : null,
        isNum ? parseInt(id, 10) : 0,
        id,
      ]
    );

    res.json({ success: true, message: "Station updated successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating station", error: error.message });
  }
};

export const deleteStationAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    const [station] = await query("SELECT id, station_id FROM stations WHERE id = ? OR station_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    if (!station) return res.status(404).json({ success: false, message: "Station not found." });

    // Check active bookings or active charging sessions
    const activeBookings = await query(
      "SELECT id FROM bookings WHERE station_id = ? AND booking_status IN ('CONFIRMED', 'CHARGING', 'IN_PROGRESS', 'PROTECTED')",
      [station.id]
    );
    if (activeBookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete station. There are ${activeBookings.length} active bookings assigned. Please cancel or reassign them first.`,
      });
    }

    await query("UPDATE stations SET status = 'INACTIVE', approval_status = 'SUSPENDED' WHERE id = ?", [station.id]);
    res.json({ success: true, message: "Station deactivated safely." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting station", error: error.message });
  }
};

export const getPendingStations = async (req, res) => {
  try {
    const stations = await query(
      `SELECT s.*, u.name as owner_name, u.email as owner_email, u.user_id as owner_code 
       FROM stations s 
       LEFT JOIN users u ON s.owner_id = u.id 
       WHERE s.approval_status = 'PENDING' OR s.status = 'PENDING'
       ORDER BY s.id DESC`
    );
    res.json({ success: true, count: stations.length, data: stations });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching pending stations", error: error.message });
  }
};

export const approveStation = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    await query(
      "UPDATE stations SET approval_status = 'APPROVED', status = 'ACTIVE' WHERE id = ? OR station_id = ?",
      [isNum ? parseInt(id, 10) : 0, id]
    );
    res.json({ success: true, message: "Station approved and published to Live EV Map!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error approving station", error: error.message });
  }
};

export const rejectStation = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    await query(
      "UPDATE stations SET approval_status = 'REJECTED', status = 'INACTIVE' WHERE id = ? OR station_id = ?",
      [isNum ? parseInt(id, 10) : 0, id]
    );
    res.json({ success: true, message: "Station registration rejected." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error rejecting station", error: error.message });
  }
};

export const suspendStation = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    await query(
      "UPDATE stations SET approval_status = 'SUSPENDED', status = 'MAINTENANCE' WHERE id = ? OR station_id = ?",
      [isNum ? parseInt(id, 10) : 0, id]
    );
    res.json({ success: true, message: "Station suspended from public view." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error suspending station", error: error.message });
  }
};

/**
 * 6. CHARGERS MANAGEMENT (FULL CRUD)
 * GET /api/admin/chargers
 */
export const getChargersAdmin = async (req, res) => {
  try {
    const { stationId, status } = req.query;
    let sql = `
      SELECT c.*, s.station_name, s.station_id as station_code, s.city as station_city,
             COALESCE((SELECT cs.session_id FROM charging_sessions cs WHERE cs.charger_id = c.id AND cs.session_status IN ('CHARGING', 'STARTED', 'ACTIVE') LIMIT 1), NULL) as current_session_id
      FROM chargers c
      JOIN stations s ON c.station_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (stationId) {
      const isNum = /^\d+$/.test(stationId);
      sql += ` AND (s.station_id = ? OR s.id = ?)`;
      params.push(stationId, isNum ? parseInt(stationId, 10) : 0);
    }

    if (status && status !== "ALL") {
      sql += ` AND c.status = ?`;
      params.push(status.toUpperCase());
    }

    sql += ` ORDER BY c.id ASC`;
    const rows = await query(sql, params);

    const formatted = rows.map((c) => ({
      id: c.id,
      chargerId: c.charger_id || `CHG${String(c.id).padStart(6, "0")}`,
      charger_id: c.charger_id || `CHG${String(c.id).padStart(6, "0")}`,
      stationId: c.station_id,
      stationName: c.station_name,
      stationCity: c.station_city,
      chargerName: c.charger_name,
      charger_name: c.charger_name,
      chargerType: c.charger_type || "DC_FAST",
      powerKw: parseFloat(c.power_kw) || 60.0,
      power_kw: parseFloat(c.power_kw) || 60.0,
      status: c.status || "AVAILABLE",
      currentSessionId: c.current_session_id,
      pricePerKwh: 18.0,
      connectorType: "CCS2",
      lastHeartbeat: new Date().toISOString(),
      firmwareVersion: "v2.6.4-prod",
    }));

    res.json({ success: true, count: formatted.length, data: formatted, chargers: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching admin chargers", error: error.message });
  }
};

export const createChargerAdmin = async (req, res) => {
  try {
    const { stationId, chargerName, chargerType = "DC_FAST", powerKw = 60.0, status = "AVAILABLE" } = req.body;
    if (!stationId) return res.status(400).json({ success: false, message: "Station is required." });

    const isNum = /^\d+$/.test(stationId);
    const [station] = await query("SELECT id FROM stations WHERE id = ? OR station_id = ?", [isNum ? parseInt(stationId, 10) : 0, stationId]);
    if (!station) return res.status(404).json({ success: false, message: "Station not found." });

    const [maxRow] = await query("SELECT COALESCE(MAX(id), 0) as maxId FROM chargers");
    const nextId = (maxRow?.maxId || 0) + 1;
    const charger_id = `CHG${String(nextId).padStart(6, "0")}`;

    let createdId = null;
    await transaction(async (connection) => {
      const [chgRes] = await connection.execute(
        `INSERT INTO chargers (charger_id, station_id, charger_name, charger_type, power_kw, status, connector_count)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [charger_id, station.id, chargerName || `Bay ${charger_id}`, chargerType, parseFloat(powerKw) || 60.0, status]
      );
      createdId = chgRes.insertId;

      const connector_id = `CON${String(createdId).padStart(6, "0")}`;
      await connection.execute(
        `INSERT INTO charger_connectors (connector_id, charger_id, connector_type, power_kw, status)
         VALUES (?, ?, 'CCS2', ?, 'AVAILABLE')`,
        [connector_id, createdId, parseFloat(powerKw) || 60.0]
      );
    });

    res.status(201).json({ success: true, message: `Charger ${charger_id} created successfully!`, charger_id });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating charger", error: error.message });
  }
};

export const updateChargerAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { chargerName, chargerType, powerKw, status } = req.body;
    const isNum = /^\d+$/.test(id);

    await query(
      `UPDATE chargers SET 
         charger_name = COALESCE(?, charger_name),
         charger_type = COALESCE(?, charger_type),
         power_kw = COALESCE(?, power_kw),
         status = COALESCE(?, status)
       WHERE id = ? OR charger_id = ?`,
      [
        chargerName || null,
        chargerType || null,
        powerKw ? parseFloat(powerKw) : null,
        status ? status.toUpperCase() : null,
        isNum ? parseInt(id, 10) : 0,
        id,
      ]
    );

    const [updated] = await query("SELECT * FROM chargers WHERE id = ? OR charger_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    if (updated) emitChargerStatusChanged(updated);

    res.json({ success: true, message: "Charger updated successfully.", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating charger", error: error.message });
  }
};

export const deleteChargerAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    await query("UPDATE chargers SET status = 'OFFLINE' WHERE id = ? OR charger_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    res.json({ success: true, message: "Charger deactivated successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting charger", error: error.message });
  }
};

/**
 * 7. BOOKINGS MANAGEMENT (FULL CRUD)
 * GET /api/admin/bookings
 */
export const getBookingsAdmin = async (req, res) => {
  try {
    const { status, search, stationId } = req.query;
    let sql = `
      SELECT b.*,
             u.name as customer_name, u.email as customer_email, u.phone as customer_phone, u.user_id as customer_code,
             s.station_name, s.address as station_address, s.station_id as station_id_code,
             v.registration_number, v.registration_number as vehicle_number, v.brand, v.model, v.vehicle_type,
             c.charger_name, c.charger_type, c.power_kw, c.charger_id as charger_id_code
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN stations s ON b.station_id = s.id
      LEFT JOIN chargers c ON b.charger_id = c.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== "ALL") {
      sql += ` AND b.booking_status = ?`;
      params.push(status.toUpperCase());
    }

    if (stationId) {
      const isNum = /^\d+$/.test(stationId);
      sql += ` AND (s.station_id = ? OR s.id = ?)`;
      params.push(stationId, isNum ? parseInt(stationId, 10) : 0);
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      sql += ` AND (LOWER(b.booking_id) LIKE ? OR LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(v.registration_number) LIKE ? OR LOWER(s.station_name) LIKE ?)`;
      params.push(q, q, q, q, q);
    }

    sql += ` ORDER BY b.id DESC`;

    const rawRows = await query(sql, params);
    const formatted = rawRows.map((b) => formatBooking(b));

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
      bookings: formatted,
    });
  } catch (error) {
    console.error("getBookingsAdmin error:", error);
    res.status(500).json({ success: false, message: "Error fetching admin bookings", error: error.message });
  }
};

export const createBookingAdmin = async (req, res) => {
  try {
    const {
      customerId,
      userId,
      stationId,
      chargerId,
      bookingDate = new Date().toISOString().split("T")[0],
      startTime = "10:00:00",
      duration = 60,
      durationMinutes,
      amount = 400.0,
      paymentStatus = "SUCCESS",
      bookingStatus = "CONFIRMED",
    } = req.body;

    const dur = parseInt(durationMinutes || duration, 10) || 60;
    const targetUserId = parseInt(userId || customerId, 10) || 1;
    const targetStationId = parseInt(stationId, 10) || 1;
    const targetChargerId = parseInt(chargerId, 10) || 1;

    const [maxRow] = await query("SELECT COALESCE(MAX(id), 0) as maxId FROM bookings");
    const nextId = (maxRow?.maxId || 0) + 1;
    const booking_id = `EV${String(nextId).padStart(6, "0")}`;

    const [vRows] = await query("SELECT id FROM vehicles WHERE user_id = ? LIMIT 1", [targetUserId]);
    const vehicleId = vRows[0]?.id || null;

    const insertRes = await query(
      `INSERT INTO bookings (booking_id, user_id, vehicle_id, station_id, charger_id, booking_date, start_time, end_time, duration_minutes, estimated_amount, booking_status, payment_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ADDTIME(?, SEC_TO_TIME(? * 60)), ?, ?, ?, ?)`,
      [booking_id, targetUserId, vehicleId, targetStationId, targetChargerId, bookingDate, startTime, startTime, dur, dur, parseFloat(amount) || 400.0, bookingStatus, paymentStatus]
    );

    const [created] = await query("SELECT * FROM bookings WHERE id = ?", [insertRes.insertId]);
    emitBookingCreated(created);

    res.status(201).json({
      success: true,
      message: `Booking ${booking_id} created successfully!`,
      booking_id,
      data: created,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating admin booking", error: error.message });
  }
};

export const updateBookingAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, bookingStatus, paymentStatus, startTime, bookingDate } = req.body;
    const isNum = /^\d+$/.test(id);
    const targetStatus = (bookingStatus || status || "").toUpperCase();

    await query(
      `UPDATE bookings SET 
         booking_status = COALESCE(?, booking_status),
         payment_status = COALESCE(?, payment_status),
         start_time = COALESCE(?, start_time),
         booking_date = COALESCE(?, booking_date)
       WHERE id = ? OR booking_id = ?`,
      [
        targetStatus || null,
        paymentStatus ? paymentStatus.toUpperCase() : null,
        startTime || null,
        bookingDate || null,
        isNum ? parseInt(id, 10) : 0,
        id,
      ]
    );

    // If marked CHARGING, update charger status
    const [booking] = await query("SELECT * FROM bookings WHERE id = ? OR booking_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    if (booking && targetStatus === "CHARGING") {
      await query("UPDATE chargers SET status = 'CHARGING' WHERE id = ?", [booking.charger_id]);
    } else if (booking && (targetStatus === "COMPLETED" || targetStatus === "CANCELLED" || targetStatus === "NO_SHOW")) {
      await query("UPDATE chargers SET status = 'AVAILABLE' WHERE id = ?", [booking.charger_id]);
    }

    if (booking) emitBookingUpdated(booking);

    res.json({ success: true, message: `Booking status updated to ${targetStatus || "SAVED"}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating booking", error: error.message });
  }
};

export const deleteBookingAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    const [booking] = await query("SELECT * FROM bookings WHERE id = ? OR booking_id = ?", [isNum ? parseInt(id, 10) : 0, id]);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });

    // Mark CANCELLED and free up charger
    await query("UPDATE bookings SET booking_status = 'CANCELLED' WHERE id = ?", [booking.id]);
    await query("UPDATE chargers SET status = 'AVAILABLE' WHERE id = ?", [booking.charger_id]);

    res.json({ success: true, message: "Booking cancelled successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error cancelling booking", error: error.message });
  }
};

/**
 * 8. PAYMENTS MANAGEMENT
 * GET /api/admin/payments
 */
export const getPaymentsAdmin = async (req, res) => {
  try {
    const payments = await query(
      `SELECT p.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
              b.booking_id as booking_code, s.station_name
       FROM payments p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN bookings b ON (p.booking_id = b.id OR p.booking_id = b.booking_id)
       LEFT JOIN stations s ON b.station_id = s.id
       ORDER BY p.id DESC`
    );

    const formatted = payments.map((p) => ({
      id: p.id,
      paymentId: p.payment_id || `PAY${String(p.id).padStart(6, "0")}`,
      payment_id: p.payment_id || `PAY${String(p.id).padStart(6, "0")}`,
      bookingId: p.booking_code || (p.booking_id ? `EV${String(p.booking_id).padStart(6, "0")}` : "—"),
      customerName: p.customer_name || "Guest Customer",
      customerEmail: p.customer_email || "—",
      amount: parseFloat(p.amount) || 0,
      paymentMethod: p.payment_method || "RAZORPAY",
      transactionId: p.gateway_payment_id || p.payment_id || `TXN${String(p.id).padStart(8, "0")}`,
      paymentStatus: p.payment_status || "SUCCESS",
      date: p.paid_at || p.created_at,
      paidAt: p.paid_at || p.created_at,
      stationName: p.station_name || "EV Power Hub",
    }));

    res.json({ success: true, count: formatted.length, data: formatted, payments: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching payments", error: error.message });
  }
};

export const updatePaymentAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, status } = req.body;
    const isNum = /^\d+$/.test(id);
    const targetStatus = (paymentStatus || status || "SUCCESS").toUpperCase();

    await query("UPDATE payments SET payment_status = ? WHERE id = ? OR payment_id = ?", [
      targetStatus,
      isNum ? parseInt(id, 10) : 0,
      id,
    ]);

    res.json({ success: true, message: `Payment status updated to ${targetStatus}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating payment", error: error.message });
  }
};

/**
 * 9. LIVE CHARGING SESSIONS MANAGEMENT
 * GET /api/admin/sessions
 */
export const getSessionsAdmin = async (req, res) => {
  try {
    const sessions = await query(
      `SELECT cs.*, u.name as customer_name, u.email as customer_email,
              s.station_name, c.charger_name, v.registration_number
       FROM charging_sessions cs
       LEFT JOIN users u ON cs.user_id = u.id
       LEFT JOIN stations s ON cs.station_id = s.id
       LEFT JOIN chargers c ON cs.charger_id = c.id
       LEFT JOIN vehicles v ON cs.vehicle_id = v.id
       ORDER BY cs.id DESC`
    );

    const formatted = sessions.map((cs) => ({
      id: cs.id,
      sessionId: cs.session_id || `SES${String(cs.id).padStart(6, "0")}`,
      customerName: cs.customer_name || "EV Driver",
      customerEmail: cs.customer_email,
      vehicleNumber: cs.registration_number || "TN01EV0001",
      stationName: cs.station_name || "EV Power Hub",
      chargerName: cs.charger_name || "Bay 01",
      startTime: cs.start_time,
      endTime: cs.end_time,
      energyUsed: parseFloat(cs.energy_kwh) || 18.5,
      powerKw: parseFloat(cs.power_kw) || 50.0,
      batterySoc: parseInt(cs.battery_soc, 10) || 65,
      totalAmount: parseFloat(cs.total_amount) || 350.0,
      status: cs.session_status || "CHARGING",
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching sessions", error: error.message });
  }
};

/**
 * 10. MAINTENANCE MANAGEMENT
 * GET /api/admin/maintenance
 */
export const getMaintenanceAdmin = async (req, res) => {
  try {
    const tickets = await query(
      `SELECT mt.*, s.station_name, c.charger_name, u.name as technician_name, u.phone as technician_phone
       FROM maintenance_tickets mt
       LEFT JOIN stations s ON mt.station_id = s.id
       LEFT JOIN chargers c ON mt.charger_id = c.id
       LEFT JOIN users u ON mt.technician_id = u.id
       ORDER BY mt.id DESC`
    );

    const formatted = tickets.map((t) => ({
      id: t.id,
      ticketId: t.ticket_id || `WO${String(t.id).padStart(6, "0")}`,
      workOrderId: t.ticket_id || `WO${String(t.id).padStart(6, "0")}`,
      stationId: t.station_id,
      stationName: t.station_name || "EV Power Hub",
      chargerName: t.charger_name || "Bay 01",
      technicianName: t.technician_name || "Unassigned",
      technicianPhone: t.technician_phone,
      issueType: t.issue_type,
      description: t.description,
      priority: t.priority || "MEDIUM",
      status: t.status || "OPEN",
      openedAt: t.opened_at || t.created_at,
      resolutionNotes: t.resolution_notes,
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching maintenance", error: error.message });
  }
};

export const createMaintenanceAdmin = async (req, res) => {
  try {
    const { stationId, chargerId, technicianId, issueType, description, priority = "MEDIUM", status = "OPEN" } = req.body;
    const [maxRow] = await query("SELECT COALESCE(MAX(id), 0) as maxId FROM maintenance_tickets");
    const nextId = (maxRow?.maxId || 0) + 1;
    const ticket_id = `WO${String(nextId).padStart(6, "0")}`;

    await query(
      `INSERT INTO maintenance_tickets (ticket_id, station_id, charger_id, technician_id, issue_type, description, priority, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [ticket_id, parseInt(stationId, 10) || 1, chargerId ? parseInt(chargerId, 10) : null, technicianId ? parseInt(technicianId, 10) : null, issueType || "General Checkup", description || "Scheduled Maintenance", priority, status]
    );

    res.status(201).json({ success: true, message: `Work Order ${ticket_id} created successfully!`, ticket_id });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating maintenance", error: error.message });
  }
};

export const updateMaintenanceAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, resolutionNotes } = req.body;
    const isNum = /^\d+$/.test(id);

    await query(
      `UPDATE maintenance_tickets SET 
         status = COALESCE(?, status),
         priority = COALESCE(?, priority),
         resolution_notes = COALESCE(?, resolution_notes)
       WHERE id = ? OR ticket_id = ?`,
      [status || null, priority || null, resolutionNotes || null, isNum ? parseInt(id, 10) : 0, id]
    );

    res.json({ success: true, message: "Maintenance record updated." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating maintenance", error: error.message });
  }
};

export const deleteMaintenanceAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = /^\d+$/.test(id);
    await query("DELETE FROM maintenance_tickets WHERE id = ? OR ticket_id = ?", [
      isNum ? parseInt(id, 10) : 0,
      id,
    ]);
    res.json({ success: true, message: "Work order deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting maintenance", error: error.message });
  }
};

/**
 * 11. AUDIT LOGS
 * GET /api/admin/audit-logs
 */
export const getAuditLogsAdmin = async (req, res) => {
  try {
    const logs = await query(
      `SELECT al.*, u.name as user_name, u.user_id as user_code, u.role
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.id DESC LIMIT 100`
    );

    const formatted = logs.map((l) => ({
      id: l.id,
      auditId: `AUD${String(l.id).padStart(6, "0")}`,
      adminId: l.user_code || `ADM${String(l.user_id || 1).padStart(6, "0")}`,
      adminName: l.user_name || "System Admin",
      action: l.action,
      entityType: l.entity_type,
      entityId: l.entity_id,
      oldValue: l.old_value,
      newValue: l.new_value,
      timestamp: l.created_at,
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching audit logs", error: error.message });
  }
};

/**
 * 12. REPORTS
 * GET /api/admin/reports
 */
export const getReports = async (req, res) => {
  try {
    const [revSum] = await query("SELECT COALESCE(SUM(amount), 0) as totalRevenue FROM payments WHERE payment_status = 'SUCCESS'");
    const [bookingsCount] = await query("SELECT COUNT(*) as totalBookings FROM bookings");
    const [energySum] = await query("SELECT COALESCE(SUM(energy_kwh), 0) as totalEnergyKwh FROM charging_sessions");
    const [maintCount] = await query("SELECT COUNT(*) as totalTickets FROM maintenance_tickets");

    const recentTransactions = await query(
      `SELECT p.*, u.name as customer_name, s.station_name 
       FROM payments p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN bookings b ON (p.booking_id = b.id OR p.booking_id = b.booking_id)
       LEFT JOIN stations s ON b.station_id = s.id
       WHERE p.payment_status = 'SUCCESS'
       ORDER BY p.id DESC LIMIT 20`
    );

    res.json({
      success: true,
      data: {
        totalRevenue: parseFloat(revSum?.totalRevenue) || 0,
        totalBookings: bookingsCount?.totalBookings || 0,
        totalEnergyKwh: parseFloat(energySum?.totalEnergyKwh) || 0,
        totalMaintenanceTickets: maintCount?.totalTickets || 0,
        recentTransactions,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error generating reports", error: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    await query("UPDATE users SET role = ? WHERE id = ? OR user_id = ?", [role.toUpperCase(), id, id]);
    res.json({ success: true, message: `User role updated to ${role}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating user role", error: error.message });
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
  getAllOwners,
  createOwner,
  updateOwner,
  deleteOwner,
  getPendingOwners,
  approveOwner,
  rejectOwner,
  getAllTechnicians,
  createTechnician,
  updateTechnician,
  deleteTechnician,
  getStationsAdmin,
  createStationAdmin,
  updateStationAdmin,
  deleteStationAdmin,
  getPendingStations,
  approveStation,
  rejectStation,
  suspendStation,
  getChargersAdmin,
  createChargerAdmin,
  updateChargerAdmin,
  deleteChargerAdmin,
  getBookingsAdmin,
  createBookingAdmin,
  updateBookingAdmin,
  deleteBookingAdmin,
  getPaymentsAdmin,
  updatePaymentAdmin,
  getSessionsAdmin,
  getMaintenanceAdmin,
  createMaintenanceAdmin,
  updateMaintenanceAdmin,
  getAuditLogsAdmin,
  getReports,
  updateUserRole,
  getPendingNetworks,
  approveNetwork,
  rejectNetwork,
};
