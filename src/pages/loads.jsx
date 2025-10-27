// src/pages/Loads.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { PlusCircle, Loader2, Trash2 } from "lucide-react";

const STATUSES = ["PLANNED", "IN_TRANSIT", "DELIVERED", "CANCELLED"];

export default function Loads() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({
    shipper: "",
    origin: "",
    destination: "",
    dispatcher: "",
    rate: "",
    status: "PLANNED",
  });

  useEffect(() => {
    let ignore = false;
    async function run() {
      setLoading(true);
      const { data, error } = await supabase
        .from("loads")
        .select("id, created_at, shipper, origin, destination, dispatcher, rate, status")
        .order("created_at", { ascending: false });
      if (!ignore) {
        if (error) console.error(error);
        setRows(data || []);
        setLoading(false);
      }
    }
    run();
    return () => { ignore = true; };
  }, []);

  const canSubmit = useMemo(() => {
    if (!form.shipper || !form.origin || !form.destination) return false;
    if (!form.rate || Number.isNaN(Number(form.rate))) return false;
    return true;
  }, [form]);

  async function onCreate(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const payload = {
      shipper: form.shipper.trim(),
      origin: form.origin.trim(),
      destination: form.destination.trim(),
      dispatcher: form.dispatcher.trim() || null,
      rate: Number(form.rate),
      status: form.status,
    };
    const { data, error } = await supabase.from("loads").insert(payload).select().single();
    if (error) {
      console.error(error);
    } else if (data) {
      setRows((prev) => [data, ...prev]);
      setForm({ shipper: "", origin: "", destination: "", dispatcher: "", rate: "", status: "PLANNED" });
    }
    setSubmitting(false);
  }

  async function onDelete(id) {
    const prev = rows;
    setRows((p) => p.filter((r) => r.id !== id)); // optimistic
    const { error } = await supabase.from("loads").delete().eq("id", id);
    if (error) {
      console.error(error);
      setRows(prev); // rollback
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Loads</h1>
          <p className="text-gray-500">Create and manage shipments.</p>
        </div>
      </div>

      <form onSubmit={onCreate} className="rounded-2xl border bg-white p-4 grid grid-cols-1 md:grid-cols-7 gap-3">
        <input className="rounded-xl border px-3 py-2" placeholder="Shipper"
          value={form.shipper} onChange={(e) => setForm({ ...form, shipper: e.target.value })} />
        <input className="rounded-xl border px-3 py-2" placeholder="Origin (City, ST)"
          value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} />
        <input className="rounded-xl border px-3 py-2" placeholder="Destination (City, ST)"
          value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
        <input className="rounded-xl border px-3 py-2" placeholder="Dispatcher"
          value={form.dispatcher} onChange={(e) => setForm({ ...form, dispatcher: e.target.value })} />
        <input type="number" inputMode="decimal" className="rounded-xl border px-3 py-2" placeholder="Rate (USD)"
          value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
        <select className="rounded-xl border px-3 py-2" value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}>
          {STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
        <button disabled={!canSubmit || submitting}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 font-medium text-white bg-gray-900 disabled:opacity-50">
          {submitting ? <Loader2 className="animate-spin" size={18} /> : <PlusCircle size={18} />}
          <span>Add</span>
        </button>
      </form>

      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b sticky top-0">
              <tr className="text-left">
                <th className="px-3 py-2 w-[180px]">Created</th>
                <th className="px-3 py-2">Shipper</th>
                <th className="px-3 py-2">Origin</th>
                <th className="px-3 py-2">Destination</th>
                <th className="px-3 py-2">Dispatcher</th>
                <th className="px-3 py-2 text-right">Rate</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 w-[56px]"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-3 py-4 text-gray-500" colSpan={8}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-3 py-6 text-gray-400" colSpan={8}>No loads yet.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{r.shipper}</td>
                  <td className="px-3 py-2">{r.origin}</td>
                  <td className="px-3 py-2">{r.destination}</td>
                  <td className="px-3 py-2">{r.dispatcher || "—"}</td>
                  <td className="px-3 py-2 text-right">${Number(r.rate).toFixed(2)}</td>
                  <td className="px-3 py-2">{r.status}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => onDelete(r.id)} className="p-2 rounded hover:bg-gray-100" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
