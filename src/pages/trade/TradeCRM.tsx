import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Search, Plus, Eye, Edit3, Trash2, X, CheckCircle2,
  Mail, Phone, KeyRound, Copy, ShieldAlert, Ship, FileCheck,
  DollarSign, Globe, FolderArchive, PackageCheck, Award, CreditCard
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getTradeCRMContacts,
  createTradeCRMContact,
  updateTradeCRMContact,
  deleteTradeCRMContact,
  provisionTradeClientLogin,
  getTradeClientCredentials,
  getTradeDossier,
  TRADE_MASTER_PARTNER_CATEGORIES,
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
  const [dossierData, setDossierData] = useState<{
    shipments: any[];
    invoices: any[];
    packingLists: any[];
    billsOfLading: any[];
    certificates: any[];
    lettersOfCredit: any[];
    payments: any[];
    documents: any[];
  }>({
    shipments: [],
    invoices: [],
    packingLists: [],
    billsOfLading: [],
    certificates: [],
    lettersOfCredit: [],
    payments: [],
    documents: [],
  });
  const [dossierLoading, setDossierLoading] = useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTradeCRMContacts();
      if (Array.isArray(data)) {
        const formatted = data.map((d: any) => ({
          id: d.id || 'CRM-1001',
          rawId: d.id,
          name: d.company_name || d.name,
          country: d.country || 'Global',
          city: d.city || 'Central Hub',
          contact: d.contact_person || d.contact || 'Operations Desk',
          email: d.email || 'partner@trade.ferex.com',
          phone: d.phone || '+48 22 890 1234',
          vat_number: d.vat_number || 'PL0000000000',
          category: d.category || 'Buyer / Importer',
          paymentTerms: d.payment_terms || 'Letter of Credit at Sight',
          creditLimit: d.credit_limit || 10000000,
          status: d.status || 'Active',
          statusBadge: (d.status === 'Active' || !d.status) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200',
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

  // Load Dossier when a company is selected
  useEffect(() => {
    if (!selectedCompany) return;
    const fetchDossier = async () => {
      setDossierLoading(true);
      try {
        const res = await getTradeDossier('partner', selectedCompany.name || selectedCompany.id);
        setDossierData({
          shipments: res.shipments || [],
          invoices: res.invoices || [],
          packingLists: res.packingLists || [],
          billsOfLading: res.billsOfLading || [],
          certificates: res.certificates || [],
          lettersOfCredit: res.lettersOfCredit || [],
          payments: res.payments || [],
          documents: res.documents || [],
        });
      } finally {
        setDossierLoading(false);
      }
    };
    fetchDossier();
  }, [selectedCompany]);

  const initialCompany = {
    name: '',
    country: 'Poland',
    city: 'Gdansk',
    contact: '',
    email: '',
    phone: '',
    vat_number: '',
    category: 'Buyer / Importer',
    payment_terms: 'Letter of Credit at Sight',
    credit_limit: '10000000',
  };

  const [newCompany, setNewCompany] = useState(initialCompany);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.name || !newCompany.email) return;
    const created = await createTradeCRMContact({
      company_name: newCompany.name,
      country: newCompany.country,
      city: newCompany.city,
      contact_person: newCompany.contact,
      email: newCompany.email,
      phone: newCompany.phone,
      vat_number: newCompany.vat_number,
      category: newCompany.category,
      payment_terms: newCompany.payment_terms,
      credit_limit: Number(newCompany.credit_limit) || 10000000,
    });

    setNewCompany(initialCompany);
    setShowAddModal(false);
    showToastMsg(`Registered Trade Partner: ${created.company_name}`);
    await loadData();
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    await updateTradeCRMContact(editingCompany.rawId || editingCompany.id, {
      company_name: editingCompany.name,
      country: editingCompany.country,
      city: editingCompany.city,
      contact_person: editingCompany.contact,
      email: editingCompany.email,
      phone: editingCompany.phone,
      vat_number: editingCompany.vat_number,
      category: editingCompany.category,
      payment_terms: editingCompany.paymentTerms || editingCompany.payment_terms,
    });
    setEditingCompany(null);
    showToastMsg(`Updated Partner: ${editingCompany.name}`);
    await loadData();
  };

  const handleDeleteCompany = async (id: string, rawId?: string) => {
    if (!window.confirm('Are you sure you want to delete this trade partner?')) return;
    setCompanies(prev => prev.filter(c => c.id !== id && c.rawId !== rawId));
    showToastMsg('Trade partner record removed.');
    await deleteTradeCRMContact(rawId || id);
    await loadData();
  };

  const handleProvisionCredentials = async (company: any) => {
    try {
      const cred = await provisionTradeClientLogin({
        id: company.rawId || company.id,
        email: company.email,
        company_name: company.name,
        contact_person: company.contact,
      });
      setActiveCredential(cred);
      setCopiedKey(false);
      showToastMsg(`Generated login key for ${company.name}`);
      await loadData();
    } catch {
      showToastMsg('Failed to provision client portal key');
    }
  };

  const copyToClipboard = () => {
    if (!activeCredential) return;
    const text = `FEREX GLOBAL TRADE PARTNER ACCESS\nPortal: Global Trade Client Console (/trade/client-portal)\nEmail: ${activeCredential.email}\nTemporary Password: ${activeCredential.tempPassword}\nRole: Trade Partner (${activeCredential.companyName})\nStatus: Active`;
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 3000);
  };

  const filteredCompanies = companies.filter((c) => {
    const matchesSearch =
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contact?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.country?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'All' || c.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 text-xs font-bold"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#58051E]" />
            Trade CRM & Partner Entities
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Centralized registry of buyers, exporters, ocean freight forwarders, banks, and customs agents.
          </p>
        </div>
        <Button
          size="sm"
          className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-xs cursor-pointer"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Trade Partner
        </Button>
      </div>

      {/* Search & Category Filter */}
      <Card className="p-3 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by company, contact, country or email..."
              className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0">Category:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
            >
              <option value="All">All Categories ({companies.length})</option>
              {TRADE_MASTER_PARTNER_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat} ({companies.filter(c => c.category === cat).length})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Partners Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400">Loading Trade CRM records...</div>
      ) : filteredCompanies.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No trade partners found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery ? 'No partners match your search query.' : 'Register international buyers, suppliers, ocean carriers, and customs agents.'}
          </p>
          <Button
            size="sm"
            className="mt-4 bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold cursor-pointer"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Trade Partner
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompanies.map((c) => (
            <Card key={c.id} className="p-4 border border-slate-200/80 shadow-xs hover:border-[#58051E]/30 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[9px] font-black uppercase tracking-wider text-[#58051E] bg-[#58051E]/10 px-2 py-0.5 rounded">
                      {c.id}
                    </span>
                    <h3 className="text-sm font-black text-slate-900 mt-1 truncate" title={c.name}>
                      {c.name}
                    </h3>
                    <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <Globe className="w-3 h-3 text-slate-400" /> {c.city}, {c.country}
                    </p>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${c.statusBadge}`}>
                    {c.category?.split('/')[0] || c.category}
                  </span>
                </div>

                <div className="text-xs space-y-1.5 font-semibold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="truncate"><span className="text-slate-400">Contact:</span> {c.contact}</div>
                  <div className="truncate"><span className="text-slate-400">Email:</span> {c.email}</div>
                  <div className="truncate"><span className="text-slate-400">VAT/Tax:</span> {c.vat_number}</div>
                  <div><span className="text-slate-400">Terms:</span> {c.paymentTerms}</div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-1 text-xs">
                <button onClick={() => setSelectedCompany(c)} className="font-extrabold text-[#58051E] hover:underline flex items-center gap-1 cursor-pointer">
                  <Eye className="w-3.5 h-3.5" /> Full Dossier
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleProvisionCredentials(c)}
                    className="p-1 text-slate-400 hover:text-[#58051E] rounded cursor-pointer"
                    title="Generate / View Client Portal Login"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditingCompany({ ...c })} className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer" title="Edit Partner">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDeleteCompany(c.id, c.rawId)} className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer" title="Delete Partner">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Partner Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Register Trade Partner Entity</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddCompany} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Company / Entity Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={newCompany.name}
                    onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                    placeholder="e.g. Baltic Grain Sp. z o.o."
                    className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Partner Category</label>
                    <select
                      value={newCompany.category}
                      onChange={(e) => setNewCompany({ ...newCompany, category: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
                    >
                      {TRADE_MASTER_PARTNER_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">VAT / Tax Identification</label>
                    <input
                      type="text"
                      value={newCompany.vat_number}
                      onChange={(e) => setNewCompany({ ...newCompany, vat_number: e.target.value })}
                      placeholder="e.g. PL5830009921"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Country</label>
                    <input
                      type="text"
                      required
                      value={newCompany.country}
                      onChange={(e) => setNewCompany({ ...newCompany, country: e.target.value })}
                      placeholder="e.g. Poland, Germany, UAE"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">City / Base Port</label>
                    <input
                      type="text"
                      value={newCompany.city}
                      onChange={(e) => setNewCompany({ ...newCompany, city: e.target.value })}
                      placeholder="e.g. Gdansk, Hamburg"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Contact Representative</label>
                    <input
                      type="text"
                      required
                      value={newCompany.contact}
                      onChange={(e) => setNewCompany({ ...newCompany, contact: e.target.value })}
                      placeholder="e.g. Janusz Kowalski"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Official Email *</label>
                    <input
                      type="email"
                      required
                      value={newCompany.email}
                      onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                      placeholder="j.kowalski@company.com"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Telephone / Direct Line</label>
                    <input
                      type="text"
                      value={newCompany.phone}
                      onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                      placeholder="+48 58 661 9020"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Standard Payment Terms</label>
                    <input
                      type="text"
                      value={newCompany.payment_terms}
                      onChange={(e) => setNewCompany({ ...newCompany, payment_terms: e.target.value })}
                      placeholder="e.g. Letter of Credit at Sight"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] text-white">Save Partner Entity</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Partner Modal */}
      <AnimatePresence>
        {editingCompany && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setEditingCompany(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Edit Trade Partner: {editingCompany.name}</h3>
                <button onClick={() => setEditingCompany(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleUpdateCompany} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Company Entity Name</label>
                  <input
                    type="text"
                    required
                    value={editingCompany.name}
                    onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                    className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Category</label>
                    <select
                      value={editingCompany.category}
                      onChange={(e) => setEditingCompany({ ...editingCompany, category: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
                    >
                      {TRADE_MASTER_PARTNER_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">VAT Number</label>
                    <input
                      type="text"
                      value={editingCompany.vat_number || ''}
                      onChange={(e) => setEditingCompany({ ...editingCompany, vat_number: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={editingCompany.contact}
                      onChange={(e) => setEditingCompany({ ...editingCompany, contact: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editingCompany.email}
                      onChange={(e) => setEditingCompany({ ...editingCompany, email: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingCompany(null)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] text-white">Update Partner</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Partner Full Dossier Modal */}
      <AnimatePresence>
        {selectedCompany && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={() => setSelectedCompany(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto text-left">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-[#58051E] bg-[#58051E]/10 px-2 py-0.5 rounded">
                      {selectedCompany.id}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {selectedCompany.category}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900 mt-1">{selectedCompany.name}</h2>
                  <p className="text-xs text-slate-500">{selectedCompany.city}, {selectedCompany.country} • VAT: {selectedCompany.vat_number}</p>
                </div>
                <button onClick={() => setSelectedCompany(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              {/* Dossier Tabs / Content */}
              <div className="py-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Shipments</span>
                    <span className="text-base font-black text-slate-900">{dossierData.shipments.length}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Invoices</span>
                    <span className="text-base font-black text-slate-900">{dossierData.invoices.length}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Letters of Credit</span>
                    <span className="text-base font-black text-slate-900">{dossierData.lettersOfCredit.length}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Settlements</span>
                    <span className="text-base font-black text-slate-900">{dossierData.payments.length}</span>
                  </div>
                </div>

                {/* Connected Shipments */}
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-700 mb-2 flex items-center gap-1.5">
                    <Ship className="w-3.5 h-3.5 text-[#58051E]" /> Connected Ocean Shipments
                  </h4>
                  {dossierData.shipments.length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">No active shipments linked to this entity.</p>
                  ) : (
                    <div className="space-y-2">
                      {dossierData.shipments.map(s => (
                        <div key={s.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-black text-slate-900">{s.shipment_no || s.id}</span>
                            <span className="text-slate-500 font-semibold ml-2">({s.cargo_description})</span>
                            <div className="text-[11px] text-slate-400">{s.origin_port} ➔ {s.destination_port}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">{s.status || s.shipment_status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Connected Invoices */}
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-700 mb-2 flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-[#58051E]" /> Commercial Invoices & Receivables
                  </h4>
                  {dossierData.invoices.length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">No commercial invoices generated for this partner.</p>
                  ) : (
                    <div className="space-y-2">
                      {dossierData.invoices.map(i => (
                        <div key={i.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-black text-slate-900">{i.invoice_no || i.id}</span>
                            <span className="text-slate-500 font-semibold ml-2">Due: {i.due_date}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900">₹{Number(i.amount).toLocaleString('en-IN')}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${i.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{i.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                <button
                  onClick={() => handleProvisionCredentials(selectedCompany)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#58051E]" /> Client Portal Credentials
                </button>
                <Button size="sm" variant="outline" onClick={() => setSelectedCompany(null)}>Close Dossier</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Credential Key Modal */}
      <AnimatePresence>
        {activeCredential && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={() => setActiveCredential(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">Partner Client Portal Key</h3>
                </div>
                <button onClick={() => setActiveCredential(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-slate-500 font-medium leading-relaxed">
                  Share these credentials with <strong>{activeCredential.companyName}</strong> to allow them to access their dedicated Trade Client Portal (<code className="bg-slate-100 px-1 py-0.5 rounded">/trade/client-portal</code>).
                </p>

                <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2 font-mono text-[11px]">
                  <div><span className="text-slate-400">Portal:</span> /trade/client-portal</div>
                  <div><span className="text-slate-400">Login Email:</span> <span className="text-amber-300 font-bold">{activeCredential.email}</span></div>
                  <div><span className="text-slate-400">Temporary Key:</span> <span className="text-emerald-400 font-bold">{activeCredential.tempPassword}</span></div>
                  <div><span className="text-slate-400">Entity:</span> {activeCredential.companyName}</div>
                </div>

                <Button
                  onClick={copyToClipboard}
                  size="sm"
                  className="w-full bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedKey ? 'Copied to Clipboard!' : 'Copy Partner Access Credentials'}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};
