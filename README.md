# ⚡ FULL-STACK EV CHARGING STATION MANAGEMENT SYSTEM
## MySQL-Only Architecture & Relational Persistence Layer

A production-grade, relational database-driven **EV Charging Station Management Platform** built with **React**, **Vite**, **Node.js**, **Express**, **MySQL (mysql2)**, **Socket.IO Real-Time Telemetry**, and **Razorpay Test Mode Integration**.

---

## 🏗️ ARCHITECTURE & DATA FLOW

```
React (Vite) Frontend (Port 5173)
           │
           │ REST APIs (Axios) + Real-Time Events (Socket.IO)
           ▼
Node.js + Express Server (Port 5001)
           │
           ├─► MySQL Database (ev_charging_system) ── Single Source of Truth
           ├─► Centralized Connection Pool & ACID Transactions
           ├─► Razorpay Order & Cryptographic Signature Verification
           └─► Real-Time Multi-Dashboard Synchronization (User ↔ Owner ↔ Admin)
```

---

## 🛡️ SINGLE SOURCE OF TRUTH (MYSQL ONLY)

- **Database Engine**: MySQL 8.0+
- **Driver**: `mysql2/promise` with Connection Pool
- **Zero Mock / Zero Seed Data**: Database starts in a clean empty state.
- **Relational Integrity**: Foreign key constraints, indexing, transactions, and backend parameterized queries.
- **Synchronized Dashboards**:
  - **User**: Register, add vehicles, book charging, make payments, raise complaints, view charging sessions.
  - **Station Owner**: Manage stations, connectors, tariffs, approve bookings, view payments/revenue, resolve station complaints.
  - **Admin**: System-wide oversight over users, owners, stations, connectors, tariffs, bookings, payments, and complaints.

---

## 🚀 GETTING STARTED

### 1. Configure MySQL Database Environment
Edit `backend/.env`:
```env
PORT=5001
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=ev_charging_system
JWT_SECRET=your_jwt_secret_key_2026
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

### 2. Start Applications
```bash
# Start backend server
cd backend
npm install
node server.js

# Start frontend development server
cd frontend
npm install
npm run dev
```

---

## 🧪 REAL-TIME MULTI-ROLE DATA FLOW
1. **User Registers & Adds Vehicle** -> Persisted in MySQL `users` and `vehicles`.
2. **Owner Registers & Creates Station** -> Persisted in MySQL `stations`, `chargers`, and `tariffs`.
3. **User Books Station** -> Persisted in MySQL `bookings` (e.g. `EV000001`); instantly appears on User, Station Owner, and Admin dashboards.
4. **User Completes Payment** -> Verified cryptographically and stored in MySQL `payments`; updates booking status to `PAID` across all dashboards.
5. **User Submits Complaint** -> Stored in MySQL `complaints` (e.g. `CMP000001`); Owner and Admin review and update status (`OPEN` -> `IN_PROGRESS` -> `RESOLVED`), immediately reflected to the user.
