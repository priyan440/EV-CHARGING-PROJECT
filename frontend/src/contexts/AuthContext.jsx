import { createContext, useContext, useState, useEffect } from "react";
import { initializeStorage } from "../utils/storage";
import { authService, normalizeUser } from "../services/authService";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      initializeStorage();
      return authService.getCurrentUser();
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      initializeStorage();
      const user = authService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        // Asynchronously fetch latest authoritative profile from MySQL
        authService.fetchFreshProfile().then((freshUser) => {
          if (freshUser) {
            setCurrentUser(freshUser);
          }
        }).catch(() => {});
      }
    } catch (e) {
      console.warn("Auth initialization error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const isAuthenticated = Boolean(currentUser && (currentUser.counterId || currentUser.id));
  const role = currentUser?.role || "GUEST";

  /**
   * Universal Password Login (Automatic Role Detection)
   */
  const login = async (identifier, password) => {
    const res = await authService.loginWithPassword(identifier, password);
    if (res.success && res.user) {
      setCurrentUser(res.user);
    }
    return res;
  };

  /**
   * Google OAuth Login (Automatic Role Detection)
   */
  const loginWithGoogle = async (credentialOrProfile, intendedRole = null) => {
    const res = await authService.loginWithGoogle(credentialOrProfile, intendedRole);
    if (res.success && res.user) {
      setCurrentUser(res.user);
    }
    return res;
  };

  /**
   * Refresh active session from persistent storage
   */
  const refreshSession = () => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    return user;
  };

  /**
   * First-Time Google Customer Registration
   */
  const completeGoogleCustomerRegistration = (googleProfile, details) => {
    const res = authService.completeGoogleCustomerRegistration(googleProfile, details);
    if (res.success && res.user) {
      setCurrentUser(res.user);
    }
    return res;
  };

  /**
   * Link Existing Password Account with Google
   */
  const linkGoogleAccount = (email, googleProfile) => {
    const res = authService.linkGoogleAccount(email, googleProfile);
    if (res.success && res.user) {
      setCurrentUser(res.user);
    }
    return res;
  };

  /**
   * Customer Registration
   */
  const registerCustomer = async (formData) => {
    return await authService.registerCustomer(formData);
  };

  /**
   * Station Owner Registration
   */
  const registerOwner = async (formData) => {
    return await authService.registerOwner(formData);
  };

  /**
   * Update Profile
   */
  const updateProfile = async (updatedData) => {
    const res = await authService.updateProfile(updatedData);
    if (res.success && res.user) {
      setCurrentUser(res.user);
    }
    return res;
  };

  /**
   * Request 6-Digit Email OTP
   */
  const sendOTP = async (email) => {
    return await authService.sendOTP(email);
  };

  /**
   * Verify 6-Digit Email OTP
   */
  const verifyOTP = async (email, otp) => {
    const res = await authService.verifyOTP(email, otp);
    if (res.success && res.user) {
      setCurrentUser(res.user);
    }
    return res;
  };

  /**
   * Resend 6-Digit Email OTP
   */
  const resendOTP = async (email) => {
    return await authService.resendOTP(email);
  };

  /**
   * Universal Logout
   */
  const logout = () => {
    authService.logoutUser();
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        user: currentUser,
        counterId: currentUser?.counterId || currentUser?.id,
        role,
        isAuthenticated,
        loading,
        login,
        loginWithGoogle,
        sendOTP,
        verifyOTP,
        resendOTP,
        logout,
        refreshSession,
        completeGoogleCustomerRegistration,
        linkGoogleAccount,
        register: registerCustomer,
        registerCustomer,
        registerOwner,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}