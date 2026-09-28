import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleProtectedRoute from "./components/RoleProtectedRoute";
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

// Station Owner Pages
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import OwnerStations from "./pages/owner/OwnerStations";
import OwnerChargers from "./pages/owner/OwnerChargers";
import OwnerBookings from "./pages/owner/OwnerBookings";
import OwnerSessions from "./pages/owner/OwnerSessions";
import OwnerRevenue from "./pages/owner/OwnerRevenue";
import OwnerMaintenance from "./pages/owner/OwnerMaintenance";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOwners from "./pages/admin/AdminOwners";
import AdminStations from "./pages/admin/AdminStations";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import AdminReports from "./pages/admin/AdminReports";
import AdminSystemHealth from "./pages/admin/AdminSystemHealth";

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

import "./App.css";

/**
 * Root Route Redirection:
 * Authenticated -> Directs automatically to user's permitted dashboard
 * Unauthenticated -> Directs strictly to /login
 */
function RootRedirect() {
  const { isAuthenticated, role, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const r = (role || "").toUpperCase();
  if (r === "ADMIN") return <Navigate to="/admin/dashboard" replace />;
  if (r === "STATION_OWNER" || r === "OWNER") return <Navigate to="/owner/dashboard" replace />;
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
        <Route path="/customer/auth" element={<Navigate to="/login" replace />} />
        <Route path="/owner/auth" element={<Navigate to="/login" replace />} />
        <Route path="/admin/auth" element={<Navigate to="/login" replace />} />
        <Route path="/owner/register" element={<Navigate to="/register" replace />} />

        {/* CUSTOMER PROTECTED ROUTES */}
        <Route
          path="/customer/dashboard"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <MainLayout>
                <CustomerDashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/stations"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <MainLayout>
                <FindStations />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/map"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <MainLayout>
                <EVMapPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/map"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <MainLayout>
                <EVMapPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ev-map"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <MainLayout>
                <EVMapPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/stations/:id"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <MainLayout>
                <StationDetails />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/book"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <MainLayout>
                <Booking />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/booking"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <MainLayout>
                <Booking />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/find-stations"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <MainLayout>
                <FindStations />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/bookings"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <MainLayout>
                <MyBookings />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/live-charging"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <MainLayout>
                <LiveCharging />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/history"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <MainLayout>
                <ChargingHistory />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/payments"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <MainLayout>
                <Payments />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/vehicles"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <MainLayout>
                <Vehicles />
              </MainLayout>
            </ProtectedRoute>
          }
        />
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
        <Route
          path="/customer/profile"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <MainLayout>
                <Profile />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/settings"
          element={
            <ProtectedRoute allowedRoles={["CUSTOMER"]}>
              <MainLayout>
                <Settings />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* ALIAS CUSTOMER ROUTES FOR BACKWARD COMPATIBILITY */}
        <Route path="/dashboard" element={<Navigate to="/customer/dashboard" replace />} />
        <Route path="/stations" element={<Navigate to="/customer/stations" replace />} />
        <Route path="/booking" element={<Navigate to="/customer/book" replace />} />
        <Route path="/my-bookings" element={<Navigate to="/customer/bookings" replace />} />
        <Route path="/charging-history" element={<Navigate to="/customer/history" replace />} />
        <Route path="/payments" element={<Navigate to="/customer/payments" replace />} />
        <Route path="/profile" element={<Navigate to="/customer/profile" replace />} />
        <Route path="/settings" element={<Navigate to="/customer/settings" replace />} />

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
            <ProtectedRoute allowedRoles={["STATION_OWNER"]}>
              <MainLayout>
                <OwnerDashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/stations"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER"]}>
              <MainLayout>
                <OwnerStations />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/chargers"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER"]}>
              <MainLayout>
                <OwnerChargers />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/bookings"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER"]}>
              <MainLayout>
                <OwnerBookings />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/sessions"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER"]}>
              <MainLayout>
                <OwnerSessions />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/revenue"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER"]}>
              <MainLayout>
                <OwnerRevenue />
              </MainLayout>
            </ProtectedRoute>
          }
        />
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
            <ProtectedRoute allowedRoles={["STATION_OWNER", "ADMIN"]}>
              <MainLayout>
                <OwnerScanner />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/session/:bookingId"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER", "ADMIN", "CUSTOMER"]}>
              <MainLayout>
                <LiveChargingSession />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/maintenance"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER"]}>
              <MainLayout>
                <OwnerMaintenance />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/reviews"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER"]}>
              <MainLayout>
                <Reviews />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/profile"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER"]}>
              <MainLayout>
                <Profile />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/settings"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER"]}>
              <MainLayout>
                <Settings />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* INNOVATIVE FEATURES: STATION OWNER AI ROUTES */}
        <Route
          path="/owner/ai-dashboard"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER"]}>
              <MainLayout>
                <OwnerAIDashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/demand-forecast"
          element={
            <ProtectedRoute allowedRoles={["STATION_OWNER"]}>
              <MainLayout>
                <OwnerDemandForecast />
              </MainLayout>
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
                <OwnerBookings />
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
        <Route path="/" element={<Welcome />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Universally Accessible Real-Time AI Copilot */}
      <VoltBotChatbot />
    </BrowserRouter>
  );
}

export default App;