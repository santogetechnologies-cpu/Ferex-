import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Plus, Eye, Edit3, Trash2, X, CheckCircle2, Mail, Phone, Building2 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

const initialClients = [
  { id: 'CLT-001', name: 'Reliance Digital', contact: 'Ananya Sharma', email: 'ananya@reliancedigital.in', phone: '+91 98200 11234', city: 'Mumbai', type: 'Enterprise', projects: 3, status: 'Active', spent: '₹48,50,000' },
  { id: 'CLT-002', name: 'Tata Motors Digital', contact: 'Rohit Mehta', email: 'rohit@tatamotors.com', phone: '+91 98300 55678', city: 'Pune', type: 'Enterprise', projects: 2, status: 'Active', spent: '₹32,80,000' },
  { id: 'CLT-003', name: 'Mahindra Fintech', contact: 'Priya Nair', email: 'priya@mahindrafintech.com', phone: '+91 91234 78901', city: 'Mumbai', type: 'Enterprise', projects: 1, status: 'Active', spent: '₹12,00,000' },
  { id: 'CLT-004', name: 'BigBasket Growth', contact: 'Suresh Kumar', email: 'suresh@bigbasket.com', phone: '+91 80001 23456', city: 'Bengaluru', type: 'SMB', projects: 2, status: 'Active', spent: '₹8,50,000' },
  { id: 'CLT-005', name: 'OYO Rooms Marketing', contact: 'Neha Singh', email: 'neha@oyorooms.com', phone: '+91 99100 22345', city: 'Gurugram', type: 'SMB', projects: 1, status: 'On Hold', spent: '₹5,20,000' },
];

export const DigitalClients: React.FC = () => {
  const [clients, setClients] = useState(initialClients);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [newClient, setNewClient] = useState({ name: '', contact: '', email: '', phone: '', city: 'Mumbai', type: 'Enterprise' });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const c = { id: `CLT-${Math.floor(Math.random() * 900 + 100)}`, ...newClient, projects: 0, status: 'Active', spent: '₹0' };
    setClients([c, ...clients]);
    setShowAddModal(false);
    showToast(`Added client ${newClient.name}`);
    setNewClient({ name: '', contact: '', email: '', phone: '', city: 'Mumbai', type: 'Enterprise' });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setClients(clients.map(c => c.id === editingClient.id ? editingClient : c));
    setEditingClient(null);
    showToast('Client updated successfully!');
  };

  const handleDelete = (id: string) => {
    setClients(clients.filter(c => c.id !== id));
    showToast('Client removed');
  };

  const filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.contact.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = filterType === 'All' || c.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2"><Users className="w-5 h-5 text-[#6A1B2E]" /> Client Directory & B2B Accounts</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Ferex Digital Console • Enterprise & SMB client portfolio, contact info, project history, and billing overview.</p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add New Client
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search client name or contact..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['All', 'Enterprise', 'SMB'].map(t => (
            <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterType === t ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t}</button>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                <th className="py-3 px-4">Client & ID</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4">Projects</th>
                <th className="py-3 px-4">Total Spent (₹)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-extrabold text-slate-900">
                    <div>{c.name}</div>
                    <span className="text-[10px] font-bold text-slate-400">{c.id}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-800">{c.contact}</div>
                    <div className="text-[10px] text-slate-400">{c.email}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${c.type === 'Enterprise' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{c.type}</span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{c.city}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900 text-center">{c.projects}</td>
                  <td className="py-3.5 px-4 font-black text-slate-900">{c.spent}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${c.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{c.status}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setSelectedClient(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => setEditingClient({...c})} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                    </div>
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
                <h3 className="text-sm font-black text-slate-900">Add New Client</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-3">
                <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Company Name</label>
                  <input type="text" required value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Contact Person</label>
                    <input type="text" required value={newClient.contact} onChange={e => setNewClient({...newClient, contact: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Type</label>
                    <select value={newClient.type} onChange={e => setNewClient({...newClient, type: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option>Enterprise</option><option>SMB</option>
                    </select></div>
                </div>
                <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Email</label>
                  <input type="email" required value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Phone</label>
                  <input type="text" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save Client</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingClient && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setEditingClient(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Edit Client: {editingClient.id}</h3>
                <button onClick={() => setEditingClient(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSaveEdit} className="space-y-3">
                <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Company Name</label>
                  <input type="text" value={editingClient.name} onChange={e => setEditingClient({...editingClient, name: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Contact Person</label>
                  <input type="text" value={editingClient.contact} onChange={e => setEditingClient({...editingClient, contact: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setEditingClient(null)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save Changes</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Client Inspector Drawer */}
      <AnimatePresence>
        {selectedClient && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedClient(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">Client Account Inspector</h3>
                <button onClick={() => setSelectedClient(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{selectedClient.id}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${selectedClient.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{selectedClient.status}</span>
                  </div>
                  <h4 className="text-base font-black text-slate-900">{selectedClient.name}</h4>
                  <div className="space-y-1 text-xs font-semibold text-slate-600">
                    <p className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5 text-[#6A1B2E]" />{selectedClient.type} · {selectedClient.city}</p>
                    <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-[#6A1B2E]" />{selectedClient.email}</p>
                    <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-[#6A1B2E]" />{selectedClient.phone}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <div className="text-xl font-black text-slate-900">{selectedClient.projects}</div>
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase">Projects</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <div className="text-sm font-black text-slate-900">{selectedClient.spent}</div>
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase">Total Spent</div>
                  </div>
                </div>
                <Button size="sm" className="w-full text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => showToast(`Viewing projects for ${selectedClient.name}`)}>
                  View All Projects
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
