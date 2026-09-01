// Storage Helper for Complete EV Charging Station Management System
import { INITIAL_STATIONS } from "../data/stations";

export const KEYS = {
  CUSTOMERS: "ev_customers",
  STATION_OWNERS: "ev_station_owners",
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

// Default Customer (Priyan - CUS0001)
const DEFAULT_CUSTOMER = {
  counterId: "CUS0001",
  role: "CUSTOMER",
  name: "Priyan",
  email: "priyan@evcharge.com",
  mobile: "9876543210",
  password: "password123",
  address: "15 Energy Park Street, KK Nagar",
  city: "Madurai",
  pincode: "625001",
  createdAt: new Date().toISOString(),
  vehicles: [
    {
      id: "VEH001",
      number: "TN58AB1234",
      brand: "Tata",
      model: "Nexon EV Max",
      type: "Electric SUV",
      batteryCapacity: 40.5,
      batteryPercentage: 65,
      connectorType: "CCS2",
      isPrimary: true,
    },
    {
      id: "VEH002",
      number: "TN01AB5678",
      brand: "Hyundai",
      model: "Ioniq 5",
      type: "Electric Crossover",
      batteryCapacity: 72.6,
      batteryPercentage: 42,
      connectorType: "CCS2",
      isPrimary: false,
    },
  ],
  vehicle: {
    number: "TN58AB1234",
    brand: "Tata",
    model: "Nexon EV Max",
    type: "Electric SUV",
    batteryCapacity: 40.5,
    batteryPercentage: 65,
  },
  chargingPreference: {
    type: "DC Fast Charging",
    connector: "CCS2",
  },
};

// Default Customer 2 (Rajesh - CUS0002)
const DEFAULT_CUSTOMER_2 = {
  counterId: "CUS0002",
  role: "CUSTOMER",
  name: "Rajesh Kumar",
  email: "rajesh@evcharge.com",
  mobile: "9840198765",
  password: "password123",
  address: "42 MG Road",
  city: "Chennai",
  pincode: "600002",
  createdAt: new Date().toISOString(),
  vehicles: [
    {
      id: "VEH003",
      number: "TN69AZ7708",
      brand: "Tata",
      model: "Nexon EV",
      type: "Electric SUV",
      batteryCapacity: 40.5,
      batteryPercentage: 65,
      connectorType: "CCS2",
      isPrimary: true,
    },
  ],
  vehicle: {
    number: "TN69AZ7708",
    brand: "Tata",
    model: "Nexon EV",
    type: "Electric SUV",
    batteryCapacity: 40.5,
    batteryPercentage: 65,
  },
};

// Default Station Owners
const DEFAULT_OWNERS = [
  {
    counterId: "OWNER0001",
    role: "STATION_OWNER",
    ownerName: "Senthil Nathan",
    businessName: "GreenCharge Infrastructure Pvt Ltd",
    email: "senthil@greencharge.com",
    phone: "9840011223",
    password: "ownerpassword",
    businessAddress: "142 Anna Salai",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600002",
    gstNumber: "33AAAAA0000A1Z5",
    businessRegNumber: "REG987654",
    status: "Approved", // Approved by Admin
    createdAt: new Date().toISOString(),
  },
  {
    counterId: "OWNER0002",
    role: "STATION_OWNER",
    ownerName: "Anandh V",
    businessName: "VoltSpace Power Systems",
    email: "anandh@voltspace.com",
    phone: "9840022334",
    password: "ownerpassword",
    businessAddress: "Level B2 Parking, Phoenix Marketcity",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600042",
    gstNumber: "33BBBBB1111B2Z6",
    businessRegNumber: "REG123456",
    status: "Approved",
    createdAt: new Date().toISOString(),
  },
  {
    counterId: "OWNER0003",
    role: "STATION_OWNER",
    ownerName: "Karthik Raja",
    businessName: "EcoDrive Charge Points",
    email: "karthik@ecodrive.com",
    phone: "9840033445",
    password: "ownerpassword",
    businessAddress: "78 Ring Road",
    city: "Madurai",
    state: "Tamil Nadu",
    pincode: "625020",
    gstNumber: "33CCCCC2222C3Z7",
    status: "Pending Approval", // Awaiting Admin Approval
    createdAt: new Date().toISOString(),
  },
];

// Default Bookings
const DEFAULT_BOOKINGS = [
  {
    bookingId: "BK000001",
    counterId: "CUS0001",
    customerName: "Priyan",
    stationId: "STA001",
    stationName: "EV Power Hub Chennai Central",
    chargerId: "CHG0001",
    connectorType: "CCS2",
    vehicleNumber: "TN58AB1234",
    vehicleModel: "Tata Nexon EV Max",
    date: new Date().toISOString().split("T")[0],
    time: "10:00 AM",
    duration: "45 Mins",
    currentBattery: 65,
    targetBattery: 90,
    estimatedKwh: 10.1,
    chargingCost: 181.8,
    serviceFee: 20,
    tax: 36.3,
    totalAmount: 238.1,
    status: "Confirmed",
    paymentStatus: "Paid",
    paymentMethod: "UPI",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    bookingId: "BK000002",
    counterId: "CUS0002",
    customerName: "Rajesh Kumar",
    stationId: "STA004",
    stationName: "Apex HyperFast Station Madurai",
    chargerId: "CHG0010",
    connectorType: "CCS2",
    vehicleNumber: "TN69AZ7708",
    vehicleModel: "Tata Nexon EV",
    date: new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0],
    time: "02:00 PM",
    duration: "1 Hour",
    currentBattery: 20,
    targetBattery: 85,
    estimatedKwh: 26.3,
    chargingCost: 526.0,
    serviceFee: 20,
    tax: 98.28,
    totalAmount: 644.28,
    status: "Completed",
    paymentStatus: "Paid",
    paymentMethod: "Credit Card",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

// Default Payments
const DEFAULT_PAYMENTS = [
  {
    paymentId: "PAY000001",
    bookingId: "BK000001",
    counterId: "CUS0001",
    invoiceId: "INV000001",
    customerName: "Priyan",
    stationName: "EV Power Hub Chennai Central",
    amount: 238.1,
    platformFee: 20.0,
    ownerAmount: 218.1,
    paymentMethod: "UPI",
    transactionId: "TXN9876543210",
    status: "Success",
    date: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    paymentId: "PAY000002",
    bookingId: "BK000002",
    counterId: "CUS0002",
    invoiceId: "INV000002",
    customerName: "Rajesh Kumar",
    stationName: "Apex HyperFast Station Madurai",
    amount: 644.28,
    platformFee: 20.0,
    ownerAmount: 624.28,
    paymentMethod: "Credit Card",
    transactionId: "TXN1234567890",
    status: "Success",
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

// Default Audit Logs
const DEFAULT_AUDIT_LOGS = [
  {
    id: "LOG001",
    user: "ADM0001",
    role: "ADMIN",
    action: "SYSTEM_INITIALIZED",
    description: "EV Charging Station Management System started successfully.",
    timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "LOG002",
    user: "ADM0001",
    role: "ADMIN",
    action: "OWNER_APPROVED",
    description: "Approved Station Owner OWNER0001 (Senthil Nathan).",
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "LOG003",
    user: "CUS0001",
    role: "CUSTOMER",
    action: "BOOKING_CREATED",
    description: "Created booking BK000001 for station STA001.",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

export function initializeStorage() {
  if (!localStorage.getItem(KEYS.CUSTOMERS)) {
    localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify([DEFAULT_CUSTOMER, DEFAULT_CUSTOMER_2]));
  }
  if (!localStorage.getItem(KEYS.STATION_OWNERS)) {
    localStorage.setItem(KEYS.STATION_OWNERS, JSON.stringify(DEFAULT_OWNERS));
  }
  
  const existingStations = localStorage.getItem(KEYS.STATIONS);
  if (!existingStations || (JSON.parse(existingStations) || []).length < 10) {
    localStorage.setItem(KEYS.STATIONS, JSON.stringify(INITIAL_STATIONS));
  }
  
  if (!localStorage.getItem(KEYS.BOOKINGS)) {
    localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(DEFAULT_BOOKINGS));
  }
  if (!localStorage.getItem(KEYS.PAYMENTS)) {
    localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(DEFAULT_PAYMENTS));
  }
  if (!localStorage.getItem(KEYS.AUDIT_LOGS)) {
    localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(DEFAULT_AUDIT_LOGS));
  }
  if (!localStorage.getItem(KEYS.THEME)) {
    localStorage.setItem(KEYS.THEME, "dark");
  }
}

// Storage Helpers
export function getCustomers() {
  try {
    const data = localStorage.getItem(KEYS.CUSTOMERS);
    return data ? JSON.parse(data) : [DEFAULT_CUSTOMER, DEFAULT_CUSTOMER_2];
  } catch {
    return [DEFAULT_CUSTOMER, DEFAULT_CUSTOMER_2];
  }
}

export function saveCustomer(customer) {
  const customers = getCustomers();
  const index = customers.findIndex((c) => c.counterId === customer.counterId);
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
    return data ? JSON.parse(data) : DEFAULT_OWNERS;
  } catch {
    return DEFAULT_OWNERS;
  }
}

export function saveStationOwner(owner) {
  const owners = getStationOwners();
  const index = owners.findIndex((o) => o.counterId === owner.counterId);
  if (index >= 0) {
    owners[index] = { ...owners[index], ...owner };
  } else {
    owners.push(owner);
  }
  localStorage.setItem(KEYS.STATION_OWNERS, JSON.stringify(owners));
  return owner;
}

export function getStations() {
  try {
    const data = localStorage.getItem(KEYS.STATIONS);
    return data ? JSON.parse(data) : INITIAL_STATIONS;
  } catch {
    return INITIAL_STATIONS;
  }
}

export function saveStation(station) {
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
    return data ? JSON.parse(data) : DEFAULT_BOOKINGS;
  } catch {
    return DEFAULT_BOOKINGS;
  }
}

export function saveBooking(booking) {
  const bookings = getBookings();
  bookings.unshift(booking);
  localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(bookings));
  return booking;
}

export function updateBooking(bookingId, updates) {
  const bookings = getBookings();
  const updated = bookings.map((b) => (b.bookingId === bookingId ? { ...b, ...updates } : b));
  localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(updated));
  return updated;
}

export function getPayments() {
  try {
    const data = localStorage.getItem(KEYS.PAYMENTS);
    return data ? JSON.parse(data) : DEFAULT_PAYMENTS;
  } catch {
    return DEFAULT_PAYMENTS;
  }
}

export function savePayment(payment) {
  const payments = getPayments();
  payments.unshift(payment);
  localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(payments));
  return payment;
}

export function getAuditLogs() {
  try {
    const data = localStorage.getItem(KEYS.AUDIT_LOGS);
    return data ? JSON.parse(data) : DEFAULT_AUDIT_LOGS;
  } catch {
    return DEFAULT_AUDIT_LOGS;
  }
}

export function saveAuditLog(log) {
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
