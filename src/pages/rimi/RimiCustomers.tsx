import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Plus, Edit3, Trash2, X, CheckCircle2,
  Mail, Phone, MapPin, Building2, Store, Boxes,
  DollarSign, Clock, ChevronRight, Eye, Send, FileText,
  AlertTriangle, Shield, CheckSquare, MessageSquare, ArrowUpRight
} from 'lucide-react';

import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import { useAuth } from '../../contexts/AuthContext';
import {
  getRimiCustomers,
  createRimiCustomer,
  updateRimiCustomer,
  updateRimiCustomerStage,
  deleteRimiCustomer,
  getRimiCustomerActivities,
  addRimiCustomerActivity,
  getRimiSalesOrders,
  getRimiStaffMembers,
  type RimiCustomerRecord,
  type RimiCustomerActivityRecord,
  type RimiSalesOrderRecord
} from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';

const RIMI_ADMIN_ROLES = ['rimi_admin', 'rimi_frozen', 'admin', 'education_admin', 'central', 'super_admin', 'superadmin'];

const CUSTOMER_TYPES = ['Distributor', 'Shop / Retailer', 'Wholesaler', 'HORECA Partner'] as const;
const PIPELINE_STAGES = ['Lead', 'Contacted', 'Sample Sent', 'Negotiation', 'Active Account', 'Suspended'] as const;
const TERRITORIES = ['All', 'West Zone', 'North Zone', 'South Zone', 'East Zone', 'Central Hub'];

export const RimiCustomers: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = RIMI_ADMIN_ROLES.includes(profile?.role || '');

  const [customers, setCustomers] = useState<RimiCustomerRecord[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [territoryFilter, setTerritoryFilter] = useState<string>('All');
  const [stageFilter, setStageFilter] = useState<string>('All');

  // Modals & Dossier State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<RimiCustomerRecord | null>(null);
  const [dossierCustomer, setDossierCustomer] = useState<RimiCustomerRecord | null>(null);
  const [dossierActivities, setDossierActivities] = useState<RimiCustomerActivityRecord[]>([]);
  const [dossierOrders, setDossierOrders] = useState<RimiSalesOrderRecord[]>([]);
  const [newActivityText, setNewActivityText] = useState('');
  const [newActivityType, setNewActivityType] = useState<RimiCustomerActivityRecord['activity_type']>('Call Log');
  const [toast, setToast] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    business_name: '',
    customer_type: 'Shop / Retailer' as RimiCustomerRecord['customer_type'],
    contact_person: '',
    phone: '',
    whatsapp: '',
    email: '',
    gst_no: '',
    address: '',
    city: 'Mumbai',
    district: '',
    state: 'Maharashtra',
    pincode: '',
    territory: 'West Zone',
    assigned_staff_name: profile?.full_name || 'Sales Officer',
    assigned_staff_email: profile?.email || 'sales@ferex.com',
    credit_period_days: 30,
    credit_limit: 100000,
    outstanding_amount: 0,
    payment_status: 'Current' as RimiCustomerRecord['payment_status'],
    preferred_products: [] as string[],
    pipeline_stage: 'Lead' as RimiCustomerRecord['pipeline_stage'],
    status: 'Active' as RimiCustomerRecord['status'],
    notes: ''
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const staffEmail = !isAdmin ? profile?.email : undefined;
      const [custList, staff] = await Promise.all([
        getRimiCustomers(staffEmail ? { staffEmail } : undefined),
        getRimiStaffMembers()
      ]);
      setCustomers(custList);
      setStaffList(staff || []);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, profile?.email]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_rimi_crm_customers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_customers' }, () => loadData())
      .subscribe();

    const handleSync = () => loadData();
    window.addEventListener('ferex_rimi_customers_change', handleSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_rimi_customers_change', handleSync);
    };
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.business_name.trim()) return;

    try {
      await createRimiCustomer({
        ...formData,
        created_by: profile?.full_name || 'Staff'
      });
      setShowAddModal(false);
      showToast(`Added customer "${formData.business_name}" (${formData.customer_type})`);
      setFormData({
        business_name: '',
        customer_type: 'Shop / Retailer',
        contact_person: '',
        phone: '',
        whatsapp: '',
        email: '',
        gst_no: '',
        address: '',
        city: 'Mumbai',
        district: '',
        state: 'Maharashtra',
        pincode: '',
        territory: 'West Zone',
        assigned_staff_name: profile?.full_name || 'Sales Officer',
        assigned_staff_email: profile?.email || 'sales@ferex.com',
        credit_period_days: 30,
        credit_limit: 100000,
        outstanding_amount: 0,
        payment_status: 'Current',
        preferred_products: [],
        pipeline_stage: 'Lead',
        status: 'Active',
        notes: ''
      });
      await loadData();
    } catch (err: any) {
      showToast(`Error adding customer: ${err.message || 'Database error'}`);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    try {
      await updateRimiCustomer(editingCustomer.id, editingCustomer);
      setEditingCustomer(null);
      showToast(`Updated customer "${editingCustomer.business_name}"`);
      await loadData();
    } catch (err: any) {
      showToast(`Error updating customer: ${err.message || 'Database error'}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!isAdmin) {
      showToast('Restricted: Only Cold Chain Admin can remove customer records.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete customer account "${name}"?`)) return;

    try {
      await deleteRimiCustomer(id);
      showToast(`Deleted ${name}`);
      await loadData();
    } catch (err: any) {
      showToast(`Error deleting customer: ${err.message || 'Database error'}`);
    }
  };

  const handleOpenDossier = async (customer: RimiCustomerRecord) => {
    setDossierCustomer(customer);
    try {
      const [acts, orders] = await Promise.all([
        getRimiCustomerActivities(customer.id),
        getRimiSalesOrders({ customerId: customer.id })
      ]);
      setDossierActivities(acts);
      setDossierOrders(orders);
    } catch {
      setDossierActivities([]);
      setDossierOrders([]);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dossierCustomer || !newActivityText.trim()) return;

    try {
      const created = await addRimiCustomerActivity({
        customer_id: dossierCustomer.id,
        activity_type: newActivityType,
        title: `${newActivityType}: ${newActivityText.trim()}`,
        description: `Logged by ${profile?.full_name || 'Staff'}`,
        performed_by: profile?.full_name || 'Staff',
        performed_by_email: profile?.email || ''
      });
      setDossierActivities([created, ...dossierActivities]);
      setNewActivityText('');
      showToast('Activity event added to customer timeline');
    } catch (err: any) {
      showToast(`Error logging activity: ${err.message || 'Database error'}`);
    }
  };

  const handleAdvanceStage = async (newStage: RimiCustomerRecord['pipeline_stage']) => {
    if (!dossierCustomer) return;
    try {
      const updated = await updateRimiCustomerStage(
        dossierCustomer.id,
        newStage,
        profile?.full_name || 'Staff',
        `Stage advanced to ${newStage}`
      );
      setDossierCustomer(updated);
      showToast(`Customer stage advanced to: ${newStage}`);
      const freshActs = await getRimiCustomerActivities(dossierCustomer.id);
      setDossierActivities(freshActs);
      await loadData();
    } catch (err: any) {
      showToast(`Error updating stage: ${err.message || 'Database error'}`);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchType = typeFilter === 'All' || c.customer_type === typeFilter;
    const matchTerritory = territoryFilter === 'All' || c.territory === territoryFilter;
    const matchStage = stageFilter === 'All' || c.pipeline_stage === stageFilter;
    const s = search.toLowerCase();
    const matchSearch =
      c.business_name.toLowerCase().includes(s) ||
      c.contact_person.toLowerCase().includes(s) ||
      c.city.toLowerCase().includes(s) ||
      (c.phone && c.phone.includes(s)) ||
      (c.email && c.email.toLowerCase().includes(s));
    return matchType && matchTerritory && matchStage && matchSearch;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#58051E]" /> Unified Customer CRM Directory
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Single searchable database for Distributors, Retailers, Wholesalers & HORECA Partners.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Enterprise Customer
        </Button>
      </div>

      {/* Filters Bar */}
      <Card className="p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search business, contact, city, phone..."
              className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
            />
          </div>

          {/* Customer Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
          >
            <option value="All">All Customer Types</option>
            {CUSTOMER_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Territory Filter */}
          <select
            value={territoryFilter}
            onChange={(e) => setTerritoryFilter(e.target.value)}
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
          >
            {TERRITORIES.map(t => (
              <option key={t} value={t}>{t === 'All' ? 'All Territories' : t}</option>
            ))}
          </select>

          {/* Pipeline Stage Filter */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
          >
            <option value="All">All Pipeline Stages</option>
            {PIPELINE_STAGES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between text-xs font-bold text-slate-500 pt-1 border-t border-slate-100">
          <span>Showing {filteredCustomers.length} registered customer accounts</span>
          {!isAdmin && (
            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">
              Assigned Accounts Scoped View
            </span>
          )}
        </div>
      </Card>

      {/* Customer Directory Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400">Loading customer CRM database...</div>
      ) : filteredCustomers.length === 0 ? (
        <Card className="p-12 text-center text-xs font-semibold text-slate-400 border-dashed">
          No customer accounts found matching current filters.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((c) => (
            <Card key={c.id} className="p-5 border border-slate-200/80 shadow-xs space-y-3.5 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                {/* Header Tags */}
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                    c.customer_type === 'Distributor'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : c.customer_type === 'Wholesaler'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {c.customer_type}
                  </span>

                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                    c.pipeline_stage === 'Active Account'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {c.pipeline_stage}
                  </span>
                </div>

                {/* Business Details */}
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-snug">{c.business_name}</h3>
                  <p className="text-xs font-bold text-slate-500 mt-0.5 flex items-center gap-1">
                    <Users className="w-3 h-3 text-slate-400" /> {c.contact_person}
                  </p>
                  <p className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400" /> {c.city}, {c.territory}
                  </p>
                </div>

                {/* Contact & Commercial Info */}
                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2 truncate"><Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {c.email || 'No email registered'}</div>
                  <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {c.phone}</div>
                </div>

                {/* Outstanding Balance & Credit Limit */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Outstanding</span>
                    <span className={`font-black ${c.outstanding_amount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                      ₹{Number(c.outstanding_amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Credit Limit</span>
                    <span className="font-bold text-slate-700">₹{Number(c.credit_limit).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-400">
                    Lead: {c.assigned_staff_name || 'General Sales'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditingCustomer(c)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded cursor-pointer" title="Edit Customer">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button onClick={() => handleDelete(c.id, c.business_name)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer" title="Delete Customer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenDossier(c)}
                  className="w-full text-xs font-bold h-8.5 border-slate-200 hover:border-slate-300 flex items-center justify-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5 text-[#58051E]" /> View Activity Timeline & Dossier
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Enterprise Customer Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900">Add Enterprise FMCG Customer</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Register a Distributor, Retailer, or Wholesaler account in Rimi ERP.</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                {/* Type & Pipeline Stage */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Customer Classification *</label>
                    <select
                      value={formData.customer_type}
                      onChange={(e) => setFormData({ ...formData, customer_type: e.target.value as any })}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                    >
                      {CUSTOMER_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Pipeline Stage *</label>
                    <select
                      value={formData.pipeline_stage}
                      onChange={(e) => setFormData({ ...formData, pipeline_stage: e.target.value as any })}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                    >
                      {PIPELINE_STAGES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Business Name & Contact Person */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Business / Firm Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.business_name}
                      onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                      placeholder="e.g. Reliance Fresh Retail Hub"
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Primary Contact Person *</label>
                    <input
                      type="text"
                      required
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      placeholder="e.g. Ramesh Patel (Store Manager)"
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Phone, WhatsApp & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Phone Number *</label>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98200 12345"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">WhatsApp Number</label>
                    <input
                      type="text"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      placeholder="+91 98200 12345"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Official Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="orders@reliancefresh.in"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Address, City, Territory & GST */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">City / District</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Mumbai"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Territory / Region</label>
                    <select
                      value={formData.territory}
                      onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                    >
                      {TERRITORIES.filter(t => t !== 'All').map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">GSTIN (Optional)</label>
                    <input
                      type="text"
                      value={formData.gst_no}
                      onChange={(e) => setFormData({ ...formData, gst_no: e.target.value })}
                      placeholder="27AABCR1234F1Z0"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Commercials: Credit Limit & Period */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Credit Limit (₹ INR)</label>
                    <input
                      type="number"
                      value={formData.credit_limit}
                      onChange={(e) => setFormData({ ...formData, credit_limit: Number(e.target.value) })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Credit Period (Days)</label>
                    <input
                      type="number"
                      value={formData.credit_period_days}
                      onChange={(e) => setFormData({ ...formData, credit_period_days: Number(e.target.value) })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Assigned Sales Lead</label>
                    <select
                      value={formData.assigned_staff_name}
                      onChange={(e) => {
                        const name = e.target.value;
                        const match = staffList.find(s => s.name === name);
                        setFormData({
                          ...formData,
                          assigned_staff_name: name,
                          assigned_staff_email: match?.email || `${name.toLowerCase().replace(/[^a-z]/g, '')}@ferex.com`
                        });
                      }}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                    >
                      {staffList.map((s: any) => (
                        <option key={s.id || s.email} value={s.name}>
                          {s.name} ({s.roleLabel || s.role || 'Sales Lead'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">Save Customer Record</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Enterprise Customer Modal */}
      <AnimatePresence>
        {editingCustomer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={() => setEditingCustomer(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900">Edit Customer Account</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Modify CRM details, classification, credit terms, and contact profile.</p>
                </div>
                <button onClick={() => setEditingCustomer(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-4">
                {/* Type, Pipeline Stage & Account Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Customer Classification *</label>
                    <select
                      value={editingCustomer.customer_type}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, customer_type: e.target.value as any })}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                    >
                      {CUSTOMER_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Pipeline Stage *</label>
                    <select
                      value={editingCustomer.pipeline_stage}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, pipeline_stage: e.target.value as any })}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                    >
                      {PIPELINE_STAGES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Account Status *</label>
                    <select
                      value={editingCustomer.status || 'Active'}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, status: e.target.value as any })}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                    >
                      <option value="Active">Active</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Business Name & Contact Person */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Business / Firm Name *</label>
                    <input
                      type="text"
                      required
                      value={editingCustomer.business_name}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, business_name: e.target.value })}
                      placeholder="e.g. Reliance Fresh Retail Hub"
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Primary Contact Person *</label>
                    <input
                      type="text"
                      required
                      value={editingCustomer.contact_person}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, contact_person: e.target.value })}
                      placeholder="e.g. Ramesh Patel (Store Manager)"
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Phone, WhatsApp & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Phone Number *</label>
                    <input
                      type="text"
                      required
                      value={editingCustomer.phone}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">WhatsApp Number</label>
                    <input
                      type="text"
                      value={editingCustomer.whatsapp || ''}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, whatsapp: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Official Email</label>
                    <input
                      type="email"
                      value={editingCustomer.email || ''}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Address, City, Territory & GST */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">City / District</label>
                    <input
                      type="text"
                      value={editingCustomer.city || ''}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, city: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Territory / Region</label>
                    <select
                      value={editingCustomer.territory || 'West Zone'}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, territory: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                    >
                      {TERRITORIES.filter(t => t !== 'All').map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">GSTIN</label>
                    <input
                      type="text"
                      value={editingCustomer.gst_no || ''}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, gst_no: e.target.value })}
                      placeholder="27AABCR1234F1Z0"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Commercials: Credit Limit, Period & Payment Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Credit Limit (₹ INR)</label>
                    <input
                      type="number"
                      value={editingCustomer.credit_limit || 0}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, credit_limit: Number(e.target.value) })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Credit Period (Days)</label>
                    <input
                      type="number"
                      value={editingCustomer.credit_period_days || 0}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, credit_period_days: Number(e.target.value) })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Assigned Sales Lead</label>
                    <select
                      value={editingCustomer.assigned_staff_name || ''}
                      onChange={(e) => {
                        const name = e.target.value;
                        const match = staffList.find(s => s.name === name);
                        setEditingCustomer({
                          ...editingCustomer,
                          assigned_staff_name: name,
                          assigned_staff_email: match?.email || `${name.toLowerCase().replace(/[^a-z]/g, '')}@ferex.com`
                        });
                      }}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                    >
                      <option value="">-- Select Sales Lead --</option>
                      {staffList.map((s: any) => (
                        <option key={s.id || s.email} value={s.name}>
                          {s.name} ({s.roleLabel || s.role || 'Sales Lead'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setEditingCustomer(null)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">Save Changes</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Customer Dossier Drawer (Activity Timeline & Sales History) */}
      <AnimatePresence>
        {dossierCustomer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setDossierCustomer(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-xl bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div>
                  <h3 className="text-base font-black text-slate-900">{dossierCustomer.business_name}</h3>
                  <span className="text-[10px] font-bold text-[#58051E] uppercase">
                    {dossierCustomer.customer_type} • Stage: {dossierCustomer.pipeline_stage}
                  </span>
                </div>
                <button onClick={() => setDossierCustomer(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-6 text-left text-xs">
                {/* Pipeline Stage Quick Switcher */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Move Pipeline Stage</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PIPELINE_STAGES.map(st => (
                      <button
                        key={st}
                        onClick={() => handleAdvanceStage(st)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          dossierCustomer.pipeline_stage === st
                            ? 'bg-[#58051E] text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Log New Activity */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Log Customer Interaction</span>
                  <form onSubmit={handleAddActivity} className="space-y-2">
                    <div className="flex gap-2">
                      <select
                        value={newActivityType}
                        onChange={(e) => setNewActivityType(e.target.value as any)}
                        className="h-9 px-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                      >
                        <option value="Call Log">📞 Phone Call</option>
                        <option value="Visit Log">📍 Field Visit</option>
                        <option value="Sample Sent">📦 Sample Sent</option>
                        <option value="Note">📝 Note</option>
                        <option value="Complaint">⚠️ Complaint</option>
                      </select>
                      <input
                        type="text"
                        required
                        value={newActivityText}
                        onChange={(e) => setNewActivityText(e.target.value)}
                        placeholder="Interaction notes or meeting summary..."
                        className="flex-1 h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                      />
                      <Button type="submit" size="sm" className="bg-[#58051E] text-white text-xs font-bold h-9">
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </form>
                </div>

                {/* Chronological Activity Timeline */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#58051E]" /> Chronological Activity History ({dossierActivities.length})
                  </h4>

                  {dossierActivities.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl">No interaction logged yet</div>
                  ) : (
                    <div className="space-y-2.5 border-l-2 border-slate-100 pl-3 ml-1.5">
                      {dossierActivities.map(act => (
                        <div key={act.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                              {act.activity_type}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {new Date(act.created_at).toLocaleDateString()} • {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="font-bold text-slate-900 text-xs">{act.title}</p>
                          {act.description && <p className="text-[11px] text-slate-500">{act.description}</p>}
                          <span className="text-[9px] text-slate-400 block pt-0.5">By: {act.performed_by}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sales Orders History */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#58051E]" /> Sales Orders History ({dossierOrders.length})
                  </h4>

                  {dossierOrders.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-400 text-center">No orders placed by this customer</div>
                  ) : (
                    <div className="space-y-1.5">
                      {dossierOrders.map(ord => (
                        <div key={ord.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-800 block">{ord.order_no}</span>
                            <span className="text-[10px] text-slate-400">Date: {ord.delivery_date || 'N/A'}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-slate-900 block">₹{Number(ord.total_amount).toLocaleString('en-IN')}</span>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${ord.order_status === 'Delivered' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{ord.order_status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button size="sm" className="w-full text-xs font-bold bg-[#58051E] hover:bg-[#430316]" onClick={() => setDossierCustomer(null)}>
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
