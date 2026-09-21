import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Search, Plus, Eye, Edit3, Trash2, X, CheckCircle2,
  Mail, Phone, ShieldAlert, Ship, FileCheck, DollarSign, Globe,
  FolderArchive, PackageCheck, PlusCircle
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getTradeCRMContacts,
  createTradeCRMContact,
  updateTradeCRMContact,
  deleteTradeCRMContact,
  getTradeOrders,
  getTradeDocuments,
  getTradePayments,
  TRADE_MASTER_PARTNER_CATEGORIES,
  type TradeClientPartner,
  type TradeOrder,
  type TradeDocument,
  type TradePaymentRecord
} from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';

export const TradeCRM: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [companies, setCompanies] = useState<any[]>([]);
  const [orders, setOrders] = useState<TradeOrder[]>([]);
  const [documents, setDocuments] = useState<TradeDocument[]>([]);
  const [payments, setPayments] = useState<TradePaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [partnersData, ordersData, docsData, paymentsData] = await Promise.all([
        getTradeCRMContacts(),
        getTradeOrders(),
        getTradeDocuments(),
        getTradePayments(),
      ]);

      setOrders(ordersData || []);
      setDocuments(docsData || []);
      setPayments(paymentsData || []);

      if (Array.isArray(partnersData)) {
        const formatted = partnersData.map((d: any) => {
          const partnerOrders = (ordersData || []).filter(
            o => o.client_name?.toLowerCase() === (d.company_name || d.name || '').toLowerCase()
          );
          const totalVal = partnerOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

          return {
            id: d.id || 'CRM-1001',
            rawId: d.id,
            name: d.company_name || d.name,
            country: d.country || 'Poland',
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
            activeOrdersCount: partnerOrders.length,
            totalTradeVolume: totalVal,
          };
        });
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
    window.addEventListener('ferex_trade_clients_change', handleLocalChange);
    window.addEventListener('ferex_trade_orders_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_crm_change', handleLocalChange);
      window.removeEventListener('ferex_trade_clients_change', handleLocalChange);
      window.removeEventListener('ferex_trade_orders_change', handleLocalChange);
    };
  }, [loadData]);

  const initialCompany = {
    name: '',
    country: 'Poland',
    city: 'Gdansk',
    contact: '',
    email: '',
    phone: '',
    vat_number: '',
    category: 'Buyer / Importer',
    payment_terms: '30% Advance Wire, 70% Balance against Shipping B/L copy',
    credit_limit: '1000000',
  };

  const [newCompany, setNewCompany] = useState(initialCompany);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.name.trim() || !newCompany.email.trim()) {
      showToastMsg('Please enter company name and primary email.');
      return;
    }
    try {
      const created = await createTradeCRMContact({
        company_name: newCompany.name.trim(),
        country: newCompany.country || 'Poland',
        city: newCompany.city || 'Gdansk',
        contact_person: newCompany.contact.trim() || 'Procurement Lead',
        email: newCompany.email.trim(),
        phone: newCompany.phone.trim(),
        vat_number: newCompany.vat_number.trim(),
        category: newCompany.category as any,
        payment_terms: newCompany.payment_terms,
        credit_limit: Number(newCompany.credit_limit) || 1000000,
        portal_active: true,
      });

      setNewCompany(initialCompany);
      setShowAddModal(false);
      showToastMsg(`Registered Trade Partner: ${created?.company_name || newCompany.name}`);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Failed to register partner: ${err.message || 'Error'}`);
    }
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

  const handleCreateOrderForPartner = (partnerName: string) => {
    navigate(`/trade/shipments?create=true&client=${encodeURIComponent(partnerName)}`);
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

  // Partner specific dossier data
  const getPartnerDossier = (companyName: string) => {
    const pOrders = orders.filter(o => o.client_name?.toLowerCase() === companyName.toLowerCase());
    const pDocs = documents.filter(d => d.client_name?.toLowerCase() === companyName.toLowerCase());
    const pPayments = payments.filter(p => p.client_name?.toLowerCase() === companyName.toLowerCase());
    return { orders: pOrders, docs: pDocs, payments: pPayments };
  };

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
            Centralized registry of buyers, importers, suppliers, freight forwarders, and trade finance banks.
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 border border-slate-200/80 bg-white">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Partners</div>
          <div className="text-xl font-black text-slate-900 mt-0.5">{companies.length}</div>
        </Card>
        <Card className="p-3 border border-slate-200/80 bg-white">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Buyers / Importers</div>
          <div className="text-xl font-black text-[#58051E] mt-0.5">
            {companies.filter(c => c.category?.includes('Buyer')).length}
          </div>
        </Card>
        <Card className="p-3 border border-slate-200/80 bg-white">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Exporters / Suppliers</div>
          <div className="text-xl font-black text-blue-600 mt-0.5">
            {companies.filter(c => c.category?.includes('Seller') || c.category?.includes('Exporter')).length}
          </div>
        </Card>
        <Card className="p-3 border border-slate-200/80 bg-white">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Logistics & Banks</div>
          <div className="text-xl font-black text-emerald-600 mt-0.5">
            {companies.filter(c => c.category?.includes('Logistics') || c.category?.includes('Bank')).length}
          </div>
        </Card>
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
                  <div className="truncate"><span className="text-slate-400">Phone:</span> {c.phone}</div>
                  <div className="truncate"><span className="text-slate-400">VAT/Tax:</span> {c.vat_number}</div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                    <span className="text-slate-500 font-bold">Active Orders:</span>
                    <span className="font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {c.activeOrdersCount} {c.activeOrdersCount === 1 ? 'Order' : 'Orders'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCreateOrderForPartner(c.name)}
                    className="px-2.5 py-1 bg-[#58051E] hover:bg-[#430316] text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    title="Log New Order for this Partner"
                  >
                    <PlusCircle className="w-3 h-3" /> New Order
                  </button>
                  <button
                    onClick={() => setSelectedCompany(c)}
                    className="font-extrabold text-slate-700 hover:text-[#58051E] flex items-center gap-1 cursor-pointer text-[11px]"
                  >
                    <Eye className="w-3 h-3" /> Dossier
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingCompany({ ...c })}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                    title="Edit Partner"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCompany(c.id, c.rawId)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                    title="Delete Partner"
                  >
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
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={newCompany.contact}
                      onChange={(e) => setNewCompany({ ...newCompany, contact: e.target.value })}
                      placeholder="e.g. Marek Wojcik"
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
                      placeholder="e.g. trade@balticgrain.pl"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Phone / WhatsApp</label>
                    <input
                      type="text"
                      value={newCompany.phone}
                      onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                      placeholder="e.g. +48 58 660 4100"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Standard Payment Terms</label>
                    <input
                      type="text"
                      value={newCompany.payment_terms}
                      onChange={(e) => setNewCompany({ ...newCompany, payment_terms: e.target.value })}
                      placeholder="e.g. 30% Advance, 70% against B/L"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
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
                <h3 className="text-sm font-black text-slate-900">Edit Trade Partner — {editingCompany.name}</h3>
                <button onClick={() => setEditingCompany(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleUpdateCompany} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Company / Entity Legal Name *</label>
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
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Partner Category</label>
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
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">VAT / Tax ID</label>
                    <input
                      type="text"
                      value={editingCompany.vat_number}
                      onChange={(e) => setEditingCompany({ ...editingCompany, vat_number: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Country</label>
                    <input
                      type="text"
                      value={editingCompany.country}
                      onChange={(e) => setEditingCompany({ ...editingCompany, country: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">City / Base Port</label>
                    <input
                      type="text"
                      value={editingCompany.city}
                      onChange={(e) => setEditingCompany({ ...editingCompany, city: e.target.value })}
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
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Official Email *</label>
                    <input
                      type="email"
                      required
                      value={editingCompany.email}
                      onChange={(e) => setEditingCompany({ ...editingCompany, email: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Phone / WhatsApp</label>
                    <input
                      type="text"
                      value={editingCompany.phone}
                      onChange={(e) => setEditingCompany({ ...editingCompany, phone: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Payment Terms</label>
                    <input
                      type="text"
                      value={editingCompany.paymentTerms}
                      onChange={(e) => setEditingCompany({ ...editingCompany, paymentTerms: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingCompany(null)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] text-white">Save Changes</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Partner Dossier Modal */}
      <AnimatePresence>
        {selectedCompany && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={() => setSelectedCompany(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400">{selectedCompany.id}</span>
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
              {(() => {
                const dossier = getPartnerDossier(selectedCompany.name);
                return (
                  <div className="py-4 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Active Orders</span>
                        <span className="text-base font-black text-slate-900">{dossier.orders.length}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Attached Documents</span>
                        <span className="text-base font-black text-slate-900">{dossier.docs.length}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Settlements</span>
                        <span className="text-base font-black text-slate-900">{dossier.payments.length}</span>
                      </div>
                    </div>

                    {/* Connected Orders */}
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-700 mb-2 flex items-center gap-1.5">
                        <Ship className="w-3.5 h-3.5 text-[#58051E]" /> Active Trade Orders
                      </h4>
                      {dossier.orders.length === 0 ? (
                        <p className="text-xs text-slate-400 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">No active orders linked to this entity.</p>
                      ) : (
                        <div className="space-y-2">
                          {dossier.orders.map(o => (
                            <div key={o.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                              <div>
                                <span className="font-black text-slate-900">{o.order_no}</span>
                                <span className="text-slate-500 font-semibold ml-2">({o.commodity})</span>
                                <div className="text-[11px] text-slate-400">{o.origin_port} ➔ {o.destination_port}</div>
                              </div>
                              <div className="text-right">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">{o.stage}</span>
                                <div className="text-[11px] font-black text-slate-800 mt-1">{o.currency} {o.total_amount.toLocaleString()}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Connected Documents */}
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-700 mb-2 flex items-center gap-1.5">
                        <FolderArchive className="w-3.5 h-3.5 text-[#58051E]" /> Trade Compliance Documents
                      </h4>
                      {dossier.docs.length === 0 ? (
                        <p className="text-xs text-slate-400 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">No compliance documents attached for this partner.</p>
                      ) : (
                        <div className="space-y-2">
                          {dossier.docs.map(d => (
                            <div key={d.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                              <div>
                                <span className="font-black text-slate-900">{d.doc_type}</span>
                                <span className="text-slate-500 font-semibold ml-2">({d.file_name})</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                d.status === 'Verified' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                d.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>{d.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                <Button
                  size="sm"
                  className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold"
                  onClick={() => {
                    const name = selectedCompany.name;
                    setSelectedCompany(null);
                    handleCreateOrderForPartner(name);
                  }}
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1" /> Log Order for {selectedCompany.name}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedCompany(null)}>Close Dossier</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TradeCRM;
