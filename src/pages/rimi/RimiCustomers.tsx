import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Plus, Eye, Edit3, Trash2, X, CheckCircle2,
  Phone, Mail, MapPin, Building2, Store, Boxes, ChevronRight,
  TrendingUp, Tag, MessageSquare, AlertTriangle, ShieldCheck,
  Calendar, FileText, UserCheck, PhoneCall, Footprints, AlertCircle,
  Clock, ArrowRight, Filter, Download
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getRimiCustomers,
  createRimiCustomer,
  updateRimiCustomer,
  deleteRimiCustomer,
  addRimiCustomerActivityNote,
  updateRimiCustomerPipelineStage,
  getRimiSalesOrders,
  getRimiStaffList,
  exportRimiSalesToCSV,
  type RimiCustomer,
  type RimiCustomerType,
  type RimiPipelineStage,
  type RimiActivityNote
} from '../../lib/api/rimi';
import { useAuth } from '../../contexts/AuthContext';

const PIPELINE_STAGES: RimiPipelineStage[] = [
  'New Lead',
  'Contacted',
  'Sample Sent',
  'Order Placed',
  'Active Customer'
];

const AVAILABLE_TAGS = ['high-value', 'seasonal', 'at-risk', 'tier-1', 'urgent'];

export const RimiCustomers: React.FC = () => {
  const { profile } = useAuth();
  const isStaff = profile?.role === 'staff' || profile?.role === 'operations_manager' || profile?.role === 'sales_staff';
  const currentUserName = profile?.full_name || profile?.email?.split('@')[0] || 'Rimi Operations Desk';

  const [activeTab, setActiveTab] = useState<'All' | 'Distributor' | 'Shop' | 'Wholesaler' | 'Pipeline'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('All');
  const [selectedStage, setSelectedStage] = useState('All');
  const [selectedTag, setSelectedTag] = useState('All');
  const [selectedStaff, setSelectedStaff] = useState('All');

  const [customers, setCustomers] = useState<RimiCustomer[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedCust, setSelectedCust] = useState<RimiCustomer | null>(null);
  const [editingCust, setEditingCust] = useState<RimiCustomer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  // Note creation form state inside details drawer
  const [noteType, setNoteType] = useState<'call' | 'visit' | 'complaint' | 'note'>('call');
  const [noteText, setNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Customer order history inside drawer
  const [custOrders, setCustOrders] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [data, realStaff] = await Promise.all([
        getRimiCustomers(),
        getRimiStaffList()
      ]);
      setCustomers(data || []);
      setStaffList(realStaff || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('ferex_rimi_crm_customers_change', handleSync);
    return () => window.removeEventListener('ferex_rimi_crm_customers_change', handleSync);
  }, [loadData]);

  // Load customer orders when a customer is opened in drawer
  useEffect(() => {
    if (!selectedCust) return;
    (async () => {
      const allOrders = await getRimiSalesOrders();
      const matched = allOrders.filter(
        o => o.customer_id === selectedCust.id || o.customer_name === selectedCust.business_name
      );
      setCustOrders(matched);
    })();
  }, [selectedCust]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Filtered customer list
  const filteredCustomers = customers.filter(c => {
    if (activeTab !== 'All' && activeTab !== 'Pipeline' && c.customer_type !== activeTab) {
      return false;
    }
    if (selectedRegion !== 'All' && !c.region.toLowerCase().includes(selectedRegion.toLowerCase())) {
      return false;
    }
    if (selectedPaymentStatus !== 'All' && c.payment_status !== selectedPaymentStatus) {
      return false;
    }
    if (selectedStage !== 'All' && c.pipeline_stage !== selectedStage) {
      return false;
    }
    if (selectedTag !== 'All' && !c.tags.includes(selectedTag)) {
      return false;
    }
    if (selectedStaff !== 'All' && c.assigned_staff_name !== selectedStaff) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.business_name.toLowerCase().includes(q);
      const matchContact = c.contact_person.toLowerCase().includes(q);
      const matchEmail = c.email.toLowerCase().includes(q);
      const matchPhone = c.phone.toLowerCase().includes(q);
      const matchRegion = c.region.toLowerCase().includes(q);
      if (!matchName && !matchContact && !matchEmail && !matchPhone && !matchRegion) {
        return false;
      }
    }
    return true;
  });

  // KPI Metrics
  const totalCount = customers.length;
  const distCount = customers.filter(c => c.customer_type === 'Distributor').length;
  const shopCount = customers.filter(c => c.customer_type === 'Shop').length;
  const whlCount = customers.filter(c => c.customer_type === 'Wholesaler').length;
  const totalOutstanding = customers.reduce((sum, c) => sum + (c.outstanding_balance || 0), 0);

  // Add customer form state
  const [formData, setFormData] = useState({
    customer_type: 'Distributor' as RimiCustomerType,
    business_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    region: 'Western Zone (Maharashtra)',
    credit_limit: 1000000,
    credit_period_days: 30,
    supplying_distributor: 'Apex Cold Logistics Ltd',
    order_frequency: 'Weekly',
    order_volume: '50 Tons / Quarter',
    payment_terms: 'Net 30 Days',
    payment_status: 'Up to Date' as const,
    assigned_staff_name: 'Rimi Operations Desk',
    pipeline_stage: 'New Lead' as RimiPipelineStage,
    tags: ['high-value']
  });

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.business_name) return;

    const created = await createRimiCustomer({
      ...formData,
      assigned_staff_name: formData.assigned_staff_name || staffList[0]?.name || currentUserName,
      products_distributed: ['Green Peas 1kg', 'Sweet Corn 500g'],
      preferred_products: ['Green Peas 1kg', 'French Fries Premium'],
      products_ordered: ['IQF Strawberries', 'Paneer Block 1kg']
    });

    setShowAddModal(false);
    showToastMsg(`Customer "${created.business_name}" added to CRM!`);
    loadData();
  };

  const handleUpdatePipelineStage = async (custId: string, newStage: RimiPipelineStage) => {
    await updateRimiCustomerPipelineStage(custId, newStage);
    showToastMsg(`Pipeline stage updated to "${newStage}"`);
    loadData();
    if (selectedCust && selectedCust.id === custId) {
      setSelectedCust({ ...selectedCust, pipeline_stage: newStage });
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCust || !noteText.trim()) return;
    setIsSubmittingNote(true);
    try {
      const added = await addRimiCustomerActivityNote(selectedCust.id, {
        type: noteType,
        text: noteText.trim(),
        author: profile?.full_name || profile?.email || currentUserName
      });
      setSelectedCust({
        ...selectedCust,
        notes: [added, ...(selectedCust.notes || [])]
      });
      setNoteText('');
      showToastMsg(`Activity logged: ${noteType.toUpperCase()}`);
      loadData();
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleDeleteCust = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove customer "${name}" from Rimi Frozen CRM?`)) return;
    await deleteRimiCustomer(id);
    showToastMsg(`Customer "${name}" removed.`);
    if (selectedCust?.id === id) setSelectedCust(null);
    loadData();
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
            className="fixed top-6 right-6 z-50 bg-[#58051E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CRM Header & KPIs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Customer CRM Database
            </h1>
            <span className="text-[10px] uppercase font-black tracking-wider bg-[#58051E]/10 text-[#58051E] px-2.5 py-0.5 rounded-full border border-[#58051E]/20">
              3-Tier Scalable
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Enterprise cold chain directory spanning Distributors, Retail Shops, and Bulk Wholesalers with full pipeline & activity telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-2"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-4 h-4" /> Add New Customer
          </Button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Accounts</span>
            <Users className="w-4 h-4 text-[#58051E]" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">{totalCount}</div>
          <span className="text-[10px] font-bold text-emerald-600">Enterprise Active</span>
        </Card>

        <Card className="p-4 border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Distributors</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">{distCount}</div>
          <span className="text-[10px] font-bold text-slate-500">Regional Cold Hubs</span>
        </Card>

        <Card className="p-4 border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Retail Shops</span>
            <Store className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">{shopCount}</div>
          <span className="text-[10px] font-bold text-slate-500">Supermarket Stores</span>
        </Card>

        <Card className="p-4 border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Wholesalers</span>
            <Boxes className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">{whlCount}</div>
          <span className="text-[10px] font-bold text-slate-500">APMC Bulk Buyers</span>
        </Card>

        <Card className="p-4 border-slate-200 bg-white col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Outstanding</span>
            <TrendingUp className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-700 mt-2">
            ₹{(totalOutstanding / 100000).toFixed(2)} L
          </div>
          <span className="text-[10px] font-bold text-slate-500">Credit Ledger</span>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('All')}
          className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
            activeTab === 'All'
              ? 'border-[#58051E] text-[#58051E] bg-[#58051E]/5'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> All Accounts ({totalCount})
        </button>

        <button
          onClick={() => setActiveTab('Distributor')}
          className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
            activeTab === 'Distributor'
              ? 'border-[#58051E] text-[#58051E] bg-[#58051E]/5'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-blue-600" /> Distributors ({distCount})
        </button>

        <button
          onClick={() => setActiveTab('Shop')}
          className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
            activeTab === 'Shop'
              ? 'border-[#58051E] text-[#58051E] bg-[#58051E]/5'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Store className="w-3.5 h-3.5 text-emerald-600" /> Shops / Retailers ({shopCount})
        </button>

        <button
          onClick={() => setActiveTab('Wholesaler')}
          className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
            activeTab === 'Wholesaler'
              ? 'border-[#58051E] text-[#58051E] bg-[#58051E]/5'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Boxes className="w-3.5 h-3.5 text-amber-600" /> Wholesalers ({whlCount})
        </button>

        <button
          onClick={() => setActiveTab('Pipeline')}
          className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
            activeTab === 'Pipeline'
              ? 'border-[#58051E] text-[#58051E] bg-[#58051E]/5'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-purple-600" /> 5-Stage Funnel Pipeline
        </button>
      </div>

      {/* Multi-Criteria Filters Bar */}
      <Card className="p-3.5 bg-white border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by business, contact, territory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#58051E]/20"
            />
          </div>

          {/* Region Filter */}
          <div>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden text-slate-700"
            >
              <option value="All">All Territories</option>
              <option value="Western Zone">Western Zone (MH)</option>
              <option value="Gujarat">Gujarat Territory</option>
              <option value="Mumbai Suburban">Mumbai Suburban</option>
              <option value="Pune">Pune Territory</option>
              <option value="North Zone">North Zone (NCR/PB)</option>
              <option value="Tamil Nadu">South Zone (TN/KL)</option>
              <option value="Bangalore">Bangalore Metro</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden text-slate-700"
            >
              <option value="All">Payment: All</option>
              <option value="Up to Date">Up to Date</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
              <option value="Advance Paid">Advance Paid</option>
            </select>
          </div>

          {/* Pipeline Stage Filter */}
          <div>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden text-slate-700"
            >
              <option value="All">Pipeline: All Stages</option>
              {PIPELINE_STAGES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Tag Filter */}
          <div>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden text-slate-700"
            >
              <option value="All">Tags: All</option>
              {AVAILABLE_TAGS.map(t => (
                <option key={t} value={t}>#{t}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* ── View Mode: Pipeline Kanban Funnel ─────────────────────────────── */}
      {activeTab === 'Pipeline' ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {PIPELINE_STAGES.map((stage, idx) => {
            const stageCustomers = filteredCustomers.filter(c => c.pipeline_stage === stage);
            return (
              <div key={stage} className="bg-slate-100/80 rounded-2xl p-3 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#58051E] text-white text-[10px] font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <h3 className="text-xs font-black text-slate-900">{stage}</h3>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
                    {stageCustomers.length}
                  </span>
                </div>

                <div className="space-y-2.5 min-h-[300px]">
                  {stageCustomers.map(cust => (
                    <motion.div
                      key={cust.id}
                      layout
                      onClick={() => setSelectedCust(cust)}
                      className="bg-white p-3 rounded-xl border border-slate-200 hover:border-[#58051E]/40 hover:shadow-md transition-all cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                          cust.customer_type === 'Distributor'
                            ? 'bg-blue-50 text-blue-700'
                            : cust.customer_type === 'Shop'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {cust.customer_type}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {cust.id}
                        </span>
                      </div>

                      <h4 className="text-xs font-black text-slate-900 line-clamp-1">{cust.business_name}</h4>
                      <p className="text-[10px] text-slate-500 font-medium">{cust.contact_person}</p>

                      <div className="flex flex-wrap gap-1 pt-1">
                        {cust.tags.map(t => (
                          <span key={t} className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                            #{t}
                          </span>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span className="font-bold text-slate-400">{cust.region.split(' ')[0]}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextStageIndex = (idx + 1) % PIPELINE_STAGES.length;
                            handleUpdatePipelineStage(cust.id, PIPELINE_STAGES[nextStageIndex]);
                          }}
                          className="text-[#58051E] font-black hover:underline flex items-center gap-0.5"
                        >
                          Advance <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </motion.div>
                  ))}

                  {stageCustomers.length === 0 && (
                    <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-[11px] font-semibold text-slate-400">
                      No accounts in {stage}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── View Mode: Customer Table List ──────────────────────────────── */
        <Card className="p-0 bg-white border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[9px] font-black tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Customer / Business</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Contact & Phone</th>
                  <th className="py-3 px-4">Territory / Region</th>
                  <th className="py-3 px-4">Pipeline Stage</th>
                  <th className="py-3 px-4">Payment & Limit</th>
                  <th className="py-3 px-4">Assigned Staff</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredCustomers.map(cust => (
                  <tr
                    key={cust.id}
                    onClick={() => setSelectedCust(cust)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 group-hover:text-[#58051E] transition-colors">
                        {cust.business_name}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span>{cust.id}</span>
                        {cust.tags.map(t => (
                          <span key={t} className={`text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                            t === 'high-value' ? 'bg-purple-50 text-purple-700' :
                            t === 'at-risk' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                        cust.customer_type === 'Distributor'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : cust.customer_type === 'Shop'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {cust.customer_type === 'Distributor' && <Building2 className="w-3 h-3" />}
                        {cust.customer_type === 'Shop' && <Store className="w-3 h-3" />}
                        {cust.customer_type === 'Wholesaler' && <Boxes className="w-3 h-3" />}
                        {cust.customer_type}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{cust.contact_person}</div>
                      <div className="text-[10px] text-slate-500 font-medium">{cust.phone}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        {cust.region}
                      </div>
                      {cust.supplying_distributor && (
                        <div className="text-[10px] text-slate-400">Via: {cust.supplying_distributor}</div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
                        cust.pipeline_stage === 'Active Customer'
                          ? 'bg-emerald-100 text-emerald-800'
                          : cust.pipeline_stage === 'Order Placed'
                          ? 'bg-blue-100 text-blue-800'
                          : cust.pipeline_stage === 'Sample Sent'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {cust.pipeline_stage}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">
                        ₹{Number(cust.credit_limit || 0).toLocaleString('en-IN')}
                      </div>
                      <div className={`text-[10px] font-bold ${
                        cust.payment_status === 'Overdue' ? 'text-rose-600 font-black' :
                        cust.payment_status === 'Pending' ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {cust.payment_status} ({cust.outstanding_balance ? `Due: ₹${(cust.outstanding_balance/1000).toFixed(0)}k` : 'Nil'})
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-700 flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-[#58051E]" />
                        {cust.assigned_staff_name || 'Unassigned'}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedCust(cust)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                          title="View Profile Dossier"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCust(cust.id, cust.business_name)}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                      No customer accounts match your active search or filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Interactive Customer Detail Dossier Drawer ──────────────────────── */}
      <AnimatePresence>
        {selectedCust && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCust(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl bg-white h-full shadow-2xl z-10 flex flex-col overflow-hidden text-left"
            >
              {/* Drawer Header */}
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                      {selectedCust.customer_type} Account
                    </span>
                    <span className="text-xs text-slate-300 font-bold">{selectedCust.id}</span>
                  </div>
                  <h2 className="text-lg font-black">{selectedCust.business_name}</h2>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" /> {selectedCust.address}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCust(null)}
                  className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 5-Stage Customer Pipeline Progress Bar */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">CRM Pipeline Stage</span>
                    <span className="text-[10px] font-bold text-[#58051E]">Click to advance stage</span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5">
                    {PIPELINE_STAGES.map((st, i) => {
                      const currentIdx = PIPELINE_STAGES.indexOf(selectedCust.pipeline_stage);
                      const isPastOrCurrent = i <= currentIdx;
                      const isCurrent = i === currentIdx;

                      return (
                        <button
                          key={st}
                          onClick={() => handleUpdatePipelineStage(selectedCust.id, st)}
                          className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer border ${
                            isCurrent
                              ? 'bg-[#58051E] text-white border-[#58051E] shadow-sm font-black'
                              : isPastOrCurrent
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                              : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100 font-medium'
                          }`}
                        >
                          <div className="text-[9px] uppercase tracking-tighter truncate">{st}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Contact & Commercial Info Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Primary Contact</span>
                    <div className="font-bold text-slate-900">{selectedCust.contact_person}</div>
                    <div className="text-slate-600 flex items-center gap-1 text-[11px] pt-1">
                      <Phone className="w-3 h-3 text-slate-400" /> {selectedCust.phone}
                    </div>
                    <div className="text-slate-600 flex items-center gap-1 text-[11px]">
                      <Mail className="w-3 h-3 text-slate-400" /> {selectedCust.email}
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Commercial Terms</span>
                    <div className="font-bold text-slate-900">
                      Credit Limit: ₹{Number(selectedCust.credit_limit || 0).toLocaleString('en-IN')}
                    </div>
                    <div className="text-slate-600 text-[11px] pt-1">
                      Terms: {selectedCust.credit_period_days ? `${selectedCust.credit_period_days} Days Net` : selectedCust.payment_terms || 'Advance'}
                    </div>
                    <div className="text-slate-600 text-[11px]">
                      Assigned: <span className="font-bold text-[#58051E]">{selectedCust.assigned_staff_name}</span>
                    </div>
                  </div>
                </div>

                {/* Category-Specific Insights */}
                {selectedCust.customer_type === 'Distributor' && (
                  <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200/80 space-y-2">
                    <h4 className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-blue-600" /> Distributor Portfolio & Quota
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-blue-600 font-bold block">Annual Order History:</span>
                        <span className="font-bold text-slate-800">{selectedCust.order_history_volume || '45,000 MT / Year'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-blue-600 font-bold block">Distributed Products:</span>
                        <span className="font-medium text-slate-700">
                          {selectedCust.products_distributed?.join(', ') || 'All Core SKU Portfolio'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedCust.customer_type === 'Shop' && (
                  <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-2">
                    <h4 className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                      <Store className="w-4 h-4 text-emerald-600" /> Retail Territory Mapping
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-emerald-600 font-bold block">Supplying Distributor:</span>
                        <span className="font-bold text-slate-800">{selectedCust.supplying_distributor || 'Apex Cold Logistics Ltd'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 font-bold block">Order Frequency:</span>
                        <span className="font-bold text-slate-800">{selectedCust.order_frequency || 'Weekly Delivery'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedCust.customer_type === 'Wholesaler' && (
                  <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-2">
                    <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                      <Boxes className="w-4 h-4 text-amber-600" /> Wholesale Bulk Purchasing
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-amber-600 font-bold block">Quarterly Volume:</span>
                        <span className="font-bold text-slate-800">{selectedCust.order_volume || '150 Tons / Quarter'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-600 font-bold block">Payment Structure:</span>
                        <span className="font-bold text-slate-800">{selectedCust.payment_terms || 'Net 30 Days'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Activity Log & Notes Stream */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-[#58051E]" /> Activity Stream & Interactions ({selectedCust.notes?.length || 0})
                    </h3>
                  </div>

                  {/* Add New Note Form */}
                  <form onSubmit={handleAddNote} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex gap-1.5">
                      {(['call', 'visit', 'complaint', 'note'] as const).map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setNoteType(t)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer flex items-center gap-1 ${
                            noteType === t
                              ? 'bg-[#58051E] text-white'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {t === 'call' && <PhoneCall className="w-2.5 h-2.5" />}
                          {t === 'visit' && <Footprints className="w-2.5 h-2.5" />}
                          {t === 'complaint' && <AlertCircle className="w-2.5 h-2.5" />}
                          {t === 'note' && <FileText className="w-2.5 h-2.5" />}
                          {t}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={2}
                      placeholder={`Log details of this ${noteType}...`}
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#58051E]/20"
                    />

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={isSubmittingNote || !noteText.trim()}
                        className="bg-[#58051E] hover:bg-[#430316] text-white text-[10px] font-black py-1 px-3"
                      >
                        {isSubmittingNote ? 'Saving...' : 'Post Log Entry'}
                      </Button>
                    </div>
                  </form>

                  {/* Notes Feed */}
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {selectedCust.notes && selectedCust.notes.length > 0 ? (
                      selectedCust.notes.map(n => (
                        <div key={n.id} className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-1 ${
                              n.type === 'call' ? 'bg-blue-50 text-blue-700' :
                              n.type === 'visit' ? 'bg-purple-50 text-purple-700' :
                              n.type === 'complaint' ? 'bg-rose-50 text-rose-700 font-black' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {n.type}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(n.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-slate-800 font-medium leading-relaxed">{n.text}</p>
                          <div className="text-[10px] text-slate-400 font-bold">Logged by: {n.author}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                        No activity logs recorded yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Sales Order Ledger for this customer */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-black text-slate-900">Recent Sales Orders</h3>
                  <div className="space-y-1.5">
                    {custOrders.length > 0 ? (
                      custOrders.map(o => (
                        <div key={o.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-slate-900">{o.order_no}</div>
                            <div className="text-[10px] text-slate-500">{o.products_summary}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-black text-slate-900">₹{Number(o.total_amount).toLocaleString('en-IN')}</div>
                            <span className="text-[9px] font-black text-emerald-600">{o.order_status}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-slate-400 text-xs">No sales orders found for this account.</div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Add New Customer Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 border border-slate-100 z-10 space-y-5 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">Create New Customer Account</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Customer Classification *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Distributor', 'Shop', 'Wholesaler'] as RimiCustomerType[]).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormData({ ...formData, customer_type: t })}
                        className={`py-2 px-3 rounded-xl font-black text-center transition-all border ${
                          formData.customer_type === t
                            ? 'bg-[#58051E] text-white border-[#58051E]'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Business / Shop Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Frost Logistics"
                      value={formData.business_name}
                      onChange={e => setFormData({ ...formData, business_name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#58051E]/20"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Contact Person *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajesh Sharma"
                      value={formData.contact_person}
                      onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#58051E]/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+91 98200 00000"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="procurement@client.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Territory / Region</label>
                    <select
                      value={formData.region}
                      onChange={e => setFormData({ ...formData, region: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-slate-800 font-semibold"
                    >
                      <option value="Western Zone (Maharashtra)">Western Zone (Maharashtra)</option>
                      <option value="Gujarat Territory">Gujarat Territory</option>
                      <option value="Mumbai Suburban">Mumbai Suburban</option>
                      <option value="Pune Territory">Pune Territory</option>
                      <option value="North Zone (NCR & Punjab)">North Zone (NCR & Punjab)</option>
                      <option value="Tamil Nadu & Kerala Zone">Tamil Nadu & Kerala Zone</option>
                      <option value="Bangalore Metro">Bangalore Metro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Credit Limit (INR)</label>
                    <input
                      type="number"
                      value={formData.credit_limit}
                      onChange={e => setFormData({ ...formData, credit_limit: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Warehouse / Facility Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Plot 42, Vashi MIDC Cold Storage Zone, Navi Mumbai"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowAddModal(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold"
                  >
                    Create Account
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
