import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Search, Plus, Eye, Edit3, Trash2, X, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getTradeCRMContacts, createTradeCRMContact, deleteTradeCRMContact } from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';

export const TradeCRM: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const data = await getTradeCRMContacts();
    const formatted = data.map((d: any) => ({
      id: d.id ? `CRM-${d.id.slice(0, 4).toUpperCase()}` : 'CRM-101',
      rawId: d.id,
      name: d.company_name,
      country: d.country,
      flag: d.country === 'Poland' ? '🇵🇱' : d.country === 'Germany' ? '🇩🇪' : d.country === 'Netherlands' ? '🇳🇱' : '🌐',
      contact: d.contact_person,
      email: d.email,
      phone: d.phone || '+48 22 890 1234',
      industry: 'Global Import & Export Logistics',
      category: d.category || 'Buyer',
      status: d.status || 'Active',
      statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      volume: '₹2.00 Cr / yr',
    }));
    setCompanies(formatted);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_trade_crm')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_clients' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_trade_crm_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_crm_change', handleLocalChange);
    };
  }, [loadData]);

  const [newCompany, setNewCompany] = useState({
    name: '',
    country: 'Poland',
    flag: '🇵🇱',
    contact: '',
    email: '',
    phone: '',
    industry: 'Freight Forwarding',
    category: 'Logistics Partner'
  });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.name) return;
    await createTradeCRMContact({
      company_name: newCompany.name,
      country: newCompany.country,
      contact_person: newCompany.contact,
      email: newCompany.email,
      phone: newCompany.phone,
      category: newCompany.category,
    });
    setShowAddModal(false);
    showToastMsg(`Added partner company ${newCompany.name}`);
    setNewCompany({ name: '', country: 'Poland', flag: '🇵🇱', contact: '', email: '', phone: '', industry: 'Freight Forwarding', category: 'Logistics Partner' });
    await loadData();
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    setCompanies(companies.map(c => c.id === editingCompany.id ? editingCompany : c));
    setEditingCompany(null);
    showToastMsg('Partner company updated successfully!');
  };

  const handleDeleteCompany = async (id: string, rawId?: string) => {
    await deleteTradeCRMContact(rawId || id);
    setCompanies(prev => prev.filter(c => c.id !== id && c.rawId !== rawId));
    showToastMsg(`Removed partner record ${id}`);
  };

  const filteredCompanies = companies.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.contact.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = filterCategory === 'All' || c.category === filterCategory;
    return matchesSearch && matchesCat;
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
            <Building2 className="w-5 h-5 text-[#6A1B2E]" /> Global Trade CRM Directory
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Trade Console • Managing international buyers, suppliers, maritime agents, and corporate contacts.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Partner Company
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading trade directory...</div>
      ) : null}

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search company, contact, or country..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['All', 'Active Buyer', 'Supplier', 'Logistics Partner'].map((cat) => (
            <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterCategory === cat ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {cat}
            </button>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                <th className="py-3 px-4">Company & Country</th>
                <th className="py-3 px-4">Contact Executive</th>
                <th className="py-3 px-4">Industry & Role</th>
                <th className="py-3 px-4">Trade Volume (₹)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredCompanies.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#6A1B2E] text-white font-black text-xs flex items-center justify-center shadow-xs">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                          {c.name} <span>{c.flag}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">{c.id} · {c.country}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-800">{c.contact}</div>
                    <div className="text-[10px] font-semibold text-slate-400">{c.email}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-800">{c.category}</div>
                    <div className="text-[10px] font-semibold text-slate-400">{c.industry}</div>
                  </td>
                  <td className="py-3.5 px-4 font-black text-slate-900">
                    {c.volume}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${c.statusBadge}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setSelectedCompany(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Inspect Profile">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingCompany(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50" title="Edit Company">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteCompany(c.id, c.rawId)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete Record">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Partner Modal */}
      <AnimatePresence>
        {editingCompany && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setEditingCompany(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Edit Partner Record: {editingCompany.id}</h3>
                <button onClick={() => setEditingCompany(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSaveEdit} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Company Name</label>
                  <input type="text" value={editingCompany.name} onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Contact Executive</label>
                  <input type="text" value={editingCompany.contact} onChange={(e) => setEditingCompany({ ...editingCompany, contact: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setEditingCompany(null)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save Changes</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Partner Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Add New Partner Company</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddCompany} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Company Name</label>
                  <input type="text" required value={newCompany.name} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })} placeholder="e.g. Gdansk Port Terminal" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Country</label>
                    <select value={newCompany.country} onChange={(e) => setNewCompany({ ...newCompany, country: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="Poland">Poland 🇵🇱</option>
                      <option value="Germany">Germany 🇩🇪</option>
                      <option value="Netherlands">Netherlands 🇳🇱</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Category</label>
                    <select value={newCompany.category} onChange={(e) => setNewCompany({ ...newCompany, category: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="Active Buyer">Active Buyer</option>
                      <option value="Supplier">Supplier</option>
                      <option value="Logistics Partner">Logistics Partner</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Contact Executive</label>
                  <input type="text" required value={newCompany.contact} onChange={(e) => setNewCompany({ ...newCompany, contact: e.target.value })} placeholder="e.g. Marek Nowak" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Email Address</label>
                  <input type="email" required value={newCompany.email} onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })} placeholder="e.g. marek@gdansk-port.pl" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save Partner</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* View Drawer */}
      <AnimatePresence>
        {selectedCompany && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedCompany(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">Partner Corporate Profile</h3>
                <button onClick={() => setSelectedCompany(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-left">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-12 h-12 rounded-xl bg-[#6A1B2E] text-white font-black text-base flex items-center justify-center">
                    {selectedCompany.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">{selectedCompany.name} <span>{selectedCompany.flag}</span></h4>
                    <p className="text-xs font-semibold text-slate-500">{selectedCompany.id} · {selectedCompany.country}</p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Primary Contact</span>
                  <div className="text-xs font-black text-slate-900">{selectedCompany.contact}</div>
                  <div className="text-xs font-semibold text-slate-500">{selectedCompany.email} · {selectedCompany.phone}</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Annual Trade Volume</span>
                  <div className="text-base font-black text-slate-900">{selectedCompany.volume}</div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
