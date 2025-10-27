import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Single shared client across the app (and HMR)
export const supabase =
  globalThis.__supabase__ ??
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: true, storageKey: "dispatch-dashboard-auth" },
  });

if (import.meta.env.DEV) {
  globalThis.__supabase__ = supabase;
}
