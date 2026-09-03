import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Search, Plus, Eye, Trash2, X, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getRimiDistributors, createRimiDistributor, deleteRimiDistributor } from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';

export const RimiRetailers: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRet, setSelectedRet] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [retailers, setRetailers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newRet, setNewRet] = useState({ store: '', owner: '', email: '', phone: '', city: 'Mumbai', creditLimit: 500000 });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRimiDistributors('Retailer');
      if (Array.isArray(data)) {
        const mapped = data.map((d: any) => ({
          id: d.id ? `RET-${d.id.slice(0, 4).toUpperCase()}` : 'RET-401',
          rawId: d.id,
          store: d.business_name,
          owner: d.contact_person,
          email: d.email,
          phone: d.phone,
          city: d.territory || 'Mumbai Suburban',
          creditLimit: `₹${Number(d.credit_limit || 500000).toLocaleString('en-IN')}`,
          status: 'Credit Approved'
        }));
        setRetailers(mapped);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_rimi_retailers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_distributors' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_rimi_distributors_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_rimi_distributors_change', handleLocalChange);
    };
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddRet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRet.store) return;
    await createRimiDistributor({
      business_name: newRet.store,
      tier: 'Retailer',
      contact_person: newRet.owner || 'Store Manager',
      email: newRet.email || `store@${newRet.store.toLowerCase().replace(/[^a-z0-9]/g, '')}.in`,
      phone: newRet.phone || '+91 98200 11223',
      territory: newRet.city,
      credit_limit: Number(newRet.creditLimit) || 500000
    });
    setShowAddModal(false);
    showToastMsg(`Added retailer ${newRet.store}`);
    setNewRet({ store: '', owner: '', email: '', phone: '', city: 'Mumbai', creditLimit: 500000 });
    await loadData();
  };

  const handleDeleteRet = async (rawId: string) => {
    await deleteRimiDistributor(rawId);
    setRetailers(prev => prev.filter(r => r.rawId !== rawId));
    showToastMsg('Removed retailer account');
  };

  const filteredRet = retailers.filter(r =>
    (r.store || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.owner || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.city || '').toLowerCase().includes(searchQuery.toLowerCase())
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
            <Store className="w-5 h-5 text-[#6A1B2E]" /> Retail Store Accounts & Credit Lines
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Rimi Cold Chain Console • Modern trade accounts, supermarket freezer spaces, and direct store delivery points.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Retailer Store
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search retailer or city..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredRet.length} Verified Outlets</span>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading retail store accounts...</div>
      ) : filteredRet.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <Store className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No retailer stores found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery ? 'No outlets match your search.' : 'There are no active retail accounts recorded. Add your first outlet below.'}
          </p>
          <Button size="sm" className="mt-4 bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Retailer Store
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRet.map((r) => (
            <Card key={r.rawId || r.id} className="p-5 border border-slate-200/70 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase">{r.id}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-emerald-50 text-emerald-700 border-emerald-200">{r.status}</span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-snug">{r.store}</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-1">{r.city}</p>
                </div>
                <div className="space-y-1 text-xs text-slate-600 pt-1">
                  <div className="font-bold text-slate-900">Store Lead: {r.owner}</div>
                  <div className="text-slate-400">Credit Limit: {r.creditLimit}</div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button onClick={() => setSelectedRet(r)} className="text-xs font-bold text-[#6A1B2E] hover:underline flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Store Details
                </button>
                <button onClick={() => handleDeleteRet(r.rawId)} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
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
                <h3 className="text-sm font-black text-slate-900">Add Supermarket / Retailer</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddRet} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Store / Chain Name</label>
                  <input type="text" required value={newRet.store} onChange={(e) => setNewRet({ ...newRet, store: e.target.value })} placeholder="e.g. Gourmet Supermarket Bandra" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Store Manager</label>
                    <input type="text" required value={newRet.owner} onChange={(e) => setNewRet({ ...newRet, owner: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">City / Region</label>
                    <input type="text" required value={newRet.city} onChange={(e) => setNewRet({ ...newRet, city: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Credit Line (₹)</label>
                  <input type="number" value={newRet.creditLimit} onChange={(e) => setNewRet({ ...newRet, creditLimit: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save Retailer</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {selectedRet && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedRet(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">Retail Outlet Details</h3>
                <button onClick={() => setSelectedRet(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-left">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{selectedRet.id}</span>
                  <h4 className="text-base font-black text-slate-900">{selectedRet.store}</h4>
                  <p className="text-xs font-semibold text-slate-500">{selectedRet.city}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-xs font-semibold text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Store Manager:</span>
                    <span className="font-bold text-slate-900">{selectedRet.owner}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Credit Limit:</span>
                    <span className="font-bold text-slate-900">{selectedRet.creditLimit}</span>
                  </div>
                </div>

                <Button size="sm" className="w-full text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => setSelectedRet(null)}>
                  Close Outlet View
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
