# ⚡ EV CHARGE PRO — Google OAuth 2.0 Integration Setup Guide

This guide walks you through configuring **Google OAuth 2.0** for **EV CHARGE PRO** (Smart EV Charging Station Management System) so your users can sign in with their Google accounts securely.

---

## 1. Create a Google Cloud Project

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Sign in with your Google account.
3. Click the **Select a project** dropdown at the top left and click **New Project**.
4. Name your project (e.g., `EV-Charge-Pro`) and click **Create**.
5. Once created, ensure your new project is selected from the project dropdown.

---

## 2. Configure the OAuth Consent Screen

1. In the left navigation menu, go to **APIs & Services** > **OAuth consent screen**.
2. Select **External** user type and click **Create**.
3. Fill in the **App information**:
   - **App name**: `EV CHARGE PRO`
   - **User support email**: Your email address
   - **App logo**: Optional (can upload EV Charge Pro brand icon)
4. Under **Developer contact information**:
   - Add your email address.
5. Click **Save and Continue**.
6. On the **Scopes** page:
   - Click **Add or Remove Scopes**.
   - Select:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `openid`
   - Click **Update** and then **Save and Continue**.
7. Under **Test users** (in Testing mode):
   - Add your test Google email accounts that you plan to log in with during development.
   - Click **Save and Continue**.
8. Review the summary and return to the dashboard.

---

## 3. Create Web OAuth 2.0 Client ID

1. Go to **APIs & Services** > **Credentials**.
2. Click **+ CREATE CREDENTIALS** at the top and select **OAuth client ID**.
3. Under **Application type**, choose **Web application**.
4. Set **Name** (e.g., `EV Charge Pro Web Client`).
5. Under **Authorized JavaScript origins**, click **+ ADD URI**:
   - For local development:
     ```text
     http://localhost:5173
     http://127.0.0.1:5173
     ```
   - For production:
     ```text
     https://your-domain.com
     ```
6. Under **Authorized redirect URIs**:
   - `@react-oauth/google` uses popup / GIS credential response directly via postMessage. For standard OAuth compatibility or redirect mode, add:
     ```text
     http://localhost:5173
     http://localhost:5173/login
     ```
7. Click **Create**.
8. A modal will appear showing:
   - **Your Client ID** (e.g., `1234567890-abcdefg123456.apps.googleusercontent.com`)
   - **Your Client Secret** (Keep this private! **Never** place the secret inside frontend code or `.env` frontend files).

---

## 4. Add the Client ID to `.env`

Open `.env` in the root of your project:

```env
VITE_API_URL=http://localhost:5000/api
VITE_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
VITE_RAZORPAY_KEY_ID=rzp_test_TWLlx2kwacu7Yf
VITE_GOOGLE_CLIENT_ID=YOUR_COPIED_GOOGLE_CLIENT_ID.apps.googleusercontent.com
```

> [!IMPORTANT]
> - Never prefix sensitive keys with `VITE_` because Vite bundles `VITE_*` variables into client-side code visible in the browser.
> - Google Client ID is a public identifier and is safe in `VITE_GOOGLE_CLIENT_ID`.
> - Google Client Secret belongs **only** in backend environment variables if server-side code exchange is used.

---

## 5. Role Security & Authentication Flows

EV CHARGE PRO implements strict role-based authorization:

### A. Customer Flow
1. User clicks **Customer** tab on `/login`.
2. User clicks **Continue with Google**.
3. Authenticates with Google.
4. If first-time user:
   - Default role is set to `CUSTOMER`.
   - Auto-generates next Customer ID (`CUS0001`, `CUS0003`, etc.).
   - Prompts for missing vehicle & phone details.
   - Saves vehicle to Garage and redirects to `/customer/dashboard`.
5. If returning customer:
   - Loads saved vehicle, bookings, and customer session.
   - Redirects to `/customer/dashboard`.

### B. Station Owner Flow
1. User clicks **Station Owner** tab on `/login`.
2. User clicks **Continue with Google**.
3. If email is not registered as an Owner:
   - Access denied: *"Your Google account is not registered as a Station Owner."*
   - Directs user to register their business first.
4. If registered:
   - Verifies Admin approval and redirects to `/owner/dashboard`.

### C. Administrator Flow
1. User clicks **Admin** tab on `/login`.
2. User clicks **Continue with Google**.
3. Verifies email against authorized administrator whitelist.
4. If unauthorized:
   - Access denied: *"Access denied. This Google account is not authorized for administrator access."*
5. If authorized:
   - Grants entry to `/admin/dashboard`.

---

## 6. Testing Checklist

- [x] Run `npm run build` to verify clean build without TypeScript or bundling errors.
- [x] Test normal password login for Customer (`CUS0001` / `password123`).
- [x] Test normal password login for Station Owner (`OWNER0001` / `ownerpassword`).
- [x] Test normal password login for Admin (`ADM0001` / `admin123`).
- [x] Test Google Customer login.
- [x] Test Google Owner login security check.
- [x] Test Google Admin login security check.
- [x] Verify `/customer/vehicles` renders completely with all vehicle cards and actions.
- [x] Verify Sign Out redirects to `/login` and protected routes prevent unauthorized access.
