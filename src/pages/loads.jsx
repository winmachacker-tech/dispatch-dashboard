// src/pages/loads.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Loader2,
  Search,
  RefreshCw,
  Filter,
  UploadCloud,
  CheckSquare,
  MinusSquare,
  PencilLine,
  Check,
  X,
} from "lucide-react";

/* ---------------------------------- UI ---------------------------------- */

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

function Badge({ children, intent = "default", className = "" }) {
  const map = {
    default:
      "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 border border-zinc-200/60 dark:border-zinc-700/60",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
    amber:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
    green:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
    red: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
    gray:
      "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-200 border border-zinc-200/60 dark:border-zinc-700/60",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        map[intent] || map.default,
        className
      )}
    >
      {children}
    </span>
  );
}

function Button({
  children,
  variant = "default",
  size = "md",
  className = "",
  ...props
}) {
  const v = {
    default:
      "bg-zinc-900 text-white hover:opacity-95 dark:bg-zinc-700 dark:text-white",
    ghost:
      "bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-foreground",
    outline:
      "border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800",
    subtle:
      "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700",
  };
  const s = {
    md: "h-9 px-3 text-sm",
    sm: "h-8 px-2.5 text-xs",
    lg: "h-10 px-4 text-sm",
  };
  return (
    <button
      className={cx(
        "inline-flex items-center gap-2 rounded-lg font-medium transition-colors",
        v[variant],
        s[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ----------------------------- helper utilities ----------------------------- */

function useDebouncedValue(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function formatMoney(n) {
  if (n == null || n === "") return "—";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return "—";
  return num.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function statusIntent(s) {
  switch ((s || "").toUpperCase()) {
    case "AVAILABLE":
      return "blue";
    case "IN_TRANSIT":
      return "amber";
    case "DELIVERED":
      return "green";
    case "PROBLEM":
      return "red";
    default:
      return "gray";
  }
}

/* ---------------------------------- page ---------------------------------- */

export default function LoadsPage() {
  // table data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTs, setRefreshTs] = useState(0);

  // filters/search
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | AVAILABLE | IN_TRANSIT | DELIVERED | PROBLEM
  const [dispatcher, setDispatcher] = useState("");
  const [search, setSearch] = useState("");
  const [pickupFrom, setPickupFrom] = useState("");
  const [pickupTo, setPickupTo] = useState("");
  const searchQ = useDebouncedValue(search, 400);

  // selection/bulk
  const [selected, setSelected] = useState(new Set());

  // inline rate editing
  const [editingRateId, setEditingRateId] = useState(null);
  const [editingRate, setEditingRate] = useState("");
  const fileInputsRef = useRef({}); // { [loadId]: inputRef }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("loads")
        .select(
          `
          id,
          shipper,
          origin,
          destination,
          pickup_date,
          delivery_date,
          dispatcher,
          rate,
          status,
          pod_url
        `
        )
        .limit(2000)
        .order("pickup_date", { ascending: true, nullsFirst: true });

      if (statusFilter !== "ALL") q = q.eq("status", statusFilter);
      if (dispatcher) q = q.ilike("dispatcher", `%${dispatcher}%`);
      if (pickupFrom) q = q.gte("pickup_date", pickupFrom);
      if (pickupTo) q = q.lte("pickup_date", pickupTo);

      if (searchQ) {
        q = q.or(
          `shipper.ilike.%${searchQ}%,origin.ilike.%${searchQ}%,destination.ilike.%${searchQ}%`
        );
      }

      const { data, error } = await q;
      if (error) throw error;
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("loads fetch error:", err.message || err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dispatcher, pickupFrom, pickupTo, searchQ]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshTs]);

  useEffect(() => {
    const ch = supabase
      .channel("loads_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "loads" },
        () => setRefreshTs((t) => t + 1)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const kpis = useMemo(() => {
    const total = rows.length;
    const byStatus = rows.reduce(
      (acc, r) => {
        const s = (r.status || "UNKNOWN").toUpperCase();
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      },
      { AVAILABLE: 0, IN_TRANSIT: 0, DELIVERED: 0, PROBLEM: 0 }
    );
    const revenue = rows.reduce(
      (sum, r) => sum + (parseFloat(r.rate) || 0),
      0
    );
    return {
      total,
      available: byStatus.AVAILABLE || 0,
      inTransit: byStatus.IN_TRANSIT || 0,
      delivered: byStatus.DELIVERED || 0,
      problem: byStatus.PROBLEM || 0,
      revenue,
    };
  }, [rows]);

  /* ------------------------------- interactions ------------------------------- */

  function toggleSelectAll() {
    if (selected.size === rows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r.id)));
    }
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function bulkUpdateStatus(nextStatus) {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const { error } = await supabase
      .from("loads")
      .update({ status: nextStatus })
      .in("id", ids);
    if (!error) {
      setSelected(new Set());
      setRefreshTs((t) => t + 1);
    } else {
      console.error(error);
    }
  }

  function startEditRate(row) {
    setEditingRateId(row.id);
    setEditingRate(row.rate ?? "");
  }
  async function saveRate(id) {
    const parsed = parseFloat(editingRate || "0");
    const { error } = await supabase
      .from("loads")
      .update({ rate: isNaN(parsed) ? null : parsed })
      .eq("id", id);
    if (!error) {
      setEditingRateId(null);
      setEditingRate("");
      setRefreshTs((t) => t + 1);
    } else {
      console.error(error);
    }
  }

  function triggerUpload(loadId) {
    const ref = fileInputsRef.current[loadId];
    if (ref) ref.click();
  }

  async function handleFile(loadId, file) {
    if (!file) return;
    try {
      const path = `pods/${loadId}/${Date.now()}_${file.name}`;
      const up = await supabase.storage.from("pods").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (up.error) throw up.error;

      const publicUrl = supabase.storage.from("pods").getPublicUrl(path).data
        .publicUrl;

      const { error } = await supabase
        .from("loads")
        .update({ pod_url: publicUrl })
        .eq("id", loadId);
      if (error) throw error;
      setRefreshTs((t) => t + 1);
    } catch (e) {
      console.error("POD upload error:", e.message || e);
    }
  }

  /* --------------------------------- render --------------------------------- */

  return (
    // Use a neutral container that respects dark mode globally
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 text-sm bg-transparent">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Loads
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage active and historical loads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setRefreshTs((t) => t + 1)}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi title="Total Loads" value={kpis.total} />
        <Kpi title="Available" value={kpis.available} tone="blue" />
        <Kpi title="In Transit" value={kpis.inTransit} tone="amber" />
        <Kpi title="Delivered" value={kpis.delivered} tone="green" />
        <Kpi title="Total Revenue" value={formatMoney(kpis.revenue)} />
      </div>

      {/* filters */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 sm:p-4 shadow-sm">
        <div className="flex flex-col gap-3">
          {/* STATUS TABS: scrollable + wrap-safe */}
          <div className="min-w-0">
            <div className="flex gap-2 overflow-x-auto overscroll-x-contain snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none]"
                 style={{ WebkitOverflowScrolling: "touch" }}>
              {/* hide scrollbar (keeps accessibility) */}
              <style>{`.no-scrollbar::-webkit-scrollbar{display:none}`}</style>
              {["ALL", "AVAILABLE", "IN_TRANSIT", "DELIVERED", "PROBLEM"].map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cx(
                      "snap-start shrink-0 rounded-full px-3 h-8 text-xs font-semibold border",
                      statusFilter === s
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent"
                        : "text-foreground border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    {s.replace("_", " ")}
                  </button>
                )
              )}
            </div>
          </div>

          {/* search + advanced filters */}
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search shipper, origin, destination"
                className="w-full pl-8 h-9 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-foreground placeholder:text-zinc-500"
              />
            </div>
            <div className="flex-1" />
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-zinc-500" />
              <input
                type="text"
                value={dispatcher}
                onChange={(e) => setDispatcher(e.target.value)}
                placeholder="Dispatcher"
                className="w-40 h-9 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              />
              <input
                type="date"
                value={pickupFrom}
                onChange={(e) => setPickupFrom(e.target.value)}
                className="h-9 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              />
              <span className="text-zinc-500 text-xs">to</span>
              <input
                type="date"
                value={pickupTo}
                onChange={(e) => setPickupTo(e.target.value)}
                className="h-9 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDispatcher("");
                  setPickupFrom("");
                  setPickupTo("");
                  setSearch("");
                }}
              >
                Clear
              </Button>
            </div>
          </div>

          {/* bulk actions */}
          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <Badge intent="gray" className="uppercase">
                {selected.size} selected
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => bulkUpdateStatus("DELIVERED")}
              >
                <CheckSquare className="h-4 w-4" />
                Mark Delivered
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => bulkUpdateStatus("IN_TRANSIT")}
              >
                <MinusSquare className="h-4 w-4" />
                Mark In Transit
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* table */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
        <div className="overflow-auto">
          <table className="min-w-[960px] w-full text-sm">
            <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
              <tr className="text-left">
                <Th>
                  <input
                    type="checkbox"
                    checked={selected.size === rows.length && rows.length > 0}
                    onChange={toggleSelectAll}
                  />
                </Th>
                <Th>Shipper</Th>
                <Th>Origin</Th>
                <Th>Destination</Th>
                <Th>Pickup</Th>
                <Th>Delivery</Th>
                <Th>Dispatcher</Th>
                <Th className="text-right">Rate</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center">
                    <Loader2 className="inline h-5 w-5 animate-spin mr-2" />
                    Loading loads…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-zinc-500">
                    No loads match your filters.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50"
                  >
                    <Td>
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                      />
                    </Td>
                    <Td className="font-medium">{r.shipper ?? "—"}</Td>
                    <Td>{r.origin ?? "—"}</Td>
                    <Td>{r.destination ?? "—"}</Td>
                    <Td>{r.pickup_date ?? "—"}</Td>
                    <Td>{r.delivery_date ?? "—"}</Td>
                    <Td>{r.dispatcher ?? "—"}</Td>

                    {/* Rate with inline edit */}
                    <Td className="text-right">
                      {editingRateId === r.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <input
                            autoFocus
                            value={editingRate}
                            onChange={(e) => setEditingRate(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveRate(r.id);
                              if (e.key === "Escape") setEditingRateId(null);
                            }}
                            className="w-28 h-8 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-right"
                          />
                          <Button
                            size="sm"
                            variant="subtle"
                            onClick={() => saveRate(r.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="subtle"
                            onClick={() => setEditingRateId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          className="inline-flex items-center gap-1 hover:underline"
                          onClick={() => startEditRate(r)}
                          title="Edit rate"
                        >
                          {formatMoney(r.rate)}
                          <PencilLine className="h-3.5 w-3.5 text-zinc-500" />
                        </button>
                      )}
                    </Td>

                    <Td>
                      <Badge intent={statusIntent(r.status)}>
                        {String(r.status || "—")
                          .replace("_", " ")
                          .toUpperCase()}
                      </Badge>
                    </Td>

                    <Td className="text-right">
                      <input
                        ref={(el) => (fileInputsRef.current[r.id] = el)}
                        type="file"
                        className="hidden"
                        onChange={(e) =>
                          handleFile(r.id, e.target.files?.[0] || null)
                        }
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => triggerUpload(r.id)}
                        title={
                          r.pod_url ? "Replace POD file" : "Upload POD (PDF/JPG)"
                        }
                      >
                        <UploadCloud className="h-4 w-4" />
                        {r.pod_url ? "Replace POD" : "Upload POD"}
                      </Button>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- subcomponents ------------------------------ */

function Th({ className = "", children }) {
  return (
    <th
      className={cx(
        "px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300",
        className
      )}
    >
      {children}
    </th>
  );
}

function Td({ className = "", children }) {
  return <td className={cx("px-3 py-3 text-foreground", className)}>{children}</td>;
}

function Kpi({ title, value, tone = "default" }) {
  const toneCls = {
    default:
      "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800",
    blue: "bg-blue-50/70 dark:bg-blue-950/40 border-blue-200/60 dark:border-blue-900/40",
    amber:
      "bg-amber-50/70 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-900/40",
    green:
      "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-900/40",
  }[tone];

  return (
    <div className={cx("rounded-xl border p-3 sm:p-4 shadow-sm", toneCls)}>
      <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </div>
      <div className="text-xl mt-1 font-semibold text-foreground">{value}</div>
    </div>
  );
}
