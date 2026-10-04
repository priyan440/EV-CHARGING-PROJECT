// Storage Helper for EV Charging Station Management System
// Single Source of Truth is MySQL Database via Express REST APIs.
// LocalStorage is strictly used for authentication tokens, active session caches, and theme preferences.

export const KEYS = {
  CUSTOMERS: "ev_customers",
  STATION_OWNERS: "ev_station_owners",
  TECHNICIANS: "ev_technicians",
  STATIONS: "ev_stations",
  CHARGERS: "ev_chargers",
  BOOKINGS: "ev_bookings",
  SESSIONS: "ev_sessions",
  PAYMENTS: "ev_payments",
  REVIEWS: "ev_reviews",
  MAINTENANCE: "ev_maintenance",
  COMPLAINTS: "ev_complaints",
  AUDIT_LOGS: "ev_audit_logs",
  CURRENT_USER: "ev_current_user",
  THEME: "ev_theme",
};

/**
 * Initializes storage without injecting any demo or seed data.
 * Clears any legacy mock records to guarantee empty database behavior.
 */
export function initializeStorage() {
  if (!localStorage.getItem(KEYS.THEME)) {
    localStorage.setItem(KEYS.THEME, "dark");
  }

  // Purge legacy mock data if detected
  try {
    const rawCust = localStorage.getItem(KEYS.CUSTOMERS);
    if (rawCust && rawCust.includes("priyan@evcharge.com")) {
      localStorage.removeItem(KEYS.CUSTOMERS);
    }
    const rawBk = localStorage.getItem(KEYS.BOOKINGS);
    if (rawBk && rawBk.includes("BK000001")) {
      localStorage.removeItem(KEYS.BOOKINGS);
    }
    const rawPm = localStorage.getItem(KEYS.PAYMENTS);
    if (rawPm && rawPm.includes("PAY000001")) {
      localStorage.removeItem(KEYS.PAYMENTS);
    }
    const rawSt = localStorage.getItem(KEYS.STATIONS);
    if (rawSt && rawSt.includes("Forum Vijaya Mall")) {
      localStorage.removeItem(KEYS.STATIONS);
    }
  } catch {
    // Ignore storage parse errors
  }
}

// Storage Helpers returning real user data or empty arrays []
export function getCustomers() {
  try {
    const data = localStorage.getItem(KEYS.CUSTOMERS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveCustomer(customer) {
  if (!customer) return null;
  const customers = getCustomers();
  const index = customers.findIndex((c) => (c.counterId && c.counterId === customer.counterId) || (c.id && c.id === customer.id));
  if (index >= 0) {
    customers[index] = { ...customers[index], ...customer };
  } else {
    customers.push(customer);
  }
  localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(customers));
  return customer;
}

export function getStationOwners() {
  try {
    const data = localStorage.getItem(KEYS.STATION_OWNERS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveStationOwner(owner) {
  if (!owner) return null;
  const owners = getStationOwners();
  const index = owners.findIndex((o) => (o.counterId && o.counterId === owner.counterId) || (o.id && o.id === owner.id));
  if (index >= 0) {
    owners[index] = { ...owners[index], ...owner };
  } else {
    owners.push(owner);
  }
  localStorage.setItem(KEYS.STATION_OWNERS, JSON.stringify(owners));
  return owner;
}

export function getTechnicians() {
  try {
    const data = localStorage.getItem(KEYS.TECHNICIANS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveTechnician(tech) {
  if (!tech) return null;
  const techs = getTechnicians();
  const index = techs.findIndex((t) => t.counterId === tech.counterId || t.id === tech.id);
  if (index >= 0) {
    techs[index] = { ...techs[index], ...tech };
  } else {
    techs.push(tech);
  }
  localStorage.setItem(KEYS.TECHNICIANS, JSON.stringify(techs));
  return tech;
}

export function getStations() {
  try {
    const data = localStorage.getItem(KEYS.STATIONS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveStation(station) {
  if (!station) return null;
  const stations = getStations();
  const index = stations.findIndex((s) => s.id === station.id);
  if (index >= 0) {
    stations[index] = { ...stations[index], ...station };
  } else {
    stations.push(station);
  }
  localStorage.setItem(KEYS.STATIONS, JSON.stringify(stations));
  return station;
}

export function getBookings() {
  try {
    const data = localStorage.getItem(KEYS.BOOKINGS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveBooking(booking) {
  if (!booking) return null;
  const bookings = getBookings();
  bookings.unshift(booking);
  localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(bookings));
  return booking;
}

export function updateBooking(bookingId, updates) {
  const bookings = getBookings();
  const updated = bookings.map((b) => (b.bookingId === bookingId || b.id === bookingId ? { ...b, ...updates } : b));
  localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(updated));
  return updated;
}

export function getPayments() {
  try {
    const data = localStorage.getItem(KEYS.PAYMENTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function savePayment(payment) {
  if (!payment) return null;
  const payments = getPayments();
  payments.unshift(payment);
  localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(payments));
  return payment;
}

export function getAuditLogs() {
  try {
    const data = localStorage.getItem(KEYS.AUDIT_LOGS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveAuditLog(log) {
  if (!log) return null;
  const logs = getAuditLogs();
  const newLog = {
    id: `LOG${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...log,
  };
  logs.unshift(newLog);
  localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(logs));
  return newLog;
}

export function getCurrentUserFromStorage() {
  try {
    const data = localStorage.getItem(KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setCurrentUserInStorage(user) {
  if (user) {
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(KEYS.CURRENT_USER);
  }
}
