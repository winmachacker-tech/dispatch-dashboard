// src/components/Sidebar.jsx
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Truck, Waypoints, Users, Settings } from "lucide-react";

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition
        ${isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"}`
      }
    >
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  return (
    <aside className="hidden md:block w-64 shrink-0 border-r bg-white p-4 sticky top-0 h-screen">
      <div className="mb-6">
        <div className="text-xl font-bold tracking-tight">Dispatch Dashboard</div>
        <div className="text-xs text-gray-500">TMS (Early Build)</div>
      </div>
      <nav className="space-y-1">
        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
        <NavItem to="/loads" icon={Waypoints} label="Loads" />
        <NavItem to="/trucks" icon={Truck} label="Trucks" />
        <NavItem to="/drivers" icon={Users} label="Drivers" />
        <NavItem to="/settings" icon={Settings} label="Settings" />
      </nav>
    </aside>
  );
}
