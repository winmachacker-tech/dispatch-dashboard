// src/pages/ProblemBoard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  AlertTriangle,
  BadgeInfo,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  Cell,
} from "recharts";

/* ---------------------------------- UX ---------------------------------- */

const SEVERITY = /** @type {const} */ ({
  CRITICAL: "CRITICAL",
  MAJOR: "MAJOR",
  MINOR: "MINOR",
});

const ISSUE_TYPES = [
  "POD_MISSING",
  "LATE_DELIVERY",
  "TRACKING_OFFLINE",
  "NO_DRIVER_RESPONSE",
  "APPOINTMENT_AT_RISK",
  "DOCUMENT_ERROR",
  "OTHER",
];

const severityStyles = {
  [SEVERITY.CRITICAL]:
    "bg-red-500/15 text-red-300 border border-red-500/30",
  [SEVERITY.MAJOR]:
    "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  [SEVERITY.MINOR]:
    "bg-sky-500/15 text-sky-300 border border-sky-500/30",
};

function SevBadge({ level }) {
  if (!level) return null;
  const Icon =
    level === SEVERITY.CRITICAL
      ? ShieldAlert
      : level === SEVERITY.MAJOR
      ? TriangleAlert
      : BadgeInfo;
  return (
    <span
      className={
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs " +
        (severityStyles[level] || "bg-neutral-700/40 text-neutral-200 border border-neutral-600/30")
      }
      title={level}
    >
      <Icon className="w-3.5 h-3.5" />
      {level}
    </span>
  );
}

function StatCard({ title, value, icon: Icon, subtitle }) {
  return (
    <div className="rounded-2xl p-4 border border-neutral-800 bg-neutral-900/40 backdrop-blur-sm shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-400">{title}</span>
        {Icon ? <Icon className="w-4 h-4 text-neutral-400" /> : null}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
      {subtitle ? (
        <div className="mt-1 text-xs text-neutral-500">{subtitle}</div>
      ) : null}
    </div>
  );
}

function Drawer({ open, onClose, children }) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 transition-colors ${
          open ? "bg-black/50" : "pointer-events-none bg-transparent"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed right-0 top-0 z-50 h-full w-[480px] max-w-[92vw] transform bg-neutral-950 border-l border-neutral-800 shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-neutral-400" />
            <span className="font-medium">Issue Details</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-neutral-900"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-57px)]">{children}</div>
      </div>
    </>
  );
}

/* -------------------------- Data helpers / guards ------------------------- */

/** Try to infer severity when column not present */
function inferSeverity(issueType) {
  switch (issueType) {
    case "LATE_DELIVERY":
    case "NO_DRIVER_RESPONSE":
      return SEVERITY.CRITICAL;
    case "TRACKING_OFFLINE":
    case "APPOINTMENT_AT_RISK":
      return SEVERITY.MAJOR;
    case "POD_MISSING":
    case "DOCUMENT_ERROR":
    default:
      return SEVERITY.MINOR;
  }
}

/** Safely read a field (unknown schema protection) */
function get(r, key, fallback = null) {
  return r && Object.prototype.hasOwnProperty.call(r, key) ? r[key] : fallback;
}

/* --------------------------------- Page ---------------------------------- */

export default function ProblemBoard() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [sevFilter, setSevFilter] = useState("ALL");
  const [onlyCritical, setOnlyCritical] = useState(false);
  const [selected, setSelected] = useState(null);
  const subRef = useRef(null);
  const [refreshKey, setRefreshKey] = useState(0);

  /* ------------------------------ Fetch issues ------------------------------ */
  const fetchIssues = async () => {
    setLoading(true);
    // We read * broadly, then derive fields so we don't 500 on missing columns
    const { data, error } = await supabase
      .from("loads")
      .select("*")
      .eq("problem_flag", true)
      .order("updated_at", { ascending: false });
    if (error) {
      console.error("[ProblemBoard] fetch error", error);
      setRows([]);
    } else {
      setRows(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIssues();
  }, [refreshKey]);

  /* ------------------------ Live updates from Supabase ----------------------- */
  useEffect(() => {
    // clean previous
    if (subRef.current) {
      supabase.removeChannel(subRef.current);
      subRef.current = null;
    }
    const channel = supabase
      .channel("problem-board-loads")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "loads" },
        (payload) => {
          const newRow = payload.new || payload.old;
          // Only react if problem_flag could be involved
          if (!newRow) return;
          setRefreshKey((k) => k + 1);
        }
      )
      .subscribe();
    subRef.current = channel;
    return () => {
      if (subRef.current) {
        supabase.removeChannel(subRef.current);
        subRef.current = null;
      }
    };
  }, []);

  /* ------------------------------ Derived views ----------------------------- */
  const normalized = useMemo(() => {
    return rows.map((r) => {
      const id = get(r, "id");
      const ref = get(r, "reference") ?? get(r, "pro_number") ?? `L${id}`;
      const customer = get(r, "customer") ?? get(r, "customer_name") ?? "—";
      const driver = get(r, "driver_name") ?? get(r, "driver") ?? "—";
      const issueType = get(r, "issue_type") ?? "OTHER";
      const severity = get(r, "issue_severity") ?? inferSeverity(issueType);
      const updatedAt = get(r, "updated_at") ?? get(r, "modified_at");
      const status = (get(r, "status") ?? "UNKNOWN").toUpperCase();
      const notes =
        get(r, "ops_notes") ??
        get(r, "notes") ??
        get(r, "problem_notes") ??
        "";
      return {
        raw: r,
        id,
        ref,
        customer,
        driver,
        issueType,
        severity,
        updatedAt,
        status,
        notes,
      };
    });
  }, [rows]);

  const filtered = useMemo(() => {
    let list = normalized;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          String(r.id).includes(q) ||
          r.ref.toLowerCase().includes(q) ||
          r.customer.toLowerCase().includes(q) ||
          r.driver.toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== "ALL") {
      list = list.filter((r) => r.issueType === typeFilter);
    }
    if (sevFilter !== "ALL") {
      list = list.filter((r) => r.severity === sevFilter);
    }
    if (onlyCritical) {
      list = list.filter((r) => r.severity === SEVERITY.CRITICAL);
    }
    return list;
  }, [normalized, search, typeFilter, sevFilter, onlyCritical]);

  const stats = useMemo(() => {
    const total = normalized.length;
    const critical = normalized.filter((r) => r.severity === SEVERITY.CRITICAL)
      .length;
    const major = normalized.filter((r) => r.severity === SEVERITY.MAJOR)
      .length;
    const minor = normalized.filter((r) => r.severity === SEVERITY.MINOR)
      .length;
    const byType = ISSUE_TYPES.map((t) => ({
      name: t,
      value: normalized.filter((r) => r.issueType === t).length,
    })).filter((x) => x.value > 0);
    return { total, critical, major, minor, byType };
  }, [normalized]);

  /* --------------------------------- Actions -------------------------------- */
  const markResolved = async (row) => {
    const { error } = await supabase
      .from("loads")
      .update({ problem_flag: false })
      .eq("id", row.id);
    if (error) {
      console.error("[ProblemBoard] resolve error", error);
    } else {
      setSelected(null);
      setRefreshKey((k) => k + 1);
    }
  };

  const escalate = async (row) => {
    // soft example: bump a derived severity field if available
    const nextSev =
      row.severity === SEVERITY.MINOR
        ? SEVERITY.MAJOR
        : SEVERITY.CRITICAL;
    const patch = {};
    // write to issue_severity if present, otherwise attach to ops_notes
    if ("issue_severity" in row.raw) patch.issue_severity = nextSev;
    if (!("issue_severity" in row.raw)) {
      const existing =
        get(row.raw, "ops_notes") ??
        get(row.raw, "notes") ??
        get(row.raw, "problem_notes") ??
        "";
      patch.ops_notes = `[Escalated to ${nextSev} at ${new Date().toLocaleString()}]\n${existing}`;
    }
    const { error } = await supabase.from("loads").update(patch).eq("id", row.id);
    if (error) {
      console.error("[ProblemBoard] escalate error", error);
    } else {
      setRefreshKey((k) => k + 1);
    }
  };

  /* ---------------------------------- UI ----------------------------------- */

  return (
    <div className="p-6 md:p-8 w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-400" />
          <h1 className="text-2xl md:text-3xl font-semibold">Problem Board</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Issues" value={stats.total} icon={Bell} />
        <StatCard
          title="Critical"
          value={stats.critical}
          icon={ShieldAlert}
          subtitle="Require immediate attention"
        />
        <StatCard title="Major" value={stats.major} icon={TriangleAlert} />
        <StatCard title="Minor" value={stats.minor} icon={BadgeInfo} />
      </div>

      {/* Filters */}
      <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Load ID, reference, customer, driver..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 outline-none focus:ring-2 ring-neutral-700"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Type filter */}
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="appearance-none pr-8 pl-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800"
                title="Filter by issue type"
              >
                <option value="ALL">All Types</option>
                {ISSUE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
            </div>

            {/* Severity filter */}
            <div className="relative">
              <select
                value={sevFilter}
                onChange={(e) => setSevFilter(e.target.value)}
                className="appearance-none pr-8 pl-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800"
                title="Filter by severity"
              >
                <option value="ALL">All Severity</option>
                <option value={SEVERITY.CRITICAL}>Critical</option>
                <option value={SEVERITY.MAJOR}>Major</option>
                <option value={SEVERITY.MINOR}>Minor</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
            </div>

            {/* Critical only */}
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 cursor-pointer">
              <input
                type="checkbox"
                className="accent-amber-500"
                checked={onlyCritical}
                onChange={(e) => setOnlyCritical(e.target.checked)}
              />
              <span className="text-sm text-neutral-300">Critical only</span>
            </label>

            <div className="hidden md:flex items-center gap-2 text-neutral-500">
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filters</span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Table */}
        <div className="lg:col-span-8 rounded-2xl border border-neutral-800 bg-neutral-950/60 overflow-hidden">
          <div className="border-b border-neutral-800 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-neutral-500" />
              <span className="text-sm text-neutral-400">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-neutral-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading…
              </div>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-neutral-400">
                <tr className="border-b border-neutral-800">
                  <th className="text-left px-4 py-3">Load</th>
                  <th className="text-left px-4 py-3">Customer</th>
                  <th className="text-left px-4 py-3">Driver</th>
                  <th className="text-left px-4 py-3">Issue</th>
                  <th className="text-left px-4 py-3">Severity</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Updated</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-neutral-900 hover:bg-neutral-900/40"
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelected(r)}
                        className="text-neutral-100 hover:underline"
                        title="Open details"
                      >
                        {r.ref}
                      </button>
                      <div className="text-xs text-neutral-500">#{r.id}</div>
                    </td>
                    <td className="px-4 py-3">{r.customer}</td>
                    <td className="px-4 py-3">{r.driver}</td>
                    <td className="px-4 py-3">{r.issueType}</td>
                    <td className="px-4 py-3">
                      <SevBadge level={r.severity} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs rounded-lg px-2 py-1 bg-neutral-800/60 border border-neutral-700/60">
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-neutral-400">
                        {r.updatedAt
                          ? new Date(r.updatedAt).toLocaleString()
                          : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => escalate(r)}
                          className="px-2 py-1 text-xs rounded-lg border border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                          title="Escalate"
                        >
                          Escalate
                        </button>
                        <button
                          onClick={() => markResolved(r)}
                          className="px-2 py-1 text-xs rounded-lg border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 inline-flex items-center gap-1"
                          title="Mark resolved"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Resolve
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <div className="text-neutral-400">No issues match.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right rail: Breakdown + Guidance */}
        <div className="lg:col-span-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="font-medium">Issue Breakdown</span>
              </div>
              <span className="text-xs text-neutral-500 flex items-center gap-1">
                <ChevronRight className="w-3 h-3" />
                by Type
              </span>
            </div>

            <div className="h-56 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.byType}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                  >
                    {stats.byType.map((_, i) => (
                      <Cell key={i} />
                    ))}
                  </Pie>
                  <ReTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {stats.byType.map((x) => (
                <div
                  key={x.name}
                  className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/40 px-3 py-2"
                >
                  <span className="text-neutral-300">{x.name}</span>
                  <span className="font-medium">{x.value}</span>
                </div>
              ))}
              {stats.byType.length === 0 && (
                <div className="text-neutral-400 text-sm">
                  No distribution yet.
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <ChevronRight className="w-4 h-4 text-neutral-500" />
              <span className="font-medium">Playbook</span>
            </div>
            <ul className="space-y-2 text-sm text-neutral-300">
              <li className="flex gap-2">
                <ChevronRight className="w-4 h-4 mt-0.5 text-neutral-500" />
                Acknowledge new Critical items within 10 minutes.
              </li>
              <li className="flex gap-2">
                <ChevronRight className="w-4 h-4 mt-0.5 text-neutral-500" />
                Add internal notes on escalations (auto logged when severity
                changes).
              </li>
              <li className="flex gap-2">
                <ChevronRight className="w-4 h-4 mt-0.5 text-neutral-500" />
                Resolve by clearing <code>problem_flag</code> once mitigated.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Drawer */}
      <Drawer open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <div className="p-4 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-neutral-500">Load</div>
                <div className="text-xl font-semibold">{selected.ref}</div>
                <div className="text-xs text-neutral-500">#{selected.id}</div>
              </div>
              <SevBadge level={selected.severity} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-neutral-800 p-3 bg-neutral-900/40">
                <div className="text-xs text-neutral-500">Customer</div>
                <div className="font-medium">{selected.customer}</div>
              </div>
              <div className="rounded-xl border border-neutral-800 p-3 bg-neutral-900/40">
                <div className="text-xs text-neutral-500">Driver</div>
                <div className="font-medium">{selected.driver}</div>
              </div>
              <div className="rounded-xl border border-neutral-800 p-3 bg-neutral-900/40">
                <div className="text-xs text-neutral-500">Issue Type</div>
                <div className="font-medium">{selected.issueType}</div>
              </div>
              <div className="rounded-xl border border-neutral-800 p-3 bg-neutral-900/40">
                <div className="text-xs text-neutral-500">Status</div>
                <div className="font-medium">{selected.status}</div>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-800 p-3 bg-neutral-900/40">
              <div className="text-xs text-neutral-500 mb-1">Notes</div>
              <pre className="whitespace-pre-wrap text-sm text-neutral-300">
                {selected.notes || "—"}
              </pre>
            </div>

            <div className="text-xs text-neutral-500">
              Last updated:{" "}
              {selected.updatedAt
                ? new Date(selected.updatedAt).toLocaleString()
                : "—"}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => escalate(selected)}
                className="px-3 py-2 rounded-xl border border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
              >
                Escalate
              </button>
              <button
                onClick={() => markResolved(selected)}
                className="px-3 py-2 rounded-xl border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 inline-flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark Resolved
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
