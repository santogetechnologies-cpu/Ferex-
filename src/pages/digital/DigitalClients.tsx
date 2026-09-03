import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Plus, Edit3, Trash2, X, CheckCircle2, Mail, Phone } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getDigitalClients, createDigitalClient, updateDigitalClient, deleteDigitalClient } from '../../lib/api/digital';
import { supabase } from '../../lib/supabase';

export const DigitalClients: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingClient, setEditingClient] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  const [newClient, setNewClient] = useState({
    name: '',
    contact: '',
    email: '',
    phone: '',
    city: 'Mumbai',
    type: 'Fintech & Banking'
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDigitalClients();
      if (Array.isArray(data) && data.length > 0) {
        setClients(data.map(d => ({
          id: d.id,
          name: d.company_name || d.name || 'Enterprise Account',
          contact: d.contact_person,
          email: d.email,
          phone: d.phone || '+91 98190 33445',
          city: d.city || 'Mumbai',
          type: d.industry || d.client_type || 'Technology',
          status: d.status || 'Active',
          spent: `₹${Number(d.total_revenue || 0).toLocaleString('en-IN')}`,
        })));
      } else {
        setClients([
          { id: '1', name: 'Nexus FinTech Global', contact: 'Ananya Deshmukh', email: 'ananya@nexusfintech.io', phone: '+91 98190 33445', city: 'Mumbai', type: 'Fintech & Banking', status: 'Active', spent: '₹14,50,000' },
          { id: '2', name: 'Starlight E-Commerce Brands', contact: 'Rahul Varma', email: 'rahul@starlightbrands.com', phone: '+91 98200 66778', city: 'Bengaluru', type: 'Retail & E-Commerce', status: 'Active', spent: '₹8,20,000' },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();

    const channel = supabase
      .channel('realtime_digital_clients')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_clients' }, () => loadClients())
      .subscribe();

    const handleLocalChange = () => loadClients();
    window.addEventListener('ferex_digital_clients_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_digital_clients_change', handleLocalChange);
    };
  }, [loadClients]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name) return;
    await createDigitalClient({
      company_name: newClient.name,
      contact_person: newClient.contact,
      email: newClient.email,
      phone: newClient.phone,
      industry: newClient.type,
      city: newClient.city,
      status: 'Active'
    });
    setShowAddModal(false);
    showToast(`Added client ${newClient.name} to database`);
    setNewClient({ name: '', contact: '', email: '', phone: '', city: 'Mumbai', type: 'Fintech & Banking' });
    await loadClients();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    await updateDigitalClient(editingClient.id, {
      company_name: editingClient.name,
      contact_person: editingClient.contact,
      email: editingClient.email,
      phone: editingClient.phone,
      industry: editingClient.type,
      status: editingClient.status,
    });
    setEditingClient(null);
    showToast(`Updated ${editingClient.name}`);
    await loadClients();
  };

  const handleDelete = async (id: string, name: string) => {
    await deleteDigitalClient(id);
    setClients(prev => prev.filter(c => c.id !== id));
    showToast(`Deleted ${name}`);
  };

  const filteredClients = clients.filter(c => {
    return (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.contact || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(searchQuery.toLowerCase());
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
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#6A1B2E]" /> Enterprise Digital Clients Directory
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Digital ERP • Managed enterprise accounts, retained contracts, and billing ledger.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Enterprise Client
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company, contact person, or email..."
            className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]"
          />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredClients.length} Verified Accounts</span>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading client directory...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClients.map((c) => (
            <Card key={c.id} className="p-5 border border-slate-200/70 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-[#6A1B2E] bg-[#6A1B2E]/10 px-2 py-0.5 rounded-md">{c.type}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-emerald-50 text-emerald-700 border-emerald-200">
                    {c.status}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-snug">{c.name}</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                    <Users className="w-3 h-3 text-slate-400" /> {c.contact}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2 truncate"><Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {c.email}</div>
                  <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {c.phone}</div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Total Invoiced</span>
                  <span className="text-xs font-black text-slate-900">{c.spent}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditingClient(c)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(c.id, c.name)} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Client Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Add Enterprise Client</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Company / Brand Name</label>
                  <input type="text" required value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} placeholder="Nexus FinTech Global" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Contact Person</label>
                    <input type="text" required value={newClient.contact} onChange={(e) => setNewClient({ ...newClient, contact: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Industry</label>
                    <input type="text" required value={newClient.type} onChange={(e) => setNewClient({ ...newClient, type: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Email</label>
                    <input type="email" required value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Phone</label>
                    <input type="text" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Create Client</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Client Modal */}
      <AnimatePresence>
        {editingClient && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setEditingClient(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Edit Client Record</h3>
                <button onClick={() => setEditingClient(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleUpdate} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Company Name</label>
                  <input type="text" required value={editingClient.name} onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Contact Person</label>
                    <input type="text" required value={editingClient.contact} onChange={(e) => setEditingClient({ ...editingClient, contact: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Status</label>
                    <select value={editingClient.status} onChange={(e) => setEditingClient({ ...editingClient, status: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="Active">Active</option>
                      <option value="Lead">Lead</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setEditingClient(null)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save Changes</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
