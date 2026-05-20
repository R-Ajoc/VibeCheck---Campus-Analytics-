import { Navigate } from "react-router-dom";

function RoleProtectedRoute({ children, allowedRoles, notAllowedRoles, requireAuth = true }) {
  const token = localStorage.getItem("token");
  let user = null;
  try { user = JSON.parse(localStorage.getItem("user")); } catch {}

  if (!token && requireAuth) {
    return <Navigate to="/login" replace />;
  }

  const role = user?.role;
  const fallback = "/";

  if (role && notAllowedRoles?.includes(role)) {
    return <Navigate to={fallback} replace />;
  }

  if (role && allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={fallback} replace />;
  }

  return children;
}

export default RoleProtectedRoute;