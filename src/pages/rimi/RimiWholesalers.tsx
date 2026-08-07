import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Boxes, Search, Plus, Eye, X, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const RimiWholesalers: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWh, setSelectedWh] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');

  const [wholesalers, setWholesalers] = useState([
    { id: 'WHL-501', name: 'APMC Frozen Meat Wholesalers Hub', contact: 'Ramesh Patel', city: 'Navi Mumbai', tier: 'Tier-1 Bulk (10+ Tons)', volume: '₹65.00 Lakhs / mo' },
    { id: 'WHL-502', name: 'Ghazipur Frozen Poultry Wholesalers', contact: 'Suresh Verma', city: 'Delhi', tier: 'Tier-1 Bulk (15+ Tons)', volume: '₹82.40 Lakhs / mo' }
  ]);

  const [newWh, setNewWh] = useState({ name: '', contact: '', city: 'Navi Mumbai' });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddWh = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWh.name) return;
    const created = {
      id: `WHL-${Math.floor(500 + Math.random() * 90)}`,
      name: newWh.name,
      contact: newWh.contact,
      city: newWh.city,
      tier: 'Tier-2 Wholesale',
      volume: '₹25.00 Lakhs / mo'
    };
    setWholesalers([created, ...wholesalers]);
    setShowAddModal(false);
    showToastMsg(`Added wholesaler account ${newWh.name}`);
  };

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
            <Boxes className="w-5 h-5 text-[#6A1B2E]" /> Bulk Wholesaler Directory & Tier Pricing
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Rimi Cold Chain Console • High-volume wholesale buyers, APMC market contracts, and tonnage tiers.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Wholesaler Account
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search wholesaler or city..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{wholesalers.length} Wholesaler Accounts</span>
      </Card>

      <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                <th className="py-3 px-4">Wholesaler Name & ID</th>
                <th className="py-3 px-4">Volume Tier</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Market Location</th>
                <th className="py-3 px-4">Monthly Volume (₹)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {wholesalers.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-extrabold text-slate-900">
                    <div>{w.name}</div>
                    <span className="text-[10px] font-bold text-slate-400">{w.id}</span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{w.tier}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{w.contact}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{w.city}</td>
                  <td className="py-3.5 px-4 font-black text-slate-900">{w.volume}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button onClick={() => setSelectedWh(w)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Add Wholesaler Account</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddWh} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Wholesaler Entity Name</label>
                  <input type="text" required value={newWh.name} onChange={(e) => setNewWh({ ...newWh, name: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Contact Executive</label>
                  <input type="text" required value={newWh.contact} onChange={(e) => setNewWh({ ...newWh, contact: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save Wholesaler</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Drawer */}
      <AnimatePresence>
        {selectedWh && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedWh(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">Wholesaler Account Inspector</h3>
                <button onClick={() => setSelectedWh(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-left">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{selectedWh.id}</span>
                  <h4 className="text-base font-black text-slate-900">{selectedWh.name}</h4>
                  <p className="text-xs font-semibold text-slate-500">{selectedWh.contact} · {selectedWh.city}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Tonnage Volume Tier</span>
                  <div className="text-base font-black text-slate-900">{selectedWh.tier}</div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Monthly Volume</span>
                  <div className="text-xl font-black text-slate-900">{selectedWh.volume}</div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
