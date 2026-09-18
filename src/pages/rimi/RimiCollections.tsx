import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Search, CheckCircle2, Plus, Trash2, X, Eye, Receipt, FileText } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import {
  getRimiPayments,
  createRimiPayment,
  getRimiCustomers,
  type RimiPaymentRecord,
  type RimiCustomerRecord
} from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const RIMI_ADMIN_ROLES = ['rimi_admin', 'rimi_frozen', 'admin', 'education_admin', 'central', 'super_admin', 'superadmin'];

export const RimiCollections: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = RIMI_ADMIN_ROLES.includes(profile?.role || '');

  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<RimiPaymentRecord[]>([]);
  const [customers, setCustomers] = useState<RimiCustomerRecord[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<RimiPaymentRecord | null>(null);

  const [newPayment, setNewPayment] = useState({
    customer_id: '',
    customer_name: '',
    amount: 50000,
    payment_method: 'Bank Transfer',
    reference_no: '',
    notes: ''
  });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [payList, custList] = await Promise.all([
        getRimiPayments(),
        getRimiCustomers()
      ]);
      setPayments(payList);
      setCustomers(custList);

      if (custList.length > 0 && !newPayment.customer_id) {
        setNewPayment(prev => ({
          ...prev,
          customer_id: custList[0].id,
          customer_name: custList[0].business_name
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [newPayment.customer_id]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_rimi_payments_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_payments' }, () => loadData())
      .subscribe();

    const handleSync = () => loadData();
    window.addEventListener('ferex_rimi_payments_change', handleSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_rimi_payments_change', handleSync);
    };
  }, [loadData]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.customer_id || !newPayment.amount) return;

    try {
      const cust = customers.find(c => c.id === newPayment.customer_id);
      await createRimiPayment({
        customer_id: newPayment.customer_id,
        customer_name: cust?.business_name,
        amount: Number(newPayment.amount),
        payment_method: newPayment.payment_method,
        reference_no: newPayment.reference_no,
        notes: newPayment.notes,
        collected_by_name: profile?.full_name || 'Finance Team'
      });

      setShowAddModal(false);
      showToastMsg(`Logged payment of ₹${Number(newPayment.amount).toLocaleString('en-IN')}`);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Error logging payment: ${err.message || 'Database error'}`);
    }
  };

  const filteredPayments = payments.filter(p => {
    const s = searchQuery.toLowerCase();
    return (
      p.payment_no.toLowerCase().includes(s) ||
      p.customer_name.toLowerCase().includes(s) ||
      (p.reference_no && p.reference_no.toLowerCase().includes(s)) ||
      p.payment_method.toLowerCase().includes(s)
    );
  });

  const totalCollected = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

  return (
    <div className="space-y-6 text-left antialiased">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#58051E]" /> Payment Collections & Receivables Settlement
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Log incoming customer remittances, credit settlements, and auto-sync ledger balances.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-black text-emerald-800">
            Total Realized: ₹{totalCollected.toLocaleString('en-IN')}
          </div>
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Record Collection
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 border border-slate-200/80 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search payment reference no, customer business name..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
          />
        </div>
      </Card>

      {/* Collections Table */}
      <Card className="overflow-hidden border border-slate-200/80 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="p-3.5">Payment Ref No</th>
                <th className="p-3.5">Customer / Firm</th>
                <th className="p-3.5">Amount Collected</th>
                <th className="p-3.5">Payment Method</th>
                <th className="p-3.5">Bank / UTR Reference</th>
                <th className="p-3.5">Settlement Date</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">Loading payment collections...</td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">No collection remittances recorded.</td>
                </tr>
              ) : (
                filteredPayments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-[#58051E]" />
                        <span>{p.payment_no}</span>
                      </div>
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">{p.customer_name}</td>
                    <td className="p-3.5 font-black text-emerald-700 text-sm">
                      ₹{Number(p.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500 font-mono text-[11px]">{p.reference_no || 'Direct Transfer'}</td>
                    <td className="p-3.5 text-slate-500">{p.payment_date}</td>
                    <td className="p-3.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedPayment(p)}
                        className="text-[11px] font-bold h-7 border-slate-200"
                      >
                        <Eye className="w-3 h-3 mr-1 text-[#58051E]" /> View Receipt
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Record Collection Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900">Record Customer Remittance</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleAddPayment} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Customer Account *</label>
                  <select
                    required
                    value={newPayment.customer_id}
                    onChange={(e) => {
                      const cust = customers.find(c => c.id === e.target.value);
                      setNewPayment({
                        ...newPayment,
                        customer_id: e.target.value,
                        customer_name: cust?.business_name || ''
                      });
                    }}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.business_name} (Due: ₹{Number(c.outstanding_amount || 0).toLocaleString('en-IN')})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Remittance Amount (₹ INR) *</label>
                  <input
                    type="number"
                    required
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: Number(e.target.value) })}
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Payment Mode</label>
                    <select
                      value={newPayment.payment_method}
                      onChange={(e) => setNewPayment({ ...newPayment, payment_method: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                    >
                      <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                      <option value="UPI">UPI / QR Payment</option>
                      <option value="Cheque">Commercial Cheque</option>
                      <option value="Cash">Cash Receipt</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">UTR / Cheque Ref</label>
                    <input
                      type="text"
                      value={newPayment.reference_no}
                      onChange={(e) => setNewPayment({ ...newPayment, reference_no: e.target.value })}
                      placeholder="e.g. UTR-998822"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">Save & Settle Ledger</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Payment Receipt Drawer */}
      <AnimatePresence>
        {selectedPayment && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedPayment(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Official Remittance Receipt</h3>
                  <span className="text-[10px] font-bold text-[#58051E]">{selectedPayment.payment_no}</span>
                </div>
                <button onClick={() => setSelectedPayment(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Customer:</span>
                    <span className="font-bold text-slate-900">{selectedPayment.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Settled Amount:</span>
                    <span className="font-black text-emerald-700 text-sm">₹{Number(selectedPayment.amount).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payment Method:</span>
                    <span className="font-bold text-slate-800">{selectedPayment.payment_method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Reference No:</span>
                    <span className="font-mono font-bold text-slate-700">{selectedPayment.reference_no || 'Direct Credit'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Settlement Date:</span>
                    <span className="font-semibold text-slate-800">{selectedPayment.payment_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Collected By:</span>
                    <span className="font-semibold text-slate-800">{selectedPayment.collected_by_name || 'Finance Team'}</span>
                  </div>
                </div>

                <Button size="sm" className="w-full text-xs font-bold bg-[#58051E] hover:bg-[#430316]" onClick={() => setSelectedPayment(null)}>
                  Close Receipt
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
