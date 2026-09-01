import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, role, currentUser } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    if (location.pathname.startsWith("/admin")) {
      return <Navigate to="/admin/login" replace state={{ from: location }} />;
    }
    if (location.pathname.startsWith("/owner")) {
      return <Navigate to="/owner/login" replace state={{ from: location }} />;
    }
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Check if role is allowed
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // Redirect to default home page based on user role
    if (role === "ADMIN") return <Navigate to="/admin/dashboard" replace />;
    if (role === "STATION_OWNER") return <Navigate to="/owner/dashboard" replace />;
    return <Navigate to="/customer/dashboard" replace />;
  }

  return children;
}