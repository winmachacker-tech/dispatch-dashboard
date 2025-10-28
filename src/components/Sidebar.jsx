import { Link, useLocation } from "react-router-dom";
import { X, LayoutGrid, Truck, Boxes } from "lucide-react";

/**
 * Props:
 *  - open (bool): controls mobile drawer visibility
 *  - onClose (fn): called to close the drawer
 */
export default function Sidebar({ open = false, onClose = () => {} }) {
  const { pathname } = useLocation();

  const nav = [
    { to: "/", label: "Dashboard", icon: LayoutGrid },
    { to: "/loads", label: "Loads", icon: Boxes },
    { to: "/trucks", label: "Trucks", icon: Truck },
  ];

  // Shared sidebar content (used in both desktop and mobile shells)
  const SidebarInner = () => (
    <div className="flex h-full flex-col">
      <nav className="p-3 sm:p-4 space-y-1">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={[
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm",
                "border",
                active
                  ? "bg-neutral-100 dark:bg-neutral-800/60 border-neutral-300 dark:border-neutral-700"
                  : "border-transparent hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40",
              ].join(" ")}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-3 sm:p-4 text-xs text-neutral-500">
        v0.1 • mobile-first
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside
        className="
          hidden lg:flex
          w-64 shrink-0
          border-r border-neutral-200 dark:border-neutral-800
          bg-white dark:bg-neutral-900
          min-h-[calc(100dvh-56px)]
        "
      >
        <SidebarInner />
      </aside>

      {/* Mobile drawer */}
      <div
        className={[
          "lg:hidden",
          "fixed inset-0 z-50",
          open ? "pointer-events-auto" : "pointer-events-none",
        ].join(" ")}
      >
        {/* Backdrop */}
        <div
          className={[
            "absolute inset-0 bg-black/30 transition-opacity",
            open ? "opacity-100" : "opacity-0",
          ].join(" ")}
          onClick={onClose}
        />

        {/* Panel */}
        <div
          className={[
            "absolute left-0 top-0 h-full w-72 max-w-[85%]",
            "bg-white dark:bg-neutral-900",
            "border-r border-neutral-200 dark:border-neutral-800",
            "transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "-translate-x-full",
            "shadow-xl",
          ].join(" ")}
        >
          <div className="flex items-center justify-between p-3 border-b border-neutral-200 dark:border-neutral-800">
            <div className="font-medium">Menu</div>
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-800"
              onClick={onClose}
              aria-label="Close Menu"
            >
              <X size={18} />
            </button>
          </div>
          <SidebarInner />
        </div>
      </div>
    </>
  );
}
