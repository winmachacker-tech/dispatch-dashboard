// src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";

/** Read from Vite env (make sure these exist in your .env/.env.local) */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Fail fast with a helpful message in dev
  console.error(
    "[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Add them to your .env (or Vercel Project Settings → Environment Variables)."
  );
  throw new Error("Missing Supabase env vars");
}

/** Single client instance */
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
  db: { schema: "public" },
  global: {
    // avoid caching during dev
    fetch: (url, opts) => fetch(url, { ...opts, cache: "no-store" }),
  },
});

/** Export both ways so any import style works */
export const supabase = _supabase;
export default _supabase;
