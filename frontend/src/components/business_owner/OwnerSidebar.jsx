import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  TrendingUp,
  UserCog,
} from "lucide-react";
import vibecheck_logo from "../../assets/vibecheck_logo.png";

function OwnerSidebar({ business }) {
  const navItems = [
    {
      to: "/business/dashboard",
      label: "Dashboard",
      Icon: LayoutDashboard,
    },
    {
      to: "/business/reviews",
      label: "Customer Reviews",
      Icon: MessageSquare,
    },
    {
      to: "/business/analytics",
      label: "Analytics & Insights",
      Icon: BarChart3,
    },
    {
      to: "/business/profile-management",
      label: "Profile Management",
      Icon: UserCog,
    },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col h-screen overflow-y-auto">
      {/* LOGO SECTION */}
      <div className="px-6 py-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <img src={vibecheck_logo} alt="VibeCheck" className="w-8 h-8" />
          <span className="text-lg font-bold text-[#004687]">VibeCheck</span>
        </div>
      </div>

      {/* NAVIGATION SECTION */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? "bg-[#004687] text-white"
                  : "text-gray-700 hover:bg-gray-50"
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-sm font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* FOOTER SECTION */}
      <div className="px-6 py-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">
          © 2024 VibeCheck
        </p>
      </div>
    </aside>
  );
}

export default OwnerSidebar;