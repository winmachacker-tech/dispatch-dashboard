import React, { useState, useEffect, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';

import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

import {
  DollarSign, Package, CheckCircle, AlertCircle,
  Plus, X, Edit2, Trash2, Download, Settings, Save
} from 'lucide-react';

/** ---------- simple localStorage helpers ----------- */
const storage = {
  get: async (key) => {
    try {
      const v = localStorage.getItem(key);
      return v ? { value: v } : null;
    } catch {
      return null;
    }
  },
  set: async (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch { /* ignore */ }
  },
};

const todayLabel = new Intl.DateTimeFormat(undefined, {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
}).format(new Date());

const initialDispatchers = ['Jeff', 'Serge', 'Dan', 'Denis'];

const DispatchDashboard = () => {
  const [loads, setLoads] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingLoad, setEditingLoad] = useState(null);
  const [dispatchers, setDispatchers] = useState(initialDispatchers);

  const [formData, setFormData] = useState({
    loadId: '',
    dispatcher: '',
    revenue: '',
    status: 'In Transit',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    compliance: 100
  });

  // Load saved data on mount
  useEffect(() => {
    (async () => {
      const result = await storage.get('dispatch-loads');
      if (result?.value) setLoads(JSON.parse(result.value));

      const dres = await storage.get('dispatchers');
      if (dres?.value) {
        const parsed = JSON.parse(dres.value);
        if (Array.isArray(parsed) && parsed.length) setDispatchers(parsed);
      }
    })();
  }, []);

  // Persist on change
  useEffect(() => { storage.set('dispatch-loads', JSON.stringify(loads)); }, [loads]);
  useEffect(() => { storage.set('dispatchers', JSON.stringify(dispatchers)); }, [dispatchers]);

  const resetForm = () => setFormData({
    loadId: '', dispatcher: '', revenue: '', status: 'In Transit',
    date: new Date().toISOString().split('T')[0], notes: '', compliance: 100
  });

  /** ---------------- CRUD ---------------- */
  const handleAddLoad = () => {
    if (!formData.loadId || !formData.dispatcher || !formData.revenue) {
      alert('Please fill in Load ID, Dispatcher, and Revenue');
      return;
    }
    const newLoad = {
      ...formData,
      id: crypto?.randomUUID?.() ?? Date.now(),
      revenue: Number.parseFloat(formData.revenue || '0') || 0,
      compliance: Number.parseFloat(String(formData.compliance) || '0') || 0
    };
    setLoads(prev => [...prev, newLoad]);
    setShowAddModal(false);
    resetForm();
  };

  const openEditModal = (load) => {
    setEditingLoad(load);
    setFormData({
      loadId: load.loadId,
      dispatcher: load.dispatcher,
      revenue: String(load.revenue ?? ''),
      status: load.status,
      date: load.date,
      notes: load.notes ?? '',
      compliance: Number.isFinite(load.compliance) ? load.compliance : 100
    });
    setShowEditModal(true);
  };

  const handleEditLoad = () => {
    if (!editingLoad) return;
    const updated = {
      ...formData,
      id: editingLoad.id,
      revenue: Number.parseFloat(formData.revenue || '0') || 0,
      compliance: Number.parseFloat(String(formData.compliance) || '0') || 0
    };
    setLoads(prev => prev.map(l => (l.id === editingLoad.id ? updated : l)));
    setShowEditModal(false);
    setEditingLoad(null);
    resetForm();
  };

  const handleDeleteLoad = (id) => {
    if (confirm('Delete this load?')) {
      setLoads(prev => prev.filter(l => l.id !== id));
    }
  };

  const addDispatcher = () => {
    const name = prompt('Enter new dispatcher name:')?.trim();
    if (!name) return;
    if (dispatchers.includes(name)) return alert('Dispatcher already exists.');
    setDispatchers(prev => [...prev, name]);
  };

  const removeDispatcher = (name) => {
    if (loads.some(l => l.dispatcher === name)) {
      alert('Cannot remove a dispatcher who has assigned loads.');
      return;
    }
    setDispatchers(prev => prev.filter(d => d !== name));
  };

  /** ---------------- Metrics (memoized) ---------------- */
  const metrics = useMemo(() => {
    const totalRevenue = loads.reduce((sum, l) => sum + (Number(l.revenue) || 0), 0);
    const activeLoads = loads.filter(l => l.status !== 'Delivered').length;
    const avgCompliance = loads.length
      ? loads.reduce((s, l) => s + (Number(l.compliance) || 0), 0) / loads.length
      : 0;
    const pendingIssues = loads.filter(l => l.status === 'Pending' || l.status === 'Issue').length;
    return { totalRevenue, activeLoads, avgCompliance, pendingIssues };
  }, [loads]);

  const revenueByDispatcher = useMemo(() => {
    const map = Object.fromEntries(dispatchers.map(d => [d, { name: d, revenue: 0, loads: 0 }]));
    for (const l of loads) {
      if (!map[l.dispatcher]) continue;
      map[l.dispatcher].revenue += Number(l.revenue) || 0;
      map[l.dispatcher].loads += 1;
    }
    return Object.values(map).map(d => ({
      ...d,
      avgPerLoad: d.loads ? Math.round(d.revenue / d.loads) : 0
    }));
  }, [loads, dispatchers]);

  const complianceData = useMemo(() => {
    const agg = Object.fromEntries(dispatchers.map(d => [d, { dispatcher: d, total: 0, count: 0 }]));
    for (const l of loads) {
      if (!agg[l.dispatcher]) continue;
      agg[l.dispatcher].total += Number(l.compliance) || 0;
      agg[l.dispatcher].count += 1;
    }
    return Object.values(agg).map(d => {
      const avg = d.count ? Math.round(d.total / d.count) : 0;
      const color =
        avg >= 95 ? '#10b981' :
        avg >= 90 ? '#3b82f6' :
        avg >= 85 ? '#f59e0b' : '#ef4444';
      return { dispatcher: d.dispatcher, compliance: avg, color };
    });
  }, [loads, dispatchers]);

  const loadStatus = useMemo(() => {
    const s = { Delivered: 0, 'In Transit': 0, Pending: 0, Issue: 0 };
    for (const l of loads) if (s[l.status] !== undefined) s[l.status]++;
    return Object.entries(s)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({
        name: k,
        value: v,
        color:
          k === 'Delivered' ? '#10b981' :
          k === 'In Transit' ? '#3b82f6' :
          k === 'Pending' ? '#f59e0b' : '#ef4444'
      }));
  }, [loads]);

  /** ---------------- CSV export ---------------- */
  const exportToCSV = () => {
    const headers = ['Load ID', 'Dispatcher', 'Revenue', 'Status', 'Date', 'Compliance', 'Notes'];
    const rows = loads.map(l =>
      [l.loadId, l.dispatcher, l.revenue, l.status, l.date, l.compliance, l.notes]
        .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dispatch-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** ---------------- small UI components ---------------- */
  const MetricCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl p-6 border border-blue-700 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-blue-300 text-sm font-medium mb-1">{title}</p>
          <p className="text-white text-3xl font-bold">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}><Icon className="w-6 h-6 text-white" /></div>
      </div>
    </div>
  );

  const ComplianceBar = ({ dispatcher, compliance, color }) => (
    <div className="mb-4">
      <div className="flex justify-between mb-2">
        <span className="text-white font-medium">{dispatcher}</span>
        <span className="text-blue-300 font-bold">{compliance}%</span>
      </div>
      <div className="w-full bg-blue-950 rounded-full h-3">
        <div className="h-3 rounded-full transition-all duration-500"
             style={{ width: `${compliance}%`, backgroundColor: color }} />
      </div>
    </div>
  );

  /** ---------------- Stable modal (portal + memo) ---------------- */
  const Modal = memo(function Modal({ onClose, title, children }) {
    const content = (
      <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onMouseDown={onClose} />
        {/* Card */}
        <div
          className="absolute inset-0 flex items-center justify-center p-4"
          onMouseDown={(e) => e.stopPropagation()} // keep clicks inside from blurring inputs
        >
          <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl p-6 border border-blue-700 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">{title}</h2>
              <button type="button" onClick={onClose} className="text-blue-300 hover:text-white" aria-label="Close modal">
                <X className="w-6 h-6" />
              </button>
            </div>
            {children}
          </div>
        </div>
      </div>
    );
    return createPortal(content, document.body);
  });

  /** ---------------- render ---------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Marks Dispatch Dashboard</h1>
          <p className="text-cyan-400 text-lg">{todayLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettings(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>
          <button
            onClick={exportToCSV}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
            disabled={loads.length === 0}
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Load
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard title="Total Revenue" value={`$${(metrics.totalRevenue / 1000).toFixed(1)}K`} icon={DollarSign} color="bg-green-500" />
        <MetricCard title="Active Loads" value={metrics.activeLoads} icon={Package} color="bg-blue-500" />
        <MetricCard title="Avg TMS Compliance" value={`${metrics.avgCompliance.toFixed(1)}%`} icon={CheckCircle} color="bg-purple-500" />
        <MetricCard title="Pending Issues" value={metrics.pendingIssues} icon={AlertCircle} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl p-6 border border-blue-700 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-6">Revenue by Dispatcher</h2>
          {revenueByDispatcher.some(d => d.revenue > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByDispatcher}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e40af" />
                <XAxis dataKey="name" stroke="#93c5fd" />
                <YAxis stroke="#93c5fd" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e3a8a',
                    border: '1px solid #3b82f6',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-blue-300">
              No data yet. Add your first load to see charts!
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl p-6 border border-blue-700 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-6">Load Status</h2>
          {loadStatus.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={loadStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {loadStatus.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e3a8a', border: '1px solid #3b82f6', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {loadStatus.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-blue-200 text-sm">{s.name}: {s.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-blue-300">No loads yet</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl p-6 border border-blue-700 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-6">Motion TMS Compliance</h2>
          {complianceData.some(d => d.compliance > 0)
            ? complianceData.map((d, i) => <ComplianceBar key={i} {...d} />)
            : <div className="text-blue-300 text-center py-8">No compliance data yet</div>}
        </div>

        <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl p-6 border border-blue-700 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-6">Recent Loads</h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {loads.length ? (
              loads.slice().reverse().slice(0, 10).map(l => (
                <div key={l.id} className="bg-blue-950 rounded-lg p-3 border border-blue-700 hover:border-blue-500 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-bold">#{l.loadId}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        l.status === 'Delivered' ? 'bg-green-500' :
                        l.status === 'In Transit' ? 'bg-blue-500' :
                        l.status === 'Pending' ? 'bg-orange-500' : 'bg-red-500'
                      } text-white`}>
                        {l.status}
                      </span>
                      <button onClick={() => openEditModal(l)} className="text-blue-300 hover:text-white p-1" aria-label="Edit load">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteLoad(l.id)} className="text-red-400 hover:text-red-300 p-1" aria-label="Delete load">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-blue-200 text-sm mb-1">
                    <span className="font-medium">{l.dispatcher}</span> • ${Number(l.revenue || 0).toLocaleString()}
                  </div>
                  {l.notes && <div className="text-blue-300 text-xs">{l.notes}</div>}
                  <div className="text-blue-400 text-xs mt-1">{l.date}</div>
                </div>
              ))
            ) : (
              <div className="text-blue-300 text-center py-8">No loads yet. Click "Add Load" to get started!</div>
            )}
          </div>
        </div>
      </div>

      {/* Add modal */}
      {showAddModal && (
        <Modal onClose={() => { setShowAddModal(false); resetForm(); }} title="Add New Load">
          <div className="space-y-4">
            <div>
              <label htmlFor="loadId" className="block text-blue-300 text-sm font-medium mb-2">Load ID *</label>
              <input
                id="loadId"
                autoFocus
                type="text"
                value={formData.loadId}
                onChange={(e) => setFormData(prev => ({ ...prev, loadId: e.target.value }))}
                className="w-full bg-blue-950 text-white rounded-lg px-4 py-2 border border-blue-600 focus:border-blue-400 focus:outline-none"
                placeholder="e.g., 53014"
              />
            </div>

            <div>
              <label htmlFor="dispatcher" className="block text-blue-300 text-sm font-medium mb-2">Dispatcher *</label>
              <select
                id="dispatcher"
                value={formData.dispatcher}
                onChange={(e) => setFormData(prev => ({ ...prev, dispatcher: e.target.value }))}
                className="w-full bg-blue-950 text-white rounded-lg px-4 py-2 border border-blue-600 focus:border-blue-400 focus:outline-none"
              >
                <option value="">Select Dispatcher</option>
                {dispatchers.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="revenue" className="block text-blue-300 text-sm font-medium mb-2">Revenue ($) *</label>
              <input
                id="revenue"
                type="text"
                inputMode="decimal"
                value={formData.revenue}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
                  setFormData(prev => ({ ...prev, revenue: v }));
                }}
                className="w-full bg-blue-950 text-white rounded-lg px-4 py-2 border border-blue-600 focus:border-blue-400 focus:outline-none"
                placeholder="e.g., 3500"
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-blue-300 text-sm font-medium mb-2">Status</label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full bg-blue-950 text-white rounded-lg px-4 py-2 border border-blue-600 focus:border-blue-400 focus:outline-none"
              >
                <option value="In Transit">In Transit</option>
                <option value="Delivered">Delivered</option>
                <option value="Pending">Pending</option>
                <option value="Issue">Issue</option>
              </select>
            </div>

            <div>
              <label htmlFor="date" className="block text-blue-300 text-sm font-medium mb-2">Date</label>
              <input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full bg-blue-950 text-white rounded-lg px-4 py-2 border border-blue-600 focus:border-blue-400 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="compliance" className="block text-blue-300 text-sm font-medium mb-2">TMS Compliance (%)</label>
              <input
                id="compliance"
                type="number" min="0" max="100" step="any"
                value={formData.compliance}
                onChange={(e) => setFormData(prev => ({ ...prev, compliance: e.target.value }))}
                className="w-full bg-blue-950 text-white rounded-lg px-4 py-2 border border-blue-600 focus:border-blue-400 focus:outline-none"
                placeholder="100"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-blue-300 text-sm font-medium mb-2">Notes</label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full bg-blue-950 text-white rounded-lg px-4 py-2 border border-blue-600 focus:border-blue-400 focus:outline-none"
                rows="3"
                placeholder="Any additional notes..."
              />
            </div>

            <button
              onClick={handleAddLoad}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium"
            >
              <Save className="w-5 h-5" />
              Add Load
            </button>
          </div>
        </Modal>
      )}

      {/* Edit modal */}
      {showEditModal && (
        <Modal onClose={() => { setShowEditModal(false); setEditingLoad(null); resetForm(); }} title="Edit Load">
          <div className="space-y-4">
            <div>
              <label htmlFor="loadIdEdit" className="block text-blue-300 text-sm font-medium mb-2">Load ID *</label>
              <input
                id="loadIdEdit"
                autoFocus
                type="text"
                value={formData.loadId}
                onChange={(e) => setFormData(prev => ({ ...prev, loadId: e.target.value }))}
                className="w-full bg-blue-950 text-white rounded-lg px-4 py-2 border border-blue-600 focus:border-blue-400 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="dispatcherEdit" className="block text-blue-300 text-sm font-medium mb-2">Dispatcher *</label>
              <select
                id="dispatcherEdit"
                value={formData.dispatcher}
                onChange={(e) => setFormData(prev => ({ ...prev, dispatcher: e.target.value }))}
                className="w-full bg-blue-950 text-white rounded-lg px-4 py-2 border border-blue-600 focus:border-blue-400 focus:outline-none"
              >
                {dispatchers.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="revenueEdit" className="block text-blue-300 text-sm font-medium mb-2">Revenue ($) *</label>
              <input
                id="revenueEdit"
                type="text"
                inputMode="decimal"
                value={formData.revenue}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
                  setFormData(prev => ({ ...prev, revenue: v }));
                }}
                className="w-full bg-blue-950 text-white rounded-lg px-4 py-2 border border-blue-600 focus:border-blue-400 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="statusEdit" className="block text-blue-300 text-sm font-medium mb-2">Status</label>
              <select
                id="statusEdit"
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full bg-blue-950 text-white rounded-lg px-4 py-2 border border-blue-600 focus:border-blue-400 focus:outline-none"
              >
                <option value="In Transit">In Transit</option>
                <option value="Delivered">Delivered</option>
                <option value="Pending">Pending</option>
                <option value="Issue">Issue</option>
              </select>
            </div>

            <div>
              <label htmlFor="dateEdit" className="block text-blue-300 text-sm font-medium mb-2">Date</label>
              <input
                id="dateEdit"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full bg-blue-950 text-white rounded-lg px-4 py-2 border border-blue-600 focus:border-blue-400 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="complianceEdit" className="block text-blue-300 text-sm font-medium mb-2">TMS Compliance (%)</label>
              <input
                id="complianceEdit"
                type="number" min="0" max="100" step="any"
                value={formData.compliance}
                onChange={(e) => setFormData(prev => ({ ...prev, compliance: e.target.value }))}
                className="w-full bg-blue-950 text-white rounded-lg px-4 py-2 border border-blue-600 focus:border-blue-400 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="notesEdit" className="block text-blue-300 text-sm font-medium mb-2">Notes</label>
              <textarea
                id="notesEdit"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full bg-blue-950 text-white rounded-lg px-4 py-2 border border-blue-600 focus:border-blue-400 focus:outline-none"
                rows="3"
              />
            </div>

            <button
              onClick={handleEditLoad}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium"
            >
              <Save className="w-5 h-5" />
              Save Changes
            </button>
          </div>
        </Modal>
      )}

      {/* Settings */}
      {showSettings && (
        <Modal onClose={() => setShowSettings(false)} title="Settings">
          <div className="space-y-4">
            <div>
              <h3 className="text-white font-medium mb-3">Dispatchers</h3>
              <div className="space-y-2 mb-3">
                {dispatchers.map((dispatcher, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-blue-950 rounded-lg px-4 py-2 border border-blue-600">
                    <span className="text-white">{dispatcher}</span>
                    <button
                      onClick={() => removeDispatcher(dispatcher)}
                      className="text-red-400 hover:text-red-300 p-1"
                      aria-label={`Remove ${dispatcher}`}
                      title="Remove dispatcher"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addDispatcher}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Dispatcher
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DispatchDashboard;
