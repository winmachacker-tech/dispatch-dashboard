// src/pages/loads.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase.js";
import {
  PlusCircle,
  Loader2,
  Search,
  Trash2,
  Edit3,
  CheckCheck,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BookmarkPlus,
  Bookmark,
  Trash,
} from "lucide-react";

// ───────────────────────────────────────────────────────────────────────────────
// Config
// ───────────────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;
const STATUSES = ["AVAILABLE", "IN_TRANSIT", "DELIVERED", "PROBLEM"];
const EQUIPMENT = ["VAN", "REEFER", "FLATBED", "STEPDECK", "BOX"];
const LS_FILTERS_KEY = "loads_filters_v1";
const LS_PRESETS_KEY = "loads_presets_v1";

function StatusBadge({ status }) {
  const styles =
    {
      AVAILABLE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      IN_TRANSIT: "bg-sky-500/15 text-sky-300 border-sky-500/30",
      DELIVERED: "bg-violet-500/15 text-violet-300 border-violet-500/30",
      PROBLEM: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    }[status] || "bg-neutral-700/30 text-neutral-300 border-neutral-600/30";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs border ${styles}`}>
      {status}
    </span>
  );
}

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isOverdue(r) {
  if (!r.delivery_date || r.status === "DELIVERED") return false;
  const end = new Date(r.delivery_date);
  end.setHours(23, 59, 59, 999);
  return end < new Date();
}

function isToday(d) {
  if (!d) return false;
  const x = new Date(d);
  const now = new Date();
  return (
    x.getFullYear() === now.getFullYear() &&
    x.getMonth() === now.getMonth() &&
    x.getDate() === now.getDate()
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Add / Edit Modal
// ───────────────────────────────────────────────────────────────────────────────
function LoadModal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(
    initial || {
      shipper: "",
      reference: "",
      origin: "",
      pickup_date: "",
      destination: "",
      delivery_date: "",
      dispatcher: "",
      driver: "",
      equipment_type: "VAN",
      rate: "",
      status: "AVAILABLE",
      notes: "",
    }
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) setForm({ ...initial, rate: initial.rate ?? "" });
    if (!initial && open) {
      setForm({
        shipper: "",
        reference: "",
        origin: "",
        pickup_date: "",
        destination: "",
        delivery_date: "",
        dispatcher: "",
        driver: "",
        equipment_type: "VAN",
        rate: "",
        status: "AVAILABLE",
        notes: "",
      });
    }
  }, [initial, open]);

  const disabled =
    !form.shipper.trim() ||
    !form.origin.trim() ||
    !form.destination.trim() ||
    !form.dispatcher.trim();

  async function handleSubmit(e) {
    e.preventDefault();
    if (disabled || saving) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        rate: form.rate !== "" ? Number(form.rate) : null,
        pickup_date: form.pickup_date || null,
        delivery_date: form.delivery_date || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-950 text-neutral-100 shadow-2xl"
      >
        <div className="px-6 py-5 border-b border-neutral-800">
          <h3 className="text-lg font-semibold">{initial ? "Edit Load" : "Add Load"}</h3>
          <p className="text-sm text-neutral-400">Minimal, only what dispatchers need.</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LabeledInput
              label="Shipper"
              value={form.shipper}
              onChange={(v) => setForm((f) => ({ ...f, shipper: v }))}
              placeholder="Acme Corp"
            />
            <LabeledInput
              label="Reference # (BOL / PO / Load#)"
              value={form.reference}
              onChange={(v) => setForm((f) => ({ ...f, reference: v }))}
              placeholder="183025"
            />
            <LabeledSelect
              label="Equipment"
              value={form.equipment_type}
              onChange={(v) => setForm((f) => ({ ...f, equipment_type: v }))}
              options={EQUIPMENT}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LabeledInput
              label="Origin"
              value={form.origin}
              onChange={(v) => setForm((f) => ({ ...f, origin: v }))}
              placeholder="Sacramento, CA"
            />
            <LabeledInput
              label="Destination"
              value={form.destination}
              onChange={(v) => setForm((f) => ({ ...f, destination: v }))}
              placeholder="Dallas, TX"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LabeledInput
              label="Pickup Date"
              type="date"
              value={form.pickup_date || ""}
              onChange={(v) => setForm((f) => ({ ...f, pickup_date: v }))}
            />
            <LabeledInput
              label="Delivery Date"
              type="date"
              value={form.delivery_date || ""}
              onChange={(v) => setForm((f) => ({ ...f, delivery_date: v }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LabeledInput
              label="Dispatcher"
              value={form.dispatcher}
              onChange={(v) => setForm((f) => ({ ...f, dispatcher: v }))}
              placeholder="Danielle"
            />
            <LabeledInput
              label="Driver"
              value={form.driver}
              onChange={(v) => setForm((f) => ({ ...f, driver: v }))}
              placeholder="Dan Wilson"
            />
            <LabeledInput
              label="Rate (USD)"
              type="number"
              min="0"
              value={form.rate}
              onChange={(v) => setForm((f) => ({ ...f, rate: v }))}
              placeholder="1800"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LabeledSelect
              label="Status"
              value={form.status}
              onChange={(v) => setForm((f) => ({ ...f, status: v }))}
              options={STATUSES}
            />
            <div className="md:col-span-2">
              <LabeledTextArea
                label="Notes (internal)"
                value={form.notes}
                onChange={(v) => setForm((f) => ({ ...f, notes: v }))}
                placeholder="Broker says driver must call 2h prior…"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-5 border-t border-neutral-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-neutral-700 hover:bg-neutral-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={disabled || saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-medium disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
            {initial ? "Save" : "Add Load"}
          </button>
        </div>
      </form>
    </div>
  );
}

function LabeledInput({ label, value, onChange, placeholder, type = "text", ...rest }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-neutral-300">{label}</span>
      <input
        className="rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2 outline-none focus:border-neutral-600"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        {...rest}
      />
    </label>
  );
}

function LabeledSelect({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-neutral-300">{label}</span>
      <select
        className="rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2 outline-none focus:border-neutral-600"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function LabeledTextArea({ label, value, onChange, placeholder }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-neutral-300">{label}</span>
      <textarea
        className="rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2 outline-none focus:border-neutral-600 min-h-[80px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Toolbar (filters/search/sort/export + presets)
// ───────────────────────────────────────────────────────────────────────────────
function Toolbar({
  q,
  setQ,
  status,
  setStatus,
  dispatcher,
  setDispatcher,
  dispatchers,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  sortBy,
  setSortBy,
  onExport,
  onAdd,
  selectedCount,
  onBulkSetStatus,
  onBulkDelete,
  presets,
  onSavePreset,
  onApplyPreset,
  onDeletePreset,
}) {
  const [presetSel, setPresetSel] = useState("");

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      {/* Left: Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search shipper, ref, origin, destination, dispatcher, driver"
            className="pl-9 pr-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 outline-none focus:border-neutral-600 w-80"
          />
        </div>

        <div className="flex items-center gap-1">
          {["ALL", ...STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s === "ALL" ? "" : s)}
              className={[
                "px-3 py-1.5 rounded-xl border text-sm",
                s === (status || "ALL")
                  ? "border-neutral-600 bg-neutral-900"
                  : "border-neutral-800 hover:border-neutral-700",
              ].join(" ")}
            >
              {s === "ALL" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>

        <select
          value={dispatcher}
          onChange={(e) => setDispatcher(e.target.value)}
          className="rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2 outline-none focus:border-neutral-600"
        >
          <option value="">All Dispatchers</option>
          {dispatchers.map((d) => (
            <option key={d || "(Unassigned)"} value={d}>
              {d || "(Unassigned)"}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2 outline-none focus:border-neutral-600"
          />
          <span className="text-neutral-500 text-sm">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2 outline-none focus:border-neutral-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-400">Sort</span>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2 pr-8 outline-none focus:border-neutral-600"
            >
              <option value="created_at.desc">Newest</option>
              <option value="created_at.asc">Oldest</option>
              <option value="delivery_date.asc">Delivery (soonest)</option>
              <option value="delivery_date.desc">Delivery (latest)</option>
              <option value="rate.desc">Rate (high → low)</option>
              <option value="rate.asc">Rate (low → high)</option>
              <option value="shipper.asc">Shipper (A→Z)</option>
              <option value="shipper.desc">Shipper (Z→A)</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-neutral-500" />
          </div>
        </div>
      </div>

      {/* Right: Presets + Actions */}
      <div className="flex items-center gap-2">
        {/* Presets */}
        <div className="flex items-center gap-2 mr-2">
          <button
            onClick={onSavePreset}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-800 hover:border-neutral-700"
            title="Save current filters"
          >
            <BookmarkPlus className="h-4 w-4" />
            Save view
          </button>

          <div className="relative">
            <select
              value={presetSel}
              onChange={(e) => setPresetSel(e.target.value)}
              className="appearance-none rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2 pr-8 outline-none focus:border-neutral-600"
            >
              <option value="">Presets…</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-neutral-500" />
          </div>

          <button
            disabled={!presetSel}
            onClick={() => onApplyPreset(presetSel)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-800 disabled:opacity-50"
            title="Apply preset"
          >
            <Bookmark className="h-4 w-4" />
            Apply
          </button>
          <button
            disabled={!presetSel}
            onClick={() => {
              onDeletePreset(presetSel);
              setPresetSel("");
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-800 disabled:opacity-50 hover:border-red-600/40 hover:bg-red-500/10 text-red-300"
            title="Delete preset"
          >
            <Trash className="h-4 w-4" />
          </button>
        </div>

        {/* Bulk actions */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 mr-2">
            <select
              className="rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2 outline-none focus:border-neutral-600"
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                onBulkSetStatus(v);
                e.target.value = "";
              }}
              defaultValue=""
            >
              <option value="">Bulk: set status…</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              onClick={onBulkDelete}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-800 hover:border-red-600/40 hover:bg-red-500/10 text-red-300"
              title="Delete selected"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        )}

        {/* Export + Add */}
        <button
          onClick={onExport}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-800 hover:border-neutral-700"
          title="Export current view to CSV"
        >
          <Download className="h-4 w-4" />
          Export
        </button>

        <button
          onClick={onAdd}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white text-black font-medium"
        >
          <PlusCircle className="h-4 w-4" />
          Add Load
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Main Page (with realtime + saved filters + instant patch)
// ───────────────────────────────────────────────────────────────────────────────
export default function LoadsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Filters / UI state
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [dispatcher, setDispatcher] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("created_at.desc");

  // Modal
  const [openModal, setOpenModal] = useState(false);
  const [editRow, setEditRow] = useState(null);

  // Bulk select
  const [selected, setSelected] = useState(new Set());

  // Presets
  const [presets, setPresets] = useState([]);

  // Throttle refresh from realtime
  const refreshLock = useRef(false);

  // Helper: patch a row instantly in UI
  function patchRowInState(updated) {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
  }

  // Load saved filters on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_FILTERS_KEY) || "null");
      if (saved) {
        setQ(saved.q ?? "");
        setStatus(saved.status ?? "");
        setDispatcher(saved.dispatcher ?? "");
        setDateFrom(saved.dateFrom ?? "");
        setDateTo(saved.dateTo ?? "");
        setSortBy(saved.sortBy ?? "created_at.desc");
      }
    } catch {}
    try {
      const savedPresets = JSON.parse(localStorage.getItem(LS_PRESETS_KEY) || "[]");
      setPresets(Array.isArray(savedPresets) ? savedPresets : []);
    } catch {}
  }, []);

  // Persist filters whenever they change
  useEffect(() => {
    const payload = { q, status, dispatcher, dateFrom, dateTo, sortBy };
    localStorage.setItem(LS_FILTERS_KEY, JSON.stringify(payload));
  }, [q, status, dispatcher, dateFrom, dateTo, sortBy]);

  // unique dispatchers from current page (fast)
  const dispatchers = useMemo(() => {
    const set = new Set(rows.map((r) => r.dispatcher).filter(Boolean));
    return Array.from(set).sort((a, b) => (a || "").localeCompare(b || ""));
  }, [rows]);

  // Fetch with filters + pagination
  useEffect(() => {
    let ignore = false;
    async function fetchData() {
      setLoading(true);
      try {
        let query = supabase
          .from("loads")
          .select(
            "id, created_at, updated_at, shipper, reference, origin, pickup_date, destination, delivery_date, dispatcher, driver, equipment_type, rate, status, notes"
          )
          .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

        if (q.trim()) {
          const term = `%${q.trim()}%`;
          query = query.or(
            [
              `shipper.ilike.${term}`,
              `reference.ilike.${term}`,
              `origin.ilike.${term}`,
              `destination.ilike.${term}`,
              `dispatcher.ilike.${term}`,
              `driver.ilike.${term}`,
            ].join(",")
          );
        }
        if (status) query = query.eq("status", status);
        if (dispatcher) query = query.eq("dispatcher", dispatcher);
        if (dateFrom) query = query.gte("created_at", new Date(dateFrom).toISOString());
        if (dateTo) {
          const end = new Date(dateTo);
          end.setDate(end.getDate() + 1);
          query = query.lt("created_at", end.toISOString());
        }

        const [col, dir] = sortBy.split(".");
        query = query.order(col, { ascending: dir === "asc" });

        const { data, error } = await query;
        if (error) throw error;

        if (!ignore) {
          setRows(data || []);
          setHasMore((data || []).length === PAGE_SIZE);
          setSelected(new Set());
        }
      } catch (e) {
        console.error("Supabase fetch error:", e);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchData();
    return () => {
      ignore = true;
    };
  }, [q, status, dispatcher, dateFrom, dateTo, sortBy, page]);

  // Realtime subscription (insert / update / delete)
  useEffect(() => {
    const channel = supabase
      .channel("public:loads")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "loads" },
        () => {
          if (refreshLock.current) return;
          refreshLock.current = true;
          setTimeout(() => {
            refreshLock.current = false;
          }, 600);
          setPage((p) => p);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function refreshCurrentPage() {
    setPage((p) => p);
  }

  // CRUD
  async function handleAddSave(payload) {
    const { error } = await supabase.from("loads").insert([
      {
        shipper: payload.shipper,
        reference: payload.reference || null,
        origin: payload.origin,
        pickup_date: payload.pickup_date, // may be null
        destination: payload.destination,
        delivery_date: payload.delivery_date, // may be null
        dispatcher: payload.dispatcher,
        driver: payload.driver || null,
        equipment_type: payload.equipment_type || "VAN",
        rate: payload.rate,
        status: payload.status || "AVAILABLE",
        notes: payload.notes || null,
      },
    ]);
    if (error) {
      console.error("Insert error:", error);
      return;
    }
    setPage(0);
    refreshCurrentPage();
  }

  async function handleEditSave(payload) {
    if (!editRow) return;

    const { data, error } = await supabase
      .from("loads")
      .update({
        shipper: payload.shipper,
        reference: payload.reference || null,
        origin: payload.origin,
        pickup_date: payload.pickup_date,
        destination: payload.destination,
        delivery_date: payload.delivery_date,
        dispatcher: payload.dispatcher,
        driver: payload.driver || null,
        equipment_type: payload.equipment_type || "VAN",
        rate: payload.rate,
        status: payload.status,
        notes: payload.notes || null,
      })
      .eq("id", editRow.id)
      .select(
        "id, created_at, updated_at, shipper, reference, origin, pickup_date, destination, delivery_date, dispatcher, driver, equipment_type, rate, status, notes"
      )
      .single();

    if (error) {
      console.error("Update error:", error);
      return;
    }

    patchRowInState(data);
    setEditRow(null);
    setOpenModal(false);
    refreshCurrentPage();
  }

  async function handleDelete(id) {
    const { error } = await supabase.from("loads").delete().eq("id", id);
    if (error) {
      console.error("Delete error:", error);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    refreshCurrentPage();
  }

  async function handleQuickStatus(id, nextStatus) {
    const { data, error } = await supabase
      .from("loads")
      .update({ status: nextStatus })
      .eq("id", id)
      .select(
        "id, created_at, updated_at, shipper, reference, origin, pickup_date, destination, delivery_date, dispatcher, driver, equipment_type, rate, status, notes"
      )
      .single();

    if (error) {
      console.error("Status update error:", error);
      return;
    }

    patchRowInState(data);
    refreshCurrentPage();
  }

  // Bulk ops
  async function bulkSetStatus(nextStatus) {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from("loads").update({ status: nextStatus }).in("id", ids);
    if (error) {
      console.error("Bulk status error:", error);
      return;
    }
    refreshCurrentPage();
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from("loads").delete().in("id", ids);
    if (error) {
      console.error("Bulk delete error:", error);
      return;
    }
    refreshCurrentPage();
  }

  // CSV export of current view
  function exportCSV() {
    if (!rows.length) return;
    const headers = [
      "id",
      "created_at",
      "updated_at",
      "shipper",
      "reference",
      "origin",
      "pickup_date",
      "destination",
      "delivery_date",
      "dispatcher",
      "driver",
      "equipment_type",
      "rate",
      "status",
      "notes",
    ];
    const lines = [headers.join(",")];
    rows.forEach((r) => {
      const vals = headers.map((h) => {
        let v = r[h] ?? "";
        if (typeof v === "string") v = `"${v.replaceAll(`"`, `""`)}"`;
        return v;
      });
      lines.push(vals.join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loads_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Selection helpers
  const allChecked = rows.length > 0 && selected.size === rows.length;
  function toggleAll() {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  }
  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Preset helpers
  function currentFilterState() {
    return { q, status, dispatcher, dateFrom, dateTo, sortBy };
  }
  function onSavePreset() {
    const name = window.prompt("Name this view:");
    if (!name) return;
    const id = crypto.randomUUID();
    const next = [...presets, { id, name, ...currentFilterState() }];
    setPresets(next);
    localStorage.setItem(LS_PRESETS_KEY, JSON.stringify(next));
  }
  function onApplyPreset(id) {
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    setQ(p.q ?? "");
    setStatus(p.status ?? "");
    setDispatcher(p.dispatcher ?? "");
    setDateFrom(p.dateFrom ?? "");
    setDateTo(p.dateTo ?? "");
    setSortBy(p.sortBy ?? "created_at.desc");
    setPage(0);
  }
  function onDeletePreset(id) {
    const next = presets.filter((p) => p.id !== id);
    setPresets(next);
    localStorage.setItem(LS_PRESETS_KEY, JSON.stringify(next));
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Loads</h1>
          <p className="text-sm text-neutral-400">Dates, drivers, equipment — all at a glance.</p>
        </div>
      </div>

      {/* Toolbar */}
      <Toolbar
        q={q}
        setQ={(v) => {
          setPage(0);
          setQ(v);
        }}
        status={status}
        setStatus={(v) => {
          setPage(0);
          setStatus(v);
        }}
        dispatcher={dispatcher}
        setDispatcher={(v) => {
          setPage(0);
          setDispatcher(v);
        }}
        dispatchers={dispatchers}
        dateFrom={dateFrom}
        setDateFrom={(v) => {
          setPage(0);
          setDateFrom(v);
        }}
        dateTo={dateTo}
        setDateTo={(v) => {
          setPage(0);
          setDateTo(v);
        }}
        sortBy={sortBy}
        setSortBy={(v) => {
          setPage(0);
          setSortBy(v);
        }}
        onExport={exportCSV}
        onAdd={() => {
          setEditRow(null);
          setOpenModal(true);
        }}
        selectedCount={selected.size}
        onBulkSetStatus={bulkSetStatus}
        onBulkDelete={bulkDelete}
        presets={presets}
        onSavePreset={onSavePreset}
        onApplyPreset={onApplyPreset}
        onDeletePreset={onDeletePreset}
      />

      {/* Table */}
      <div className="rounded-2xl border border-neutral-800 overflow-hidden">
        <div className="min-w-full overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-950/50 border-b border-neutral-800 sticky top-0">
              <tr className="text-left">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    className="h-4 w-4 accent-white"
                  />
                </th>
                <th className="px-4 py-3">Shipper</th>
                <th className="px-4 py-3">Ref</th>
                <th className="px-4 py-3">Origin</th>
                <th className="px-4 py-3">Pickup</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3">Dispatcher</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Equip</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right w-40">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-800">
              {loading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 15 }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 w-24 bg-neutral-800 rounded" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={15} className="px-6 py-12 text-center text-neutral-400">
                    No loads found. Try adjusting filters or{" "}
                    <button
                      className="underline hover:text-neutral-200"
                      onClick={() => setOpenModal(true)}
                    >
                      add a load
                    </button>
                    .
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className={[
                      "hover:bg-neutral-950/40",
                      isOverdue(r) ? "bg-red-500/5" : "",
                    ].join(" ")}
                  >
                    <td className="px-4 py-3 align-middle">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleOne(r.id)}
                        className="h-4 w-4 accent-white"
                      />
                    </td>
                    <td className="px-4 py-3">{r.shipper}</td>
                    <td className="px-4 py-3">{r.reference || "—"}</td>
                    <td className="px-4 py-3">{r.origin}</td>
                    <td className="px-4 py-3">
                      <span className={isToday(r.pickup_date) ? "underline" : ""}>
                        {fmtDate(r.pickup_date)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{r.destination}</td>
                    <td className="px-4 py-3">
                      <span className={isToday(r.delivery_date) ? "underline" : ""}>
                        {fmtDate(r.delivery_date)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{r.dispatcher}</td>
                    <td className="px-4 py-3">{r.driver || "—"}</td>
                    <td className="px-4 py-3">{r.equipment_type || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {r.rate ? `$${r.rate.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3">{fmtDate(r.updated_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        {/* Quick status cycle */}
                        <button
                          onClick={() =>
                            handleQuickStatus(
                              r.id,
                              r.status === "AVAILABLE"
                                ? "IN_TRANSIT"
                                : r.status === "IN_TRANSIT"
                                ? "DELIVERED"
                                : "AVAILABLE"
                            )
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-neutral-800 hover:border-neutral-700"
                          title="Advance status"
                        >
                          <CheckCheck className="h-4 w-4" />
                          Next
                        </button>

                        <button
                          onClick={() => {
                            setEditRow(r);
                            setOpenModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-neutral-800 hover:border-neutral-700"
                          title="Edit"
                        >
                          <Edit3 className="h-4 w-4" />
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(r.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-neutral-800 hover:border-red-600/40 hover:bg-red-500/10 text-red-300"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-800 bg-neutral-950/40">
          <div className="text-sm text-neutral-400">
            Page <span className="text-neutral-200">{page + 1}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-800 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-800 disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <LoadModal
        open={openModal}
        onClose={() => {
          setOpenModal(false);
          setEditRow(null);
        }}
        onSave={editRow ? handleEditSave : handleAddSave}
        initial={editRow}
      />
    </div>
  );
}
