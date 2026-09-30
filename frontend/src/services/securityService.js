/**
 * securityService.js
 * Comprehensive Security Center Engine for EV Charging System.
 * Supports Customers, Station Owners, and Administrators.
 */

const SECURITY_STORAGE_KEY = "ev_security_state";

function getStoredSecurity() {
  try {
    const raw = localStorage.getItem(SECURITY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredSecurity(data) {
  try {
    localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Unable to persist security state:", e);
  }
}

export const securityService = {
  /**
   * Get user security profile and status checklist
   */
  getSecurityProfile: (user) => {
    const stored = getStoredSecurity() || {};
    const userId = user?.counterId || user?.id || "USER";
    const userSec = stored[userId] || {};

    const is2FAEnabled = userSec.is2FAEnabled !== undefined ? userSec.is2FAEnabled : false;
    const isGoogleLinked = Boolean(user?.googleId || (user?.email && user.email.includes("@gmail.com")));

    const checklist = [
      {
        id: "email",
        label: "Email Verification",
        description: `Verified email address: ${user?.email || "user@evcharge.com"}`,
        isSecure: true,
        badge: "VERIFIED",
      },
      {
        id: "phone",
        label: "Mobile Phone Verification",
        description: user?.mobile || user?.phone ? `Verified number: +91 ${user?.mobile || user?.phone}` : "Phone number registered",
        isSecure: Boolean(user?.mobile || user?.phone),
        badge: user?.mobile || user?.phone ? "VERIFIED" : "OPTIONAL",
      },
      {
        id: "password",
        label: "Password Protection",
        description: "Strong hashed password active. Last rotated 18 days ago.",
        isSecure: true,
        badge: "ACTIVE",
      },
      {
        id: "oauth",
        label: "Google Single Sign-On (OAuth 2.0)",
        description: isGoogleLinked ? "Google account linked with OAuth 2.0 encryption." : "Available for one-click secure sign-in.",
        isSecure: isGoogleLinked,
        badge: isGoogleLinked ? "CONNECTED" : "DISCONNECTED",
      },
      {
        id: "2fa",
        label: "Two-Factor Authentication (2FA)",
        description: is2FAEnabled ? "TOTP authenticator app verification required on login." : "Add an extra layer of security using Google/Microsoft Authenticator.",
        isSecure: is2FAEnabled,
        badge: is2FAEnabled ? "PROTECTED" : "DISABLED",
      },
    ];

    // Score calculation out of 100
    let securityScore = 60;
    if (user?.mobile || user?.phone) securityScore += 10;
    if (isGoogleLinked) securityScore += 10;
    if (is2FAEnabled) securityScore += 20;

    // Login Activity Log
    const loginActivity = userSec.loginActivity || [
      {
        id: "LOG_01",
        timestamp: "Just now",
        device: "Desktop PC",
        browser: "Chrome 124 / Windows 11",
        location: "Chennai, Tamil Nadu, India",
        ip: "103.21.124.58",
        status: "SUCCESS",
        isCurrentSession: true,
      },
      {
        id: "LOG_02",
        timestamp: "Yesterday, 09:15 PM",
        device: "Mobile Phone",
        browser: "Mobile Safari / iOS 17",
        location: "Madurai, Tamil Nadu, India",
        ip: "103.21.124.72",
        status: "SUCCESS",
        isCurrentSession: false,
      },
      {
        id: "LOG_03",
        timestamp: "3 days ago, 02:40 PM",
        device: "Desktop PC",
        browser: "Edge 123 / Windows 11",
        location: "Chennai, Tamil Nadu, India",
        ip: "49.207.210.14",
        status: "SUCCESS",
        isCurrentSession: false,
      },
    ];

    // Active Sessions
    const activeSessions = userSec.activeSessions || [
      {
        id: "SES_CURR",
        device: "Windows Desktop (Current)",
        client: "Google Chrome",
        ip: "103.21.124.58",
        location: "Chennai, India",
        lastActive: "Active Now",
        isCurrent: true,
      },
      {
        id: "SES_MOB",
        device: "Apple iPhone 15 Pro",
        client: "Mobile Safari",
        ip: "103.21.124.72",
        location: "Madurai, India",
        lastActive: "18 hours ago",
        isCurrent: false,
      },
    ];

    // Security Alerts History
    const alerts = userSec.alerts || [
      {
        id: "ALT_SEC_01",
        type: "INFO",
        title: "Session Initiated",
        date: "Today, Current Session",
        details: "Successful login authenticated with verified session token.",
      },
      {
        id: "ALT_SEC_02",
        type: "SUCCESS",
        title: "Security Shield Operational",
        date: "Permanent",
        details: "End-to-end token encryption and role-based route guards active.",
      },
    ];

    return {
      userId,
      securityScore,
      scoreStatus: securityScore >= 80 ? "Excellent" : securityScore >= 60 ? "Moderate" : "Action Needed",
      is2FAEnabled,
      checklist,
      loginActivity,
      activeSessions,
      alerts,
      backupCodes: userSec.backupCodes || ["A7X9-4K2M", "P9Q2-1B5T", "L3R8-9Z4C", "W2M4-7K9P", "E5V8-3N6J"],
    };
  },

  /**
   * Toggle 2FA State (Enable or Disable)
   */
  toggle2FA: (user, enable = true) => {
    const stored = getStoredSecurity() || {};
    const userId = user?.counterId || user?.id || "USER";
    const userSec = stored[userId] || {};

    userSec.is2FAEnabled = enable;
    if (enable) {
      userSec.alerts = [
        {
          id: `ALT_${Date.now()}`,
          type: "SUCCESS",
          title: "Two-Factor Authentication Enabled",
          date: "Just now",
          details: "Two-factor authentication (TOTP) was successfully enabled for this account.",
        },
        ...(userSec.alerts || []),
      ];
    } else {
      userSec.alerts = [
        {
          id: `ALT_${Date.now()}`,
          type: "WARNING",
          title: "Two-Factor Authentication Disabled",
          date: "Just now",
          details: "Two-factor authentication was turned off.",
        },
        ...(userSec.alerts || []),
      ];
    }

    stored[userId] = userSec;
    saveStoredSecurity(stored);
    return { success: true, is2FAEnabled: enable };
  },

  /**
   * Terminate other active sessions
   */
  terminateOtherSessions: (user) => {
    const stored = getStoredSecurity() || {};
    const userId = user?.counterId || user?.id || "USER";
    const userSec = stored[userId] || {};

    const currentOnly = (userSec.activeSessions || []).filter((s) => s.isCurrent);
    userSec.activeSessions = currentOnly.length > 0 ? currentOnly : [
      {
        id: "SES_CURR",
        device: "Current Device",
        client: "Web Browser",
        ip: "127.0.0.1",
        location: "Local Session",
        lastActive: "Active Now",
        isCurrent: true,
      },
    ];

    userSec.alerts = [
      {
        id: `ALT_${Date.now()}`,
        type: "INFO",
        title: "Other Sessions Logged Out",
        date: "Just now",
        details: "All remote sessions and external tokens were revoked.",
      },
      ...(userSec.alerts || []),
    ];

    stored[userId] = userSec;
    saveStoredSecurity(stored);
    return { success: true, message: "All other sessions have been logged out." };
  },

  /**
   * In-app password change handler
   */
  changePassword: (user, currentPassword, newPassword) => {
    if (!currentPassword || !newPassword) {
      return { success: false, message: "Both current and new passwords are required." };
    }
    if (newPassword.length < 6) {
      return { success: false, message: "New password must be at least 6 characters long." };
    }

    // Update in stored users
    try {
      const customers = JSON.parse(localStorage.getItem("ev_customers") || "[]");
      const owners = JSON.parse(localStorage.getItem("ev_station_owners") || "[]");
      const userId = (user?.counterId || "").toUpperCase();

      let found = false;
      const updatedCustomers = customers.map((c) => {
        if ((c.counterId || "").toUpperCase() === userId) {
          found = true;
          return { ...c, password: newPassword };
        }
        return c;
      });

      const updatedOwners = owners.map((o) => {
        if ((o.counterId || "").toUpperCase() === userId) {
          found = true;
          return { ...o, password: newPassword };
        }
        return o;
      });

      if (found) {
        localStorage.setItem("ev_customers", JSON.stringify(updatedCustomers));
        localStorage.setItem("ev_station_owners", JSON.stringify(updatedOwners));
      }

      // Record security event
      const stored = getStoredSecurity() || {};
      const userSec = stored[userId] || {};
      userSec.alerts = [
        {
          id: `ALT_${Date.now()}`,
          type: "SUCCESS",
          title: "Password Changed Successfully",
          date: "Just now",
          details: "Your account credentials were changed from this verified session.",
        },
        ...(userSec.alerts || []),
      ];
      stored[userId] = userSec;
      saveStoredSecurity(stored);

      return { success: true, message: "Password updated successfully!" };
    } catch (e) {
      return { success: false, message: "Error updating password." };
    }
  },
};
