import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Truck,
  Loader2,
  CheckCheck,
  Search,
  ChevronDown,
  MapPin,
  ArrowRight,
} from "lucide-react";

function StatusBadge({ status }) {
  const styles =
    {
      IN_TRANSIT: "bg-sky-500/15 text-sky-300 border-sky-500/30",
      PROBLEM: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      DELIVERED: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    }[status] || "bg-neutral-700/30 text-neutral-300 border-neutral-600/30";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs border ${styles}`}
    >
      {status}
    </span>
  );
}

export default function InTransitPage() {
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchLoads() {
      setLoading(true);
      const { data, error } = await supabase
        .from("loads")
        .select("id, shipper, origin, destination, dispatcher, rate, status, created_at")
        .eq("status", "IN_TRANSIT")
        .order("created_at", { ascending: false });

      if (error) console.error("Supabase fetch error:", error.message);
      setLoads(data || []);
      setLoading(false);
    }
    fetchLoads();
  }, []);

  async function markDelivered(id) {
    setUpdatingId(id);
    const { error } = await supabase
      .from("loads")
      .update({ status: "DELIVERED" })
      .eq("id", id);

    if (error) console.error("Update error:", error.message);
    else setLoads((prev) => prev.filter((l) => l.id !== id));

    setUpdatingId(null);
  }

  const filtered = loads.filter(
    (l) =>
      l.shipper?.toLowerCase().includes(search.toLowerCase()) ||
      l.origin?.toLowerCase().includes(search.toLowerCase()) ||
      l.destination?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Truck className="w-5 h-5 text-sky-400" />
          In Transit Loads
        </h1>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search by shipper, origin, or destination"
            className="pl-8 pr-3 py-2 text-sm bg-neutral-900 border border-neutral-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900/70 border-b border-neutral-800">
            <tr className="text-left text-neutral-400">
              <th className="px-4 py-3 font-medium">Shipper</th>
              <th className="px-4 py-3 font-medium">Route</th>
              <th className="px-4 py-3 font-medium">Dispatcher</th>
              <th className="px-4 py-3 font-medium">Rate</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-neutral-400">
                  <Loader2 className="w-5 h-5 mx-auto animate-spin" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-neutral-400">
                  No in-transit loads found
                </td>
              </tr>
            ) : (
              filtered.map((l) => (
                <tr
                  key={l.id}
                  className="border-t border-neutral-800 hover:bg-neutral-900/50 transition-colors"
                >
                  <td className="px-4 py-3">{l.shipper || "—"}</td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-neutral-500" />
                    <span>{l.origin}</span>
                    <ArrowRight className="w-4 h-4 text-neutral-500" />
                    <span>{l.destination}</span>
                  </td>
                  <td className="px-4 py-3">{l.dispatcher || "—"}</td>
                  <td className="px-4 py-3">${l.rate || "0"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={l.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      disabled={updatingId === l.id}
                      onClick={() => markDelivered(l.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded-lg border-violet-500/30 text-violet-300 hover:bg-violet-500/10 transition"
                    >
                      {updatingId === l.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <CheckCheck className="w-3.5 h-3.5" />
                          Mark Delivered
                        </>
                      )}
                    </button>
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
