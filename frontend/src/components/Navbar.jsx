import { Link, useLocation } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";

import Login from "./icons/Login";
import Logout from "./icons/Logout";
import UserAvatar from "./UserAvatar";
import vibecheck_logo from '../assets/vibecheck_logo.png';
import { Home } from "lucide-react";

function Navbar() {
  const location = useLocation();
  const { user, setUser, setBusiness } = useAuth();
  const isAuthenticated = !!user;
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const isLoginPage = location.pathname === "/login";
  const isHomePage = location.pathname === "/";

  const navLinkClass = (isActive) =>
    [
      "relative flex items-center gap-2 font-normal transition group pb-1",
      isActive ? "text-[#004687]" : "text-gray-600 hover:text-[#004687]",
      "after:content-[''] after:absolute after:left-0 after:-bottom-0.5 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-[#004687] after:transition-transform after:duration-200",
      isActive ? "after:scale-x-100" : "group-hover:after:scale-x-100",
    ].join(" ");

  return (
    <>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 w-full flex items-center justify-between px-6 md:px-12 py-4 bg-white border-b border-gray-100 shadow-sm z-50">
        {/* LEFT: Brand - route to admin when authenticated to avoid showing public landing to signed-in users */}
        <Link to={isAuthenticated ? "/admin" : "/"} className="flex items-center gap-2 text-2xl font-bold text-[#004687] hover:opacity-80 transition">
          <img src={vibecheck_logo} alt="VibeCheck Logo" className="w-9 h-9" />
          VibeCheck
        </Link>

        {/* MIDDLE: Navigation Links */}
        <div className="hidden md:flex gap-10 items-center">
          {!isAuthenticated && (
            <Link to="/" className={navLinkClass(isHomePage)}>
              <Home className="w-5 h-5 group-hover:text-[#004687]" />
              Home
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" className={navLinkClass(location.pathname === "/admin")}>
              Admin Dashboard
            </Link>
          )}
        </div>

        {/* RIGHT: Auth Links */}
        <div className="flex gap-3 items-center">
          {!isAuthenticated && !isLoginPage && (
            <Link
              to="/login"
              className="px-5 py-2 text-sm font-medium text-[#004687] border border-[#004687] rounded hover:bg-[#f0f7ff] transition group flex items-center gap-2"
            >
              <Login className="w-4 h-4" />
              Login
            </Link>
          )}

          {isAuthenticated && user && (
            <div className="flex items-center gap-3">
              <UserAvatar firstName={user.firstname} lastName={user.lastname} />
              <span className="text-sm font-medium text-gray-900">
                {user.lastname}, {user.firstname}
              </span>
              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("user");
                  setUser(null);
                  setBusiness(null);
                  window.dispatchEvent(new CustomEvent('logout'));
                  window.location.href = "/login";
                }}
                className="px-5 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 hover:border-gray-400 transition group flex items-center gap-2"
              >
                <Logout className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Spacer to prevent content overlap */}
      <div className="h-16" />
    </>
  );
}

export default Navbar;