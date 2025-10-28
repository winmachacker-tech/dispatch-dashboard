import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Loader2, CheckCheck } from "lucide-react";

export default function InTransitPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("loads")
        .select("id, created_at, shipper, origin, destination, dispatcher, rate, status, updated_at")
        .eq("status", "IN_TRANSIT")
        .order("created_at", { ascending: false });

      if (!ignore) {
        if (error) console.error(error);
        setRows(data || []);
        setLoading(false);
      }
    }

    load();

    // if you already have a realtime subscription, keep yours
    const sub = supabase
      .channel("loads-in-transit")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "loads" },
        (payload) => {
          setRows((prev) => {
            // remove rows that are no longer IN_TRANSIT, update ones that are
            const next = prev.filter((r) => r.id !== payload.new?.id);
            if (payload.new?.status === "IN_TRANSIT") next.unshift(payload.new);
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      ignore = true;
      supabase.removeChannel(sub);
    };
  }, []);

  async function markAsDelivered(id) {
    try {
      setUpdatingId(id);
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from("loads")
        .update({ status: "DELIVERED", updated_at: nowIso })
        .eq("id", id);
      if (error) throw error;

      // Optimistic: remove from this list immediately
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error(e);
      alert("Could not mark as delivered.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-semibold">In Transit</h2>
      <p className="text-sm text-neutral-500">Auto-updates when statuses change.</p>

      <div className="rounded-2xl border bg-white dark:bg-neutral-900 overflow-hidden">
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800 border-b sticky top-0">
              <tr className="text-left">
                <th className="px-3 py-2 w-[180px]">Created</th>
                <th className="px-3 py-2">Shipper</th>
                <th className="px-3 py-2">Origin</th>
                <th className="px-3 py-2">Destination</th>
                <th className="px-3 py-2">Dispatcher</th>
                <th className="px-3 py-2 text-right">Rate</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 w-[140px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-3 py-4 text-neutral-500" colSpan={8}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-3 py-6 text-neutral-400" colSpan={8}>No loads in transit.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{r.shipper}</td>
                  <td className="px-3 py-2">{r.origin}</td>
                  <td className="px-3 py-2">{r.destination}</td>
                  <td className="px-3 py-2">{r.dispatcher || "—"}</td>
                  <td className="px-3 py-2 text-right">${Number(r.rate).toFixed(2)}</td>
                  <td className="px-3 py-2">{r.status}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => markAsDelivered(r.id)}
                        disabled={updatingId === r.id}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-60"
                        title="Mark as Delivered"
                      >
                        {updatingId === r.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCheck className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">Mark Delivered</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
