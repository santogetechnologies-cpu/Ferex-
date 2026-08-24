import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCheck, Download, Sparkles, Search } from 'lucide-react';
import { Card } from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import { usePayments } from '../hooks/usePayments';
import { createReceiptPdfBlob } from '../lib/api/payments';
import type { Receipt } from '../lib/types';

export const Receipts: React.FC = () => {
  const { user, profile } = useAuth();
  const { payments, receipts: dbReceipts } = usePayments(user?.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const studentName = profile?.full_name || user?.email?.split('@')[0] || 'Student';

  // Merge DB receipts with paid payments for full coverage
  const receipts: (Receipt & { payment_method?: string; student_name?: string })[] = ([
    ...dbReceipts,
    ...payments
      .filter(p => p.status === 'Paid' || p.status === 'Verified')
      .map(p => ({
        id: `REC-${p.id.slice(0, 8)}`,
        student_id: p.student_id,
        payment_id: p.id,
        receipt_no: `REC-${p.ref_no || p.id.slice(0, 6)}`,
        description: p.title || p.description || 'Payment Receipt',
        amount: Number(p.amount),
        currency: p.currency || 'INR',
        payment_method: p.payment_method,
        student_name: p.student_name || studentName,
        issued_at: p.paid_at || p.created_at || new Date().toISOString(),
        created_at: p.created_at || new Date().toISOString(),
      }))
  ].filter((r, idx, self) =>
    idx === self.findIndex(t => t.id === r.id || t.receipt_no === r.receipt_no)
  )) as any[];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleDownload = (rec: any) => {
    const blob = createReceiptPdfBlob({
      receipt_no: rec.receipt_no || rec.id,
      student_name: rec.student_name || studentName,
      amount: Number(rec.amount) || 0,
      currency: rec.currency || 'INR',
      payment_method: rec.payment_method,
      description: rec.description,
      issued_at: rec.issued_at,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${rec.receipt_no || rec.id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded Receipt: ${rec.receipt_no || rec.id}.pdf`);
  };

  const filtered = receipts.filter(r => {
    const text = `${r.receipt_no} ${r.description}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  const totalReceived = receipts.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  return (
    <div className="space-y-6 text-left relative min-h-[500px]">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[#6A1B2E] text-white px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" /> {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#6A1B2E]/5 text-[#6A1B2E] flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </span>
            Payment Receipts
          </h1>
          <p className="text-sm font-semibold text-slate-500">
            Bank-style payment confirmations for every cleared transaction. Download as PDF anytime.
          </p>
        </div>
        {totalReceived > 0 && (
          <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-center shrink-0">
            <p className="text-[9.5px] font-extrabold uppercase text-emerald-700">Total Received</p>
            <p className="text-sm font-black text-emerald-900">INR {totalReceived.toLocaleString('en-IN')}</p>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/70 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by receipt number or description..."
            className="w-full h-10 pl-9 pr-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
          />
        </div>
      </div>

      {/* Receipts Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200/70 rounded-2xl p-12 text-center shadow-xs">
          <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No Payment Receipts Yet</h3>
          <p className="text-xs font-semibold text-slate-400 mt-1 max-w-sm mx-auto">
            Once a payment is verified and cleared, an official receipt will appear here for download.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(rec => (
            <Card key={rec.id} className="p-5 border border-slate-200/80 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between bg-white">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[10px] font-black text-[#6A1B2E] uppercase font-mono tracking-wide">{rec.receipt_no || rec.id}</span>
                    <h3 className="text-sm font-black text-slate-900 leading-snug mt-0.5">{rec.description || 'Payment Receipt'}</h3>
                  </div>
                  <span className="text-[9.5px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 border rounded-full bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
                    Cleared
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Amount Received:</span>
                  <span className="text-sm font-black text-emerald-700">INR {Number(rec.amount || 0).toLocaleString('en-IN')}</span>
                </div>

                {rec.payment_method && (
                  <p className="text-[10.5px] font-semibold text-slate-400">
                    Method: <span className="text-slate-700 font-bold">{rec.payment_method}</span>
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400">
                  {new Date(rec.issued_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <button
                  onClick={() => handleDownload(rec)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> PDF Receipt
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
