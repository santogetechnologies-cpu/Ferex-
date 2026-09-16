import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Search, Plus, Eye, Trash2, X, CheckCircle2,
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
  getRimiSalesOrders,
  type RimiCustomer,
  type RimiPipelineStage
} from '../../lib/api/rimi';
import { useAuth } from '../../contexts/AuthContext';

export const RimiDistributors: React.FC = () => {
  const { profile } = useAuth();
  const isStaff = profile?.role === 'staff' || profile?.role === 'operations_manager';
  const staffName = profile?.full_name || 'Vikram Malhotra';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('All');
  const [selectedDist, setSelectedDist] = useState<RimiCustomer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [distributors, setDistributors] = useState<RimiCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  // Note form in drawer
  const [noteType, setNoteType] = useState<'call' | 'visit' | 'complaint' | 'note'>('call');
  const [noteText, setNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [distOrders, setDistOrders] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRimiCustomers({
        type: 'Distributor',
        staffOnlyId: isStaff ? staffName : undefined
      });
      setDistributors(data);
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

  useEffect(() => {
    if (!selectedDist) return;
    (async () => {
      const allOrders = await getRimiSalesOrders();
      setDistOrders(allOrders.filter(o => o.customer_id === selectedDist.id || o.customer_name === selectedDist.business_name));
    })();
  }, [selectedDist]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const filteredDistributors = distributors.filter(d => {
    if (selectedRegion !== 'All' && !d.region.toLowerCase().includes(selectedRegion.toLowerCase())) {
      return false;
    }
    if (selectedPaymentStatus !== 'All' && d.payment_status !== selectedPaymentStatus) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.business_name.toLowerCase().includes(q) ||
        d.contact_person.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        d.region.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const [newDist, setNewDist] = useState({
    business_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    region: 'Western Zone (Maharashtra)',
    order_history_volume: '40,000 MT / Year',
    credit_period_days: 30,
    credit_limit: 5000000,
    payment_status: 'Up to Date' as const,
    assigned_staff_name: 'Vikram Malhotra',
    pipeline_stage: 'Active Customer' as RimiPipelineStage,
    tags: ['high-value']
  });

  const handleCreateDist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDist.business_name) return;

    await createRimiCustomer({
      ...newDist,
      customer_type: 'Distributor',
      products_distributed: ['Green Peas 1kg', 'Sweet Corn 500g', 'Paneer Block 1kg', 'Mixed Berries']
    });

    setShowAddModal(false);
    showToastMsg(`Regional Distributor "${newDist.business_name}" registered!`);
    loadData();
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDist || !noteText.trim()) return;
    setIsSubmittingNote(true);
    try {
      const added = await addRimiCustomerActivityNote(selectedDist.id, {
        type: noteType,
        text: noteText.trim(),
        author: profile?.full_name || 'Vikram Malhotra'
      });
      setSelectedDist({
        ...selectedDist,
        notes: [added, ...(selectedDist.notes || [])]
      });
      setNoteText('');
      showToastMsg(`Activity logged: ${noteType.toUpperCase()}`);
      loadData();
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete distributor "${name}"?`)) return;
    await deleteRimiCustomer(id);
    showToastMsg(`Distributor "${name}" deleted.`);
    if (selectedDist?.id === id) setSelectedDist(null);
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
              Distributor Management
            </h1>
            <span className="text-[10px] uppercase font-black tracking-wider bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
              Regional FMCG Hubs
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Cold chain distributors mapped with credit periods, credit limits, distributed products, order history, and assigned sales officers.
          </p>
        </div>

        <Button
          variant="primary"
          className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-md flex items-center gap-2"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="w-4 h-4" /> Register Distributor
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-3.5 bg-white border-slate-200 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search distributors by name, contact, territory..."
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
              <option value="Western Zone">Western Zone (Maharashtra)</option>
              <option value="Gujarat">Gujarat Territory</option>
              <option value="South Central">South Central Hub</option>
              <option value="North Zone">North Zone (NCR & Punjab)</option>
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
                <th className="py-3 px-4">Distributor Entity</th>
                <th className="py-3 px-4">Contact & Phone</th>
                <th className="py-3 px-4">Territory / Region</th>
                <th className="py-3 px-4">Volume History</th>
                <th className="py-3 px-4">Credit Terms & Limit</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4">Assigned Staff</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredDistributors.map(d => (
                <tr
                  key={d.id}
                  onClick={() => setSelectedDist(d)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 group-hover:text-[#58051E] flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      {d.business_name}
                    </div>
                    <div className="text-[10px] text-slate-400">{d.id}</div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{d.contact_person}</div>
                    <div className="text-[10px] text-slate-500">{d.phone}</div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {d.region}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-700">{d.order_history_volume || '35,000 MT / Year'}</span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-800">₹{Number(d.credit_limit || 0).toLocaleString('en-IN')}</div>
                    <div className="text-[10px] text-slate-500">{d.credit_period_days || 30} Days Credit</div>
                  </td>

                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      d.payment_status === 'Overdue' ? 'bg-rose-100 text-rose-800' :
                      d.payment_status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {d.payment_status}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-700 flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-[#58051E]" />
                      {d.assigned_staff_name}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedDist(d)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(d.id, d.business_name)}
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredDistributors.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 font-semibold">
                    No distributor accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Distributor Detail Drawer */}
      <AnimatePresence>
        {selectedDist && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDist(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-xl bg-white h-full shadow-2xl z-10 flex flex-col overflow-hidden text-left"
            >
              <div className="p-6 bg-[#58051E] text-white flex items-center justify-between shrink-0">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-white/70">{selectedDist.id}</div>
                  <h2 className="text-lg font-black">{selectedDist.business_name}</h2>
                  <p className="text-xs text-white/80">{selectedDist.region}</p>
                </div>
                <button onClick={() => setSelectedDist(null)} className="p-2 hover:bg-white/10 rounded-xl">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Contact Person:</span>
                    <span className="font-bold text-slate-900">{selectedDist.contact_person}</span>
                    <div className="text-[11px] text-slate-600 mt-1">{selectedDist.phone}</div>
                    <div className="text-[11px] text-slate-600">{selectedDist.email}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Credit & Terms:</span>
                    <span className="font-bold text-slate-900">₹{Number(selectedDist.credit_limit || 0).toLocaleString('en-IN')}</span>
                    <div className="text-[11px] text-slate-600 mt-1">{selectedDist.credit_period_days || 30} Days Net Period</div>
                    <div className="text-[11px] text-emerald-700 font-black">Status: {selectedDist.payment_status}</div>
                  </div>
                </div>

                {/* Products Distributed */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-slate-900">Distributed Products Catalog</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedDist.products_distributed || ['Green Peas 1kg', 'Sweet Corn 500g', 'Paneer Block 1kg', 'French Fries Premium']).map(p => (
                      <span key={p} className="text-xs font-bold px-3 py-1 bg-blue-50 text-blue-800 rounded-lg border border-blue-200">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Activity Logging */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-[#58051E]" /> Activity Log & Notes ({selectedDist.notes?.length || 0})
                  </h3>

                  <form onSubmit={handleAddNote} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex gap-1.5">
                      {(['call', 'visit', 'complaint', 'note'] as const).map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setNoteType(t)}
                          className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            noteType === t ? 'bg-[#58051E] text-white' : 'bg-white text-slate-600 border border-slate-200'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Add interaction note..."
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
                    />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={isSubmittingNote || !noteText.trim()} className="bg-[#58051E] text-white text-[10px] py-1 px-3">
                        Post Log
                      </Button>
                    </div>
                  </form>

                  <div className="space-y-2">
                    {selectedDist.notes?.map(n => (
                      <div key={n.id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400">
                          <span className="uppercase text-[#58051E]">{n.type}</span>
                          <span>{new Date(n.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-800 font-medium">{n.text}</p>
                        <div className="text-[10px] text-slate-400">By {n.author}</div>
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
                <h3 className="font-black text-sm text-slate-900">Register Distributor Entity</h3>
                <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <form onSubmit={handleCreateDist} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Business Name *</label>
                  <input required placeholder="e.g. Apex Cold Logistics Ltd" value={newDist.business_name} onChange={e => setNewDist({ ...newDist, business_name: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Contact Person *</label>
                    <input required placeholder="e.g. Rajesh Sharma" value={newDist.contact_person} onChange={e => setNewDist({ ...newDist, contact_person: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone</label>
                    <input placeholder="+91 98200 00000" value={newDist.phone} onChange={e => setNewDist({ ...newDist, phone: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Territory</label>
                    <input placeholder="Western Zone (Maharashtra)" value={newDist.region} onChange={e => setNewDist({ ...newDist, region: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Credit Limit (INR)</label>
                    <input type="number" value={newDist.credit_limit} onChange={e => setNewDist({ ...newDist, credit_limit: Number(e.target.value) })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" className="bg-[#58051E] text-white">Save Distributor</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
