import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/User.js";
import { StationOwner } from "../models/StationOwner.js";
import { Station } from "../models/Station.js";
import { Charger } from "../models/Charger.js";
import { Booking } from "../models/Booking.js";
import { Payment } from "../models/Payment.js";
import { Counter } from "../models/Counter.js";
import { AuditLog } from "../models/AuditLog.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config();

const SEED_STATIONS = [
  {
    stationId: "STA001",
    ownerCounterId: "OWNER0001",
    name: "Tata Power EZ Charge - Forum Vijaya Mall",
    address: "183 Arcot Road, Forum Vijaya Mall Parking B2, Vadapalani, Chennai, Tamil Nadu 600026",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600026",
    latitude: 13.0504,
    longitude: 80.2096,
    status: "Approved",
    openingHours: "10:00 AM - 10:00 PM",
    contactNumber: "+91 1800 209 5161",
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=600&q=80",
    amenities: ["Shopping Mall", "Food Court", "Restrooms", "Covered Parking", "Security Guard"],
  },
  {
    stationId: "STA002",
    ownerCounterId: "OWNER0001",
    name: "Jio-bp Pulse - Express Avenue Mall",
    address: "2 Mount Road, Express Avenue Mall Parking, Royapettah, Chennai, Tamil Nadu 600014",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600014",
    latitude: 13.0592,
    longitude: 80.2638,
    status: "Approved",
    openingHours: "24/7 Open",
    contactNumber: "+91 1800 891 9000",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=600&q=80",
    amenities: ["Jio Cafe", "Restrooms", "Fast Charging", "24/7 Security"],
  },
  {
    stationId: "STA003",
    ownerCounterId: "OWNER0002",
    name: "Zeon Charging - Guindy Industrial Estate",
    address: "Plot 45 SIDCO Industrial Estate, Guindy, Chennai, Tamil Nadu 600032",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600032",
    latitude: 13.0067,
    longitude: 80.2020,
    status: "Approved",
    openingHours: "24/7 Open",
    contactNumber: "+91 90470 20000",
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=600&q=80",
    amenities: ["Coffee Shop", "Restrooms", "Solar Canopy", "Tire Inflator"],
  },
  {
    stationId: "STA004",
    ownerCounterId: "OWNER0002",
    name: "Apex HyperFast Station Madurai",
    address: "Block C Energy Corridor, KK Nagar, Madurai, Tamil Nadu 625020",
    city: "Madurai",
    state: "Tamil Nadu",
    pincode: "625020",
    latitude: 9.9252,
    longitude: 78.1424,
    status: "Approved",
    openingHours: "24/7 Open",
    contactNumber: "+91 98450 98765",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1558441719-67450885d7bc?auto=format&fit=crop&w=600&q=80",
    amenities: ["Workstation Pods", "High-Speed WiFi", "Cafe Lounge", "EV Battery Check"],
  },
  {
    stationId: "STA005",
    ownerCounterId: "OWNER0001",
    name: "Tata Power EZ Charge - Phoenix Marketcity Bengaluru",
    address: "Mahadevapura, Whitefield Main Road, Bengaluru, Karnataka 560048",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560048",
    latitude: 12.9959,
    longitude: 77.6964,
    status: "Approved",
    openingHours: "24/7 Open",
    contactNumber: "+91 1800 209 5161",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=600&q=80",
    amenities: ["Shopping Mall", "Multi-Level Parking", "Food Court", "Restrooms"],
  },
  {
    stationId: "STA006",
    ownerCounterId: "OWNER0002",
    name: "Ather Grid - Indiranagar",
    address: "100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560038",
    latitude: 12.9784,
    longitude: 77.6408,
    status: "Approved",
    openingHours: "24/7 Open",
    contactNumber: "+91 76766 00900",
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=600&q=80",
    amenities: ["Cafe", "High Speed WiFi", "Restroom"],
  },
  {
    stationId: "STA007",
    ownerCounterId: "OWNER0001",
    name: "Jio-bp Pulse - BKC Hub Mumbai",
    address: "G Block, BKC, Bandra East, Mumbai, Maharashtra 400051",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400051",
    latitude: 19.0657,
    longitude: 72.8686,
    status: "Approved",
    openingHours: "24/7 Open",
    contactNumber: "+91 1800 891 9000",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=600&q=80",
    amenities: ["Wild Bean Cafe", "VIP Waiting Lounge", "Solar Roof"],
  },
  {
    stationId: "STA008",
    ownerCounterId: "OWNER0001",
    name: "Tata Power EZ Charge - Select CITYWALK Delhi",
    address: "A-3 Saket District Centre, Select CITYWALK, New Delhi 110017",
    city: "Delhi",
    state: "Delhi NCR",
    pincode: "110017",
    latitude: 28.5284,
    longitude: 77.2192,
    status: "Approved",
    openingHours: "10:00 AM - 10:00 PM",
    contactNumber: "+91 1800 209 5161",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=600&q=80",
    amenities: ["Luxury Shopping", "Fine Dining", "Valet EV Parking"],
  }
];

const SEED_CHARGERS = [
  { chargerId: "CHG0001", stationId: "STA001", name: "Gun 1 - DC Fast", connectorType: "CCS2", powerKw: 60, pricePerKwh: 18.5, status: "Available" },
  { chargerId: "CHG0002", stationId: "STA001", name: "Gun 2 - HyperCharge", connectorType: "CCS2", powerKw: 120, pricePerKwh: 21.0, status: "Available" },
  { chargerId: "CHG0003", stationId: "STA001", name: "Gun 3 - AC Standard", connectorType: "Type 2", powerKw: 22, pricePerKwh: 14.0, status: "Available" },
  { chargerId: "CHG0004", stationId: "STA002", name: "Bay A - Ultra Fast", connectorType: "CCS2", powerKw: 120, pricePerKwh: 19.5, status: "Available" },
  { chargerId: "CHG0005", stationId: "STA002", name: "Bay B - SuperCharge", connectorType: "CCS2", powerKw: 240, pricePerKwh: 24.0, status: "Available" },
  { chargerId: "CHG0006", stationId: "STA003", name: "Zeon Pod 1", connectorType: "CCS2", powerKw: 150, pricePerKwh: 20.0, status: "Available" },
  { chargerId: "CHG0007", stationId: "STA004", name: "Apex Madurai Gun 1", connectorType: "CCS2", powerKw: 150, pricePerKwh: 20.0, status: "Available" },
  { chargerId: "CHG0008", stationId: "STA004", name: "Apex Madurai Gun 2", connectorType: "CCS2", powerKw: 300, pricePerKwh: 24.0, status: "Available" },
  { chargerId: "CHG0009", stationId: "STA005", name: "Phoenix Gun 1", connectorType: "CCS2", powerKw: 150, pricePerKwh: 21.0, status: "Available" },
  { chargerId: "CHG0010", stationId: "STA005", name: "Phoenix Gun 2", connectorType: "CCS2", powerKw: 60, pricePerKwh: 18.5, status: "Available" },
];

const seedDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/ev_charging_db";
    await mongoose.connect(mongoUri);
    console.log(`⚡ Connected to MongoDB at: ${mongoUri}`);
    console.log("Seeding EV Charging Management Database...");

    // Clear existing collections
    await User.deleteMany({});
    await StationOwner.deleteMany({});
    await Station.deleteMany({});
    await Charger.deleteMany({});
    await Booking.deleteMany({});
    await Payment.deleteMany({});
    await Counter.deleteMany({});
    await AuditLog.deleteMany({});

    // Seed Counter Sequences
    await Counter.create([
      { _id: "CUS", seq: 2 },
      { _id: "OWNER", seq: 3 },
      { _id: "STA", seq: 8 },
      { _id: "CHG", seq: 10 },
      { _id: "BK", seq: 2 },
      { _id: "PAY", seq: 2 },
    ]);
    console.log("✓ Initialized Sequential Counters (CUS, OWNER, STA, CHG, BK, PAY)");

    // Seed Customers (Priyan CUS0001, Rajesh CUS0002)
    await User.create([
      {
        counterId: "CUS0001",
        name: "Priyan",
        email: "priyan@evcharge.com",
        mobile: "9876543210",
        password: "password123",
        role: "CUSTOMER",
        address: "15 Energy Park Street, KK Nagar",
        city: "Madurai",
        pincode: "625001",
        status: "Active",
        vehicles: [
          {
            number: "TN58AB1234",
            brand: "Tata",
            model: "Nexon EV Max",
            type: "Electric SUV",
            vehicleType: "Electric SUV",
            batteryCapacity: 40.5,
            batteryPercentage: 65,
            connectorType: "CCS2",
            isPrimary: true,
          },
        ],
        chargingPreference: {
          type: "DC Fast Charging",
          connector: "CCS2",
        },
      },
      {
        counterId: "CUS0002",
        name: "Rajesh Kumar",
        email: "rajesh@evcharge.com",
        mobile: "9840198765",
        password: "password123",
        role: "CUSTOMER",
        address: "42 MG Road",
        city: "Chennai",
        pincode: "600002",
        status: "Active",
        vehicles: [
          {
            number: "TN69AZ7708",
            brand: "Tata",
            model: "Nexon EV",
            type: "Electric SUV",
            vehicleType: "Electric SUV",
            batteryCapacity: 40.5,
            batteryPercentage: 65,
            connectorType: "CCS2",
            isPrimary: true,
          },
        ],
      },
    ]);
    console.log("✓ Seeded Default Customers: CUS0001 (priyan@evcharge.com) & CUS0002 (rajesh@evcharge.com)");

    // Seed Station Owners (OWNER0001, OWNER0002, OWNER0003)
    await StationOwner.create([
      {
        counterId: "OWNER0001",
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
        status: "Approved",
      },
      {
        counterId: "OWNER0002",
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
      },
      {
        counterId: "OWNER0003",
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
        status: "Approved",
      },
    ]);
    console.log("✓ Seeded Default Station Owners: OWNER0001 (senthil@greencharge.com), OWNER0002, OWNER0003");

    // Seed Stations & Chargers
    await Station.create(SEED_STATIONS);
    await Charger.create(SEED_CHARGERS);
    console.log(`✓ Seeded ${SEED_STATIONS.length} Stations and ${SEED_CHARGERS.length} Chargers`);

    // Seed Bookings
    await Booking.create([
      {
        bookingId: "BK000001",
        invoiceId: "INV000001",
        counterId: "CUS0001",
        customerName: "Priyan",
        stationId: "STA001",
        stationName: "Tata Power EZ Charge - Forum Vijaya Mall",
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
        status: "CONFIRMED",
        paymentStatus: "Paid",
        paymentMethod: "UPI",
      },
      {
        bookingId: "BK000002",
        invoiceId: "INV000002",
        counterId: "CUS0002",
        customerName: "Rajesh Kumar",
        stationId: "STA004",
        stationName: "Apex HyperFast Station Madurai",
        chargerId: "CHG0007",
        connectorType: "CCS2",
        vehicleNumber: "TN69AZ7708",
        vehicleModel: "Tata Nexon EV",
        date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
        time: "02:00 PM",
        duration: "1 Hour",
        currentBattery: 20,
        targetBattery: 85,
        estimatedKwh: 26.3,
        chargingCost: 526.0,
        serviceFee: 20,
        tax: 98.28,
        totalAmount: 644.28,
        status: "COMPLETED",
        paymentStatus: "Paid",
        paymentMethod: "Credit Card",
      },
    ]);
    console.log("✓ Seeded Default Bookings (BK000001, BK000002)");

    // Seed Payments
    await Payment.create([
      {
        paymentId: "PAY000001",
        bookingId: "BK000001",
        counterId: "CUS0001",
        invoiceId: "INV000001",
        customerName: "Priyan",
        stationName: "Tata Power EZ Charge - Forum Vijaya Mall",
        amount: 238.1,
        platformFee: 20.0,
        ownerAmount: 218.1,
        paymentMethod: "UPI",
        transactionId: "TXN9876543210",
        status: "SUCCESS",
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
        status: "SUCCESS",
      },
    ]);
    console.log("✓ Seeded Default Payments (PAY000001, PAY000002)");

    // Seed Audit Log
    await AuditLog.create({
      user: "ADM0001",
      role: "ADMIN",
      action: "DATABASE_SEEDED",
      description: "Database seeded successfully with initial multi-role data and Counter sequences.",
    });

    console.log("\n=======================================================");
    console.log("🎉 EV Charging Management MongoDB Database Seed Successful!");
    console.log("=======================================================\n");
    process.exit(0);
  } catch (err) {
    console.error("❌ Database Seed Failed:", err);
    process.exit(1);
  }
};

seedDB();
