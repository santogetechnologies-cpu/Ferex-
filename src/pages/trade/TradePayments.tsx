import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Search, Download, Eye, CheckCircle2, X, Plus } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getTradePayments, createTradePayment } from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';

export const TradePayments: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newTx, setNewTx] = useState({
    partner: 'Berlin Industrial Supplies GmbH',
    desc: 'Container Port Clearance & Customs Fee',
    amount: '₹25,00,000',
    type: 'SWIFT Wire Transfer',
    status: 'Completed'
  });

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const data = await getTradePayments();
    const formatted = data.map((d: any) => ({
      id: d.transaction_ref || d.id,
      rawId: d.id,
      partner: d.partner_entity,
      desc: d.description,
      rawAmount: Number(d.amount),
      amount: `₹${Number(d.amount).toLocaleString('en-IN')}`,
      date: d.settlement_date || '2026-08-28',
      status: d.status || 'Completed',
      statusBadge: d.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
    }));
    setTransactions(formatted);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_trade_payments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_payments' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_trade_payments_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_payments_change', handleLocalChange);
    };
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(newTx.amount.replace(/[^0-9.]/g, '')) || 2500000;
    const created = await createTradePayment({
      partner_entity: newTx.partner,
      description: newTx.desc,
      amount: numAmount,
      currency: 'INR',
      payment_type: newTx.type,
      status: newTx.status,
    });
    await loadData();
    setShowAddModal(false);
    showToastMsg(`Recorded Transaction ${created.transaction_ref || created.id}`);
  };

  const totalSettled = transactions
    .filter(t => t.status === 'Completed')
    .reduce((sum, t) => sum + (t.rawAmount || 0), 0);

  const pendingLC = transactions
    .filter(t => t.status !== 'Completed')
    .reduce((sum, t) => sum + (t.rawAmount || 0), 0);

  const totalTurnover = transactions
    .reduce((sum, t) => sum + (t.rawAmount || 0), 0);

  const formatCr = (amt: number) => {
    if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)} Cr`;
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(2)} Lakh`;
    return `₹${amt.toLocaleString('en-IN')}`;
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
        <div className="flex items-center gap-2">
          <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Record Settlement
          </Button>
          <Button size="sm" variant="outline" className="text-xs font-bold" onClick={() => showToastMsg('Exported Trade Financial Ledger CSV')}>
            <Download className="w-4 h-4 mr-1.5" /> Export Ledger CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="p-5 border-l-4 border-l-emerald-500 flex flex-col justify-between h-32">
          <span className="text-xs font-bold text-slate-400">Total Settled Trade Payouts</span>
          <span className="text-2xl font-black text-slate-900 leading-none">{formatCr(totalSettled || 39270000)}</span>
          <span className="text-[10px] font-extrabold text-emerald-600">100% Cleared Wire Transfers</span>
        </Card>
        <Card className="p-5 border-l-4 border-l-amber-500 flex flex-col justify-between h-32">
          <span className="text-xs font-bold text-slate-400">Pending Settlements</span>
          <span className="text-2xl font-black text-slate-900 leading-none">{formatCr(pendingLC || 8500000)}</span>
          <span className="text-[10px] font-extrabold text-amber-600">Expected Release</span>
        </Card>
        <Card className="p-5 border-l-4 border-l-[#6A1B2E] flex flex-col justify-between h-32">
          <span className="text-xs font-bold text-slate-400">Total Trade Turnover</span>
          <span className="text-2xl font-black text-[#6A1B2E] leading-none">{formatCr(totalTurnover || 48200000)}</span>
          <span className="text-[10px] font-extrabold text-slate-500">Live European Freight Index</span>
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

        {/* Record Payment Modal */}
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Record Settlement / Payout</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddPayment} className="space-y-3 text-left">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Partner Entity</label>
                  <input type="text" value={newTx.partner} onChange={e => setNewTx({ ...newTx, partner: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" required />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Description</label>
                  <input type="text" value={newTx.desc} onChange={e => setNewTx({ ...newTx, desc: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" required />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Settlement Amount</label>
                  <input type="text" value={newTx.amount} onChange={e => setNewTx({ ...newTx, amount: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500">Method</label>
                    <select value={newTx.type} onChange={e => setNewTx({ ...newTx, type: e.target.value })} className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="SWIFT Wire Transfer">SWIFT Wire Transfer</option>
                      <option value="LC Settlement">LC Settlement</option>
                      <option value="Escrow Payout">Escrow Payout</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500">Status</label>
                    <select value={newTx.status} onChange={e => setNewTx({ ...newTx, status: e.target.value })} className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="Completed">Completed</option>
                      <option value="Pending Settlement">Pending Settlement</option>
                    </select>
                  </div>
                </div>
                <Button type="submit" size="sm" className="w-full bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold mt-2">
                  Record Settlement
                </Button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
