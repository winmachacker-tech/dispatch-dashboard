// src/pages/delivered.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Loader2 } from "lucide-react";

export default function DeliveredPage() {
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDeliveredLoads() {
      setLoading(true);
      const { data, error } = await supabase
        .from("loads")
        .select("*")
        .eq("status", "DELIVERED")
        .order("created_at", { ascending: false });

      if (error) console.error("Error fetching delivered loads:", error);
      else setLoads(data);
      setLoading(false);
    }

    fetchDeliveredLoads();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center py-10 text-neutral-400">
        <Loader2 className="animate-spin w-5 h-5 mr-2" />
        Loading delivered loads...
      </div>
    );

  if (!loads.length)
    return (
      <div className="text-center text-neutral-500 py-10">
        No delivered loads found.
      </div>
    );

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Delivered Loads</h2>
      <div className="overflow-x-auto border border-neutral-800/20 rounded-xl">
        <table className="min-w-full divide-y divide-neutral-800/30">
          <thead className="bg-neutral-900/70">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium">ID</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Shipper</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Origin</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Destination</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Rate ($)</th>
              <th className="px-4 py-2 text-left text-sm font-medium">Delivered Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/20">
            {loads.map((load) => (
              <tr key={load.id} className="hover:bg-neutral-900/40 transition">
                <td className="px-4 py-2 text-sm">{load.id}</td>
                <td className="px-4 py-2 text-sm">{load.shipper || "—"}</td>
                <td className="px-4 py-2 text-sm">{load.origin}</td>
                <td className="px-4 py-2 text-sm">{load.destination}</td>
                <td className="px-4 py-2 text-sm">{load.rate}</td>
                <td className="px-4 py-2 text-sm">
                  {new Date(load.updated_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
