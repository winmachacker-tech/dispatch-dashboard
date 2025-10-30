// src/lib/loads.js
import { supabase } from "./supabase.js";

/** Core columns we use across the app */
export const LOAD_COLUMNS = `
  id,
  shipper,
  origin,
  destination,
  dispatcher,
  rate,
  status,
  status_changed_at,
  pickup_date,
  delivery_date,
  delivered_at,
  created_at
`;

export async function getLoadsByStatus(status, { limit = 25, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from("loads")
    .select(LOAD_COLUMNS)
    .eq("status", status)
    .order("status_changed_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data || [];
}

export async function listLoads(filters = {}, { limit = 25, page = 0 } = {}) {
  const { q, status, from, to } = filters;
  let query = supabase.from("loads").select(LOAD_COLUMNS, { count: "exact" });

  if (q && q.trim()) {
    const like = `%${q.trim()}%`;
    query = query.or(
      `shipper.ilike.${like},origin.ilike.${like},destination.ilike.${like},dispatcher.ilike.${like}`
    );
  }
  if (status) {
    const arr = Array.isArray(status) ? status : [status];
    if (arr.length) query = query.in("status", arr);
  }
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const offset = page * limit;
  const { data, error, count } = await query
    .order("status_changed_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { rows: data || [], count: count ?? 0 };
}

export async function createLoad(fields) {
  const now = new Date().toISOString();
  const insert = {
    shipper: fields.shipper?.trim() || null,
    origin: fields.origin?.trim() || null,
    destination: fields.destination?.trim() || null,
    dispatcher: fields.dispatcher?.trim() || null,
    rate: fields.rate != null ? Number(fields.rate) : null,
    status: fields.status || "AVAILABLE",
    status_changed_at: now,
    pickup_date: fields.pickup_date || null,
    delivery_date: fields.delivery_date || null,
    delivered_at: null,
  };

  const { data, error } = await supabase
    .from("loads")
    .insert(insert)
    .select(LOAD_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateLoad(id, patch) {
  const now = new Date().toISOString();
  const update = { ...patch };

  if (typeof patch.status === "string") {
    update.status_changed_at = now;
    if (patch.status.toUpperCase() === "DELIVERED") {
      update.delivered_at = now;
    }
  }

  const { data, error } = await supabase
    .from("loads")
    .update(update)
    .eq("id", id)
    .select(LOAD_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export function subscribeLoads(onChange) {
  const channel = supabase
    .channel("loads-rt")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "loads" },
      () => onChange && onChange()
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
