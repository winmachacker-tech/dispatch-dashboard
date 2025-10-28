// src/pages/inTransit.jsx
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { Loader2, CheckCheck, AlertTriangle } from "lucide-react";

function StatusBadge({ status }) {
  const styles =
    {
      PLANNED: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      IN_TRANSIT: "bg-sky-500/15 text-sky-300 border-sky-500/30",
      DELIVERED: "bg-violet-500/15 text-violet-300 border-violet-500/30",
      CANCELLED: "bg-neutral-500/15 text-neutral-300 border-neutral-500/30",
      PROBLEM: "bg-red-500/15 text-red-300 border-red-500/30",
    }[status] || "bg-neutral-700/30 text-neutral-300 border-neutral-600/30";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs border ${styles}`}>
      {status}
    </span>
  );
}

export default function InTransitPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState(null);

  async function fetchRows() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("loads")
      .select("id, created_at, shipper, origin, destination, dispatcher, rate, status")
      .eq("status", "IN_TRANSIT")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchRows();
  }, []);

  async function markDelivered(id) {
    setUpdatingId(id);
    const { error } = await supabase.from("loads").update({ status: "DELIVERED" }).eq("id", id);
    if (!error) {
      setRows((prev) => prev.filter((r) => r.id !== id)); // disappears from this list
    }
    setUpdatingId(null);
  }

  async function flagProblem(id) {
    setUpdatingId(id);
    const { error } = await supabase.from("loads").update({ status: "PROBLEM" }).eq("id", id);
    if (!error) {
      setRows((prev) => prev.filter((r) => r.id !== id));
    }
    setUpdatingId(null);
  }

  const totalRate = useMemo(() => rows.reduce((sum, r) => sum + (Number(r.rate) || 0), 0), [rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">In Transit</h2>
        <button
          onClick={fetchRows}
          className="px-3 py-1.5 text-sm rounded-lg border border-neutral-700/30 bg-neutral-800 hover:bg-neutral-700"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-400 border border-red-500/30 bg-red-500/10 p-3 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-neutral-300">
          <Loader2 className="animate-spin h-4 w-4" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="text-neutral-400">No loads currently in transit.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-900/60">
              <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
                <th>Shipper</th>
                <th>Origin → Destination</th>
                <th>Dispatcher</th>
                <th>Rate</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {rows.map((r) => (
                <tr key={r.id} className="[&>td]:px-3 [&>td]:py-2">
                  <td className="font-medium">{r.shipper || "—"}</td>
                  <td className="text-neutral-300">
                    {r.origin || "—"} <span className="text-neutral-500">→</span> {r.destination || "—"}
                  </td>
                  <td>{r.dispatcher || "—"}</td>
                  <td>${Number(r.rate || 0).toLocaleString()}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => markDelivered(r.id)}
                        disabled={updatingId === r.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-violet-500/30 hover:bg-violet-500/10 disabled:opacity-60"
                        title="Mark Delivered"
                      >
                        <CheckCheck className="h-4 w-4" />
                        Delivered
                      </button>
                      <button
                        onClick={() => flagProblem(r.id)}
                        disabled={updatingId === r.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-amber-500/30 hover:bg-amber-500/10 disabled:opacity-60"
                        title="Flag Problem"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        Problem
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="bg-neutral-900/40 font-medium">
                <td colSpan={3} className="text-right pr-3">Total:</td>
                <td>${totalRate.toLocaleString()}</td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
