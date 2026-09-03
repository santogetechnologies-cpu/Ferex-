import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Search, Download, Eye, CheckCircle2, X, Plus, Trash2 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getTradePayments, createTradePayment, updateTradePaymentStatus, deleteTradePayment } from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';

export const TradePayments: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newTx, setNewTx] = useState({
    partner: '',
    desc: 'Machinery Export Clearance Settlement',
    amount: '₹42,50,000',
    type: 'SWIFT Wire Transfer',
    status: 'Completed',
    date: new Date().toISOString().split('T')[0]
  });

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTradePayments();
      if (Array.isArray(data)) {
        const formatted = data.map((d: any) => ({
          id: d.transaction_ref || d.id,
          rawId: d.id,
          partner: d.partner_entity,
          desc: d.description,
          rawAmount: Number(d.amount),
          amount: `₹${Number(d.amount).toLocaleString('en-IN')}`,
          date: d.settlement_date || '2026-08-28',
          type: d.payment_type || 'SWIFT Wire Transfer',
          status: d.status || 'Completed',
          statusBadge: d.status === 'Completed'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : d.status === 'Processing'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
        }));
        setTransactions(formatted);
      } else {
        setTransactions([]);
      }
    } finally {
      setLoading(false);
    }
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
    if (!newTx.partner) return;
    const numAmount = parseFloat(newTx.amount.replace(/[^0-9.]/g, '')) || 2500000;
    const created = await createTradePayment({
      partner_entity: newTx.partner,
      description: newTx.desc,
      amount: numAmount,
      currency: 'INR',
      payment_type: newTx.type,
      status: newTx.status,
      settlement_date: newTx.date,
    });
    await loadData();
    setShowAddModal(false);
    showToastMsg(`Recorded Transaction ${created.transaction_ref || created.id}`);
    setNewTx({
      partner: '',
      desc: 'Machinery Export Clearance Settlement',
      amount: '₹42,50,000',
      type: 'SWIFT Wire Transfer',
      status: 'Completed',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const handleStatusChange = async (id: string, rawId: string, newStatus: string) => {
    await updateTradePaymentStatus(rawId || id, newStatus);
    showToastMsg(`Transaction status updated to ${newStatus}`);
    await loadData();
  };

  const handleDeletePayment = async (id: string, rawId?: string) => {
    await deleteTradePayment(rawId || id);
    setTransactions(prev => prev.filter(t => t.id !== id && t.rawId !== rawId));
    showToastMsg(`Removed transaction record ${id}`);
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
    if (!amt || amt === 0) return '₹0';
    if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)} Cr`;
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(2)} Lakh`;
    return `₹${amt.toLocaleString('en-IN')}`;
  };

  const filteredTx = transactions.filter(t =>
    (t.partner || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.desc || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.id || '').toLowerCase().includes(searchQuery.toLowerCase())
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
            <CreditCard className="w-5 h-5 text-[#6A1B2E]" /> Global Trade Payments & SWIFT Ledger
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Trade Console • SWIFT Wire transfers, Letter of Credit settlement confirmations, and port clearing fees in INR (₹).
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Record Settlement
        </Button>
      </div>

      {/* Dynamic Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-emerald-500 border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase text-slate-400">Total Settled Volume</span>
          <div className="text-2xl font-black text-slate-900 my-1">{formatCr(totalSettled)}</div>
          <span className="text-[10.5px] font-extrabold text-emerald-600">Cleared Transactions</span>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500 border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase text-slate-400">Pending Settlements</span>
          <div className="text-2xl font-black text-slate-900 my-1">{formatCr(pendingLC)}</div>
          <span className="text-[10.5px] font-extrabold text-amber-600">In SWIFT / Bank Clearance</span>
        </Card>
        <Card className="p-4 border-l-4 border-l-[#6A1B2E] border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase text-slate-400">Total Payments Turnover</span>
          <div className="text-2xl font-black text-slate-900 my-1">{formatCr(totalTurnover)}</div>
          <span className="text-[10.5px] font-extrabold text-slate-500">{transactions.length} Total Records</span>
        </Card>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search TX ref, partner, or description..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredTx.length} Transactions</span>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading payment records...</div>
      ) : filteredTx.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No payment transactions found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery ? 'No records match your query.' : 'There are no active settlement transactions recorded. Record a new payment below.'}
          </p>
          <Button size="sm" className="mt-4 bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Record Settlement
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                  <th className="py-3 px-4">Transaction Ref & Partner</th>
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
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">
                      <div>{t.partner}</div>
                      <span className="text-[10px] font-bold text-slate-400">{t.id} · {t.type}</span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{t.desc}</td>
                    <td className="py-3.5 px-4 font-black text-slate-900">{t.amount}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{t.date}</td>
                    <td className="py-3.5 px-4">
                      <select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t.id, t.rawId, e.target.value)}
                        className={`text-[10px] font-extrabold rounded-full px-2.5 py-1 border cursor-pointer ${t.statusBadge}`}
                      >
                        <option value="Completed">Completed</option>
                        <option value="Processing">Processing</option>
                        <option value="Pending Settlement">Pending Settlement</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setSelectedTx(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Inspect Voucher">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => showToastMsg(`Downloading Swift Wire Advice for ${t.id}...`)} className="p-1.5 rounded-lg text-slate-400 hover:text-[#6A1B2E] hover:bg-slate-100" title="Download Wire Receipt">
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeletePayment(t.id, t.rawId)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete Payment">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Payment Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Record Payment Settlement</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddPayment} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Partner Entity Name</label>
                  <input type="text" required value={newTx.partner} onChange={(e) => setNewTx({ ...newTx, partner: e.target.value })} placeholder="e.g. Warsaw Global Logistics Sp. z o.o." className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Description / Item Reference</label>
                  <input type="text" required value={newTx.desc} onChange={(e) => setNewTx({ ...newTx, desc: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Amount (₹ INR)</label>
                    <input type="text" required value={newTx.amount} onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Payment Method</label>
                    <select value={newTx.type} onChange={(e) => setNewTx({ ...newTx, type: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="SWIFT Wire Transfer">SWIFT Wire Transfer</option>
                      <option value="LC Settlement">LC Settlement</option>
                      <option value="Direct Bank Transfer">Direct Bank Transfer</option>
                    </select>
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save Transaction</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {selectedTx && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedTx(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">Payment Voucher Summary</h3>
                <button onClick={() => setSelectedTx(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-left">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{selectedTx.id}</span>
                  <h4 className="text-base font-black text-slate-900">{selectedTx.partner}</h4>
                  <p className="text-xs font-semibold text-slate-500">{selectedTx.desc}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Total Settled Amount</span>
                  <div className="text-xl font-black text-slate-900">{selectedTx.amount}</div>
                  <div className="text-[11px] text-slate-500 pt-1">Method: {selectedTx.type} · Date: {selectedTx.date}</div>
                </div>

                <Button size="sm" className="w-full text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => {
                  showToastMsg(`Printed Official Wire Voucher for ${selectedTx.id}`);
                }}>
                  Print Official Wire Voucher
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
