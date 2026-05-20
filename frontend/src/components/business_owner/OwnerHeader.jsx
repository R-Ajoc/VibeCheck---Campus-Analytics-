import { LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import UserAvatar from "../UserAvatar";

function OwnerHeader({ business }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new CustomEvent("logout"));
    window.location.href = "/login";
  };

  return (
    <header className="fixed top-0 right-0 left-64 z-30 h-20 bg-white border-b border-gray-100 shadow-sm px-6 md:px-8 flex items-center justify-between">
      {/* LEFT: Business Name and Location */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          {business?.name || "Business"}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {business?.location || "Location"}
        </p>
      </div>

      {/* RIGHT: User Avatar, Name, and Logout */}
      {user && (
        <div className="flex items-center gap-4">
          <UserAvatar firstName={user.firstname} lastName={user.lastname} />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {user.firstname} {user.lastname}
            </p>
            <p className="text-xs text-gray-500">Owner</p>
          </div>
          <button
            onClick={handleLogout}
            className="ml-2 p-2 hover:bg-gray-100 rounded-lg transition text-gray-600 hover:text-gray-900"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      )}
    </header>
  );
}

export default OwnerHeader;
