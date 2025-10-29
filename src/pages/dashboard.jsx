// src/pages/dashboard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

/* ========================== Utilities ========================== */
const logErr = (label, error) => {
  if (error) console.error(`[Dashboard] ${label} error`, error);
};

const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};
const startOfWeek = (d = new Date()) => {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mon=0
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
};
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const iso = (d) => new Date(d).toISOString();
const fmtDate = (d) =>
  new Date(d).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

const STATUS_OPTIONS = [
  "AVAILABLE",
  "TENDERED",
  "BOOKED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
  "UNKNOWN",
];

/* =================== Status Multi-Select Dropdown =================== */
function StatusFilterDropdown({ options, value, onChange, label = "Status" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  // close on click outside
  useEffect(() => {
    const onDoc = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const toggle = (opt) => {
    const on = value.includes(opt);
    onChange(on ? value.filter((v) => v !== opt) : [...value, opt]);
  };

  const setAll = () => onChange(options.slice());
  const setNone = () => onChange([]);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(q.trim().toLowerCase())
  );

  const summary =
    value.length === 0 ? "All" : `${value.length}/${options.length}`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1.5 text-sm rounded-lg border bg-transparent"
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`${label}: ${summary}`}
      >
        {label}
        <span className="ml-2 opacity-60">{summary}</span>
      </button>

      {open && (
        <div
          className="absolute z-50 mt-2 w-64 rounded-xl border border-neutral-200/60 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg p-2"
          role="listbox"
        >
          <div className="px-2 pb-2 border-b border-neutral-200/60 dark:border-neutral-800">
            <input
              type="text"
              placeholder="Search status…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-md border bg-transparent px-2 py-1 text-sm"
            />
            <div className="mt-2 flex items-center justify-between">
              <button onClick={setAll} className="text-xs underline">
                Select all
              </button>
              <button onClick={setNone} className="text-xs underline">
                Clear
              </button>
            </div>
          </div>

          <div className="max-h-64 overflow-auto py-1">
            {filtered.map((opt) => {
              const on = value.includes(opt);
              return (
                <label
                  key={opt}
                  className="flex items-center gap-2 px-2 py-1 text-sm cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded"
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(opt)}
                  />
                  <span className="uppercase tracking-wide">{opt}</span>
                </label>
              );
            })}
            {!filtered.length && (
              <div className="px-2 py-2 text-xs opacity-60">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ========================== Layout Helpers ========================== */
function ChartContainer({ children, minHeight = 280 }) {
  return (
    <div className="w-full min-w-0" style={{ minHeight }}>
      {children}
    </div>
  );
}

function Card({ title, actions, children }) {
  return (
    <div className="rounded-2xl border border-neutral-200/60 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur">
      <div className="px-4 py-3 border-b border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between">
        <h2 className="text-base font-medium">{title}</h2>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Kpi({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-neutral-200/60 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 backdrop-blur p-4">
      <div className="text-sm opacity-70">{label}</div>
      <div className="mt-1 text-3xl font-semibold tabular-nums">{value}</div>
      {sub ? <div className="mt-1 text-xs opacity-60">{sub}</div> : null}
    </div>
  );
}

/* ============================== CSV =============================== */
function downloadCSV(filename, rows) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    if (v == null) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv =
    [headers.join(",")]
      .concat(rows.map((r) => headers.map((h) => escape(r[h])).join(",")))
      .join("\n") + "\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

/* ============================ Page ============================= */
export default function DashboardPage() {
  // Filters
  const [from, setFrom] = useState(startOfWeek());
  const [to, setTo] = useState(endOfDay(new Date()));
  const [statusFilter, setStatusFilter] = useState([]);
  const [problemsOnly, setProblemsOnly] = useState(false);

  // Controls
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [realtimeOn, setRealtimeOn] = useState(false);
  const refreshTimer = useRef(null);
  const realtimeRef = useRef(null);

  // State
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [supportsProblemFlag, setSupportsProblemFlag] = useState(true); // feature-detect

  // KPIs
  const [loadsThisWeek, setLoadsThisWeek] = useState(0);
  const [problemLoadsTotal, setProblemLoadsTotal] = useState(0);
  const [inTransitCount, setInTransitCount] = useState(0);
  const [deliveredThisWeek, setDeliveredThisWeek] = useState(0);
  const [agingOver48, setAgingOver48] = useState(0);

  // Charts
  const [statusChart, setStatusChart] = useState([]);
  const [createdTrend, setCreatedTrend] = useState([]);

  // Table
  const [recent, setRecent] = useState([]);

  const sWeek = useMemo(() => startOfWeek(), []);
  const eWeek = useMemo(() => addDays(startOfWeek(), 7), []);

  /* ---------- feature-detect problem_flag column ---------- */
  const probeProblemFlag = async () => {
    const { error } = await supabase.from("loads").select("problem_flag").limit(1);
    if (error) {
      logErr("Probe problem_flag", error);
      setSupportsProblemFlag(false);
      setProblemsOnly(false);
    } else {
      setSupportsProblemFlag(true);
    }
  };

  /* ---------- Data Loader (applies filters) ---------- */
  const loadData = async () => {
    setErrMsg("");
    try {
      await probeProblemFlag();

      const applyFilters = (query) => {
        let q = query.gte("created_at", iso(from)).lt("created_at", iso(to));
        if (supportsProblemFlag && problemsOnly) q = q.eq("problem_flag", true);
        if (statusFilter?.length) q = q.in("status", statusFilter);
        return q;
      };

      // 1) Loads created this week
      {
        const { count, error } = await supabase
          .from("loads")
          .select("id", { count: "exact", head: true })
          .gte("created_at", iso(sWeek))
          .lt("created_at", iso(eWeek));
        logErr("LoadsThisWeek", error);
        setLoadsThisWeek(typeof count === "number" ? count : 0);
      }

      // 2) Problem loads total (if supported)
      if (supportsProblemFlag) {
        const { count, error } = await supabase
          .from("loads")
          .select("id", { count: "exact", head: true })
          .eq("problem_flag", true);
        logErr("ProblemLoads_total", error);
        setProblemLoadsTotal(typeof count === "number" ? count : 0);
      } else {
        setProblemLoadsTotal(0);
      }

      // 3) In-Transit count (filtered + IN_TRANSIT)
      {
        let q = supabase
          .from("loads")
          .select("id", { count: "exact", head: true })
          .eq("status", "IN_TRANSIT")
          .gte("created_at", iso(from))
          .lt("created_at", iso(to));
        if (supportsProblemFlag && problemsOnly) q = q.eq("problem_flag", true);
        const { count, error } = await q;
        logErr("InTransitCount", error);
        setInTransitCount(typeof count === "number" ? count : 0);
      }

      // 4) Delivered this week
      {
        const { count, error } = await supabase
          .from("loads")
          .select("id", { count: "exact", head: true })
          .eq("status", "DELIVERED")
          .gte("created_at", iso(sWeek))
          .lt("created_at", iso(eWeek));
        logErr("DeliveredThisWeek", error);
        setDeliveredThisWeek(typeof count === "number" ? count : 0);
      }

      // 5) Aging > 48h since pickup (fallback to created)
      {
        const { data, error } = await applyFilters(
          supabase.from("loads").select("id, created_at, pickup_date, status")
        );
        logErr("AgingFetch", error);
        const now = Date.now();
        const count =
          (data || []).filter((r) => {
            const ts = r?.pickup_date
              ? new Date(r.pickup_date).getTime()
              : r?.created_at
              ? new Date(r.created_at).getTime()
              : null;
            if (!ts) return false;
            const hours = (now - ts) / (1000 * 60 * 60);
            return hours > 48 && r.status !== "DELIVERED";
          }).length ?? 0;
        setAgingOver48(count);
      }

      // 6) Status distribution — tally client-side
      {
        const { data, error } = await applyFilters(
          supabase.from("loads").select("status")
        );
        logErr("StatusFetch", error);
        const map = {};
        (data || []).forEach((r) => {
          const key = (r.status || "UNKNOWN").toUpperCase();
          map[key] = (map[key] || 0) + 1;
        });
        const chart = Object.entries(map)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([status, value]) => ({ status, value }));
        setStatusChart(chart);
      }

      // 7) Creation trend — respect current date inputs
      {
        const fromStart = startOfDay(from);
        const toEnd = endOfDay(to);
        const { data, error } = await supabase
          .from("loads")
          .select("id, created_at")
          .gte("created_at", iso(fromStart))
          .lt("created_at", iso(toEnd));
        logErr("CreatedTrend", error);

        const days = Math.max(
          1,
          Math.min(30, Math.round((toEnd - fromStart) / 86400000) + 1)
        );
        const buckets = new Map();
        for (let i = 0; i < days; i++) {
          const d = addDays(fromStart, i);
          buckets.set(d.toDateString(), 0);
        }
        (data || []).forEach((r) => {
          const day = startOfDay(new Date(r.created_at)).toDateString();
          if (buckets.has(day)) buckets.set(day, (buckets.get(day) || 0) + 1);
        });
        const trend = Array.from(buckets.entries()).map(([k, v]) => ({
          day: fmtDate(k),
          value: v,
        }));
        setCreatedTrend(trend);
      }

      // 8) Recent activity table (filtered)
      {
        const projection = supportsProblemFlag
          ? "id, status, created_at, problem_flag, pickup_date, delivery_date"
          : "id, status, created_at, pickup_date, delivery_date";
        const { data, error } = await applyFilters(
          supabase
            .from("loads")
            .select(projection)
            .order("created_at", { ascending: false })
            .limit(20)
        );
        logErr("RecentLoads", error);
        setRecent(data || []);
      }
    } catch (err) {
      console.error(err);
      setErrMsg("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Initial & refresh ---------- */
  useEffect(() => {
    setLoading(true);
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, problemsOnly, JSON.stringify(statusFilter)]);

  useEffect(() => {
    if (autoRefresh) refreshTimer.current = setInterval(loadData, 30000);
    return () => refreshTimer.current && clearInterval(refreshTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, from, to, problemsOnly, JSON.stringify(statusFilter)]);

  /* ---------- Realtime (optional) ---------- */
  useEffect(() => {
    if (!realtimeOn) {
      try {
        realtimeRef.current?.unsubscribe?.();
      } catch {}
      realtimeRef.current = null;
      return;
    }
    try {
      const channel = supabase
        .channel("dashboard_loads_changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "loads" },
          () => loadData()
        )
        .subscribe();
      realtimeRef.current = channel;
    } catch (e) {
      console.warn("[Dashboard] Realtime unavailable", e);
    }
    return () => {
      try {
        realtimeRef.current?.unsubscribe?.();
      } catch {}
      realtimeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeOn]);

  /* ========================== UI ========================== */
  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Operations Dashboard</h1>
        <div className="flex flex-wrap items-center gap-3">
          {/* Date range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="rounded-lg border bg-transparent px-2 py-1 text-sm"
              value={new Date(from).toISOString().slice(0, 10)}
              onChange={(e) => setFrom(startOfDay(new Date(e.target.value)))}
            />
            <span className="opacity-60 text-sm">to</span>
            <input
              type="date"
              className="rounded-lg border bg-transparent px-2 py-1 text-sm"
              value={new Date(to).toISOString().slice(0, 10)}
              onChange={(e) => setTo(endOfDay(new Date(e.target.value)))}
            />
          </div>

          {/* Status multi-select dropdown */}
          <StatusFilterDropdown
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
            label="Status"
          />

          {/* Problems only — hide if column is missing */}
          {supportsProblemFlag && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={problemsOnly}
                onChange={(e) => setProblemsOnly(e.target.checked)}
              />
              Problems only
            </label>
          )}

          {/* Auto refresh */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>

          {/* Realtime */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={realtimeOn}
              onChange={(e) => setRealtimeOn(e.target.checked)}
            />
            Realtime
          </label>

          {/* Export */}
          <button
            className="px-3 py-1.5 text-sm rounded-lg border"
            onClick={() =>
              downloadCSV(
                `loads_${new Date().toISOString().slice(0, 10)}.csv`,
                (recent || []).map((r) => ({
                  id: r.id,
                  status: r.status || "",
                  created_at: r.created_at || "",
                  ...(supportsProblemFlag
                    ? { problem_flag: r.problem_flag ? "TRUE" : "FALSE" }
                    : {}),
                  pickup_date: r.pickup_date || "",
                  delivery_date: r.delivery_date || "",
                }))
              )
            }
          >
            Export CSV (recent)
          </button>
        </div>
      </header>

      {/* KPI Ribbon */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <Kpi
          label="Loads This Week"
          value={loadsThisWeek}
          sub={`${fmtDate(sWeek)} – ${fmtDate(addDays(sWeek, 6))}`}
        />
        {supportsProblemFlag ? (
          <Kpi label="Problem Loads (Total)" value={problemLoadsTotal} />
        ) : (
          <Kpi label="Problem Loads (Total)" value="—" sub="problem_flag column not found" />
        )}
        <Kpi label="In-Transit (Filtered)" value={inTransitCount} />
        <Kpi label="Delivered This Week" value={deliveredThisWeek} />
        <Kpi label="Aging > 48h (Filtered)" value={agingOver48} />
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Loads by Status (Filtered)">
          <ChartContainer minHeight={300}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={statusChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Card>

        <Card title="Loads Created – Selected Range">
          <ChartContainer minHeight={300}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={createdTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="value" />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Card>
      </section>

      {/* Recent Table */}
      <Card
        title="Recent Activity (Filtered)"
        actions={
          <div className="text-xs opacity-60">
            Showing latest 20 in range {fmtDate(from)} – {fmtDate(to)}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left border-b border-neutral-200/60 dark:border-neutral-800">
              <tr>
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Created</th>
                {supportsProblemFlag && <th className="py-2 pr-3">Problem</th>}
                <th className="py-2 pr-3">Pickup</th>
                <th className="py-2 pr-3">Delivery</th>
              </tr>
            </thead>
            <tbody>
              {(recent || []).map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-neutral-100/60 dark:border-neutral-800/60"
                >
                  <td className="py-2 pr-3 font-medium tabular-nums">{r.id}</td>
                  <td className="py-2 pr-3">
                    <span className="inline-block rounded-full border px-2 py-0.5 text-xs">
                      {(r.status || "UNKNOWN").toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    {r.created_at ? new Date(r.created_at).toLocaleString() : ""}
                  </td>
                  {supportsProblemFlag && (
                    <td className="py-2 pr-3">
                      {r.problem_flag ? (
                        <span className="text-red-600 dark:text-red-400">Yes</span>
                      ) : (
                        <span className="opacity-60">No</span>
                      )}
                    </td>
                  )}
                  <td className="py-2 pr-3">
                    {r.pickup_date ? (
                      new Date(r.pickup_date).toLocaleDateString()
                    ) : (
                      <span className="opacity-50">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {r.delivery_date ? (
                      new Date(r.delivery_date).toLocaleDateString()
                    ) : (
                      <span className="opacity-50">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {!recent?.length && !loading && (
                <tr>
                  <td
                    colSpan={supportsProblemFlag ? 6 : 5}
                    className="py-6 text-center opacity-60"
                  >
                    No records in this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Errors / Loading */}
      {loading && <div className="text-sm opacity-70">Loading metrics…</div>}
      {errMsg && (
        <div className="text-sm text-red-600 dark:text-red-400">{errMsg}</div>
      )}
    </div>
  );
}
