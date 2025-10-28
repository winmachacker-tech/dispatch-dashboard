// src/pages/loads.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { Loader2, MoreHorizontal } from "lucide-react";

const STATUSES = ["AVAILABLE", "IN_TRANSIT", "PROBLEM", "DELIVERED"];

function StatusBadge({ status }) {
  const styles =
    {
      AVAILABLE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      IN_TRANSIT: "bg-sky-500/15 text-sky-300 border-sky-500/30",
      PROBLEM: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      DELIVERED: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    }[status] || "bg-neutral-700/30 text-neutral-300 border-neutral-600/30";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs border ${styles}`}>
      {status.replace("_", "-")}
    </span>
  );
}

function FilterBar({ active, setActive }) {
  return (
    <div className="flex gap-3">
      {STATUSES.map((s) => {
        const isActive = active === s;
        return (
          <button
            key={s}
            onClick={() => setActive(s)}
            className={[
              "px-4 py-2 rounded-lg text-sm border transition",
              isActive
                ? "bg-neutral-900 text-white border-neutral-700 dark:bg-white dark:text-neutral-900 dark:border-neutral-300"
                : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800 hover:dark:border-neutral-700",
            ].join(" ")}
          >
            {s.replace("_", " ")}
          </button>
        );
      })}
    </div>
  );
}

export default function LoadsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState("AVAILABLE");
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState(null);

  const title = useMemo(() => {
    const label = activeStatus.replace("_", " ");
    return `${label.charAt(0) + label.slice(1).toLowerCase()} Loads`;
  }, [activeStatus]);

  useEffect(() => {
    let ignore = false;
    async function run() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("loads")
        .select("id, created_at, shipper, origin, destination, dispatcher, rate, status")
        .eq("status", activeStatus)
        .order("created_at", { ascending: false });

      if (ignore) return;
      if (error) setError(error.message);
      setRows(data || []);
      setLoading(false);
    }
    run();
    return () => {
      ignore = true;
    };
  }, [activeStatus]);

  async function handleChangeStatus(id, nextStatus) {
    try {
      setUpdatingId(id);
      const { error } = await supabase.from("loads").update({ status: nextStatus }).eq("id", id);
      if (error) throw error;
      // Optimistic: if new status matches current filter, update in place; else remove from list
      setRows((prev) =>
        nextStatus === activeStatus
          ? prev.map((r) => (r.id === id ? { ...r, status: nextStatus } : r))
          : prev.filter((r) => r.id !== id)
      );
    } catch (e) {
      setError(e.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{title}</h2>
      </div>

      {/* Filter bar */}
      <FilterBar active={activeStatus} setActive={setActiveStatus} />

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 border border-red-300/50 dark:border-red-700/40 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center gap-2 text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="text-neutral-500">No loads in this status.</div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 bg-white dark:bg-neutral-900"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-semibold">
                    {row.origin}, {row.destination?.includes(",") ? "" : ""} {row.origin && "→"} {row.destination}
                  </div>
                  <div className="text-sm text-neutral-500">
                    {row.shipper} • ${Number(row.rate || 0).toLocaleString()}
                  </div>
                  <StatusBadge status={row.status} />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <MoreHorizontal className="h-4 w-4 text-neutral-400" />
                  <select
                    disabled={updatingId === row.id}
                    value=""
                    onChange={(e) => {
                      const next = e.target.value;
                      if (next) handleChangeStatus(row.id, next);
                    }}
                    className="text-sm bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 py-1"
                  >
                    <option value="" disabled>
                      Change status…
                    </option>
                    {STATUSES.filter((s) => s !== row.status).map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
