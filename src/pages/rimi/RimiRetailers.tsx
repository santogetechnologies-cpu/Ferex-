import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store, Search, Plus, Eye, Trash2, X, CheckCircle2,
  Phone, Mail, MapPin, Tag, MessageSquare, AlertCircle,
  PhoneCall, Footprints, FileText, UserCheck, ArrowRight, Building2
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getRimiCustomers,
  createRimiCustomer,
  deleteRimiCustomer,
  addRimiCustomerActivityNote,
  updateRimiCustomerPipelineStage,
  type RimiCustomer,
  type RimiPipelineStage
} from '../../lib/api/rimi';
import { useAuth } from '../../contexts/AuthContext';

export const RimiRetailers: React.FC = () => {
  const { profile } = useAuth();
  const isStaff = profile?.role === 'staff' || profile?.role === 'operations_manager';
  const staffName = profile?.full_name || 'Vikram Malhotra';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('All');
  const [selectedShop, setSelectedShop] = useState<RimiCustomer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [shops, setShops] = useState<RimiCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  // Note state in drawer
  const [noteType, setNoteType] = useState<'call' | 'visit' | 'complaint' | 'note'>('visit');
  const [noteText, setNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRimiCustomers({
        type: 'Shop',
        staffOnlyId: isStaff ? staffName : undefined
      });
      setShops(data);
    } finally {
      setLoading(false);
    }
  }, [isStaff, staffName]);

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('ferex_rimi_crm_customers_change', handleSync);
    return () => window.removeEventListener('ferex_rimi_crm_customers_change', handleSync);
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const filteredShops = shops.filter(s => {
    if (selectedRegion !== 'All' && !s.region.toLowerCase().includes(selectedRegion.toLowerCase())) {
      return false;
    }
    if (selectedPaymentStatus !== 'All' && s.payment_status !== selectedPaymentStatus) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.business_name.toLowerCase().includes(q) ||
        s.contact_person.toLowerCase().includes(q) ||
        s.region.toLowerCase().includes(q) ||
        (s.supplying_distributor && s.supplying_distributor.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const [newShop, setNewShop] = useState({
    business_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    region: 'Mumbai Suburban',
    supplying_distributor: 'Apex Cold Logistics Ltd',
    order_frequency: 'Weekly Delivery',
    credit_limit: 300000,
    payment_status: 'Up to Date' as const,
    assigned_staff_name: 'Vikram Malhotra',
    pipeline_stage: 'Active Customer' as RimiPipelineStage,
    tags: ['high-value']
  });

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShop.business_name) return;

    await createRimiCustomer({
      ...newShop,
      customer_type: 'Shop',
      preferred_products: ['Green Peas 1kg', 'Sweet Corn 500g', 'French Fries Premium']
    });

    setShowAddModal(false);
    showToastMsg(`Supermarket / Shop "${newShop.business_name}" enrolled!`);
    loadData();
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop || !noteText.trim()) return;
    setIsSubmittingNote(true);
    try {
      const added = await addRimiCustomerActivityNote(selectedShop.id, {
        type: noteType,
        text: noteText.trim(),
        author: profile?.full_name || 'Vikram Malhotra'
      });
      setSelectedShop({
        ...selectedShop,
        notes: [added, ...(selectedShop.notes || [])]
      });
      setNoteText('');
      showToastMsg(`Activity logged: ${noteType.toUpperCase()}`);
      loadData();
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete shop "${name}"?`)) return;
    await deleteRimiCustomer(id);
    showToastMsg(`Shop "${name}" deleted.`);
    if (selectedShop?.id === id) setSelectedShop(null);
    loadData();
  };

  return (
    <div className="space-y-6 text-left antialiased">
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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Shops & Retailers CRM
            </h1>
            <span className="text-[10px] uppercase font-black tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Store Territory Mapping
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Supermarkets and retail outlets with supplying distributor mapping, order cadence, preferred products, and visit audit logs.
          </p>
        </div>

        <Button
          variant="primary"
          className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-md flex items-center gap-2"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="w-4 h-4" /> Enroll Retail Shop
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-3.5 bg-white border-slate-200 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search shops by name, owner, territory, distributor..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
            />
          </div>

          <div>
            <select
              value={selectedRegion}
              onChange={e => setSelectedRegion(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
            >
              <option value="All">All Territories</option>
              <option value="Mumbai Suburban">Mumbai Suburban</option>
              <option value="Pune Territory">Pune Territory</option>
              <option value="Bangalore Metro">Bangalore Metro</option>
            </select>
          </div>

          <div>
            <select
              value={selectedPaymentStatus}
              onChange={e => setSelectedPaymentStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
            >
              <option value="All">All Payment Statuses</option>
              <option value="Up to Date">Up to Date</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 bg-white border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[9px] font-black tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Shop / Supermarket</th>
                <th className="py-3 px-4">Owner / Contact</th>
                <th className="py-3 px-4">Supplying Distributor</th>
                <th className="py-3 px-4">Order Cadence</th>
                <th className="py-3 px-4">Territory</th>
                <th className="py-3 px-4">Payment & Due</th>
                <th className="py-3 px-4">Pipeline</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredShops.map(s => (
                <tr
                  key={s.id}
                  onClick={() => setSelectedShop(s)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 group-hover:text-[#58051E] flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-emerald-600" />
                      {s.business_name}
                    </div>
                    <div className="text-[10px] text-slate-400">{s.id}</div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{s.contact_person}</div>
                    <div className="text-[10px] text-slate-500">{s.phone}</div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-blue-700 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-blue-500" />
                      {s.supplying_distributor || 'Direct Wholesale'}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-700">{s.order_frequency || 'Weekly'}</span>
                  </td>

                  <td className="py-3 px-4">
                    <span className="text-slate-800">{s.region}</span>
                  </td>

                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      s.payment_status === 'Overdue' ? 'bg-rose-100 text-rose-800' :
                      s.payment_status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {s.payment_status}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                      {s.pipeline_stage}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setSelectedShop(s)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(s.id, s.business_name)} className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredShops.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 font-semibold">
                    No retail shop records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Shop Detail Drawer */}
      <AnimatePresence>
        {selectedShop && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedShop(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full max-w-xl bg-white h-full shadow-2xl z-10 flex flex-col overflow-hidden text-left">
              <div className="p-6 bg-emerald-900 text-white flex items-center justify-between shrink-0">
                <div>
                  <div className="text-[10px] font-black uppercase text-emerald-200">{selectedShop.id}</div>
                  <h2 className="text-lg font-black">{selectedShop.business_name}</h2>
                  <p className="text-xs text-emerald-100">{selectedShop.address}</p>
                </div>
                <button onClick={() => setSelectedShop(null)} className="p-2 hover:bg-white/10 rounded-xl">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-emerald-700 font-bold block">Store Manager:</span>
                    <span className="font-bold text-slate-900">{selectedShop.contact_person}</span>
                    <div className="text-[11px] text-slate-600 mt-1">{selectedShop.phone}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-700 font-bold block">Supplying Distributor:</span>
                    <span className="font-bold text-blue-700">{selectedShop.supplying_distributor || 'Apex Cold Logistics Ltd'}</span>
                    <div className="text-[11px] text-slate-600 mt-1">Restock: {selectedShop.order_frequency || 'Weekly'}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-[#58051E]" /> Store Visits & Merchandising Notes ({selectedShop.notes?.length || 0})
                  </h3>

                  <form onSubmit={handleAddNote} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                    <textarea rows={2} placeholder="Log store visit, shelf freezer check, or restocking request..." value={noteText} onChange={e => setNoteText(e.target.value)} className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden" />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={isSubmittingNote || !noteText.trim()} className="bg-[#58051E] text-white text-[10px] py-1 px-3">
                        Save Store Log
                      </Button>
                    </div>
                  </form>

                  <div className="space-y-2">
                    {selectedShop.notes?.map(n => (
                      <div key={n.id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400">
                          <span className="uppercase text-emerald-800">{n.type}</span>
                          <span>{new Date(n.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-800">{n.text}</p>
                        <div className="text-[10px] text-slate-400 font-bold">By {n.author}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="fixed inset-0 bg-slate-900/50" />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl z-10 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-black text-sm text-slate-900">Enroll Retail Store / Supermarket</h3>
                <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <form onSubmit={handleCreateShop} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Store Name *</label>
                  <input required placeholder="e.g. HyperCity Supermarket Bandra" value={newShop.business_name} onChange={e => setNewShop({ ...newShop, business_name: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Store Owner / Manager *</label>
                    <input required placeholder="e.g. Ramesh Sawant" value={newShop.contact_person} onChange={e => setNewShop({ ...newShop, contact_person: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone</label>
                    <input placeholder="+91 98200 00000" value={newShop.phone} onChange={e => setNewShop({ ...newShop, phone: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Supplying Distributor</label>
                    <input placeholder="Apex Cold Logistics Ltd" value={newShop.supplying_distributor} onChange={e => setNewShop({ ...newShop, supplying_distributor: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Order Frequency</label>
                    <select value={newShop.order_frequency} onChange={e => setNewShop({ ...newShop, order_frequency: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                      <option value="Weekly Delivery">Weekly Delivery</option>
                      <option value="Bi-Weekly Delivery">Bi-Weekly Delivery</option>
                      <option value="Monthly Delivery">Monthly Delivery</option>
                      <option value="Ad-hoc Delivery">Ad-hoc Delivery</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" className="bg-[#58051E] text-white">Save Store</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
