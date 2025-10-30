import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  FileText,
  Download,
  ArrowUpDown,
} from "lucide-react";

/* ------------------------- constants ------------------------- */
const PAGE_SIZES = [10, 25, 50, 100];

const COLS = {
  status: "status",
  shipper: "shipper",
  dispatcher: "dispatcher",
  rate: "rate",
  deliveredAt: "delivered_at",
  podPath: "pod_path", // change here only if you picked a different name (e.g. pod_url)
};

/* keys we’ll probe to build a Route from whatever exists in your schema */
const ORIGIN_CITY_KEYS = ["origin_city", "pickup_city", "shipper_city", "from_city", "o_city"];
const ORIGIN_STATE_KEYS = ["origin_state", "pickup_state", "shipper_state", "from_state", "o_state", "origin_st"];
const DEST_CITY_KEYS = ["dest_city", "delivery_city", "consignee_city", "to_city", "d_city"];
const DEST_STATE_KEYS = ["dest_state", "delivery_state", "consignee_state", "to_state", "d_state", "dest_st"];

/* ------------------------- helpers ------------------------- */
const cls = (...xs) => xs.filter(Boolean).join(" ");
const fmtMoney = (n) =>
  typeof n === "number"
    ? n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : n || "—";
const fmtDT = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
};
const firstVal = (row, keys) => {
  for (const k of keys) {
    if (k in row && row[k] != null && `${row[k]}`.trim() !== "") return row[k];
  }
  return "";
};
const buildRoute = (row) => {
  const o = [firstVal(row, ORIGIN_CITY_KEYS), firstVal(row, ORIGIN_STATE_KEYS)].filter(Boolean).join(", ");
  const d = [firstVal(row, DEST_CITY_KEYS), firstVal(row, DEST_STATE_KEYS)].filter(Boolean).join(", ");
  return o && d ? `${o} → ${d}` : "—";
};

const SORTS = {
  SHIPPER: "shipper",
  ROUTE: "route", // virtual, client-side
  DISPATCHER: "dispatcher",
  RATE: "rate",
  DELIVERED_AT: "delivered_at",
};

/* ------------------------- POD modal/actions ------------------------- */
function PodModal({ open, onClose, load, onUploaded }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) {
      setFile(null);
      setBusy(false);
      setErr("");
    }
  }, [open]);

  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) setFile(f);
  };
  const onChoose = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const upload = async () => {
    if (!file || !load?.id) return;
    setBusy(true);
    setErr("");
    try {
      const path = `pods/${load.id}/${Date.now()}_${file.name}`.replace(/\s+/g, "_");
      const { error: upErr } = await supabase.storage.from("pods").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (upErr) throw upErr;

      const { error: updErr } = await supabase
        .from("loads")
        .update({ [COLS.podPath]: path, pod_uploaded_at: new Date().toISOString() })
        .eq("id", load.id);
      if (updErr) throw updErr;

      onUploaded?.();
      onClose?.();
    } catch (e) {
      console.error("[POD upload] error", e);
      setErr(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 p-6">
        <h3 className="text-xl font-semibold mb-2">Upload POD</h3>
        <p className="text-sm text-neutral-400 mb-4">
          Load <span className="font-medium text-neutral-200">#{load?.id}</span> — {buildRoute(load)}
        </p>

        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className={cls(
            "flex h-40 items-center justify-center rounded-xl border-2 border-dashed",
            "border-neutral-700 hover:border-neutral-600 transition-colors cursor-pointer"
          )}
        >
          <div className="flex flex-col items-center gap-2">
            <UploadCloud className="h-7 w-7" />
            <div className="text-sm">
              {file ? <span className="font-medium">{file.name}</span> : "Drag & drop or click to select"}
            </div>
            <input type="file" className="hidden" onChange={onChoose} accept="application/pdf,image/*" />
            <div className="text-xs text-neutral-400">PDF or image files</div>
          </div>
        </label>

        {err && <div className="mt-3 text-sm text-red-400">{err}</div>}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button className="px-3 py-2 rounded-lg text-sm border border-neutral-700 hover:bg-neutral-800" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="px-3 py-2 rounded-lg text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60"
            onClick={upload}
            disabled={!file || busy}
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
              </span>
            ) : (
              "Upload"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function PodActions({ row, onUploaded }) {
  const [signing, setSigning] = useState(false);
  const [open, setOpen] = useState(false);

  const view = async () => {
    const path = row[COLS.podPath];
    if (!path) return;
    setSigning(true);
    try {
      const { data, error } = await supabase.storage.from("pods").createSignedUrl(path, 60 * 10);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error("[POD sign] error", e);
      alert("Could not open POD (permissions or missing file).");
    } finally {
      setSigning(false);
    }
  };

  return row[COLS.podPath] ? (
    <button
      onClick={view}
      disabled={signing}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-neutral-700 hover:bg-neutral-800 text-sm"
      title="View POD"
    >
      <FileText className="h-4 w-4" />
      View POD
    </button>
  ) : (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-neutral-700 hover:bg-neutral-800 text-sm"
        title="Upload POD"
      >
        <UploadCloud className="h-4 w-4" />
        Upload POD
      </button>
      <PodModal open={open} onClose={() => setOpen(false)} load={row} onUploaded={onUploaded} />
    </>
  );
}

/* ------------------------- main page ------------------------- */
export default function Delivered() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  const [sortCol, setSortCol] = useState(SORTS.DELIVERED_AT);
  const [sortDir, setSortDir] = useState("desc");

  const mounted = useRef(false);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir(col === SORTS.DELIVERED_AT ? "desc" : "asc");
    }
    setPage(0);
  };

  const fetchPage = async () => {
    setLoading(true);
    setError("");
    try {
      // Only select delivered loads; use * so we don't reference missing columns
      let query = supabase
        .from("loads")
        .select("*", { count: "exact" })
        .eq(COLS.status, "DELIVERED");

      // Server-side search for safe fields; we’ll filter route client-side
      if (q?.trim()) {
        const like = `%${q.trim()}%`;
        query = query.or([`${COLS.shipper}.ilike.${like}`, `${COLS.dispatcher}.ilike.${like}`].join(","));
      }

      // Server sort for known columns; route sorting is handled client-side
      if (sortCol === SORTS.ROUTE) {
        query = query.order(COLS.deliveredAt, { ascending: false, nullsFirst: false });
      } else {
        const col =
          sortCol === SORTS.SHIPPER
            ? COLS.shipper
            : sortCol === SORTS.DISPATCHER
            ? COLS.dispatcher
            : sortCol === SORTS.RATE
            ? COLS.rate
            : COLS.deliveredAt;
        query = query.order(col, { ascending: sortDir === "asc", nullsFirst: false });
      }

      // Pagination
      const from = page * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      // Compose route string field for each row
      const withRoute = (data || []).map((r) => ({ ...r, __route: buildRoute(r) }));

      // Client-side route filter
      const qq = q.trim().toLowerCase();
      const filtered =
        qq && !(/[%_]/.test(qq)) // only if not already handled above; conservative
          ? withRoute.filter(
              (r) =>
                (r[COLS.shipper] || "").toLowerCase().includes(qq) ||
                (r[COLS.dispatcher] || "").toLowerCase().includes(qq) ||
                (r.__route || "").toLowerCase().includes(qq)
            )
          : withRoute;

      // Client-side route sort
      const finalRows =
        sortCol === SORTS.ROUTE
          ? [...filtered].sort((a, b) => {
              const A = a.__route || "";
              const B = b.__route || "";
              return sortDir === "asc" ? A.localeCompare(B) : B.localeCompare(A);
            })
          : filtered;

      setRows(finalRows);
      setTotal(count || finalRows.length || 0);
    } catch (e) {
      console.error("[Delivered] fetch error", e);
      setError(e?.message || "Failed to load delivered loads.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page, pageSize, sortCol, sortDir]);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    const channel = supabase
      .channel("loads-delivered-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "loads" }, () => fetchPage())
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const exportCsv = () => {
    const header = ["Shipper", "Route", "Dispatcher", "Rate", "Delivered At", "Has POD"];
    const lines = rows.map((r) => [
      r[COLS.shipper] || "",
      r.__route || "",
      r[COLS.dispatcher] || "",
      typeof r[COLS.rate] === "number" ? r[COLS.rate] : "",
      r[COLS.deliveredAt] || "",
      r[COLS.podPath] ? "YES" : "NO",
    ]);
    const all = [header, ...lines]
      .map((arr) =>
        arr
          .map((s) => {
            const v = `${s ?? ""}`;
            return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
          })
          .join(",")
      )
      .join("\n");
    const blob = new Blob([all], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `delivered_loads_page${page + 1}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="px-6 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Delivered Loads</h1>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
            <input
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 pl-9 pr-3 py-2 text-sm placeholder-neutral-500 outline-none focus:ring-2 focus:ring-neutral-600"
              placeholder="Search by shipper, route, dispatcher…"
              value={q}
              onChange={(e) => {
                setPage(0);
                setQ(e.target.value);
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-neutral-400">Rows:</label>
            <select
              className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800"
              title="Export current view"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-800">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-neutral-950/90 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/70">
              <tr className="text-neutral-400">
                <Th label="SHIPPER" active={sortCol === SORTS.SHIPPER} dir={sortDir} onClick={() => toggleSort(SORTS.SHIPPER)} />
                <Th label="ROUTE" active={sortCol === SORTS.ROUTE} dir={sortDir} onClick={() => toggleSort(SORTS.ROUTE)} />
                <Th label="DISPATCHER" active={sortCol === SORTS.DISPATCHER} dir={sortDir} onClick={() => toggleSort(SORTS.DISPATCHER)} />
                <Th label="RATE" active={sortCol === SORTS.RATE} dir={sortDir} onClick={() => toggleSort(SORTS.RATE)} className="text-right pr-6" />
                <Th label="DELIVERED AT" active={sortCol === SORTS.DELIVERED_AT} dir={sortDir} onClick={() => toggleSort(SORTS.DELIVERED_AT)} />
                <th className="px-4 py-3 text-left w-[140px]">POD</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-800">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-neutral-400">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading delivered loads…
                    </span>
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-red-400">{error}</td>
                </tr>
              )}

              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-neutral-400">No delivered loads match your filters.</td>
                </tr>
              )}

              {!loading && !error &&
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-900/50">
                    <td className="px-4 py-3">{r[COLS.shipper] || "—"}</td>
                    <td className="px-4 py-3">{r.__route || "—"}</td>
                    <td className="px-4 py-3">{r[COLS.dispatcher] || "—"}</td>
                    <td className="px-4 py-3 text-right pr-6">
                      {fmtMoney(typeof r[COLS.rate] === "string" ? Number(r[COLS.rate]) : r[COLS.rate])}
                    </td>
                    <td className="px-4 py-3">{fmtDT(r[COLS.deliveredAt])}</td>
                    <td className="px-4 py-3">
                      <PodActions row={r} onUploaded={() => fetchPage()} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-neutral-800 bg-neutral-950">
          <div className="text-xs text-neutral-400">
            Showing <span className="text-neutral-200">{rows.length}</span> of <span className="text-neutral-200">{total}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center rounded-md border border-neutral-700 px-2 py-1.5 text-sm hover:bg-neutral-900 disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-sm tabular-nums">
              Page <span className="font-medium">{page + 1}</span> / {Math.max(1, Math.ceil(total / pageSize))}
            </div>
            <button
              className="inline-flex items-center rounded-md border border-neutral-700 px-2 py-1.5 text-sm hover:bg-neutral-900 disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(Math.max(1, Math.ceil(total / pageSize)) - 1, p + 1))}
              disabled={page + 1 >= Math.max(1, Math.ceil(total / pageSize)) || loading}
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Th({ label, active, dir, onClick, className }) {
  return (
    <th
      className={cls(
        "px-4 py-3 text-left text-xs font-medium tracking-wide select-none whitespace-nowrap",
        "cursor-pointer hover:text-neutral-300",
        className
      )}
      onClick={onClick}
      role="button"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <span className="inline-flex items-center gap-1.5">
        {label}
        <ArrowUpDown className={cls("h-3.5 w-3.5", active && "text-neutral-200")} />
      </span>
    </th>
  );
}
