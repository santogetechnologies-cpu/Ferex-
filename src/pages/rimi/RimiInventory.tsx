import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Boxes, Search, Plus, QrCode, Clock, AlertTriangle,
  Warehouse, Calendar, CheckCircle2, X, Trash2, Edit3,
  FileCheck, ArrowDownRight, ArrowUpRight, Filter, ShieldCheck, Thermometer
} from 'lucide-react';

import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import { useAuth } from '../../contexts/AuthContext';
import {
  getRimiBatches,
  createRimiBatch,
  updateRimiBatch,
  deleteRimiBatch,
  getRimiProducts,
  getRimiWarehouses,
  getRimiStockMovements,
  type RimiInventoryBatchRecord,
  type RimiStockMovementRecord,
  type RimiProductRecord,
  type RimiWarehouseRecord
} from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';

const RIMI_ADMIN_ROLES = ['rimi_admin', 'rimi_frozen', 'admin', 'education_admin', 'central', 'super_admin', 'superadmin'];

export const RimiInventory: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = RIMI_ADMIN_ROLES.includes(profile?.role || '');

  const [batches, setBatches] = useState<RimiInventoryBatchRecord[]>([]);
  const [products, setProducts] = useState<RimiProductRecord[]>([]);
  const [warehouses, setWarehouses] = useState<RimiWarehouseRecord[]>([]);
  const [movements, setMovements] = useState<RimiStockMovementRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [expiryTab, setExpiryTab] = useState<'All' | 'Active' | 'Expiring Soon' | 'Critical' | 'Expired'>('All');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedBatchHistory, setSelectedBatchHistory] = useState<RimiInventoryBatchRecord | null>(null);
  const [toast, setToast] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    product_id: '',
    batch_no: '',
    mfg_date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
    quantity: 500,
    warehouse_id: '',
    storage_temp: '-18°C',
    certificate_url: '',
    notes: ''
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [batchData, prodData, whData, moveData] = await Promise.all([
        getRimiBatches(),
        getRimiProducts(),
        getRimiWarehouses(),
        getRimiStockMovements()
      ]);
      setBatches(batchData);
      setProducts(prodData);
      setWarehouses(whData);
      setMovements(moveData);

      if (prodData.length > 0 && !formData.product_id) {
        setFormData(prev => ({
          ...prev,
          product_id: prodData[0].id,
          warehouse_id: whData.length > 0 ? whData[0].id : ''
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [formData.product_id]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_rimi_inventory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_inventory_batches' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_stock_movements' }, () => loadData())
      .subscribe();

    const handleSync = () => loadData();
    window.addEventListener('ferex_rimi_batches_change', handleSync);
    window.addEventListener('ferex_rimi_movements_change', handleSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_rimi_batches_change', handleSync);
      window.removeEventListener('ferex_rimi_movements_change', handleSync);
    };
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_id || !formData.quantity) return;

    try {
      const matchedWh = warehouses.find(w => w.id === formData.warehouse_id);
      const matchedProd = products.find(p => p.id === formData.product_id);

      await createRimiBatch({
        product_id: formData.product_id,
        product_name: matchedProd?.name,
        batch_no: formData.batch_no || undefined,
        mfg_date: formData.mfg_date,
        expiry_date: formData.expiry_date,
        quantity: Number(formData.quantity),
        warehouse_id: formData.warehouse_id || undefined,
        warehouse_name: matchedWh?.name || 'Cold Storage 1 (Chennai)',
        storage_temp: formData.storage_temp,
        certificate_url: formData.certificate_url,
        notes: formData.notes
      });

      setShowAddModal(false);
      showToast(`Created production lot batch for ${matchedProd?.name || 'product'}`);
      setFormData({
        product_id: products[0]?.id || '',
        batch_no: '',
        mfg_date: new Date().toISOString().split('T')[0],
        expiry_date: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
        quantity: 500,
        warehouse_id: warehouses[0]?.id || '',
        storage_temp: '-18°C',
        certificate_url: '',
        notes: ''
      });
      await loadData();
    } catch (err: any) {
      showToast(`Error creating batch: ${err.message || 'Database error'}`);
    }
  };

  const handleDelete = async (id: string, batchNo: string) => {
    if (!isAdmin) {
      showToast('Restricted: Only Admin can delete production lot records.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete lot ${batchNo}?`)) return;

    try {
      await deleteRimiBatch(id);
      showToast(`Deleted ${batchNo}`);
      await loadData();
    } catch (err: any) {
      showToast(`Error deleting batch: ${err.message || 'Database error'}`);
    }
  };

  const filteredBatches = batches.filter(b => {
    let matchExpiry = true;
    if (expiryTab === 'Active') matchExpiry = (b.days_to_expiry || 0) > 30 && b.quantity > 0;
    if (expiryTab === 'Expiring Soon') matchExpiry = (b.days_to_expiry || 0) > 0 && (b.days_to_expiry || 0) <= 30;
    if (expiryTab === 'Critical') matchExpiry = (b.days_to_expiry || 0) > 0 && (b.days_to_expiry || 0) <= 7;
    if (expiryTab === 'Expired') matchExpiry = (b.days_to_expiry || 0) <= 0;

    const matchWarehouse = warehouseFilter === 'All' || b.warehouse_id === warehouseFilter;
    const matchCategory = categoryFilter === 'All' || b.product_category === categoryFilter;

    const s = search.toLowerCase();
    const matchSearch =
      b.batch_no.toLowerCase().includes(s) ||
      b.product_name.toLowerCase().includes(s) ||
      b.warehouse_name.toLowerCase().includes(s);

    return matchExpiry && matchWarehouse && matchCategory && matchSearch;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Boxes className="w-5 h-5 text-[#58051E]" /> Unified Cold Inventory & Batch Management
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Merged batch tracking, automatic expiry shelf life alerts, and continuous stock audit movements.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Receive Production Batch
        </Button>
      </div>

      {/* Expiry & Status Quick Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['All', 'Active', 'Expiring Soon', 'Critical', 'Expired'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setExpiryTab(tab)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              expiryTab === tab
                ? 'bg-[#58051E] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab === 'Critical' && <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />}
            {tab === 'Expiring Soon' && <Clock className="w-3.5 h-3.5" />}
            <span>{tab === 'All' ? 'All Batches' : tab}</span>
          </button>
        ))}
      </div>

      {/* Filter Card */}
      <Card className="p-4 border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lot batch number, product name..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
          />
        </div>

        <select
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
          className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
        >
          <option value="All">All Cold Storage Warehouses</option>
          {warehouses.map(w => (
            <option key={w.id} value={w.id}>{w.name} ({w.city})</option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
        >
          <option value="All">All Categories</option>
          <option value="Frozen Seafood">Frozen Seafood</option>
          <option value="Frozen Meat & Poultry">Frozen Meat & Poultry</option>
          <option value="Frozen Vegetables">Frozen Vegetables</option>
          <option value="Ice Cream & Dairy">Ice Cream & Dairy</option>
          <option value="Processed Food">Processed Food</option>
        </select>
      </Card>

      {/* Batches Table */}
      <Card className="overflow-hidden border border-slate-200/80 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="p-3.5">Batch / Lot No</th>
                <th className="p-3.5">Product SKU & Category</th>
                <th className="p-3.5">Available Stock</th>
                <th className="p-3.5">Cold Facility & Temp</th>
                <th className="p-3.5">Mfg & Expiry Dates</th>
                <th className="p-3.5">Shelf Life Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">Loading inventory batches...</td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">No lot batches found matching filter.</td>
                </tr>
              ) : (
                filteredBatches.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <QrCode className="w-3.5 h-3.5 text-[#58051E]" />
                        <span>{b.batch_no}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold text-slate-900 block">{b.product_name}</span>
                      <span className="text-[10px] text-slate-400">{b.product_category}</span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-black text-slate-900">{b.quantity} {b.unit}</span>
                      <span className="text-[10px] text-slate-400 block font-normal">Initial: {b.initial_quantity} {b.unit}</span>
                    </td>
                    <td className="p-3.5">
                      <span className="block text-slate-800 font-bold">{b.warehouse_name}</span>
                      <span className="text-[10px] font-mono text-cyan-800 bg-cyan-50 px-1.5 py-0.2 rounded border border-cyan-200 inline-flex items-center gap-1 mt-0.5">
                        <Thermometer className="w-2.5 h-2.5" /> {b.storage_temp}
                      </span>
                    </td>
                    <td className="p-3.5 text-[11px]">
                      <span className="text-slate-400 block">Mfg: {b.mfg_date}</span>
                      <span className="font-bold text-slate-900 block">Exp: {b.expiry_date}</span>
                    </td>
                    <td className="p-3.5">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        b.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : b.status === 'Expiring Soon'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : b.status === 'Expired'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                        {b.days_to_expiry! > 0 ? `${b.days_to_expiry} Days Left (${b.status})` : 'EXPIRED'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1">
                      <button
                        onClick={() => setSelectedBatchHistory(b)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                        title="View Movement Audit Trail"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(b.id, b.batch_no)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          title="Delete Lot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Batch Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900">Receive Production Lot Batch</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Product SKU *</label>
                  <select
                    required
                    value={formData.product_id}
                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>[{p.sku}] {p.name} ({p.category})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Batch / Lot No (Optional)</label>
                    <input
                      type="text"
                      value={formData.batch_no}
                      onChange={(e) => setFormData({ ...formData, batch_no: e.target.value })}
                      placeholder="Auto-generated if blank"
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Initial Quantity (KG/Boxes) *</label>
                    <input
                      type="number"
                      required
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Manufacturing Date</label>
                    <input
                      type="date"
                      value={formData.mfg_date}
                      onChange={(e) => setFormData({ ...formData, mfg_date: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Expiry Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Cold Storage Facility</label>
                    <select
                      value={formData.warehouse_id}
                      onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                    >
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name} ({w.city})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Storage Temperature</label>
                    <input
                      type="text"
                      value={formData.storage_temp}
                      onChange={(e) => setFormData({ ...formData, storage_temp: e.target.value })}
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                    />
                  </div>
                </div>

                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">Save Lot Batch</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Movement Audit Trail Drawer */}
      <AnimatePresence>
        {selectedBatchHistory && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedBatchHistory(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Stock Movements History</h3>
                  <span className="text-[10px] font-bold text-[#58051E]">{selectedBatchHistory.batch_no}</span>
                </div>
                <button onClick={() => setSelectedBatchHistory(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-3 text-xs">
                {movements.filter(m => m.batch_id === selectedBatchHistory.id).length === 0 ? (
                  <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl">No dispatch movements recorded yet</div>
                ) : (
                  movements.filter(m => m.batch_id === selectedBatchHistory.id).map(m => (
                    <div key={m.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-slate-900">{m.movement_type}</span>
                        <span className={`font-black ${m.quantity_change < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{m.notes}</p>
                      <span className="text-[9px] text-slate-400 block pt-0.5">
                        Balance after: {m.resulting_quantity} • By: {m.performed_by} • {new Date(m.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
