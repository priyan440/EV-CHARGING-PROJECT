import { createContext, useContext, useState, useEffect } from "react";
import {
  initializeStorage,
  getCustomers,
  saveCustomer,
  getStationOwners,
  saveStationOwner,
  getCurrentUserFromStorage,
  setCurrentUserInStorage,
} from "../utils/storage";
import { getNextCustomerId, getNextOwnerId } from "../utils/idGenerator";

const AuthContext = createContext();

const DEFAULT_ADMIN = {
  counterId: "ADM0001",
  name: "System Admin",
  email: "admin@evcharge.com",
  role: "ADMIN",
  status: "Active",
};

export function AuthProvider({ children }) {
  useEffect(() => {
    initializeStorage();
  }, []);

  const [currentUser, setCurrentUser] = useState(() => {
    return getCurrentUserFromStorage();
  });

  const isAuthenticated = Boolean(currentUser && currentUser.counterId);

  useEffect(() => {
    setCurrentUserInStorage(currentUser);
  }, [currentUser]);

  /**
   * Universal Login supporting Customer, Station Owner, and Admin
   */
  const login = (identifier, password, selectedRole = "CUSTOMER") => {
    if (!identifier || !identifier.trim()) {
      return { success: false, message: "Please enter your Email or Counter ID." };
    }
    if (!password) {
      return { success: false, message: "Please enter your password." };
    }

    const cleanInput = identifier.trim().toUpperCase();

    // 1. ADMIN Login Check
    if (
      selectedRole === "ADMIN" ||
      cleanInput === "ADM0001" ||
      identifier.trim().toLowerCase() === "admin@evcharge.com"
    ) {
      if (password === "admin123") {
        setCurrentUser(DEFAULT_ADMIN);
        return { success: true, user: DEFAULT_ADMIN };
      }
      return { success: false, message: "Invalid Admin password." };
    }

    // 2. STATION OWNER Login Check
    if (selectedRole === "STATION_OWNER" || cleanInput.startsWith("OWNER")) {
      const owners = getStationOwners();
      const owner = owners.find(
        (o) =>
          o.counterId.toUpperCase() === cleanInput ||
          o.email.toLowerCase() === identifier.trim().toLowerCase()
      );

      if (!owner) {
        return { success: false, message: "Station Owner account not found." };
      }
      if (owner.password !== password) {
        return { success: false, message: "Incorrect password." };
      }
      if (owner.status === "Pending Approval") {
        return {
          success: false,
          message: "Your Station Owner account is pending Admin approval.",
        };
      }
      if (owner.status === "Suspended" || owner.status === "Rejected") {
        return {
          success: false,
          message: `Your account is ${owner.status}. Please contact support.`,
        };
      }

      const { password: _, ...ownerSession } = owner;
      const fullOwnerSession = { ...ownerSession, role: "STATION_OWNER" };
      setCurrentUser(fullOwnerSession);
      return { success: true, user: fullOwnerSession };
    }

    // 3. CUSTOMER Login Check
    const customers = getCustomers();
    const customer = customers.find(
      (c) =>
        c.counterId.toUpperCase() === cleanInput ||
        c.email.toLowerCase() === identifier.trim().toLowerCase()
    );

    if (!customer) {
      return { success: false, message: "Customer Counter ID or Email not found." };
    }

    if (customer.password !== password) {
      return { success: false, message: "Incorrect password." };
    }

    const { password: _, ...userSession } = customer;
    const fullCustomerSession = { ...userSession, role: "CUSTOMER" };
    setCurrentUser(fullCustomerSession);
    return { success: true, user: fullCustomerSession };
  };

  /**
   * Customer Registration
   */
  const registerCustomer = (formData) => {
    const customers = getCustomers();
    const emailExists = customers.some(
      (c) => c.email.toLowerCase() === formData.email.trim().toLowerCase()
    );
    if (emailExists) {
      return { success: false, message: "An account with this email address already exists." };
    }

    const newCounterId = getNextCustomerId();

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
      createdAt: new Date().toISOString(),
      vehicles: [
        {
          id: `VEH${Date.now()}`,
          number: formData.vehicleNumber ? formData.vehicleNumber.trim().toUpperCase() : "TN01AB1234",
          brand: formData.brand ? formData.brand.trim() : "Tata",
          model: formData.model ? formData.model.trim() : "Nexon EV",
          type: formData.vehicleType || "Electric SUV",
          batteryCapacity: parseFloat(formData.batteryCapacity) || 40.5,
          batteryPercentage: parseInt(formData.batteryPercentage, 10) || 65,
          connectorType: formData.preferredConnector || "CCS2",
          isPrimary: true,
        },
      ],
      vehicle: {
        number: formData.vehicleNumber ? formData.vehicleNumber.trim().toUpperCase() : "TN01AB1234",
        brand: formData.brand ? formData.brand.trim() : "Tata",
        model: formData.model ? formData.model.trim() : "Nexon EV",
        type: formData.vehicleType || "Electric SUV",
        batteryCapacity: parseFloat(formData.batteryCapacity) || 40.5,
        batteryPercentage: parseInt(formData.batteryPercentage, 10) || 65,
      },
      chargingPreference: {
        type: formData.preferredChargingType || "DC Fast Charging",
        connector: formData.preferredConnector || "CCS2",
      },
    };

    saveCustomer(newCustomer);
    return { success: true, counterId: newCounterId, customer: newCustomer };
  };

  /**
   * Station Owner Registration
   */
  const registerOwner = (formData) => {
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
      status: "Pending Approval", // Must be approved by Admin
      createdAt: new Date().toISOString(),
    };

    saveStationOwner(newOwner);
    return { success: true, counterId: newOwnerId, owner: newOwner };
  };

  /**
   * Update Profile Details
   */
  const updateProfile = (updatedData) => {
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
      const { password: _, ...cleanSession } = updatedCustomer;
      const full = { ...cleanSession, role: "CUSTOMER" };
      setCurrentUser(full);
      return { success: true, user: full };
    }

    if (currentUser.role === "STATION_OWNER") {
      const owners = getStationOwners();
      const existing = owners.find((o) => o.counterId === currentUser.counterId);
      if (!existing) return { success: false, message: "Owner not found" };

      const updatedOwner = { ...existing, ...updatedData };
      saveStationOwner(updatedOwner);
      const { password: _, ...cleanSession } = updatedOwner;
      const full = { ...cleanSession, role: "STATION_OWNER" };
      setCurrentUser(full);
      return { success: true, user: full };
    }

    // Admin profile update
    const cleanSession = { ...currentUser, ...updatedData };
    setCurrentUser(cleanSession);
    return { success: true, user: cleanSession };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        user: currentUser,
        counterId: currentUser?.counterId,
        role: currentUser?.role || "GUEST",
        isAuthenticated,
        login,
        register: registerCustomer,
        registerCustomer,
        registerOwner,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}