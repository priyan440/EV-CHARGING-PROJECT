import ProtectedRoute from "./ProtectedRoute";

export default function RoleProtectedRoute({ children, allowedRole }) {
  return (
    <ProtectedRoute allowedRole={allowedRole}>
      {children}
    </ProtectedRoute>
  );
}
