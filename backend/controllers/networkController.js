import { query } from "../config/db.js";

/**
 * GET /api/networks
 * Fetch all EV networks with their station counts
 */
export const getNetworks = async (req, res) => {
  try {
    const networks = await query(`
      SELECT n.*, u.name as owner_name, u.email as owner_email,
             COUNT(s.id) as station_count
      FROM ev_networks n
      LEFT JOIN users u ON n.owner_id = u.id
      LEFT JOIN charging_stations s ON s.network_id = n.id OR s.network_name = n.network_name
      GROUP BY n.id
      ORDER BY n.network_name ASC
    `);

    res.json({
      success: true,
      count: networks.length,
      data: networks.map((net) => ({
        id: net.id,
        networkId: net.network_id || `NET${String(net.id).padStart(3, "0")}`,
        networkName: net.network_name,
        name: net.network_name,
        ownerId: net.owner_id,
        ownerName: net.owner_name,
        ownerEmail: net.owner_email,
        description: net.description || "",
        logo: net.logo || "",
        contactEmail: net.contact_email || "",
        contactPhone: net.contact_phone || "",
        website: net.website || "",
        status: net.status || "APPROVED",
        stationCount: parseInt(net.station_count || 0, 10),
        createdAt: net.created_at,
      })),
    });
  } catch (error) {
    console.error("Get Networks Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch EV networks",
      error: error.message,
    });
  }
};

/**
 * GET /api/networks/:id
 */
export const getNetworkById = async (req, res) => {
  try {
    const { id } = req.params;
    const networks = await query(
      "SELECT n.*, u.name as owner_name FROM ev_networks n LEFT JOIN users u ON n.owner_id = u.id WHERE n.id = ? OR n.network_id = ?",
      [id, id]
    );

    if (networks.length === 0) {
      return res.status(404).json({
        success: false,
        message: "EV Network not found",
      });
    }

    const net = networks[0];
    const stations = await query(
      "SELECT * FROM charging_stations WHERE network_id = ? OR network_name = ?",
      [net.id, net.network_name]
    );

    res.json({
      success: true,
      data: {
        id: net.id,
        networkId: net.network_id || `NET${String(net.id).padStart(3, "0")}`,
        networkName: net.network_name,
        ownerId: net.owner_id,
        ownerName: net.owner_name,
        description: net.description || "",
        logo: net.logo || "",
        contactEmail: net.contact_email || "",
        contactPhone: net.contact_phone || "",
        website: net.website || "",
        status: net.status || "APPROVED",
        stations,
        createdAt: net.created_at,
      },
    });
  } catch (error) {
    console.error("Get Network By ID Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch EV network",
      error: error.message,
    });
  }
};

/**
 * POST /api/networks
 * Station Owner registers a new EV Network
 */
export const createNetwork = async (req, res) => {
  try {
    const { networkName, description, contactEmail, contactPhone, website, logo } = req.body;
    const ownerId = req.user?.id || req.body.ownerId || 2;

    if (!networkName || !networkName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Network Name is required",
      });
    }

    const networkId = `NET${Date.now().toString().slice(-4)}`;

    const result = await query(
      `INSERT INTO ev_networks (network_id, owner_id, network_name, description, contact_email, contact_phone, website, logo, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        networkId,
        ownerId,
        networkName.trim(),
        description || null,
        contactEmail || req.user?.email || null,
        contactPhone || req.user?.phone || null,
        website || null,
        logo || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: "EV Network registered successfully! Submitted for Admin approval.",
      data: {
        id: result.insertId,
        networkId,
        networkName: networkName.trim(),
        ownerId,
        status: "PENDING",
      },
    });
  } catch (error) {
    console.error("Create Network Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to register EV Network",
      error: error.message,
    });
  }
};

/**
 * PUT /api/networks/:id
 */
export const updateNetwork = async (req, res) => {
  try {
    const { id } = req.params;
    const { networkName, description, contactEmail, contactPhone, website, logo, status } = req.body;

    await query(
      `UPDATE ev_networks SET 
         network_name = COALESCE(?, network_name),
         description = COALESCE(?, description),
         contact_email = COALESCE(?, contact_email),
         contact_phone = COALESCE(?, contact_phone),
         website = COALESCE(?, website),
         logo = COALESCE(?, logo),
         status = COALESCE(?, status)
       WHERE id = ?`,
      [networkName, description, contactEmail, contactPhone, website, logo, status, id]
    );

    res.json({
      success: true,
      message: "EV Network updated successfully",
    });
  } catch (error) {
    console.error("Update Network Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update EV Network",
      error: error.message,
    });
  }
};
