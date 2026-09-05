import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle2, Zap, AlertTriangle, Trash2, Plus, X } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getRimiBatches, updateRimiBatchStatus, createRimiBatch, deleteRimiBatch, getRimiProducts } from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';

export const RimiExpiryTracking: React.FC = () => {
  const [toast, setToast] = useState('');
  const [filterRisk, setFilterRisk] = useState<'All' | 'Critical' | 'Warning' | 'Safe'>('All');
  const [expiringStock, setExpiringStock] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [newBatch, setNewBatch] = useState({
    batch_number: `LOT-PER-${Math.floor(100 + Math.random() * 900)}`,
    product_name: 'Norwegian Atlantic Salmon Fillets',
    warehouse_name: 'Mumbai Central Deep Freeze Hub',
    quantity_units: 120,
    expiry_date: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [batchData, prodData] = await Promise.all([
        getRimiBatches(),
        getRimiProducts()
      ]);
      setProducts(prodData || []);

      if (Array.isArray(batchData)) {
        const mapped = batchData.map((b: any, idx: number) => {
          const exp = new Date(b.expiry_date || '2026-12-31');
          const today = new Date();
          const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
          const category = diffDays <= 30 ? 'Critical' : diffDays <= 60 ? 'Warning' : 'Safe';
          return {
            id: b.id || `EXP-${100 + idx}`,
            rawId: b.id,
            product: b.product_name,
            batch: b.batch_number,
            units: `${b.quantity_units} Units`,
            location: b.warehouse_name || 'Central Cold Hub',
            daysLeft: diffDays,
            category,
            risk: diffDays <= 0 ? 'Expired' : `${diffDays} Days Left`,
            riskBadge: category === 'Critical'
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : category === 'Warning'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200',
            status: b.status || 'Active'
          };
        });
        setExpiringStock(mapped);
      } else {
        setExpiringStock([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_rimi_expiry')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_batches' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_rimi_batches_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_rimi_batches_change', handleLocalChange);
    };
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleApplyDiscount = async (rawId: string, batchNo: string, discount: string) => {
    await updateRimiBatchStatus(rawId, `Flash Clearance (${discount} Off)`);
    setExpiringStock(prev => prev.map(s => s.rawId === rawId ? { ...s, status: `Flash Clearance (${discount} Off)` } : s));
    showToastMsg(`Applied ${discount} Quick Clearance Markdown for ${batchNo}`);
  };

  const handleQuarantine = async (rawId: string, batchNo: string) => {
    await updateRimiBatchStatus(rawId, 'Quarantined for Disposal');
    setExpiringStock(prev => prev.map(s => s.rawId === rawId ? { ...s, status: 'Quarantined for Disposal' } : s));
    showToastMsg(`Batch ${batchNo} moved to Quarantine Storage`);
  };

  const handleDeleteBatch = async (rawId: string) => {
    await deleteRimiBatch(rawId);
    setExpiringStock(prev => prev.filter(s => s.rawId !== rawId));
    showToastMsg('Removed batch from monitoring');
  };

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRimiBatch({
      batch_number: newBatch.batch_number,
      product_name: newBatch.product_name,
      warehouse_name: newBatch.warehouse_name,
      quantity_units: Number(newBatch.quantity_units) || 100,
      expiry_date: newBatch.expiry_date
    });
    setShowAddModal(false);
    showToastMsg(`Registered lot batch ${newBatch.batch_number}`);
    await loadData();
  };

  const filtered = expiringStock.filter(s => {
    if (filterRisk === 'All') return true;
    return s.category === filterRisk;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#6A1B2E]" /> Expiration Risk & Shelf-Life Telemetry
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Rimi Cold Chain Console • Proactive expiration monitoring, early clearance workflows, and FIFO batch rotation.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Monitor New Perishable Lot
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {(['All', 'Critical', 'Warning', 'Safe'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setFilterRisk(r)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${filterRisk === r ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {r === 'Critical' ? 'Critical (<30 Days)' : r === 'Warning' ? 'Warning (<60 Days)' : r === 'Safe' ? 'Safe (>60 Days)' : 'All Shelf-Life Batches'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Evaluating batch shelf-life...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No expiration alerts in selected filter</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">All registered cold storage batches are well within shelf-life thresholds.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((s) => (
            <Card key={s.id} className="p-5 border border-slate-200/70 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase">{s.batch}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${s.riskBadge}`}>{s.risk}</span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-snug">{s.product}</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Location: {s.location}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Stock Quantity:</span>
                    <span className="font-bold text-slate-900">{s.units}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Current State:</span>
                    <span className="font-extrabold text-[#6A1B2E]">{s.status}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[11px] font-bold border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                    onClick={() => handleApplyDiscount(s.rawId, s.batch, '35%')}
                  >
                    <Zap className="w-3 h-3 mr-1 text-amber-700" /> 35% Clearance
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[11px] font-bold border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100"
                    onClick={() => handleQuarantine(s.rawId, s.batch)}
                  >
                    <AlertTriangle className="w-3 h-3 mr-1 text-rose-600" /> Quarantine
                  </Button>
                </div>
                <div className="flex justify-end">
                  <button onClick={() => handleDeleteBatch(s.rawId)} className="text-[11px] font-bold text-slate-400 hover:text-red-600 flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Dismiss Log
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Monitor Perishable Lot Batch</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddBatch} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Product Description</label>
                  {products.length > 0 ? (
                    <select value={newBatch.product_name} onChange={(e) => setNewBatch({ ...newBatch, product_name: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      {products.map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" required value={newBatch.product_name} onChange={(e) => setNewBatch({ ...newBatch, product_name: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Batch #</label>
                    <input type="text" required value={newBatch.batch_number} onChange={(e) => setNewBatch({ ...newBatch, batch_number: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Quantity (Units)</label>
                    <input type="number" required value={newBatch.quantity_units} onChange={(e) => setNewBatch({ ...newBatch, quantity_units: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Expiry Date</label>
                  <input type="date" required value={newBatch.expiry_date} onChange={(e) => setNewBatch({ ...newBatch, expiry_date: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Start Monitoring</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
