// src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("[Supabase] URL:", url || "(missing)");
console.log("[Supabase] ANON length:", anon ? anon.length : "(missing)");

if (!url || !anon) {
  console.error("âŒ Missing Supabase env vars");
}

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

