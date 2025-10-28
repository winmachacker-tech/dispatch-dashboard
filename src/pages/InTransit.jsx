// src/pages/inTransit.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Loader2,
  Search,
  Truck,
  CheckCheck,
  AlertTriangle,
  Pencil,
  Trash2,
} from "lucide-react";
import { setLoadStatus } from "../lib/setStatus";

const STATUSES = {
  PLANNED: "PLANNED",
  AVAILABLE: "AVAILABLE",
  IN_TRANSIT: "IN_TRANSIT",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
  PROBLEM: "PROBLEM",
};

function cn(...c) {
  return c.filter(Boolean).join(" ");
}
function toUSD(n) {
  const num = Number(n) || 0;
  return num.toLocaleString(undefined, { style: "currency", currency: "USD" });
}
function Input(props) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-lg border border-neutral-700 bg-neutral-900/60 px-3 text-sm text-neutral-100 placeholder-neutral-400 outline-none focus:border-neutral-500",
        props.className
      )}
    />
  );
}
function Button({ className = "", disabled, ...props }) {
  return (
    <button
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900/40 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800/80 disabled:opacity-60 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  );
}
function StatusBadge({ status }) {
  const map = {
    [STATUSES.AVAILABLE]: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    [STATUSES.IN_TRANSIT]: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    [STATUSES.PROBLEM]: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    [STATUSES.DELIVERED]: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    [STATUSES.CANCELLED]: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    [STATUSES.PLANNED]: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  };
  const styles = map[status] || "bg-neutral-700/30 text-neutral-300 border-neutral-600/30";
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-lg text-xs border", styles)}>
      {status}
    </span>
  );
}

export default function InTransitPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [search, setSearch] = useState("");
  const mounted = useRef(false);

  async function fetchData() {
    setLoading(true);

    // NOTE: read from the view we created
    const { data, error } = await supabase
      .from("loads_in_transit")
      .select(
        "id, shipper, origin, destination, dispatcher, rate, status, created_at, notes"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("inTransit fetch error:", error);
      setRows([]);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    fetchData();

    // Ensure Realtime is enabled for the "public" schema/table in Supabase:
    // Database → Replication → Realtime → enable for public.loads
    const channel = supabase
      .channel("loads-in-transit-watch")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "loads" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function updateStatus(row, status) {
    try {
      setUpdating(row.id);
      const updated = await setLoadStatus(row.id, status);

      // If it left IN_TRANSIT, remove from this page immediately
      if (status !== STATUSES.IN_TRANSIT) {
        setRows((prev) => prev.filter((r) => r.id !== row.id));
      } else {
        setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
      }
    } catch (e) {
      // error is already logged in helper
    } finally {
      setUpdating(null);
    }
  }

  async function handleDelete(row) {
    if (!confirm("Delete this load?")) return;
    const { error } = await supabase.from("loads").delete().eq("id", row.id);
    if (error) {
      console.error("delete error:", error);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.shipper?.toLowerCase().includes(s) ||
        r.origin?.toLowerCase().includes(s) ||
        r.destination?.toLowerCase().includes(s) ||
        r.dispatcher?.toLowerCase().includes(s) ||
        r.id?.toLowerCase().includes(s)
    );
  }, [rows, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Truck className="h-6 w-6" /> In Transit Loads
        </h1>
        <div className="relative w-80">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
          <Input
            placeholder="Search by shipper, origin or destination"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-800">
        <div className="grid grid-cols-12 bg-neutral-900/60 px-4 py-3 text-xs uppercase tracking-wide text-neutral-400">
          <div className="col-span-3">Shipper</div>
          <div className="col-span-3">Route</div>
          <div className="col-span-2">Dispatcher</div>
          <div className="col-span-1">Rate</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-2 text-right">Action</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-neutral-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading in-transit loads…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-neutral-400">No in-transit loads found</div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {filtered.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-12 items-center px-4 py-3 text-sm hover:bg-neutral-900/50"
              >
                <div className="col-span-3 truncate">
                  <div className="font-medium text-neutral-100">{row.shipper || "—"}</div>
                  <div className="text-xs text-neutral-400 font-mono">{row.id}</div>
                </div>

                <div className="col-span-3 truncate text-neutral-200">
                  {row.origin || "—"} <span className="text-neutral-500">→</span>{" "}
                  {row.destination || "—"}
                </div>

                <div className="col-span-2 truncate">{row.dispatcher || "—"}</div>

                <div className="col-span-1">{row.rate != null ? toUSD(row.rate) : "—"}</div>

                <div className="col-span-1">
                  <StatusBadge status={row.status} />
                </div>

                <div className="col-span-2">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      onClick={() => updateStatus(row, STATUSES.IN_TRANSIT)}
                      disabled={updating === row.id}
                      title="Keep as In-Transit"
                    >
                      <Truck className="h-4 w-4" />
                      In-Transit
                    </Button>
                    <Button
                      onClick={() => updateStatus(row, STATUSES.DELIVERED)}
                      disabled={updating === row.id}
                      title="Mark as Delivered"
                    >
                      <CheckCheck className="h-4 w-4" />
                      Delivered
                    </Button>
                    <Button
                      onClick={() => updateStatus(row, STATUSES.PROBLEM)}
                      disabled={updating === row.id}
                      title="Flag Problem"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Problem
                    </Button>
                    <Button title="Edit (wire as needed)">
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button onClick={() => handleDelete(row)} title="Delete">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
