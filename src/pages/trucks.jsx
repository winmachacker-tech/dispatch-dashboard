import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function StatusBadge({ status }) {
  const styles = {
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

export default function TrucksPage() {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // modal state
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // form state
  const [form, setForm] = useState({
    unit_number: "",
    make: "",
    model: "",
    year: "",
    plate: "",
    vin: "",
    status: "ACTIVE",
    notes: "",
  });

  const fetchTrucks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trucks")
      .select("*")
      .order("unit_number", { ascending: true });

    if (error) setError(error.message);
    else setTrucks(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTrucks();
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.unit_number.trim()) {
      alert("Unit number is required");
      return;
    }

    setSaving(true);
    const payload = {
      unit_number: form.unit_number.trim(),
      make: form.make.trim() || null,
      model: form.model.trim() || null,
      year: form.year ? Number(form.year) : null,
      plate: form.plate.trim() || null,
      vin: form.vin.trim() || null,
      status: form.status,
      notes: form.notes.trim() || null,
    };

    const { error } = await supabase.from("trucks").insert(payload);
    setSaving(false);

    if (error) {
      alert("Insert failed: " + error.message);
      return;
    }
    setForm({
      unit_number: "",
      make: "",
      model: "",
      year: "",
      plate: "",
      vin: "",
      status: "ACTIVE",
      notes: "",
    });
    setOpen(false);
    await fetchTrucks();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Trucks</h1>
          <p className="text-sm text-neutral-400">
            Fleet overview. Filters and actions coming next.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm"
            type="button"
            onClick={() => alert("Export coming soon")}
          >
            Export CSV
          </button>
          <button
            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium"
            type="button"
            onClick={() => setOpen(true)}
          >
            + Add Truck
          </button>
        </div>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 shadow-lg">
        <div className="px-4 py-3 border-b border-neutral-800">
          <h2 className="text-sm font-medium text-neutral-300">Fleet List</h2>
        </div>

        <div className="p-4">
          {loading && <p className="text-neutral-400">Loading…</p>}
          {error && <p className="text-red-400">Error: {error}</p>}

          {!loading && !error && trucks.length === 0 && (
            <p className="text-neutral-400">No trucks yet.</p>
          )}

          {!loading && !error && trucks.length > 0 && (
            <div className="overflow-auto max-h-[65vh] rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-neutral-900/80 backdrop-blur border-b border-neutral-800">
                  <tr className="text-neutral-300">
                    <th className="px-3 py-2 font-medium">Unit</th>
                    <th className="px-3 py-2 font-medium">Make / Model</th>
                    <th className="px-3 py-2 font-medium">Year</th>
                    <th className="px-3 py-2 font-medium">Plate</th>
                    <th className="px-3 py-2 font-medium">VIN</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {trucks.map((t) => (
                    <tr
                      key={t.id}
                      className="odd:bg-neutral-900/30 even:bg-transparent hover:bg-neutral-900/50 transition-colors"
                    >
                      <td className="px-3 py-2">{t.unit_number}</td>
                      <td className="px-3 py-2">
                        {[t.make, t.model].filter(Boolean).join(" ") || "—"}
                      </td>
                      <td className="px-3 py-2">{t.year ?? "—"}</td>
                      <td className="px-3 py-2">{t.plate ?? "—"}</td>
                      <td className="px-3 py-2">{t.vin ?? "—"}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-3 py-2">{t.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Simple modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => !saving && setOpen(false)}
          />
          {/* dialog */}
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="text-lg font-semibold">Add Truck</h3>
              <button
                className="text-neutral-400 hover:text-neutral-200"
                onClick={() => !saving && setOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form className="mt-4 space-y-3" onSubmit={onSubmit}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-neutral-300 mb-1">
                    Unit Number *
                  </label>
                  <input
                    className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 outline-none"
                    name="unit_number"
                    value={form.unit_number}
                    onChange={onChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-300 mb-1">
                    Status
                  </label>
                  <select
                    className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 outline-none"
                    name="status"
                    value={form.status}
                    onChange={onChange}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-neutral-300 mb-1">
                    Make
                  </label>
                  <input
                    className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 outline-none"
                    name="make"
                    value={form.make}
                    onChange={onChange}
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-300 mb-1">
                    Model
                  </label>
                  <input
                    className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 outline-none"
                    name="model"
                    value={form.model}
                    onChange={onChange}
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-300 mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 outline-none"
                    name="year"
                    value={form.year}
                    onChange={onChange}
                    min="1980"
                    max="2100"
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-300 mb-1">
                    Plate
                  </label>
                  <input
                    className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 outline-none"
                    name="plate"
                    value={form.plate}
                    onChange={onChange}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm text-neutral-300 mb-1">
                    VIN
                  </label>
                  <input
                    className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 outline-none"
                    name="vin"
                    value={form.vin}
                    onChange={onChange}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm text-neutral-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 outline-none"
                    rows={3}
                    name="notes"
                    value={form.notes}
                    onChange={onChange}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
