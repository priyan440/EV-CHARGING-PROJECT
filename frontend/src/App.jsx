import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";
import { useAuth } from "./contexts/AuthContext";
import VoltBotChatbot from "./components/VoltBotChatbot";

// Auth & System Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Forbidden from "./pages/Forbidden";
import NotFound from "./pages/NotFound";

// Customer Pages
import CustomerDashboard from "./pages/CustomerDashboard";
import FindStations from "./pages/FindStations";
import EVMapPage from "./pages/EVMapPage";
import StationDetails from "./pages/StationDetails";
import Booking from "./pages/Booking";
import MyBookings from "./pages/MyBookings";
import LiveCharging from "./pages/LiveCharging";
import ChargingHistory from "./pages/ChargingHistory";
import Payments from "./pages/Payments";
import Vehicles from "./pages/Vehicles";
import Reviews from "./pages/Reviews";
import Complaints from "./pages/Complaints";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

// New Multi-Page Dedicated Workflow Pages
import AddVehicle from "./pages/AddVehicle";
import VehicleDetails from "./pages/VehicleDetails";
import SmartChargingEstimate from "./pages/SmartChargingEstimate";
import SlotSelection from "./pages/SlotSelection";
import BookingSummary from "./pages/BookingSummary";
import PaymentPage from "./pages/PaymentPage";
import BookingSuccess from "./pages/BookingSuccess";
import BookingDetails from "./pages/BookingDetails";
import LiveChargingSessionPage from "./pages/LiveChargingSessionPage";
import HistoryAnalytics from "./pages/HistoryAnalytics";
import BookSlot from "./pages/BookSlot";
import BookingConfirmation from "./pages/BookingConfirmation";

// Station Owner Pages
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import OwnerStations from "./pages/owner/OwnerStations";
import OwnerChargers from "./pages/owner/OwnerChargers";
import OwnerBookings from "./pages/owner/OwnerBookings";
import OwnerSessions from "./pages/owner/OwnerSessions";
import OwnerCustomers from "./pages/owner/OwnerCustomers";
import OwnerTariffs from "./pages/owner/OwnerTariffs";
import OwnerRevenue from "./pages/owner/OwnerRevenue";
import OwnerMaintenance from "./pages/owner/OwnerMaintenance";
import OwnerSmartLoad from "./pages/owner/OwnerSmartLoad";
import OwnerAnalytics from "./pages/owner/OwnerAnalytics";
import OwnerReports from "./pages/owner/OwnerReports";
import OwnerNotifications from "./pages/owner/OwnerNotifications";
import OwnerAuditLogs from "./pages/owner/OwnerAuditLogs";
import OwnerMap from "./pages/owner/OwnerMap";
import OwnerSettings from "./pages/owner/OwnerSettings";
import OwnerComplaints from "./pages/owner/OwnerComplaints";
import StationControlCenter from "./pages/owner/StationControlCenter";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOwners from "./pages/admin/AdminOwners";
import AdminStations from "./pages/admin/AdminStations";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import AdminReports from "./pages/admin/AdminReports";
import AdminSystemHealth from "./pages/admin/AdminSystemHealth";
import AdminTechnicians from "./pages/admin/AdminTechnicians";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminPricing from "./pages/admin/AdminPricing";

// New EV Platform Scanner & Session Controllers
import BookingVerify from "./pages/BookingVerify";
import OwnerScanner from "./pages/owner/OwnerScanner";
import LiveChargingSession from "./pages/owner/LiveChargingSession";

// Innovative Features 11-16 Pages
import OwnerAIDashboard from "./pages/owner/OwnerAIDashboard";
import OwnerDemandForecast from "./pages/owner/OwnerDemandForecast";
import VehicleHealth from "./pages/VehicleHealth";
import SecurityCenter from "./pages/SecurityCenter";
import EmergencyAssistance from "./pages/EmergencyAssistance";
import ChargingSimulator from "./pages/ChargingSimulator";

// Public Welcome / Landing Page
import Welcome from "./pages/Welcome";

// Field Technician Page
import TechnicianDashboard from "./pages/TechnicianDashboard";

import "./App.css";

/**
 * Root Route Redirection:
 * Authenticated -> Directs automatically to user's permitted dashboard
 * Unauthenticated -> Directs strictly to /login
 */
function RootRedirect() {
  const { isAuthenticated, role, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Welcome />;

  const r = (role || "").toUpperCase();
  if (r === "ADMIN") return <Navigate to="/admin/dashboard" replace />;
  if (r === "STATION_OWNER" || r === "OWNER") return <Navigate to="/owner/dashboard" replace />;
  if (r === "TECHNICIAN" || r === "TECH") return <Navigate to="/technician/dashboard" replace />;
  return <Navigate to="/customer/dashboard" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ==================================================== */}
        {/* PUBLIC AUTH & SYSTEM ROUTES                          */}
        {/* ==================================================== */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/403" element={<Forbidden />} />
        <Route path="/404" element={<NotFound />} />

        {/* STRICT REDIRECTION: Legacy / duplicate auth URLs route to single /login */}
        <Route path="/customer/login" element={<Navigate to="/login" replace />} />
        <Route path="/owner/login" element={<Navigate to="/login" replace />} />
        <Route path="/admin/login" element={<Navigate to="/login" replace />} />
        <Route path="/technician/login" element={<Navigate to="/login" replace />} />
        <Route path="/customer/auth" element={<Navigate to="/login" replace />} />
        <Route path="/owner/auth" element={<Navigate to="/login" replace />} />
        <Route path="/admin/auth" element={<Navigate to="/login" replace />} />
        <Route path="/technician/auth" element={<Navigate to="/login" replace />} />
        <Route path="/owner/register" element={<Navigate to="/register" replace />} />

        {/* ==================================================== */}
        {/* MASTER MULTI-PAGE EV CHARGING PLATFORM ROUTES        */}
        {/* ==================================================== */}

        {/* 1. USER DASHBOARD (Section 4) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <CustomerDashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/user/dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/customer/dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/customer-dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/customer" element={<Navigate to="/dashboard" replace />} />
        <Route path="/user" element={<Navigate to="/dashboard" replace />} />

        {/* 2. MY VEHICLES WORKFLOW (Sections 5 & 6) */}
        <Route
          path="/vehicles"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <Vehicles />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vehicles/add"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <AddVehicle />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vehicles/:id"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <VehicleDetails />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/my-vehicles" element={<Navigate to="/vehicles" replace />} />
        <Route path="/customer/vehicles" element={<Navigate to="/vehicles" replace />} />
        <Route path="/user/vehicles" element={<Navigate to="/vehicles" replace />} />

        {/* 3. FIND CHARGING STATIONS & STATION DETAILS (Sections 7 & 8) */}
        <Route
          path="/stations"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <FindStations />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/stations/:id"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <StationDetails />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/find-stations" element={<Navigate to="/stations" replace />} />
        <Route path="/customer/stations" element={<Navigate to="/stations" replace />} />
        <Route path="/customer/stations/:id" element={<Navigate to="/stations" replace />} />
        <Route path="/user/stations" element={<Navigate to="/stations" replace />} />

        {/* 4. SMART CHARGING CALCULATOR & 24-HOUR SLOTS (Sections 9, 10, 11, 12, 13, 14, 15, 16) */}
        <Route
          path="/charging"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <SmartChargingEstimate />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/charging/estimate"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <SmartChargingEstimate />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/charging/slots"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <SlotSelection />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/charging/summary"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <BookingSummary />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/booking/summary"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <BookingSummary />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        {/* Dedicated Slot Booking Wizard Routes with persistent Station parameter */}
        <Route
          path="/customer/book-slot/:stationId"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <BookSlot />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/book-slot"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <BookSlot />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/book-slot/:stationId"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <BookSlot />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/book-slot"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <BookSlot />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment/:bookingId"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <BookSlot />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/booking" element={<Navigate to="/book-slot" replace />} />
        <Route path="/customer/book" element={<Navigate to="/book-slot" replace />} />
        <Route path="/user/book" element={<Navigate to="/book-slot" replace />} />
        <Route path="/book-charging" element={<Navigate to="/book-slot" replace />} />

        {/* 5. PAYMENT CHECKOUT (Section 18) */}
        <Route
          path="/payment"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <PaymentPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <Payments />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/customer/payments" element={<Navigate to="/payments" replace />} />
        <Route path="/user/payments" element={<Navigate to="/payments" replace />} />

        {/* 6. BOOKING CONFIRMATION & SUCCESS (Section 10 & 19) */}
        <Route
          path="/customer/booking-success"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <BookingSuccess />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/booking-confirmation/:bookingId"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <BookingConfirmation />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/booking-confirmation"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <BookingConfirmation />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/booking/success"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <BookingSuccess />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/booking/confirmation" element={<Navigate to="/booking-confirmation" replace />} />

        {/* 7. MY BOOKINGS & BOOKING DETAILS (Sections 11 & 12) */}
        <Route
          path="/customer/booking/:bookingId"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <BookingDetails />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/booking-details"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <BookingDetails />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/booking/:id"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <BookingDetails />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-bookings"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <MyBookings />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookings"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <MyBookings />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/customer/bookings" element={<Navigate to="/my-bookings" replace />} />
        <Route path="/user/bookings" element={<Navigate to="/bookings" replace />} />

        {/* 8. LIVE CHARGING SESSIONS (Section 22) */}
        <Route
          path="/sessions/:id"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER", "STATION_OWNER", "OWNER", "ADMIN"]}>
              <MainLayout>
                <LiveChargingSessionPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <LiveChargingSessionPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/live-charging" element={<Navigate to="/sessions" replace />} />
        <Route path="/customer/live-charging" element={<Navigate to="/sessions" replace />} />
        <Route path="/user/live-charging" element={<Navigate to="/sessions" replace />} />

        {/* 9. CHARGING HISTORY & ESTIMATED VS ACTUAL ANALYTICS (Sections 23 & 24) */}
        <Route
          path="/history"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <HistoryAnalytics />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/charging-history" element={<Navigate to="/history" replace />} />
        <Route path="/customer/history" element={<Navigate to="/history" replace />} />
        <Route path="/user/history" element={<Navigate to="/history" replace />} />

        {/* 10. EV MAP, PROFILE & SETTINGS (Section 25) */}
        <Route
          path="/map"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <EVMapPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/ev-map" element={<Navigate to="/map" replace />} />
        <Route path="/live-map" element={<Navigate to="/map" replace />} />
        <Route path="/customer/map" element={<Navigate to="/map" replace />} />
        <Route path="/user/map" element={<Navigate to="/map" replace />} />

        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <Profile />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/customer/profile" element={<Navigate to="/profile" replace />} />
        <Route path="/user/profile" element={<Navigate to="/profile" replace />} />

        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "USER"]}>
              <MainLayout>
                <Settings />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/customer/settings" element={<Navigate to="/settings" replace />} />
        <Route path="/user/settings" element={<Navigate to="/settings" replace />} />

        {/* REVIEWS & COMPLAINTS */}
        <Route
          path="/customer/reviews"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <MainLayout>
                <Reviews />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/complaints"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <MainLayout>
                <Complaints />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* INNOVATIVE FEATURES: CUSTOMER ROUTES */}
        <Route
          path="/customer/vehicle-health"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <MainLayout>
                <VehicleHealth />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/user/vehicle-health" element={<Navigate to="/customer/vehicle-health" replace />} />
        <Route path="/vehicle-health" element={<Navigate to="/customer/vehicle-health" replace />} />

        <Route
          path="/customer/emergency-assistance"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <MainLayout>
                <EmergencyAssistance />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/emergency-assistance"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <MainLayout>
                <EmergencyAssistance />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/customer/charging-simulator"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <MainLayout>
                <ChargingSimulator />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/charging-simulator"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <MainLayout>
                <ChargingSimulator />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* STATION OWNER PROTECTED ROUTES */}
        <Route
          path="/owner/dashboard"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER", "OWNER"]}>
              <MainLayout>
                <OwnerDashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/control-center"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER", "OWNER", "ADMIN"]}>
              <MainLayout>
                <StationControlCenter />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/control-center"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER", "OWNER", "ADMIN"]}>
              <MainLayout>
                <StationControlCenter />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/stations"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER", "OWNER"]}>
              <MainLayout>
                <OwnerStations />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/map"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER", "OWNER"]}>
              <MainLayout>
                <OwnerMap />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/chargers"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER", "OWNER"]}>
              <MainLayout>
                <OwnerChargers />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/bookings"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER", "OWNER"]}>
              <MainLayout>
                <OwnerBookings />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/sessions"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER", "OWNER"]}>
              <MainLayout>
                <OwnerSessions />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/customers"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER", "OWNER"]}>
              <MainLayout>
                <OwnerCustomers />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/tariffs"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER", "OWNER"]}>
              <MainLayout>
                <OwnerTariffs />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/revenue"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER", "OWNER"]}>
              <MainLayout>
                <OwnerRevenue />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/maintenance"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER", "OWNER"]}>
              <MainLayout>
                <OwnerMaintenance />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/complaints"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER", "OWNER"]}>
              <MainLayout>
                <OwnerComplaints />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/smart-load"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER", "OWNER"]}>
              <MainLayout>
                <OwnerSmartLoad />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/analytics"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER", "OWNER"]}>
              <MainLayout>
                <OwnerAnalytics />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/reports"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER", "OWNER"]}>
              <MainLayout>
                <OwnerReports />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/notifications"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER", "OWNER"]}>
              <MainLayout>
                <OwnerNotifications />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/audit-logs"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER", "OWNER"]}>
              <MainLayout>
                <OwnerAuditLogs />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/settings"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER", "OWNER"]}>
              <MainLayout>
                <OwnerSettings />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/reviews"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER", "OWNER"]}>
              <MainLayout>
                <Reviews />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/profile"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER", "OWNER"]}>
              <MainLayout>
                <Profile />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* STATION OWNER ROLE ALIASES (/station-owner/* -> /owner/*) */}
        <Route path="/station-owner/dashboard" element={<Navigate to="/owner/dashboard" replace />} />
        <Route path="/station-owner/stations" element={<Navigate to="/owner/stations" replace />} />
        <Route path="/station-owner/chargers" element={<Navigate to="/owner/chargers" replace />} />
        <Route path="/station-owner/bookings" element={<Navigate to="/owner/bookings" replace />} />
        <Route path="/station-owner/sessions" element={<Navigate to="/owner/sessions" replace />} />
        <Route path="/station-owner/revenue" element={<Navigate to="/owner/revenue" replace />} />
        <Route path="/station-owner/analytics" element={<Navigate to="/owner/analytics" replace />} />
        <Route path="/station-owner/profile" element={<Navigate to="/owner/profile" replace />} />
        <Route path="/station-owner/settings" element={<Navigate to="/owner/settings" replace />} />
        <Route path="/station-owner/*" element={<Navigate to="/owner/dashboard" replace />} />

        {/* PUBLIC BOOKING VERIFICATION ROUTE */}
        <Route
          path="/booking/verify/:bookingId"
          element={
            <MainLayout>
              <BookingVerify />
            </MainLayout>
          }
        />

        {/* STATION OWNER SCANNER & LIVE SESSIONS */}
        <Route
          path="/owner/scanner"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER", "OWNER", "ADMIN"]}>
              <MainLayout>
                <OwnerScanner />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/session/:bookingId"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER", "OWNER", "ADMIN", "CUSTOMER"]}>
              <MainLayout>
                <LiveChargingSession />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* INNOVATIVE FEATURES: STATION OWNER AI ROUTES */}
        <Route
          path="/owner/ai-dashboard"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER", "OWNER"]}>
              <MainLayout>
                <OwnerAIDashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/demand-forecast"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER", "OWNER"]}>
              <MainLayout>
                <OwnerDemandForecast />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* FIELD TECHNICIAN PROTECTED ROUTES */}
        <Route
          path="/technician/dashboard"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}>
              <TechnicianDashboard defaultTab="overview" />
            </ProtectedRoute>
          }
        />
        <Route path="/technician" element={<Navigate to="/technician/dashboard" replace />} />
        <Route
          path="/technician/stations"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}>
              <TechnicianDashboard defaultTab="stations" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/technician/work-orders"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}>
              <TechnicianDashboard defaultTab="work-orders" />
            </ProtectedRoute>
          }
        />
        <Route path="/technician/tasks" element={<Navigate to="/technician/work-orders" replace />} />
        <Route path="/technician/orders" element={<Navigate to="/technician/work-orders" replace />} />
        <Route
          path="/technician/faults"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}>
              <TechnicianDashboard defaultTab="faults" />
            </ProtectedRoute>
          }
        />
        <Route path="/technician/diagnostics" element={<Navigate to="/technician/faults" replace />} />
        <Route
          path="/technician/maintenance"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}>
              <TechnicianDashboard defaultTab="maintenance" />
            </ProtectedRoute>
          }
        />
        <Route path="/technician/schedules" element={<Navigate to="/technician/maintenance" replace />} />
        <Route
          path="/technician/corrective-maintenance"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}>
              <TechnicianDashboard defaultTab="corrective-maintenance" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/technician/emergency"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}>
              <TechnicianDashboard defaultTab="emergency" />
            </ProtectedRoute>
          }
        />
        <Route path="/technician/emergencies" element={<Navigate to="/technician/emergency" replace />} />
        <Route
          path="/technician/charger-health"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}>
              <TechnicianDashboard defaultTab="charger-health" />
            </ProtectedRoute>
          }
        />
        <Route path="/technician/health" element={<Navigate to="/technician/charger-health" replace />} />
        <Route path="/technician/telemetry" element={<Navigate to="/technician/charger-health" replace />} />
        <Route
          path="/technician/network"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}>
              <TechnicianDashboard defaultTab="network" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/technician/spare-parts"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}>
              <TechnicianDashboard defaultTab="spare-parts" />
            </ProtectedRoute>
          }
        />
        <Route path="/technician/parts" element={<Navigate to="/technician/spare-parts" replace />} />
        <Route path="/technician/inventory" element={<Navigate to="/technician/spare-parts" replace />} />
        <Route
          path="/technician/service-reports"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}>
              <TechnicianDashboard defaultTab="service-reports" />
            </ProtectedRoute>
          }
        />
        <Route path="/technician/repairs" element={<Navigate to="/technician/service-reports" replace />} />
        <Route
          path="/technician/work-history"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}>
              <TechnicianDashboard defaultTab="work-history" />
            </ProtectedRoute>
          }
        />
        <Route path="/technician/history" element={<Navigate to="/technician/work-history" replace />} />
        <Route path="/technician/logs" element={<Navigate to="/technician/work-history" replace />} />
        <Route
          path="/technician/notifications"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}>
              <TechnicianDashboard defaultTab="notifications" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/technician/profile"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN", "ADMIN"]}>
              <TechnicianDashboard defaultTab="profile" />
            </ProtectedRoute>
          }
        />

        {/* ADMIN PROTECTED ROUTES */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <MainLayout>
                <AdminDashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/control-center"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <MainLayout>
                <StationControlCenter />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/owners"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <MainLayout>
                <AdminOwners />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/technicians"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <MainLayout>
                <AdminTechnicians />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/stations"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <MainLayout>
                <AdminStations />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/chargers"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <MainLayout>
                <OwnerChargers />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <MainLayout>
                <AdminUsers />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/bookings"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <MainLayout>
                <AdminBookings />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/sessions"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <MainLayout>
                <OwnerSessions />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/payments"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <MainLayout>
                <Payments />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/pricing"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <MainLayout>
                <AdminPricing />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/health"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <MainLayout>
                <AdminSystemHealth />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reviews"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <MainLayout>
                <Reviews />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/complaints"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <MainLayout>
                <Complaints />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/maintenance"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <MainLayout>
                <OwnerMaintenance />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <MainLayout>
                <AdminReports />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <MainLayout>
                <AdminDashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <MainLayout>
                <AdminAuditLogs />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <MainLayout>
                <Settings />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/profile"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <MainLayout>
                <Profile />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* UNIVERSAL ADVANCED SECURITY CENTER (CUSTOMER, OWNER, ADMIN) */}
        <Route
          path="/security"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER", "STATION_OWNER", "ADMIN"]}>
              <MainLayout>
                <SecurityCenter />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/customer/security" element={<Navigate to="/security" replace />} />
        <Route path="/owner/security" element={<Navigate to="/security" replace />} />
        <Route path="/admin/security" element={<Navigate to="/security" replace />} />

        {/* PUBLIC WELCOME / LANDING PAGE & 404 CATCH-ALL */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Universally Accessible Real-Time AI Copilot */}
      <VoltBotChatbot />
    </BrowserRouter>
  );
}

export default App;