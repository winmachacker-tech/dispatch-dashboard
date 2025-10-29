// src/pages/dashboard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  BarChart2,
  Clock,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

// ---------------- helpers ----------------
const logErr = (label, error) => {
  if (error) console.error(`[Dashboard] ${label} error`, error);
};

const STATUSES = [
  "AVAILABLE",
  "TENDERED",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
  "PROBLEM",
];

const iso = (d) => new Date(d).toISOString();

const startOfWeek = (d) => {
  const x = new Date(d);
  const day = x.getDay(); // 0 Sun .. 6 Sat
  const diff = (day + 6) % 7; // Monday start
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfWeek = (d) => {
  const s = startOfWeek(d);
  const x = new Date(s);
  x.setDate(s.getDate() + 7);
  x.setHours(0, 0, 0, 0);
  return x;
};

const startOfMonth = (d) => {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
};

function weekKey(date) {
  // YYYY-Www (simple)
  const x = new Date(date);
  const year = x.getUTCFullYear();
  const oneJan = new Date(Date.UTC(year, 0, 1));
  const dayOfYear = Math.floor((x - oneJan) / 86400000) + 1;
  const week = Math.ceil((dayOfYear + (oneJan.getUTCDay() || 7) - 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// ---------------- main ----------------
export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // KPIs
  const [loadsThisWeek, setLoadsThisWeek] = useState(0);
  const [loadsMTD, setLoadsMTD] = useState(0);
  const [problemLoadsCount, setProblemLoadsCount] = useState(0);
  const [problemRate7d, setProblemRate7d] = useState(0);
  const [aging48hUndelivered, setAging48hUndelivered] = useState(0);
  const [statusCounts, setStatusCounts] = useState({});

  // Chart
  const [weeklyTrend, setWeeklyTrend] = useState([]); // [{week, count}]

  const sWeek = useMemo(() => startOfWeek(new Date()), []);
  const eWeek = useMemo(() => endOfWeek(new Date()), []);
  const sMonth = useMemo(() => startOfMonth(new Date()), []);

  const debouncedRefreshRef = useRef(null);

  // --------- generic count helper
  async function countWhere(builderCb) {
    let q = supabase.from("loads").select("id", { count: "exact", head: true });
    q = builderCb(q);
    const { count, error } = await q;
    logErr("countWhere", error);
    return typeof count === "number" ? count : 0;
  }

  // --------- problem loads via union (robust to column type)
  async function getProblemLoadIdsSince(since = null) {
    const q1 = supabase.from("loads").select("id").eq("status", "PROBLEM");
    const q2 = supabase
      .from("loads")
      .select("id")
      .or("problem_flag.is.true,problem_flag.eq.true");

    const [a, b] = await Promise.all([
      since ? q1.gte("created_at", iso(since)) : q1,
      since ? q2.gte("created_at", iso(since)) : q2,
    ]);

    logErr("ProblemLoads_status", a.error);
    logErr("ProblemLoads_flag", b.error);

    const ids = new Set();
    (a.data || []).forEach((r) => ids.add(r.id));
    (b.data || []).forEach((r) => ids.add(r.id));
    return Array.from(ids);
  }

  // --------- status counts (no .group())
  async function getStatusCounts() {
    const entries = await Promise.all(
      STATUSES.map(async (s) => {
        const c = await countWhere((q) => q.eq("status", s));
        return [s, c];
      })
    );
    return Object.fromEntries(entries);
  }

  // --------- aging: undelivered older than 48h
  async function countUndeliveredOlderThan(hours = 48) {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    // status != DELIVERED and created_at < cutoff
    return await countWhere((q) =>
      q.neq("status", "DELIVERED").lt("created_at", iso(cutoff))
    );
  }

  async function computeCards() {
    // Loads this week
    {
      const c = await countWhere((q) =>
        q.gte("created_at", iso(sWeek)).lt("created_at", iso(eWeek))
      );
      setLoadsThisWeek(c);
    }

    // Loads MTD
    {
      const c = await countWhere((q) => q.gte("created_at", iso(sMonth)));
      setLoadsMTD(c);
    }

    // Problem loads (all-time count)
    {
      const ids = await getProblemLoadIdsSince(null);
      setProblemLoadsCount(ids.length);
    }

    // Problem rate (last 7d)
    {
      const since = new Date();
      since.setDate(since.getDate() - 7);
      since.setHours(0, 0, 0, 0);

      const [total7d, probIds7d] = await Promise.all([
        countWhere((q) => q.gte("created_at", iso(since))),
        getProblemLoadIdsSince(since),
      ]);
      const rate = total7d > 0 ? (probIds7d.length / total7d) * 100 : 0;
      setProblemRate7d(Math.round(rate));
    }

    // Aging 48h undelivered
    {
      const c = await countUndeliveredOlderThan(48);
      setAging48hUndelivered(c);
    }

    // Status tiles
    {
      const map = await getStatusCounts();
      setStatusCounts(map);
    }
  }

  async function computeWeeklyTrend() {
    // last 8 weeks by created_at
    const since = new Date();
    since.setDate(since.getDate() - 7 * 8);
    since.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("loads")
      .select("id,created_at")
      .gte("created_at", iso(since));
    logErr("WeeklyTrend", error);

    const buckets = {};
    (data || []).forEach((r) => {
      const k = weekKey(r.created_at);
      buckets[k] = (buckets[k] || 0) + 1;
    });

    const out = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i * 7);
      const k = weekKey(d);
      out.push({ week: k, count: buckets[k] || 0 });
    }
    setWeeklyTrend(out);
  }

  async function refreshAll() {
    setLoading(true);
    try {
      await Promise.all([computeCards(), computeWeeklyTrend()]);
      setLastRefreshed(new Date());
    } finally {
      setLoading(false);
    }
  }

  // Realtime auto-refresh on loads changes
  useEffect(() => {
    debouncedRefreshRef.current = debounce(() => {
      // don’t interrupt manual loading spinner; just refresh data
      computeCards();
      computeWeeklyTrend();
      setLastRefreshed(new Date());
    }, 500);

    // RLS must allow realtime; table must be in publication
    const channel = supabase
      .channel("dashboard-loads")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "loads" },
        () => debouncedRefreshRef.current?.()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const niceTime = (d) =>
    d ? new Date(d).toLocaleString(undefined, { hour12: true }) : "–";

  // ---------------- UI ----------------
  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-neutral-500">
            Enterprise ops snapshot — live updates via Supabase Realtime
          </p>
        </div>
        <button
          onClick={refreshAll}
          className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900 transition"
          disabled={loading}
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Meta */}
      <div className="mb-6 text-xs text-neutral-500 flex items-center gap-2">
        <Clock className="h-3.5 w-3.5" />
        Last updated: {niceTime(lastRefreshed)}
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 mb-6">
        <Card
          title="Loads This Week"
          subtitle={`${sWeek.toLocaleDateString()} → ${new Date(
            eWeek - 1
          ).toLocaleDateString()}`}
          icon={<BarChart2 className="h-5 w-5" />}
          value={loadsThisWeek}
        />
        <Card
          title="Loads MTD"
          subtitle={`${sMonth.toLocaleDateString()} → Today`}
          icon={<Activity className="h-5 w-5" />}
          value={loadsMTD}
        />
        <Card
          title="Problem Loads"
          subtitle="All-time (status or flagged)"
          icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
          value={problemLoadsCount}
          valueClass={
            problemLoadsCount > 0 ? "text-amber-500" : "text-emerald-500"
          }
        />
        <Card
          title="Problem Rate (7d)"
          subtitle="% of created loads"
          icon={<AlertTriangle className="h-5 w-5" />}
          value={`${problemRate7d}%`}
        />
        <Card
          title="Aging > 48h"
          subtitle="Undelivered"
          icon={<Clock className="h-5 w-5" />}
          value={aging48hUndelivered}
          valueClass={
            aging48hUndelivered > 0 ? "text-amber-500" : "text-emerald-500"
          }
        />
        <Card
          title="In Transit"
          subtitle="Active on road"
          icon={<BarChart2 className="h-5 w-5" />}
          value={statusCounts.IN_TRANSIT ?? 0}
        />
      </div>

      {/* Status distribution */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold mb-3">Status Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {STATUSES.map((s) => (
            <div
              key={s}
              className="rounded-2xl border border-neutral-200 dark:border-neutral-800 px-3 py-3"
            >
              <div className="text-[11px] uppercase tracking-wider text-neutral-500">
                {s.replaceAll("_", " ")}
              </div>
              <div className="text-2xl font-semibold">
                {statusCounts[s] ?? 0}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trend */}
      <section className="min-w-0">
        <h2 className="text-sm font-semibold mb-3">Loads Created — 8-Week Trend</h2>
        <div className="h-64 min-w-0 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="currentColor" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

// ---------------- small card component ----------------
function Card({ title, subtitle, icon, value, valueClass }) {
  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-neutral-500">{icon}</div>
      </div>
      <div className={`text-3xl font-semibold ${valueClass || ""}`}>{value}</div>
      {subtitle ? (
        <div className="text-xs text-neutral-500 mt-1">{subtitle}</div>
      ) : null}
    </div>
  );
}
