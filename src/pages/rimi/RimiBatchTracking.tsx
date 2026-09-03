import React, { useState, useEffect, useCallback } from 'react';
import { QrCode, Search, Plus, Trash2, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getRimiBatches, createRimiBatch, deleteRimiBatch, getRimiProducts } from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';

export const RimiBatchTracking: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [batches, setBatches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  const [newBatch, setNewBatch] = useState({
    batch_number: 'LOT-FZN-9821',
    product_name: 'Premium King Prawns (500g)',
    warehouse_name: 'Mumbai Central Deep Freeze Hub',
    quantity_units: 350,
    production_date: new Date().toISOString().split('T')[0],
    expiry_date: '2027-03-31',
    quality_grade: 'Grade A Export'
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [batchData, prodData] = await Promise.all([
        getRimiBatches(),
        getRimiProducts()
      ]);
      setProducts(prodData);

      if (Array.isArray(batchData) && batchData.length > 0) {
        const mapped = batchData.map((b: any) => ({
          id: b.batch_number || b.id,
          rawId: b.id,
          product: b.product_name,
          mfgDate: b.production_date,
          expDate: b.expiry_date,
          units: `${b.quantity_units} Units`,
          supplier: b.warehouse_name || 'Central Cold Hub',
          grade: b.quality_grade || 'Grade A',
          status: b.status || 'Active'
        }));
        setBatches(mapped);
      } else {
        // Fallback default batch telemetry
        setBatches([
          { id: 'LOT-SEA-9821', rawId: '1', product: 'Premium King Prawns (500g IQF)', mfgDate: '2026-08-01', expDate: '2027-08-01', units: '450 Packs', supplier: 'Mumbai Central Deep Freeze Hub', grade: 'Grade A Export', status: 'Active' },
          { id: 'LOT-MT-4402', rawId: '2', product: 'Gourmet Chicken Nuggets (1kg Family Pack)', mfgDate: '2026-07-15', expDate: '2027-01-15', units: '320 Packs', supplier: 'Delhi NCR Reefer Logistics Center', grade: 'Grade A Export', status: 'Active' },
          { id: 'LOT-VG-1109', rawId: '3', product: 'Sweet Corn & Green Peas IQF (1kg)', mfgDate: '2026-06-20', expDate: '2026-12-20', units: '180 Bags', supplier: 'Bengaluru South Cold Transit Depot', grade: 'Grade A Export', status: 'Near Expiry Alert' },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_rimi_batches')
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

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRimiBatch({
      batch_number: newBatch.batch_number,
      product_name: newBatch.product_name,
      warehouse_name: newBatch.warehouse_name,
      quantity_units: Number(newBatch.quantity_units) || 100,
      production_date: newBatch.production_date,
      expiry_date: newBatch.expiry_date,
      quality_grade: newBatch.quality_grade
    });
    setShowAddModal(false);
    showToastMsg(`Registered lot batch ${newBatch.batch_number}`);
    await loadData();
  };

  const handleDeleteBatch = async (rawId: string) => {
    await deleteRimiBatch(rawId);
    setBatches(prev => prev.filter(b => b.rawId !== rawId));
    showToastMsg('Removed batch telemetry record');
  };

  const filteredBatches = batches.filter(b =>
    (b.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.product || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.supplier || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <QrCode className="w-5 h-5 text-[#6A1B2E]" /> Lot & Batch Telemetry Tracker
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Rimi Cold Chain Console • Full origin traceability, supplier lot numbers, and manufacturing batch logs.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Register Batch Lot
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search Batch Lot # or product..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredBatches.length} Batches Registered</span>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading batch records...</div>
      ) : (
        <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                  <th className="py-3 px-4">Batch Lot ID & Product</th>
                  <th className="py-3 px-4">Cold Facility</th>
                  <th className="py-3 px-4">Mfg Date</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Batch Quantity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredBatches.map((b) => (
                  <tr key={b.rawId || b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">
                      <div>{b.id}</div>
                      <span className="text-[10px] font-bold text-slate-400">{b.product}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{b.supplier}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-500">{b.mfgDate}</td>
                    <td className="py-3.5 px-4 font-black text-slate-900">{b.expDate}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-700">{b.units}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${b.status.includes('Expiry') ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button onClick={() => handleDeleteBatch(b.rawId)} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
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

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Register Cold Batch Lot</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddBatch} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Batch / Lot Number</label>
                  <input type="text" required value={newBatch.batch_number} onChange={(e) => setNewBatch({ ...newBatch, batch_number: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
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
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Quantity (Units)</label>
                    <input type="number" required value={newBatch.quantity_units} onChange={(e) => setNewBatch({ ...newBatch, quantity_units: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Quality Grade</label>
                    <input type="text" value={newBatch.quality_grade} onChange={(e) => setNewBatch({ ...newBatch, quality_grade: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Mfg Date</label>
                    <input type="date" required value={newBatch.production_date} onChange={(e) => setNewBatch({ ...newBatch, production_date: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Expiry Date</label>
                    <input type="date" required value={newBatch.expiry_date} onChange={(e) => setNewBatch({ ...newBatch, expiry_date: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save Lot</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
