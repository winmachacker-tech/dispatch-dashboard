// src/pages/trucks.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

// Inline badge
function StatusBadge({ status }) {
  const styles =
    {
      ACTIVE: "bg-green-500/15 text-green-300 border-green-500/30",
      MAINTENANCE: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
      INACTIVE: "bg-red-500/15 text-red-300 border-red-500/30",
    }[status] || "bg-neutral-700/30 text-neutral-300 border-neutral-600/30";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs border ${styles}`}>
      {status}
    </span>
  );
}

export default function Trucks() {
  const [trucks, setTrucks] = useState([]);
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
  const [newTruck, setNewTruck] = useState({
    unit_number: "",
    plate: "",
    make: "",
    model: "",
    year: "",
    vin: "",
    status: "ACTIVE",
  });
  const [creatingNow, setCreatingNow] = useState(false);

  // ---- Fetch ----
  async function fetchTrucks() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("trucks")
      .select("*", { head: false, count: "exact" })
      .order("created_at", { ascending: false });

    if (error) setError(error.message);
    else setTrucks(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchTrucks();
  }, []);

  // ---- Edit ----
  function openEdit(truck) {
    setEditing({ ...truck });
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
      .from("trucks")
      .update({
        unit_number: editing.unit_number?.trim(),
        vin: editing.vin?.trim() || null,
        plate: editing.plate?.trim() || null,
        make: editing.make?.trim() || null,
        model: editing.model?.trim() || null,
        year:
          editing.year === "" || editing.year == null ? null : Number(editing.year),
        status: editing.status || "ACTIVE",
      })
      .eq("id", editing.id);

    if (updErr) {
      setSaving(false);
      setError(updErr.message);
      return;
    }

    await fetchTrucks();
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

    const { error } = await supabase.from("trucks").delete().eq("id", pendingDelete);
    setDeleting(false);

    if (error) {
      setError(error.message);
      return;
    }

    setTrucks((prev) => prev.filter((t) => t.id !== pendingDelete));
    setPendingDelete(null);
  }

  // ---- Create ----
  function openCreate() {
    setNewTruck({
      unit_number: "",
      plate: "",
      make: "",
      model: "",
      year: "",
      vin: "",
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
      unit_number: newTruck.unit_number.trim(),
      plate: newTruck.plate?.trim() || null,
      make: newTruck.make?.trim() || null,
      model: newTruck.model?.trim() || null,
      year:
        newTruck.year === "" || newTruck.year == null
          ? null
          : Number(newTruck.year),
      vin: newTruck.vin?.trim() || null,
      status: newTruck.status || "ACTIVE",
    };

    const { error: insErr } = await supabase.from("trucks").insert(payload);
    setCreatingNow(false);

    if (insErr) {
      setError(insErr.message);
      return;
    }

    await fetchTrucks();
    closeCreate();
  }

  return (
    <div className="p-6">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-white/90">Trucks</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={openCreate}
            className="px-3 py-2 text-sm rounded-lg border border-emerald-500/30 text-emerald-300 bg-white/0 hover:bg-emerald-500/10"
          >
            Add Truck
          </button>
          <button
            onClick={fetchTrucks}
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
        <div className="text-white/70">Loadingâ€¦</div>
      ) : trucks.length === 0 ? (
        <div className="text-white/60">No trucks yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white/60">
              <tr className="border-b border-white/10">
                <th className="py-2 text-left font-medium">Unit</th>
                <th className="py-2 text-left font-medium">Plate</th>
                <th className="py-2 text-left font-medium">Make/Model</th>
                <th className="py-2 text-left font-medium">Year</th>
                <th className="py-2 text-left font-medium">VIN</th>
                <th className="py-2 text-left font-medium">Status</th>
                <th className="py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {trucks.map((t) => (
                <tr key={t.id} className="text-white/80">
                  <td className="py-2">{t.unit_number}</td>
                  <td className="py-2">{t.plate || "â€”"}</td>
                  <td className="py-2">
                    {(t.make || "â€”") + (t.model ? ` ${t.model}` : "")}
                  </td>
                  <td className="py-2">{t.year ?? "â€”"}</td>
                  <td className="py-2">{t.vin || "â€”"}</td>
                  <td className="py-2">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="py-2 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        onClick={() => openEdit(t)}
                        className="px-2 py-1 rounded-md text-xs border border-white/10 hover:bg-white/10"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => confirmDelete(t.id)}
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
              <h2 className="text-white/90 font-semibold">Add Truck</h2>
              <button type="button" onClick={closeCreate} className="text-white/60 hover:text-white/90">
                âœ•
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-white/60">
                Unit Number *
                <input
                  required
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
                  value={newTruck.unit_number}
                  onChange={(e) => setNewTruck((s) => ({ ...s, unit_number: e.target.value }))}
                />
              </label>

              <label className="text-xs text-white/60">
                Plate
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
                  value={newTruck.plate}
                  onChange={(e) => setNewTruck((s) => ({ ...s, plate: e.target.value }))}
                />
              </label>

              <label className="text-xs text-white/60">
                Make
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
                  value={newTruck.make}
                  onChange={(e) => setNewTruck((s) => ({ ...s, make: e.target.value }))}
                />
              </label>

              <label className="text-xs text-white/60">
                Model
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
                  value={newTruck.model}
                  onChange={(e) => setNewTruck((s) => ({ ...s, model: e.target.value }))}
                />
              </label>

              <label className="text-xs text-white/60">
                Year
                <input
                  type="number"
                  inputMode="numeric"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
                  value={newTruck.year}
                  onChange={(e) =>
                    setNewTruck((s) => ({
                      ...s,
                      year: e.target.value === "" ? "" : Number(e.target.value),
                    }))
                  }
                />
              </label>

              <label className="text-xs text-white/60">
                VIN
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
                  value={newTruck.vin}
                  onChange={(e) => setNewTruck((s) => ({ ...s, vin: e.target.value }))}
                />
              </label>

              <label className="text-xs text-white/60 col-span-2">
                Status
                <select
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
                  value={newTruck.status}
                  onChange={(e) => setNewTruck((s) => ({ ...s, status: e.target.value }))}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="INACTIVE">INACTIVE</option>
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
                {creatingNow ? "Savingâ€¦" : "Save"}
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
              <h2 className="text-white/90 font-semibold">Edit Truck</h2>
              <button type="button" onClick={closeEdit} className="text-white/60 hover:text-white/90">
                âœ•
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-white/60">
                Unit Number
                <input
                  required
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
                  value={editing.unit_number || ""}
                  onChange={(e) => setEditing((s) => ({ ...s, unit_number: e.target.value }))}
                />
              </label>

              <label className="text-xs text-white/60">
                Plate
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
                  value={editing.plate || ""}
                  onChange={(e) => setEditing((s) => ({ ...s, plate: e.target.value }))}
                />
              </label>

              <label className="text-xs text-white/60">
                Make
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
                  value={editing.make || ""}
                  onChange={(e) => setEditing((s) => ({ ...s, make: e.target.value }))}
                />
              </label>

              <label className="text-xs text-white/60">
                Model
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
                  value={editing.model || ""}
                  onChange={(e) => setEditing((s) => ({ ...s, model: e.target.value }))}
                />
              </label>

              <label className="text-xs text-white/60">
                Year
                <input
                  type="number"
                  inputMode="numeric"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
                  value={editing.year ?? ""}
                  onChange={(e) =>
                    setEditing((s) => ({
                      ...s,
                      year: e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                />
              </label>

              <label className="text-xs text-white/60">
                VIN
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
                  value={editing.vin || ""}
                  onChange={(e) => setEditing((s) => ({ ...s, vin: e.target.value }))}
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
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="INACTIVE">INACTIVE</option>
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
                {saving ? "Savingâ€¦" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---- Delete Confirm ---- */}
      {pendingDelete && (
        <div className="fixed inset-0 bg-black/60 grid place-items-center p-4 z-50">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900 p-4">
            <h3 className="text-white/90 font-semibold mb-2">Delete truck?</h3>
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
                {deleting ? "Deletingâ€¦" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

