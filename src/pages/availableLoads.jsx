import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// ----- STATUS BADGE -----
function StatusBadge({ status }) {
  const styles = {
    AVAILABLE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    IN_TRANSIT: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    PROBLEM: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    DELIVERED: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  }[status] || "bg-neutral-700/30 text-neutral-300 border-neutral-600/30";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs border ${styles}`}
    >
      {status}
    </span>
  );
}

// ----- MAIN PAGE -----
export default function AvailableLoadsPage() {
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("AVAILABLE");

  // --- Update load status in Supabase ---
  async function handleStatusChange(id, newStatus) {
    const { error } = await supabase
      .from("loads")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      console.error("❌ Error updating status:", error);
    } else {
      // instantly reflect change in UI
      setLoads((prev) =>
        prev.map((load) =>
          load.id === id ? { ...load, status: newStatus } : load
        )
      );
    }
  }

  // --- Fetch all loads ---
  useEffect(() => {
    async function fetchLoads() {
      setLoading(true);
      const { data, error } = await supabase
        .from("loads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Supabase error:", error);
      } else {
        console.log("✅ Loads from Supabase:", data);
        setLoads(data || []);
      }

      setLoading(false);
    }

    fetchLoads();
  }, []);

  if (loading) return <p>Loading...</p>;

  // --- Page Layout ---
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Available Loads</h1>

      {/* ----- STATUS TABS ----- */}
      <div className="flex gap-2 mb-4">
        {["AVAILABLE", "IN_TRANSIT", "PROBLEM", "DELIVERED"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-md text-sm border transition-all ${
              activeTab === tab
                ? "bg-neutral-800 text-white border-neutral-600"
                : "hover:bg-neutral-800 border-neutral-700 text-neutral-400"
            }`}
          >
            {tab.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* ----- LOAD LIST ----- */}
      <ul className="divide-y divide-neutral-800">
        {loads
          .filter((load) => load.status === activeTab)
          .map((load) => (
            <li key={load.id} className="py-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">
                    {load.origin} → {load.destination}
                  </p>
                  <p className="text-sm text-neutral-400">
                    {load.shipper} • ${load.rate}
                  </p>
                </div>
                <StatusBadge status={load.status} />
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  onClick={() => handleStatusChange(load.id, "AVAILABLE")}
                  className="px-2 py-1 text-xs border rounded-md hover:bg-neutral-800"
                >
                  Available
                </button>
                <button
                  onClick={() => handleStatusChange(load.id, "IN_TRANSIT")}
                  className="px-2 py-1 text-xs border rounded-md hover:bg-neutral-800"
                >
                  In-Transit
                </button>
                <button
                  onClick={() => handleStatusChange(load.id, "PROBLEM")}
                  className="px-2 py-1 text-xs border rounded-md hover:bg-neutral-800"
                >
                  Problem
                </button>
                <button
                  onClick={() => handleStatusChange(load.id, "DELIVERED")}
                  className="px-2 py-1 text-xs border rounded-md hover:bg-neutral-800"
                >
                  Delivered
                </button>
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
}
