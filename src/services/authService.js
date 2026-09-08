// Centralized Authentication Service for EV CHARGE PRO
import { jwtDecode } from "jwt-decode";
import {
  getCustomers,
  saveCustomer,
  getStationOwners,
  saveStationOwner,
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
  try {
    return jwtDecode(credential);
  } catch (err) {
    console.warn("jwtDecode failed, using standard base64 parser:", err.message);
    const base64Url = credential.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  }
}

/**
 * Normalize user object across roles and providers
 */
export function normalizeUser(user) {
  if (!user) return null;

  return {
    id: user.counterId || user.id || user._id,
    counterId: user.counterId || user.id,
    googleId: user.googleId || null,
    name: user.name || user.ownerName || "EV User",
    email: (user.email || "").toLowerCase(),
    mobile: user.mobile || user.phone || "",
    profileImage: user.profileImage || user.picture || null,
    role: user.role || "CUSTOMER",
    status: user.status || "Active",
    authProvider: user.authProvider || "password",
    vehicles: user.vehicles || [],
    vehicle: user.vehicle || (user.vehicles && user.vehicles[0]) || null,
    chargingPreference: user.chargingPreference || {
      type: "DC Fast Charging",
      connector: "CCS2",
    },
    createdAt: user.createdAt || new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };
}

export const authService = {
  /**
   * Get Current Session User
   */
  getCurrentUser: () => {
    const raw = getCurrentUserFromStorage();
    return raw ? normalizeUser(raw) : null;
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
   * Connects to Live MongoDB Backend API with Local Storage fallback
   */
  loginWithPassword: async (identifier, password) => {
    if (!identifier || !identifier.trim()) {
      return { success: false, message: "Please enter your Email or Counter ID." };
    }
    if (!password) {
      return { success: false, message: "Please enter your password." };
    }

    const cleanInput = identifier.trim().toUpperCase();
    const cleanEmail = identifier.trim().toLowerCase();

    // 1. LIVE BACKEND DATABASE QUERY FIRST
    try {
      const backendRes = await apiService.login({ identifier, password });
      if (backendRes && backendRes.success && backendRes.user) {
        const normalized = normalizeUser({ ...backendRes.user, token: backendRes.token });
        setCurrentUserInStorage(normalized);

        // Sync into local cache for offline capability
        if (normalized.role === "CUSTOMER") {
          saveCustomer(normalized);
        } else if (normalized.role === "STATION_OWNER") {
          saveStationOwner(normalized);
        }

        return {
          success: true,
          user: normalized,
          role: normalized.role,
          message: backendRes.message || `Welcome, ${normalized.name}!`,
        };
      } else if (backendRes && backendRes.message && backendRes.message !== "Backend offline") {
        // Backend replied with a specific credentials error (e.g. Incorrect password)
        return { success: false, message: backendRes.message };
      }
    } catch (apiErr) {
      console.warn("Backend auth offline, using local database:", apiErr.message);
    }

    // 2. LOCAL RESILIENT FALLBACK (If backend is offline)
    // A. ADMIN Check (by Counter ID ADM0001 or Admin Email)
    const isAdminId = cleanInput === "ADM0001" || cleanInput.startsWith("ADM");
    const isAdminEmail = cleanEmail === "admin@evcharge.com" || AUTHORIZED_ADMIN_EMAILS.some((e) => e.toLowerCase() === cleanEmail);

    if (isAdminId || isAdminEmail) {
      if (password === "admin123") {
        const normalized = normalizeUser(DEFAULT_ADMIN);
        setCurrentUserInStorage(normalized);
        return {
          success: true,
          user: normalized,
          role: "ADMIN",
          redirectPath: "/admin/dashboard",
          message: `Welcome Administrator, ${normalized.name}!`,
        };
      }
      return { success: false, message: "Invalid Admin password." };
    }

    // B. STATION OWNER Check (by Counter ID OWNER0001 or Owner Email)
    const owners = getStationOwners();
    const owner = owners.find(
      (o) =>
        (o.counterId && o.counterId.toUpperCase() === cleanInput) ||
        (o.email && o.email.toLowerCase() === cleanEmail)
    );

    if (owner) {
      if (owner.password !== password) {
        return { success: false, message: "Incorrect password." };
      }
      if (owner.status === "Suspended" || owner.status === "Rejected") {
        return {
          success: false,
          message: `Your account is ${owner.status}. Please contact support.`,
        };
      }

      const { password: _, ...cleanOwner } = owner;
      const normalized = normalizeUser({ ...cleanOwner, role: "STATION_OWNER" });
      setCurrentUserInStorage(normalized);
      return { success: true, user: normalized, role: "STATION_OWNER" };
    }

    // C. CUSTOMER Check (by Counter ID CUS0001 or Customer Email)
    const customers = getCustomers();
    const customer = customers.find(
      (c) =>
        (c.counterId && c.counterId.toUpperCase() === cleanInput) ||
        (c.email && c.email.toLowerCase() === cleanEmail)
    );

    if (customer) {
      if (customer.password !== password) {
        return { success: false, message: "Incorrect password." };
      }

      const { password: _, ...cleanCustomer } = customer;
      const normalized = normalizeUser({ ...cleanCustomer, role: "CUSTOMER" });
      setCurrentUserInStorage(normalized);
      return { success: true, user: normalized, role: "CUSTOMER" };
    }

    return {
      success: false,
      message: `No account found for "${identifier}". Please check your Counter ID or Email.`,
    };
  },

  /**
   * Google OAuth 2.0 Login with Strict Role Security
   *
   * @param {string|object} credentialOrProfile - Google credential token or decoded profile
   * @param {string} intendedRole - Role selected on login screen (CUSTOMER, STATION_OWNER, ADMIN)
   */
  loginWithGoogle: (credentialOrProfile, intendedRole = "CUSTOMER") => {
    let profile = {};

    if (typeof credentialOrProfile === "string") {
      profile = decodeGoogleCredential(credentialOrProfile);
    } else if (credentialOrProfile && typeof credentialOrProfile === "object") {
      profile = credentialOrProfile;
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
    // Only emails explicitly registered as Admin may access /admin/*
    // ----------------------------------------------------
    if (intendedRole === "ADMIN") {
      const isAuthorizedAdmin = AUTHORIZED_ADMIN_EMAILS.some(
        (adminEmail) => adminEmail.toLowerCase() === email
      );

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
    // Only existing verified Station Owners can access Owner portal
    // ----------------------------------------------------
    if (intendedRole === "STATION_OWNER") {
      const owners = getStationOwners();
      const existingOwner = owners.find(
        (o) => o.email.toLowerCase() === email || o.googleId === googleId
      );

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
   * Saves to MongoDB database with auto-generated sequential Counter ID
   */
  registerCustomer: async (formData) => {
    // 1. Try Live MongoDB Backend First
    try {
      const backendRes = await apiService.registerCustomer(formData);
      if (backendRes && backendRes.success && backendRes.user) {
        const normalized = normalizeUser({ ...backendRes.user, token: backendRes.token });
        saveCustomer(normalized);
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
   * Saves to MongoDB database with auto-generated sequential Owner Counter ID
   */
  registerOwner: async (formData) => {
    // 1. Try Live MongoDB Backend First
    try {
      const backendRes = await apiService.registerOwner(formData);
      if (backendRes && backendRes.success && backendRes.user) {
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
   * Update Profile
   */
  updateProfile: (updatedData) => {
    const currentUser = getCurrentUserFromStorage();
    if (!currentUser) return { success: false, message: "No active user session" };

    if (currentUser.role === "CUSTOMER") {
      const customers = getCustomers();
      const existing = customers.find((c) => c.counterId === currentUser.counterId);
      if (!existing) return { success: false, message: "User not found" };

      const updatedCustomer = {
        ...existing,
        ...updatedData,
        vehicle: { ...existing.vehicle, ...(updatedData.vehicle || {}) },
      };

      saveCustomer(updatedCustomer);
      const normalized = normalizeUser(updatedCustomer);
      setCurrentUserInStorage(normalized);
      return { success: true, user: normalized };
    }

    if (currentUser.role === "STATION_OWNER") {
      const owners = getStationOwners();
      const existing = owners.find((o) => o.counterId === currentUser.counterId);
      if (!existing) return { success: false, message: "Owner not found" };

      const updatedOwner = { ...existing, ...updatedData };
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
    setCurrentUserInStorage(null);
  },
};
