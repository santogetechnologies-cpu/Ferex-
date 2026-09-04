import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Search, Plus, Eye, Trash2, X, CheckCircle2, KeyRound, Copy, ShieldAlert, ShoppingBag, DollarSign } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getRimiDistributors,
  createRimiDistributor,
  deleteRimiDistributor,
  provisionRimiCustomerLogin,
  getRimiCustomerCredentials,
  getRimiSalesOrders,
  getRimiPayments,
  ProvisionedRimiCredential
} from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';

export const RimiDistributors: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDist, setSelectedDist] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [distributors, setDistributors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Credentials State
  const [activeCredential, setActiveCredential] = useState<ProvisionedRimiCredential | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Mapped Data
  const [distOrders, setDistOrders] = useState<any[]>([]);
  const [distPayments, setDistPayments] = useState<any[]>([]);

  const [newDist, setNewDist] = useState({
    name: '',
    territory: 'Western Zone (Maharashtra & Gujarat)',
    contact: '',
    email: '',
    phone: '',
    credit_limit: 5000000
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRimiDistributors('Distributor');
      if (Array.isArray(data)) {
        const mapped = data.map((d: any) => ({
          id: d.id ? `DST-${d.id.slice(0, 4).toUpperCase()}` : 'DST-301',
          rawId: d.id,
          name: d.business_name,
          region: d.territory || 'Western Zone',
          contact: d.contact_person,
          email: d.email,
          phone: d.phone,
          volume: `Limit: ₹${(Number(d.credit_limit || 1000000) / 100000).toFixed(2)} Lakhs`,
          status: d.status || 'Active Regional',
          hasCredentials: !!getRimiCustomerCredentials(d.id),
        }));
        setDistributors(mapped);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_rimi_distributors_sub')
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

  const handleAddDist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDist.name) return;
    const created = await createRimiDistributor({
      business_name: newDist.name,
      tier: 'Distributor',
      territory: newDist.territory,
      contact_person: newDist.contact || 'Regional Lead',
      email: newDist.email || `contact@${newDist.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.in`,
      phone: newDist.phone || '+91 98200 11223',
      credit_limit: Number(newDist.credit_limit) || 5000000
    });
    setShowAddModal(false);
    showToastMsg(`Added regional distributor ${newDist.name}`);
    setNewDist({ name: '', territory: 'Western Zone (Maharashtra & Gujarat)', contact: '', email: '', phone: '', credit_limit: 5000000 });
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

  const handleDeleteDist = async (rawId: string) => {
    await deleteRimiDistributor(rawId);
    setDistributors(prev => prev.filter(d => d.rawId !== rawId));
    showToastMsg('Removed distributor partner record');
  };

  const handleProvisionCredentials = async (dist: any) => {
    const existing = getRimiCustomerCredentials(dist.rawId || dist.id);
    if (existing) {
      setActiveCredential(existing);
      return;
    }

    const cred = await provisionRimiCustomerLogin({
      id: dist.rawId || dist.id,
      email: dist.email,
      name: dist.name,
      business_name: dist.name,
      contact_person: dist.contact
    });
    setActiveCredential(cred);
    showToastMsg(`Provisioned distributor login credentials for ${dist.name}`);
    loadData();
  };

  const handleOpenDossier = async (dist: any) => {
    setSelectedDist(dist);
    try {
      const [orders, payments] = await Promise.all([
        getRimiSalesOrders(),
        getRimiPayments()
      ]);
      setDistOrders(orders.filter((o: any) => o.distributor_name?.includes(dist.name) || o.distributor?.business_name?.includes(dist.name)));
      setDistPayments(payments.filter((p: any) => p.distributor_name?.includes(dist.name) || p.distributor?.business_name?.includes(dist.name)));
    } catch {
      setDistOrders([]);
      setDistPayments([]);
    }
  };

  const copyCredentials = () => {
    if (!activeCredential) return;
    const text = `FEREX RIMI FROZEN FOODS DISTRIBUTOR ACCESS\nPortal: Regional Distributor Console\nEmail: ${activeCredential.email}\nTemporary Password: ${activeCredential.tempPassword}\nRole: ${activeCredential.role}\nNote: Mandatory password reset required on first sign-in.`;
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    showToastMsg('Distributor credentials copied to clipboard!');
  };

  const filteredDist = distributors.filter(d =>
    (d.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.region || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.contact || '').toLowerCase().includes(searchQuery.toLowerCase())
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
            <Building2 className="w-5 h-5 text-[#6A1B2E]" /> Regional FMCG Distributors Directory
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Rimi Cold Chain Console • Master distributor territories, multi-ton allocations, and portal credentials.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Regional Distributor
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search distributor or territory..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredDist.length} Master Distributors</span>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading distributors directory...</div>
      ) : filteredDist.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No regional distributors found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">There are no active regional distributor accounts recorded. Add one below.</p>
          <Button size="sm" className="mt-4 bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Regional Distributor
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDist.map((d) => (
            <Card key={d.id} className="p-5 border border-slate-200/70 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase">{d.id}</span>
                  <div className="flex items-center gap-1.5">
                    {d.hasCredentials && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                        <KeyRound className="w-2.5 h-2.5" /> Portal Active
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-emerald-50 text-emerald-700 border-emerald-200">{d.status}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-snug">{d.name}</h3>
                  <p className="text-xs font-bold text-[#6A1B2E] mt-0.5">{d.region}</p>
                </div>
                <div className="space-y-1 text-xs text-slate-500 pt-1">
                  <div>Contact: <strong className="text-slate-800">{d.contact}</strong></div>
                  <div>Email: <strong className="text-slate-800">{d.email}</strong></div>
                  <div>Phone: <strong className="text-slate-800">{d.phone}</strong></div>
                </div>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">{d.volume}</span>
                  <button onClick={() => handleDeleteDist(d.rawId)} className="p-1.5 text-slate-400 hover:text-red-600 rounded" title="Delete Distributor">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[11px] font-bold h-8 border-slate-200 hover:border-slate-300"
                    onClick={() => handleOpenDossier(d)}
                  >
                    <Eye className="w-3 h-3 mr-1 text-[#6A1B2E]" /> Dossier & Orders
                  </Button>
                  <Button
                    size="sm"
                    className="text-[11px] font-bold h-8 bg-[#6A1B2E] hover:bg-[#521221]"
                    onClick={() => handleProvisionCredentials(d)}
                  >
                    <KeyRound className="w-3 h-3 mr-1 text-amber-300" />
                    {d.hasCredentials ? 'View Login' : 'Provision Login'}
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
                <h3 className="text-sm font-black text-slate-900">Add Regional Master Distributor</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddDist} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Company / Entity Name</label>
                  <input type="text" required value={newDist.name} onChange={(e) => setNewDist({ ...newDist, name: e.target.value })} placeholder="e.g. Apex Cold Logistics LLP" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Territory / Region</label>
                  <input type="text" required value={newDist.territory} onChange={(e) => setNewDist({ ...newDist, territory: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Contact Person</label>
                    <input type="text" required value={newDist.contact} onChange={(e) => setNewDist({ ...newDist, contact: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Phone Number</label>
                    <input type="text" value={newDist.phone} onChange={(e) => setNewDist({ ...newDist, phone: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Email Address</label>
                  <input type="email" required value={newDist.email} onChange={(e) => setNewDist({ ...newDist, email: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
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
                    <h3 className="text-sm font-black text-slate-900">Distributor Portal Access</h3>
                    <p className="text-[11px] font-semibold text-slate-500">{activeCredential.businessName}</p>
                  </div>
                </div>
                <button onClick={() => setActiveCredential(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs font-semibold text-amber-800 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">First-Time Password Reset Required</span>
                  Distributor will be prompted to choose a permanent password on first sign-in.
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-xs font-semibold">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">Portal Login:</span>
                  <span className="font-mono text-slate-700">/login</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">Email:</span>
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
        {selectedDist && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedDist(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-lg bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div>
                  <h3 className="text-sm font-black text-slate-900">{selectedDist.name}</h3>
                  <span className="text-[10px] font-bold text-[#6A1B2E] uppercase">Regional Distributor Dossier</span>
                </div>
                <button onClick={() => setSelectedDist(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-5 text-left text-xs">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{selectedDist.id}</span>
                  <h4 className="text-base font-black text-slate-900">{selectedDist.name}</h4>
                  <p className="text-xs font-semibold text-slate-500">{selectedDist.region}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-xs font-semibold text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Regional Contact:</span>
                    <span className="font-bold text-slate-900">{selectedDist.contact}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email:</span>
                    <span className="font-bold text-slate-900">{selectedDist.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Phone:</span>
                    <span className="font-bold text-slate-900">{selectedDist.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Credit Facility:</span>
                    <span className="font-bold text-slate-900">{selectedDist.volume}</span>
                  </div>
                </div>

                {/* Sales Orders */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-[#6A1B2E]" /> Active Bulk Orders ({distOrders.length})
                  </h4>
                  {distOrders.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-400 text-center font-medium">No sales orders found</div>
                  ) : (
                    <div className="space-y-2">
                      {distOrders.map((o: any) => (
                        <div key={o.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1">
                          <div className="flex justify-between font-bold text-slate-900">
                            <span>{o.order_number || o.id}</span>
                            <span className="text-[#6A1B2E]">₹{Number(o.total_amount || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>Delivery Due: {o.delivery_date || 'Standard Dispatch'}</span>
                            <span className="font-bold text-emerald-700">{o.order_status || 'Received'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Collections */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-[#6A1B2E]" /> Collections & Settlement Slips ({distPayments.length})
                  </h4>
                  {distPayments.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-400 text-center font-medium">No recorded settlements</div>
                  ) : (
                    <div className="space-y-2">
                      {distPayments.map((p: any) => (
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

                <Button size="sm" className="w-full text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => setSelectedDist(null)}>
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
