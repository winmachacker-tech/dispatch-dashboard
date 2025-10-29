// src/pages/drivers.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  PlusCircle,
  Search,
  Loader2,
  Phone,
  Mail,
  Truck,
  UserPlus,
  X,
  Check,
  AlertTriangle,
  Download,
  NotebookPen,
} from "lucide-react";

const DRIVER_STATUSES = [
  "AVAILABLE",
  "ASSIGNED",
  "OFF",
  "ON_LEAVE",
  "SUSPENDED",
  "INACTIVE",
];

function StatusBadge({ status }) {
  const styles =
    {
      AVAILABLE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      ASSIGNED: "bg-sky-500/15 text-sky-300 border-sky-500/30",
      OFF: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      ON_LEAVE: "bg-purple-500/15 text-purple-300 border-purple-500/30",
      SUSPENDED: "bg-red-500/15 text-red-300 border-red-500/30",
      INACTIVE: "bg-neutral-500/15 text-neutral-300 border-neutral-500/30",
    }[status] || "bg-neutral-700/30 text-neutral-300 border-neutral-600/30";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs border ${styles}`}>
      {status}
    </span>
  );
}

function Select({ value, onChange, children, className = "" }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-neutral-900/50 border border-neutral-700 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-neutral-500 ${className}`}
    >
      {children}
    </select>
  );
}

function ActionButton({ onClick, disabled, children, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex items-center gap-1 px-2 py-1 border border-neutral-700 rounded-lg text-sm hover:bg-neutral-800 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function csvDownload(filename, rows) {
  const headers = Object.keys(rows[0] || {});
  const body = rows
    .map((r) =>
      headers
        .map((h) => {
          const val = r[h] ?? "";
          const safe = String(val).replaceAll('"', '""');
          return `"${safe}"`;
        })
        .join(",")
    )
    .join("\n");
  const csv = [headers.join(","), body].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* --- Tiny toast --- */
function Toast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div className="fixed top-4 right-4 z-[60]">
      <div
        className={`rounded-lg border px-3 py-2 text-sm shadow-lg ${
          toast.type === "error"
            ? "border-red-700/50 bg-red-900/30 text-red-200"
            : "border-emerald-700/50 bg-emerald-900/30 text-emerald-200"
        }`}
      >
        <div className="flex items-center gap-2">
          {toast.type === "error" ? <AlertTriangle size={16} /> : <Check size={16} />}
          <span>{toast.message}</span>
          <button className="ml-2 opacity-70 hover:opacity-100" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children, className = "" }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs text-neutral-400">
        {label} {required && <span className="text-red-400">*</span>}
      </span>
      {children}
    </label>
  );
}

function AddDriverModal({ open, onClose, onAdded, onToast }) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    status: "AVAILABLE",
    cdl_number: "",
    cdl_expiration: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!open) {
      setForm({
        first_name: "",
        last_name: "",
        phone: "",
        email: "",
        status: "AVAILABLE",
        cdl_number: "",
        cdl_expiration: "",
        notes: "",
      });
      setSaving(false);
      setErrorMsg("");
    }
  }, [open]);

  const canSave =
    form.first_name.trim().length > 0 &&
    form.last_name.trim().length > 0 &&
    !!form.status;

  async function save() {
    setErrorMsg("");
    if (!canSave) {
      setErrorMsg("First and last name are required.");
      return;
    }
    setSaving(true);

    // Normalize and trim
    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      status: form.status,
      cdl_number: form.cdl_number.trim() || null,
      cdl_expiration: form.cdl_expiration || null, // keep null if empty
      notes: form.notes?.trim() || null,
    };

    const { data, error } = await supabase
      .from("drivers")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      console.error("[drivers insert]", error);
      setErrorMsg(error.message || "Failed to save driver.");
      setSaving(false);
      onToast?.({ type: "error", message: error.message || "Failed to save driver." });
      return;
    }

    // Log create (best-effort)
    await supabase.from("driver_activity_log").insert({
      driver_id: data.id,
      action: "CREATE",
      details: { status: payload.status },
    });

    onToast?.({ type: "success", message: "Driver created." });
    onAdded?.();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Add Driver</h3>
          <button className="p-1 hover:bg-neutral-800 rounded-lg" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {errorMsg ? (
          <div className="mb-4 text-sm text-red-300 border border-red-700/50 bg-red-900/20 px-3 py-2 rounded-lg">
            {errorMsg}
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="First name" required>
            <input
              className="input"
              value={form.first_name}
              onChange={(e) => setForm((s) => ({ ...s, first_name: e.target.value }))}
            />
          </Field>
          <Field label="Last name" required>
            <input
              className="input"
              value={form.last_name}
              onChange={(e) => setForm((s) => ({ ...s, last_name: e.target.value }))}
            />
          </Field>
          <Field label="Phone">
            <input
              className="input"
              value={form.phone}
              onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
            />
          </Field>
          <Field label="Email">
            <input
              className="input"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(v) => setForm((s) => ({ ...s, status: v }))}
              className="w-full"
            >
              {DRIVER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="CDL #">
            <input
              className="input"
              value={form.cdl_number}
              onChange={(e) => setForm((s) => ({ ...s, cdl_number: e.target.value }))}
            />
          </Field>
          <Field label="CDL Expiration">
            <input
              type="date"
              className="input"
              value={form.cdl_expiration}
              onChange={(e) => setForm((s) => ({ ...s, cdl_expiration: e.target.value }))}
            />
          </Field>
          <Field label="Notes" className="md:col-span-2">
            <textarea
              className="input min-h-[84px]"
              value={form.notes}
              onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
            />
          </Field>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <ActionButton onClick={onClose}>
            <X size={16} /> Cancel
          </ActionButton>
          <ActionButton onClick={save} disabled={!canSave || saving} title="Save driver">
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />} Save
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  function showToast(t) {
    setToast(t);
    setTimeout(() => setToast(null), 2500);
  }

  async function loadAll() {
    setLoading(true);

    // Drivers + joined truck (unit_number)
    const { data: driverData, error: driverErr } = await supabase
      .from("drivers")
      .select(
        `
        id, created_at, first_name, last_name, phone, email, status, truck_id,
        cdl_number, cdl_expiration, notes,
        truck:truck_id ( id, unit_number, status )
      `
      )
      .order("last_name", { ascending: true });

    if (driverErr) {
      console.error(driverErr);
      setLoading(false);
      showToast({ type: "error", message: driverErr.message || "Failed to load drivers." });
      return;
    }

    // Trucks for assignment list
    const { data: truckData, error: truckErr } = await supabase
      .from("trucks")
      .select("id, unit_number, status")
      .order("unit_number", { ascending: true });

    if (truckErr) {
      console.error(truckErr);
      setLoading(false);
      showToast({ type: "error", message: truckErr.message || "Failed to load trucks." });
      return;
    }

    setDrivers(driverData || []);
    setTrucks(truckData || []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filtered = useMemo(() => {
    let list = drivers;
    if (statusFilter !== "ALL") list = list.filter((d) => d.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((d) => {
        const name = `${d.first_name ?? ""} ${d.last_name ?? ""}`.toLowerCase();
        const phone = (d.phone ?? "").toLowerCase();
        const email = (d.email ?? "").toLowerCase();
        const unit = d.truck?.unit_number?.toLowerCase() ?? "";
        return (
          name.includes(q) || phone.includes(q) || email.includes(q) || unit.includes(q)
        );
      });
    }
    return list;
  }, [drivers, search, statusFilter]);

  const availableTrucks = useMemo(() => {
    // A truck is "available" if ACTIVE and not currently assigned to a non-INACTIVE driver
    const assignedTruckIds = new Set(
      drivers
        .filter((d) => d.truck_id && d.status !== "INACTIVE")
        .map((d) => d.truck_id)
    );
    return (trucks || []).filter(
      (t) => t.status === "ACTIVE" && !assignedTruckIds.has(t.id)
    );
  }, [drivers, trucks]);

  async function setDriverStatus(driver, nextStatus) {
    setBusyId(driver.id);
    const { error } = await supabase
      .from("drivers")
      .update({ status: nextStatus })
      .eq("id", driver.id);
    if (error) {
      showToast({ type: "error", message: error.message || "Failed to update status." });
    } else {
      await supabase.from("driver_activity_log").insert({
        driver_id: driver.id,
        action: "STATUS_CHANGE",
        details: { from: driver.status, to: nextStatus },
      });
      showToast({ type: "success", message: "Status updated." });
    }
    await loadAll();
    setBusyId(null);
  }

  async function assignTruck(driver, truckId) {
    setBusyId(driver.id);
    const truck = trucks.find((t) => t.id === Number(truckId));
    const { error } = await supabase
      .from("drivers")
      .update({ truck_id: truckId, status: driver.status === "INACTIVE" ? "AVAILABLE" : driver.status })
      .eq("id", driver.id);
    if (error) {
      showToast({ type: "error", message: error.message || "Failed to assign truck." });
    } else {
      await supabase.from("driver_activity_log").insert({
        driver_id: driver.id,
        action: "ASSIGNED_TRUCK",
        details: { truck_id: truck?.id, unit_number: truck?.unit_number },
      });
      showToast({ type: "success", message: "Truck assigned." });
    }
    await loadAll();
    setBusyId(null);
  }

  async function unassignTruck(driver) {
    if (!driver.truck_id) return;
    setBusyId(driver.id);
    const old = driver.truck;
    const { error } = await supabase
      .from("drivers")
      .update({ truck_id: null, status: driver.status === "ASSIGNED" ? "AVAILABLE" : driver.status })
      .eq("id", driver.id);
    if (error) {
      showToast({ type: "error", message: error.message || "Failed to unassign truck." });
    } else {
      await supabase.from("driver_activity_log").insert({
        driver_id: driver.id,
        action: "UNASSIGNED_TRUCK",
        details: { truck_id: old?.id, unit_number: old?.unit_number },
      });
      showToast({ type: "success", message: "Truck unassigned." });
    }
    await loadAll();
    setBusyId(null);
  }

  async function inactivateDriver(driver) {
    setBusyId(driver.id);
    const { error } = await supabase
      .from("drivers")
      .update({ status: "INACTIVE", truck_id: null })
      .eq("id", driver.id);
    if (error) {
      showToast({ type: "error", message: error.message || "Failed to inactivate driver." });
    } else {
      await supabase.from("driver_activity_log").insert({
        driver_id: driver.id,
        action: "INACTIVATE",
        details: { reason: "manual" },
      });
      showToast({ type: "success", message: "Driver set to INACTIVE." });
    }
    await loadAll();
    setBusyId(null);
  }

  async function updateNotes(driverId, notes) {
    setBusyId(driverId);
    const { error } = await supabase.from("drivers").update({ notes }).eq("id", driverId);
    if (error) {
      showToast({ type: "error", message: error.message || "Failed to update notes." });
    } else {
      await supabase.from("driver_activity_log").insert({
        driver_id: driverId,
        action: "UPDATE",
        details: { field: "notes" },
      });
      showToast({ type: "success", message: "Notes updated." });
    }
    await loadAll();
    setBusyId(null);
  }

  function exportCsv() {
    const rows = drivers.map((d) => ({
      id: d.id,
      name: `${d.first_name} ${d.last_name}`,
      phone: d.phone || "",
      email: d.email || "",
      status: d.status,
      truck_unit: d.truck?.unit_number || "",
      cdl_number: d.cdl_number || "",
      cdl_expiration: d.cdl_expiration || "",
      created_at: d.created_at,
    }));
    csvDownload("drivers.csv", rows);
  }

  return (
    <div className="space-y-5">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Drivers</h2>
        <div className="flex items-center gap-2">
          <ActionButton onClick={exportCsv} title="Export CSV">
            <Download size={16} /> Export
          </ActionButton>
          <ActionButton onClick={() => setAdding(true)} title="Add driver">
            <UserPlus size={16} /> Add
          </ActionButton>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2">
          <Search size={16} className="shrink-0 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, email, or unit #"
            className="w-full bg-transparent outline-none text-sm"
          />
        </div>
        <Select value={statusFilter} onChange={setStatusFilter} className="w-full md:w-[220px]">
          <option value="ALL">All statuses</option>
          {DRIVER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-950/70 border-b border-neutral-800">
            <tr className="[&>th]:px-3 [&>th]:py-2 text-left text-neutral-300">
              <th>Name</th>
              <th className="hidden md:table-cell">Contact</th>
              <th>Status</th>
              <th>Truck</th>
              <th className="hidden lg:table-cell">CDL Exp</th>
              <th className="hidden xl:table-cell">Notes</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-neutral-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-neutral-400">
                  <Loader2 className="inline-block animate-spin mr-1" /> Loading drivers…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-neutral-400">
                  No drivers found.
                </td>
              </tr>
            ) : (
              filtered.map((d) => (
                <tr key={d.id} className="[&>td]:px-3 [&>td]:py-3">
                  <td>
                    <div className="font-medium">{d.first_name} {d.last_name}</div>
                    <div className="md:hidden text-xs text-neutral-400 mt-0.5">
                      {d.phone ? <a className="hover:underline" href={`tel:${d.phone}`}>{d.phone}</a> : "—"}
                      {d.email ? <> · <a className="hover:underline" href={`mailto:${d.email}`}>{d.email}</a></> : null}
                    </div>
                  </td>

                  <td className="hidden md:table-cell">
                    <div className="flex items-center gap-2 text-neutral-300">
                      <a className="hover:underline inline-flex items-center gap-1" href={d.phone ? `tel:${d.phone}` : undefined} onClick={(e) => !d.phone && e.preventDefault()}>
                        <Phone size={14} /> {d.phone || "—"}
                      </a>
                      <span className="opacity-30">|</span>
                      <a className="hover:underline inline-flex items-center gap-1" href={d.email ? `mailto:${d.email}` : undefined} onClick={(e) => !d.email && e.preventDefault()}>
                        <Mail size={14} /> {d.email || "—"}
                      </a>
                    </div>
                  </td>

                  <td className="min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={d.status} />
                      <Select
                        value={d.status}
                        onChange={(v) => setDriverStatus(d, v)}
                        className="min-w-[120px]"
                      >
                        {DRIVER_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </Select>
                    </div>
                  </td>

                  <td className="min-w-[220px]">
                    {d.truck ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1">
                          <Truck size={14} /> {d.truck.unit_number}
                        </span>
                        <ActionButton
                          onClick={() => unassignTruck(d)}
                          disabled={busyId === d.id}
                          title="Unassign"
                        >
                          <X size={14} /> Unassign
                        </ActionButton>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Select
                          value=""
                          onChange={(truckId) => assignTruck(d, truckId)}
                          className="min-w-[160px]"
                        >
                          <option value="" disabled>
                            Assign truck…
                          </option>
                          {availableTrucks.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.unit_number}
                            </option>
                          ))}
                        </Select>
                        {availableTrucks.length === 0 && (
                          <span className="text-xs text-amber-400 inline-flex items-center gap-1">
                            <AlertTriangle size={12} /> none available
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="hidden lg:table-cell">
                    {d.cdl_expiration ? (
                      <span
                        className={
                          new Date(d.cdl_expiration) < new Date()
                            ? "text-red-400"
                            : "text-neutral-200"
                        }
                      >
                        {d.cdl_expiration}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="hidden xl:table-cell max-w-[280px] truncate">
                    {d.notes || "—"}
                  </td>

                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <ActionButton
                        onClick={() => {
                          const next = prompt("Update notes:", d.notes || "");
                          if (next !== null) {
                            updateNotes(d.id, next);
                          }
                        }}
                        title="Edit notes"
                      >
                        <NotebookPen size={14} /> Notes
                      </ActionButton>

                      <ActionButton
                        onClick={() => inactivateDriver(d)}
                        disabled={busyId === d.id || d.status === "INACTIVE"}
                        title="Set INACTIVE and clear truck"
                      >
                        {busyId === d.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} Remove
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddDriverModal
        open={adding}
        onClose={() => setAdding(false)}
        onAdded={() => loadAll()}
        onToast={showToast}
      />
    </div>
  );
}

/* Tailwind sugar class for inputs (local to this file) */
const inputStyle = `
w-full bg-neutral-900/50 border border-neutral-700 rounded-lg px-3 py-2 outline-none
focus:ring-2 focus:ring-neutral-500 placeholder:text-neutral-500
`;
const style = document.createElement("style");
style.innerHTML = `.input { ${inputStyle} }`;
document.head.appendChild(style);
