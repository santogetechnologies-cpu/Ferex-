import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Boxes, Search, Plus, Eye, Trash2, X, CheckCircle2,
  Phone, Mail, MapPin, Tag, MessageSquare, AlertCircle,
  PhoneCall, Footprints, FileText, UserCheck, ArrowRight
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

export const RimiWholesalers: React.FC = () => {
  const { profile } = useAuth();
  const currentUserName = profile?.full_name || profile?.email?.split('@')[0] || 'Rimi Operations Desk';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('All');
  const [selectedWhl, setSelectedWhl] = useState<RimiCustomer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [wholesalers, setWholesalers] = useState<RimiCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  // Note state in drawer
  const [noteType, setNoteType] = useState<'call' | 'visit' | 'complaint' | 'note'>('call');
  const [noteText, setNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRimiCustomers({
        type: 'Wholesaler'
      });
      setWholesalers(data);
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

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const filteredWholesalers = wholesalers.filter(w => {
    if (selectedRegion !== 'All' && !w.region.toLowerCase().includes(selectedRegion.toLowerCase())) return false;
    if (selectedPaymentStatus !== 'All' && w.payment_status !== selectedPaymentStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        w.business_name.toLowerCase().includes(q) ||
        w.contact_person.toLowerCase().includes(q) ||
        w.region.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalOutstanding = wholesalers.reduce((sum, w) => sum + (w.outstanding_balance || 0), 0);

  // Add Wholesaler form
  const [newWhl, setNewWhl] = useState({
    business_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    region: 'Mumbai APMC Zone',
    order_volume: '100 Tons / Quarter',
    payment_terms: 'Net 30 Days',
    credit_limit: 4000000,
    payment_status: 'Up to Date' as const,
    assigned_staff_name: 'Rimi Operations Desk',
    pipeline_stage: 'Active Customer' as RimiPipelineStage,
    tags: ['high-value', 'tier-1']
  });

  const handleCreateWhl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWhl.business_name) return;

    await createRimiCustomer({
      ...newWhl,
      customer_type: 'Wholesaler',
      products_ordered: ['Green Peas 1kg Bulk', 'Sweet Corn Bulk 25kg', 'Paneer Block 5kg']
    });

    setShowAddModal(false);
    showToastMsg(`Wholesaler "${newWhl.business_name}" enrolled!`);
    loadData();
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWhl || !noteText.trim()) return;
    setIsSubmittingNote(true);
    try {
      const added = await addRimiCustomerActivityNote(selectedWhl.id, {
        type: noteType,
        text: noteText.trim(),
        author: profile?.full_name || profile?.email || currentUserName
      });
      setSelectedWhl({
        ...selectedWhl,
        notes: [added, ...(selectedWhl.notes || [])]
      });
      setNoteText('');
      showToastMsg(`Activity logged: ${noteType.toUpperCase()}`);
      loadData();
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete wholesaler "${name}"?`)) return;
    await deleteRimiCustomer(id);
    showToastMsg(`Wholesaler "${name}" deleted.`);
    if (selectedWhl?.id === id) setSelectedWhl(null);
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
              Wholesalers & Bulk Traders
            </h1>
            <span className="text-[10px] uppercase font-black tracking-wider bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200">
              APMC & Mandi Buyers
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Institutional buyers, catering suppliers, and cold chain wholesalers with volume metrics, payment terms, and assigned staff.
          </p>
        </div>

        <Button
          variant="primary"
          className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-md flex items-center gap-2"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="w-4 h-4" /> Enroll Wholesaler
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-3.5 bg-white border-slate-200 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search wholesalers by business, contact, territory..."
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
              <option value="Mumbai APMC">Mumbai APMC Zone</option>
              <option value="Punjab">Punjab & Haryana Corridor</option>
              <option value="Tamil Nadu">Tamil Nadu & Kerala Zone</option>
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
              <option value="Advance Paid">Advance Paid</option>
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
                <th className="py-3 px-4">Wholesale Entity</th>
                <th className="py-3 px-4">Contact & Phone</th>
                <th className="py-3 px-4">Order Volume</th>
                <th className="py-3 px-4">Payment Terms</th>
                <th className="py-3 px-4">Territory</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4">Assigned Sales Lead</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredWholesalers.map(w => (
                <tr
                  key={w.id}
                  onClick={() => setSelectedWhl(w)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 group-hover:text-[#58051E] flex items-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5 text-amber-600" />
                      {w.business_name}
                    </div>
                    <div className="text-[10px] text-slate-400">{w.id}</div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{w.contact_person}</div>
                    <div className="text-[10px] text-slate-500">{w.phone}</div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-black text-slate-800">{w.order_volume || '100 Tons / Qtr'}</span>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-700">{w.payment_terms || 'Net 30 Days'}</span>
                  </td>

                  <td className="py-3 px-4">
                    <span className="text-slate-800">{w.region}</span>
                  </td>

                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      w.payment_status === 'Advance Paid' ? 'bg-purple-100 text-purple-800' :
                      w.payment_status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {w.payment_status}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-700 flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-[#58051E]" />
                      {w.assigned_staff_name}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setSelectedWhl(w)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(w.id, w.business_name)} className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredWholesalers.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 font-semibold">
                    No wholesale account records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Wholesaler Drawer */}
      <AnimatePresence>
        {selectedWhl && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedWhl(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full max-w-xl bg-white h-full shadow-2xl z-10 flex flex-col overflow-hidden text-left">
              <div className="p-6 bg-amber-950 text-white flex items-center justify-between shrink-0">
                <div>
                  <div className="text-[10px] font-black uppercase text-amber-300">{selectedWhl.id}</div>
                  <h2 className="text-lg font-black">{selectedWhl.business_name}</h2>
                  <p className="text-xs text-amber-200">{selectedWhl.address}</p>
                </div>
                <button onClick={() => setSelectedWhl(null)} className="p-2 hover:bg-white/10 rounded-xl">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-amber-700 font-bold block">Wholesale Head:</span>
                    <span className="font-bold text-slate-900">{selectedWhl.contact_person}</span>
                    <div className="text-[11px] text-slate-600 mt-1">{selectedWhl.phone}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-700 font-bold block">Volume & Terms:</span>
                    <span className="font-bold text-slate-900">{selectedWhl.order_volume || '150 Tons / Qtr'}</span>
                    <div className="text-[11px] text-slate-600 mt-1">{selectedWhl.payment_terms || 'Net 30 Days'}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-[#58051E]" /> Wholesale Contract & Call Notes ({selectedWhl.notes?.length || 0})
                  </h3>

                  <form onSubmit={handleAddNote} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                    <textarea rows={2} placeholder="Log rebate discussions, purchase orders, or pricing inquiries..." value={noteText} onChange={e => setNoteText(e.target.value)} className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden" />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={isSubmittingNote || !noteText.trim()} className="bg-[#58051E] text-white text-[10px] py-1 px-3">
                        Post Note
                      </Button>
                    </div>
                  </form>

                  <div className="space-y-2">
                    {selectedWhl.notes?.map(n => (
                      <div key={n.id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400">
                          <span className="uppercase text-amber-800">{n.type}</span>
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
                <h3 className="font-black text-sm text-slate-900">Enroll Wholesaler Entity</h3>
                <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <form onSubmit={handleCreateWhl} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Business Name *</label>
                  <input required placeholder="e.g. Metro Mega Food Wholesalers" value={newWhl.business_name} onChange={e => setNewWhl({ ...newWhl, business_name: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Contact Person *</label>
                    <input required placeholder="e.g. Sunil Chhabra" value={newWhl.contact_person} onChange={e => setNewWhl({ ...newWhl, contact_person: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone</label>
                    <input placeholder="+91 98200 00000" value={newWhl.phone} onChange={e => setNewWhl({ ...newWhl, phone: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Order Volume</label>
                    <input placeholder="150 Tons / Quarter" value={newWhl.order_volume} onChange={e => setNewWhl({ ...newWhl, order_volume: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Payment Terms</label>
                    <input placeholder="Net 30 Days" value={newWhl.payment_terms} onChange={e => setNewWhl({ ...newWhl, payment_terms: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" className="bg-[#58051E] text-white">Save Wholesaler</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
