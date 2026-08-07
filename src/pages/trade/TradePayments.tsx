import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Search, Download, Eye, CheckCircle2, X } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const TradePayments: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [toast, setToast] = useState('');

  const [transactions] = useState([
    { id: 'TX-TRD-9001', partner: 'Warsaw Global Logistics Sp. z o.o.', desc: 'Port Clearance & Customs Fee', amount: '₹18,20,000', date: 'Jul 28, 2026', status: 'Completed', statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { id: 'TX-TRD-9002', partner: 'Berlin Industrial Supplies GmbH', desc: 'Machinery Export Batch #4', amount: '₹42,50,000', date: 'Aug 01, 2026', status: 'Completed', statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { id: 'TX-TRD-9003', partner: 'Rotterdam Maritime Trading N.V.', desc: 'Agri-Tech Container Deposit', amount: '₹85,00,000', date: 'Aug 04, 2026', status: 'Pending Settlement', statusBadge: 'bg-amber-50 text-amber-700 border-amber-200' }
  ]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const filteredTx = transactions.filter(t =>
    t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.partner.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left antialiased">
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
            <CreditCard className="w-5 h-5 text-[#6A1B2E]" /> Global Trade Financial Ledger
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            International wire settlements, LC payouts, and container clearance ledgers.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => showToastMsg('Exported Trade Financial Ledger CSV')}>
          <Download className="w-4 h-4 mr-1.5" /> Export Ledger CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="p-5 border-l-4 border-l-emerald-500 flex flex-col justify-between h-32">
          <span className="text-xs font-bold text-slate-400">Total Settled Trade Payouts</span>
          <span className="text-2xl font-black text-slate-900 leading-none">₹3,92,70,000</span>
          <span className="text-[10px] font-extrabold text-emerald-600">100% Cleared Wire Transfers</span>
        </Card>
        <Card className="p-5 border-l-4 border-l-amber-500 flex flex-col justify-between h-32">
          <span className="text-xs font-bold text-slate-400">Pending LC Settlement</span>
          <span className="text-2xl font-black text-slate-900 leading-none">₹85,00,000</span>
          <span className="text-[10px] font-extrabold text-amber-600">Expected Rotterdam Release</span>
        </Card>
        <Card className="p-5 border-l-4 border-l-[#6A1B2E] flex flex-col justify-between h-32">
          <span className="text-xs font-bold text-slate-400">Monthly Trade Turnover</span>
          <span className="text-2xl font-black text-[#6A1B2E] leading-none">₹4.82 Cr</span>
          <span className="text-[10px] font-extrabold text-slate-500">Q3 European Freight Index</span>
        </Card>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search Tx Ref, Partner, Description..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredTx.length} Transactions Listed</span>
      </Card>

      <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                <th className="py-3 px-4">Transaction Ref</th>
                <th className="py-3 px-4">Partner Entity</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Amount (₹)</th>
                <th className="py-3 px-4">Settlement Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredTx.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-extrabold text-slate-900">{t.id}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{t.partner}</td>
                  <td className="py-3.5 px-4 text-slate-600">{t.desc}</td>
                  <td className="py-3.5 px-4 font-black text-slate-900">{t.amount}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{t.date}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${t.statusBadge}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setSelectedTx(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="View Wire Advice">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Drawer */}
      <AnimatePresence>
        {selectedTx && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedTx(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">Swift Wire Advice & Receipt</h3>
                <button onClick={() => setSelectedTx(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-left">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{selectedTx.id}</span>
                  <h4 className="text-xl font-black text-slate-900">{selectedTx.amount}</h4>
                  <p className="text-xs font-semibold text-slate-500">{selectedTx.partner}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Payment Description</span>
                  <div className="text-xs font-black text-slate-900">{selectedTx.desc}</div>
                </div>

                <Button size="sm" className="w-full text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => {
                  showToastMsg(`Printed Swift Confirmation for ${selectedTx.id}`);
                }}>
                  Print Official SWIFT Receipt
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
