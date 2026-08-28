import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Search, Download, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getAllPaymentsForAdmin } from '../../lib/api/payments';

export const CentralPayments: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const data = await getAllPaymentsForAdmin();
    const formatted = data.map((d: any) => ({
      id: d.ref_no || (d.id ? `TXN-${d.id.slice(0, 4).toUpperCase()}` : 'TXN-9021'),
      student: d.student_name || 'Student',
      amount: `₹${Number(d.amount).toLocaleString('en-IN')}`,
      type: d.payment_type || d.title || 'Admissions & Portal Fee',
      method: d.payment_method || 'UPI / Card',
      date: d.created_at ? new Date(d.created_at).toLocaleDateString() : 'Recent',
      status: d.status || 'Pending Verification',
      statusBadge: d.status === 'Paid' || d.status === 'Completed' || d.status === 'Verified' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200',
    }));
    setTransactions(formatted);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleDownloadReport = () => {
    showToastMsg('Downloading Central Financial Ledger (CSV)...');
  };

  const filteredTxns = transactions.filter(t =>
    t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#6A1B2E]" /> Global Financial Overview
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Super Admin Console • Platform revenue, university tuition wire payouts, and receipts.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={handleDownloadReport}>
          <Download className="w-4 h-4 mr-1.5" /> Export Ledger CSV
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading central payment records...</div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border border-slate-200/70 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Total Gross Volume</span>
          <span className="text-2xl font-black text-slate-900 block mt-1">₹4,82,40,000</span>
          <span className="text-[10px] font-bold text-emerald-600 mt-1 block">+22% YoY Growth</span>
        </Card>
        <Card className="p-5 border border-slate-200/70 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Payouts Authorized</span>
          <span className="text-2xl font-black text-slate-900 block mt-1">₹3,40,000</span>
          <span className="text-[10px] font-bold text-slate-500 mt-1 block">To European Campuses</span>
        </Card>
        <Card className="p-5 border border-slate-200/70 shadow-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Pending Clearances</span>
          <span className="text-2xl font-black text-[#6A1B2E] block mt-1">₹12,500</span>
          <span className="text-[10px] font-bold text-amber-600 mt-1 block">1 Transaction Review</span>
        </Card>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search transaction ID or student..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
      </Card>

      <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Type & Method</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredTxns.map((txn) => (
                <tr key={txn.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-extrabold text-slate-900">{txn.id}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{txn.student}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{txn.type}</div>
                    <div className="text-[10px] text-slate-400">{txn.method}</div>
                  </td>
                  <td className="py-3.5 px-4 font-black text-slate-900">{txn.amount}</td>
                  <td className="py-3.5 px-4 text-slate-500">{txn.date}</td>
                  <td className="py-3.5 px-4 text-right">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${txn.statusBadge}`}>
                      {txn.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
