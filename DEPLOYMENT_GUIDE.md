# 🌐 EV CHARGING MANAGEMENT SYSTEM — CLOUD DEPLOYMENT GUIDE

This guide provides step-by-step instructions to deploy the **EV Charging Station Management System** to production using **GitHub**, **Vercel** (Frontend), **Render / Railway** (Backend), and **Cloud MySQL** (Aiven / Railway / TiDB / PlanetScale / Clever Cloud).

---

## 🏗️ Target Deployment Architecture

```text
                             GITHUB REPOSITORY
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
          FRONTEND (React/Vite)               BACKEND (Node/Express)
             Hosted on VERCEL                   Hosted on RENDER / RAILWAY
         https://ev-app.vercel.app           https://ev-backend.onrender.com
                  │                                   │
                  │   REST API (HTTPS) + Socket.IO    │
                  └──────────────────────────────────►│
                                                      │
                                                      ▼
                                              CLOUD MYSQL DATABASE
                                         (Aiven / Railway / TiDB / AWS)
                                                      ▲
                                                      │
                                            MySQL Workbench / Adminer
                                              (for schema & queries)
```

---

## 📋 PRE-DEPLOYMENT SUMMARY OF PREPARATION COMPLETED

- ✅ **Vite Frontend Production Build Tested**: 3,270 modules built cleanly into `dist/`.
- ✅ **Dynamic API & Socket URLs**: Frontend services utilize `import.meta.env.VITE_API_URL` and `import.meta.env.VITE_SOCKET_URL`.
- ✅ **SPA Routing on Vercel**: `vercel.json` configured with URL rewrites to prevent 404 on page refresh.
- ✅ **Cloud MySQL Support**: `backend/config/db.js` updated to accept both connection URIs (`DATABASE_URL` / `MYSQL_URL`) and discrete variables with auto-SSL (`DB_SSL=true`).
- ✅ **CORS Domain Whitelist**: `backend/server.js` configured with `CLIENT_ORIGINS` environment variable for production domains.
- ✅ **Database Migrations & Seed Scripts**: `backend/database/schema.sql` (Relational DDL) and `backend/database/seed.sql` (Safe fictional test accounts).
- ✅ **Safe `.env.example` Files**: Stripped of sensitive secrets and passwords across root, frontend, and backend.

---

## 🚀 STEP-BY-STEP DEPLOYMENT PROCESS

---

### Step 1: Create a GitHub Repository
1. Log into your [GitHub](https://github.com/) account.
2. Click **New Repository** (e.g., `ev-charging-management-system`).
3. Set the repository to **Private** or **Public**.
4. Do NOT initialize with a README if you already have local files.

---

### Step 2: Push Local Code to GitHub
Open your terminal in the project root directory (`c:\Users\SubbuRaj\Downloads\EV MWT`):

```bash
# Check git status to ensure .env is ignored
git status

# Add all files (excluding ignored .env and node_modules)
git add .

# Commit changes
git commit -m "feat: prepare EV Charging system for Vercel, Render and Cloud MySQL deployment"

# Link your remote GitHub repo (replace with your repository URL)
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git

# Push code to GitHub
git push -u origin main
```

---

### Step 3: Provision a Free Cloud MySQL Database
Choose any cloud MySQL provider:

#### Option A: Aiven for MySQL (Recommended - Free Tier)
1. Sign up at [aiven.io](https://aiven.io/).
2. Create a new **MySQL** service on the Free Tier.
3. Once running, copy the **Service URI** or connection details:
   - Host (`DB_HOST`)
   - Port (`DB_PORT`)
   - User (`DB_USER`)
   - Password (`DB_PASSWORD`)
   - Database Name (`DB_NAME` — default is `defaultdb`)
   - SSL: `REQUIRED` (`DB_SSL=true`)

#### Option B: Railway MySQL
1. Go to [railway.app](https://railway.app/).
2. Click **New Project** -> **Provision MySQL**.
3. Go to **Variables** tab and copy `MYSQL_URL` or `DATABASE_URL`.

---

### Step 4: Import Database Schema & Seed Data into Cloud MySQL

You can use **MySQL Workbench** or any SQL client to execute the DDL:

1. Open **MySQL Workbench**.
2. Click **+** to add a new MySQL connection.
3. Enter your Cloud MySQL **Host**, **Port**, **Username**, and **Password**. (If using SSL, set SSL to *Require* or *Allow*).
4. Test Connection and Connect.
5. Open the file `backend/database/schema.sql` and run all queries to create all 14 relational tables (`users`, `stations`, `chargers`, `charger_connectors`, `tariffs`, `bookings`, `payments`, `vehicles`, etc.).
6. (Optional) Open `backend/database/seed.sql` and run it if you wish to populate demo accounts:
   - **Admin**: `admin@evcharge.com` / `password123`
   - **Station Owner**: `owner@greenpower.com` / `password123`
   - **EV Customer**: `driver@evcharge.com` / `password123`

---

### Step 5: Deploy Backend on Render (or Railway)

#### Deploying on Render:
1. Sign in to [Render](https://render.com/).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Configure the Web Service settings:
   - **Name**: `ev-charging-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Free

5. Under **Environment Variables**, add:
   | Key | Value / Description |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` |
   | `DB_HOST` | Cloud MySQL host (e.g. `mysql-xxx.aivencloud.com`) |
   | `DB_PORT` | `3306` (or provided port) |
   | `DB_USER` | Cloud MySQL username |
   | `DB_PASSWORD` | Cloud MySQL password |
   | `DB_NAME` | Cloud MySQL database name (e.g. `defaultdb` or `ev_charging_system`) |
   | `DB_SSL` | `true` |
   | `JWT_SECRET` | Generate a strong 32+ char secret string |
   | `CLIENT_ORIGINS` | `https://your-frontend-name.vercel.app` (Can be updated in Step 9) |
   | `RAZORPAY_KEY_ID` | Your Razorpay Test Key ID |
   | `RAZORPAY_KEY_SECRET` | Your Razorpay Test Key Secret |

6. Click **Create Web Service**.
7. Once deployed, note down your live Backend URL:
   `https://ev-charging-backend-xxxx.onrender.com`

8. Test the Health Check endpoint:
   `https://ev-charging-backend-xxxx.onrender.com/api/health`
   Expected response:
   ```json
   {
     "status": "OK",
     "success": true,
     "message": "EV Charging API is running",
     "database": "connected"
   }
   ```

---

### Step 6: Deploy Frontend on Vercel

1. Sign in to [Vercel](https://vercel.com/).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository.
4. In the configuration screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `frontend`
   - **Build Command**: `npm run build` (Default)
   - **Output Directory**: `dist` (Default)

5. Under **Environment Variables**, add:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://ev-charging-backend-xxxx.onrender.com/api` |
   | `VITE_SOCKET_URL` | `https://ev-charging-backend-xxxx.onrender.com` |
   | `VITE_RAZORPAY_KEY_ID` | Your Razorpay Test Key ID |

6. Click **Deploy**.
7. Once deployed, Vercel will give you your production URL (e.g., `https://ev-charging-frontend.vercel.app`).

---

### Step 7: Update Backend CORS Whitelist
1. Return to your **Render** dashboard for `ev-charging-backend`.
2. In **Environment Variables**, update `CLIENT_ORIGINS` to include your new Vercel domain:
   ```env
   CLIENT_ORIGINS=https://ev-charging-frontend.vercel.app,http://localhost:5173
   ```
3. Save changes (Render will automatically redeploy).

---

## 🧪 FULL END-TO-END PRODUCTION VERIFICATION

Perform this checklist on your live Vercel URL to verify zero regressions:

1. **User Registration & Login**:
   - Register a new EV Driver account.
   - Verify JWT is issued and stored in browser storage.
2. **Vehicle Management**:
   - Navigate to Dashboard / Vehicles.
   - Add a new vehicle (e.g., Tata Nexon EV, 40.5 kWh, CCS2).
   - Verify it appears in your Cloud MySQL `vehicles` table.
3. **Station Search & Map**:
   - Open Find Stations (`/stations` or `/find-stations`).
   - Check interactive map markers and station filters.
4. **Slot Booking**:
   - Select a station and pick an available charging slot/connector.
   - Confirm reservation.
   - Verify booking record is inserted into MySQL `bookings` table with an atomic ID.
5. **Razorpay Payment (Test Mode)**:
   - Complete checkout with test card details (`4111...`).
   - Verify payment signature is cryptographically verified and status changes to `PAID`.
6. **Station Owner Dashboard**:
   - Login as Station Owner (`owner@greenpower.com` / `password123` or your registered owner).
   - Verify live incoming bookings, charger statuses, and station revenue updates.
7. **Admin Dashboard**:
   - Login as Administrator (`admin@evcharge.com` / `password123`).
   - Verify system metrics, user lists, stations, complaints, and financial transactions.
8. **SPA Page Refresh Test**:
   - Navigate directly to `/login`, `/dashboard`, `/admin`, `/station-owner`.
   - Refresh the browser (F5) — confirm no 404 error occurs.

---

## 🔒 SECURITY & BEST PRACTICES SUMMARY

- **No Plaintext Passwords**: All user passwords are encrypted using `bcryptjs` with salt rounds = 10.
- **Strict Parameterized Queries**: All SQL executions use `?` placeholder bindings via `mysql2/promise` to prevent SQL Injection.
- **Environment Isolation**: No production database passwords, JWT secrets, or Razorpay secrets are committed to Git.
- **Helmet Security Headers & Rate Limiting**: Enabled on Express for anti-abuse and header protection.
- **Graceful Failover**: Health check endpoint `/api/health` validates active database pool connectivity.
