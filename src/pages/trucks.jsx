// src/pages/trucks.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function TrucksPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!supabase) throw new Error("Supabase is not configured.");
        const { data, error } = await supabase.from("trucks").select("*").limit(50);
        if (error) throw error;
        if (alive) setRows(data || []);
      } catch (e) {
        if (alive) setError(e);
        console.error("[TrucksPage] load error:", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Trucks</h1>
      </header>

      <div className="card p-4">
        {loading && <div className="text-sm text-muted">Loading…</div>}
        {error && <div className="text-sm text-red-500">Error: {error.message}</div>}
        {!loading && !error && rows.length === 0 && (
          <div className="text-sm text-muted">No trucks found.</div>
        )}
        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b">
                  {Object.keys(rows[0]).map((k) => (
                    <th key={k} className="py-2 pr-4">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {Object.keys(rows[0]).map((k) => (
                      <td key={k} className="py-2 pr-4">
                        {String(r[k] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
