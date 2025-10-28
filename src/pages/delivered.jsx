// src/pages/delivered.jsx
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Loader2, RefreshCcw } from "lucide-react";

function StatusBadge({ status }) {
  const styles =
    {
      DELIVERED: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    }[status] || "bg-neutral-700/30 text-neutral-300 border-neutral-600/30";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs border ${styles}`}>
      {status}
    </span>
  );
}

export default function DeliveredPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchDelivered() {
    setLoading(true);
    const { data, error } = await supabase
      .from("loads")
      // keep columns conservative so we don't hit missing-column errors
      .select("id, created_at, shipper, origin, destination, dispatcher, rate, status")
      .eq("status", "DELIVERED")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error (delivered):", error);
      setRows([]);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchDelivered();
  }, []);

  const totalDelivered = useMemo(() => rows.length, [rows]);
  const totalRevenue = useMemo(
    () => rows.reduce((sum, r) => sum + (Number(r.rate) || 0), 0),
    [rows]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Delivered Loads</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Showing loads where status = <span className="font-mono">DELIVERED</span>
          </p>
        </div>
        <button
          onClick={fetchDelivered}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <RefreshCcw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4">
          <div className="text-sm text-neutral-500 dark:text-neutral-400">Total Delivered</div>
          <div className="text-2xl font-semibold mt-1">{totalDelivered}</div>
        </div>
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4">
          <div className="text-sm text-neutral-500 dark:text-neutral-400">Total Revenue</div>
          <div className="text-2xl font-semibold mt-1">
            ${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900/60">
            <tr className="text-left">
              <th className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">Load ID</th>
              <th className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">Created</th>
              <th className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">Shipper</th>
              <th className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">Origin → Destination</th>
              <th className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">Dispatcher</th>
              <th className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">Rate</th>
              <th className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6" colSpan={7}>
                  <div className="flex items-center gap-2 text-neutral-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading delivered loads…
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6" colSpan={7}>
                  <div className="text-neutral-500">No delivered loads yet.</div>
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50/70 dark:hover:bg-neutral-900/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/loads/${r.id}`}
                      className="text-sky-600 dark:text-sky-400 hover:underline font-medium"
                    >
                      {r.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">{r.shipper || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="truncate max-w-[28ch]">
                      {r.origin || "—"} <span className="opacity-60">→</span> {r.destination || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">{r.dispatcher || "—"}</td>
                  <td className="px-4 py-3">${Number(r.rate || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
