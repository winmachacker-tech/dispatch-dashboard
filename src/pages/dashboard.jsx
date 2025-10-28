import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  BarChart3,
  ClipboardList,
  Truck,
  DollarSign,
  Loader2,
  AlertTriangle,
  CheckCheck,
  PlusCircle,
  ArrowRight,
  Activity,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ---- Helpers ---------------------------------------------------------------
const fmtUSD = (n) =>
  typeof n === "number"
    ? n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : "—";

const startOfWeek = (d = new Date()) => {
  const x = new Date(d);
  const day = x.getDay(); // 0 Sun .. 6 Sat
  const diff = (day + 6) % 7; // make Monday start
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
};

const toISO = (d) => new Date(d).toISOString();

// ---- UI Atoms --------------------------------------------------------------
function StatCard({ title, value, icon: Icon, hint, to }) {
  const body = (
    <div className="flex items-center justify-between p-4 rounded-2xl border border-neutral-200/60 dark:border-neutral-800/60 bg-white/70 dark:bg-neutral-900/70 backdrop-blur">
      <div>
        <p className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{title}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
        {hint && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>}
      </div>
      <div className="shrink-0 p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800">
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
  if (to) {
    return (
      <Link to={to} className="block transition-transform hover:scale-[1.01]">{body}</Link>
    );
  }
  return body;
}

function Section({ title, action, children }) {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-neutral-600 dark:text-neutral-300">{title}</h2>
        {action}
      </div>
      <div className="rounded-2xl border border-neutral-200/60 dark:border-neutral-800/60 bg-white/70 dark:bg-neutral-900/70 backdrop-blur p-4">
        {children}
      </div>
    </section>
  );
}

// ---- Page ------------------------------------------------------------------
export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // core datasets
  const [loads, setLoads] = useState([]);
  const [weekLoads, setWeekLoads] = useState([]);
  const [trucks, setTrucks] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function run() {
      try {
        setLoading(true);
        setError(null);

        // Loads (all minimal fields)
        const { data: loadsData, error: loadsErr } = await supabase
          .from("loads")
          .select("id, created_at, shipper, origin, destination, dispatcher, rate, status")
          .order("created_at", { ascending: false })
          .limit(200); // lightweight enough to aggregate client-side
        if (loadsErr) throw loadsErr;

        // Loads this week
        const weekStartISO = toISO(startOfWeek());
        const { data: weekData, error: weekErr } = await supabase
          .from("loads")
          .select("id, created_at, rate")
          .gte("created_at", weekStartISO)
          .order("created_at", { ascending: true });
        if (weekErr) throw weekErr;

        // Trucks
        const { data: trucksData, error: trucksErr } = await supabase
  .from("trucks")
  .select("id, status"); // ✅ removed 'unit'

        if (!isMounted) return;
        setLoads(loadsData ?? []);
        setWeekLoads(weekData ?? []);
        setTrucks(trucksData ?? []);
      } catch (e) {
        console.error("Dashboard fetch error:", e);
        if (isMounted) setError(e.message || "Failed to load dashboard data");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    run();
    return () => {
      isMounted = false;
    };
  }, []);

  // ---- Derived metrics -----------------------------------------------------
  const countsByStatus = useMemo(() => {
    const map = { AVAILABLE: 0, IN_TRANSIT: 0, DELIVERED: 0, PROBLEM: 0, PLANNED: 0, CANCELLED: 0 };
    for (const l of loads) map[l.status] = (map[l.status] || 0) + 1;
    return map;
  }, [loads]);

  const totalWeekRevenue = useMemo(() => {
    return weekLoads.reduce((sum, r) => sum + (Number(r.rate) || 0), 0);
  }, [weekLoads]);

  const loadsPerDayData = useMemo(() => {
    // Build last 7 days series (Mon..Sun style visualization)
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });
    const key = (d) => d.toISOString().slice(0, 10);
    const buckets = Object.fromEntries(days.map((d) => [key(d), { date: key(d), loads: 0, revenue: 0 }]));

    for (const r of weekLoads) {
      const k = key(new Date(r.created_at));
      if (buckets[k]) {
        buckets[k].loads += 1;
        buckets[k].revenue += Number(r.rate) || 0;
      }
    }
    return Object.values(buckets);
  }, [weekLoads]);

  const truckCounts = useMemo(() => {
    const t = { ACTIVE: 0, MAINTENANCE: 0, INACTIVE: 0 };
    for (const tr of trucks) t[tr.status] = (t[tr.status] || 0) + 1;
    return t;
  }, [trucks]);

  const recentActivity = useMemo(() => loads.slice(0, 8), [loads]);

  // ---- UI ------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex items-center gap-2 text-neutral-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading dashboard…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="p-4 rounded-xl border border-red-300/50 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300">
          <p className="font-semibold">Couldn’t load dashboard</p>
          <p className="text-sm opacity-80">{String(error)}</p>
        </div>
        <button
          onClick={() => navigate(0)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
        >
          <Loader2 className="w-4 h-4" /> Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Loads This Week"
          value={weekLoads.length}
          icon={ClipboardList}
          hint={`From ${startOfWeek().toLocaleDateString()} to today`}
          to="/loads"
        />
        <StatCard
          title="Week Revenue"
          value={fmtUSD(totalWeekRevenue)}
          icon={DollarSign}
          hint="Sum of booked load rates"
          to="/loads"
        />
        <StatCard
          title="Active Trucks"
          value={truckCounts.ACTIVE}
          icon={Truck}
          hint={`${truckCounts.MAINTENANCE} in maintenance · ${truckCounts.INACTIVE} inactive`}
          to="/trucks"
        />
        <StatCard
          title="Problem Loads"
          value={countsByStatus.PROBLEM || 0}
          icon={AlertTriangle}
          hint="Requires attention"
          to="/loads?status=PROBLEM"
        />
      </div>

      {/* Loads by status + quick actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Section
          title="Loads by Status"
          action={
            <div className="flex gap-2">
              <Link
                to="/loads/new"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-300/50 dark:border-neutral-700/50 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <PlusCircle className="w-4 h-4" /> Add Load
              </Link>
              <Link
                to="/trucks"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-300/50 dark:border-neutral-700/50 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <Truck className="w-4 h-4" /> Add Truck
              </Link>
            </div>
          }
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { k: "AVAILABLE", label: "Available" },
              { k: "PLANNED", label: "Planned" },
              { k: "IN_TRANSIT", label: "In Transit" },
              { k: "DELIVERED", label: "Delivered" },
              { k: "PROBLEM", label: "Problem" },
              { k: "CANCELLED", label: "Cancelled" },
            ].map(({ k, label }) => (
              <Link
                key={k}
                to={`/loads?status=${k}`}
                className="flex items-center justify-between px-4 py-3 rounded-xl border border-neutral-200/70 dark:border-neutral-800/60 hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
              >
                <span className="text-sm">{label}</span>
                <span className="text-lg font-semibold">{countsByStatus[k] || 0}</span>
              </Link>
            ))}
          </div>
        </Section>

        <Section title="This Week – Loads per Day" action={<span className="text-xs text-neutral-500 flex items-center gap-2"><Activity className="w-4 h-4" /> 7-day view</span>}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={loadsPerDayData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v, name) => (name === "revenue" ? fmtUSD(v) : v)} />
                <Line type="monotone" dataKey="loads" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section
          title="Quick Actions"
          action={
            <Link to="/loads" className="text-sm inline-flex items-center gap-1 opacity-80 hover:opacity-100">
              Go to Loads <ArrowRight className="w-4 h-4" />
            </Link>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <Link to="/loads/new" className="flex items-center gap-2 px-4 py-3 rounded-xl border border-neutral-200/70 dark:border-neutral-800/60 hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
              <PlusCircle className="w-4 h-4" /> Add New Load
            </Link>
            <Link to="/trucks" className="flex items-center gap-2 px-4 py-3 rounded-xl border border-neutral-200/70 dark:border-neutral-800/60 hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
              <Truck className="w-4 h-4" /> Add Truck
            </Link>
            <Link to="/loads?status=IN_TRANSIT" className="flex items-center gap-2 px-4 py-3 rounded-xl border border-neutral-200/70 dark:border-neutral-800/60 hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
              <CheckCheck className="w-4 h-4" /> View In Transit
            </Link>
            <Link to="/loads?status=DELIVERED" className="flex items-center gap-2 px-4 py-3 rounded-xl border border-neutral-200/70 dark:border-neutral-800/60 hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
              <BarChart3 className="w-4 h-4" /> View Delivered
            </Link>
          </div>
        </Section>
      </div>

      {/* Recent activity */}
      <Section title="Recent Activity">
        {recentActivity.length === 0 ? (
          <p className="text-sm text-neutral-500">No recent loads yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {recentActivity.map((l) => (
              <li key={l.id} className="py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    <span className="opacity-80">#{l.id}</span> · {l.shipper || "Unknown Shipper"}
                  </p>
                  <p className="text-xs text-neutral-500 truncate">
                    {l.origin || "—"} → {l.destination || "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{l.status}</p>
                  <p className="text-xs text-neutral-500">{new Date(l.created_at).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
