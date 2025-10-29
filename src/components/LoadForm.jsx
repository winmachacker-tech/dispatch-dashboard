// src/components/LoadForm.jsx
import { useState } from "react";
import { supabase } from "../lib/supabase";


export default function LoadForm({ onSaved, onClose }) {
const [form, setForm] = useState({
shipper: "",
origin: "",
destination: "",
dispatcher: "",
rate: "",
pickup_date: "",
delivery_date: "",
miles: "",
status: "AVAILABLE",
});
const [saving, setSaving] = useState(false);


const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));


async function handleSubmit(e) {
e.preventDefault();
setSaving(true);
const payload = {
...form,
rate: form.rate ? Number(form.rate) : null,
miles: form.miles ? Number(form.miles) : null,
};
const { error } = await supabase.from("loads").insert(payload);
setSaving(false);
if (error) return alert(`Save failed: ${error.message}`);
onSaved?.();
onClose?.();
}


return (
<form onSubmit={handleSubmit} className="space-y-3 p-1">
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
<input className="input" placeholder="Shipper" value={form.shipper} onChange={set("shipper")} required />
<input className="input" placeholder="Dispatcher" value={form.dispatcher} onChange={set("dispatcher")} />
<input className="input" placeholder="Origin" value={form.origin} onChange={set("origin")} required />
<input className="input" placeholder="Destination" value={form.destination} onChange={set("destination")} required />
<input className="input" placeholder="Rate (USD)" type="number" step="1" value={form.rate} onChange={set("rate")} />
<input className="input" placeholder="Miles" type="number" step="1" value={form.miles} onChange={set("miles")} />
<label className="text-sm">Pickup Date<input className="input mt-1" type="date" value={form.pickup_date} onChange={set("pickup_date")} /></label>
<label className="text-sm">Delivery Date<input className="input mt-1" type="date" value={form.delivery_date} onChange={set("delivery_date")} /></label>
<label className="text-sm">Status
<select className="input mt-1" value={form.status} onChange={set("status")}>
<option>AVAILABLE</option>
<option>IN_TRANSIT</option>
<option>DELIVERED</option>
</select>
</label>
</div>
<div className="flex justify-end gap-2 pt-2">
<button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
<button className="btn" disabled={saving}>{saving ? "Saving…" : "Save Load"}</button>
</div>
</form>
);