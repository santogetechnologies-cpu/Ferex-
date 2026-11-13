import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Search, CheckCircle2, Plus, Trash2, Edit3, X, Eye, Receipt, FileText, Printer, Building2, Check, Calendar, CalendarRange, Filter, BarChart2, ChevronRight } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import {
  getRimiPayments,
  createRimiPayment,
  updateRimiPayment,
  deleteRimiPayment,
  getRimiCustomers,
  getRimiSalesOrders,
  type RimiPaymentRecord,
  type RimiCustomerRecord,
  type RimiSalesOrderRecord
} from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRimiAccess } from '../../lib/rimiAccess';

type DateFilterType = 'All' | 'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | 'Custom';

export const RimiCollections: React.FC = () => {
  const { profile } = useAuth();
  // Admin and Warehouse users can both record, edit and delete payment collections.
  const { canManage: isAdmin } = useRimiAccess();

  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<RimiPaymentRecord[]>([]);
  const [customers, setCustomers] = useState<RimiCustomerRecord[]>([]);
  const [orders, setOrders] = useState<RimiSalesOrderRecord[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<RimiPaymentRecord | null>(null);
  const [editingPayment, setEditingPayment] = useState<RimiPaymentRecord | null>(null);

  // Date-based filters & Summary State
  const [dateFilter, setDateFilter] = useState<DateFilterType>('All');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showMonthlySummary, setShowMonthlySummary] = useState(false);

  const [newPayment, setNewPayment] = useState({
    customer_id: '',
    customer_name: '',
    order_id: '',
    amount: 0,
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
      const [payList, custList, orderList] = await Promise.all([
        getRimiPayments(),
        getRimiCustomers(),
        getRimiSalesOrders()
      ]);
      setOrders(orderList);
      // Money received stays on record even if its order was later cancelled.
      setPayments(payList);
      setCustomers(custList);
    } catch (err: any) {
      setToast(`Could not load collections: ${err.message || 'Database error'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_rimi_payments_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_payments' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_sales_orders' }, () => loadData())
      .subscribe();

    const handleSync = () => loadData();
    window.addEventListener('ferex_rimi_payments_change', handleSync);
    window.addEventListener('ferex_rimi_orders_change', handleSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_rimi_payments_change', handleSync);
      window.removeEventListener('ferex_rimi_orders_change', handleSync);
    };
  }, [loadData]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.customer_id) { showToastMsg('Choose a customer.'); return; }
    if (!(Number(newPayment.amount) > 0)) { showToastMsg('Enter an amount greater than zero.'); return; }

    try {
      const cust = customers.find(c => c.id === newPayment.customer_id);
      await createRimiPayment({
        customer_id: newPayment.customer_id,
        customer_name: cust?.business_name,
        order_id: newPayment.order_id || undefined,
        order_no: orders.find(o => o.id === newPayment.order_id)?.order_no,
        amount: Number(newPayment.amount),
        payment_method: newPayment.payment_method,
        reference_no: newPayment.reference_no,
        notes: newPayment.notes,
        collected_by_name: profile?.full_name || 'Finance Team'
      });

      setShowAddModal(false);
      showToastMsg(`Logged payment of ₹${Number(newPayment.amount).toLocaleString('en-IN')}`);
      setNewPayment({ customer_id: '', customer_name: '', order_id: '', amount: 0, payment_method: 'Bank Transfer', reference_no: '', notes: '' });
      await loadData();
    } catch (err: any) {
      showToastMsg(`Error logging payment: ${err.message || 'Database error'}`);
    }
  };

  const handleDeletePayment = async (id: string, paymentNo: string) => {
    if (!window.confirm(`Are you sure you want to delete remittance ${paymentNo}? This action will revert the customer ledger and restore the outstanding balance.`)) {
      return;
    }
    try {
      await deleteRimiPayment(id);
      showToastMsg(`Remittance ${paymentNo} deleted & ledger reversed.`);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Failed to delete payment: ${err.message || 'Error'}`);
    }
  };

  const handleSavePaymentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    try {
      await updateRimiPayment(editingPayment.id, {
        reference_no: editingPayment.reference_no,
        payment_method: editingPayment.payment_method,
        payment_date: editingPayment.payment_date,
        notes: editingPayment.notes
      });
      setEditingPayment(null);
      showToastMsg('Payment remittance details updated.');
      await loadData();
    } catch (err: any) {
      showToastMsg(`Failed to update payment: ${err.message || 'Error'}`);
    }
  };

  const isPaymentInDateRange = useCallback((p: RimiPaymentRecord) => {
    if (dateFilter === 'All') return true;
    const rawDate = p.payment_date || p.created_at;
    if (!rawDate) return false;
    const pDate = new Date(rawDate);
    pDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateFilter === 'Daily') {
      return pDate.getTime() === today.getTime();
    }
    if (dateFilter === 'Weekly') {
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(today.getDate() - 7);
      return pDate >= oneWeekAgo && pDate <= today;
    }
    if (dateFilter === 'Monthly') {
      return pDate.getFullYear() === today.getFullYear() && pDate.getMonth() === today.getMonth();
    }
    if (dateFilter === 'Yearly') {
      return pDate.getFullYear() === today.getFullYear();
    }
    if (dateFilter === 'Custom') {
      if (!customStartDate && !customEndDate) return true;
      const start = customStartDate ? new Date(customStartDate) : new Date('2020-01-01');
      start.setHours(0, 0, 0, 0);
      const end = customEndDate ? new Date(customEndDate) : new Date('2099-12-31');
      end.setHours(23, 59, 59, 999);
      return pDate >= start && pDate <= end;
    }
    return true;
  }, [dateFilter, customStartDate, customEndDate]);

  const periodFilteredPayments = useMemo(() => {
    return payments.filter(isPaymentInDateRange);
  }, [payments, isPaymentInDateRange]);

  const filteredPayments = useMemo(() => {
    const s = searchQuery.toLowerCase().trim();
    if (!s) return periodFilteredPayments;
    return periodFilteredPayments.filter(p =>
      p.payment_no.toLowerCase().includes(s) ||
      p.customer_name.toLowerCase().includes(s) ||
      (p.reference_no && p.reference_no.toLowerCase().includes(s)) ||
      p.payment_method.toLowerCase().includes(s)
    );
  }, [periodFilteredPayments, searchQuery]);

  const periodTotal = useMemo(() => {
    return periodFilteredPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  }, [periodFilteredPayments]);

  const totalCollected = useMemo(() => {
    return payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  }, [payments]);

  const monthlySummary = useMemo(() => {
    const map = new Map<string, { monthKey: string; monthLabel: string; total: number; count: number; date: Date }>();
    for (const p of payments) {
      const d = new Date(p.payment_date || p.created_at);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const current = map.get(monthKey) || { monthKey, monthLabel, total: 0, count: 0, date: new Date(d.getFullYear(), d.getMonth(), 1) };
      current.total += Number(p.amount || 0);
      current.count += 1;
      map.set(monthKey, current);
    }
    return Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [payments]);

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

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowMonthlySummary(true)}
            className="text-xs font-bold border-slate-200 text-slate-700 hover:border-[#58051E] hover:text-[#58051E] flex items-center gap-1.5"
          >
            <BarChart2 className="w-4 h-4 text-[#58051E]" /> Monthly Payment Summary
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Record Collection
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Card className="p-4 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 shadow-xs">
          <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">
            {dateFilter === 'All' ? 'Total Realized Collections' : `Period Realized (${dateFilter})`}
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-900">₹{periodTotal.toLocaleString('en-IN')}</span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
              {periodFilteredPayments.length} records
            </span>
          </div>
          <span className="text-[10px] font-semibold text-emerald-600 block mt-1">
            {dateFilter === 'All' ? 'All-time uncancelled receipts' : `Collections matching ${dateFilter} date range`}
          </span>
        </Card>

        <Card className="p-4 bg-slate-50 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">All-Time Cumulative Collections</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900">₹{totalCollected.toLocaleString('en-IN')}</span>
            <span className="text-[11px] font-bold text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded-full">
              {payments.length} total
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-400 block mt-1">Lifetime gross realized settlements</span>
        </Card>

        <Card className="p-4 bg-slate-50 border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Active Date Scope</span>
          <div className="mt-1 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#58051E]" />
            <span className="text-sm font-black text-slate-800">
              {dateFilter === 'Custom' ? (customStartDate && customEndDate ? `${customStartDate} to ${customEndDate}` : 'Custom Date Range') : dateFilter}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowMonthlySummary(true)}
            className="text-[11px] font-bold text-[#58051E] hover:underline text-left mt-2 flex items-center gap-1 cursor-pointer"
          >
            <span>View Month-by-Month Analytics</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </Card>
      </div>

      {/* Date Filter & Search Bar */}
      <Card className="p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Date Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black uppercase text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Period:
            </span>
            {(['All', 'Daily', 'Weekly', 'Monthly', 'Yearly', 'Custom'] as DateFilterType[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setDateFilter(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  dateFilter === tab
                    ? 'bg-[#58051E] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {tab === 'Daily' ? 'Daily (Today)' : tab === 'Weekly' ? 'Weekly (7 Days)' : tab === 'Monthly' ? 'Monthly' : tab === 'Yearly' ? 'Yearly' : tab === 'Custom' ? 'Custom Date Range' : 'All Time'}
              </button>
            ))}
          </div>

          {/* Quick Search Input */}
          <div className="relative min-w-[260px] flex-1 lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference no, customer..."
              className="w-full h-8.5 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Custom Date Range Pickers (shown when Custom is active) */}
        {dateFilter === 'Custom' && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-3 flex-wrap bg-slate-50/80 p-3 rounded-xl text-xs">
            <span className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1">
              <CalendarRange className="w-3.5 h-3.5 text-[#58051E]" /> Custom Range:
            </span>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">To:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
              />
            </div>
            {(customStartDate || customEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer ml-auto"
              >
                Clear Dates
              </button>
            )}
          </div>
        )}
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
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedPayment(p)}
                          className="text-[11px] font-bold h-7 border-slate-200"
                          title="View Receipt"
                        >
                          <Eye className="w-3 h-3 mr-1 text-[#58051E]" /> Receipt
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingPayment(p)}
                          className="text-[11px] font-bold h-7 border-slate-200 hover:bg-slate-50 text-slate-700"
                          title="Edit Remittance"
                        >
                          <Edit3 className="w-3 h-3 text-slate-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeletePayment(p.id, p.payment_no)}
                          className="text-[11px] font-bold h-7 border-red-200 text-red-600 hover:bg-red-50"
                          title="Delete Remittance"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
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
                        customer_name: cust?.business_name || '',
                        order_id: ''
                      });
                    }}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="">Select customer…</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.business_name} (Due: ₹{Number(c.outstanding_amount || 0).toLocaleString('en-IN')})</option>
                    ))}
                  </select>
                </div>

                {newPayment.customer_id && (
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Apply to Sales Order</label>
                    <select
                      value={newPayment.order_id}
                      onChange={(e) => {
                        const ord = orders.find(o => o.id === e.target.value);
                        setNewPayment({ ...newPayment, order_id: e.target.value, amount: ord ? Number(ord.balance_amount) : newPayment.amount });
                      }}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                    >
                      <option value="">On account (not tied to an order — does not reduce an order balance)</option>
                      {orders.filter(o => o.customer_id === newPayment.customer_id && o.order_status !== 'Cancelled' && Number(o.balance_amount) > 0).map(o => (
                        <option key={o.id} value={o.id}>{o.order_no} — balance ₹{Number(o.balance_amount).toLocaleString('en-IN')} of ₹{Number(o.total_amount).toLocaleString('en-IN')}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Remittance Amount (₹ INR) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={newPayment.amount || ''}
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

      {/* Edit Remittance Modal */}
      <AnimatePresence>
        {editingPayment && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={() => setEditingPayment(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900">Edit Remittance Record</h3>
                  <p className="text-[10px] font-bold text-[#58051E]">{editingPayment.payment_no} • {editingPayment.customer_name}</p>
                </div>
                <button onClick={() => setEditingPayment(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSavePaymentEdit} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Amount (₹ Locked)</label>
                  <input
                    type="text"
                    disabled
                    value={`₹${Number(editingPayment.amount).toLocaleString('en-IN')}`}
                    className="w-full h-10 px-3.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-600 cursor-not-allowed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Payment Mode</label>
                    <select
                      value={editingPayment.payment_method}
                      onChange={(e) => setEditingPayment({ ...editingPayment, payment_method: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                    >
                      <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                      <option value="UPI">UPI / QR Payment</option>
                      <option value="Cheque">Commercial Cheque</option>
                      <option value="Cash">Cash Receipt</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Reference / UTR</label>
                    <input
                      type="text"
                      value={editingPayment.reference_no || ''}
                      onChange={(e) => setEditingPayment({ ...editingPayment, reference_no: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Remittance Date</label>
                  <input
                    type="date"
                    value={editingPayment.payment_date || ''}
                    onChange={(e) => setEditingPayment({ ...editingPayment, payment_date: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Narration / Notes</label>
                  <textarea
                    rows={2}
                    value={editingPayment.notes || ''}
                    onChange={(e) => setEditingPayment({ ...editingPayment, notes: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setEditingPayment(null)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">Update Remittance</Button>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40 print:hidden" onClick={() => setSelectedPayment(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto print:hidden">
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
                  {selectedPayment.order_no && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Against Order:</span>
                      <span className="font-mono font-bold text-[#58051E]">{selectedPayment.order_no}</span>
                    </div>
                  )}
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
                  {selectedPayment.notes && (
                    <div className="pt-2 border-t border-slate-200/60 text-slate-500 italic">
                      {selectedPayment.notes}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1 text-xs font-bold" onClick={() => setSelectedPayment(null)}>
                    Close Receipt
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316] text-white flex items-center justify-center gap-1.5 shadow-sm"
                    onClick={() => window.print()}
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Receipt
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Hidden Printable Voucher rendered exclusively for window.print() */}
            <div className="hidden print:block fixed inset-0 bg-white p-8 z-[9999] text-slate-900 font-sans">
              <div className="max-w-2xl mx-auto border-2 border-slate-800 p-6 rounded-2xl space-y-6">
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4">
                  <div>
                    <h1 className="text-2xl font-black text-[#58051E] tracking-tight">FEREX RIMI FROZEN FMCG</h1>
                    <p className="text-xs font-semibold text-slate-600">Cold Chain Distribution & Logistics • National Warehouse Network</p>
                    <p className="text-[10px] text-slate-500 mt-1">Regd Office: Corporate Towers, Marine Lines, Mumbai | GSTIN: 27AAACF8921M1Z4</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded font-black text-xs uppercase tracking-wider">
                      Official Remittance
                    </span>
                    <p className="text-xs font-mono font-bold mt-2">Voucher #: {selectedPayment.payment_no}</p>
                    <p className="text-[11px] text-slate-600">Date: {selectedPayment.payment_date}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Received From Customer</span>
                    <p className="text-sm font-black text-slate-900 mt-0.5">{selectedPayment.customer_name}</p>
                    <p className="text-slate-600 mt-1">Payment Method: <span className="font-bold text-slate-900">{selectedPayment.payment_method}</span></p>
                    <p className="text-slate-600">Reference / UTR: <span className="font-mono font-bold text-slate-900">{selectedPayment.reference_no || 'Direct Settlement'}</span></p>
                  </div>
                  <div className="text-right flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Settled Amount (INR)</span>
                      <p className="text-3xl font-black text-emerald-700 mt-1">₹{Number(selectedPayment.amount).toLocaleString('en-IN')}</p>
                    </div>
                    {selectedPayment.order_no && (
                      <p className="text-xs font-mono text-slate-700">Allocated to Sales Order: <strong>{selectedPayment.order_no}</strong></p>
                    )}
                  </div>
                </div>

                <div className="text-xs text-slate-700 bg-amber-50/60 border border-amber-200 p-3 rounded-lg">
                  <strong>Narration:</strong> {selectedPayment.notes || `Payment received towards reefer freight / cold store merchandise settlement for ${selectedPayment.customer_name}`}
                </div>

                <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-xs">
                  <div>
                    <div className="w-40 border-b border-slate-400 mb-1"></div>
                    <span className="font-bold text-slate-700">Collected By: {selectedPayment.collected_by_name || 'Rimi Finance Desk'}</span>
                    <p className="text-[10px] text-slate-500">Authorized Accounts Signatory</p>
                  </div>
                  <div className="text-right">
                    <div className="w-40 border-b border-slate-400 mb-1 ml-auto"></div>
                    <span className="font-bold text-slate-700">Customer Acknowledgment Stamp</span>
                    <p className="text-[10px] text-slate-500">Digital Seal & Verification Hash Verified</p>
                  </div>
                </div>

                <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                  This document serves as an authentic electronic payment collection voucher generated by Ferex Cold Chain Operating System.
                </div>
              </div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Monthly Payment Summary Drawer */}
      <AnimatePresence>
        {showMonthlySummary && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setShowMonthlySummary(false)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-[#58051E]" /> Monthly Payment Summary
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500">
                    Gross realized collection analytics grouped by calendar month
                  </span>
                </div>
                <button onClick={() => setShowMonthlySummary(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Monthly Summary Cards */}
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase block">Total Realized</span>
                    <span className="text-lg font-black text-emerald-950 mt-0.5 block">₹{totalCollected.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Active Months</span>
                    <span className="text-lg font-black text-slate-900 mt-0.5 block">{monthlySummary.length} Months</span>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Month-by-Month Breakdown</h4>
                  {monthlySummary.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl">No collection history available</div>
                  ) : (
                    monthlySummary.map((m) => {
                      const maxMonthTotal = Math.max(...monthlySummary.map(x => x.total), 1);
                      const percentOfMax = Math.min(100, Math.round((m.total / maxMonthTotal) * 100));

                      return (
                        <div key={m.monthKey} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2 hover:bg-slate-100/60 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-black text-slate-900 block text-xs">{m.monthLabel}</span>
                              <span className="text-[10px] text-slate-500 font-semibold">{m.count} transaction{m.count > 1 ? 's' : ''}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-emerald-700 text-sm block">₹{m.total.toLocaleString('en-IN')}</span>
                              <span className="text-[9px] text-slate-400 font-bold">Avg: ₹{Math.round(m.total / m.count).toLocaleString('en-IN')}</span>
                            </div>
                          </div>

                          {/* Progress indicator */}
                          <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#58051E] h-full rounded-full transition-all" style={{ width: `${percentOfMax}%` }} />
                          </div>

                          <div className="pt-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                const year = m.date.getFullYear();
                                const month = m.date.getMonth();
                                const startStr = new Date(year, month, 1).toISOString().split('T')[0];
                                const endStr = new Date(year, month + 1, 0).toISOString().split('T')[0];
                                setDateFilter('Custom');
                                setCustomStartDate(startStr);
                                setCustomEndDate(endStr);
                                setShowMonthlySummary(false);
                                showToastMsg(`Filtered records to ${m.monthLabel}`);
                              }}
                              className="text-[10px] font-bold text-[#58051E] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>Filter list to this month</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs font-bold"
                    onClick={() => setShowMonthlySummary(false)}
                  >
                    Close Summary
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
