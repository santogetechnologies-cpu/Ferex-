import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Search, Plus, X, CheckCircle2, Eye } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

const initialPayments = [
  { id: 'PAY-001', client: 'Reliance Digital', invoice: 'INV-2026-88', amount: '₹4,50,000', method: 'NEFT', date: '2026-08-04', status: 'Received', ref: 'TXN8820048' },
  { id: 'PAY-002', client: 'HDFC Life Insurance', invoice: 'INV-2026-85', amount: '₹4,50,000', method: 'RTGS', date: '2026-07-28', status: 'Received', ref: 'TXN7750031' },
  { id: 'PAY-003', client: 'BigBasket Growth', invoice: 'INV-2026-91', amount: '₹85,000', method: 'IMPS', date: '', status: 'Pending', ref: '' },
  { id: 'PAY-004', client: 'Tata Motors Digital', invoice: 'INV-2026-89', amount: '₹2,80,000', method: 'Cheque', date: '', status: 'In Verification', ref: 'CHQ0042884' },
];

const statusClr: Record<string, string> = {
  'Received': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Pending': 'bg-amber-50 text-amber-700 border-amber-200',
  'In Verification': 'bg-blue-50 text-blue-700 border-blue-200',
  'Failed': 'bg-red-50 text-red-700 border-red-200',
};

export const DigitalPayments: React.FC = () => {
  const [payments, setPayments] = useState(initialPayments);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [toast, setToast] = useState('');
  const [newPay, setNewPay] = useState({ client: '', invoice: '', amount: '', method: 'NEFT', ref: '' });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setPayments([{ id: `PAY-${Math.floor(Math.random() * 900 + 5)}`, date: new Date().toISOString().slice(0, 10), status: 'In Verification', ...newPay }, ...payments]);
    setShowAddModal(false);
    showToast('Payment recorded!');
    setNewPay({ client: '', invoice: '', amount: '', method: 'NEFT', ref: '' });
  };

  const filtered = payments.filter(p => {
    const matchS = p.client.toLowerCase().includes(search.toLowerCase()) || p.invoice.toLowerCase().includes(search.toLowerCase());
    const matchF = filterStatus === 'All' || p.status === filterStatus;
    return matchS && matchF;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2"><CreditCard className="w-5 h-5 text-[#6A1B2E]" /> Payment Receipts & Collections</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Track all inbound payments from clients. Record bank transfers, verify cheques, and reconcile against invoices.</p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Record Payment
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[['Received', payments.filter(p => p.status === 'Received').length, 'text-emerald-700'],
          ['Pending', payments.filter(p => p.status === 'Pending').length, 'text-amber-700'],
          ['In Verification', payments.filter(p => p.status === 'In Verification').length, 'text-blue-700']
        ].map(([l, c, clr], idx) => (
          <Card key={idx} className="p-4 border border-slate-200/70 shadow-xs text-center">
            <div className={`text-2xl font-black ${clr}`}>{c}</div>
            <div className="text-[10px] font-extrabold uppercase text-slate-400 mt-0.5">{l}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by client or invoice..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <div className="flex gap-1.5">
          {['All', 'Received', 'Pending', 'In Verification'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterStatus === s ? 'bg-[#6A1B2E] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{s}</button>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Payment ID</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Invoice</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-black text-[#6A1B2E]">{p.id}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{p.client}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-600">{p.invoice}</td>
                  <td className="py-3.5 px-4 font-black text-slate-900">{p.amount}</td>
                  <td className="py-3.5 px-4">{p.method}</td>
                  <td className="py-3.5 px-4">{p.date || '—'}</td>
                  <td className="py-3.5 px-4"><span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${statusClr[p.status]}`}>{p.status}</span></td>
                  <td className="py-3.5 px-4 text-right">
                    <button onClick={() => setSelectedPayment(p)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><Eye className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Record Inbound Payment</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-3">
                <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Client Name</label>
                  <input type="text" required value={newPay.client} onChange={e => setNewPay({...newPay, client: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Invoice ID</label>
                    <input type="text" required value={newPay.invoice} onChange={e => setNewPay({...newPay, invoice: e.target.value})} placeholder="INV-2026-XX" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Amount (₹)</label>
                    <input type="text" required value={newPay.amount} onChange={e => setNewPay({...newPay, amount: e.target.value})} placeholder="₹0" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Payment Method</label>
                    <select value={newPay.method} onChange={e => setNewPay({...newPay, method: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      {['NEFT', 'RTGS', 'IMPS', 'Cheque', 'UPI'].map(m => <option key={m}>{m}</option>)}
                    </select></div>
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Reference No.</label>
                    <input type="text" value={newPay.ref} onChange={e => setNewPay({...newPay, ref: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Record Payment</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedPayment && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedPayment(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">Payment Details — {selectedPayment.id}</h3>
                <button onClick={() => setSelectedPayment(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-[#6A1B2E]">{selectedPayment.id}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${statusClr[selectedPayment.status]}`}>{selectedPayment.status}</span>
                </div>
                <h4 className="text-sm font-black text-slate-900">{selectedPayment.client}</h4>
                <div className="text-xs font-semibold text-slate-600 space-y-1">
                  <p>Invoice: <span className="font-black text-slate-900">{selectedPayment.invoice}</span></p>
                  <p>Amount: <span className="text-xl font-black text-slate-900">{selectedPayment.amount}</span></p>
                  <p>Method: {selectedPayment.method}</p>
                  <p>Reference: {selectedPayment.ref || '—'}</p>
                  <p>Date: {selectedPayment.date || 'Pending'}</p>
                </div>
              </div>
              {selectedPayment.status === 'In Verification' && (
                <Button size="sm" className="w-full mt-4 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => { setPayments(payments.map(p => p.id === selectedPayment.id ? { ...p, status: 'Received', date: new Date().toISOString().slice(0, 10) } : p)); setSelectedPayment(null); showToast('Payment verified!'); }}>
                  Mark as Received
                </Button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
