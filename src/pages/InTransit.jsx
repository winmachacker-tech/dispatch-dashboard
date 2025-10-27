import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Loader2 } from "lucide-react";

export default function InTransit() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // initial load
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("loads")
        .select("*")
        .eq("status", "IN_TRANSIT")
        .order("created_at", { ascending: false });
      if (!error) setRows(data || []);
      setLoading(false);
    })();
  }, []);

  // realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("rt-in-transit")
      // new rows created already in transit
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "loads", filter: "status=eq.IN_TRANSIT" },
        (payload) => {
          setRows((cur) => [payload.new, ...cur.filter((r) => r.id !== payload.new.id)]);
        }
      )
      // status changed to IN_TRANSIT
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "loads" },
        (payload) => {
          const was = payload.old.status;
          const now = payload.new.status;

          // moved into IN_TRANSIT → add/update
          if (now === "IN_TRANSIT" && was !== "IN_TRANSIT") {
            setRows((cur) => [payload.new, ...cur.filter((r) => r.id !== payload.new.id)]);
          }
          // moved out of IN_TRANSIT → remove
          if (was === "IN_TRANSIT" && now !== "IN_TRANSIT") {
            setRows((cur) => cur.filter((r) => r.id !== payload.new.id));
          }
        }
      )
      // deletes
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "loads" },
        (payload) => {
          setRows((cur) => cur.filter((r) => r.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading)
    return (
      <div className="p-6 text-neutral-400 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading In-Transit Loads…
      </div>
    );

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-2">In Transit</h1>
      <p className="text-sm text-neutral-500 mb-4">Auto-updates when statuses change.</p>

      {rows.length === 0 ? (
        <div className="text-neutral-400">No loads currently in transit.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-700/40">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-900/60 text-neutral-300">
              <tr>
                <th className="px-4 py-2 text-left">Created</th>
                <th className="px-4 py-2 text-left">Shipper</th>
                <th className="px-4 py-2 text-left">Origin</th>
                <th className="px-4 py-2 text-left">Destination</th>
                <th className="px-4 py-2 text-left">Dispatcher</th>
                <th className="px-4 py-2 text-left">Rate</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {rows.map((l) => (
                <tr key={l.id} className="hover:bg-neutral-800/40">
                  <td className="px-4 py-2">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2">{l.shipper}</td>
                  <td className="px-4 py-2">{l.origin}</td>
                  <td className="px-4 py-2">{l.destination}</td>
                  <td className="px-4 py-2">{l.dispatcher ?? "—"}</td>
                  <td className="px-4 py-2">${Number(l.rate || 0).toLocaleString()}</td>
                  <td className="px-4 py-2 font-semibold text-amber-400">{l.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
