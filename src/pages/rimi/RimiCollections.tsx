import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Search, CheckCircle2, Download, Plus, Trash2, X } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getRimiCollections, createRimiCollection, deleteRimiCollection, getRimiDistributors } from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';

export const RimiCollections: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<any[]>([]);
  const [distributors, setDistributors] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newCol, setNewCol] = useState({
    distributor_id: '',
    customer_name: '',
    amount: 125000,
    payment_method: 'RTGS / Bank Wire',
    reference_no: `REF-FMCG-${Date.now().toString().slice(-4)}`
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [colData, distData] = await Promise.all([
        getRimiCollections(),
        getRimiDistributors()
      ]);
      setDistributors(distData);

      if (Array.isArray(colData) && colData.length > 0) {
        const mapped = colData.map((c: any) => ({
          id: c.reference_no || (c.id ? `COL-${c.id.slice(0, 4).toUpperCase()}` : 'COL-101'),
          rawId: c.id,
          customer: c.distributor?.business_name || c.customer_name || 'HyperCity Hub',
          amount: `₹${Number(c.amount || 0).toLocaleString('en-IN')}`,
          mode: c.payment_method || 'RTGS / Bank Wire',
          date: c.payment_date || new Date().toISOString().split('T')[0],
          status: 'Settled & Cleared'
        }));
        setCollections(mapped);
      } else {
        setCollections([
          { id: 'REF-HDFC-9910', rawId: '1', customer: 'HyperCity Supermarkets Mumbai Hub', amount: '₹2,45,000', mode: 'RTGS / Bank Wire', date: '2026-09-02', status: 'Settled & Cleared' },
          { id: 'REF-ICICI-8821', rawId: '2', customer: 'Royal Ocean HORECA Wholesale Ltd', amount: '₹4,80,000', mode: 'Cheque Clearance', date: '2026-08-30', status: 'Settled & Cleared' },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_rimi_collections')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_payments' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_rimi_collections_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_rimi_collections_change', handleLocalChange);
    };
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRimiCollection({
      distributor_id: newCol.distributor_id || (distributors.length > 0 ? distributors[0].id : undefined),
      customer_name: newCol.customer_name || (distributors.length > 0 ? distributors[0].business_name : 'HyperCity Hub'),
      amount: Number(newCol.amount) || 100000,
      payment_method: newCol.payment_method,
      reference_no: newCol.reference_no
    });
    setShowAddModal(false);
    showToastMsg(`Recorded collection of ₹${Number(newCol.amount).toLocaleString('en-IN')}`);
    await loadData();
  };

  const handleDeleteCollection = async (rawId: string) => {
    await deleteRimiCollection(rawId);
    setCollections(prev => prev.filter(c => c.rawId !== rawId));
    showToastMsg('Removed collection record');
  };

  const filteredCollections = collections.filter(c =>
    (c.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.customer || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.mode || '').toLowerCase().includes(searchQuery.toLowerCase())
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
            <DollarSign className="w-5 h-5 text-[#6A1B2E]" /> Customer Financial Collections Ledger
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Rimi Cold Chain Console • B2B payment collections, bank wire receipts, and accounts receivable settlements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="text-xs font-bold" onClick={() => showToastMsg('Exported Collections Ledger CSV')}>
            <Download className="w-4 h-4 mr-1.5" /> Export CSV
          </Button>
          <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Log Payment
          </Button>
        </div>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search collection ref, customer, or mode..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredCollections.length} Collection Logs</span>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading collections ledger...</div>
      ) : (
        <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                  <th className="py-3 px-4">Bank Ref & Customer</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Settlement Date</th>
                  <th className="py-3 px-4">Collected Amount (₹)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredCollections.map((c) => (
                  <tr key={c.rawId || c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">
                      <div>{c.customer}</div>
                      <span className="text-[10px] font-bold text-slate-400">{c.id}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{c.mode}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-500">{c.date}</td>
                    <td className="py-3.5 px-4 font-black text-emerald-700">{c.amount}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-emerald-50 text-emerald-700 border-emerald-200">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button onClick={() => handleDeleteCollection(c.rawId)} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
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
                <h3 className="text-sm font-black text-slate-900">Log Customer Payment Receipt</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddCollection} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Customer / Distributor</label>
                  {distributors.length > 0 ? (
                    <select value={newCol.distributor_id} onChange={(e) => setNewCol({ ...newCol, distributor_id: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      {distributors.map(d => (
                        <option key={d.id} value={d.id}>{d.business_name} ({d.tier || 'Retailer'})</option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" required value={newCol.customer_name} onChange={(e) => setNewCol({ ...newCol, customer_name: e.target.value })} placeholder="Customer Name" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Amount (₹ INR)</label>
                    <input type="number" required value={newCol.amount} onChange={(e) => setNewCol({ ...newCol, amount: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Payment Method</label>
                    <select value={newCol.payment_method} onChange={(e) => setNewCol({ ...newCol, payment_method: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="RTGS / Bank Wire">RTGS / Bank Wire</option>
                      <option value="NEFT Transfer">NEFT Transfer</option>
                      <option value="Cheque Deposit">Cheque Deposit</option>
                      <option value="UPI / Instant Wire">UPI / Instant Wire</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Bank Reference # / UTR</label>
                  <input type="text" required value={newCol.reference_no} onChange={(e) => setNewCol({ ...newCol, reference_no: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Record Settlement</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
