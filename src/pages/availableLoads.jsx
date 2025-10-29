// src/pages/availableLoads.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import {
  PlusCircle,
  CheckCheck,
  Truck,
  AlertTriangle,
  Trash2,
  Edit3,
  Loader2,
  Search,
  ChevronDown,
} from "lucide-react";
import { changeStatus } from "../lib/status.js";   // NEW: RPC helper
import { subscribeLoads } from "../lib/loads.js";  // NEW: realtime helper

// ──────────────────────────────────────────────────────────────────────────────
// Status helpers
const STATUSES = ["AVAILABLE", "IN_TRANSIT", "PROBLEM", "DELIVERED"];

function StatusBadge({ status }) {
  const styles =
    {
      AVAILABLE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      IN_TRANSIT: "bg-sky-500/15 text-sky-300 border-sky-500/30",
      PROBLEM: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      DELIVERED: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    }[status] ||
    "bg-neutral-700/30 text-neutral-300 border-neutral-600/30";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs border ${styles}`}>
      {status}
    </span>
  );
}

function Pill({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-lg text-xs border transition ${
        active
          ? "bg-neutral-800 border-neutral-700 text-neutral-100"
          : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200"
      }`}
    >
      {children}
    </button>
  );
}

function IconButton({ title, onClick, children, disabled }) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border transition
        ${disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-neutral-800"}
        border-neutral-800 bg-neutral-900 text-neutral-300`}
    >
      {children}
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main page
export default function AvailableLoadsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState("AVAILABLE"); // default tab
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("created_at.desc");
  const [lastSynced, setLastSynced] = useState(null);

  // Add/Edit form modal
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    shipper: "",
    origin: "",
    destination: "",
    dispatcher: "",
    rate: "",
    status: "AVAILABLE",
  });

  // ── Fetch (reusable so realtime can call it)
  async function refresh() {
    setLoading(true);
    const { data, error } = await supabase
      .from("loads")
      .select("id, created_at, shipper, origin, destination, dispatcher, rate, status")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Supabase fetch error:", error);
      setRows([]);
    } else {
      setRows(data || []);
    }
    setLastSynced(new Date());
    setLoading(false);
  }

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!ignore) await refresh();
    })();
    return () => {
      ignore = true;
    };
  }, []);

  // ── Realtime: on any INSERT/UPDATE/DELETE, refresh this list
  useEffect(() => {
    const off = subscribeLoads(() => refresh());
    return () => off();
  }, []);

  // ── Derived list (filter + search + sort)
  const list = useMemo(() => {
    let out = rows;

    if (filter) out = out.filter((r) => r.status === filter);

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      out = out.filter((r) =>
        [r.shipper, r.origin, r.destination, r.dispatcher, r.status]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }

    const [col, dir] = sortBy.split(".");
    out = [...out].sort((a, b) => {
      const av = a[col];
      const bv = b[col];
      if (col === "created_at") {
        return dir === "asc"
          ? new Date(av) - new Date(bv)
          : new Date(bv) - new Date(av);
      }
      if (col === "rate") {
        return dir === "asc" ? Number(av ?? 0) - Number(bv ?? 0) : Number(bv ?? 0) - Number(av ?? 0);
      }
      const as = String(av ?? "");
      const bs = String(bv ?? "");
      return dir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });

    return out;
  }, [rows, filter, query, sortBy]);

  // ── Actions

  // Use the RPC for status transitions so audit & timestamps are correct
  async function updateStatus(id, toStatus) {
    try {
      setBusyId(id);
      // Optimistic UI (optional)
      const prev = rows;
      setRows((xs) => xs.map((x) => (x.id === id ? { ...x, status: toStatus } : x)));

      await changeStatus(id, toStatus); // ← RPC call (update_load_status)
      // Realtime will call refresh() and reconcile; nothing else needed
    } catch (err) {
      console.error("Status change failed:", err);
      // On failure, re-sync from server
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function removeRow(id) {
    if (!confirm("Delete this load?")) return;
    setBusyId(id);
    const prev = rows;
    setRows((xs) => xs.filter((x) => x.id !== id));
    const { error } = await supabase.from("loads").delete().eq("id", id);
    if (error) {
      console.error(error);
      setRows(prev);
    }
    setBusyId(null);
  }

  function openAdd() {
    setEditing(null);
    setForm({
      shipper: "",
      origin: "",
      destination: "",
      dispatcher: "",
      rate: "",
      status: "AVAILABLE",
    });
    setOpenForm(true);
  }

  function openEdit(row) {
    setEditing(row.id);
    setForm({
      shipper: row.shipper || "",
      origin: row.origin || "",
      destination: row.destination || "",
      dispatcher: row.dispatcher || "",
      rate: row.rate ?? "",
      status: row.status || "AVAILABLE",
    });
    setOpenForm(true);
  }

  async function submitForm(e) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      shipper: form.shipper?.trim() || null,
      origin: form.origin?.trim() || null,
      destination: form.destination?.trim() || null,
      dispatcher: form.dispatcher?.trim() || null,
      rate: form.rate === "" ? null : Number(form.rate),
      status: form.status || "AVAILABLE",
    };

    if (editing) {
      const { data, error } = await supabase
        .from("loads")
        .update(payload)
        .eq("id", editing)
        .select()
        .single();
      if (error) {
        console.error(error);
      } else {
        setRows((xs) => xs.map((x) => (x.id === editing ? data : x)));
      }
    } else {
      const { data, error } = await supabase
        .from("loads")
        .insert(payload)
        .select()
        .single();
      if (error) {
        console.error(error);
      } else if (data) {
        setRows((xs) => [data, ...xs]);
      }
    }

    setSaving(false);
    setOpenForm(false);
    setEditing(null);
  }

  // ── UI
  return (
    <div className="max-w-5xl mx-auto">
      {/* Header row */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Available Loads</h2>
          <span className="text-xs text-neutral-500">
            {lastSynced ? `Last synced: ${lastSynced.toLocaleTimeString()}` : "—"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Sort dropdown (basic select for now) */}
          <div className="relative">
            <button className="inline-flex items-center gap-1 text-xs bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg">
              <ChevronDown size={14} />
              Sort
            </button>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5"
          >
            <option value="created_at.desc">Newest</option>
            <option value="created_at.asc">Oldest</option>
            <option value="rate.desc">Rate ↓</option>
            <option value="rate.asc">Rate ↑</option>
            <option value="shipper.asc">Shipper A–Z</option>
          </select>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
          >
            <PlusCircle size={16} /> Add Load
          </button>
        </div>
      </div>

      {/* Search + Tabs */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative md:w-80">
          <Search size={16} className="absolute left-3 top-2.5 text-neutral-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city, shipper, dispatcher..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {STATUSES.map((s) => (
            <Pill key={s} active={filter === s} onClick={() => setFilter(s)}>
              {s.replace("_", "-")}
            </Pill>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-2 text-neutral-400">
          <Loader2 className="animate-spin" size={16} />
          Loading…
        </div>
      ) : list.length === 0 ? (
        <div className="text-neutral-400 text-sm">No loads match this view.</div>
      ) : (
        <div className="space-y-3">
          {list.map((row) => (
            <div
              key={row.id}
              className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition"
            >
              {/* Title + status */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">
                    {row.origin || "—"} → {row.destination || "—"}
                  </div>
                  <div className="mt-1 text-xs text-neutral-400 flex flex-wrap gap-x-3 gap-y-1">
                    <span>💵 {row.rate ? `$${row.rate}` : "—"}</span>
                    <span>📦 {row.shipper || "—"}</span>
                    <span>🗓 {new Date(row.created_at).toLocaleDateString()}</span>
                    <span>👤 {row.dispatcher || "—"}</span>
                  </div>
                </div>
                <StatusBadge status={row.status} />
              </div>

              {/* Quick actions */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <IconButton
                  title="Set In-Transit"
                  onClick={() => updateStatus(row.id, "IN_TRANSIT")}
                  disabled={busyId === row.id}
                >
                  <Truck size={14} />
                  In-Transit
                </IconButton>
                <IconButton
                  title="Mark Delivered"
                  onClick={() => updateStatus(row.id, "DELIVERED")}
                  disabled={busyId === row.id}
                >
                  <CheckCheck size={14} />
                  Delivered
                </IconButton>
                <IconButton
                  title="Report Problem"
                  onClick={() => updateStatus(row.id, "PROBLEM")}
                  disabled={busyId === row.id}
                >
                  <AlertTriangle size={14} />
                  Problem
                </IconButton>
                <IconButton
                  title="Edit"
                  onClick={() => openEdit(row)}
                  disabled={busyId === row.id}
                >
                  <Edit3 size={14} />
                  Edit
                </IconButton>
                <IconButton
                  title="Delete"
                  onClick={() => removeRow(row.id)}
                  disabled={busyId === row.id}
                >
                  <Trash2 size={14} />
                  Delete
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={openForm}
        onClose={() => {
          if (!saving) {
            setOpenForm(false);
            setEditing(null);
          }
        }}
        title={editing ? "Edit Load" : "Add Load"}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              className="px-3 py-1.5 text-xs rounded-lg border border-neutral-800"
              onClick={() => {
                if (!saving) {
                  setOpenForm(false);
                  setEditing(null);
                }
              }}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={submitForm}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs"
            >
              {saving && <Loader2 className="animate-spin" size={14} />}
              {editing ? "Save Changes" : "Create Load"}
            </button>
          </div>
        }
      >
        <form onSubmit={submitForm} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="col-span-1">
            <label className="block text-xs text-neutral-400 mb-1">Shipper</label>
            <input
              value={form.shipper}
              onChange={(e) => setForm((f) => ({ ...f, shipper: e.target.value }))}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-xs text-neutral-400 mb-1">Dispatcher</label>
            <input
              value={form.dispatcher}
              onChange={(e) => setForm((f) => ({ ...f, dispatcher: e.target.value }))}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-xs text-neutral-400 mb-1">Origin</label>
            <input
              value={form.origin}
              onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="col-span-1">
            <label className="block text-xs text-neutral-400 mb-1">Destination</label>
            <input
              value={form.destination}
              onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="col-span-1">
            <label className="block text-xs text-neutral-400 mb-1">Rate (USD)</label>
            <input
              type="number"
              step="1"
              inputMode="numeric"
              value={form.rate}
              onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-xs text-neutral-400 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", "-")}
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Add / Edit modal (simple, no extra lib)
function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-950">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-200">
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-neutral-800">{footer}</div>}
      </div>
    </div>
  );
}
