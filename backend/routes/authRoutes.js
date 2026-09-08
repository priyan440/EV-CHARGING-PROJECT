import express from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { StationOwner } from "../models/StationOwner.js";
import { Counter } from "../models/Counter.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "ev_charge_pro_secure_jwt_secret_2026";

const AUTHORIZED_ADMIN_EMAILS = [
  "admin@evcharge.com",
  "administrator@evcharge.com",
  "admin.evcharge@gmail.com",
  "priyan.admin@evcharge.com",
];

// Helper to decode or parse Google JWT token payload safely
function parseGoogleToken(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      Buffer.from(base64, "base64")
        .toString("binary")
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    return null;
  }
}

/**
 * POST /api/auth/login (Dual Login: Email OR Counter ID for Customer, Station Owner, Admin)
 */
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: "Email or Counter ID and password are required." });
    }

    const cleanInput = identifier.trim().toUpperCase();
    const cleanEmail = identifier.trim().toLowerCase();

    // 1. ADMIN CHECK: Either Counter ID 'ADM0001' or Admin Email
    const isAdminId = cleanInput === "ADM0001" || cleanInput.startsWith("ADM");
    const isAdminEmail = AUTHORIZED_ADMIN_EMAILS.some((adm) => adm.toLowerCase() === cleanEmail);

    if (isAdminId || isAdminEmail) {
      if (password === "admin123") {
        const token = jwt.sign({ id: "ADM0001", counterId: "ADM0001", role: "ADMIN" }, JWT_SECRET, { expiresIn: "7d" });
        return res.json({
          success: true,
          token,
          user: {
            id: "ADM0001",
            counterId: "ADM0001",
            name: "System Administrator",
            email: "admin@evcharge.com",
            role: "ADMIN",
            status: "Active",
          },
          message: "Welcome Administrator!",
        });
      }
      return res.status(401).json({ success: false, message: "Invalid Admin password." });
    }

    // 2. STATION OWNER CHECK: Search by Counter ID (e.g. OWNER0001) OR Business Email
    const owner = await StationOwner.findOne({
      $or: [{ counterId: cleanInput }, { email: cleanEmail }],
    }).catch(() => null);

    if (owner) {
      if (owner.password !== password) {
        return res.status(401).json({ success: false, message: "Incorrect Station Owner password." });
      }
      if (owner.status === "Suspended" || owner.status === "Rejected") {
        return res.status(403).json({ success: false, message: `Your Station Owner account is ${owner.status}.` });
      }

      const token = jwt.sign(
        { id: owner._id, counterId: owner.counterId, role: "STATION_OWNER" },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      const ownerObj = owner.toObject();
      delete ownerObj.password;

      return res.json({
        success: true,
        token,
        user: {
          ...ownerObj,
          id: owner.counterId,
          counterId: owner.counterId,
          name: owner.ownerName,
          role: "STATION_OWNER",
        },
        message: `Welcome back, ${owner.ownerName}!`,
      });
    }

    // 3. CUSTOMER CHECK: Search by Counter ID (e.g. CUS0001) OR Personal Email
    const customer = await User.findOne({
      $or: [{ counterId: cleanInput }, { email: cleanEmail }],
    }).catch(() => null);

    if (customer) {
      if (customer.password !== password) {
        return res.status(401).json({ success: false, message: "Incorrect password." });
      }
      if (customer.status === "Suspended") {
        return res.status(403).json({ success: false, message: "Your customer account has been suspended." });
      }

      const token = jwt.sign(
        { id: customer._id, counterId: customer.counterId, role: customer.role || "CUSTOMER" },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      const customerObj = customer.toObject();
      delete customerObj.password;

      return res.json({
        success: true,
        token,
        user: {
          ...customerObj,
          id: customer.counterId,
          counterId: customer.counterId,
          role: customer.role || "CUSTOMER",
        },
        message: `Welcome back, ${customer.name}!`,
      });
    }

    // Account not found in database
    return res.status(404).json({
      success: false,
      message: `No account found for "${identifier}". Please check your Counter ID or Email.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Authentication server error: " + err.message });
  }
});

/**
 * POST /api/auth/register-customer
 * Registers a new Customer and auto-generates the next sequential CUS Counter ID from MongoDB
 */
router.post("/register-customer", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      mobile,
      address,
      city,
      pincode,
      brand,
      model,
      vehicleNumber,
      vehicleType,
      batteryCapacity,
      preferredConnector,
    } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: "An account with this email address already exists." });
    }

    // Atomically increment CUS Counter sequence in MongoDB
    const counterDoc = await Counter.findByIdAndUpdate(
      "CUS",
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const newCounterId = `CUS${counterDoc.seq.toString().padStart(4, "0")}`;

    const newCustomer = new User({
      counterId: newCounterId,
      name: name.trim(),
      email: cleanEmail,
      mobile: mobile ? mobile.trim() : "",
      password: password,
      role: "CUSTOMER",
      address: address ? address.trim() : "",
      city: city ? city.trim() : "Chennai",
      pincode: pincode ? pincode.trim() : "600001",
      status: "Active",
      vehicles: [
        {
          id: `VEH${Date.now().toString().slice(-4)}`,
          number: vehicleNumber ? vehicleNumber.trim().toUpperCase() : "TN01EV0001",
          brand: brand || "Tata Motors",
          model: model || "Nexon EV Max",
          type: vehicleType || "Electric SUV",
          vehicleType: vehicleType || "Electric SUV",
          batteryCapacity: parseFloat(batteryCapacity) || 40.5,
          batteryPercentage: 65,
          connectorType: preferredConnector || "CCS2",
          isPrimary: true,
        },
      ],
      chargingPreference: {
        type: "DC Fast Charging",
        connector: preferredConnector || "CCS2",
      },
    });

    await newCustomer.save();

    const token = jwt.sign(
      { id: newCustomer._id, counterId: newCounterId, role: "CUSTOMER" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const userObj = newCustomer.toObject();
    delete userObj.password;

    res.status(201).json({
      success: true,
      counterId: newCounterId,
      token,
      user: {
        ...userObj,
        id: newCounterId,
        counterId: newCounterId,
      },
      message: `Account created successfully! Your Customer ID is ${newCounterId}.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Customer registration error: " + err.message });
  }
});

/**
 * POST /api/auth/register-owner
 * Registers a new Station Owner and auto-generates the next sequential OWNER Counter ID from MongoDB
 */
router.post("/register-owner", async (req, res) => {
  try {
    const {
      ownerName,
      businessName,
      email,
      phone,
      password,
      businessAddress,
      city,
      pincode,
      gstNumber,
    } = req.body;

    if (!email || !ownerName || !password) {
      return res.status(400).json({ success: false, message: "Owner name, email, and password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await StationOwner.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: "A Station Owner with this email already exists." });
    }

    // Atomically increment OWNER Counter sequence in MongoDB
    const counterDoc = await Counter.findByIdAndUpdate(
      "OWNER",
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const newCounterId = `OWNER${counterDoc.seq.toString().padStart(4, "0")}`;

    const newOwner = new StationOwner({
      counterId: newCounterId,
      ownerName: ownerName.trim(),
      businessName: businessName ? businessName.trim() : "EV Power Hub",
      email: cleanEmail,
      phone: phone ? phone.trim() : "",
      password: password,
      businessAddress: businessAddress ? businessAddress.trim() : "",
      city: city ? city.trim() : "Chennai",
      state: "Tamil Nadu",
      pincode: pincode ? pincode.trim() : "600002",
      gstNumber: gstNumber ? gstNumber.trim().toUpperCase() : "",
      status: "Approved", // Approved for direct login and immediate functionality
    });

    await newOwner.save();

    const token = jwt.sign(
      { id: newOwner._id, counterId: newCounterId, role: "STATION_OWNER" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const ownerObj = newOwner.toObject();
    delete ownerObj.password;

    res.status(201).json({
      success: true,
      counterId: newCounterId,
      token,
      user: {
        ...ownerObj,
        id: newCounterId,
        counterId: newCounterId,
        name: ownerName.trim(),
        role: "STATION_OWNER",
      },
      message: `Station Owner registered successfully! Your Owner ID is ${newCounterId}.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Station Owner registration error: " + err.message });
  }
});

/**
 * GET /api/auth/counters
 * Returns current counter sequences from MongoDB database
 */
router.get("/counters", async (req, res) => {
  try {
    const counters = await Counter.find({});
    res.json({ success: true, count: counters.length, data: counters });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/auth/users
 * Returns list of registered customers from MongoDB database
 */
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, "-password").sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/auth/owners
 * Returns list of registered station owners from MongoDB database
 */
router.get("/owners", async (req, res) => {
  try {
    const owners = await StationOwner.find({}, "-password").sort({ createdAt: -1 });
    res.json({ success: true, count: owners.length, data: owners });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/auth/google (Google OAuth 2.0 Backend Endpoint)
 */
router.post("/google", async (req, res) => {
  try {
    const { credential, intendedRole = "CUSTOMER", additionalDetails } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, message: "Google credential token is required." });
    }

    const payload = parseGoogleToken(credential);
    if (!payload || !payload.email) {
      return res.status(400).json({ success: false, message: "Invalid Google credential token." });
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || "Google EV User";
    const googleId = payload.sub;
    const profileImage = payload.picture || null;

    // Security Rule 10: Admin Google Login
    if (intendedRole === "ADMIN") {
      const isAuthorized = AUTHORIZED_ADMIN_EMAILS.some((adm) => adm.toLowerCase() === email);
      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          code: "UNAUTHORIZED_ADMIN",
          message: "Access denied. This Google account is not authorized for administrator access.",
        });
      }

      const token = jwt.sign({ id: "ADM0001", email, role: "ADMIN" }, JWT_SECRET, { expiresIn: "7d" });
      return res.json({
        success: true,
        token,
        user: {
          id: "ADM0001",
          counterId: "ADM0001",
          name,
          email,
          profileImage,
          role: "ADMIN",
          authProvider: "google",
        },
      });
    }

    // Security Rule 9: Station Owner Google Login
    if (intendedRole === "STATION_OWNER") {
      const owner = await StationOwner.findOne({ email }).catch(() => null);
      if (!owner) {
        return res.status(403).json({
          success: false,
          code: "UNAUTHORIZED_OWNER",
          message: "Your Google account is not registered as a Station Owner.",
          action: "REGISTER_OWNER",
        });
      }

      if (owner.status !== "Approved") {
        return res.status(403).json({ success: false, message: `Station Owner status is ${owner.status}.` });
      }

      const token = jwt.sign({ id: owner._id, counterId: owner.counterId, role: "STATION_OWNER" }, JWT_SECRET, { expiresIn: "7d" });
      return res.json({
        success: true,
        token,
        user: {
          ...owner.toObject(),
          googleId,
          profileImage: profileImage || owner.profileImage,
          role: "STATION_OWNER",
          authProvider: "google",
        },
      });
    }

    // Security Rule 6 & 7: Customer Google Login
    let customer = await User.findOne({ email }).catch(() => null);

    if (customer) {
      // Existing customer
      customer.googleId = googleId;
      if (profileImage) customer.profileImage = profileImage;
      if (customer.authProvider === "password") customer.authProvider = "password+google";
      await customer.save().catch(() => null);

      const token = jwt.sign({ id: customer._id, counterId: customer.counterId, role: "CUSTOMER" }, JWT_SECRET, { expiresIn: "7d" });
      return res.json({ success: true, token, user: customer });
    }

    // New Google User - Needs Customer Onboarding Details (Rule 6)
    if (!additionalDetails) {
      return res.json({
        success: true,
        isNew: true,
        needsInfo: true,
        message: "Google authenticated. Please complete vehicle details.",
        googleProfile: { googleId, name, email, profileImage },
      });
    }

    // Auto-generate counter ID
    let nextSeq = 3;
    try {
      const counter = await Counter.findByIdAndUpdate("CUS", { $inc: { seq: 1 } }, { new: true, upsert: true });
      if (counter) nextSeq = counter.seq;
    } catch {
      nextSeq = Math.floor(1000 + Math.random() * 9000);
    }
    const newCounterId = `CUS${nextSeq.toString().padStart(4, "0")}`;

    const newCustomer = new User({
      counterId: newCounterId,
      name,
      email,
      mobile: additionalDetails.mobile || "",
      googleId,
      profileImage,
      authProvider: "google",
      role: "CUSTOMER",
      status: "Active",
      vehicles: [
        {
          number: (additionalDetails.vehicleNumber || "TN01EV0001").toUpperCase(),
          brand: additionalDetails.brand || "Tata Motors",
          model: additionalDetails.model || "Nexon EV Max",
          type: additionalDetails.vehicleType || "Electric SUV",
          batteryCapacity: parseFloat(additionalDetails.batteryCapacity) || 40.5,
          batteryPercentage: 65,
          connectorType: additionalDetails.connectorType || "CCS2",
          isPrimary: true,
        },
      ],
    });

    await newCustomer.save().catch(() => null);

    const token = jwt.sign({ id: newCustomer._id || newCounterId, counterId: newCounterId, role: "CUSTOMER" }, JWT_SECRET, { expiresIn: "7d" });
    return res.json({
      success: true,
      token,
      user: newCustomer,
      counterId: newCounterId,
      message: `Google account registered! Your Customer ID is ${newCounterId}.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Google auth server error", error: err.message });
  }
});

export default router;
