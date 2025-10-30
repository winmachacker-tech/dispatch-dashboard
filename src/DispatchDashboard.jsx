import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  PackageSearch,
  Route as RouteIcon,
  Truck,
  Users2,
  ClipboardList,
  DollarSign,
  ShieldCheck,
  FileText,
  Settings,
  Bell,
  LifeBuoy,
  Building2,
} from "lucide-react";

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

function useLocalStorage(key, initial) {
  const [val, setVal] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved !== null ? JSON.parse(saved) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }, [key, val]);
  return [val, setVal];
}

function Group({ icon: Icon, label, children, slug, defaultOpen = true, collapsed }) {
  const [open, setOpen] = useLocalStorage(`sb:${slug}:open`, defaultOpen);
  useEffect(() => {
    // when sidebar is collapsed, keep groups visually "closed"
    if (collapsed) setOpen(false);
  }, [collapsed]);
  return (
    <div className="select-none">
      <button
        onClick={() => setOpen(!open)}
        className={cx(
          "w-full flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg",
          "text-neutral-300 hover:text-white hover:bg-neutral-800/70 transition-colors"
        )}
        aria-expanded={open}
      >
        <Icon className="size-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="font-medium">{label}</span>
            <span className="ml-auto opacity-60">{open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</span>
          </>
        )}
      </button>
      {open && !collapsed && <div className="mt-1 space-y-1">{children}</div>}
    </div>
  );
}

function Item({ to, icon: Icon, label, badge, collapsed }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cx(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
          "text-neutral-300 hover:text-white hover:bg-neutral-800/60",
          isActive && "bg-neutral-800 text-white"
        )
      }
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && (
        <>
          <span className="truncate">{label}</span>
          {badge != null && (
            <span className="ml-auto text-[11px] px-1.5 py-0.5 rounded-md bg-neutral-700/70 text-neutral-200">
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const location = useLocation();

  // Example dynamic badges (wire up to state/store as needed)
  const counts = useMemo(
    () => ({
      problem: 3,
      inTransit: 7,
      available: 12,
    }),
    []
  );

  const content = (
    <div className="h-full flex flex-col bg-neutral-950/95 text-neutral-100">
      {/* Top brand / org switcher */}
      <div className={cx("flex items-center gap-2 px-3", collapsed ? "h-14" : "h-16")}>
        <div className="flex items-center gap-2">
          <Building2 className="size-5 text-white" />
          {!collapsed && (
            <div>
              <div className="text-sm font-semibold leading-tight">USKO | Ops</div>
              <div className="text-xs text-neutral-400 leading-tight">Enterprise TMS</div>
            </div>
          )}
        </div>
        <button
          onClick={() => (mobileOpen ? setMobileOpen(false) : setCollapsed(!collapsed))}
          className="ml-auto p-2 rounded-md hover:bg-neutral-800/70"
          aria-label={mobileOpen ? "Close menu" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {/* Quick actions row (desktop) */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <div className="grid grid-cols-3 gap-2">
            <NavLink
              to="/loads/new"
              className="text-xs text-center py-2 rounded-lg bg-neutral-800/70 hover:bg-neutral-800 transition"
              title="Create Load"
            >
              + Load
            </NavLink>
            <NavLink
              to="/drivers/new"
              className="text-xs text-center py-2 rounded-lg bg-neutral-800/70 hover:bg-neutral-800 transition"
              title="Add Driver"
            >
              + Driver
            </NavLink>
            <NavLink
              to="/trucks/new"
              className="text-xs text-center py-2 rounded-lg bg-neutral-800/70 hover:bg-neutral-800 transition"
              title="Add Truck"
            >
              + Truck
            </NavLink>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-2 overflow-y-auto">
        <Item to="/dashboard" icon={LayoutDashboard} label="Dashboard" collapsed={collapsed} />
        <Group icon={PackageSearch} label="Operations" slug="ops" collapsed={collapsed}>
          <Item to="/loads" icon={ClipboardList} label="Loads" badge={counts.available} collapsed={collapsed} />
          <Item to="/intransit" icon={RouteIcon} label="In-Transit" badge={counts.inTransit} collapsed={collapsed} />
          <Item to="/delivered" icon={Truck} label="Delivered" collapsed={collapsed} />
          <Item to="/problems" icon={Bell} label="Problem Board" badge={counts.problem} collapsed={collapsed} />
        </Group>

        <Group icon={Truck} label="Fleet" slug="fleet" collapsed={collapsed}>
          <Item to="/trucks" icon={Truck} label="Trucks" collapsed={collapsed} />
          <Item to="/drivers" icon={Users2} label="Drivers" collapsed={collapsed} />
          <Item to="/assignments" icon={ClipboardList} label="Assignments" collapsed={collapsed} />
          <Item to="/maintenance" icon={WrenchIcon} label="Maintenance" collapsed={collapsed} />
        </Group>

        <Group icon={DollarSign} label="Finance" slug="fin" collapsed={collapsed} defaultOpen={false}>
          <Item to="/billing" icon={DollarSign} label="Billing" collapsed={collapsed} />
          <Item to="/settlements" icon={FileText} label="Settlements" collapsed={collapsed} />
        </Group>

        <Group icon={ShieldCheck} label="Compliance" slug="cmp" collapsed={collapsed} defaultOpen={false}>
          <Item to="/safety" icon={ShieldCheck} label="Safety" collapsed={collapsed} />
          <Item to="/documents" icon={FileText} label="Documents" collapsed={collapsed} />
        </Group>

        <Group icon={Settings} label="Admin" slug="adm" collapsed={collapsed} defaultOpen={false}>
          <Item to="/users" icon={Users2} label="Users" collapsed={collapsed} />
          <Item to="/settings" icon={Settings} label="Settings" collapsed={collapsed} />
          <Item to="/help" icon={LifeBuoy} label="Help Center" collapsed={collapsed} />
        </Group>
      </nav>

      {/* Footer user block */}
      <div className={cx("border-t border-neutral-800/70", collapsed ? "p-2" : "p-3")}>
        <button
          className={cx(
            "w-full flex items-center gap-2 rounded-lg hover:bg-neutral-800/70",
            collapsed ? "p-2" : "p-2.5"
          )}
          title="Account"
        >
          <img
            src="https://api.dicebear.com/9.x/identicon/svg?seed=mark"
            alt="User"
            className="size-7 rounded-md bg-neutral-800"
          />
          {!collapsed && (
            <>
              <div className="text-left">
                <div className="text-sm font-medium leading-tight">Mark T.</div>
                <div className="text-xs text-neutral-400 leading-tight">Lead Ops & Training</div>
              </div>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-md bg-emerald-700/30 text-emerald-200">
                Online
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  // Mobile drawer wrapper
  return (
    <>
      {/* Desktop / md+ */}
      <aside
        className={cx(
          "hidden md:block sticky top-0 h-screen border-r border-neutral-800/70",
          collapsed ? "w-[4.25rem]" : "w-64"
        )}
      >
        {content}
      </aside>

      {/* Mobile drawer */}
      <div
        className={cx(
          "md:hidden fixed inset-0 z-50 transition",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        <div
          className={cx(
            "absolute inset-0 bg-black/50 transition-opacity",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={cx(
            "absolute left-0 top-0 h-full w-72 shadow-2xl border-r border-neutral-800/70",
            "translate-x-0 transition-transform",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {content}
        </aside>
      </div>
    </>
  );
}

/** Small wrench icon inline to avoid another import name collision */
function WrenchIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-4" {...props}>
      <path
        d="M21 7a5 5 0 0 1-6.4 4.8l-6.8 6.8a2 2 0 0 1-2.8-2.8l6.8-6.8A5 5 0 1 1 21 7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
