// src/pages/InTransit.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { RefreshCw, Search, Filter } from "lucide-react";

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d) ? "—" : d.toLocaleDateString();
}
function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d) ? "—" : d.toLocaleString();
}

export default function InTransitPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [carrier, setCarrier] = useState("ALL");

  async function fetchInTransit() {
    setLoading(true);
    try {
      const probe = await supabase.from("loads").select("id,status,updated_at").limit(1);
      const hasStatus = !probe.error && (probe.data?.length === 0 || Object.prototype.hasOwnProperty.call(probe.data?.[0] ?? {}, "status"));
      const hasUpdatedAt = !probe.error && (probe.data?.length === 0 || Object.prototype.hasOwnProperty.call(probe.data?.[0] ?? {}, "updated_at"));

      let q = supabase.from("loads").select("*").limit(500);
      if (hasStatus) q = q.eq("status", "IN_TRANSIT");
      if (hasUpdatedAt) q = q.order("updated_at", { ascending: false });

      const { data, error } = await q;
      if (error) throw error;
      setRows(data || []);
    } catch (err) {
      console.error("[InTransit] select error", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInTransit();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (carrier !== "ALL" && (r.carrier_name || "") !== carrier) return false;
      if (!q) return true;
      const hay = [r.reference, r.customer_name, r.driver_name, r.carrier_name, r.origin_city, r.dest_city]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, carrier]);

  const carriers = useMemo(() => {
    const set = new Set(rows.map((r) => r.carrier_name).filter(Boolean));
    return ["ALL", ...Array.from(set)];
  }, [rows]);

  const chartData = useMemo(() => filtered.slice(0, 30).map((_, i) => ({ idx: i + 1 })), [filtered]);

  return (
    <div className="p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">In-Transit</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-neutral-400" />
            <input
              className="w-64 rounded-xl border bg-transparent pl-8 pr-3 py-2 text-sm"
              placeholder="Search ref/customer/driver/origin/dest…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-neutral-400" />
            <select className="rounded-xl border bg-transparent px-3 py-2 text-sm" value={carrier} onChange={(e) => setCarrier(e.target.value)}>
              {carriers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button onClick={fetchInTransit} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Chart container must have a concrete height */}
      <div className="w-full min-h-[280px] rounded-2xl border p-4">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="idx" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="idx" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border">
        {loading ? (
          <div className="p-6 text-sm text-neutral-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-neutral-500">No in-transit loads.</div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900/40">
              <tr>
                {["Ref", "Customer", "Carrier", "Driver", "Pickup", "Delivery", "Updated"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium text-neutral-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="px-4 py-3">{r.reference || r.id}</td>
                  <td className="px-4 py-3">{r.customer_name || "—"}</td>
                  <td className="px-4 py-3">{r.carrier_name || "—"}</td>
                  <td className="px-4 py-3">{r.driver_name || "—"}</td>
                  <td className="px-4 py-3">{fmtDate(r.pickup_date)}</td>
                  <td className="px-4 py-3">{fmtDate(r.delivery_date)}</td>
                  <td className="px-4 py-3">{fmtDateTime(r.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
