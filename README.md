# EV CHARGING STATION MANAGEMENT SYSTEM (FULL-STACK MYSQL)

A production-grade, multi-role EV Charging Ecosystem built with **React**, **Node.js**, **Express**, **MySQL Database**, **JWT Authentication**, and **Razorpay Test Mode Integration**.

---

## 🏗️ SYSTEM ARCHITECTURE

```
React Frontend (Port 5173)
        ↓
    REST APIs (Axios)
        ↓
Node.js + Express Backend (Port 5000)
        ↓
MySQL Database: ev_charging_db (Port 3306)
```

---

## 🔑 TEST CREDENTIALS & DEMO ACCOUNTS

| Role | Email | Password | Counter ID | Dashboard Route |
| :--- | :--- | :--- | :--- | :--- |
| **User / Customer** | `user@evcharge.com` | `user123` | `CUS0003` | `/customer/dashboard` |
| **Station Owner** | `owner@evcharge.com` | `owner123` | `OWNER0002` | `/owner/dashboard` |
| **Administrator** | `admin@evcharge.com` | `admin123` | `ADM0001` | `/admin/dashboard` |

---

## 🛠️ COMPLETE SETUP & RUNNING INSTRUCTIONS

### Step 1: Install Node.js & MySQL
- Ensure **Node.js** (v18+) is installed: `node -v`
- Ensure **MySQL Server** (v8.0+) is installed and running on port `3306`.

### Step 2: Create MySQL Database & Import Schema
1. Log into your MySQL console or MySQL Workbench:
   ```bash
   mysql -u root -p
   ```
2. Import the complete database schema with seed data:
   ```bash
   mysql -u root -p < backend/database/ev_charging_db.sql
   ```
   Or execute `backend/database/ev_charging_db.sql` directly in MySQL Workbench / phpMyAdmin.
   This creates the database `ev_charging_db` with all 7 related tables:
   - `users`
   - `vehicles`
   - `charging_stations`
   - `charging_slots`
   - `bookings`
   - `payments`
   - `login_activity`

### Step 3: Configure Environment Variables
Verify `backend/.env`:
```env
PORT=5000
NODE_ENV=development
CLIENT_ORIGINS=http://localhost:5173,http://localhost:3000

# MySQL Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_NAME=ev_charging_db
DB_PORT=3306

# Authentication Secret
JWT_SECRET=YOUR_SECURE_JWT_SECRET

# Razorpay Test Mode Credentials
RAZORPAY_KEY_ID=YOUR_RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_KEY_SECRET
```

### Step 4: Run the Application

#### Option A: Run Both Backend & Frontend Simultaneously (Recommended)
From the project root directory:
```bash
npm start
```
*(Runs concurrently: backend on `http://localhost:5000` and Vite frontend on `http://localhost:5173`)*

#### Option B: Run in Separate Terminals

**Terminal 1 (Backend API Server):**
```bash
cd backend
npm install
npm run dev
```
Backend API will be running at `http://localhost:5000`.
Health check: `http://localhost:5000/api/health`.

**Terminal 2 (Frontend React App):**
```bash
npm install
npm run dev
```
Frontend application will be accessible at `http://localhost:5173`.

---

## 📡 REST API ENDPOINTS

### Health Check
- `GET /api/health` — Checks Express and MySQL live connectivity.

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register User or Station Owner (hashes password with bcrypt).
- `POST /api/auth/register-customer` — Customer registration.
- `POST /api/auth/register-owner` — Station Owner registration.
- `POST /api/auth/login` — Login with Email or Counter ID (`CUS0003`, `OWNER0002`, `ADM0001`).
- `GET /api/auth/me` — Authenticated user profile and vehicles.

### Vehicles (`/api/vehicles`)
- `GET /api/vehicles` — User's registered vehicles.
- `GET /api/vehicles/:id` — Single vehicle details.
- `POST /api/vehicles` — Add new vehicle to MySQL.
- `PUT /api/vehicles/:id` — Update vehicle details.
- `DELETE /api/vehicles/:id` — Remove vehicle from MySQL.

### Charging Stations (`/api/stations`)
- `GET /api/stations` — All platform stations from MySQL with available slots.
- `GET /api/stations/:id` — Station details with slots.
- `GET /api/stations/owner/my-stations` — Stations owned by authenticated owner.
- `POST /api/stations` — Create station (Owner / Admin).
- `PUT /api/stations/:id` — Update station.
- `DELETE /api/stations/:id` — Delete station.
- `GET /api/ev-stations` — External Open Charge Map stations.

### Charging Slots (`/api/slots`)
- `GET /api/slots/station/:stationId` — Slots for station.
- `GET /api/slots/:id` — Single slot.
- `POST /api/slots` — Add slot to station.
- `PUT /api/slots/:id` — Edit slot.
- `PATCH /api/slots/:id/status` — Change slot status (`AVAILABLE`, `OCCUPIED`, `RESERVED`).
- `DELETE /api/slots/:id` — Delete slot.

### Bookings (`/api/bookings`)
- `POST /api/bookings` — Create transactional booking with slot conflict prevention and `EVxxx` format ID.
- `GET /api/bookings` — Filtered bookings by user / owner / admin.
- `GET /api/bookings/:bookingId` — Search booking by ID (e.g. `EV001`).
- `PUT /api/bookings/:bookingId` — Update status / cancel booking and release slot back to `AVAILABLE`.
- `DELETE /api/bookings/:bookingId` — Cancel booking.

### Payments (`/api/payments`)
- `POST /api/payments/create-order` — Create Razorpay test order.
- `POST /api/payments/verify` — Verify Razorpay signature and persist in MySQL `payments` table.
- `POST /api/payments/refund` — Issue refund.
- `GET /api/payments` — Payment history from MySQL.

### Admin Dashboard (`/api/admin`)
- `GET /api/admin/stats` — Real MySQL aggregation for Users, Owners, Stations, Slots, Bookings, and Revenue.
- `GET /api/admin/users` — List all users with vehicle counts.
- `GET /api/admin/owners` — List all owners with station counts.
- `PUT /api/admin/users/:id/role` — Update user role.

---

## 🔒 SECURITY & VALIDATION FEATURES
1. **bcrypt Password Hashing**: Passwords stored as one-way salt hashes in MySQL.
2. **JWT Authentication**: JSON Web Tokens with 7-day expiration and secret protection.
3. **Double Booking Prevention**: MySQL transactional checks prevent overlapping bookings on the same slot.
4. **Parameterized SQL Queries**: All queries execute via `mysql2/promise` with prepared statement parameterization to prevent SQL injection.
5. **CORS & Environment Variables**: No hardcoded database credentials or secrets.
