import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 🔎 Debug: print values (anon redacted)
console.log("[Supabase] URL:", url || "(missing)");
console.log("[Supabase] ANON length:", anon ? anon.length : "(missing)");

// Optional: quick health probe to catch CORS/URL issues early
(async () => {
  try {
    if (!url) throw new Error("VITE_SUPABASE_URL is missing");
    const u = new URL("/auth/v1/health", url).toString();
    const r = await fetch(u, { method: "GET" });
    console.log("[Supabase] /auth/v1/health:", r.status, r.statusText);
  } catch (e) {
    console.error("[Supabase] Health check failed:", e);
  }
})();

if (!url || !anon) {
  console.error(
    "Missing Supabase env vars: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY"
  );
}

export const supabase = createClient(url, anon);
