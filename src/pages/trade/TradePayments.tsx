import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Search,
  Download,
  Eye,
  CheckCircle2,
  X,
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldCheck,
  FileSpreadsheet,
  Ship,
  FileText
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getTradePayments,
  createTradePayment,
  updateTradePaymentStatus,
  deleteTradePayment,
  getTradeCRMContacts,
  getTradeInvoices,
  getTradeShipments,
  getTradeLettersOfCredit,
  getTradeDossier,
  TRADE_MASTER_PAYMENT_METHODS,
  TRADE_MASTER_CURRENCIES
} from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';

const PAYMENT_STATUSES = ['Pending', 'Processing', 'Completed', 'Cleared', 'Failed', 'Reversed'];

export const TradePayments: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFlow, setFilterFlow] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [crmPartners, setCrmPartners] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [lcs, setLcs] = useState<any[]>([]);
  const [dossier, setDossier] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const initialTx = {
    partner: '',
    desc: '',
    amount: '',
    currency: 'INR',
    flow_type: 'inbound' as 'inbound' | 'outbound',
    type: TRADE_MASTER_PAYMENT_METHODS[0],
    status: 'Completed',
    invoice_no: '',
    shipment_no: '',
    lc_reference: '',
    date: new Date().toISOString().split('T')[0]
  };

  const [newTx, setNewTx] = useState(initialTx);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [data, partners, invs, ships, lcList] = await Promise.all([
        getTradePayments(),
        getTradeCRMContacts().catch(() => []),
        getTradeInvoices().catch(() => []),
        getTradeShipments().catch(() => []),
        getTradeLettersOfCredit().catch(() => [])
      ]);

      if (Array.isArray(partners)) setCrmPartners(partners);
      if (Array.isArray(invs)) setInvoices(invs);
      if (Array.isArray(ships)) setShipments(ships);
      if (Array.isArray(lcList)) setLcs(lcList);

      if (Array.isArray(data)) {
        const formatted = data.map((d: any) => {
          let flowType: 'inbound' | 'outbound' = d.flow_type || 'inbound';
          if (!d.flow_type) {
            const lowerDesc = (d.description || '').toLowerCase();
            const lowerType = (d.payment_type || '').toLowerCase();
            if (
              lowerDesc.includes('freight') ||
              lowerDesc.includes('demurrage') ||
              lowerDesc.includes('duty') ||
              lowerDesc.includes('port handling') ||
              lowerDesc.includes('customs') ||
              lowerDesc.includes('paid out') ||
              lowerType.includes('outbound')
            ) {
              flowType = 'outbound';
            }
          }

          return {
            id: d.transaction_ref || d.id,
            rawId: d.id,
            partner: d.partner_entity || 'Global Trade Entity',
            desc: d.description,
            flow_type: flowType,
            currency: d.currency || 'INR',
            rawAmount: Number(d.amount) || 0,
            amount: `${d.currency === 'USD' ? '$' : d.currency === 'EUR' ? '€' : '₹'}${Number(d.amount).toLocaleString('en-IN')}`,
            date: d.settlement_date || d.created_at?.split('T')[0] || '2026-09-01',
            type: d.payment_type || 'SWIFT Wire Transfer',
            status: d.status || 'Completed',
            invoice_no: d.invoice_no || '',
            shipment_no: d.shipment_no || '',
            lc_reference: d.lc_reference || '',
            statusBadge:
              d.status === 'Completed' || d.status === 'Cleared'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : d.status === 'Processing'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : d.status === 'Failed' || d.status === 'Reversed'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
          };
        });
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
      .channel('realtime_trade_payments_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_payments' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_trade_payments_change', handleLocalChange);
    window.addEventListener('ferex_trade_crm_change', handleLocalChange);
    window.addEventListener('ferex_trade_invoices_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_payments_change', handleLocalChange);
      window.removeEventListener('ferex_trade_crm_change', handleLocalChange);
      window.removeEventListener('ferex_trade_invoices_change', handleLocalChange);
    };
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.partner) return;
    const numAmount = parseFloat(String(newTx.amount).replace(/[^0-9.]/g, '')) || 0;
    const created = await createTradePayment({
      partner_entity: newTx.partner,
      description: newTx.desc || (newTx.flow_type === 'inbound' ? 'Trade Settlement Inflow' : 'Logistics & Operational Outflow'),
      amount: numAmount,
      currency: newTx.currency,
      payment_type: newTx.type,
      flow_type: newTx.flow_type,
      status: newTx.status,
      settlement_date: newTx.date,
      invoice_no: newTx.invoice_no || undefined,
      shipment_no: newTx.shipment_no || undefined,
      lc_reference: newTx.lc_reference || undefined
    });
    await loadData();
    setShowAddModal(false);
    showToastMsg(`Recorded ${newTx.flow_type === 'inbound' ? 'Inbound Receipt' : 'Outbound Payout'} ${created.transaction_ref || created.id}`);
    setNewTx(initialTx);
  };

  const handleStatusChange = async (id: string, rawId: string, newStatus: string) => {
    try {
      await updateTradePaymentStatus(rawId || id, newStatus);
      showToastMsg(`Transaction status updated to ${newStatus}`);
      await loadData();
      if (selectedTx && (selectedTx.id === id || selectedTx.rawId === rawId)) {
        setSelectedTx((prev: any) => ({ ...prev, status: newStatus }));
      }
    } catch (err: any) {
      showToastMsg(`Error updating payment status: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDeletePayment = async (id: string, rawId?: string) => {
    if (!confirm(`Are you sure you want to delete payment record ${id}?`)) return;
    try {
      await deleteTradePayment(rawId || id);
      setTransactions((prev) => prev.filter((t) => t.id !== id && t.rawId !== rawId));
      if (selectedTx?.id === id) setSelectedTx(null);
      showToastMsg(`Removed transaction record ${id}`);
    } catch (err: any) {
      showToastMsg(`Error deleting payment: ${err.message || 'Unknown error'}`);
    }
  };

  const handleInspectTx = async (tx: any) => {
    setSelectedTx(tx);
    const d = await getTradeDossier('payment', tx.id);
    setDossier(d);
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = ['Transaction Ref', 'Direction', 'Partner Entity', 'Description', 'Method', 'Amount', 'Currency', 'Date', 'Status', 'Linked Invoice'];
    const rows = transactions.map((t) => [
      t.id,
      t.flow_type === 'inbound' ? 'Inbound (Received)' : 'Outbound (Paid Out)',
      `"${t.partner}"`,
      `"${t.desc || ''}"`,
      `"${t.type}"`,
      t.rawAmount,
      t.currency,
      t.date,
      t.status,
      t.invoice_no || ''
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FEREX_Payment_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToastMsg('Exported Payments Ledger to CSV');
  };

  // Calculations
  const totalInbound = transactions
    .filter((t) => t.flow_type === 'inbound' && (t.status === 'Completed' || t.status === 'Cleared'))
    .reduce((sum, t) => sum + (t.rawAmount || 0), 0);

  const totalOutbound = transactions
    .filter((t) => t.flow_type === 'outbound' && (t.status === 'Completed' || t.status === 'Cleared'))
    .reduce((sum, t) => sum + (t.rawAmount || 0), 0);

  const netBalance = totalInbound - totalOutbound;

  const totalProcessing = transactions
    .filter((t) => t.status === 'Processing' || t.status === 'Pending')
    .reduce((sum, t) => sum + (t.rawAmount || 0), 0);

  const formatCr = (amt: number) => {
    if (!amt || amt === 0) return '₹0';
    const abs = Math.abs(amt);
    let str = '';
    if (abs >= 10000000) str = `₹${(abs / 10000000).toFixed(2)} Cr`;
    else if (abs >= 100000) str = `₹${(abs / 100000).toFixed(2)} Lakh`;
    else str = `₹${abs.toLocaleString('en-IN')}`;
    return amt < 0 ? `-${str}` : str;
  };

  const filteredTx = transactions.filter((t) => {
    const matchesSearch =
      (t.partner || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.desc || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.type || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFlow = filterFlow === 'all' || t.flow_type === filterFlow;
    const matchesStatus = filterStatus === 'All' || t.status === filterStatus;

    return matchesSearch && matchesFlow && matchesStatus;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#58051E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#58051E]" /> Global Trade Payments & Two-Way Cashflow Ledger
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Trade Console • Full tracking of Payments Received (Buyer LC & Inflows) vs Payments Paid Out (Shipping Line, Customs Duty & Demurrage).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="text-xs font-bold cursor-pointer" onClick={handleExportCSV}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export Payments CSV
          </Button>
          <Button
            size="sm"
            className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold cursor-pointer"
            onClick={() => {
              setNewTx(initialTx);
              setShowAddModal(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Record Payment / Settlement
          </Button>
        </div>
      </div>

      {/* Dynamic 4-Metric Cashflow Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inbound */}
        <Card className="p-4 border-l-4 border-l-emerald-500 border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">Total Received (Inflow)</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-600">{formatCr(totalInbound)}</div>
          <span className="text-[10px] font-extrabold text-slate-500 block">Buyer Settlements & LC Inflows</span>
        </Card>

        {/* Total Outbound */}
        <Card className="p-4 border-l-4 border-l-rose-500 border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">Total Paid Out (Outflow)</span>
            <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-rose-600">{formatCr(totalOutbound)}</div>
          <span className="text-[10px] font-extrabold text-slate-500 block">Freight, Port Handling & Demurrage</span>
        </Card>

        {/* Net Trade Cashflow Balance */}
        <Card className={`p-4 border-l-4 ${netBalance >= 0 ? 'border-l-indigo-500' : 'border-l-amber-500'} border-slate-200/80 shadow-xs space-y-1`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">Net Cashflow Position</span>
            <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              {netBalance >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-indigo-600" /> : <TrendingDown className="w-3.5 h-3.5 text-amber-600" />}
            </div>
          </div>
          <div className={`text-xl font-black ${netBalance >= 0 ? 'text-indigo-600' : 'text-amber-600'}`}>
            {formatCr(netBalance)}
          </div>
          <span className="text-[10px] font-extrabold text-slate-500 block">
            {netBalance >= 0 ? 'Surplus Turnover Position' : 'Deficit Cashflow Warning'}
          </span>
        </Card>

        {/* In-Processing */}
        <Card className="p-4 border-l-4 border-l-blue-500 border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">In-Transit / Processing</span>
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-blue-600">{formatCr(totalProcessing)}</div>
          <span className="text-[10px] font-extrabold text-slate-500 block">Awaiting SWIFT / Bank Clearances</span>
        </Card>
      </div>

      {/* Filter Tabs & Search Bar */}
      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search partner, SWIFT ref or description..."
            className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilterFlow('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterFlow === 'all' ? 'bg-[#58051E] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Cashflows ({transactions.length})
            </button>
            <button
              onClick={() => setFilterFlow('inbound')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterFlow === 'inbound'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              <ArrowDownLeft className="w-3 h-3" /> Received ({transactions.filter((t) => t.flow_type === 'inbound').length})
            </button>
            <button
              onClick={() => setFilterFlow('outbound')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterFlow === 'outbound'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              <ArrowUpRight className="w-3 h-3" /> Paid Out ({transactions.filter((t) => t.flow_type === 'outbound').length})
            </button>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-8.5 px-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
          >
            <option value="All">All Statuses</option>
            {PAYMENT_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Ledger Table */}
      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading payments ledger...</div>
      ) : filteredTx.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No payment transactions found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery
              ? 'No transactions match your search filter.'
              : 'There are no active transactions recorded in this flow view. Record a new settlement below.'}
          </p>
          <Button
            size="sm"
            className="mt-4 bg-[#58051E] hover:bg-[#430316] text-xs font-bold cursor-pointer"
            onClick={() => {
              setNewTx(initialTx);
              setShowAddModal(true);
            }}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Record New Payment
          </Button>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden border border-slate-200/70 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Transaction Ref</th>
                  <th className="py-3 px-4">Direction</th>
                  <th className="py-3 px-4">Partner Entity</th>
                  <th className="py-3 px-4">Description & Links</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredTx.map((tx) => {
                  const isInbound = tx.flow_type === 'inbound';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-black text-[#58051E] whitespace-nowrap font-mono">
                        {tx.id}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                            isInbound
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {isInbound ? (
                            <>
                              <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> Received
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-3 h-3 text-rose-600" /> Paid Out
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[160px]" title={tx.partner}>
                            {tx.partner}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-[200px]">
                        <div className="truncate" title={tx.desc}>{tx.desc || 'Trade transaction'}</div>
                        {(tx.invoice_no || tx.shipment_no) && (
                          <div className="text-[10px] font-bold text-blue-600 flex items-center gap-1.5 mt-0.5">
                            {tx.invoice_no && <span>📄 {tx.invoice_no}</span>}
                            {tx.shipment_no && <span>🚢 {tx.shipment_no}</span>}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-bold text-[11px]">
                        {tx.type}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`font-black text-sm font-mono ${
                            isInbound ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {isInbound ? `+${tx.amount}` : `-${tx.amount}`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-mono">{tx.date}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <select
                          value={tx.status}
                          onChange={(e) => handleStatusChange(tx.id, tx.rawId, e.target.value)}
                          className={`text-[10.5px] font-extrabold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none ${tx.statusBadge}`}
                        >
                          {PAYMENT_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleInspectTx(tx)}
                            className="p-1.5 text-slate-400 hover:text-[#58051E] hover:bg-slate-100 rounded-lg cursor-pointer"
                            title="Inspect Transaction"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePayment(tx.id, tx.rawId)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Record Payment / Settlement Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#58051E]" /> Record Trade Settlement & Cashflow
                </h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddPayment} className="space-y-4">
                {/* Flow Direction Selector */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                    Payment Direction (Flow)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewTx({ ...newTx, flow_type: 'inbound' })}
                      className={`p-3 rounded-xl border-2 text-left cursor-pointer transition-all ${
                        newTx.flow_type === 'inbound'
                          ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-black text-xs text-emerald-700">
                        <ArrowDownLeft className="w-4 h-4" /> Payment Received (Inflow)
                      </div>
                      <p className="text-[10px] font-medium text-slate-500 mt-1">
                        Buyer settlements, LC payouts, export deposits
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewTx({ ...newTx, flow_type: 'outbound' })}
                      className={`p-3 rounded-xl border-2 text-left cursor-pointer transition-all ${
                        newTx.flow_type === 'outbound'
                          ? 'border-rose-500 bg-rose-50/50 text-rose-950 shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-black text-xs text-rose-700">
                        <ArrowUpRight className="w-4 h-4" /> Payment Paid Out (Outflow)
                      </div>
                      <p className="text-[10px] font-medium text-slate-500 mt-1">
                        Freight, port fees, demurrage, customs duty
                      </p>
                    </button>
                  </div>
                </div>

                {/* Partner Entity */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Trade Partner / Entity Name
                  </label>
                  <input
                    type="text"
                    required
                    list="crm-payments-partners-list"
                    value={newTx.partner}
                    onChange={(e) => setNewTx({ ...newTx, partner: e.target.value })}
                    placeholder="e.g. Baltic Grain Sp. z o.o. or Maersk Line"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                  <datalist id="crm-payments-partners-list">
                    {crmPartners.map((p) => (
                      <option key={p.id} value={p.company_name || p.name}>
                        {p.category ? `${p.company_name || p.name} (${p.category})` : p.company_name || p.name}
                      </option>
                    ))}
                  </datalist>
                </div>

                {/* Link to Commercial Invoice (Auto reconciliation) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                      Link Commercial Invoice
                    </label>
                    <select
                      value={newTx.invoice_no}
                      onChange={(e) => {
                        const invNo = e.target.value;
                        const inv = invoices.find((i) => (i.invoice_no || i.id) === invNo);
                        setNewTx({
                          ...newTx,
                          invoice_no: invNo,
                          partner: inv ? inv.buyer_name : newTx.partner,
                          amount: inv ? String(inv.outstanding_amount || inv.amount) : newTx.amount,
                          desc: inv ? `Settlement for Invoice ${inv.invoice_no || inv.id}` : newTx.desc
                        });
                      }}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    >
                      <option value="">-- No Linked Invoice --</option>
                      {invoices.map((i) => (
                        <option key={i.id} value={i.invoice_no || i.id}>
                          {i.invoice_no || i.id} - {i.buyer_name} (Due: ₹{Number(i.outstanding_amount || i.amount).toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                      Link Container Shipment
                    </label>
                    <select
                      value={newTx.shipment_no}
                      onChange={(e) => setNewTx({ ...newTx, shipment_no: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    >
                      <option value="">-- No Linked Shipment --</option>
                      {shipments.map((s) => (
                        <option key={s.id} value={s.shipment_no || s.id}>
                          {s.shipment_no || s.id} ({s.carrier || 'Ocean'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Transaction Description & Scope
                  </label>
                  <input
                    type="text"
                    required
                    value={newTx.desc}
                    onChange={(e) => setNewTx({ ...newTx, desc: e.target.value })}
                    placeholder={
                      newTx.flow_type === 'inbound'
                        ? 'e.g. Irrevocable LC 60-day buyer settlement for SHP-EU-8840'
                        : 'e.g. Ocean freight forwarding & container THC charges'
                    }
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                      Settlement Amount
                    </label>
                    <input
                      type="text"
                      required
                      value={newTx.amount}
                      onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                      placeholder="e.g. 4250000"
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                      Currency
                    </label>
                    <select
                      value={newTx.currency}
                      onChange={(e) => setNewTx({ ...newTx, currency: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    >
                      {TRADE_MASTER_CURRENCIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                      Payment Rail / Method
                    </label>
                    <select
                      value={newTx.type}
                      onChange={(e) => setNewTx({ ...newTx, type: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    >
                      {TRADE_MASTER_PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                      Settlement Date
                    </label>
                    <input
                      type="date"
                      required
                      value={newTx.date}
                      onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                      Status
                    </label>
                    <select
                      value={newTx.status}
                      onChange={(e) => setNewTx({ ...newTx, status: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    >
                      {PAYMENT_STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs font-bold cursor-pointer"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316] cursor-pointer"
                  >
                    Record {newTx.flow_type === 'inbound' ? 'Inflow' : 'Outflow'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Inspect Modal */}
      <AnimatePresence>
        {selectedTx && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
              onClick={() => setSelectedTx(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#58051E]" /> SWIFT Settlement Dossier
                </h3>
                <button onClick={() => setSelectedTx(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">Reference No.</span>
                  <span className="text-xs font-black text-[#58051E] font-mono">{selectedTx.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">Flow Direction</span>
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                      selectedTx.flow_type === 'inbound'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {selectedTx.flow_type === 'inbound' ? 'Inbound (Received)' : 'Outbound (Paid Out)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">Amount</span>
                  <span className="text-base font-black text-slate-900 font-mono">{selectedTx.amount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">Partner Entity</span>
                  <span className="text-xs font-bold text-slate-800">{selectedTx.partner}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">Instrument</span>
                  <span className="text-xs font-bold text-slate-800">{selectedTx.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">Date</span>
                  <span className="text-xs font-bold text-slate-800 font-mono">{selectedTx.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">Status</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${selectedTx.statusBadge}`}>
                    {selectedTx.status}
                  </span>
                </div>
              </div>

              {dossier && (
                <div className="space-y-2 pt-1 text-xs">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Linked Ecosystem Details</h4>
                  {dossier.invoices && dossier.invoices.length > 0 && (
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-1">
                      <div className="font-bold text-emerald-900 flex items-center gap-1.5"><FileSpreadsheet className="w-3.5 h-3.5" /> Reconciled Invoice</div>
                      <div className="text-slate-700">{dossier.invoices[0].invoice_no} (Status: {dossier.invoices[0].payment_status || dossier.invoices[0].status})</div>
                    </div>
                  )}
                  {dossier.shipments && dossier.shipments.length > 0 && (
                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-1">
                      <div className="font-bold text-blue-900 flex items-center gap-1.5"><Ship className="w-3.5 h-3.5" /> Linked Cargo Shipment</div>
                      <div className="text-slate-700">{dossier.shipments[0].shipment_no} ({dossier.shipments[0].origin_port} → {dossier.shipments[0].destination_port})</div>
                    </div>
                  )}
                </div>
              )}

              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs font-bold cursor-pointer"
                onClick={() => setSelectedTx(null)}
              >
                Close Dossier
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
