# COMPLETE EV CHARGING STATION MANAGEMENT SYSTEM

A production-grade, multi-role EV Charging Ecosystem built with React, Vite, Tailwind CSS, Leaflet Maps, Recharts, Node.js, Express, and MongoDB.

---

## 🚀 KEY SYSTEM FEATURES

### 1. Multi-Role Ecosystem & Role-Based Access Control (RBAC)
- **Customer / EV User** (`/customer/*`): Registration, vehicle setup, location detection, interactive Leaflet station map, slot booking, live charging session simulation, invoices, payments, reviews, and complaints.
- **EV Station Owner** (`/owner/*`): Registration (pending Admin approval), station creation (`STA001`), charger setup (`CHG0001`), slot availability control, live session monitoring, revenue analytics, and maintenance ticketing (`MT000001`).
- **System Admin** (`/admin/*`): User & station owner management, station approval workflows, global map view, platform revenue breakdown, audit log tracking, and CSV reports generation.

### 2. Standardized Counter ID Architecture
Sequential auto-incrementing unique IDs are enforced system-wide:
- **Customer**: `CUS0001`, `CUS0002`
- **Station Owner**: `OWNER0001`
- **Station**: `STA001`
- **Charger**: `CHG0001`
- **Booking**: `BK000001`
- **Session**: `SES000001`
- **Payment**: `PAY000001`
- **Invoice**: `INV000001`
- **Maintenance Ticket**: `MT000001`
- **Complaint Ticket**: `CMP000001`

### 3. Interactive Leaflet Map & Location Services
- OpenStreetMap + Leaflet integration with color-coded status markers:
  - 🟢 **Green**: Available
  - 🟡 **Yellow**: Limited / Busy
  - 🔴 **Red**: Fully Occupied
  - 🔘 **Gray**: Offline / Maintenance
- Split-screen list & map interface, distance calculation (Haversine formula), ETA estimation, connector filters (CCS2, Type 2, CHAdeMO), price sorting, and rating filters.

---

## 🔑 TEST CREDENTIALS & DEMO ACCOUNTS

| Role | Identifier / Email | Password | Counter ID | Default Dashboard Route |
| :--- | :--- | :--- | :--- | :--- |
| **Customer** | `CUS0001` or `priyan@evcharge.com` | `password123` | `CUS0001` | `/customer/dashboard` |
| **Customer 2** | `CUS0002` or `rajesh@evcharge.com` | `password123` | `CUS0002` | `/customer/dashboard` |
| **Station Owner** | `OWNER0001` or `senthil@greencharge.com` | `ownerpassword` | `OWNER0001` | `/owner/dashboard` |
| **Admin** | `ADM0001` or `admin@evcharge.com` | `admin123` | `ADM0001` | `/admin/dashboard` |

---

## 🛠️ INSTALLATION & RUNNING INSTRUCTIONS

### 1. Run Frontend Application
```bash
# Install dependencies
npm install

# Run Vite local dev server
npm run dev
```
Open `http://localhost:5173` in your browser.

### 2. Run Backend API Server (Optional Full-Stack Mode)
```bash
# Navigate to backend directory
cd backend

# Install backend dependencies
npm install

# (Optional) Seed initial MongoDB database
npm run seed

# Run backend REST API server
npm run dev
```
The backend API server runs at `http://localhost:5000/api`.

> **Note**: The frontend is built with a zero-crash hybrid service layer (`apiService`). It operates smoothly both in standalone simulated mode and when connected to a live MongoDB backend server.

---

## 🛣️ ROUTE MAP & API ENDPOINTS

### Frontend Routes:
- Public: `/login`, `/register`, `/owner/login`, `/admin/login`
- Customer: `/customer/dashboard`, `/customer/stations`, `/customer/stations/:id`, `/customer/book`, `/customer/bookings`, `/customer/live-charging`, `/customer/history`, `/customer/payments`, `/customer/vehicles`, `/customer/reviews`, `/customer/complaints`, `/customer/profile`, `/customer/settings`
- Station Owner: `/owner/dashboard`, `/owner/stations`, `/owner/chargers`, `/owner/bookings`, `/owner/sessions`, `/owner/revenue`, `/owner/maintenance`, `/owner/reviews`
- Admin: `/admin/dashboard`, `/admin/owners`, `/admin/stations`, `/admin/chargers`, `/admin/users`, `/admin/bookings`, `/admin/sessions`, `/admin/payments`, `/admin/maintenance`, `/admin/reports`, `/admin/analytics`, `/admin/audit-logs`

### Backend REST Endpoints:
- `POST /api/auth/login`
- `POST /api/auth/register-customer`
- `POST /api/auth/register-owner`
- `GET /api/stations`
- `POST /api/stations`
- `GET /api/chargers`
- `POST /api/bookings`
- `GET /api/payments`
- `GET /api/health`
