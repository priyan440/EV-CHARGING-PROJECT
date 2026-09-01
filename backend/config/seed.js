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

dotenv.config();

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/ev_charging_db");
    console.log("Seeding EV Charging Management Database...");

    // Clear existing
    await User.deleteMany({});
    await StationOwner.deleteMany({});
    await Station.deleteMany({});
    await Charger.deleteMany({});
    await Booking.deleteMany({});
    await Payment.deleteMany({});
    await Counter.deleteMany({});
    await AuditLog.deleteMany({});

    // Seed Counters
    await Counter.create([
      { _id: "CUS", seq: 2 },
      { _id: "OWNER", seq: 2 },
      { _id: "STA", seq: 5 },
      { _id: "CHG", seq: 13 },
      { _id: "BK", seq: 2 },
      { _id: "PAY", seq: 2 },
    ]);

    // Seed Customers
    await User.create([
      {
        counterId: "CUS0001",
        name: "Priyan",
        email: "priyan@evcharge.com",
        mobile: "9876543210",
        password: "password123",
        role: "CUSTOMER",
        city: "Madurai",
        vehicles: [
          {
            number: "TN58AB1234",
            brand: "Tata",
            model: "Nexon EV Max",
            batteryCapacity: 40.5,
            batteryPercentage: 65,
            connectorType: "CCS2",
            isPrimary: true,
          },
        ],
      },
      {
        counterId: "CUS0002",
        name: "Rajesh Kumar",
        email: "rajesh@evcharge.com",
        mobile: "9840198765",
        password: "password123",
        role: "CUSTOMER",
        city: "Chennai",
        vehicles: [
          {
            number: "TN69AZ7708",
            brand: "Tata",
            model: "Nexon EV",
            batteryCapacity: 40.5,
            batteryPercentage: 65,
            connectorType: "CCS2",
            isPrimary: true,
          },
        ],
      },
    ]);

    // Seed Station Owners
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
        status: "Approved",
      },
    ]);

    // Seed Audit Log
    await AuditLog.create({
      user: "ADM0001",
      role: "ADMIN",
      action: "DATABASE_SEEDED",
      description: "Database seeded successfully with initial multi-role data.",
    });

    console.log("Database Seed Successful!");
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err.message);
    process.exit(1);
  }
};

seedDB();
