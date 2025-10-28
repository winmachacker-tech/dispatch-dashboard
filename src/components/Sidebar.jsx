// src/components/Sidebar.jsx
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Truck,
  PackageSearch,
  Route as RouteIcon,
  PackageCheck,
  ClipboardList, // ðŸ‘ˆ new icon for Available Loads
} from "lucide-react";

const items = [
  { to: "/", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { to: "/loads", label: "Loads", icon: <PackageSearch size={18} /> },
  { to: "/trucks", label: "Trucks", icon: <Truck size={18} /> },
  { to: "/in-transit", label: "In Transit", icon: <RouteIcon size={18} /> },
  { to: "/delivered", label: "Delivered", icon: <PackageCheck size={18} /> },
  { to: "/available-loads", label: "Available Loads", icon: <ClipboardList size={18} /> }, // âœ… Correct addition
];

export default function Sidebar() {
  const base =
    "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors";
  const active =
    "bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-white";
  const idle =
    "text-neutral-700 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800";

  return (
    <aside className="hidden md:flex md:flex-col md:w-56 shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/80 backdrop-blur-md min-h-screen p-3">
      <div className="px-2 py-3 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
        Navigation
      </div>
      <nav className="flex flex-col gap-1 px-2">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) => `${base} ${isActive ? active : idle}`}
            end={it.to === "/"}
          >
            {it.icon}
            <span>{it.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

