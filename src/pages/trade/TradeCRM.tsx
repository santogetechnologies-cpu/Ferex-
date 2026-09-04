import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Search, Plus, Eye, Edit3, Trash2, X, CheckCircle2, Mail, Phone, KeyRound, Copy, ShieldAlert, Ship, FileCheck, DollarSign } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getTradeCRMContacts,
  createTradeCRMContact,
  updateTradeCRMContact,
  deleteTradeCRMContact,
  provisionTradeClientLogin,
  getTradeClientCredentials,
  getTradeShipments,
  getTradeLettersOfCredit,
  getTradeInvoices,
  type ProvisionedTradeCredential
} from '../../lib/api/trade';
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

  // Credentials State
  const [activeCredential, setActiveCredential] = useState<ProvisionedTradeCredential | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Mapped Partner Entities in Dossier
  const [partnerShipments, setPartnerShipments] = useState<any[]>([]);
  const [partnerLCs, setPartnerLCs] = useState<any[]>([]);
  const [partnerInvoices, setPartnerInvoices] = useState<any[]>([]);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTradeCRMContacts();
      if (Array.isArray(data)) {
        const formatted = data.map((d: any) => ({
          id: d.id ? `CRM-${d.id.slice(0, 4).toUpperCase()}` : 'CRM-101',
          rawId: d.id,
          name: d.company_name,
          country: d.country,
          flag: d.country?.includes('Poland') ? '🇵🇱' : d.country?.includes('Germany') ? '🇩🇪' : d.country?.includes('Netherlands') ? '🇳🇱' : d.country?.includes('Norway') ? '🇳🇴' : '🌐',
          contact: d.contact_person,
          email: d.email,
          phone: d.phone || '+48 22 890 1234',
          category: d.category || 'Buyer',
          paymentTerms: d.payment_terms || 'LC 60 Days',
          status: d.status || 'Active',
          statusBadge: d.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200',
          hasCredentials: !!getTradeClientCredentials(d.id),
        }));
        setCompanies(formatted);
      } else {
        setCompanies([]);
      }
    } finally {
      setLoading(false);
    }
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
    contact: '',
    email: '',
    phone: '',
    category: 'Logistics Partner',
    payment_terms: 'LC 60 Days'
  });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.name) return;
    const created = await createTradeCRMContact({
      company_name: newCompany.name,
      country: newCompany.country,
      contact_person: newCompany.contact,
      email: newCompany.email,
      phone: newCompany.phone,
      category: newCompany.category,
      payment_terms: newCompany.payment_terms
    });
    setShowAddModal(false);
    showToastMsg(`Added partner company ${newCompany.name}`);
    setNewCompany({ name: '', country: 'Poland', contact: '', email: '', phone: '', category: 'Logistics Partner', payment_terms: 'LC 60 Days' });
    await loadData();

    if (created?.id && created?.email) {
      handleProvisionCredentials({
        rawId: created.id,
        name: created.company_name,
        email: created.email,
        contact: created.contact_person
      });
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    await updateTradeCRMContact(editingCompany.rawId, {
      company_name: editingCompany.name,
      country: editingCompany.country,
      contact_person: editingCompany.contact,
      email: editingCompany.email,
      phone: editingCompany.phone,
      category: editingCompany.category,
      payment_terms: editingCompany.paymentTerms,
      status: editingCompany.status
    });
    setEditingCompany(null);
    showToastMsg('Partner company updated in database successfully!');
    await loadData();
  };

  const handleDeleteCompany = async (id: string, rawId?: string) => {
    await deleteTradeCRMContact(rawId || id);
    setCompanies(prev => prev.filter(c => c.id !== id && c.rawId !== rawId));
    showToastMsg(`Removed partner record ${id}`);
  };

  const handleProvisionCredentials = async (company: any) => {
    const existing = getTradeClientCredentials(company.rawId || company.id);
    if (existing) {
      setActiveCredential(existing);
      return;
    }

    const cred = await provisionTradeClientLogin({
      id: company.rawId || company.id,
      email: company.email,
      company_name: company.name,
      contact_person: company.contact
    });
    setActiveCredential(cred);
    showToastMsg(`Provisioned Global Trade portal login for ${company.name}`);
    loadData();
  };

  const handleOpenDossier = async (company: any) => {
    setSelectedCompany(company);
    try {
      const [shipments, lcs, invoices] = await Promise.all([
        getTradeShipments(),
        getTradeLettersOfCredit(),
        getTradeInvoices()
      ]);
      setPartnerShipments(shipments.filter((s: any) => s.importer_entity?.includes(company.name) || s.exporter_entity?.includes(company.name)));
      setPartnerLCs(lcs.filter((l: any) => l.applicant?.includes(company.name) || l.beneficiary?.includes(company.name)));
      setPartnerInvoices(invoices.filter((i: any) => i.buyer_entity?.includes(company.name) || i.seller_entity?.includes(company.name)));
    } catch {
      setPartnerShipments([]);
      setPartnerLCs([]);
      setPartnerInvoices([]);
    }
  };

  const copyCredentials = () => {
    if (!activeCredential) return;
    const text = `FEREX GLOBAL TRADE PARTNER ACCESS\nPortal: Global Trade & Maritime Console\nEmail: ${activeCredential.email}\nTemporary Password: ${activeCredential.tempPassword}\nRole: ${activeCredential.role}\nNote: Mandatory password reset required on first sign-in.`;
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    showToastMsg('Trade partner credentials copied to clipboard!');
  };

  const filteredCompanies = companies.filter(c => {
    const matchesSearch =
      (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.contact || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(searchQuery.toLowerCase());
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
            Ferex Trade Console • Managing international buyers, suppliers, maritime agents, portal credential provisioning, and mapped shipments.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Partner Company
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search company, person, or email..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['All', 'Buyer', 'Logistics Partner', 'Freight Forwarder'].map((cat) => (
            <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterCategory === cat ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {cat}
            </button>
          ))}
        </div>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading partner directory...</div>
      ) : filteredCompanies.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No partner companies found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery ? 'No partners match your search criteria.' : 'Your global trade directory is empty. Add your first buyer or logistics partner below.'}
          </p>
          <Button size="sm" className="mt-4 bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Partner Company
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCompanies.map((c) => (
            <Card key={c.id} className="p-5 border border-slate-200/70 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-lg">{c.flag}</span>
                  <div className="flex items-center gap-1.5">
                    {c.hasCredentials && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                        <KeyRound className="w-2.5 h-2.5" /> Portal Active
                      </span>
                    )}
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${c.statusBadge}`}>{c.category}</span>
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
                    <span>Terms: {c.paymentTerms}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400">{c.country}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditingCompany(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Edit Partner">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteCompany(c.id, c.rawId)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete Partner">
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
                    <Eye className="w-3 h-3 mr-1 text-[#6A1B2E]" /> Dossier & Shipments
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

      {/* Add Company Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Add Trade Partner Company</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddCompany} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Company Entity Name</label>
                  <input type="text" required value={newCompany.name} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })} placeholder="e.g. Warsaw Global Logistics Sp. z o.o." className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Country</label>
                    <input type="text" required value={newCompany.country} onChange={(e) => setNewCompany({ ...newCompany, country: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Category</label>
                    <select value={newCompany.category} onChange={(e) => setNewCompany({ ...newCompany, category: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="Buyer">Buyer</option>
                      <option value="Logistics Partner">Logistics Partner</option>
                      <option value="Freight Forwarder">Freight Forwarder</option>
                      <option value="Customs Broker">Customs Broker</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Contact Person</label>
                    <input type="text" required value={newCompany.contact} onChange={(e) => setNewCompany({ ...newCompany, contact: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Phone Number</label>
                    <input type="text" value={newCompany.phone} onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Email Address</label>
                  <input type="email" required value={newCompany.email} onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
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

      {/* Edit Company Modal */}
      <AnimatePresence>
        {editingCompany && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setEditingCompany(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Edit Trade Partner Record</h3>
                <button onClick={() => setEditingCompany(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSaveEdit} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Company Entity Name</label>
                  <input type="text" required value={editingCompany.name} onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Country</label>
                    <input type="text" required value={editingCompany.country} onChange={(e) => setEditingCompany({ ...editingCompany, country: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Category</label>
                    <input type="text" value={editingCompany.category} onChange={(e) => setEditingCompany({ ...editingCompany, category: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Contact Person</label>
                  <input type="text" required value={editingCompany.contact} onChange={(e) => setEditingCompany({ ...editingCompany, contact: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Email</label>
                  <input type="email" required value={editingCompany.email} onChange={(e) => setEditingCompany({ ...editingCompany, email: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
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
                    <h3 className="text-sm font-black text-slate-900">Partner Portal Login Access</h3>
                    <p className="text-[11px] font-semibold text-slate-500">{activeCredential.companyName}</p>
                  </div>
                </div>
                <button onClick={() => setActiveCredential(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs font-semibold text-amber-800 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">First-Time Password Reset Required</span>
                  Partner user will be required to create a new password on their first session.
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-xs font-semibold">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">Portal URL:</span>
                  <span className="font-mono text-slate-700">/login</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">Account Email:</span>
                  <span className="font-bold text-slate-900">{activeCredential.email}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">Temporary Password:</span>
                  <span className="font-mono font-black text-[#6A1B2E] text-sm bg-white px-2 py-0.5 rounded border border-slate-200">{activeCredential.tempPassword}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">Assigned Portal Role:</span>
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

      {/* Partner Dossier Drawer */}
      <AnimatePresence>
        {selectedCompany && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedCompany(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-lg bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div>
                  <h3 className="text-sm font-black text-slate-900">{selectedCompany.name}</h3>
                  <span className="text-[10px] font-bold text-[#6A1B2E] uppercase">Global Trade Partner Dossier</span>
                </div>
                <button onClick={() => setSelectedCompany(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-5 text-left text-xs">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-2xl">{selectedCompany.flag}</span>
                  <h4 className="text-base font-black text-slate-900">{selectedCompany.name}</h4>
                  <p className="text-xs font-semibold text-slate-500">{selectedCompany.country} · {selectedCompany.category}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-xs font-semibold text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Primary Contact:</span>
                    <span className="font-bold text-slate-900">{selectedCompany.contact}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email:</span>
                    <span className="font-bold text-slate-900">{selectedCompany.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Phone:</span>
                    <span className="font-bold text-slate-900">{selectedCompany.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payment Terms:</span>
                    <span className="font-bold text-slate-900">{selectedCompany.paymentTerms}</span>
                  </div>
                </div>

                {/* Mapped Shipments */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Ship className="w-3.5 h-3.5 text-[#6A1B2E]" /> Associated Maritime Shipments ({partnerShipments.length})
                  </h4>
                  {partnerShipments.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-400 text-center font-medium">No active consignments mapped</div>
                  ) : (
                    <div className="space-y-2">
                      {partnerShipments.map((s: any) => (
                        <div key={s.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1">
                          <div className="flex justify-between font-bold text-slate-900">
                            <span>{s.tracking_number || s.container_id}</span>
                            <span className="text-emerald-700">{s.status || s.shipment_status}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>Route: {s.origin_port} → {s.destination_port}</span>
                            <span>Vessel: {s.vessel_name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mapped Letters of Credit */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-[#6A1B2E]" /> Letters of Credit ({partnerLCs.length})
                  </h4>
                  {partnerLCs.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-400 text-center font-medium">No open LCs found for partner</div>
                  ) : (
                    <div className="space-y-2">
                      {partnerLCs.map((l: any) => (
                        <div key={l.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-800 block">{l.lc_number}</span>
                            <span className="text-[11px] text-slate-400">Issuing Bank: {l.issuing_bank}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-slate-900 block">₹{Number(l.amount || 0).toLocaleString('en-IN')}</span>
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{l.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Invoices */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-[#6A1B2E]" /> Commercial Invoices ({partnerInvoices.length})
                  </h4>
                  {partnerInvoices.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-400 text-center font-medium">No trade invoices issued</div>
                  ) : (
                    <div className="space-y-2">
                      {partnerInvoices.map((inv: any) => (
                        <div key={inv.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-800 block">{inv.invoice_number}</span>
                            <span className="text-[11px] text-slate-400">Due: {inv.payment_due_date || 'Net 30'}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-slate-900 block">₹{Number(inv.amount || 0).toLocaleString('en-IN')}</span>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${inv.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{inv.payment_status || 'Pending'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button size="sm" className="w-full text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => setSelectedCompany(null)}>
                  Close Profile
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
