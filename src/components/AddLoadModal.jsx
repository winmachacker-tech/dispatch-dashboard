// src/pages/loads.jsx
import { useEffect, useState } from "react";
import { RefreshCcw, Plus } from "lucide-react";
import { supabase } from "../lib/supabase";
import AddLoadModal from "../components/AddLoadModal";

export default function LoadsPage() {
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { fetchLoads(); }, []);

  async function fetchLoads() {
    setLoading(true);
    const { data } = await supabase
      .from("loads")
      .select(`id, reference, customer, broker, driver_name, truck_number,
               origin_city, origin_state, dest_city, dest_state,
               pickup_date, delivery_date, dispatcher, rate, status, problem_flag, at_risk`)
      .order("id", { ascending: false })
      .limit(1000);
    setLoads(data || []);
    setLoading(false);
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header row with Refresh + Add Load */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Loads</h1>
          <p className="text-sm text-gray-500">Manage active and historical loads</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLoads}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 dark:border-neutral-700 px-3 py-2 hover:bg-gray-50 dark:hover:bg-neutral-800"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>

          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-black text-white px-3 py-2 hover:bg-black/90"
            title="Add a new load"
            data-testid="add-load-btn"
          >
            <Plus className="h-4 w-4" />
            Add Load
          </button>
        </div>
      </div>

      {/* ...keep your KPIs/filters/table as-is... */}

      {/* Modal */}
      <AddLoadModal open={showAdd} onClose={() => setShowAdd(false)} onCreated={fetchLoads} />
    </div>
  );
}
