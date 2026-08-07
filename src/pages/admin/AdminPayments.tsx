import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Eye, Download, CheckCircle2, X, CreditCard, TrendingUp, Clock } from 'lucide-react';

type PayStatus = 'Paid' | 'Pending' | 'Overdue' | 'Refunded';

interface Payment {
  id: string; studentId: string; studentName: string;
  description: string; amount: string; status: PayStatus; date: string; method: string; reference: string;
}

const PAYMENTS: Payment[] = [
  { id: 'PAY-001', studentId: 'FX-2026-001', studentName: 'Ashly', description: 'Application Processing Fee', amount: '₹15,000', status: 'Paid', date: 'Nov 20, 2025', method: 'Online Transfer', reference: 'REF-AX29184' },
  { id: 'PAY-002', studentId: 'FX-2026-002', studentName: 'Rahul Mehta', description: 'University Registration Fee', amount: '₹45,000', status: 'Pending', date: 'Aug 1, 2026', method: 'Bank Transfer', reference: 'REF-RM91827' },
  { id: 'PAY-003', studentId: 'FX-2026-003', studentName: 'Priya Sharma', description: 'Visa Assistance Fee', amount: '₹8,500', status: 'Paid', date: 'Jan 10, 2026', method: 'Credit Card', reference: 'REF-PS30291' },
  { id: 'PAY-004', studentId: 'FX-2026-004', studentName: 'Amir Hassan', description: 'Accommodation Booking Fee', amount: 'AED 2,500', status: 'Paid', date: 'Oct 30, 2025', method: 'Online Transfer', reference: 'REF-AH10291' },
  { id: 'PAY-005', studentId: 'FX-2026-005', studentName: 'Fatima Al-Rashid', description: 'Document Attestation Fee', amount: 'QAR 1,200', status: 'Refunded', date: 'Dec 5, 2025', method: 'Bank Transfer', reference: 'REF-FA50299' },
  { id: 'PAY-006', studentId: 'FX-2026-006', studentName: 'Carlos Rivera', description: 'Counseling & Admission Fee', amount: '₹25,000', status: 'Overdue', date: 'Jul 15, 2026', method: '—', reference: '—' },
  { id: 'PAY-007', studentId: 'FX-2026-007', studentName: 'Nadia Kowalski', description: 'University Application Fee', amount: 'PLN 450', status: 'Paid', date: 'Sep 15, 2025', method: 'Online Transfer', reference: 'REF-NK00912' },
  { id: 'PAY-008', studentId: 'FX-2026-008', studentName: 'Yusuf Al-Farsi', description: 'Registration & Processing Fee', amount: 'OMR 220', status: 'Pending', date: 'Aug 5, 2026', method: '—', reference: '—' },
];

const STATUS_COLORS: Record<PayStatus, string> = {
  'Paid': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'Pending': 'bg-amber-50 text-amber-700 border-amber-100',
  'Overdue': 'bg-red-50 text-red-700 border-red-100',
  'Refunded': 'bg-slate-50 text-slate-600 border-slate-200',
};

export const AdminPayments: React.FC = () => {
  const [payments, setPayments] = useState(PAYMENTS);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [viewPayment, setViewPayment] = useState<Payment | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const filtered = payments.filter(p =>
    (filter === 'All' || p.status === filter) &&
    (p.studentName.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()))
  );

  const markPaid = (id: string) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'Paid' as PayStatus, method: 'Manual — Admin', date: 'Today' } : p));
    setViewPayment(null);
    showToast('Payment marked as paid.');
  };

  const summary = {
    total: payments.length,
    paid: payments.filter(p => p.status === 'Paid').length,
    pending: payments.filter(p => p.status === 'Pending').length,
    overdue: payments.filter(p => p.status === 'Overdue').length,
  };

  return (
    <div className="space-y-5 relative">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl text-sm font-bold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" /> {toast}
        </div>
      )}

      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Payments</h1>
        <p className="text-xs font-semibold text-slate-400 mt-0.5">Track all student payments and invoices</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Records', value: summary.total, icon: CreditCard, color: 'bg-[#6A1B2E]/10 text-[#6A1B2E]' },
          { label: 'Paid', value: summary.paid, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Pending', value: summary.pending, icon: Clock, color: 'bg-amber-50 text-amber-600' },
          { label: 'Overdue', value: summary.overdue, icon: TrendingUp, color: 'bg-red-50 text-red-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color} mb-3`}>
              <Icon className="w-4.5 h-4.5" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{value}</p>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {['All', 'Paid', 'Pending', 'Overdue', 'Refunded'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`h-8 px-3 rounded-xl text-[10px] font-extrabold border transition-all
              ${filter === f ? 'bg-[#6A1B2E] text-white border-[#6A1B2E]' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
            {f}
          </button>
        ))}
        <div className="ml-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payments..."
            className="h-9 pl-8 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-300 focus:outline-none focus:border-[#6A1B2E]/40 w-52" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-xs min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-50 bg-slate-50/50">
              {['Student', 'Payment ID', 'Description', 'Amount', 'Status', 'Date', 'Actions'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/40 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#6A1B2E] flex items-center justify-center text-white text-[9px] font-extrabold shrink-0">
                      {p.studentName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900">{p.studentName}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{p.studentId}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 font-bold text-slate-500">{p.id}</td>
                <td className="px-5 py-4 text-slate-700 font-semibold max-w-[160px] truncate">{p.description}</td>
                <td className="px-5 py-4 font-extrabold text-slate-900">{p.amount}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                </td>
                <td className="px-5 py-4 text-slate-500 font-semibold">{p.date}</td>
                <td className="px-5 py-4">
                  <div className="flex gap-1.5">
                    <button onClick={() => setViewPayment(p)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="View"><Eye className="w-3.5 h-3.5" /></button>
                    <button onClick={() => {
                      const a = document.createElement('a');
                      a.href = 'data:text/plain,Ferex Payment Invoice';
                      a.download = `Invoice_${p.id}.pdf`;
                      a.click();
                    }} className="p-1.5 rounded-lg text-slate-400 hover:text-[#6A1B2E] hover:bg-[#6A1B2E]/10 transition-all" title="Download"><Download className="w-3.5 h-3.5" /></button>
                    {(p.status === 'Pending' || p.status === 'Overdue') && (
                      <button onClick={() => markPaid(p.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all" title="Mark Paid"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment Detail Drawer */}
      <AnimatePresence>
        {viewPayment && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50" onClick={() => setViewPayment(null)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full md:w-[400px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-100">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-extrabold text-slate-900">Payment Details</h3>
                <button onClick={() => setViewPayment(null)} className="p-2 rounded-full hover:bg-slate-50 text-slate-400"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="p-5 bg-[#6A1B2E] rounded-2xl text-white">
                  <p className="text-[10px] font-extrabold opacity-60 uppercase tracking-wider">{viewPayment.description}</p>
                  <p className="text-3xl font-extrabold mt-2">{viewPayment.amount}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white`}>{viewPayment.status}</span>
                    <span className="text-[10px] font-semibold opacity-60">{viewPayment.date}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    { label: 'Student', value: viewPayment.studentName },
                    { label: 'Payment ID', value: viewPayment.id },
                    { label: 'Reference', value: viewPayment.reference },
                    { label: 'Method', value: viewPayment.method },
                    { label: 'Date', value: viewPayment.date },
                    { label: 'Status', value: viewPayment.status },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase">{label}</span>
                      <span className="text-xs font-bold text-slate-800">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 space-y-2">
                <button onClick={() => {
                  const a = document.createElement('a');
                  a.href = 'data:text/plain,Ferex Payment Invoice';
                  a.download = `Invoice_${viewPayment.id}.pdf`;
                  a.click();
                }} className="w-full h-9 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Download Invoice
                </button>
                {(viewPayment.status === 'Pending' || viewPayment.status === 'Overdue') && (
                  <button onClick={() => markPaid(viewPayment.id)} className="w-full h-9 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark as Paid
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
