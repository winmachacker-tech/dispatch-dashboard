// src/lib/setStatus.js
import { supabase } from "./supabase";

/**
 * Updates the status of a load by ID.
 * @param {string|number} loadId - The ID of the load to update
 * @param {string} newStatus - The new status (e.g. "IN_TRANSIT", "DELIVERED")
 * @returns {Promise<{error?: string}>}
 */
export async function setLoadStatus(loadId, newStatus) {
  try {
    const { error } = await supabase
      .from("loads")
      .update({ status: newStatus })
      .eq("id", loadId);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error("setLoadStatus error:", err);
    return { error: err.message };
  }
}
