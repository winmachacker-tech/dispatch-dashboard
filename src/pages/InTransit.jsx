// src/pages/InTransit.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Loader2,
  RefreshCw,
  Search as SearchIcon,
  Filter as FilterIcon,
  MapPin,
  ArrowRight,
  Clock,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Truck,
} from "lucide-react";

/* ----------------------------- helpers ----------------------------- */

const STATUS_COLORS = {
  IN_TRANSIT:
    "bg-blue-100 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-900/40",
  AT_RISK:
    "bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900/40",
  PROBLEM:
    "bg-rose-100 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:ring-rose-900/40",
  DELIVERED:
    "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/40",
};

function chip(text, variant = "IN_TRANSIT") {
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold " +
        (STATUS_COLORS[variant] || STATUS_COLORS.IN_TRANSIT)
      }
    >
      {variant === "PROBLEM" ? (
        <ShieldAlert className="h-3.5 w-3.5" />
      ) : variant === "AT_RISK" ? (
        <AlertTriangle className="h-3.5 w-3.5" />
      ) : variant === "DELIVERED" ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <Truck className="h-3.5 w-3.5" />
      )}
      {text}
    </span>
  );
}

function formatPlace(city, state) {
  if (!city && !state) return "—";
  if (!city) return state ?? "—";
  if (!state) return city;
  return `${city}, ${state}`;
}

function matchQuery(load, q) {
  if (!q) return true;
  const hay = [
    load?.reference,
    load?.customer,
    load?.driver_name,
    load?.origin_city,
    load?.origin_state,
    load?.dest_city,
    load?.dest_state,
    load?.truck_number,
    load?.broker,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

const SAMPLE = [
  {
    id: "S-1001",
    reference: "USKO-8821",
    customer: "Crowley",
    broker: "Crowley",
    driver_name: "A. Petrov",
    truck_number: "421",
    status: "IN_TRANSIT",
    problem_flag: false,
    at_risk: false,
    origin_city: "Stockton",
    origin_state: "CA",
    dest_city: "Tacoma",
    dest_state: "WA",
    eta: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
  },
  {
    id: "S-1002",
    reference: "USKO-8832",
    customer: "Apex Logistics",
    broker: "Apex",
    driver_name: "J. Smith",
    truck_number: "513",
    status: "AT_RISK",
    problem_flag: false,
    at_risk: true,
    origin_city: "Reno",
    origin_state: "NV",
    dest_city: "Denver",
    dest_state: "CO",
    eta: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "S-1003",
    reference: "USKO-8837",
    customer: "Gander Group",
    broker: "Gander",
    driver_name: "D. Reyes",
    truck_number: "208",
    status: "PROBLEM",
    problem_flag: true,
    at_risk: true,
    origin_city: "Tracy",
    origin_state: "CA",
    dest_city: "Phoenix",
    dest_state: "AZ",
    eta: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
  },
];

/* ----------------------------- component ----------------------------- */

export default function InTransitPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL"); // ALL | IN_TRANSIT | AT_RISK | PROBLEM
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [reloading, setReloading] = useState(false);

  const fetchLoads = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      // ✅ Query the robust view (handles nulls & schema drift)
      const { data, error } = await supabase
        .from("v_in_transit")
        .select(
          "id,reference,customer,broker,driver_name,truck_number,status,problem_flag,at_risk,origin_city,origin_state,dest_city,dest_state,eta"
        )
        .limit(1000);

      if (error) throw error;

      const normalized = (data || []).map((r) => ({
        ...r,
        at_risk: !!r.at_risk,
        problem_flag: !!r.problem_flag,
      }));

      setRows(normalized);
    } catch (e) {
      // Fallback to sample so UI is never empty
      setErr(e?.message || "Failed to load data.");
      setRows(SAMPLE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLoads();
  }, [fetchLoads]);

  const reload = async () => {
    setReloading(true);
    await fetchLoads();
    setReloading(false);
  };

  const filtered = useMemo(() => {
    return rows
      .filter((r) => {
        if (status === "ALL") return true;
        if (status === "IN_TRANSIT") return r.status === "IN_TRANSIT";
        if (status === "AT_RISK") return r.at_risk === true;
        if (status === "PROBLEM") return r.problem_flag === true || r.status === "PROBLEM";
        return true;
      })
      .filter((r) => matchQuery(r, q));
  }, [rows, status, q]);

  return (
    <div className="px-4 py-4 md:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span>USKO | Ops</span>
          <span>•</span>
          <span>Enterprise TMS</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            In-Transit
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={reload}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900"
            >
              {reloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ref/customer/driver/origin/dest"
            className="h-9 w-80 rounded-lg border border-neutral-300 bg-white px-3 pr-8 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
          <SearchIcon className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
        </div>

        <button
          type="button"
          className="inline-flex h-9 items-center rounded-lg border border-neutral-300 bg-white px-2 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900"
          title="Filters"
        >
          <FilterIcon className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1">
          {["ALL", "IN_TRANSIT", "AT_RISK", "PROBLEM"].map((s) => {
            const active = status === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                aria-pressed={active}
                className={[
                  "inline-flex h-9 items-center rounded-full px-3 text-xs font-medium border transition-colors",
                  active
                    ? "border-blue-500 text-blue-600 ring-2 ring-blue-500/30 bg-blue-50 dark:bg-blue-950/30"
                    : "border-neutral-300 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800",
                ].join(" ")}
              >
                {s === "ALL"
                  ? "ALL"
                  : s === "IN_TRANSIT"
                  ? "In-Transit"
                  : s === "AT_RISK"
                  ? "At-Risk"
                  : "Problem"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950/50">
        <div className="sticky top-0 z-10 grid grid-cols-12 gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
          <div className="col-span-2">Load / Customer</div>
          <div className="col-span-3">Route</div>
          <div className="col-span-2">Driver / Truck</div>
          <div className="col-span-2">ETA</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-neutral-500 dark:text-neutral-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading in-transit loads…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-neutral-500 dark:text-neutral-400">
            No loads match your filters.
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {filtered.map((r) => (
              <li
                key={r.id}
                className="grid grid-cols-12 items-center gap-3 px-4 py-3 hover:bg-neutral-50/70 dark:hover:bg-neutral-900/40"
              >
                {/* Load / Customer */}
                <div className="col-span-2 min-w-0">
                  <div className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {r.reference || (r.id ? String(r.id).slice(0, 8) : "—")}
                  </div>
                  <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {r.customer || r.broker || "—"}
                  </div>
                </div>

                {/* Route */}
                <div className="col-span-3 min-w-0">
                  <div className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200">
                    <MapPin className="h-4 w-4 opacity-60" />
                    <span className="truncate">
                      {formatPlace(r.origin_city, r.origin_state)}
                    </span>
                    <ArrowRight className="h-4 w-4 opacity-60" />
                    <span className="truncate">
                      {formatPlace(r.dest_city, r.dest_state)}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {r.broker ? `Broker: ${r.broker}` : "\u00A0"}
                  </div>
                </div>

                {/* Driver / Truck */}
                <div className="col-span-2">
                  <div className="text-sm text-neutral-800 dark:text-neutral-200">
                    {r.driver_name || "Unassigned"}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    {r.truck_number ? `Truck ${r.truck_number}` : "—"}
                  </div>
                </div>

                {/* ETA */}
                <div className="col-span-2">
                  <div className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200">
                    <Clock className="h-4 w-4 opacity-60" />
                    <span>{r.eta ? new Date(r.eta).toLocaleString() : "—"}</span>
                  </div>
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {chip(
                      r.status?.replaceAll("_", " ") || "In-Transit",
                      r.problem_flag
                        ? "PROBLEM"
                        : r.at_risk
                        ? "AT_RISK"
                        : r.status || "IN_TRANSIT"
                    )}
                    {r.problem_flag ? chip("Problem", "PROBLEM") : null}
                    {r.at_risk && !r.problem_flag ? chip("At-Risk", "AT_RISK") : null}
                  </div>
                </div>

                {/* Actions */}
                <div className="col-span-1 text-right">
                  <a
                    href={`/loads?id=${encodeURIComponent(r.id)}`}
                    className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Open
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Non-blocking error banner */}
        {err && (
          <div className="border-t border-neutral-200 bg-amber-50 px-4 py-2 text-xs text-amber-700 dark:border-neutral-800 dark:bg-amber-900/20 dark:text-amber-300">
            <span className="font-semibold">Note:</span> {err} — showing sample
            data so the page remains usable.
          </div>
        )}
      </div>
    </div>
  );
}
