import { supabase } from "./supabase";

export async function changeStatus(loadId, newStatus, { notes = null, userId = null } = {}) {
  const { data, error } = await supabase.rpc("update_load_status", {
    p_load_id: loadId,
    p_new_status: newStatus,
    p_changed_by: userId,
    p_notes: notes,
  });
  if (error) throw error;
  return data; // updated row
}
