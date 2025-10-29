import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { getLoadsByStatus, subscribeLoads } from "../lib/loads.js";
import { changeStatus } from "../lib/status.js";
import { CheckCheck, Loader2, Search } from "lucide-react";

export default function InTransitPage() {
  const [rows, setRows] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      setLoading(true);
      const data = await getLoadsByStatus("IN_TRANSIT");
      setRows(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const off = subscribeLoads(refresh);
    return () => off();
  }, []);

  async function markDelivered(id) {
    try {
      setBusyId(id);
      await changeStatus(id, "DELIVERED");
      // realtime will refresh and remove it from this tab
    } catch (e) {
      console.error("Failed to set DELIVERED:", e);
    } finally {
      setBusyId(null);
    }
  }

  const filtered = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [r.shipper, r.origin, r.destination, r.dispatcher]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">In Transit Loads</h2>
        <div className="relative w-80 max-w-full">
          <Search size={16} className="absolute left-3 top-2.5 text-neutral-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by shipper, origin or destination"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-neutral-400">
          <Loader2 className="animate-spin" size={16} /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-neutral-400 text-sm">No in-transit loads found</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900/60 text-neutral-400">
              <tr>
                <th className="text-left p-3">SHIPPER</th>
                <th className="text-left p-3">ROUTE</th>
                <th className="text-left p-3">DISPATCHER</th>
                <th className="text-left p-3">RATE</th>
                <th className="text-left p-3">STATUS</th>
                <th className="text-right p-3">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-neutral-900/40">
                  <td className="p-3">{r.shipper ?? "—"}</td>
                  <td className="p-3">{r.origin} → {r.destination}</td>
                  <td className="p-3">{r.dispatcher ?? "—"}</td>
                  <td className="p-3">{r.rate ? `$${r.rate}` : "—"}</td>
                  <td className="p-3">IN_TRANSIT</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => markDelivered(r.id)}
                      disabled={busyId === r.id}
                      className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg"
                    >
                      {busyId === r.id ? <Loader2 className="animate-spin" size={16} /> : <CheckCheck size={16} />}
                      Mark Delivered
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
