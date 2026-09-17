import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, Search, Plus, CheckCircle2, Clock, Send,
  Download, Building2, AlertCircle, RefreshCw, X,
  FileCheck2, DollarSign, ArrowUpRight, ShieldCheck,
  Calculator, Check, Sparkles, Receipt
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getTradePayments,
  recordTradePayment,
  sendPaymentReminder,
  getTradeOrders,
  TRADE_CURRENCIES,
  type TradePaymentRecord,
  type TradeOrder
} from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export const TradePayments: React.FC = () => {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<TradePaymentRecord[]>([]);
  const [orders, setOrders] = useState<TradeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [sendingReminderOrderNo, setSendingReminderOrderNo] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const initialRecordForm = {
    order_no: '',
    client_name: '',
    type: 'Advance Paid' as 'Advance Paid' | 'Settlement' | 'Completed' | 'Balance Payment' | 'LC Drawdown',
    amount: 100000,
    currency: 'USD',
    payment_method: 'SWIFT Wire Transfer (MT103)',
    transaction_ref: '',
    lc_reference: '',
    notes: '',
  };

  const [recordForm, setRecordForm] = useState(initialRecordForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allPayments, allOrders] = await Promise.all([
        getTradePayments(),
        getTradeOrders()
      ]);
      setPayments(Array.isArray(allPayments) ? allPayments : []);
      setOrders(Array.isArray(allOrders) ? allOrders : []);
      if (allOrders.length > 0 && !recordForm.order_no) {
        setRecordForm(prev => ({
          ...prev,
          order_no: allOrders[0].order_no,
          client_name: allOrders[0].client_name,
          amount: allOrders[0].advance_amount,
          currency: allOrders[0].currency
        }));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('trade_payments_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_payments' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_trade_payments_change', handleLocalChange);
    window.addEventListener('ferex_trade_orders_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_payments_change', handleLocalChange);
      window.removeEventListener('ferex_trade_orders_change', handleLocalChange);
    };
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const selectedOrder = orders.find(o => o.order_no === recordForm.order_no);

  const handleOrderSelect = (orderNo: string) => {
    const ord = orders.find(o => o.order_no === orderNo);
    if (ord) {
      const isAdvPending = ord.advance_status === 'Pending';
      const balDue = Math.max(0, ord.balance_amount - (ord.balance_paid || 0));
      setRecordForm(prev => ({
        ...prev,
        order_no: orderNo,
        client_name: ord.client_name,
        type: isAdvPending ? 'Advance Paid' : 'Settlement',
        amount: isAdvPending ? ord.advance_amount : (balDue > 0 ? balDue : ord.total_amount),
        currency: ord.currency,
        lc_reference: ord.lc_reference || ''
      }));
    }
  };

  const applyPreset = (preset: 'advance' | 'settlement' | 'completed' | 'lc') => {
    if (!selectedOrder) return;
    const isAdvPending = selectedOrder.advance_status === 'Pending';
    const balDue = Math.max(0, selectedOrder.balance_amount - (selectedOrder.balance_paid || 0));

    if (preset === 'advance') {
      setRecordForm(prev => ({
        ...prev,
        type: 'Advance Paid',
        amount: selectedOrder.advance_amount,
        notes: `Advance payment deposit (${selectedOrder.advance_percentage}%) for order ${selectedOrder.order_no}`
      }));
    } else if (preset === 'settlement') {
      setRecordForm(prev => ({
        ...prev,
        type: 'Settlement',
        amount: balDue > 0 ? balDue : Math.round(selectedOrder.total_amount * 0.7),
        notes: `Balance settlement against BL / Shipping release for order ${selectedOrder.order_no}`
      }));
    } else if (preset === 'completed') {
      setRecordForm(prev => ({
        ...prev,
        type: 'Completed',
        amount: balDue > 0 ? balDue : selectedOrder.total_amount,
        notes: `Full order settlement completed for order ${selectedOrder.order_no}`
      }));
    } else if (preset === 'lc') {
      setRecordForm(prev => ({
        ...prev,
        type: 'LC Drawdown',
        amount: selectedOrder.total_amount,
        lc_reference: selectedOrder.lc_reference || 'LC-BANK-7701',
        payment_method: 'Irrevocable LC at Sight (Bank Drawdown)',
        notes: `LC drawdown negotiation verified for order ${selectedOrder.order_no}`
      }));
    }
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordForm.order_no || !recordForm.amount) {
      showToastMsg('Please enter valid payment details.');
      return;
    }

    try {
      const created = await recordTradePayment(recordForm);
      setShowRecordModal(false);
      showToastMsg(`Recorded ${created?.type || 'Payment'} of ${created?.currency || 'USD'} ${Number(created?.amount || 0).toLocaleString()} & issued receipt ${created?.receipt_no || 'REC'}!`);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Failed to record payment: ${err.message}`);
    }
  };

  const handleSendReminder = async (orderNo: string) => {
    setSendingReminderOrderNo(orderNo);
    try {
      const ok = await sendPaymentReminder(orderNo);
      if (ok) {
        showToastMsg(`Automated payment balance reminder dispatched for ${orderNo}!`);
      }
    } finally {
      setSendingReminderOrderNo(null);
    }
  };

  const downloadReceipt = (p: TradePaymentRecord) => {
    const rows = [
      ['FEREX GLOBAL TRADE PAYMENT RECEIPT'],
      ['Receipt Number', p.receipt_no],
      ['Order Reference', p.order_no],
      ['Payer / Client', p.client_name],
      ['Payment Type', p.type],
      ['Amount Paid', `${p.currency} ${Number(p.amount).toLocaleString()}`],
      ['Payment Method', p.payment_method],
      ['Transaction Reference', p.transaction_ref || 'N/A'],
      ['Letter of Credit Reference', p.lc_reference || 'N/A'],
      ['Payment Date', p.payment_date],
      ['Treasury Status', 'Verified & Cleared'],
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${p.receipt_no}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToastMsg(`Exported ${p.receipt_no}`);
  };

  const totalCollectedUSD = payments.reduce((sum, p) => {
    const rate = p.currency === 'EUR' ? 1.08 : p.currency === 'INR' ? 0.012 : p.currency === 'GBP' ? 1.30 : 1;
    return sum + (p.amount * rate);
  }, 0);

  const normalizeType = (t: string) => {
    const s = (t || '').toLowerCase();
    if (s.includes('adv')) return 'Advance Paid';
    if (s.includes('settle') || s.includes('bal')) return 'Settlement';
    if (s.includes('complete') || s.includes('full')) return 'Completed';
    if (s.includes('lc')) return 'LC Drawdown';
    return t;
  };

  const counts = {
    all: payments.length,
    advance: payments.filter(p => normalizeType(p.type) === 'Advance Paid').length,
    settlement: payments.filter(p => normalizeType(p.type) === 'Settlement').length,
    completed: payments.filter(p => normalizeType(p.type) === 'Completed').length,
    lc: payments.filter(p => normalizeType(p.type) === 'LC Drawdown').length,
  };

  const filteredPayments = payments.filter(p => {
    const norm = normalizeType(p.type);
    const matchesFilter =
      filterType === 'All' ||
      (filterType === 'Advance Paid' && norm === 'Advance Paid') ||
      (filterType === 'Settlement' && norm === 'Settlement') ||
      (filterType === 'Completed' && norm === 'Completed') ||
      (filterType === 'LC Drawdown' && norm === 'LC Drawdown');

    const matchesSearch =
      p.order_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.receipt_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.type.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const getTypeBadge = (type: string) => {
    const norm = normalizeType(type);
    switch (norm) {
      case 'Advance Paid':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Settlement':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Completed':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'LC Drawdown':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 text-xs font-bold"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#58051E]" />
            Trade Payment & Settlement Ledger
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Manage Advance Paid, Balance Settlements, Full Completions, and LC drawdowns with instant receipts.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            if (orders.length > 0) {
              handleOrderSelect(orders[0].order_no);
            }
            setShowRecordModal(true);
          }}
          className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Record Payment & Issue Receipt
        </Button>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 border border-slate-200/80 bg-white">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Settled (USD)</div>
          <div className="text-xl font-black text-slate-900 mt-1">~${Math.round(totalCollectedUSD).toLocaleString()}</div>
        </Card>
        <Card className="p-3.5 border border-amber-200/80 bg-amber-50/40">
          <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">Advance Paid Receipts</div>
          <div className="text-xl font-black text-amber-900 mt-1">{counts.advance}</div>
        </Card>
        <Card className="p-3.5 border border-blue-200/80 bg-blue-50/40">
          <div className="text-[10px] font-black uppercase tracking-wider text-blue-700">Settlements Logged</div>
          <div className="text-xl font-black text-blue-900 mt-1">{counts.settlement}</div>
        </Card>
        <Card className="p-3.5 border border-emerald-200/80 bg-emerald-50/40">
          <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Completed Payments</div>
          <div className="text-xl font-black text-emerald-900 mt-1">{counts.completed}</div>
        </Card>
      </div>

      {/* Advance / Balance Schedule by Active Order */}
      <Card className="p-4 border border-slate-200/80 shadow-xs">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
          <span>Active Orders Advance & Balance Status</span>
          <span className="text-slate-400 font-bold">{orders.length} Active Shipments</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {orders.map((o) => {
            const isAdvPaid = o.advance_status === 'Paid';
            const balDue = Math.max(0, o.balance_amount - (o.balance_paid || 0));
            const isBalPaid = balDue === 0;

            return (
              <div key={o.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-black text-xs text-slate-900">{o.order_no}</span>
                    <div className="text-[11px] font-bold text-slate-700 truncate max-w-[170px]">{o.client_name}</div>
                  </div>
                  <span className="text-[10px] font-black uppercase text-[#58051E] bg-[#58051E]/10 px-2 py-0.5 rounded">
                    {o.currency} {Number(o.total_amount).toLocaleString()}
                  </span>
                </div>

                <div className="text-[11px] space-y-1 pt-1 border-t border-slate-200/60 font-semibold">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Advance ({o.advance_percentage}%):</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                      isAdvPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {o.currency} {Number(o.advance_amount).toLocaleString()} ({isAdvPaid ? '✓ Paid' : '⏳ Due'})
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Balance Pending:</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                      isBalPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {o.currency} {Number(balDue).toLocaleString()} ({isBalPaid ? '✓ Settled' : '⏳ Pending'})
                    </span>
                  </div>
                  {o.lc_reference && (
                    <div className="text-[10px] text-blue-600 font-mono truncate">
                      🏦 LC Ref: {o.lc_reference}
                    </div>
                  )}
                </div>

                <div className="pt-1 flex gap-2">
                  <button
                    onClick={() => {
                      handleOrderSelect(o.order_no);
                      setShowRecordModal(true);
                    }}
                    className="flex-1 py-1.5 bg-[#58051E] hover:bg-[#430316] text-white rounded-xl text-[10.5px] font-black transition-all cursor-pointer text-center"
                  >
                    + Record Payment
                  </button>

                  {!isBalPaid && (
                    <button
                      disabled={sendingReminderOrderNo === o.order_no}
                      onClick={() => handleSendReminder(o.order_no)}
                      className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 transition-all cursor-pointer disabled:opacity-50"
                      title="Send Payment Reminder Email"
                    >
                      <Send className="w-3.5 h-3.5 text-[#58051E]" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Filter and Search Bar */}
      <Card className="p-3 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search receipts, orders, clients..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[11px] font-bold text-slate-400 mr-1">Payment Type:</span>
          {[
            { key: 'All', label: 'All', count: counts.all },
            { key: 'Advance Paid', label: 'Advance Paid', count: counts.advance },
            { key: 'Settlement', label: 'Settlement', count: counts.settlement },
            { key: 'Completed', label: 'Completed', count: counts.completed },
            { key: 'LC Drawdown', label: 'LC Drawdown', count: counts.lc }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterType(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterType === tab.key
                  ? 'bg-[#58051E] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                filterType === tab.key ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Receipts Ledger Table */}
      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#58051E]" /> Loading payment receipts...
        </div>
      ) : filteredPayments.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No payment receipts logged</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Record advance deposits or balance wires to generate official treasury receipts.
          </p>
        </Card>
      ) : (
        <Card className="border border-slate-200/80 shadow-xs overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Linked Order & Client</th>
                  <th className="py-3 px-4">Payment Option</th>
                  <th className="py-3 px-4">Amount Paid</th>
                  <th className="py-3 px-4">Method & Transaction Ref</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Receipt Export</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-black text-slate-900">
                      {p.receipt_no}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900">{p.client_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.order_no}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border ${getTypeBadge(p.type)}`}>
                        {p.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-black text-slate-900">
                      {p.currency} {Number(p.amount).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-bold">{p.payment_method}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.transaction_ref}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {p.payment_date}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => downloadReceipt(p)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" /> Export CSV
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── RECORD PAYMENT MODAL ── */}
      <AnimatePresence>
        {showRecordModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50" onClick={() => setShowRecordModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto text-left">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#58051E]" /> Record Trade Payment & Issue Receipt
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Select payment category: Advance Paid, Settlement, Completed, or LC Drawdown.
                  </p>
                </div>
                <button onClick={() => setShowRecordModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleRecordSubmit} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Select Order *</label>
                  <select
                    required
                    value={recordForm.order_no}
                    onChange={(e) => handleOrderSelect(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#58051E]"
                  >
                    <option value="">-- Choose order --</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.order_no}>
                        {o.order_no} — {o.client_name} ({o.currency} {o.total_amount.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Live Order Balance Breakdown Card */}
                {selectedOrder && (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
                    <div className="text-[10px] font-extrabold uppercase text-slate-500 flex items-center justify-between">
                      <span className="flex items-center gap-1"><Calculator className="w-3.5 h-3.5 text-[#58051E]" /> Financial Status for {selectedOrder.order_no}</span>
                      <span className="font-mono text-[#58051E] font-black">{selectedOrder.currency} {selectedOrder.total_amount.toLocaleString()}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-white rounded-xl border border-slate-100">
                        <div className="text-[9.5px] text-slate-400 font-bold">Advance Required</div>
                        <div className="text-xs font-black text-amber-800 mt-0.5">
                          {selectedOrder.currency} {Number(selectedOrder.advance_amount).toLocaleString()}
                        </div>
                        <div className="text-[9px] font-extrabold text-slate-400">({selectedOrder.advance_percentage}%)</div>
                      </div>

                      <div className="p-2 bg-white rounded-xl border border-slate-100">
                        <div className="text-[9.5px] text-slate-400 font-bold">Advance Paid</div>
                        <div className={`text-xs font-black mt-0.5 ${selectedOrder.advance_status === 'Paid' ? 'text-emerald-700' : 'text-slate-700'}`}>
                          {selectedOrder.currency} {Number(selectedOrder.advance_paid || 0).toLocaleString()}
                        </div>
                        <div className="text-[9px] font-extrabold text-emerald-600">{selectedOrder.advance_status}</div>
                      </div>

                      <div className="p-2 bg-white rounded-xl border border-slate-100">
                        <div className="text-[9.5px] text-slate-400 font-bold">Balance Due</div>
                        <div className="text-xs font-black text-rose-700 mt-0.5">
                          {selectedOrder.currency} {Number(Math.max(0, selectedOrder.balance_amount - (selectedOrder.balance_paid || 0))).toLocaleString()}
                        </div>
                        <div className="text-[9px] font-extrabold text-rose-600">Pending</div>
                      </div>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400">Quick Fill:</span>
                      <button
                        type="button"
                        onClick={() => applyPreset('advance')}
                        className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer"
                      >
                        ⚡ Advance Paid
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('settlement')}
                        className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer"
                      >
                        💼 Settlement
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('completed')}
                        className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer"
                      >
                        ✓ Completed
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('lc')}
                        className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer"
                      >
                        🏦 LC Drawdown
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Payment Option / Type *</label>
                    <select
                      value={recordForm.type}
                      onChange={(e) => setRecordForm({ ...recordForm, type: e.target.value as any })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#58051E]"
                    >
                      <option value="Advance Paid">Advance Paid</option>
                      <option value="Settlement">Settlement</option>
                      <option value="Completed">Completed</option>
                      <option value="Balance Payment">Balance Payment</option>
                      <option value="LC Drawdown">LC Drawdown</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Currency</label>
                    <select
                      value={recordForm.currency}
                      onChange={(e) => setRecordForm({ ...recordForm, currency: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      {TRADE_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Amount Received *</label>
                  <input
                    type="number"
                    required
                    value={recordForm.amount}
                    onChange={(e) => setRecordForm({ ...recordForm, amount: Number(e.target.value) })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Payment Method</label>
                  <input
                    type="text"
                    value={recordForm.payment_method}
                    onChange={(e) => setRecordForm({ ...recordForm, payment_method: e.target.value })}
                    placeholder="e.g. SWIFT Wire MT103 / SEPA / Irrevocable LC"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Transaction Ref #</label>
                    <input
                      type="text"
                      value={recordForm.transaction_ref}
                      onChange={(e) => setRecordForm({ ...recordForm, transaction_ref: e.target.value })}
                      placeholder="e.g. SWIFT-WAW-9910"
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">LC Reference (If LC)</label>
                    <input
                      type="text"
                      value={recordForm.lc_reference}
                      onChange={(e) => setRecordForm({ ...recordForm, lc_reference: e.target.value })}
                      placeholder="e.g. LC-BNP-9021"
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Receipt Notes / Reference</label>
                  <textarea
                    rows={2}
                    value={recordForm.notes}
                    onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })}
                    placeholder="e.g. Cleared via treasury account, export invoice released"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowRecordModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] text-white">Record & Issue Receipt</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TradePayments;

