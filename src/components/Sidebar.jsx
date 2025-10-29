// src/components/Sidebar.jsx
import { NavLink } from "react-router-dom";


const nav = [
{ to: "/", label: "Dashboard" },
{ to: "/loads", label: "Loads" },
{ to: "/intransit", label: "In Transit" },
{ to: "/delivered", label: "Delivered" },
{ to: "/available", label: "Available" },
{ to: "/drivers", label: "Drivers" },
{ to: "/trucks", label: "Trucks" },
];


export default function Sidebar() {
return (
<aside className="w-56 min-h-screen border-r border-neutral-200/60 dark:border-neutral-800/60 p-4">
<div className="font-semibold tracking-tight mb-4">Dispatch Dashboard</div>
<nav className="space-y-1">
{nav.map((n) => (
<NavLink
key={n.to}
to={n.to}
className={({ isActive }) =>
`block rounded-lg px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900 ${
isActive ? "bg-neutral-100 dark:bg-neutral-900" : ""
}`
}
>
{n.label}
</NavLink>
))}
</nav>
</aside>
);
}