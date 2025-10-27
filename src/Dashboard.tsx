import { useLocalStorage } from "./hooks/useLocalStorage";
import React, { useMemo, useState } from "react";
import { Settings, FileDown, PlusCircle, X } from "lucide-react";

type LoadStatus = "PLANNED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";

type Load = {
  id: string;
  createdAt: string;
  shipper: string;
  origin: string;
  destination: string;
  dispatcher: string;
  rate: number;
  status: LoadStatus;
};

const Dashboard: React.FC = () => {
  const [loads, setLoads] = useLocalStorage<Load[]>("dd_loads_v1", []);
  const [avgTmsCompliance, setAvgTmsCompliance] = useState<number>(100);
  const [pendingIssues] = useState<number>(0);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    currency: "USD",
    defaultDispatcher: "Mark",
    csvDelimiter: ",",
  });

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    shipper: "",
    origin: "",
    destination: "",
    dispatcher: "Mark",
    rate: "",
    status: "PLANNED" as LoadStatus,
  });

  const totalRevenue = useMemo(
    () => loads.reduce((sum, l) => sum + l.rate, 0),
    [loads]
  );
  const activeLoads = useMemo(
    () => loads.filter((l) => l.status !== "DELIVERED" && l.status !== "CANCELLED").length,
    [loads]
  );

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const openSettings = () => setIsSettingsOpen(true);
  const closeSettings = () => setIsSettingsOpen(false);
  const openAdd = () => setIsAddOpen(true);
  const closeAdd = () => setIsAddOpen(false);

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings((s) => ({ ...s, [name]: value }));
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleAddLoad = (e: React.FormEvent) => {
    e.preventDefault();
    const rateNum = parseFloat(String(form.rate).replace(",", "."));
    if (!form.shipper || !form.origin || !form.destination || !form.dispatcher || !rateNum) return;

    const newLoad: Load = {
      id: (crypto as any)?.randomUUID?.() ?? Math.random().toString(36).slice(2),
      createdAt: new Date().toISOString(),
      shipper: form.shipper.trim(),
      origin: form.origin.trim(),
      destination: form.destination.trim(),
      dispatcher: form.dispatcher.trim(),
      rate: rateNum,
      status: form.status,
    };

    setLoads((prev) => [newLoad, ...prev]);
    setIsAddOpen(false);
    setForm({
      shipper: "",
      origin: "",
      destination: "",
      dispatcher: settings.defaultDispatcher || "Mark",
      rate: "",
      status: "PLANNED",
    });
  };

  const handleExportCSV = () => {
    const delim = settings.csvDelimiter || ",";
    const header = [
      "id",
      "createdAt",
      "shipper",
      "origin",
      "destination",
      "dispatcher",
      "rate",
      "status",
    ].join(delim);

    const rows = loads.map((l) =>
      [
        l.id,
        l.createdAt,
        escapeCsv(l.shipper, delim),
        escapeCsv(l.origin, delim),
        escapeCsv(l.destination, delim),
        escapeCsv(l.dispatcher, delim),
        l.rate.toFixed(2),
        l.status,
      ].join(delim)
    );

    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.download = `loads-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#050A24] to-[#000C33] text-white overflow-x-hidden">
      <div className="container mx-auto px-6 py-8 max-w-[1600px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 z-10 relative">
          <div>
            <h1 className="text-3xl font-extrabold">Mark’s Dispatch Dashboard</h1>
            <p className="text-sm text-gray-400">{today}</p>
          </div>
          <div className="flex gap-3 mt-4 sm:mt-0">
            <button type="button" onClick={openSettings} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-semibold shadow">
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button type="button" onClick={handleExportCSV} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-semibold shadow">
              <FileDown className="w-4 h-4" />
              Export CSV
            </button>
            <button type="button" onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold shadow">
              <PlusCircle className="w-4 h-4" />
              Add Load
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Revenue" value={formatCurrency(totalRevenue, settings.currency)} />
          <StatCard title="Active Loads" value={String(activeLoads)} />
          <StatCard title="Avg TMS Compliance" value={`${avgTmsCompliance.toFixed(1)}%`} />
          <StatCard title="Pending Issues" value={String(pendingIssues)} />
        </div>

        {/* Lower Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel title="Revenue by Dispatcher">
            {loads.length === 0 ? (
              <p className="text-gray-400 text-sm">No data yet. Add your first load to see charts!</p>
            ) : (
              <ul className="text-sm space-y-2">
                {Object.entries(groupByDispatcherTotal(loads)).map(([name, total]) => (
                  <li key={name} className="flex justify-between">
                    <span className="text-gray-200">{name}</span>
                    <span className="font-semibold">{formatCurrency(total, settings.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Load Status">
            {loads.length === 0 ? (
              <p className="text-gray-400 text-sm">No loads yet</p>
            ) : (
              <ul className="text-sm space-y-2">
                {Object.entries(groupByStatus(loads)).map(([status, count]) => (
                  <li key={status} className="flex justify-between">
                    <span className="text-gray-200">{status}</span>
                    <span className="font-semibold">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Bottom Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Panel title="Motion TMS Compliance">
            <input type="range" min={70} max={100} step={0.5} value={avgTmsCompliance} onChange={(e) => setAvgTmsCompliance(Number(e.target.value))} className="w-full mt-2" />
            <p className="text-xs text-gray-400 mt-1">Adjust demo slider (does not persist)</p>
          </Panel>

          <Panel title="Recent Loads">
            {loads.length === 0 ? (
              <p className="text-gray-400 text-sm">Coming soon</p>
            ) : (
              <div className="space-y-2 text-sm">
                {loads.slice(0, 6).map((l) => (
                  <div key={l.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-[#0d1b3d] rounded-xl p-3">
                    <div className="font-semibold">{l.origin} → {l.destination}<span className="text-gray-400 font-normal"> • {l.shipper}</span></div>
                    <div className="flex gap-4 mt-1 sm:mt-0">
                      <span className="text-gray-300">{formatCurrency(l.rate, settings.currency)}</span>
                      <span className="px-2 py-0.5 text-xs rounded bg-[#10214d]">{l.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* Modals */}
      {isSettingsOpen && (
        <Modal title="Settings" onClose={closeSettings}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Currency</label>
              <select name="currency" value={settings.currency} onChange={handleSettingsChange} className="w-full bg-[#0d1b3d] border border-[#1e2b5a] rounded-lg px-3 py-2 outline-none">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Default Dispatcher</label>
              <input name="defaultDispatcher" value={settings.defaultDispatcher} onChange={handleSettingsChange} className="w-full bg-[#0d1b3d] border border-[#1e2b5a] rounded-lg px-3 py-2 outline-none" placeholder="Name" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">CSV Delimiter</label>
              <input name="csvDelimiter" value={settings.csvDelimiter} onChange={handleSettingsChange} className="w-full bg-[#0d1b3d] border border-[#1e2b5a] rounded-lg px-3 py-2 outline-none" placeholder=", or ;" />
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={closeSettings} className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-semibold">Save</button>
            </div>
          </div>
        </Modal>
      )}

      {isAddOpen && (
        <Modal title="Add Load" onClose={closeAdd}>
          <form onSubmit={handleAddLoad} className="space-y-4">
            <TwoCol>
              <Field label="Shipper"><input name="shipper" value={form.shipper} onChange={handleFormChange} className="w-full bg-[#0d1b3d] border border-[#1e2b5a] rounded-lg px-3 py-2 outline-none" placeholder="e.g., Foster Farms" /></Field>
              <Field label="Dispatcher"><input name="dispatcher" value={form.dispatcher} onChange={handleFormChange} className="w-full bg-[#0d1b3d] border border-[#1e2b5a] rounded-lg px-3 py-2 outline-none" placeholder="e.g., Mark" /></Field>
            </TwoCol>
            <TwoCol>
              <Field label="Origin"><input name="origin" value={form.origin} onChange={handleFormChange} className="w-full bg-[#0d1b3d] border border-[#1e2b5a] rounded-lg px-3 py-2 outline-none" placeholder="City, ST" /></Field>
              <Field label="Destination"><input name="destination" value={form.destination} onChange={handleFormChange} className="w-full bg-[#0d1b3d] border border-[#1e2b5a] rounded-lg px-3 py-2 outline-none" placeholder="City, ST" /></Field>
            </TwoCol>
            <TwoCol>
              <Field label="Rate (USD)"><input name="rate" value={form.rate} onChange={handleFormChange} inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" className="w-full bg-[#0d1b3d] border border-[#1e2b5a] rounded-lg px-3 py-2 outline-none" placeholder="e.g., 2450" /></Field>
              <Field label="Status">
                <select name="status" value={form.status} onChange={handleFormChange} className="w-full bg-[#0d1b3d] border border-[#1e2b5a] rounded-lg px-3 py-2 outline-none">
                  <option value="PLANNED">PLANNED</option>
                  <option value="IN_TRANSIT">IN_TRANSIT</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </Field>
            </TwoCol>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeAdd} className="bg-[#1c2a55] hover:bg-[#213068] px-4 py-2 rounded-lg">Cancel</button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold">Save Load</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string }> = ({ title, value }) => (
  <div className="bg-gradient-to-br from-[#0d1b3d] to-[#10214d] p-5 rounded-2xl shadow-lg">
    <h3 className="text-sm text-gray-300">{title}</h3>
    <p className="text-3xl font-bold mt-2">{value}</p>
  </div>
);

const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-gradient-to-br from-[#0d1b3d] to-[#0e204a] p-6 rounded-2xl shadow-lg min-h-[200px]">
    <h3 className="font-bold text-lg mb-2">{title}</h3>
    {children}
  </div>
);

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="w-full max-w-xl bg-[#0b1536] border border-[#1e2b5a] rounded-2xl shadow-2xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2b5a]">
        <h2 className="font-bold">{title}</h2>
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-white/10" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block text-sm text-gray-300">
    {label}
    <div className="mt-1">{children}</div>
  </label>
);

const TwoCol: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
);

function escapeCsv(value: string, delim: string) {
  const needsQuotes = value.includes(delim) || value.includes('"') || value.includes("\n");
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function groupByDispatcherTotal(loads: Load[]) {
  return loads.reduce<Record<string, number>>((acc, l) => {
    acc[l.dispatcher] = (acc[l.dispatcher] || 0) + l.rate;
    return acc;
  }, {});
}

function groupByStatus(loads: Load[]) {
  return loads.reduce<Record<LoadStatus, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {} as Record<LoadStatus, number>);
}

export default Dashboard;
