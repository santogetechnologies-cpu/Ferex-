import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Plus, Eye, Edit3, Trash2, X, CheckCircle2, Phone, Mail } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getRimiDistributors, createRimiDistributor, updateRimiDistributor, deleteRimiDistributor } from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';

export const RimiCustomers: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [selectedCust, setSelectedCust] = useState<any>(null);
  const [editingCust, setEditingCust] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRimiDistributors();
      if (Array.isArray(data)) {
        const formatted = data.map((d: any) => ({
          id: d.id ? `CUST-${d.id.slice(0, 4).toUpperCase()}` : 'CUST-101',
          rawId: d.id,
          name: d.business_name,
          type: d.tier || 'Retailer',
          contact: d.contact_person || 'Procurement Head',
          email: d.email || 'procurement@client.com',
          phone: d.phone || '+91 98200 11223',
          territory: d.territory || 'Mumbai Central',
          creditLimit: Number(d.credit_limit || 100000),
          outstanding: Number(d.outstanding_balance || 0),
          status: d.status || 'Active',
          volume: `Limit: ₹${(Number(d.credit_limit || 100000) / 100000).toFixed(2)} Lakhs`,
        }));
        setCustomers(formatted);
      } else {
        setCustomers([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_rimi_customers')
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

  const [newCust, setNewCust] = useState({
    name: '',
    tier: 'Retailer',
    contact: '',
    email: '',
    phone: '',
    territory: 'Mumbai Central',
    credit_limit: 500000
  });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddCust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCust.name) return;
    const created = await createRimiDistributor({
      business_name: newCust.name,
      tier: newCust.tier,
      contact_person: newCust.contact,
      email: newCust.email,
      phone: newCust.phone,
      territory: newCust.territory,
      credit_limit: Number(newCust.credit_limit) || 500000
    });
    setShowAddModal(false);
    showToastMsg(`Added B2B Customer ${created.business_name || newCust.name}`);
    setNewCust({ name: '', tier: 'Retailer', contact: '', email: '', phone: '', territory: 'Mumbai Central', credit_limit: 500000 });
    await loadData();
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCust) return;
    await updateRimiDistributor(editingCust.rawId, {
      business_name: editingCust.name,
      tier: editingCust.type,
      contact_person: editingCust.contact,
      email: editingCust.email,
      phone: editingCust.phone,
      territory: editingCust.territory
    });
    setEditingCust(null);
    showToastMsg('Customer record updated in database!');
    await loadData();
  };

  const handleDeleteCust = async (id: string, rawId?: string) => {
    await deleteRimiDistributor(rawId || id);
    setCustomers(prev => prev.filter(c => c.id !== id && c.rawId !== rawId));
    showToastMsg(`Removed customer record`);
  };

  const filteredCusts = customers.filter(c => {
    const matchesSearch = (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (c.contact || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'All' || c.type === filterType;
    return matchesSearch && matchesType;
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
            <Users className="w-5 h-5 text-[#6A1B2E]" /> B2B Cold Chain Customers Directory
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Rimi Cold Chain Console • Managing regional distributors, supermarket retail chains, wholesalers, and HORECA partners.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add B2B Customer
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search customer or contact..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['All', 'Distributor', 'Wholesaler', 'Retailer', 'HORECA Partner'].map((cat) => (
            <button key={cat} onClick={() => setFilterType(cat)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterType === cat ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {cat}
            </button>
          ))}
        </div>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading customers directory...</div>
      ) : filteredCusts.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No customers found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery ? 'No customers match your search.' : 'There are no active B2B customer accounts. Register a customer below.'}
          </p>
          <Button size="sm" className="mt-4 bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add B2B Customer
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCusts.map((c) => (
            <Card key={c.id} className="p-5 border border-slate-200/70 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase">{c.id}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-emerald-50 text-emerald-700 border-emerald-200">{c.type}</span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-snug">{c.name}</h3>
                  <p className="text-xs font-bold text-[#6A1B2E] mt-0.5">{c.contact}</p>
                </div>
                <div className="space-y-1 text-xs text-slate-500 pt-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{c.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-[11px] text-slate-400 pt-0.5">
                    <span>Territory: {c.territory}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button onClick={() => setSelectedCust(c)} className="text-xs font-bold text-[#6A1B2E] hover:underline flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> View Profile
                </button>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditingCust(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Edit Customer">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDeleteCust(c.id, c.rawId)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete Customer">
                    <Trash2 className="w-3.5 h-3.5" />
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
                <h3 className="text-sm font-black text-slate-900">Add B2B Cold Chain Customer</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddCust} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Business Entity Name</label>
                  <input type="text" required value={newCust.name} onChange={(e) => setNewCust({ ...newCust, name: e.target.value })} placeholder="e.g. Metro Cash & Carry Mumbai" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Partner Tier</label>
                    <select value={newCust.tier} onChange={(e) => setNewCust({ ...newCust, tier: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="Distributor">Distributor</option>
                      <option value="Wholesaler">Wholesaler</option>
                      <option value="Retailer">Retailer</option>
                      <option value="HORECA Partner">HORECA Partner</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Territory / Region</label>
                    <input type="text" required value={newCust.territory} onChange={(e) => setNewCust({ ...newCust, territory: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Contact Person</label>
                    <input type="text" required value={newCust.contact} onChange={(e) => setNewCust({ ...newCust, contact: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Phone</label>
                    <input type="text" value={newCust.phone} onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Email</label>
                  <input type="email" required value={newCust.email} onChange={(e) => setNewCust({ ...newCust, email: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save Customer</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingCust && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setEditingCust(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Edit Customer Account</h3>
                <button onClick={() => setEditingCust(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSaveEdit} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Business Name</label>
                  <input type="text" required value={editingCust.name} onChange={(e) => setEditingCust({ ...editingCust, name: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Contact Person</label>
                    <input type="text" required value={editingCust.contact} onChange={(e) => setEditingCust({ ...editingCust, contact: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Phone</label>
                    <input type="text" value={editingCust.phone} onChange={(e) => setEditingCust({ ...editingCust, phone: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Email</label>
                  <input type="email" required value={editingCust.email} onChange={(e) => setEditingCust({ ...editingCust, email: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setEditingCust(null)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save Changes</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {selectedCust && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedCust(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">B2B Account Dossier</h3>
                <button onClick={() => setSelectedCust(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-left">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{selectedCust.id}</span>
                  <h4 className="text-base font-black text-slate-900">{selectedCust.name}</h4>
                  <p className="text-xs font-semibold text-slate-500">{selectedCust.type} · {selectedCust.territory}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-xs font-semibold text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Contact Person:</span>
                    <span className="font-bold text-slate-900">{selectedCust.contact}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email:</span>
                    <span className="font-bold text-slate-900">{selectedCust.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Phone:</span>
                    <span className="font-bold text-slate-900">{selectedCust.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Credit Facility:</span>
                    <span className="font-bold text-slate-900">{selectedCust.volume}</span>
                  </div>
                </div>

                <Button size="sm" className="w-full text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => setSelectedCust(null)}>
                  Close Dossier
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
