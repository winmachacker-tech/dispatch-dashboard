// src/pages/loads.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import {
  Loader2,
  UserPlus,
  X as XIcon,
  CheckCheck,
  Truck,
  Search,
} from "lucide-react";

const STATUSES = ["PLANNED", "IN_TRANSIT", "DELIVERED", "CANCELLED"];

// Utility: build a safe display name from whatever columns exist
function toDriverDisplayName(d) {
  if (!d) return "Unknown";
  return (
    d.name ||
    d.full_name ||
    [d.first_name, d.last_name].filter(Boolean).join(" ") ||
    d.driver_name ||
    d.driver ||
    `Driver ${d.id}`
  );
}

function StatusBadge({ status }) {
  const styles =
    {
      PLANNED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      IN_TRANSIT: "bg-sky-500/15 text-sky-300 border-sky-500/30",
      DELIVERED: "bg-violet-500/15 text-violet-300 border-violet-500/30",
      CANCELLED: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    }[status] || "bg-neutral-700/30 text-neutral-300 border-neutral-600/30";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs border ${styles}`}>
      {status}
    </span>
  );
}

function AssignDriverDropdown({ load, onAssigned, onUnassigned }) {
  const [open, setOpen] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const [error, setError] = useState(null);

  async function fetchAvailableDrivers() {
    setLoading(true);
    setError(null);
    // Fetch all columns to avoid schema mismatch (no hard-coded "name")
    const { data, error } = await supabase.from("drivers").select("*");
    if (error) setError(error.message);
    else setDrivers(data || []);
    setLoading(false);
  }

  useEffect(() => {
    if (open) fetchAvailableDrivers();
  }, [open]);

  const assignedDriver = load.driver || null;

  async function handleAssign(driverId) {
    setAssigningId(driverId);
    setError(null);

    const { error: upErr } = await supabase
      .from("loads")
      .update({ driver_id: driverId })
      .eq("id", load.id);

    if (upErr) {
      setError(upErr.message || "Failed to assign driver.");
      setAssigningId(null);
      return;
    }

    await supabase.from("drivers").update({ status: "ON_LOAD" }).eq("id", driverId);

    setAssigningId(null);
    setOpen(false);
    onAssigned?.(driverId);
  }

  async function handleUnassign() {
    if (!load.driver_id) return;

    setAssigningId(load.driver_id);
    setError(null);

    const { error: upErr } = await supabase
      .from("loads")
      .update({ driver_id: null })
      .eq("id", load.id);

    if (upErr) {
      setError(upErr.message || "Failed to unassign driver.");
      setAssigningId(null);
      return;
    }

    await supabase.from("drivers").update({ status: "AVAILABLE" }).eq("id", load.driver_id);

    setAssigningId(null);
    onUnassigned?.();
  }

  return (
    <div className="relative">
      {assignedDriver ? (
        <div className="flex items-center gap-2">
          <div className="text-sm text-neutral-200">
            <span className="opacity-70">Driver:</span>{" "}
            <span className="font-medium">{toDriverDisplayName(assignedDriver)}</span>
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="px-2 py-1 text-xs rounded-lg border border-neutral-700 hover:border-neutral-500 transition"
          >
            Change
          </button>
          <button
            onClick={handleUnassign}
            disabled={assigningId === load.driver_id}
            className="px-2 py-1 text-xs rounded-lg border border-rose-700 text-rose-300 hover:border-rose-500 transition inline-flex items-center gap-1"
            title="Unassign driver"
          >
            {assigningId === load.driver_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XIcon className="h-3.5 w-3.5" />}
            Remove
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-700 hover:border-neutral-500 transition text-sm"
        >
          <UserPlus className="h-4 w-4" />
          Assign Driver
        </button>
      )}

      {open && (
        <div className="absolute z-10 mt-2 w-72 rounded-xl border border-neutral-700 bg-neutral-900/95 backdrop-blur p-3 shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-4 w-4 opacity-70" />
            <div className="text-sm font-medium">Select a driver</div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-neutral-300 py-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : error ? (
            <div className="text-sm text-rose-300">{error}</div>
          ) : (
            <div className="max-h-56 overflow-auto custom-scrollbar space-y-1">
              {(drivers || [])
                .filter((d) => d.status === "AVAILABLE" || d.id === load.driver_id)
                .map((d) => {
                  const label = toDriverDisplayName(d);
                  return (
                    <button
                      key={d.id}
                      onClick={() => handleAssign(d.id)}
                      disabled={assigningId === d.id}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-neutral-800/60 transition border border-transparent hover:border-neutral-700"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{label}</div>
                          <div className="text-xs opacity-60">{d.phone || "No phone on file"}</div>
                        </div>
                        {assigningId === d.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : d.id === load.driver_id ? (
                          <span className="text-xs opacity-70">Assigned</span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              {drivers.filter((d) => d.status === "AVAILABLE").length === 0 && (
                <div className="text-xs opacity-70 px-2.5 py-2">No AVAILABLE drivers</div>
              )}
            </div>
          )}

          <div className="mt-2 flex justify-end">
            <button
              onClick={() => setOpen(false)}
              className="px-2.5 py-1.5 rounded-lg text-sm border border-neutral-700 hover:border-neutral-500 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoadsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [q, setQ] = useState("");

  async function fetchLoads() {
    setLoading(true);

    // 1) Fetch loads (no embedded join)
    const { data: loads, error: loadsErr } = await supabase
      .from("loads")
      .select("id, created_at, shipper, origin, destination, dispatcher, rate, status, driver_id")
      .order("created_at", { ascending: false });

    if (loadsErr) {
      console.error("Supabase error (fetch loads):", loadsErr);
      setRows([]);
      setLoading(false);
      return;
    }

    // 2) Fetch referenced drivers (get * so we can build display names)
    const driverIds = Array.from(
      new Set((loads || []).map((l) => l.driver_id).filter((v) => v != null))
    );

    let driverMap = {};
    if (driverIds.length > 0) {
      const { data: drivers, error: drvErr } = await supabase
        .from("drivers")
        .select("*")
        .in("id", driverIds);

      if (drvErr) {
        console.error("Supabase error (fetch drivers):", drvErr);
      } else {
        driverMap = (drivers || []).reduce((acc, d) => {
          acc[d.id] = d;
          return acc;
        }, {});
      }
    }

    const merged = (loads || []).map((l) => ({
      ...l,
      driver: l.driver_id ? driverMap[l.driver_id] || null : null,
    }));

    setRows(merged);
    setLoading(false);
  }

  useEffect(() => {
    fetchLoads();
  }, []);

  const filtered = useMemo(() => {
    const key = q.trim().toLowerCase();
    if (!key) return rows;
    return rows.filter((r) => {
      return (
        (r.shipper || "").toLowerCase().includes(key) ||
        (r.origin || "").toLowerCase().includes(key) ||
        (r.destination || "").toLowerCase().includes(key) ||
        (r.dispatcher || "").toLowerCase().includes(key) ||
        (toDriverDisplayName(r.driver) || "").toLowerCase().includes(key)
      );
    });
  }, [rows, q]);

  async function handleStatusChange(load, newStatus) {
    setSubmittingId(load.id);

    const { error: upErr } = await supabase
      .from("loads")
      .update({ status: newStatus })
      .eq("id", load.id);

    if (upErr) {
      console.error("Update status error:", upErr);
      setSubmittingId(null);
      return;
    }

    if (newStatus === "DELIVERED" && load.driver_id) {
      await supabase.from("loads").update({ driver_id: null }).eq("id", load.id);
      await supabase.from("drivers").update({ status: "AVAILABLE" }).eq("id", load.driver_id);
    }

    setSubmittingId(null);
    fetchLoads();
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">Loads</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 opacity-60 absolute left-2 top-2.5" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search shipper / origin / driver…"
              className="pl-8 pr-3 py-2 rounded-xl bg-neutral-900/60 border border-neutral-700 focus:border-neutral-500 outline-none text-sm"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-neutral-300">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-neutral-400">No loads found.</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((load) => (
            <div
              key={load.id}
              className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 md:p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm opacity-60">#{String(load.id).slice(0, 8)}</div>
                    <StatusBadge status={load.status} />
                  </div>
                  <div className="text-base md:text-lg font-medium">
                    {load.origin} → {load.destination}
                  </div>
                  <div className="text-sm opacity-70">
                    {load.shipper || "Unknown Shipper"} • Disp: {load.dispatcher || "—"} • $
                    {Number(load.rate || 0).toLocaleString()}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <AssignDriverDropdown
                    load={load}
                    onAssigned={() => fetchLoads()}
                    onUnassigned={() => fetchLoads()}
                  />
                  <div className="flex items-center gap-2">
                    {STATUSES.filter((s) => s !== load.status).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(load, s)}
                        disabled={submittingId === load.id}
                        className="px-2.5 py-1.5 rounded-lg border border-neutral-700 hover:border-neutral-500 transition text-xs"
                      >
                        {submittingId === load.id && s === "DELIVERED" ? (
                          <span className="inline-flex items-center gap-1">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Delivering…
                          </span>
                        ) : s === "DELIVERED" ? (
                          <span className="inline-flex items-center gap-1">
                            <CheckCheck className="h-3.5 w-3.5" /> {s}
                          </span>
                        ) : (
                          s
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
