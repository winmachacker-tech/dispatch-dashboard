import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ClipboardList, Truck, CheckCircle2, AlertTriangle, Clock4, FileText, Filter, RefreshCw } from "lucide-react";

import SectionCard from "@/components/ui/SectionCard.jsx";
import MetricCard from "@/components/ui/MetricCard.jsx";
import Sparkline from "@/components/ui/Sparkline.jsx";
import Donut from "@/components/charts/Donut.jsx";
import WeeklyTrend from "@/components/charts/WeeklyTrend.jsx";

function cx(...a) { return a.filter(Boolean).join(" "); }

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    total: 0, inTransit: 0, delivered: 0, problems: 0,
    appointments: 0, idle: 0, awaitingDocs: 0, onTimePct: 0, slaBreaches: 0
  });
  const [trend, setTrend] = useState([]);
  const [dist, setDist] = useState([]);
  const [awaitingRows, setAwaitingRows] = useState([]);
  const [range, setRange] = useState("7d"); // 7d | 14d | 30d

  const sampleTrend = useMemo(
    () => [{ d:"Mon",v:6},{d:"Tue",v:7},{d:"Wed",v:5},{d:"Thu",v:9},{d:"Fri",v:8},{d:"Sat",v:10},{d:"Sun",v:9}],
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      // Loads
      const { data: loads, error } = await supabase
        .from("loads")
        .select("id,status,customer,doc_status,updated_at")
        .limit(2000);

      if (error) console.error("[Dashboard] loads error", error);

      const list = loads || [];
      const total = list.length;
      const norm = (s) => (s || "").toUpperCase();

      const inTransit = list.filter(l => norm(l.status) === "IN_TRANSIT").length;
      const delivered = list.filter(l => norm(l.status) === "DELIVERED").length;
      const problems  = list.filter(l => norm(l.status) === "PROBLEM").length;

      const awaiting = list.filter(l => norm(l.doc_status) === "AWAITING");
      const awaitingDocs = awaiting.length;

      const distData = [
        { name: "In Transit", value: inTransit },
        { name: "Delivered", value: delivered },
        { name: "Problem", value: problems },
        { name: "Other", value: Math.max(total - inTransit - delivered - problems, 0) },
      ];

      // NOTE: wire to your RPC when ready; fallback to sample
      const weekly = sampleTrend;

      if (!cancelled) {
        setCounts({
          total, inTransit, delivered, problems,
          appointments: 0, // TODO: hook appointments table
          idle: 0,         // TODO: hook trucks table
          awaitingDocs,
          onTimePct: 93,
          slaBreaches: 0,
        });
        setAwaitingRows(awaiting.slice(0, 8));
        setDist(distData);
        setTrend(weekly);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [range, sampleTrend]);

  const ActionButtons = (
    <div className="flex gap-2">
      <button className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800">+ Load</button>
      <button className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800">+ Driver</button>
      <button className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800">+ Truck</button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-400">Live operations overview</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-zinc-700 bg-zinc-900 p-1">
            {["7d","14d","30d"].map((r) => (
              <button
                key={r}
                className={cx(
                  "px-3 py-1.5 text-xs rounded-lg",
                  range === r ? "bg-zinc-800 text-zinc-100" : "text-zinc-300 hover:bg-zinc-800/60"
                )}
                onClick={() => setRange(r)}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800">
            <Filter className="size-4" /> Filters
          </button>
          <button
            className="flex items-center gap-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
            onClick={() => window.location.reload()}
            title="Hard refresh data"
          >
            <RefreshCw className="size-4" /> Refresh
          </button>
          {ActionButtons}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard loading={loading} label="Total Loads" value={counts.total} intent="info" icon={ClipboardList} delta={4} hint="vs prior period" />
        <MetricCard
          loading={loading}
          label="In Transit"
          value={counts.inTransit}
          intent="warn"
          icon={Truck}
          delta={-3}
          hint="active linehaul"
          footer={<Sparkline data={trend.map(t => ({ v: t.v }))} />}
        />
        <MetricCard loading={loading} label="Delivered" value={counts.delivered} intent="ok" icon={CheckCircle2} delta={7} hint="closed successfully" />
        <MetricCard loading={loading} label="Problem Loads" value={counts.problems} intent="bad" icon={AlertTriangle} delta={0} hint="needs attention" />
      </div>

      {/* Ops strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <MetricCard loading={loading} label="Appointments Today" value={counts.appointments} icon={Clock4} />
        <MetricCard loading={loading} label="Idle Trucks" value={counts.idle} icon={Truck} />
        <MetricCard loading={loading} label="Awaiting Docs" value={counts.awaitingDocs} icon={FileText} />
        <MetricCard loading={loading} label="On-Time %" value={`${counts.onTimePct}%`} intent="ok" />
        <MetricCard loading={loading} label="SLA Breaches" value={counts.slaBreaches} intent="bad" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 auto-rows-min">
        <SectionCard title="Load Distribution">
          {loading ? <div className="h-64 animate-pulse rounded-md bg-zinc-800/40" /> : <Donut data={dist} />}
        </SectionCard>
        <SectionCard title="Weekly Load Trend" className="xl:col-span-2">
          {loading ? <div className="h-64 animate-pulse rounded-md bg-zinc-800/40" /> : <WeeklyTrend data={trend} />}
        </SectionCard>
      </div>

      {/* Worklists */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SectionCard title="Awaiting Documents" actions={
          <button className="text-xs text-zinc-300 hover:underline">View all</button>
        }>
          {loading ? (
            <div className="h-40 animate-pulse rounded-md bg-zinc-800/40" />
          ) : awaitingRows.length === 0 ? (
            <div className="h-40 grid place-items-center text-sm text-zinc-400">No loads awaiting documents.</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="text-zinc-400">
                  <tr>
                    <th className="py-2 text-left font-medium">Load #</th>
                    <th className="py-2 text-left font-medium">Customer</th>
                    <th className="py-2 text-left font-medium">Status</th>
                    <th className="py-2 text-left font-medium">Aging</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody className="text-zinc-200/90">
                  {awaitingRows.map((row, i) => (
                    <tr key={row.id || i} className="border-t border-zinc-800">
                      <td className="py-2 tabular-nums">{row.id || "—"}</td>
                      <td className="py-2">{row.customer || "—"}</td>
                      <td className="py-2">{row.status || "—"}</td>
                      <td className="py-2">—</td>
                      <td className="py-2 text-right">
                        <button className="rounded-lg border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800">Request POD</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Live Alerts" actions={<span className="text-xs text-zinc-400">aria-live</span>}>
          <ul className="space-y-2 text-sm text-zinc-200/90" aria-live="polite">
            <li className="rounded-lg border border-amber-700/40 bg-amber-900/10 p-2">Load USK-00451 ETA slip: 45 min late</li>
            <li className="rounded-lg border border-rose-700/40 bg-rose-900/10 p-2">Driver needs lumper code at Costco Tracy</li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
