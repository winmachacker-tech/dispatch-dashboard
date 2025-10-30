import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../lib/supabase"; // default export 'supabase' expected
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Truck,
  FileText,
  Paperclip,
  X,
} from "lucide-react";

/* ----------------------------- utilities ----------------------------- */

const fmtDT = (v) => (v ? new Date(v).toLocaleString() : "—");
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString() : "—");
const clamp = (n, a, b) => Math.max(a, Math.min(n, b));
const toTitle = (s) => (s ? String(s).replace(/\s+/g, " ").trim() : "");
const legText = (row) => {
  // tries several field patterns; falls back gracefully
  const oc = row.origin_city || row.origin || row.pickup_city || row.o_city;
  const os = row.origin_state || row.o_state || "";
  const dc = row.dest_city || row.destination || row.delivery_city || row.d_city;
  const ds = row.dest_state || row.d_state || "";
  const left = [oc, os].filter(Boolean).join(", ");
  const right = [dc, ds].filter(Boolean).join(", ");
  if (!left && !right && row.leg) return row.leg;
  if (!left && !right) return "—";
  return `${left} → ${right}`;
};

const etaHealth = (row) => {
  // Returns {label, tone} where tone drives chip color
  // Priority order: Delayed > At Risk > On Time
  const now = Date.now();
  const eta = row.eta_at ? new Date(row.eta_at).getTime() : null;
  const delAppt = row.delivery_appointment || row.delivery_at || row.delivery_date;
  const deliveryDue = delAppt ? new Date(delAppt).getTime() : null;

  // treat non-ETA rows as unknown/on-time unless delivery window is in the past
  if (deliveryDue && now > deliveryDue + 60 * 60 * 1000) return { label: "Delayed", tone: "danger" };

  if (!eta) return { label: "—", tone: "muted" };

  const hrs = (eta - now) / 36e5;

  if (hrs < -0.5) return { label: "Delayed", tone: "danger" };
  if (hrs < 2) return { label: "At Risk", tone: "warn" };
  return { label: "On Time", tone: "ok" };
};

const statusTone = (status, health) => {
  const s = String(status || "").toUpperCase();
  if (health?.tone === "danger") return "danger";
  if (health?.tone === "warn") return "warn";
  if (s.includes("PROBLEM")) return "danger";
  if (s.includes("HOLD")) return "warn";
  return "info";
};

const chipToneClass = (tone) => {
  switch (tone) {
    case "danger":
      return "bg-red-500/10 text-red-400 ring-1 ring-red-500/30";
    case "warn":
      return "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30";
    case "ok":
      return "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30";
    case "muted":
      return "bg-neutral-500/10 text-neutral-400 ring-1 ring-neutral-500/20";
    default:
      return "bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/30";
  }
};

const Chip = ({ tone = "info", children, icon: Icon }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${chipToneClass(tone)}`}>
    {Icon ? <Icon className="size-3.5" /> : null}
    {children}
  </span>
);

const ProgressBar = ({ value }) => {
  const v = clamp(Math.round(value ?? 0), 0, 100);
  return (
    <div className="h-2 w-40 rounded-full bg-neutral-800 ring-1 ring-neutral-700 overflow-hidden">
      <div className="h-full bg-sky-500" style={{ width: `${v}%` }} />
    </div>
  );
};

const Modal = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-2xl bg-neutral-900 ring-1 ring-neutral-800 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

/* ------------------------------ component ----------------------------- */

export default function InTransitPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // UX controls
  const [q, setQ] = useState("");
  const [dispatcher, setDispatcher] = useState("ALL");
  const [healthFilter, setHealthFilter] = useState("ALL");

  // modal
  const [active, setActive] = useState(null);

  // fetch data
  const fetchRows = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("loads")
      .select("*")
      .eq("status", "IN_TRANSIT")
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error) console.error("[InTransit] select error", error);
    setRows(data || []);
    setLoading(false);
  }, []);

  // initial + realtime
  useEffect(() => {
    fetchRows();

    const channel = supabase
      .channel("loads_in_transit")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "loads" },
        (payload) => {
          const row = payload.new || payload.old;
          // only care if row is/was in transit
          const isTransit =
            (payload.new && payload.new.status === "IN_TRANSIT") ||
            (payload.old && payload.old.status === "IN_TRANSIT");
          if (isTransit) fetchRows();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRows]);

  /* ------------------------------- filters ------------------------------ */

  const dispatchers = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      const d = r.dispatcher || r.dispatcher_name || r.assigned_to || r.owner;
      if (d) set.add(String(d));
    });
    return ["ALL", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase();
    return rows.filter((r) => {
      // search
      if (qn) {
        const hay =
          [
            r.shipper,
            r.customer,
            r.broker,
            r.reference,
            r.ref_num,
            r.pro_number,
            r.driver,
            r.dispatcher,
            r.truck_number,
            r.trailer_number,
            legText(r),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase() || "";
        if (!hay.includes(qn)) return false;
      }
      // dispatcher
      if (dispatcher !== "ALL") {
        const d = r.dispatcher || r.dispatcher_name || r.assigned_to || r.owner || "";
        if (String(d) !== dispatcher) return false;
      }
      // health
      if (healthFilter !== "ALL") {
        const h = etaHealth(r);
        if (healthFilter === "OK" && h.tone !== "ok") return false;
        if (healthFilter === "WARN" && h.tone !== "warn") return false;
        if (healthFilter === "DANGER" && h.tone !== "danger") return false;
      }
      return true;
    });
  }, [rows, q, dispatcher, healthFilter]);

  /* -------------------------------- KPIs -------------------------------- */

  const kpis = useMemo(() => {
    const total = filtered.length;
    let ok = 0,
      warn = 0,
      danger = 0;

    let etaSumHrs = 0;
    let etaCount = 0;

    filtered.forEach((r) => {
      const h = etaHealth(r);
      if (h.tone === "ok") ok++;
      else if (h.tone === "warn") warn++;
      else if (h.tone === "danger") danger++;

      if (r.eta_at) {
        etaSumHrs += (new Date(r.eta_at).getTime() - Date.now()) / 36e5;
        etaCount++;
      }
    });

    const avgEta = etaCount ? Math.max(0, etaSumHrs / etaCount) : null;

    return { total, ok, warn, danger, avgEtaHrs: avgEta };
  }, [filtered]);

  /* ----------------------------- row renderer --------------------------- */

  const Row = ({ r }) => {
    const h = etaHealth(r);
    const tone = statusTone(r.status, h);

    // derive % progress if you store miles_remaining or pct_complete
    const pct =
      r.pct_complete ??
      (typeof r.miles_remaining === "number" && typeof r.miles_total === "number"
        ? Math.round((1 - r.miles_remaining / Math.max(1, r.miles_total)) * 100)
        : null);

    const dispatcherName = r.dispatcher || r.dispatcher_name || r.assigned_to || r.owner || "—";
    const pickup = r.pickup_appointment || r.pickup_at || r.pickup_date || null;
    const delivery = r.delivery_appointment || r.delivery_at || r.delivery_date || null;

    return (
      <tr
        className="group cursor-pointer hover:bg-neutral-900/50"
        onClick={() => setActive(r)}
        title="Open details"
      >
        <td className="px-4 py-3 text-sm">{toTitle(r.shipper || r.customer || r.broker || "—")}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <MapPin className="size-4 text-neutral-400" />
            <div className="text-sm">{legText(r)}</div>
            {pct != null ? <ProgressBar value={pct} /> : null}
          </div>
        </td>
        <td className="px-4 py-3 text-sm">{dispatcherName}</td>
        <td className="px-4 py-3 text-sm">{fmtDate(pickup)}</td>
        <td className="px-4 py-3 text-sm">{fmtDate(delivery)}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Chip tone={tone}>{String(r.status || "—").toUpperCase()}</Chip>
            <Chip
              tone={h.tone}
              icon={h.tone === "danger" ? AlertTriangle : h.tone === "ok" ? CheckCircle2 : Clock}
            >
              {h.label}
            </Chip>
            {r.problem_flag ? (
              <Chip tone="warn" icon={AlertTriangle}>
                Problem
              </Chip>
            ) : null}
          </div>
        </td>
      </tr>
    );
  };

  /* --------------------------------- UI --------------------------------- */

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">In Transit</h1>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search shipper, reference, driver, lane…"
            className="w-72 rounded-xl bg-neutral-900 px-9 py-2 text-sm outline-none ring-1 ring-neutral-800 placeholder:text-neutral-500 focus:ring-sky-600"
          />
        </div>

        <select
          value={dispatcher}
          onChange={(e) => setDispatcher(e.target.value)}
          className="rounded-xl bg-neutral-900 px-3 py-2 text-sm outline-none ring-1 ring-neutral-800 focus:ring-sky-600"
        >
          {dispatchers.map((d) => (
            <option key={d} value={d}>
              {d === "ALL" ? "All Dispatchers" : d}
            </option>
          ))}
        </select>

        <select
          value={healthFilter}
          onChange={(e) => setHealthFilter(e.target.value)}
          className="rounded-xl bg-neutral-900 px-3 py-2 text-sm outline-none ring-1 ring-neutral-800 focus:ring-sky-600"
        >
          <option value="ALL">All Health</option>
          <option value="OK">On Time</option>
          <option value="WARN">At Risk</option>
          <option value="DANGER">Delayed</option>
        </select>

        <button
          onClick={fetchRows}
          className="ml-auto rounded-xl bg-neutral-900 px-3 py-2 text-sm ring-1 ring-neutral-800 hover:ring-neutral-700"
        >
          Refresh
        </button>
      </div>

      {/* KPI bar */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-neutral-900 p-4 ring-1 ring-neutral-800">
          <div className="text-sm text-neutral-400">Loads In Transit</div>
          <div className="mt-1 text-2xl font-semibold">{kpis.total}</div>
        </div>
        <div className="rounded-2xl bg-neutral-900 p-4 ring-1 ring-neutral-800">
          <div className="text-sm text-neutral-400">On-Time</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl font-semibold">{kpis.ok}</span>
            <Chip tone="ok">OK</Chip>
          </div>
        </div>
        <div className="rounded-2xl bg-neutral-900 p-4 ring-1 ring-neutral-800">
          <div className="text-sm text-neutral-400">At Risk</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl font-semibold">{kpis.warn}</span>
            <Chip tone="warn">WARN</Chip>
          </div>
        </div>
        <div className="rounded-2xl bg-neutral-900 p-4 ring-1 ring-neutral-800">
          <div className="text-sm text-neutral-400">Delayed</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl font-semibold">{kpis.danger}</span>
            <Chip tone="danger">DELAYED</Chip>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-2xl ring-1 ring-neutral-800">
        <table className="min-w-full divide-y divide-neutral-800">
          <thead className="bg-neutral-950/40 backdrop-blur">
            <tr className="text-left text-sm text-neutral-400">
              <th className="px-4 py-3 font-medium">Shipper</th>
              <th className="px-4 py-3 font-medium">Leg</th>
              <th className="px-4 py-3 font-medium">Dispatcher</th>
              <th className="px-4 py-3 font-medium">Pickup</th>
              <th className="px-4 py-3 font-medium">Delivery</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800 bg-neutral-950/10">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  No loads match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((r) => <Row key={r.id} r={r} />)
            )}
          </tbody>
        </table>
      </div>

      {/* Details modal */}
      <Modal open={!!active} onClose={() => setActive(null)}>
        {active && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-neutral-400">Shipper</div>
                <div className="text-xl font-semibold">{toTitle(active.shipper || active.customer || "—")}</div>
                <div className="mt-1 text-neutral-300">{legText(active)}</div>
              </div>
              <div className="flex gap-2">
                <Chip tone={statusTone(active.status, etaHealth(active))}>{String(active.status || "—").toUpperCase()}</Chip>
                <Chip tone={etaHealth(active).tone}>{etaHealth(active).label}</Chip>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-neutral-900 p-4 ring-1 ring-neutral-800">
                <div className="text-sm text-neutral-400">Dispatcher</div>
                <div className="mt-1 flex items-center gap-2">
                  <Truck className="size-4 text-neutral-400" />
                  <span>{active.dispatcher || active.dispatcher_name || "—"}</span>
                </div>
              </div>
              <div className="rounded-xl bg-neutral-900 p-4 ring-1 ring-neutral-800">
                <div className="text-sm text-neutral-400">Driver / Unit</div>
                <div className="mt-1">
                  <div>Driver: {active.driver || active.driver_name || "—"}</div>
                  <div>Truck: {active.truck_number || "—"} | Trailer: {active.trailer_number || "—"}</div>
                </div>
              </div>

              <div className="rounded-xl bg-neutral-900 p-4 ring-1 ring-neutral-800">
                <div className="text-sm text-neutral-400">Pickup</div>
                <div className="mt-1">{fmtDT(active.pickup_appointment || active.pickup_at || active.pickup_date)}</div>
              </div>
              <div className="rounded-xl bg-neutral-900 p-4 ring-1 ring-neutral-800">
                <div className="text-sm text-neutral-400">Delivery</div>
                <div className="mt-1">{fmtDT(active.delivery_appointment || active.delivery_at || active.delivery_date)}</div>
              </div>

              <div className="rounded-xl bg-neutral-900 p-4 ring-1 ring-neutral-800">
                <div className="text-sm text-neutral-400">ETA</div>
                <div className="mt-1">{fmtDT(active.eta_at)}</div>
              </div>
              <div className="rounded-xl bg-neutral-900 p-4 ring-1 ring-neutral-800">
                <div className="text-sm text-neutral-400">Progress</div>
                <div className="mt-2">
                  <ProgressBar
                    value={
                      active.pct_complete ??
                      (typeof active.miles_remaining === "number" && typeof active.miles_total === "number"
                        ? Math.round((1 - active.miles_remaining / Math.max(1, active.miles_total)) * 100)
                        : 0)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-neutral-900 p-4 ring-1 ring-neutral-800">
              <div className="text-sm text-neutral-400">Documents</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {active.ratecon_url ? (
                  <a
                    className="inline-flex items-center gap-2 rounded-lg bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700"
                    href={active.ratecon_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileText className="size-4" /> Rate Confirmation
                  </a>
                ) : null}
                {active.bol_url ? (
                  <a
                    className="inline-flex items-center gap-2 rounded-lg bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700"
                    href={active.bol_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Paperclip className="size-4" /> BOL
                  </a>
                ) : null}
                {active.pod_url || active.pod_path ? (
                  <a
                    className="inline-flex items-center gap-2 rounded-lg bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700"
                    href={active.pod_url || active.pod_path}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Paperclip className="size-4" /> POD
                  </a>
                ) : null}
                {!active.ratecon_url && !active.bol_url && !active.pod_url && !active.pod_path ? (
                  <span className="text-sm text-neutral-400">No documents linked</span>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl bg-neutral-900 p-4 ring-1 ring-neutral-800">
              <div className="text-sm text-neutral-400">Notes</div>
              <div className="mt-1 whitespace-pre-wrap text-neutral-200">
                {active.notes || active.internal_notes || "—"}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
