import { NavLink } from "react-router-dom";
import {
  DashboardIcon,
  ReviewsIcon,
  EditProfileIcon,
} from "../../components/icons/SidebarIcons";

function OwnerSidebar({ business }) {
  const linkBase =
    "flex items-center gap-3 px-4 py-2 rounded-lg transition";

  return (
    <div className="w-80 bg-white shadow-lg p-6 overflow-y-auto">
      {/* Business Info */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {business?.name || "Business"}
        </h2>
        <p className="text-gray-600">
          {business?.location || "Location"}
        </p>
        <p className="text-gray-500 text-sm mt-1">
          {business?.short_description || "Description"}
        </p>
      </div>

      {/* Navigation */}
      <nav className="space-y-2">

        {/* Dashboard */}
        <NavLink
          to="/business/dashboard"
          className={({ isActive }) =>
            `${linkBase} ${
              isActive
                ? "bg-[#004687] text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`
          }
        >
          <DashboardIcon className="w-5 h-5" />
          <span>Dashboard</span>
        </NavLink>

        {/* Profile Management */}
        <NavLink
          to="/business/profile-management"
          className={({ isActive }) =>
            `${linkBase} ${
              isActive
                ? "bg-[#004687] text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`
          }
        >
          <EditProfileIcon className="w-5 h-5" />
          <span>Profile Management</span>
        </NavLink>

        {/* Reviews */}
        <NavLink
          to="/business/reviews"
          className={({ isActive }) =>
            `${linkBase} ${
              isActive
                ? "bg-[#004687] text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`
          }
        >
          <ReviewsIcon className="w-5 h-5" />
          <span>Reviews</span>
        </NavLink>

      </nav>
    </div>
  );
}

export default OwnerSidebar;