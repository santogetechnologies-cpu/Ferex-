import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Eye, CheckCircle2, X, CreditCard, Clock, Sparkles, AlertCircle, ExternalLink
} from 'lucide-react';
import { usePayments } from '../../hooks/usePayments';
import type { Payment } from '../../lib/types';

export const AdminPayments: React.FC = () => {
  const { payments, loading, verify, reject } = usePayments();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Pending Verification');
  const [viewPayment, setViewPayment] = useState<Payment | null>(null);
  const [rejectPaymentItem, setRejectPaymentItem] = useState<Payment | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [toast, setToast] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleVerify = async (p: Payment) => {
    try {
      setIsProcessing(p.id);
      await verify(p.id, 'Verified & Approved by Admin');
      if (viewPayment?.id === p.id) setViewPayment(null);
      showToast(`Payment of ₹${p.amount.toLocaleString()} for ${p.student_name || 'Student'} verified and approved!`);
    } catch (err: any) {
      showToast(`Error verifying payment: ${err.message || 'Verification failed'}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectPaymentItem) return;
    if (!rejectionNotes.trim()) {
      showToast('Please provide rejection reason / feedback for student.');
      return;
    }

    try {
      setIsProcessing(rejectPaymentItem.id);
      await reject(rejectPaymentItem.id, rejectionNotes.trim());
      setRejectPaymentItem(null);
      setRejectionNotes('');
      if (viewPayment?.id === rejectPaymentItem.id) setViewPayment(null);
      showToast(`Payment marked as Rejected. Student notified to re-upload proof.`);
    } catch (err: any) {
      showToast(`Error rejecting payment: ${err.message || 'Action failed'}`);
    } finally {
      setIsProcessing(null);
    }
  };

  // Filter logic
  const filtered = payments.filter(p => {
    const statusMatch =
      filterStatus === 'All' ||
      (filterStatus === 'Pending Verification' && (p.status === 'Pending Verification' || p.status === 'Pending')) ||
      (filterStatus === 'Paid' && (p.status === 'Paid' || p.status === 'Verified')) ||
      (filterStatus === 'Rejected' && p.status === 'Rejected');

    const sName = String(p.student_name || p.users?.full_name || p.users?.email || '').toLowerCase();
    const refMatch = String(p.ref_no || p.utr_number || p.id).toLowerCase();
    const titleMatch = String(p.title || p.description || '').toLowerCase();
    const searchMatch = sName.includes(search.toLowerCase()) || refMatch.includes(search.toLowerCase()) || titleMatch.includes(search.toLowerCase());

    return statusMatch && searchMatch;
  });

  const pendingCount = payments.filter(p => p.status === 'Pending Verification' || p.status === 'Pending').length;
  const paidCount = payments.filter(p => p.status === 'Paid' || p.status === 'Verified').length;
  const rejectedCount = payments.filter(p => p.status === 'Rejected').length;

  return (
    <div className="space-y-6 relative text-left">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#6A1B2E]" /> Student Payment Verification Portal
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">
            Audit student installment payments, UTR transaction numbers, and approve official receipts.
          </p>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">Pending Verification</span>
            <p className="text-2xl font-black text-amber-900 mt-0.5">{pendingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">Verified & Approved</span>
            <p className="text-2xl font-black text-emerald-900 mt-0.5">{paidCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-red-200 bg-red-50/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-800">Rejected / Re-upload</span>
            <p className="text-2xl font-black text-red-900 mt-0.5">{rejectedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-800 flex items-center justify-center font-bold">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/70 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, transaction ref, or installment title..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'Pending Verification', label: `Pending (${pendingCount})` },
            { id: 'Paid', label: `Verified (${paidCount})` },
            { id: 'Rejected', label: `Rejected (${rejectedCount})` },
            { id: 'All', label: `All (${payments.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filterStatus === tab.id
                  ? 'bg-[#6A1B2E] text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payment Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center text-xs font-bold text-slate-400">Loading student financial records...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <CreditCard className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-extrabold text-slate-700">No Payments Match Filter</p>
            <p className="text-[11px] font-semibold text-slate-400">No student payment records found under "{filterStatus}".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                <tr>
                  <th className="p-3.5 pl-5">Student</th>
                  <th className="p-3.5">Installment Milestone</th>
                  <th className="p-3.5">Amount (₹)</th>
                  <th className="p-3.5">Payment Method</th>
                  <th className="p-3.5">Transaction UTR / Ref</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-5 text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filtered.map(p => {
                  const isPending = p.status === 'Pending Verification' || p.status === 'Pending';
                  const isPaid = p.status === 'Paid' || p.status === 'Verified';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 pl-5">
                        <p className="font-extrabold text-slate-900">{p.student_name || p.users?.full_name || 'Student'}</p>
                        <p className="text-[10px] text-slate-400">{p.users?.email || p.student_id || 'STU-RECORD'}</p>
                      </td>

                      <td className="p-3.5">
                        <p className="font-bold text-slate-900">{p.title || p.description || 'Installment Fee'}</p>
                        <p className="text-[10px] text-slate-400">{p.payment_type || 'Installment'}</p>
                      </td>

                      <td className="p-3.5 font-black text-slate-900">
                        ₹{Number(p.amount).toLocaleString()}
                      </td>

                      <td className="p-3.5">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-bold border border-slate-200">
                          {p.payment_method || 'UPI / Wire Transfer'}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono text-[11px] font-bold text-slate-800">
                        {p.utr_number || p.ref_no || p.id.slice(0, 8)}
                      </td>

                      <td className="p-3.5">
                        <span className={`text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-full border ${isPaid
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isPending
                              ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                          {isPending ? '⏳ Pending Review' : p.status}
                        </span>
                      </td>

                      <td className="p-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewPayment(p)}
                            title="View Receipt Proof"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {isPending && (
                            <>
                              <button
                                onClick={() => handleVerify(p)}
                                disabled={isProcessing === p.id}
                                title="Approve Payment"
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-2xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Verify
                              </button>
                              <button
                                onClick={() => {
                                  setRejectPaymentItem(p);
                                  setRejectionNotes('');
                                }}
                                disabled={isProcessing === p.id}
                                title="Reject Payment"
                                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold border border-red-200 rounded-lg text-xs flex items-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" /> Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Payment Proof Slide-Over Drawer */}
      <AnimatePresence>
        {viewPayment && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-50" onClick={() => setViewPayment(null)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed right-0 top-0 bottom-0 w-full md:w-[480px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-100 text-left">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Payment Verification Detail</h3>
                  <p className="text-xs font-semibold text-slate-400">{viewPayment.title || viewPayment.description}</p>
                </div>
                <button onClick={() => setViewPayment(null)} className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between"><span className="text-slate-500 font-semibold">Student Name:</span><span className="font-extrabold text-slate-900">{viewPayment.student_name || 'Student'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-semibold">Amount Paid:</span><span className="font-black text-[#6A1B2E] text-sm">₹{Number(viewPayment.amount).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-semibold">Payment Method:</span><span className="font-bold text-slate-900">{viewPayment.payment_method || 'UPI / Transfer'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-semibold">Transaction UTR:</span><span className="font-mono font-extrabold text-blue-700">{viewPayment.utr_number || viewPayment.ref_no || viewPayment.id}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-semibold">Status:</span><span className="font-extrabold text-amber-800">{viewPayment.status}</span></div>
                </div>

                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">Attached Receipt Proof</h4>
                  {viewPayment.receipt_url ? (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-100 text-center p-4 space-y-2">
                      <img src={viewPayment.receipt_url} alt="Receipt Proof" className="max-h-60 mx-auto object-contain rounded-lg" />
                      <a href={viewPayment.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline">
                        Open Receipt File <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs font-semibold text-slate-400">
                      No image receipt uploaded. Verified by UTR reference number.
                    </div>
                  )}
                </div>
              </div>

              {(viewPayment.status === 'Pending Verification' || viewPayment.status === 'Pending') && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-2">
                  <button onClick={() => handleVerify(viewPayment)} className="flex-1 h-9.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-1 shadow-xs">
                    <CheckCircle2 className="w-4 h-4" /> Verify & Approve
                  </button>
                  <button onClick={() => { setRejectPaymentItem(viewPayment); setRejectionNotes(''); }} className="flex-1 h-9.5 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 flex items-center justify-center gap-1">
                    <X className="w-4 h-4" /> Reject Payment
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Reject Payment Notes Modal */}
      <AnimatePresence>
        {rejectPaymentItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setRejectPaymentItem(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100 z-10 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-sm font-black text-slate-900">Reject Payment Proof</h3>
                <button onClick={() => setRejectPaymentItem(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleRejectSubmit} className="space-y-4">
                <p className="text-xs font-semibold text-slate-500">
                  Provide reason for rejecting the payment submitted by <span className="font-extrabold text-slate-900">{rejectPaymentItem.student_name || 'Student'}</span>.
                </p>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Rejection Feedback Reason *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={rejectionNotes}
                    onChange={(e) => setRejectionNotes(e.target.value)}
                    placeholder="e.g. UTR number not found in bank statement, please upload valid payment receipt."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => setRejectPaymentItem(null)} className="flex-1 h-9 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50">Cancel</button>
                  <button type="submit" className="flex-1 h-9 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 shadow-xs">Confirm Rejection</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
