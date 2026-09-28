import { query } from "../config/db.js";

/**
 * GET /api/vehicles
 * Get vehicles for authenticated user (or all vehicles if Admin)
 */
export const getVehicles = async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === "ADMIN";
    const requestedUserId = req.query.userId;

    let sql = "SELECT * FROM vehicles WHERE user_id = ? ORDER BY id DESC";
    let params = [userId];

    if (isAdmin && requestedUserId) {
      sql = "SELECT * FROM vehicles WHERE user_id = ? ORDER BY id DESC";
      params = [requestedUserId];
    } else if (isAdmin && !requestedUserId && req.query.all === "true") {
      sql = "SELECT v.*, u.name as owner_name, u.email as owner_email FROM vehicles v JOIN users u ON v.user_id = u.id ORDER BY v.id DESC";
      params = [];
    }

    const vehicles = await query(sql, params);

    // Format for frontend compatibility
    const formatted = vehicles.map((v) => ({
      id: v.id,
      vehicleId: `VEH${String(v.id).padStart(3, "0")}`,
      userId: v.user_id,
      customerId: `CUS${String(v.user_id).padStart(4, "0")}`,
      vehicleNumber: v.vehicle_number,
      vehicleType: v.vehicle_type,
      brand: v.brand || "Tata Motors",
      manufacturer: v.brand || "Tata Motors",
      model: v.model,
      batteryCapacity: parseFloat(v.battery_capacity) || 40.5,
      batteryPercentage: 65,
      connectorType: "CCS2",
      range: Math.round((parseFloat(v.battery_capacity) || 40.5) * 7.5),
      createdAt: v.created_at,
    }));

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("Get Vehicles Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching vehicles",
      error: error.message,
    });
  }
};

/**
 * GET /api/vehicles/:id
 * Get single vehicle by ID
 */
export const getVehicleById = async (req, res) => {
  try {
    const vehicleId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    const rows = await query("SELECT * FROM vehicles WHERE id = ?", [vehicleId]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    const v = rows[0];

    // Ownership check
    if (!isAdmin && v.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this vehicle.",
      });
    }

    res.json({
      success: true,
      data: {
        id: v.id,
        vehicleId: `VEH${String(v.id).padStart(3, "0")}`,
        userId: v.user_id,
        vehicleNumber: v.vehicle_number,
        vehicleType: v.vehicle_type,
        brand: v.brand,
        manufacturer: v.brand,
        model: v.model,
        batteryCapacity: parseFloat(v.battery_capacity),
        createdAt: v.created_at,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching vehicle", error: error.message });
  }
};

/**
 * POST /api/vehicles
 * Create a new vehicle for logged-in user
 */
export const createVehicle = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      vehicle_number,
      vehicleNumber,
      vehicle_type,
      vehicleType = "Car",
      brand,
      manufacturer,
      model,
      battery_capacity,
      batteryCapacity = 40.5,
    } = req.body;

    const rawNumber = vehicle_number || vehicleNumber;
    if (!rawNumber || !rawNumber.trim()) {
      return res.status(400).json({ success: false, message: "Vehicle number is required." });
    }

    const cleanNumber = rawNumber.trim().toUpperCase();
    const cleanBrand = brand || manufacturer || "Tata Motors";
    const cleanModel = model ? model.trim() : "Nexon EV";
    const cleanType = vehicle_type || vehicleType || "Car";
    const cleanCapacity = parseFloat(battery_capacity || batteryCapacity) || 40.5;

    // Check duplicate vehicle number
    const existing = await query("SELECT id FROM vehicles WHERE vehicle_number = ?", [cleanNumber]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Vehicle with number "${cleanNumber}" is already registered.`,
      });
    }

    const result = await query(
      `INSERT INTO vehicles (user_id, vehicle_number, vehicle_type, brand, model, battery_capacity)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, cleanNumber, cleanType, cleanBrand, cleanModel, cleanCapacity]
    );

    const insertedId = result.insertId;

    res.status(201).json({
      success: true,
      message: "Vehicle added successfully!",
      data: {
        id: insertedId,
        vehicleId: `VEH${String(insertedId).padStart(3, "0")}`,
        userId,
        vehicleNumber: cleanNumber,
        vehicleType: cleanType,
        brand: cleanBrand,
        manufacturer: cleanBrand,
        model: cleanModel,
        batteryCapacity: cleanCapacity,
        range: Math.round(cleanCapacity * 7.5),
      },
    });
  } catch (error) {
    console.error("Create Vehicle Error:", error);
    res.status(500).json({
      success: false,
      message: "Error adding vehicle.",
      error: error.message,
    });
  }
};

/**
 * PUT /api/vehicles/:id
 * Update an existing vehicle
 */
export const updateVehicle = async (req, res) => {
  try {
    const vehicleId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    // Verify existing vehicle
    const existing = await query("SELECT * FROM vehicles WHERE id = ?", [vehicleId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Vehicle not found." });
    }

    if (!isAdmin && existing[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this vehicle.",
      });
    }

    const {
      vehicle_number,
      vehicleNumber,
      vehicle_type,
      vehicleType,
      brand,
      manufacturer,
      model,
      battery_capacity,
      batteryCapacity,
    } = req.body;

    const cleanNumber = (vehicle_number || vehicleNumber || existing[0].vehicle_number).toUpperCase().trim();
    const cleanType = vehicle_type || vehicleType || existing[0].vehicle_type;
    const cleanBrand = brand || manufacturer || existing[0].brand;
    const cleanModel = model || existing[0].model;
    const cleanCapacity = parseFloat(battery_capacity || batteryCapacity || existing[0].battery_capacity);

    // If number changed, verify uniqueness
    if (cleanNumber !== existing[0].vehicle_number) {
      const duplicate = await query(
        "SELECT id FROM vehicles WHERE vehicle_number = ? AND id != ?",
        [cleanNumber, vehicleId]
      );
      if (duplicate.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Vehicle number "${cleanNumber}" is already in use by another vehicle.`,
        });
      }
    }

    await query(
      `UPDATE vehicles 
       SET vehicle_number = ?, vehicle_type = ?, brand = ?, model = ?, battery_capacity = ?
       WHERE id = ?`,
      [cleanNumber, cleanType, cleanBrand, cleanModel, cleanCapacity, vehicleId]
    );

    res.json({
      success: true,
      message: "Vehicle updated successfully!",
      data: {
        id: parseInt(vehicleId, 10),
        vehicleId: `VEH${String(vehicleId).padStart(3, "0")}`,
        userId: existing[0].user_id,
        vehicleNumber: cleanNumber,
        vehicleType: cleanType,
        brand: cleanBrand,
        manufacturer: cleanBrand,
        model: cleanModel,
        batteryCapacity: cleanCapacity,
      },
    });
  } catch (error) {
    console.error("Update Vehicle Error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating vehicle.",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/vehicles/:id
 * Delete vehicle
 */
export const deleteVehicle = async (req, res) => {
  try {
    const vehicleId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    const existing = await query("SELECT * FROM vehicles WHERE id = ?", [vehicleId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Vehicle not found." });
    }

    if (!isAdmin && existing[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this vehicle.",
      });
    }

    // Check if vehicle has active bookings
    const bookings = await query(
      "SELECT id FROM bookings WHERE vehicle_id = ? AND status IN ('CONFIRMED', 'IN_PROGRESS', 'PENDING')",
      [vehicleId]
    );
    if (bookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete vehicle with active or upcoming bookings.",
      });
    }

    await query("DELETE FROM vehicles WHERE id = ?", [vehicleId]);

    res.json({
      success: true,
      message: "Vehicle deleted successfully!",
    });
  } catch (error) {
    console.error("Delete Vehicle Error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting vehicle.",
      error: error.message,
    });
  }
};

export default {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
};
