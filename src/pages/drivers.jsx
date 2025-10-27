// src/pages/drivers.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// Badge for driver status
function DriverBadge({ status }) {
  const styles =
    {
      ACTIVE: "bg-green-500/15 text-green-300 border-green-500/30",
      INACTIVE: "bg-red-500/15 text-red-300 border-red-500/30",
      ON_LEAVE: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    }[status] || "bg-neutral-700/30 text-neutral-300 border-neutral-600/30";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs border ${styles}`}>
      {status}
    </span>
  );
}

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  // Delete
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Create
  const [creating, setCreating] = useState(false);
  const [creatingNow, setCreatingNow] = useState(false);
  const [newDriver, setNewDriver] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    status: "ACTIVE",
  });

  // ---- Fetch ----
  async function fetchDrivers() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("drivers")
      .select("*", { head: false, count: "exact" })
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setDrivers(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchDrivers();
  }, []);

  // ---- Create ----
  function openCreate() {
    setNewDriver({
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
      status: "ACTIVE",
    });
    setCreating(true);
  }
  function closeCreate() {
    setCreating(false);
  }
  async function saveCreate(e) {
    e.preventDefault();
    setCreatingNow(true);
    setError(null);

    const payload = {
      first_name: newDriver.first_name.trim(),
      last_name: newDriver.last_name.trim(),
      phone: newDriver.phone?.trim() || null,
      email: newDriver.email?.trim() || null,
      status: newDriver.status || "ACTIVE",
    };

    const { error: insErr } = await supabase.from("drivers").insert(payload);
    setCreatingNow(false);

    if (insErr) {
      setError(insErr.message);
      return;
    }
    await fetchDrivers();
    closeCreate();
  }

  // ---- Edit ----
  function openEdit(drv) {
    setEditing({ ...drv });
  }
  function closeEdit() {
    setEditing(null);
  }
  async function saveEdit(e) {
    e.preventDefault();
    if (!editing?.id) return;

    setSaving(true);
    setError(null);

    const { error: updErr } = await supabase
      .from("drivers")
      .update({
        first_name: editing.first_name?.trim(),
        last_name: editing.last_name?.trim(),
        phone: editing.phone?.trim() || null,
        email: editing.email?.trim() || null,
        status: editing.status || "ACTIVE",
      })
      .eq("id", editing.id);

    if (updErr) {
      setSaving(false);
      setError(updErr.message);
      return;
    }
    await fetchDrivers();
    setSaving(false);
    closeEdit();
  }

  // ---- Delete ----
  function confirmDelete(id) {
    setPendingDelete(id);
  }
  function cancelDelete() {
    setPendingDelete(null);
  }
  async function doDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setError(null);

    const { error } = await supabase.from("drivers").delete().eq("id", pendingDelete);
    setDeleting(false);

    if (error) {
      setError(error.message);
      return;
    }
    setDrivers((prev) => prev.filter((d) => d.id !== pendingDelete));
    setPendingDelete(null);
  }

  return (
    <div className="p-6">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-white/90">Drivers</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={openCreate}
            className="px-3 py-2 text-sm rounded-lg border border-emerald-500/30 text-emerald-300 bg-white/0 hover:bg-emerald-500/10"
          >
            Add Driver
          </button>
          <button
            onClick={fetchDrivers}
            className="px-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 hover:bg-white/10"
          >
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-3 text-sm text-red-300 bg-red-500/10 border border-red-500/30 px-3 py-2 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-white/70">Loading…</div>
      ) : drivers.length === 0 ? (
        <div className="text-white/60">No drivers yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white/60">
              <tr className="border-b border-white/10">
                <th className="py-2 text-left font-medium">Name</th>
                <th className="py-2 text-left font-medium">Phone</th>
                <th className="py-2 text-left font-medium">Email</th>
                <th className="py-2 text-left font-medium">Status</th>
                <th className="py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {drivers.map((d) => (
                <tr key={d.id} className="text-white/80">
                  <td className="py-2">
                    {(d.first_name || "—") + " " + (d.last_name || "")}
                  </td>
                  <td className="py-2">{d.phone || "—"}</td>
                  <td className="py-2">{d.email || "—"}</td>
                  <td className="py-2">
                    <DriverBadge status={d.status} />
                  </td>
                  <td className="py-2 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        onClick={() => openEdit(d)}
                        className="px-2 py-1 rounded-md text-xs border border-white/10 hover:bg-white/10"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => confirmDelete(d.id)}
                        className="px-2 py-1 rounded-md text-xs border border-red-500/30 text-red-300 hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---- Create Modal ---- */}
      {creating && (
        <div className="fixed inset-0 bg-black/60 grid place-items-center p-4 z-50">
          <form
            onSubmit={saveCreate}
            className="w-full max-w-xl rounded-2xl border border-white/10 bg-neutral-900 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white/90 font-semibold">Add Driver</h2>
              <button type="button" onClick={closeCreate} className="text-white/60 hover:text-white/90">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-white/60">
                First name *
                <input
                  required
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
                  value={newDriver.first_name}
                  onChange={(e) => setNewDriver((s) => ({ ...s, first_name: e.target.value }))}
                />
              </label>

              <label className="text-xs text-white/60">
                Last name *
                <input
                  required
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
                  value={newDriver.last_name}
                  onChange={(e) => setNewDriver((s) => ({ ...s, last_name: e.target.value }))}
                />
              </label>

              <label className="text-xs text-white/60">
                Phone
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
                  value={newDriver.phone}
                  onChange={(e) => setNewDriver((s) => ({ ...s, phone: e.target.value }))}
                />
              </label>

              <label className="text-xs text-white/60">
                Email
                <input
                  type="email"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
                  value={newDriver.email}
                  onChange={(e) => setNewDriver((s) => ({ ...s, email: e.target.value }))}
                />
              </label>

              <label className="text-xs text-white/60 col-span-2">
                Status
                <select
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
                  value={newDriver.status}
                  onChange={(e) => setNewDriver((s) => ({ ...s, status: e.target.value }))}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="ON_LEAVE">ON_LEAVE</option>
                </select>
              </label>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeCreate}
                className="px-3 py-1.5 text-sm rounded-lg border border-white/10 hover:bg-white/10"
                disabled={creatingNow}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-sm rounded-lg border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-60"
                disabled={creatingNow}
              >
                {creatingNow ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---- Edit Modal ---- */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 grid place-items-center p-4 z-50">
          <form
            onSubmit={saveEdit}
            className="w-full max-w-xl rounded-2xl border border-white/10 bg-neutral-900 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white/90 font-semibold">Edit Driver</h2>
              <button type="button" onClick={closeEdit} className="text-white/60 hover:text-white/90">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-white/60">
                First name *
                <input
                  required
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
                  value={editing.first_name || ""}
                  onChange={(e) => setEditing((s) => ({ ...s, first_name: e.target.value }))}
                />
              </label>

              <label className="text-xs text-white/60">
                Last name *
                <input
                  required
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
                  value={editing.last_name || ""}
                  onChange={(e) => setEditing((s) => ({ ...s, last_name: e.target.value }))}
                />
              </label>

              <label className="text-xs text-white/60">
                Phone
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
                  value={editing.phone || ""}
                  onChange={(e) => setEditing((s) => ({ ...s, phone: e.target.value }))}
                />
              </label>

              <label className="text-xs text-white/60">
                Email
                <input
                  type="email"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
                  value={editing.email || ""}
                  onChange={(e) => setEditing((s) => ({ ...s, email: e.target.value }))}
                />
              </label>

              <label className="text-xs text-white/60 col-span-2">
                Status
                <select
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
                  value={editing.status || "ACTIVE"}
                  onChange={(e) => setEditing((s) => ({ ...s, status: e.target.value }))}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="ON_LEAVE">ON_LEAVE</option>
                </select>
              </label>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeEdit}
                className="px-3 py-1.5 text-sm rounded-lg border border-white/10 hover:bg-white/10"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-sm rounded-lg border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-60"
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---- Delete Confirm ---- */}
      {pendingDelete && (
        <div className="fixed inset-0 bg-black/60 grid place-items-center p-4 z-50">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900 p-4">
            <h3 className="text-white/90 font-semibold mb-2">Delete driver?</h3>
            <p className="text-white/70 text-sm mb-4">This action cannot be undone.</p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={cancelDelete}
                className="px-3 py-1.5 text-sm rounded-lg border border-white/10 hover:bg-white/10"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={doDelete}
                className="px-3 py-1.5 text-sm rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10 disabled:opacity-60"
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
