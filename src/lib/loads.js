// If your client file is named supabase.js, keep the .js extension here:
import { supabase } from "./supabase.js";

/**
 * Fetch loads by a single status.
 * Usage: const rows = await getLoadsByStatus("AVAILABLE")
 */
export async function getLoadsByStatus(status) {
  const { data, error } = await supabase
    .from("loads")
    .select(
      "id, shipper, origin, destination, dispatcher, rate, status, status_changed_at, delivered_at"
    )
    .eq("status", status)
    .order("status_changed_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Lightweight realtime subscription for a page.
 * Pass a callback (e.g., your refresh function). Returns an unsubscribe fn.
 *
 * Usage:
 *   const off = subscribeLoads(() => refresh());
 *   // later in cleanup: off();
 */
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
