// src/pages/intransit.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import StatusBadge from "../components/StatusBadge";


export default function InTransitPage() {
const [rows, setRows] = useState([]);


async function fetchRows() {
const { data } = await supabase
.from("loads")
.select("id, shipper, origin, destination, dispatcher, status, pickup_date, delivery_date")
.eq("status", "IN_TRANSIT")
.order("pickup_date", { ascending: true });
setRows(data || []);
}


useEffect(() => {
fetchRows();
const ch = supabase
.channel("rt-intransit")
.on('postgres_changes', { event: '*', schema: 'public', table: 'loads' }, fetchRows)
.subscribe();
return () => supabase.removeChannel(ch);
}, []);


return (
<div className="space-y-4">
<h1 className="text-2xl font-semibold tracking-tight">In Transit</h1>
<div className="rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden">
<table className="w-full text-sm">
<thead className="bg-neutral-100/60 dark:bg-neutral-900/60">
<tr>
<Th>Shipper</Th><Th>Leg</Th><Th>Dispatcher</Th><Th>Pickup</Th><Th>Delivery</Th><Th>Status</Th>
</tr>
</thead>
<tbody>
{rows.map((r) => (
<tr key={r.id} className="border-t border-neutral-200/60 dark:border-neutral-800/60">
<Td>{r.shipper}</Td>
<Td>{r.origin} → {r.destination}</Td>
<Td>{r.dispatcher || '—'}</Td>
<Td>{r.pickup_date || '—'}</Td>
<Td>{r.delivery_date || '—'}</Td>
<Td><StatusBadge status={r.status} /></Td>
</tr>
))}
{!rows.length && (
<tr><td colSpan={6} className="text-center py-8 text-neutral-500">No loads in transit.</td></tr>
)}
</tbody>
</table>
</div>
</div>
);
}


function Th({ children }) { return <th className="text-left px-3 py-2 font-medium">{children}</th>; }
function Td({ children }) { return <td className="px-3 py-2">{children}</td>; }