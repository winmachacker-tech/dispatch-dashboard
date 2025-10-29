// src/components/StatusBadge.jsx
const styles = {
AVAILABLE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
IN_TRANSIT: "bg-sky-500/15 text-sky-300 border-sky-500/30",
DELIVERED: "bg-neutral-500/15 text-neutral-300 border-neutral-500/30",
CANCELLED: "bg-red-500/15 text-red-300 border-red-500/30",
};


export default function StatusBadge({ status }) {
const cls = styles[status] || "bg-neutral-500/15 text-neutral-300 border-neutral-500/30";
return (
<span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${cls}`}>
{status?.replaceAll("_", " ")}
</span>
);
}