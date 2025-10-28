// src/pages/delivered.jsx
// Enhanced Delivered page: metrics, filters, POD upload, settlement tracking, export

import { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "../lib/supabase"; // or "../lib/supabase.js" depending on your project
import {
  Loader2,
  Calendar,
  Filter as FilterIcon,
  Search,
  Download,
  FileUp,
  FileText,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

const SETTLEMENT_STATES = ["UNINVOICED", "INVOICED", "PAID"]; // finance lifecycle

export default function DeliveredPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState(null);

  // Filters
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const [dateFrom, setDateFrom] = useState(startOfWeek.toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(today.toISOString().slice(0, 10));
  const [dispatcher, setDispatcher] = useState("");
  const [shipper, setShipper] = useState("");
  const [search, setSearch] = useState("");

  const fileInputs = useRef({});

  useEffect(() => {
    let abort = false;
    async function run() {
      setLoading(true);
      setError(null);
      // Base query: Delivered only
      let q = supabase
        .from("loads")
        .select(
          [
            "id",
            "created_at",
            "shipper",
            "origin",
            "destination",
            "dispatcher",
            "rate",
            "miles",
            "status",
            "delivered_at",
            "pod_url",
            "settlement_status",
            "final_notes",
          ].join(", "),
        )
        .eq("status", "DELIVERED")
        .order("delivered_at", { ascending: false });

      // Date filter (inclusive)
      if (dateFrom) q = q.gte("delivered_at", dateFrom);
      if (dateTo) {
        const dt = new Date(dateTo);
        dt.setDate(dt.getDate() + 1); // make end exclusive
        q = q.lt("delivered_at", dt.toISOString().slice(0, 10));
      }
      if (dispatcher) q = q.ilike("dispatcher", dispatcher);
      if (shipper) q = q.ilike("shipper", shipper);

      const { data, error } = await q;
      if (abort) return;
      if (error) {
        setError(error.message || "Failed to load delivered loads");
      } else {
        setRows(Array.isArray(data) ? data : []);
      }
      setLoading(false);
    }
    run();
    return () => {
      abort = true;
    };
  }, [dateFrom, dateTo, dispatcher, shipper]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const hay = `${r.id} ${r.shipper ?? ""} ${r.origin ?? ""} ${r.destination ?? ""} ${r.dispatcher ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, search]);

  const metrics = useMemo(() => {
    if (!filtered.length) return { count: 0, gross: 0, miles: 0, rpm: 0 };
    const gross = filtered.reduce((a, r) => a + (Number(r.rate) || 0), 0);
    const miles = filtered.reduce((a, r) => a + (Number(r.miles) || 0), 0);
    const rpm = miles > 0 ? gross / miles : 0;
    return { count: filtered.length, gross, miles, rpm };
  }, [filtered]);

  const uniqueDispatchers = useMemo(() => Array.from(new Set(rows.map((r) => r.dispatcher).filter(Boolean))).sort(), [rows]);
  const uniqueShippers = useMemo(() => Array.from(new Set(rows.map((r) => r.shipper).filter(Boolean))).sort(), [rows]);

  function quickRange(range) {
    const now = new Date();
    let from = new Date();
    if (range === "7d") from.setDate(now.getDate() - 6);
    if (range === "30d") from.setDate(now.getDate() - 29);
    if (range === "mtd") {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    setDateFrom(from.toISOString().slice(0, 10));
    setDateTo(now.toISOString().slice(0, 10));
  }

  async function handleSettlementChange(id, settlement_status) {
    setSavingId(id);
    const { error } = await supabase.from("loads").update({ settlement_status }).eq("id", id);
    setSavingId(null);
    if (error) alert(`Update failed: ${error.message}`);
    else setRows((prev) => prev.map((r) => (r.id === id ? { ...r, settlement_status } : r)));
  }

  async function handleNotesBlur(id, final_notes) {
    setSavingId(id);
    const { error } = await supabase.from("loads").update({ final_notes }).eq("id", id);
    setSavingId(null);
    if (error) alert(`Save failed: ${error.message}`);
    else setRows((prev) => prev.map((r) => (r.id === id ? { ...r, final_notes } : r)));
  }

  async function handleFilePick(id) {
    fileInputs.current[id]?.click();
  }

  async function handleUpload(id, file) {
    if (!file) return;
    setSavingId(id);
    try {
      const path = `${id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("pods").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("pods").getPublicUrl(path);
      const publicUrl = pub?.publicUrl || null;
      const { error: updErr } = await supabase.from("loads").update({ pod_url: publicUrl }).eq("id", id);
      if (updErr) throw updErr;
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, pod_url: publicUrl } : r)));
    } catch (e) {
      alert(`Upload failed: ${e.message || e}`);
    } finally {
      setSavingId(null);
    }
  }

  function exportCsv() {
    const cols = [
      "id",
      "delivered_at",
      "shipper",
      "origin",
      "destination",
      "dispatcher",
      "miles",
      "rate",
      "settlement_status",
      "pod_url",
      "final_notes",
    ];
    const header = cols.join(",");
    const lines = filtered.map((r) =>
      cols
        .map((c) => {
          let v = r[c];
          if (v == null) v = "";
          v = String(v).replaceAll('"', '""');
          if (v.includes(",") || v.includes("\n")) return `"${v}"`;
          return v;
        })
        .join(","),
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `delivered_${dateFrom}_to_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Title + Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Delivered</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => quickRange("7d")}
            className="px-3 py-1.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Last 7 days
          </button>
          <button
            onClick={() => quickRange("30d")}
            className="px-3 py-1.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Last 30 days
          </button>
          <button
            onClick={() => quickRange("mtd")}
            className="px-3 py-1.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            MTD
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            title="Export CSV"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid gap-3 md:grid-cols-3 bg-white/60 dark:bg-neutral-900/60 backdrop-blur rounded-2xl p-4 border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 opacity-60" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
          />
          <span className="text-sm opacity-70">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
          />
        </div>
        <div className="flex items-center gap-2">
          <FilterIcon className="w-4 h-4 opacity-60" />
          <select
            value={dispatcher}
            onChange={(e) => setDispatcher(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
          >
            <option value="">All Dispatchers</option>
            {uniqueDispatchers.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <FilterIcon className="w-4 h-4 opacity-60" />
          <select
            value={shipper}
            onChange={(e) => setShipper(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
          >
            <option value="">All Shippers</option>
            {uniqueShippers.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3 flex items-center gap-2">
          <Search className="w-4 h-4 opacity-60" />
          <input
            placeholder="Search ID / shipper / city"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
          />
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Delivered" value={metrics.count.toLocaleString()} />
        <MetricCard label="Gross Revenue" value={fmtCurrency(metrics.gross)} />
        <MetricCard label="Total Miles" value={metrics.miles.toLocaleString()} />
        <MetricCard label="Avg RPM" value={metrics.rpm.toFixed(2)} />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 backdrop-blur">
        <table className="min-w-full text-sm">
          <thead className="text-left border-b border-neutral-200 dark:border-neutral-800">
            <tr className="text-xs uppercase tracking-wide text-neutral-500">
              <Th>ID</Th>
              <Th>Delivered</Th>
              <Th>Shipper</Th>
              <Th>Origin → Destination</Th>
              <Th>Dispatcher</Th>
              <Th className="text-right">Miles</Th>
              <Th className="text-right">Rate</Th>
              <Th>POD</Th>
              <Th>Settlement</Th>
              <Th>Notes</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="py-16 text-center">
                  <Loader2 className="w-5 h-5 inline animate-spin mr-2" /> Loading delivered loads…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-red-500">
                  <AlertTriangle className="w-5 h-5 inline mr-2" /> {error}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center opacity-70">No delivered loads match your filters.</td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-b border-neutral-100 dark:border-neutral-800/60 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
                  <Td className="font-mono text-xs">{r.id}</Td>
                  <Td>{fmtDate(r.delivered_at)}</Td>
                  <Td>{r.shipper || "—"}</Td>
                  <Td>
                    <div className="max-w-[26rem] truncate" title={`${r.origin || "?"} → ${r.destination || "?"}`}>
                      {r.origin || "?"} <span className="opacity-60">→</span> {r.destination || "?"}
                    </div>
                  </Td>
                  <Td>{r.dispatcher || "—"}</Td>
                  <Td className="text-right tabular-nums">{r.miles ?? "—"}</Td>
                  <Td className="text-right tabular-nums">{fmtCurrency(r.rate)}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      {r.pod_url ? (
                        <a
                          href={r.pod_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                          <FileText className="w-4 h-4" /> POD
                        </a>
                      ) : (
                        <span className="text-xs opacity-60">Missing</span>
                      )}
                      <input
                        type="file"
                        hidden
                        ref={(el) => (fileInputs.current[r.id] = el)}
                        onChange={(e) => handleUpload(r.id, e.target.files?.[0])}
                      />
                      <button
                        onClick={() => handleFilePick(r.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        disabled={savingId === r.id}
                        title="Upload/replace POD"
                      >
                        {savingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                        Upload
                      </button>
                    </div>
                  </Td>
                  <Td>
                    <select
                      value={r.settlement_status || "UNINVOICED"}
                      onChange={(e) => handleSettlementChange(r.id, e.target.value)}
                      disabled={savingId === r.id}
                      className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-xs"
                    >
                      {SETTLEMENT_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </Td>
                  <Td>
                    <textarea
                      defaultValue={r.final_notes || ""}
                      onBlur={(e) => handleNotesBlur(r.id, e.target.value)}
                      placeholder="Add final notes…"
                      className="w-56 max-w-[24rem] h-9 resize-y rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-xs"
                    />
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footnote */}
      <p className="text-xs opacity-60">Tip: Use the Export button to download exactly what you see with filters applied.</p>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur">
      <div className="text-xs uppercase tracking-wider opacity-60">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Th({ children, className = "" }) {
  return (
    <th className={"px-3 py-3 font-medium " + className}>{children}</th>
  );
}
function Td({ children, className = "" }) {
  return <td className={"px-3 py-3 align-top " + className}>{children}</td>;
}

function fmtDate(d) {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString();
  } catch {
    return String(d);
  }
}
function fmtCurrency(n) {
  const num = Number(n) || 0;
  return num.toLocaleString(undefined, { style: "currency", currency: "USD" });
}
