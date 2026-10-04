// Centralized Authentication Service for EV CHARGE PRO
import { jwtDecode } from "jwt-decode";
import {
  getCustomers,
  saveCustomer,
  getStationOwners,
  saveStationOwner,
  getTechnicians,
  saveTechnician,
  getCurrentUserFromStorage,
  setCurrentUserInStorage,
} from "../utils/storage";
import { getNextCustomerId, getNextOwnerId, getNextVehicleId } from "../utils/idGenerator";
import { vehicleService } from "./vehicleService";
import { apiService } from "./apiService";

export const DEFAULT_ADMIN = {
  id: "ADM0001",
  counterId: "ADM0001",
  name: "System Administrator",
  email: "admin@evcharge.com",
  role: "ADMIN",
  status: "Active",
  authProvider: "password",
};

export const DEFAULT_TECHNICIAN = {
  id: "TECH0001",
  counterId: "TECH0001",
  name: "Dave Wilson",
  email: "tech@evcharge.com",
  role: "TECHNICIAN",
  specialization: "DC Ultra-Fast & High Voltage Charger Diagnostics",
  status: "Active",
  authProvider: "password",
};

// Authorized Admin Emails (strict authorization for Admin Google login)
const AUTHORIZED_ADMIN_EMAILS = [
  "admin@evcharge.com",
  "administrator@evcharge.com",
  "admin.evcharge@gmail.com",
  "priyan.admin@evcharge.com",
];

/**
 * Decode Google ID Token / Credential safely
 */
export function decodeGoogleCredential(credential) {
  if (!credential) return {};
  if (typeof credential === "object") return credential;

  try {
    return jwtDecode(credential);
  } catch (err) {
    console.warn("jwtDecode failed, using standard base64 parser:", err.message);
    try {
      const parts = credential.split(".");
      if (parts.length < 2) return {};
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error("Failed to parse Google credential JWT:", e);
      return {};
    }
  }
}

/**
 * Normalize user object across roles and providers
 */
export function normalizeUser(user) {
  if (!user) return null;

  const rawRole = (user.role || "").toUpperCase();
  const normalizedRole = rawRole === "USER" ? "CUSTOMER" : rawRole || "CUSTOMER";

  return {
    id: user.counterId || user.id || user._id,
    counterId: user.counterId || user.id,
    userId: user.id || user.userId,
    token: user.token || localStorage.getItem("ev_token") || null,
    googleId: user.googleId || null,
    name: user.name || user.ownerName || "EV User",
    email: (user.email || "").toLowerCase(),
    mobile: user.mobile || user.phone || "",
    phone: user.phone || user.mobile || "",
    address: user.address || "",
    city: user.city || "",
    state: user.state || "",
    pincode: user.pincode || "",
    company_name: user.company_name || user.companyName || "",
    network_name: user.network_name || user.networkName || "",
    specialization: user.specialization || "",
    profileImage: user.profileImage || user.picture || null,
    role: normalizedRole,
    rawRole: user.role,
    status: user.status || "Active",
    authProvider: user.authProvider || "password",
    vehicles: user.vehicles || [],
    vehicle: user.vehicle || (user.vehicles && user.vehicles[0]) || null,
    chargingPreference: user.chargingPreference || {
      type: "DC Fast Charging",
      connector: "CCS2",
    },
    createdAt: user.createdAt || user.created_at || new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };
}

export const getRoleDashboardPath = (role) => {
  const r = (role || "").toUpperCase();
  if (r === "ADMIN") return "/admin/dashboard";
  if (r === "STATION_OWNER" || r === "OWNER") return "/owner/dashboard";
  if (r === "TECHNICIAN" || r === "TECH") return "/technician/dashboard";
  return "/user/dashboard";
};

// In-Memory Local OTP Store for standalone mode fallback
const localOtpStore = new Map();

export const authService = {
  /**
   * Get Current Session User
   */
  getCurrentUser: () => {
    const raw = getCurrentUserFromStorage();
    return raw ? normalizeUser(raw) : null;
  },

  /**
   * Fetch Fresh User Profile directly from MySQL backend
   */
  fetchFreshProfile: async () => {
    try {
      const apiRes = await apiService.getProfile();
      if (apiRes && apiRes.success && apiRes.user) {
        const current = getCurrentUserFromStorage() || {};
        const normalized = normalizeUser({
          ...current,
          ...apiRes.user,
          token: current.token || localStorage.getItem("ev_token"),
        });
        setCurrentUserInStorage(normalized);
        return normalized;
      }
    } catch (err) {
      console.warn("Could not sync live profile from MySQL:", err.message);
    }
    return null;
  },

  /**
   * Request 6-Digit Email OTP
   */
  sendOTP: async (email) => {
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, message: "Valid email address is required." };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return { success: false, message: "Invalid email address format." };
    }

    // 1. Try Backend API First
    try {
      const apiRes = await apiService.sendOTP(cleanEmail);
      if (apiRes && apiRes.success) {
        return apiRes;
      }
      if (apiRes && apiRes.message && apiRes.cooldownSeconds) {
        return apiRes;
      }
    } catch (e) {
      console.warn("Backend sendOTP unavailable, using standalone fallback:", e.message);
    }

    // 2. Standalone Fallback
    const now = Date.now();
    const existing = localOtpStore.get(cleanEmail);

    if (existing && existing.lastSentAt && now - existing.lastSentAt < 30000) {
      const waitSec = Math.ceil((30000 - (now - existing.lastSentAt)) / 1000);
      return {
        success: false,
        message: `Please wait ${waitSec} seconds before requesting a new OTP.`,
        cooldownSeconds: waitSec,
      };
    }

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    localOtpStore.set(cleanEmail, {
      otp: generatedOtp,
      expiresAt: now + 5 * 60 * 1000,
      attempts: 0,
      lastSentAt: now,
    });

    console.log(`\n==================================================`);
    console.log(`⚡ [EV CHARGING PORTAL OTP CODE]`);
    console.log(`Email: ${cleanEmail}`);
    console.log(`OTP Code: ${generatedOtp}`);
    console.log(`Expires: 5 minutes`);
    console.log(`==================================================\n`);

    return {
      success: true,
      message: `OTP sent successfully to ${cleanEmail}. (Dev Code: ${generatedOtp})`,
      expiresSeconds: 300,
      cooldownSeconds: 30,
      devMode: true,
      otpCode: generatedOtp,
    };
  },

  /**
   * Verify 6-Digit Email OTP
   */
  verifyOTP: async (email, otp) => {
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanOtp = String(otp || "").trim();

    if (!cleanEmail || !cleanOtp) {
      return { success: false, message: "Email and 6-digit OTP are required." };
    }

    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      return { success: false, message: "OTP must be exactly 6 numeric digits." };
    }

    // 1. Try Backend API First
    try {
      const apiRes = await apiService.verifyOTP(cleanEmail, cleanOtp);
      if (apiRes && apiRes.success && apiRes.user) {
        if (apiRes.token) {
          localStorage.setItem("ev_token", apiRes.token);
        }
        const normalized = normalizeUser({ ...apiRes.user, token: apiRes.token });
        setCurrentUserInStorage(normalized);
        return {
          success: true,
          user: normalized,
          redirectPath: getRoleDashboardPath(normalized.role),
          message: `OTP verified! Welcome back, ${normalized.name}`,
        };
      } else if (apiRes && apiRes.message) {
        return apiRes;
      }
    } catch (e) {
      console.warn("Backend verifyOTP unavailable, using standalone fallback:", e.message);
    }

    // 2. Standalone Fallback
    const now = Date.now();
    const record = localOtpStore.get(cleanEmail);

    if (!record) {
      return {
        success: false,
        message: "No active OTP request found for this email. Please click 'Send OTP' first.",
      };
    }

    if (record.attempts >= 5) {
      localOtpStore.delete(cleanEmail);
      return {
        success: false,
        message: "Maximum OTP attempts exceeded (5). Please request a new OTP.",
        attemptsExceeded: true,
      };
    }

    if (now > record.expiresAt) {
      localOtpStore.delete(cleanEmail);
      return {
        success: false,
        message: "OTP expired. Please request a new OTP.",
        expired: true,
      };
    }

    if (record.otp !== cleanOtp) {
      record.attempts += 1;
      localOtpStore.set(cleanEmail, record);
      const remaining = 5 - record.attempts;

      if (remaining <= 0) {
        localOtpStore.delete(cleanEmail);
        return {
          success: false,
          message: "Too many incorrect attempts. Please request a new OTP.",
          attemptsExceeded: true,
        };
      }

      return {
        success: false,
        message: `Invalid OTP code. ${remaining} attempt${remaining > 1 ? "s" : ""} remaining.`,
        remainingAttempts: remaining,
      };
    }

    // Success! Clear OTP
    localOtpStore.delete(cleanEmail);

    // Resolve user profile & role
    let userObj = null;

    if (cleanEmail === "admin@evcharge.com" || AUTHORIZED_ADMIN_EMAILS.some((a) => a.toLowerCase() === cleanEmail)) {
      userObj = normalizeUser({ ...DEFAULT_ADMIN, authProvider: "email_otp" });
    }

    if (!userObj) {
      const owners = getStationOwners();
      const owner = owners.find((o) => o.email && o.email.toLowerCase() === cleanEmail);
      if (owner) {
        userObj = normalizeUser({ ...owner, role: "STATION_OWNER", authProvider: "email_otp" });
      }
    }

    if (!userObj) {
      const customers = getCustomers();
      const customer = customers.find((c) => c.email && c.email.toLowerCase() === cleanEmail);
      if (customer) {
        userObj = normalizeUser({ ...customer, role: "CUSTOMER", authProvider: "email_otp" });
      }
    }

    if (!userObj) {
      let role = "CUSTOMER";
      if (cleanEmail.includes("admin")) role = "ADMIN";
      else if (cleanEmail.includes("owner")) role = "STATION_OWNER";

      let name = cleanEmail.split("@")[0].replace(/[._]/g, " ");
      name = name.charAt(0).toUpperCase() + name.slice(1);

      const newCustomer = {
        id: getNextCustomerId(),
        counterId: getNextCustomerId(),
        name,
        email: cleanEmail,
        role,
        authProvider: "email_otp",
        status: "Active",
      };

      saveCustomer(newCustomer);
      userObj = normalizeUser(newCustomer);
    }

    setCurrentUserInStorage(userObj);
    return {
      success: true,
      user: userObj,
      redirectPath: getRoleDashboardPath(userObj.role),
      message: `OTP Verified successfully! Welcome, ${userObj.name}`,
    };
  },

  /**
   * Resend 6-Digit Email OTP
   */
  resendOTP: async (email) => {
    return authService.sendOTP(email);
  },

  /**
   * Check if active session is authenticated
   */
  isAuthenticated: () => {
    const user = getCurrentUserFromStorage();
    return Boolean(user && (user.counterId || user.id));
  },

  /**
   * Get Active User Role
   */
  getUserRole: () => {
    const user = getCurrentUserFromStorage();
    return user?.role || "GUEST";
  },

  /**
   * Universal Password Login with Automatic Role Detection
   * Connects to Live MySQL Backend API
   */
  loginWithPassword: async (identifier, password) => {
    if (!identifier || !identifier.trim()) {
      return { success: false, message: "Please enter your Email or User ID." };
    }
    if (!password) {
      return { success: false, message: "Please enter your password." };
    }

    try {
      const backendRes = await apiService.login({ identifier, password });
      if (backendRes && backendRes.success && backendRes.user) {
        if (backendRes.token) {
          localStorage.setItem("ev_token", backendRes.token);
        }
        const normalized = normalizeUser({ ...backendRes.user, token: backendRes.token });
        setCurrentUserInStorage(normalized);

        return {
          success: true,
          user: normalized,
          role: normalized.role,
          message: backendRes.message || `Welcome, ${normalized.name}!`,
        };
      } else {
        return {
          success: false,
          message: backendRes?.message || "Invalid credentials.",
        };
      }
    } catch (apiErr) {
      return {
        success: false,
        message: apiErr.response?.data?.message || apiErr.message || "Server unavailable. Please ensure the backend is running.",
      };
    }
  },



  /**
   * Google OAuth 2.0 Login with Strict Role Security & Backend Database Sync
   *
   * @param {string|object} credentialOrProfile - Google credential token or decoded profile
   * @param {string} intendedRole - Role selected on login screen (CUSTOMER, STATION_OWNER, ADMIN)
   */
  loginWithGoogle: async (credentialOrProfile, intendedRole = null) => {
    let credential = null;
    let profile = {};

    if (typeof credentialOrProfile === "string") {
      credential = credentialOrProfile;
      profile = decodeGoogleCredential(credentialOrProfile);
    } else if (credentialOrProfile && typeof credentialOrProfile === "object") {
      profile = credentialOrProfile;
      credential = credentialOrProfile.credential || credentialOrProfile.idToken || credentialOrProfile.token;
    }

    // 1. Try Live Backend Google OAuth First
    if (credential) {
      try {
        const backendRes = await apiService.googleAuth(credential);
        if (backendRes && backendRes.success && backendRes.user) {
          if (backendRes.token) {
            localStorage.setItem("ev_token", backendRes.token);
          }
          const normalized = normalizeUser({ ...backendRes.user, token: backendRes.token, authProvider: "google" });
          setCurrentUserInStorage(normalized);
          return {
            success: true,
            user: normalized,
            role: normalized.role,
            redirectPath: getRoleDashboardPath(normalized.role),
            message: backendRes.message || `Signed in with Google as ${normalized.name}`,
          };
        } else if (backendRes && !backendRes.success && backendRes.message) {
          return {
            success: false,
            message: backendRes.message,
          };
        }
      } catch (err) {
        console.warn("Backend Google auth error, using local fallback:", err);
      }
    }

    const googleId = profile.sub || profile.id || profile.googleId;
    const email = (profile.email || "").trim().toLowerCase();
    const name = profile.name || `${profile.given_name || ""} ${profile.family_name || ""}`.trim() || "Google User";
    const profileImage = profile.picture || profile.profileImage || null;

    if (!email) {
      return {
        success: false,
        message: "Unable to retrieve verified email from Google authentication.",
      };
    }

    const googleProfileData = {
      googleId,
      name,
      email,
      profileImage,
    };

    // ----------------------------------------------------
    // SECURITY RULE 10: ADMIN GOOGLE LOGIN
    // Automatic detection for Admin email or intendedRole === "ADMIN"
    // ----------------------------------------------------
    const isAuthorizedAdmin = AUTHORIZED_ADMIN_EMAILS.some(
      (adminEmail) => adminEmail.toLowerCase() === email
    );

    if (intendedRole === "ADMIN" || (!intendedRole && isAuthorizedAdmin)) {
      if (!isAuthorizedAdmin) {
        return {
          success: false,
          code: "UNAUTHORIZED_ADMIN",
          message: "Access denied. This Google account is not authorized for administrator access.",
        };
      }

      // Authorized Admin - log in
      const adminSession = normalizeUser({
        ...DEFAULT_ADMIN,
        googleId,
        name: name || DEFAULT_ADMIN.name,
        email,
        profileImage: profileImage || null,
        authProvider: "google",
      });

      setCurrentUserInStorage(adminSession);
      return {
        success: true,
        user: adminSession,
        redirectPath: "/admin/dashboard",
        message: `Welcome Administrator, ${adminSession.name}!`,
      };
    }

    // ----------------------------------------------------
    // SECURITY RULE 9: STATION OWNER GOOGLE LOGIN
    // Check if email or googleId belongs to an existing Station Owner
    // ----------------------------------------------------
    const owners = getStationOwners();
    const existingOwner = owners.find(
      (o) => (o.email && o.email.toLowerCase() === email) || (googleId && o.googleId === googleId)
    );

    if (intendedRole === "STATION_OWNER" || (!intendedRole && existingOwner)) {
      if (!existingOwner) {
        return {
          success: false,
          code: "UNAUTHORIZED_OWNER",
          message: "Your Google account is not registered as a Station Owner.",
          action: "REGISTER_OWNER",
          googleProfile: googleProfileData,
        };
      }

      if (existingOwner.status === "Pending Approval") {
        return {
          success: false,
          message: "Your Station Owner account is pending Admin approval.",
        };
      }
      if (existingOwner.status === "Suspended" || existingOwner.status === "Rejected") {
        return {
          success: false,
          message: `Your Station Owner account is ${existingOwner.status}. Please contact support.`,
        };
      }

      // Link Google if not yet linked
      const updatedOwner = {
        ...existingOwner,
        googleId: existingOwner.googleId || googleId,
        profileImage: profileImage || existingOwner.profileImage,
        authProvider: existingOwner.authProvider === "password" ? "password+google" : "google",
        lastLogin: new Date().toISOString(),
      };
      saveStationOwner(updatedOwner);

      const normalized = normalizeUser({ ...updatedOwner, role: "STATION_OWNER" });
      setCurrentUserInStorage(normalized);
      return {
        success: true,
        user: normalized,
        redirectPath: "/owner/dashboard",
        message: `Welcome back, ${normalized.name}!`,
      };
    }

    // ----------------------------------------------------
    // SECURITY RULE 6, 7 & 8: CUSTOMER GOOGLE LOGIN
    // Stored role is authoritative. Default new users to CUSTOMER.
    // ----------------------------------------------------
    const customers = getCustomers();
    const existingCustomer = customers.find(
      (c) => c.email.toLowerCase() === email || (googleId && c.googleId === googleId)
    );

    // Case A: Existing Google Customer
    if (existingCustomer) {
      // Check if user already linked Google
      const isAlreadyGoogleLinked =
        existingCustomer.authProvider === "google" ||
        existingCustomer.authProvider === "password+google" ||
        existingCustomer.googleId === googleId;

      if (isAlreadyGoogleLinked) {
        const updatedCustomer = {
          ...existingCustomer,
          googleId: existingCustomer.googleId || googleId,
          profileImage: profileImage || existingCustomer.profileImage,
          lastLogin: new Date().toISOString(),
        };
        saveCustomer(updatedCustomer);

        const normalized = normalizeUser({ ...updatedCustomer, role: "CUSTOMER" });
        setCurrentUserInStorage(normalized);
        return {
          success: true,
          user: normalized,
          redirectPath: "/customer/dashboard",
          message: `Welcome back, ${normalized.name}!`,
        };
      }

      // Case B: Existing Password Customer attempting Google login with same email
      // Prompt for Account Linking (Rule 11)
      return {
        success: false,
        code: "ACCOUNT_EXISTS_LINK_REQUIRED",
        message: "An account already exists with this email. Would you like to link your Google account?",
        existingUser: existingCustomer,
        googleProfile: googleProfileData,
      };
    }

    // Case C: First-time Google User (Rule 6)
    // Needs customer information (phone and vehicle) before final account creation
    return {
      success: true,
      isNew: true,
      needsInfo: true,
      code: "FIRST_TIME_GOOGLE_USER",
      message: "Google account connected successfully! Please complete your EV vehicle details.",
      googleProfile: googleProfileData,
    };
  },

  /**
   * Complete First-Time Google Customer Registration (Rule 6 & 12)
   */
  completeGoogleCustomerRegistration: (googleProfile, details = {}) => {
    const newCounterId = getNextCustomerId();
    const newVehicleId = getNextVehicleId();

    const vehicleData = {
      id: newVehicleId,
      customerId: newCounterId,
      ownerName: googleProfile.name,
      brand: details.brand || "Tata Motors",
      manufacturer: details.brand || "Tata Motors",
      model: details.model || "Nexon EV Max",
      vehicleNumber: (details.vehicleNumber || "TN01EV0001").toUpperCase(),
      vehicleType: details.vehicleType || "Electric SUV",
      batteryCapacity: parseFloat(details.batteryCapacity) || 40.5,
      batteryPercentage: parseInt(details.batteryPercentage, 10) || 65,
      connectorType: details.connectorType || details.preferredConnector || "CCS2",
      range: Math.round((parseFloat(details.batteryCapacity) || 40.5) * 7.5),
      isPrimary: true,
      createdAt: new Date().toISOString(),
    };

    // Save to vehicle service
    try {
      vehicleService.addVehicle(vehicleData);
    } catch (err) {
      console.warn("vehicleService add error in completeGoogleCustomerRegistration:", err);
    }

    const newCustomer = {
      counterId: newCounterId,
      googleId: googleProfile.googleId,
      role: "CUSTOMER",
      name: googleProfile.name,
      email: googleProfile.email.toLowerCase(),
      mobile: details.mobile || details.phone || "",
      profileImage: googleProfile.profileImage || null,
      authProvider: "google",
      address: details.address || "",
      city: details.city || "Chennai",
      state: details.state || "Tamil Nadu",
      pincode: details.pincode || "600001",
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      vehicles: [vehicleData],
      vehicle: vehicleData,
      chargingPreference: {
        type: details.preferredChargingType || "DC Fast Charging",
        connector: details.connectorType || details.preferredConnector || "CCS2",
      },
    };

    saveCustomer(newCustomer);
    const normalized = normalizeUser(newCustomer);
    setCurrentUserInStorage(normalized);

    return {
      success: true,
      user: normalized,
      counterId: newCounterId,
      redirectPath: "/customer/dashboard",
      message: `Welcome to EV CHARGE PRO, ${normalized.name}! Your Customer ID is ${newCounterId}.`,
    };
  },

  /**
   * Link Existing Password Account with Google (Rule 11)
   */
  linkGoogleAccount: (email, googleProfile) => {
    const customers = getCustomers();
    const existing = customers.find((c) => c.email.toLowerCase() === email.toLowerCase());

    if (!existing) {
      return { success: false, message: "Account to link was not found." };
    }

    const updatedCustomer = {
      ...existing,
      googleId: googleProfile.googleId,
      profileImage: existing.profileImage || googleProfile.profileImage,
      authProvider: "password+google",
      lastLogin: new Date().toISOString(),
    };

    saveCustomer(updatedCustomer);
    const normalized = normalizeUser({ ...updatedCustomer, role: "CUSTOMER" });
    setCurrentUserInStorage(normalized);

    return {
      success: true,
      user: normalized,
      redirectPath: "/customer/dashboard",
      message: "Google account linked successfully! You can now sign in with either Password or Google.",
    };
  },

  /**
   * Register Regular Customer
   * Saves to MySQL database with auto-generated sequential Counter ID
   */
  registerCustomer: async (formData) => {
    // 1. Try Live MySQL Backend First
    try {
      const backendRes = await apiService.registerCustomer(formData);
      if (backendRes && backendRes.success && backendRes.user) {
        if (backendRes.token) {
          localStorage.setItem("ev_token", backendRes.token);
        }
        const normalized = normalizeUser({ ...backendRes.user, token: backendRes.token });
        saveCustomer(normalized);
        setCurrentUserInStorage(normalized);
        return {
          success: true,
          counterId: backendRes.counterId,
          customer: normalized,
          user: normalized,
          message: backendRes.message,
        };
      } else if (backendRes && backendRes.message && backendRes.message !== "Backend offline") {
        return { success: false, message: backendRes.message };
      }
    } catch (apiErr) {
      console.warn("Backend customer registration offline, using local database:", apiErr.message);
    }

    // 2. Local fallback
    const customers = getCustomers();
    const emailExists = customers.some(
      (c) => c.email.toLowerCase() === formData.email.trim().toLowerCase()
    );
    if (emailExists) {
      return { success: false, message: "An account with this email address already exists." };
    }

    const newCounterId = getNextCustomerId();
    const newVehicleId = getNextVehicleId();

    const vehicleData = {
      id: newVehicleId,
      customerId: newCounterId,
      ownerName: formData.name.trim(),
      brand: formData.brand ? formData.brand.trim() : "Tata Motors",
      manufacturer: formData.brand ? formData.brand.trim() : "Tata Motors",
      model: formData.model ? formData.model.trim() : "Nexon EV",
      vehicleNumber: formData.vehicleNumber ? formData.vehicleNumber.trim().toUpperCase() : "TN01AB1234",
      vehicleType: formData.vehicleType || "Electric SUV",
      batteryCapacity: parseFloat(formData.batteryCapacity) || 40.5,
      batteryPercentage: parseInt(formData.batteryPercentage, 10) || 65,
      connectorType: formData.preferredConnector || "CCS2",
      isPrimary: true,
      createdAt: new Date().toISOString(),
    };

    try {
      vehicleService.addVehicle(vehicleData);
    } catch (err) {
      console.warn("vehicleService add error in registerCustomer:", err);
    }

    const newCustomer = {
      counterId: newCounterId,
      role: "CUSTOMER",
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      mobile: formData.mobile ? formData.mobile.trim() : "",
      password: formData.password,
      address: formData.address ? formData.address.trim() : "",
      city: formData.city ? formData.city.trim() : "Chennai",
      state: formData.state ? formData.state.trim() : "Tamil Nadu",
      pincode: formData.pincode ? formData.pincode.trim() : "600001",
      authProvider: "password",
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      vehicles: [vehicleData],
      vehicle: vehicleData,
      chargingPreference: {
        type: formData.preferredChargingType || "DC Fast Charging",
        connector: formData.preferredConnector || "CCS2",
      },
    };

    saveCustomer(newCustomer);
    return { success: true, counterId: newCounterId, customer: normalizeUser(newCustomer), user: normalizeUser(newCustomer) };
  },

  /**
   * Register Station Owner
   * Saves to MySQL database with auto-generated sequential Owner Counter ID
   */
  registerOwner: async (formData) => {
    // 1. Try Live MySQL Backend First
    try {
      const backendRes = await apiService.registerOwner(formData);
      if (backendRes && backendRes.success && backendRes.user) {
        if (backendRes.token) {
          localStorage.setItem("ev_token", backendRes.token);
        }
        const normalized = normalizeUser({ ...backendRes.user, token: backendRes.token });
        saveStationOwner(normalized);
        return {
          success: true,
          counterId: backendRes.counterId,
          owner: normalized,
          user: normalized,
          message: backendRes.message,
        };
      } else if (backendRes && backendRes.message && backendRes.message !== "Backend offline") {
        return { success: false, message: backendRes.message };
      }
    } catch (apiErr) {
      console.warn("Backend owner registration offline, using local database:", apiErr.message);
    }

    // 2. Local fallback
    const owners = getStationOwners();
    const emailExists = owners.some(
      (o) => o.email.toLowerCase() === formData.email.trim().toLowerCase()
    );
    if (emailExists) {
      return { success: false, message: "Station Owner with this email already exists." };
    }

    const newOwnerId = getNextOwnerId();

    const newOwner = {
      counterId: newOwnerId,
      role: "STATION_OWNER",
      ownerName: formData.ownerName.trim(),
      businessName: formData.businessName.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
      password: formData.password,
      businessAddress: formData.businessAddress.trim(),
      city: formData.city.trim(),
      state: formData.state ? formData.state.trim() : "Tamil Nadu",
      pincode: formData.pincode.trim(),
      gstNumber: formData.gstNumber ? formData.gstNumber.trim().toUpperCase() : "",
      businessRegNumber: formData.businessRegNumber ? formData.businessRegNumber.trim() : "",
      status: "Approved",
      authProvider: formData.authProvider || "password",
      createdAt: new Date().toISOString(),
    };

    saveStationOwner(newOwner);
    return { success: true, counterId: newOwnerId, owner: normalizeUser(newOwner), user: normalizeUser(newOwner) };
  },

  /**
   * Update Profile (Persists to MySQL Database)
   */
  updateProfile: async (updatedData) => {
    const currentUser = getCurrentUserFromStorage();
    if (!currentUser) return { success: false, message: "No active user session" };

    // 1. Live Backend Database Update (MySQL)
    try {
      const apiRes = await apiService.updateProfile(updatedData);
      if (apiRes && apiRes.success && apiRes.user) {
        const normalized = normalizeUser({
          ...currentUser,
          ...apiRes.user,
          token: currentUser.token || localStorage.getItem("ev_token"),
        });
        setCurrentUserInStorage(normalized);

        // Sync local cache
        if (normalized.role === "CUSTOMER") {
          saveCustomer(normalized);
        } else if (normalized.role === "STATION_OWNER") {
          saveStationOwner(normalized);
        }

        return {
          success: true,
          message: apiRes.message || "Profile updated successfully!",
          user: normalized,
        };
      }
    } catch (err) {
      console.warn("Backend updateProfile fallback:", err.message);
    }

    // 2. Local Resilient Fallback
    if (currentUser.role === "CUSTOMER") {
      const customers = getCustomers();
      const existing = customers.find((c) => c.counterId === currentUser.counterId);
      const updatedCustomer = {
        ...(existing || currentUser),
        ...updatedData,
        vehicle: { ...(existing?.vehicle || currentUser?.vehicle || {}), ...(updatedData.vehicle || {}) },
      };

      saveCustomer(updatedCustomer);
      const normalized = normalizeUser(updatedCustomer);
      setCurrentUserInStorage(normalized);
      return { success: true, user: normalized };
    }

    if (currentUser.role === "STATION_OWNER") {
      const owners = getStationOwners();
      const existing = owners.find((o) => o.counterId === currentUser.counterId);
      const updatedOwner = { ...(existing || currentUser), ...updatedData };
      saveStationOwner(updatedOwner);
      const normalized = normalizeUser(updatedOwner);
      setCurrentUserInStorage(normalized);
      return { success: true, user: normalized };
    }

    // Admin profile update
    const cleanSession = normalizeUser({ ...currentUser, ...updatedData });
    setCurrentUserInStorage(cleanSession);
    return { success: true, user: cleanSession };
  },

  /**
   * Sign Out & Clear Session
   */
  logoutUser: () => {
    localStorage.removeItem("ev_token");
    setCurrentUserInStorage(null);
    const keysToRemove = [
      "ev_user",
      "ev_token",
      "ev_bookings",
      "ev_payments",
      "ev_stations",
      "ev_customers",
      "ev_station_owners",
      "ev_technicians",
      "ev_sessions",
      "ev_active_sessions",
      "ev_wallet",
      "ev_disputes",
      "ev_settlements",
      "ev_maintenance",
      "ev_complaints",
      "ev_reviews",
      "ev_loyalty_points",
      "ev_vehicles",
    ];
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  },
};
