import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt, Search, Plus, X, CheckCircle2, Trash2, Server,
  CreditCard, AlertTriangle
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getDigitalExpenses,
  createDigitalExpense,
  deleteDigitalExpense,
  getDigitalAssets,
  createDigitalAsset,
  updateDigitalAsset,
  deleteDigitalAsset,
  getDigitalAssetCostSummary,
  type DigitalAsset
} from '../../lib/api/digital';

export const DigitalExpenses: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'assets'>('expenses');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [assets, setAssets] = useState<DigitalAsset[]>([]);
  const [assetSummary, setAssetSummary] = useState({
    totalMonthlyInr: 0,
    expiringSoonCount: 0,
    activeCount: 0,
    totalAssetsCount: 0
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [toast, setToast] = useState('');

  // Form: Expense
  const [newExp, setNewExp] = useState({
    title: '',
    category: 'Cloud Infrastructure',
    amount: 45000,
    vendor: 'Amazon Web Services',
    date: new Date().toISOString().split('T')[0]
  });

  // Form: Asset / License
  const [newAsset, setNewAsset] = useState({
    name: '',
    type: 'Cloud Infrastructure' as const,
    provider: 'Amazon Web Services',
    cost_per_month_inr: 25000,
    renewal_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    status: 'Active' as const,
    assigned_to_project: 'Core Engineering',
    assigned_team_lead: 'Kavita Iyer',
    license_seats: 10
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [expData, assetData, sumData] = await Promise.all([
        getDigitalExpenses(),
        getDigitalAssets(),
        getDigitalAssetCostSummary()
      ]);
      setExpenses(expData || []);
      setAssets(assetData || []);
      setAssetSummary(sumData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleExpChange = () => loadData();
    const handleAssetChange = () => loadData();

    window.addEventListener('ferex_digital_expenses_change', handleExpChange);
    window.addEventListener('ferex_digital_assets_change', handleAssetChange);

    return () => {
      window.removeEventListener('ferex_digital_expenses_change', handleExpChange);
      window.removeEventListener('ferex_digital_assets_change', handleAssetChange);
    };
  }, [loadData]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExp.title) return;
    await createDigitalExpense({
      title: newExp.title,
      category: newExp.category,
      amount: Number(newExp.amount),
      vendor: newExp.vendor,
      date: newExp.date
    });
    setShowAddExpenseModal(false);
    showToast(`Logged operating expense: ₹${Number(newExp.amount).toLocaleString('en-IN')}`);
    setNewExp({ title: '', category: 'Cloud Infrastructure', amount: 45000, vendor: 'Amazon Web Services', date: new Date().toISOString().split('T')[0] });
    await loadData();
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.name) return;
    await createDigitalAsset(newAsset);
    setShowAddAssetModal(false);
    showToast(`Registered asset: ${newAsset.name}`);
    setNewAsset({
      name: '',
      type: 'Cloud Infrastructure',
      provider: 'Amazon Web Services',
      cost_per_month_inr: 25000,
      renewal_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'Active',
      assigned_to_project: 'Core Engineering',
      assigned_team_lead: 'Kavita Iyer',
      license_seats: 10
    });
    await loadData();
  };

  const handleDeleteExpense = async (id: string) => {
    await deleteDigitalExpense(id);
    setExpenses(prev => prev.filter(e => e.id !== id));
    showToast('Removed expense log');
  };

  const handleDeleteAsset = async (id: string) => {
    await deleteDigitalAsset(id);
    setAssets(prev => prev.filter(a => a.id !== id));
    showToast('Removed digital asset license');
    await loadData();
  };

  const handleRenewAsset = async (asset: DigitalAsset) => {
    const nextDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    await updateDigitalAsset(asset.id, { status: 'Auto-Renewed', renewal_date: nextDate });
    showToast(`Auto-renewed subscription for ${asset.name}`);
    await loadData();
  };

  const totalOperatingSpend = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const filteredExpenses = expenses.filter(e =>
    (e.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.category || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.vendor || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredAssets = assets.filter(a =>
    (a.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.type || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.provider || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.assigned_to_project || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left antialiased max-w-7xl mx-auto">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-rose-900/40">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-[#6A1B2E]" /> Agency Expenses & Digital Asset Management
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Real-time tracking of AWS/GCP cloud clusters, Figma & SaaS licenses, campaign ad spends, and renewals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'expenses' ? (
            <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold shadow-md shadow-rose-950/10" onClick={() => setShowAddExpenseModal(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Log Operating Expense
            </Button>
          ) : (
            <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold shadow-md shadow-rose-950/10" onClick={() => setShowAddAssetModal(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Register Cloud / SaaS Asset
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 border border-slate-200/80 bg-white">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Operating Spend</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            ₹{totalOperatingSpend.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] font-semibold text-slate-500 mt-0.5 block">{expenses.length} Total Expense Vouchers</span>
        </Card>

        <Card className="p-4 border border-slate-200/80 bg-white">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Monthly Cloud & SaaS Burn</span>
          <div className="text-2xl font-black text-purple-700 mt-1">
            ₹{assetSummary.totalMonthlyInr.toLocaleString('en-IN')} / mo
          </div>
          <span className="text-[10px] font-semibold text-purple-700 mt-0.5 block">{assetSummary.totalAssetsCount} Active Subscriptions</span>
        </Card>

        <Card className="p-4 border border-slate-200/80 bg-white">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Expiring / Renewals</span>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {assetSummary.expiringSoonCount} Assets
          </div>
          <span className="text-[10px] font-semibold text-amber-700 mt-0.5 block flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Due for renewal within 15 days
          </span>
        </Card>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => { setActiveTab('expenses'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            activeTab === 'expenses'
              ? 'bg-[#6A1B2E] text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" /> Operating Expenses Ledger ({expenses.length})
        </button>
        <button
          onClick={() => { setActiveTab('assets'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            activeTab === 'assets'
              ? 'bg-[#6A1B2E] text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Server className="w-3.5 h-3.5" /> Digital Assets & Cloud Subscriptions ({assets.length})
        </button>
      </div>

      <Card className="p-3.5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === 'expenses' ? "Search expense, category, vendor..." : "Search asset, license, cloud provider, project..."}
            className="w-full h-9 pl-9 pr-4 bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]"
          />
        </div>
        <span className="text-xs font-bold text-slate-400">
          {activeTab === 'expenses' ? `${filteredExpenses.length} Records` : `${filteredAssets.length} Assets`}
        </span>
      </Card>

      {/* TAB 1: EXPENSES */}
      {activeTab === 'expenses' && (
        <>
          {loading ? (
            <div className="p-8 text-center text-xs font-bold text-slate-400">Loading expense vouchers...</div>
          ) : filteredExpenses.length === 0 ? (
            <Card className="p-12 text-center border border-dashed border-slate-200">
              <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-black text-slate-800">No expenses found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">Log agency vendor payouts, infrastructure costs, and tool subscriptions.</p>
              <Button size="sm" className="mt-4 bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddExpenseModal(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Log Operating Expense
              </Button>
            </Card>
          ) : (
            <Card className="overflow-hidden border border-slate-200/80 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                      <th className="py-3.5 px-4">Expense Title & Voucher #</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Vendor / Supplier</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Amount (₹)</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-extrabold text-slate-900">
                          <div>{exp.title}</div>
                          <span className="text-[10px] font-mono font-bold text-slate-400">{exp.id}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">{exp.vendor}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-500">{exp.date}</td>
                        <td className="py-3.5 px-4 font-black text-[#6A1B2E]">₹{Number(exp.amount).toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete Expense Log"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* TAB 2: DIGITAL ASSETS & SUBSCRIPTIONS */}
      {activeTab === 'assets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssets.map((asset) => (
            <Card key={asset.id} className="p-5 border border-slate-200/80 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                      asset.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      asset.status === 'Expiring Soon' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {asset.status}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                      {asset.type}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 mt-2">{asset.name}</h3>
                  <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Server className="w-3.5 h-3.5 text-[#6A1B2E]" /> Provider: <strong className="text-slate-800">{asset.provider}</strong>
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteAsset(asset.id)}
                  className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Monthly Burn</span>
                  <div className="font-black text-[#6A1B2E] text-sm">₹{Number(asset.cost_per_month_inr).toLocaleString('en-IN')}<span className="text-[10px] text-slate-400 font-semibold">/mo</span></div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Renewal Date</span>
                  <div className="font-bold text-slate-800">{asset.renewal_date}</div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-500 pt-2 border-t border-slate-100">
                <span>Assigned: <strong className="text-slate-800">{asset.assigned_to_project || 'Core'}</strong></span>
                {asset.license_seats && (
                  <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-bold">
                    {asset.license_seats} Seats
                  </span>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs font-bold hover:bg-slate-50"
                  onClick={() => handleRenewAsset(asset)}
                >
                  <CreditCard className="w-3.5 h-3.5 mr-1" /> Quick Auto-Renew
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ─── MODAL: LOG OPERATING EXPENSE ─── */}
      <AnimatePresence>
        {showAddExpenseModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddExpenseModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#6A1B2E]" /> Log Operating Expense
                </h3>
                <button onClick={() => setShowAddExpenseModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddExpense} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Expense Title</label>
                  <input type="text" required value={newExp.title} onChange={(e) => setNewExp({ ...newExp, title: e.target.value })} placeholder="e.g. AWS Elastic Cloud Cluster" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Category</label>
                    <select value={newExp.category} onChange={(e) => setNewExp({ ...newExp, category: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="Cloud Infrastructure">Cloud Infrastructure</option>
                      <option value="Software Tools">Software Tools</option>
                      <option value="Ad Spend">Ad Spend</option>
                      <option value="Freelancer Payout">Freelancer Payout</option>
                      <option value="Office & Logistics">Office & Logistics</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Amount (INR ₹)</label>
                    <input type="number" required value={newExp.amount} onChange={(e) => setNewExp({ ...newExp, amount: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Vendor / Provider</label>
                    <input type="text" value={newExp.vendor} onChange={(e) => setNewExp({ ...newExp, vendor: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Payment Date</label>
                    <input type="date" value={newExp.date} onChange={(e) => setNewExp({ ...newExp, date: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddExpenseModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Record Expense</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── MODAL: REGISTER DIGITAL ASSET / LICENSE ─── */}
      <AnimatePresence>
        {showAddAssetModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddAssetModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#6A1B2E]" /> Register Cloud Asset / Subscription
                </h3>
                <button onClick={() => setShowAddAssetModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddAsset} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Asset / Subscription Name</label>
                  <input type="text" required value={newAsset.name} onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })} placeholder="e.g. Vercel Enterprise Workspace" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Asset Type</label>
                    <select value={newAsset.type} onChange={(e: any) => setNewAsset({ ...newAsset, type: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="Cloud Infrastructure">Cloud Infrastructure</option>
                      <option value="SaaS License">SaaS License</option>
                      <option value="Domain & DNS">Domain & DNS</option>
                      <option value="SSL & Security">SSL & Security</option>
                      <option value="API Gateway">API Gateway</option>
                      <option value="Design & Dev Tools">Design & Dev Tools</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Provider</label>
                    <input type="text" required value={newAsset.provider} onChange={(e) => setNewAsset({ ...newAsset, provider: e.target.value })} placeholder="e.g. Vercel Inc." className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Cost / Month (INR ₹)</label>
                    <input type="number" required value={newAsset.cost_per_month_inr} onChange={(e) => setNewAsset({ ...newAsset, cost_per_month_inr: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Renewal Date</label>
                    <input type="date" required value={newAsset.renewal_date} onChange={(e) => setNewAsset({ ...newAsset, renewal_date: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Assigned Project</label>
                    <input type="text" value={newAsset.assigned_to_project} onChange={(e) => setNewAsset({ ...newAsset, assigned_to_project: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">License Seats</label>
                    <input type="number" value={newAsset.license_seats} onChange={(e) => setNewAsset({ ...newAsset, license_seats: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddAssetModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Register Asset</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
