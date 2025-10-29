// src/pages/loads.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase.js";
import {
  PlusCircle,
  Search,
  Loader2,
  CheckCheck,
  Truck,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
} from "lucide-react";

const PAGE_SIZE = 25;
const STATUS_OPTIONS = ["ALL", "AVAILABLE", "IN_TRANSIT", "DELIVERED"];

/* ── Toast (no lib) ── */
function toast(msg) {
  const el = document.createElement("div");
  el.className =
    "fixed bottom-4 right-4 z-50 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

export default function LoadsPage() {
  // Data / UI
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    shipper: "",
    origin: "",
    destination: "",
    dispatcher: "",
    rate: "",
    pickup_date: "",
    delivery_date: "",
  });
  const [saveError, setSaveError] = useState("");

  // Debounce search
  const debounceRef = useRef(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchRows({ pageIndex: 0 });
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Fetch rows
  async function fetchRows({ pageIndex = 0 } = {}) {
    setLoading(true);
    try {
      let query = supabase.from("loads").select("*", { count: "exact" });

      if (status !== "ALL") query = query.eq("status", status);
      if (q.trim()) {
        query = query.or(
          [
            `shipper.ilike.%${q}%`,
            `origin.ilike.%${q}%`,
            `destination.ilike.%${q}%`,
            `dispatcher.ilike.%${q}%`,
          ].join(",")
        );
      }

      query = query.order("created_at", { ascending: false });

      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      setRows(data || []);
      setHasMore(((count ?? 0) - (to + 1)) > 0);
      setPage(pageIndex);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("[Loads] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  // Initial + status change
  useEffect(() => {
    fetchRows({ pageIndex: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Supabase realtime
  useEffect(() => {
    const ch = supabase
      .channel("loads-ch")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "loads" },
        (payload) => {
          setRows((prev) => {
            if (payload.eventType === "INSERT") {
              const r = payload.new;
              if (
                (status === "ALL" || r.status === status) &&
                (!q ||
                  [r.shipper, r.origin, r.destination, r.dispatcher]
                    .filter(Boolean)
                    .some((t) =>
                      String(t).toLowerCase().includes(q.toLowerCase())
                    ))
              ) {
                return [r, ...prev];
              }
              return prev;
            }
            if (payload.eventType === "UPDATE") {
              return prev.map((r) =>
                r.id === payload.new.id ? payload.new : r
              );
            }
            if (payload.eventType === "DELETE") {
              return prev.filter((r) => r.id !== payload.old.id);
            }
            return prev;
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [q, status]);

  // Keyboard: A opens modal
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() === "a") setShowAdd(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const statusChips = useMemo(() => STATUS_OPTIONS, []);

  // Add modal handlers
  const handleOpenAdd = () => {
    setForm({
      shipper: "",
      origin: "",
      destination: "",
      dispatcher: "",
      rate: "",
      pickup_date: "",
      delivery_date: "",
    });
    setSaveError("");
    setShowAdd(true);
  };
  const handleField = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const canSave =
    form.shipper.trim() &&
    form.origin.trim() &&
    form.destination.trim() &&
    form.rate.toString().trim() &&
    form.pickup_date.trim() &&
    form.delivery_date.trim();

  const handleSave = async () => {
    setSaveError("");
    if (!canSave) {
      setSaveError(
        "Please fill in shipper, origin, destination, rate, pickup date, and delivery date."
      );
      return;
    }
    setSaving(true);
    try {
      const payload = {
        shipper: form.shipper.trim(),
        origin: form.origin.trim(),
        destination: form.destination.trim(),
        dispatcher: form.dispatcher.trim() || null,
        rate: form.rate ? Number(form.rate) : null,
        status: "AVAILABLE",
        // If your columns are DATE, 'YYYY-MM-DD' is perfect.
        // If TIMESTAMP, backend will cast or you can append 'T00:00:00Z'.
        pickup_date: form.pickup_date || null,
        delivery_date: form.delivery_date || null,
      };
      const { data, error } = await supabase
        .from("loads")
        .insert([payload])
        .select()
        .single();
      if (error) throw error;

      setRows((prev) => (prev?.length ? [data, ...prev] : [data]));
      setShowAdd(false);
      toast("Load saved");
    } catch (err) {
      console.error("[Loads] save error:", err);
      setSaveError(err?.message || "Failed to save. Check console/logs.");
    } finally {
      setSaving(false);
    }
  };

  // Selection
  const allOnPageSelected =
    rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    }
  };
  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Updates
  async function updateField(id, patch) {
    try {
      const { data, error } = await supabase
        .from("loads")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      setRows((prev) => prev.map((r) => (r.id === id ? data : r)));
      toast("Updated");
    } catch (e) {
      console.error("Update field error", e);
      toast("Update failed");
    }
  }

  // Bulk actions
  async function bulkUpdateStatus(newStatus) {
    if (selectedIds.size === 0) return;
    try {
      const ids = Array.from(selectedIds);
      const { data, error } = await supabase
        .from("loads")
        .update({ status: newStatus })
        .in("id", ids)
        .select();
      if (error) throw error;
      const map = new Map(data.map((d) => [d.id, d]));
      setRows((prev) => prev.map((r) => map.get(r.id) || r));
      setSelectedIds(new Set());
      toast(`Marked ${data.length} as ${newStatus.replace("_", " ")}`);
    } catch (e) {
      console.error("Bulk update error", e);
      toast("Bulk update failed");
    }
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      <div className="mx-auto w-full max-w-[1400px] px-4 lg:px-6">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <div>
            <h1 className="text-xl font-semibold">Loads</h1>
            <p className="text-sm text-neutral-400">
              Manage active and historical loads
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/40 px-4 py-2 hover:bg-neutral-900"
          >
            <PlusCircle className="h-5 w-5" />
            Add Load
          </button>
        </div>

        {/* Status legend */}
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <Badge color="emerald">Available</Badge>
          <Badge color="sky">In Transit</Badge>
          <Badge color="purple">Delivered</Badge>
        </div>

        {/* Filters / bulk actions */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search shipper, origin, destination, dispatcher…"
              className="h-10 w-[260px] rounded-lg pl-9 pr-3 bg-neutral-900/40 border border-neutral-800 max-w-full"
            />
          </div>

          <div className="flex items-center gap-1">
            {statusChips.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`h-9 px-3 rounded-full border ${
                  status === s
                    ? "bg-neutral-100 text-neutral-900 border-neutral-200"
                    : "bg-neutral-900/40 text-neutral-200 border-neutral-800 hover:bg-neutral-900"
                }`}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Bulk actions */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button
              disabled={selectedIds.size === 0}
              onClick={() => bulkUpdateStatus("IN_TRANSIT")}
              className="h-9 rounded-lg px-3 border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900 disabled:opacity-50"
              title="Mark selected as In Transit"
            >
              <div className="inline-flex items-center gap-2">
                <Truck className="h-4 w-4" />
                In Transit
              </div>
            </button>
            <button
              disabled={selectedIds.size === 0}
              onClick={() => bulkUpdateStatus("DELIVERED")}
              className="h-9 rounded-lg px-3 border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900 disabled:opacity-50"
              title="Mark selected as Delivered"
            >
              <div className="inline-flex items-center gap-2">
                <CheckCheck className="h-4 w-4" />
                Delivered
              </div>
            </button>
            <button
              onClick={() => fetchRows({ pageIndex: 0 })}
              className="h-9 rounded-lg px-3 border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-neutral-800/60 bg-neutral-900/30">
          <table className="w-full min-w-[1250px] table-fixed">
            <thead className="sticky top-0 bg-neutral-950/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60 z-10">
              <tr className="text-left text-sm">
                <th className="w-[46px] px-3 py-3">
                  <button
                    onClick={toggleSelectAll}
                    className="inline-flex items-center justify-center"
                    title={allOnPageSelected ? "Unselect all" : "Select all"}
                  >
                    {allOnPageSelected ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="w-[140px] px-4 py-3">Shipper</th>
                <th className="w-[170px] px-4 py-3">Origin</th>
                <th className="w-[170px] px-4 py-3">Destination</th>
                <th className="w-[150px] px-4 py-3">Pickup</th>
                <th className="w-[150px] px-4 py-3">Delivery</th>
                <th className="w-[160px] px-4 py-3">Dispatcher</th>
                <th className="w-[110px] px-4 py-3">Rate</th>
                <th className="w-[130px] px-4 py-3">Status</th>
                <th className="w-[180px] px-4 py-3">Created</th>
                <th className="w-[140px] px-4 py-3">Actions</th>
              </tr>
            </thead>

            <tbody className="text-sm [&>tr:nth-child(even)]:bg-neutral-900/20">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center">
                    <div className="inline-flex items-center gap-2 text-neutral-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading…
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center">
                    <div className="inline-flex items-center gap-2 text-neutral-400">
                      <AlertTriangle className="h-4 w-4" />
                      No loads found.
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const selected = selectedIds.has(row.id);
                  return (
                    <tr
                      key={row.id}
                      className={`group border-t border-neutral-800/60 hover:bg-neutral-900/30 ${
                        selected ? "bg-neutral-900/40" : ""
                      }`}
                    >
                      <td className="px-3 py-3">
                        <button
                          onClick={() => toggleSelectOne(row.id)}
                          className="inline-flex items-center justify-center"
                          title={selected ? "Unselect" : "Select"}
                        >
                          {selected ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px]">
                        {row.shipper || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                        {row.origin || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                        {row.destination || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {row.pickup_date
                          ? new Date(row.pickup_date).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {row.delivery_date
                          ? new Date(row.delivery_date).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px]">
                        <EditableCell
                          value={row.dispatcher}
                          placeholder="-"
                          onSave={(val) =>
                            updateField(row.id, {
                              dispatcher: val.trim() || null,
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <EditableCell
                          value={row.rate}
                          type="number"
                          placeholder="-"
                          onSave={(val) =>
                            updateField(row.id, {
                              rate:
                                val === "" || val === null
                                  ? null
                                  : Number(val),
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {row.created_at
                          ? new Date(row.created_at).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button
                            title="Mark In Transit"
                            className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-2 py-1 hover:bg-neutral-900"
                            onClick={() =>
                              updateField(row.id, { status: "IN_TRANSIT" })
                            }
                          >
                            <Truck className="h-4 w-4" />
                          </button>
                          <button
                            title="Mark Delivered"
                            className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-2 py-1 hover:bg-neutral-900"
                            onClick={() =>
                              updateField(row.id, { status: "DELIVERED" })
                            }
                          >
                            <CheckCheck className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden grid gap-3">
          {loading ? (
            <div className="py-10 text-center text-neutral-400">
              <Loader2 className="h-4 w-4 inline-block animate-spin mr-2" />
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-neutral-400">
              <AlertTriangle className="h-4 w-4 inline-block mr-2" />
              No loads found.
            </div>
          ) : (
            rows.map((r) => (
              <LoadCard
                key={r.id}
                row={r}
                selected={selectedIds.has(r.id)}
                onToggle={() => toggleSelectOne(r.id)}
                onUpdate={updateField}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="text-sm text-neutral-400">
            Page {page + 1}
            {loading ? "" : ` • ${rows.length} rows`}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 0 || loading}
              onClick={() => fetchRows({ pageIndex: Math.max(0, page - 1) })}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-2 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button
              disabled={!hasMore || loading}
              onClick={() => fetchRows({ pageIndex: page + 1 })}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-2 disabled:opacity-50"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Load Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Add Load</h2>
              <p className="text-sm text-neutral-400">
                Minimal details required to save. You can enrich later.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field
                label="Shipper *"
                name="shipper"
                value={form.shipper}
                onChange={handleField}
              />
              <Field
                label="Dispatcher"
                name="dispatcher"
                value={form.dispatcher}
                onChange={handleField}
              />
              <Field
                label="Origin *"
                name="origin"
                value={form.origin}
                onChange={handleField}
              />
              <Field
                label="Destination *"
                name="destination"
                value={form.destination}
                onChange={handleField}
              />
              <Field
                label="Rate (USD) *"
                name="rate"
                type="number"
                value={form.rate}
                onChange={handleField}
              />
              <Field
                label="Pickup Date *"
                name="pickup_date"
                type="date"
                value={form.pickup_date}
                onChange={handleField}
              />
              <Field
                label="Delivery Date *"
                name="delivery_date"
                type="date"
                value={form.delivery_date}
                onChange={handleField}
              />
            </div>

            {saveError ? (
              <div className="mt-3 text-sm text-red-400">{saveError}</div>
            ) : null}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowAdd(false)}
                className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-4 py-2 hover:bg-neutral-900"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave || saving}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-emerald-600/10 px-4 py-2 text-emerald-300 hover:bg-emerald-600/20 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Load
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── UI helpers ── */

function Field({ label, name, value, onChange, type = "text", placeholder }) {
  return (
    <label className="text-sm">
      <div className="mb-1 text-neutral-300">{label}</div>
      <input
        name={name}
        value={value}
        onChange={onChange}
        type={type}
        placeholder={placeholder}
        className="w-full h-10 rounded-lg px-3 bg-neutral-900/40 border border-neutral-800"
      />
    </label>
  );
}

function StatusBadge({ status }) {
  const styles = {
    AVAILABLE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    IN_TRANSIT: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    DELIVERED: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    DEFAULT: "bg-neutral-500/15 text-neutral-300 border-neutral-500/30",
  };
  const cls = styles[status] || styles.DEFAULT;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${cls}`}>
      {status || "UNKNOWN"}
    </span>
  );
}

function EditableCell({ value, onSave, type = "text", placeholder = "" }) {
  const [v, setV] = useState(value ?? "");
  const [editing, setEditing] = useState(false);

  useEffect(() => setV(value ?? ""), [value]);

  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        value={v ?? ""}
        placeholder={placeholder}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          setEditing(false);
          onSave(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setEditing(false);
            onSave(v);
          }
          if (e.key === "Escape") {
            setEditing(false);
            setV(value ?? "");
          }
        }}
        className="h-8 w-full rounded border border-neutral-700 bg-neutral-900 px-2"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-left w-full truncate hover:underline"
      title="Click to edit"
    >
      {value ?? placeholder ?? "-"}
    </button>
  );
}

function Badge({ color = "neutral", children }) {
  const map = {
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    sky: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    purple: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    neutral: "bg-neutral-500/15 text-neutral-300 border-neutral-500/30",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 ${map[color]}`}>
      {children}
    </span>
  );
}

function LoadCard({ row, selected, onToggle, onUpdate }) {
  return (
    <div
      className={`rounded-xl border border-neutral-800 bg-neutral-900/30 p-3 ${
        selected ? "ring-1 ring-neutral-600" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm">
          <div className="font-medium">{row.shipper || "-"}</div>
          <div className="text-neutral-400">
            {row.origin || "-"} → {row.destination || "-"}
          </div>
          <div className="mt-1">
            <StatusBadge status={row.status} />
          </div>
        </div>
        <button
          onClick={onToggle}
          className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-2 py-1 hover:bg-neutral-900 text-xs"
        >
          {selected ? "Selected" : "Select"}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-neutral-400 text-xs mb-1">Pickup</div>
          <div>
            {row.pickup_date
              ? new Date(row.pickup_date).toLocaleDateString()
              : "-"}
          </div>
        </div>
        <div>
          <div className="text-neutral-400 text-xs mb-1">Delivery</div>
          <div>
            {row.delivery_date
              ? new Date(row.delivery_date).toLocaleDateString()
              : "-"}
          </div>
        </div>
        <div>
          <div className="text-neutral-400 text-xs mb-1">Dispatcher</div>
          <EditableCell
            value={row.dispatcher}
            placeholder="-"
            onSave={(val) =>
              onUpdate(row.id, { dispatcher: val.trim() || null })
            }
          />
        </div>
        <div>
          <div className="text-neutral-400 text-xs mb-1">Rate</div>
          <EditableCell
            value={row.rate}
            type="number"
            placeholder="-"
            onSave={(val) =>
              onUpdate(row.id, {
                rate: val === "" || val === null ? null : Number(val),
              })
            }
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          title="Mark In Transit"
          className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-2 py-1 hover:bg-neutral-900 text-sm"
          onClick={() => onUpdate(row.id, { status: "IN_TRANSIT" })}
        >
          <div className="inline-flex items-center gap-1">
            <Truck className="h-4 w-4" />
            In Transit
          </div>
        </button>
        <button
          title="Mark Delivered"
          className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-2 py-1 hover:bg-neutral-900 text-sm"
          onClick={() => onUpdate(row.id, { status: "DELIVERED" })}
        >
          <div className="inline-flex items-center gap-1">
            <CheckCheck className="h-4 w-4" />
            Delivered
          </div>
        </button>
      </div>

      <div className="mt-2 text-xs text-neutral-400">
        {row.created_at ? new Date(row.created_at).toLocaleString() : "-"}
      </div>
    </div>
  );
}
