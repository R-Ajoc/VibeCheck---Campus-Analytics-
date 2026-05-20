import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import AdminDashboard from "./pages/AdminDashboard";
import ImportConfessions from "./pages/admin/ImportConfessions";
import AnalyticsDashboard from "./pages/admin/AnalyticsDashboard";
import Navbar from "./components/Navbar.jsx";
import RoleProtectedRoute from "./components/security/RoleProtectedRoute.jsx";
import GuestRoute from "./components/security/GuestRoute.jsx";
import NotFound from "./pages/NotFound";
import ServerError from "./pages/ServerError";


function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    const targetId = location.hash.replace("#", "");

    if (!targetId) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }

    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.pathname, location.hash]);

  return null;
}

function App() {
  return (
    <>
      <ScrollManager />
      <Navbar />

      <Routes>
        {/* Error pages - checked first, bypass all protection */}
        <Route path="/500" element={<ServerError />} />

        <Route 
          path="/" element={
           <RoleProtectedRoute notAllowedRoles={["owner"]} requireAuth={false}>
              <Home />
            </RoleProtectedRoute>
          } />

        <Route
          path="/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />

        <Route path="/register" element={<RoleProtectedRoute allowedRoles={["admin", "superadmin"]}><Register /></RoleProtectedRoute>} />

        <Route path="/admin" element={<RoleProtectedRoute allowedRoles={["admin", "superadmin"]}><AdminDashboard /></RoleProtectedRoute>} />
        <Route path="/admin/import" element={<RoleProtectedRoute allowedRoles={["admin", "superadmin"]}><ImportConfessions /></RoleProtectedRoute>} />
        <Route path="/admin/analytics" element={<RoleProtectedRoute allowedRoles={["admin", "superadmin"]}><AnalyticsDashboard /></RoleProtectedRoute>} />

        {/* Catch-all route for 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>



    </>
  );
}

export default App;