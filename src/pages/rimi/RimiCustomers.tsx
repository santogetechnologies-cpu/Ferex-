import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Plus, Eye, Edit3, Trash2, X, CheckCircle2, Phone, Mail, KeyRound, Copy, ShieldAlert, ShoppingBag, Truck, DollarSign } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getRimiDistributors,
  createRimiDistributor,
  updateRimiDistributor,
  deleteRimiDistributor,
  provisionRimiCustomerLogin,
  getRimiCustomerCredentials,
  getRimiSalesOrders,
  getRimiPayments,
  type ProvisionedRimiCredential
} from '../../lib/api/rimi';
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

  // Credentials State
  const [activeCredential, setActiveCredential] = useState<ProvisionedRimiCredential | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Dossier Mapped Data
  const [custOrders, setCustOrders] = useState<any[]>([]);
  const [custPayments, setCustPayments] = useState<any[]>([]);

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
          hasCredentials: !!getRimiCustomerCredentials(d.id),
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

    if (created?.id && created?.email) {
      handleProvisionCredentials({
        rawId: created.id,
        name: created.business_name,
        email: created.email,
        contact: created.contact_person
      });
    }
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

  const handleProvisionCredentials = async (cust: any) => {
    const existing = getRimiCustomerCredentials(cust.rawId || cust.id);
    if (existing) {
      setActiveCredential(existing);
      return;
    }

    const cred = await provisionRimiCustomerLogin({
      id: cust.rawId || cust.id,
      email: cust.email,
      name: cust.name,
      business_name: cust.name,
      contact_person: cust.contact
    });
    setActiveCredential(cred);
    showToastMsg(`Provisioned cold chain customer credentials for ${cust.name}`);
    loadData();
  };

  const handleOpenDossier = async (cust: any) => {
    setSelectedCust(cust);
    try {
      const [orders, payments] = await Promise.all([
        getRimiSalesOrders(),
        getRimiPayments()
      ]);
      setCustOrders(orders.filter((o: any) => o.distributor_name?.includes(cust.name) || o.distributor?.business_name?.includes(cust.name)));
      setCustPayments(payments.filter((p: any) => p.distributor_name?.includes(cust.name) || p.distributor?.business_name?.includes(cust.name)));
    } catch {
      setCustOrders([]);
      setCustPayments([]);
    }
  };

  const copyCredentials = () => {
    if (!activeCredential) return;
    const text = `FEREX RIMI FROZEN FOODS CUSTOMER ACCESS\nPortal: Cold Chain B2B Customer Console\nEmail: ${activeCredential.email}\nTemporary Password: ${activeCredential.tempPassword}\nRole: ${activeCredential.role}\nNote: Mandatory password reset required on first sign-in.`;
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    showToastMsg('Customer credentials copied to clipboard!');
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
            Rimi Cold Chain Console • Managing regional distributors, supermarket retail chains, wholesalers, customer portal credential provisioning, and mapped routes.
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
                  <div className="flex items-center gap-1.5">
                    {c.hasCredentials && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                        <KeyRound className="w-2.5 h-2.5" /> Portal Active
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-emerald-50 text-emerald-700 border-emerald-200">{c.type}</span>
                  </div>
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

              <div className="space-y-2.5 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">{c.volume}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditingCust(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Edit Customer">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteCust(c.id, c.rawId)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete Customer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[11px] font-bold h-8 border-slate-200 hover:border-slate-300"
                    onClick={() => handleOpenDossier(c)}
                  >
                    <Eye className="w-3 h-3 mr-1 text-[#6A1B2E]" /> Dossier & Orders
                  </Button>
                  <Button
                    size="sm"
                    className="text-[11px] font-bold h-8 bg-[#6A1B2E] hover:bg-[#521221]"
                    onClick={() => handleProvisionCredentials(c)}
                  >
                    <KeyRound className="w-3 h-3 mr-1 text-amber-300" />
                    {c.hasCredentials ? 'View Login' : 'Provision Login'}
                  </Button>
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
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save & Provision</Button>
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

      {/* Credentials Modal */}
      <AnimatePresence>
        {activeCredential && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={() => setActiveCredential(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center font-bold">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">B2B Customer Portal Access</h3>
                    <p className="text-[11px] font-semibold text-slate-500">{activeCredential.businessName}</p>
                  </div>
                </div>
                <button onClick={() => setActiveCredential(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs font-semibold text-amber-800 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">First-Time Password Reset Required</span>
                  Customer will be prompted to reset password immediately upon initial sign in.
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-xs font-semibold">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">Portal Login:</span>
                  <span className="font-mono text-slate-700">/login</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">Customer Email:</span>
                  <span className="font-bold text-slate-900">{activeCredential.email}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">Temporary Password:</span>
                  <span className="font-mono font-black text-[#6A1B2E] text-sm bg-white px-2 py-0.5 rounded border border-slate-200">{activeCredential.tempPassword}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">Authorized Role:</span>
                  <span className="font-bold text-emerald-700 uppercase text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{activeCredential.role}</span>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={copyCredentials}>
                  {copiedKey ? <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  {copiedKey ? 'Copied Details' : 'Copy Access Credentials'}
                </Button>
                <Button type="button" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => setActiveCredential(null)}>Done</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Dossier Drawer */}
      <AnimatePresence>
        {selectedCust && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedCust(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-lg bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div>
                  <h3 className="text-sm font-black text-slate-900">{selectedCust.name}</h3>
                  <span className="text-[10px] font-bold text-[#6A1B2E] uppercase">B2B Account Dossier & Orders</span>
                </div>
                <button onClick={() => setSelectedCust(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-5 text-left text-xs">
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

                {/* Mapped Sales Orders */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-[#6A1B2E]" /> Cold Chain Orders ({custOrders.length})
                  </h4>
                  {custOrders.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-400 text-center font-medium">No sales orders found</div>
                  ) : (
                    <div className="space-y-2">
                      {custOrders.map((o: any) => (
                        <div key={o.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1">
                          <div className="flex justify-between font-bold text-slate-900">
                            <span>{o.order_number || o.id}</span>
                            <span className="text-[#6A1B2E]">₹{Number(o.total_amount || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span className="flex items-center gap-1"><Truck className="w-3 h-3 text-slate-400" /> Route: {o.delivery_route || 'Regional Reefer'}</span>
                            <span className="font-bold text-emerald-700">{o.order_status || 'In Transit'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mapped Collections */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-[#6A1B2E]" /> Collections & Receipts ({custPayments.length})
                  </h4>
                  {custPayments.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-400 text-center font-medium">No recorded settlements</div>
                  ) : (
                    <div className="space-y-2">
                      {custPayments.map((p: any) => (
                        <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-800 block">{p.receipt_number || p.id}</span>
                            <span className="text-[11px] text-slate-400">Method: {p.payment_method || 'NEFT'}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-emerald-700 block">₹{Number(p.amount || 0).toLocaleString('en-IN')}</span>
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">{p.status || 'Received'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
