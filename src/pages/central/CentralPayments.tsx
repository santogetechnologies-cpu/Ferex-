import { Link } from 'react-router-dom';
import { listEducationPayments } from '../../lib/api/educationBilling';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, Search, Download, CheckCircle2, TrendingUp,
  GraduationCap, Globe, Snowflake, Monitor, Check, Trash2
} from 'lucide-react';
import { deletePaymentRecord } from '../../lib/api/payments';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import { supabase } from '../../lib/supabase';
import { getTradePayments } from '../../lib/api/trade';
import { getRimiSalesOrders } from '../../lib/api/rimi';
import { getDigitalInvoices } from '../../lib/api/digital';

interface TransactionItem {
  id: string;
  division: 'Education' | 'Trade' | 'Rimi' | 'Digital';
  divisionBadge: string;
  divisionIcon: any;
  client: string;
  description: string;
  amount: number;
  currency: 'INR' | 'EUR' | 'USD';
  amountFormatted: string;
  method: string;
  date: string;
  status: string;
  statusBadge: string;
  refNo: string;
}

export const CentralPayments: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('All');
  const [toast, setToast] = useState('');
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalItem, setDeleteModalItem] = useState<TransactionItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [eduRes, tradeData, rimiData, digData] = await Promise.all([
        listEducationPayments().then(data => ({ data })),
        getTradePayments(),
        getRimiSalesOrders(),
        getDigitalInvoices()
      ]);

      const txns: TransactionItem[] = [];

      // Education Payments
      if (eduRes.data && Array.isArray(eduRes.data)) {
        eduRes.data.forEach((p: any) => {
          const amt = Number(p.amount) || 0;
          txns.push({
            id: p.id || `TXN-ED-${Math.floor(1000 + Math.random() * 9000)}`,
            division: 'Education',
            divisionBadge: 'bg-rose-50 text-rose-700 border-rose-200',
            divisionIcon: GraduationCap,
            client: p.student_name || p.user_id || 'Student Applicant',
            description: p.title || p.description || 'Education payment',
            amount: amt,
            currency: p.currency || 'INR',
            amountFormatted: new Intl.NumberFormat('en-IN', { style: 'currency', currency: p.currency || 'INR' }).format(amt),
            method: p.payment_method || 'Bank Wire',
            date: p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Recent',
            status: p.status,
            statusBadge: ['Paid', 'Verified'].includes(p.status) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200',
            refNo: p.ref_no || p.utr_number || `FER-EDU-${p.id?.slice(0, 6)}`,
          });
        });
      }

      // Trade Payments
      if (Array.isArray(tradeData)) {
        tradeData.forEach((t: any) => {
          const isEur = t.currency === 'EUR' || String(t.amount).includes('€');
          const amt = Number(t.amount) || 0;
          txns.push({
            id: t.id || `TXN-TR-${Math.floor(1000 + Math.random() * 9000)}`,
            division: 'Trade',
            divisionBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
            divisionIcon: Globe,
            client: t.beneficiary || t.partner_entity || 'Global Port & Trade Logistics',
            description: t.description || `Letter of Credit / Freight Wire (${t.payment_type || 'LC MT700'})`,
            amount: amt,
            currency: isEur ? 'EUR' : 'INR',
            amountFormatted: isEur ? `€${amt.toLocaleString()} (~₹${Math.round(amt * 90).toLocaleString('en-IN')})` : `₹${amt.toLocaleString('en-IN')}`,
            method: t.payment_type || 'SWIFT Wire',
            date: t.payment_date || t.settlement_date || (t.created_at ? new Date(t.created_at).toLocaleDateString() : 'Recent'),
            status: t.status === 'Completed' || t.status === 'Settled' ? 'Settled' : 'Pending',
            statusBadge: t.status === 'Completed' || t.status === 'Settled' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200',
            refNo: t.transaction_ref || t.swift_reference || `LC-REF-${t.id?.slice(0, 6)}`,
          });
        });
      }

      // Rimi Orders
      if (Array.isArray(rimiData)) {
        rimiData.forEach((r: any) => {
          const amt = Number(r.total_amount) || 0;
          txns.push({
            id: r.id || `TXN-RM-${Math.floor(1000 + Math.random() * 9000)}`,
            division: 'Rimi',
            divisionBadge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
            divisionIcon: Snowflake,
            client: r.distributor?.business_name || r.customer_name || 'Retail Wholesale Partner',
            description: `Cold Chain Dispatch Order #${r.order_no || 'FMCG-BATCH'}`,
            amount: amt,
            currency: 'INR',
            amountFormatted: `₹${amt.toLocaleString('en-IN')}`,
            method: 'RTGS / Settlement',
            date: r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent',
            status: r.order_status === 'Delivered' || r.payment_status === 'Paid' ? 'Verified' : 'Pending',
            statusBadge: r.order_status === 'Delivered' || r.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200',
            refNo: r.order_no || `RIM-ORD-${r.id?.slice(0, 6)}`,
          });
        });
      }

      // Digital Invoices
      if (Array.isArray(digData)) {
        digData.forEach((d: any) => {
          const amt = Number(d.amount) || 0;
          txns.push({
            id: d.id || `TXN-DG-${Math.floor(1000 + Math.random() * 9000)}`,
            division: 'Digital',
            divisionBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            divisionIcon: Monitor,
            client: d.client?.company_name || d.client_name || '',
            description: `Digital contract · ${d.project?.title || 'project'} · ${Number(d.amount_received || 0).toLocaleString()} received, ${Number(d.balance_due || 0).toLocaleString()} outstanding`,
            amount: amt,
            currency: d.currency || 'USD',
            amountFormatted: new Intl.NumberFormat('en-IN', { style: 'currency', currency: d.currency || 'USD' }).format(amt),
            method: 'Per milestone',
            date: d.issued_at || (d.created_at ? new Date(d.created_at).toLocaleDateString() : 'Recent'),
            status: d.status === 'Paid' ? 'Verified' : 'Pending',
            statusBadge: d.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200',
            refNo: `DIG-${String(d.id).slice(0, 8).toUpperCase()}`,
          });
        });
      }

      setTransactions(txns);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_central_payments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_payments' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_sales_orders' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_invoices' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleExportLedger = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['ID,Division,Client,Description,Amount,Method,Date,Status,RefNo']
        .concat(
          transactions.map(
            t => `${t.id},${t.division},"${t.client}","${t.description}",${t.amount},${t.method},${t.date},${t.status},${t.refNo}`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FEREX_Consolidated_Finance_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToastMsg('Consolidated Financial Ledger CSV Exported');
  };

  const filteredTxns = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch =
        t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.refNo.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDivision = selectedDivision === 'All' || t.division === selectedDivision;
      return matchSearch && matchDivision;
    });
  }, [transactions, searchQuery, selectedDivision]);

  const currencySummary = (predicate: (t: TransactionItem) => boolean) => {
    const totals: Record<string, number> = {};
    filteredTxns.filter(predicate).forEach(t => { totals[t.currency] = (totals[t.currency] || 0) + t.amount; });
    return Object.entries(totals).map(([currency, amount]) => new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount)).join(' · ') || '—';
  };
  const totalInflow = currencySummary(() => true);
  const verifiedInflow = currencySummary(t => ['Paid', 'Verified', 'Settled'].includes(t.status));
  const pendingInflow = currencySummary(t => ['Pending', 'Pending Verification'].includes(t.status));

  return (
    <div className="space-y-6 text-left antialiased">
      <Link to="/central/education-billing" className="inline-block rounded-xl bg-[#58051E] px-4 py-2 text-white text-sm">Education billing &amp; fee configuration</Link>
      {/* Toast Notification */}
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-[#58051E]" /> Consolidated Finance & Payouts Ledger
            </h1>
            <span className="text-[10px] font-black bg-[#58051E]/10 text-[#58051E] border border-[#58051E]/20 px-2.5 py-0.5 rounded-full">
              4-Division Treasury
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Consolidated payment ledger for Education, Trade, Rimi and Digital.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={handleExportLedger}
            className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold text-white shadow-xs"
          >
            <Download className="w-4 h-4 mr-1.5" /> Export Treasury CSV
          </Button>
        </div>
      </div>

      {/* Financial Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border border-slate-200/80 shadow-xs bg-gradient-to-br from-white to-slate-50">
          <span className="text-[10.5px] font-extrabold uppercase text-slate-400 block mb-1">
            Total Combined Inflow
          </span>
          <div className="text-2xl font-black text-slate-900">
            {totalInflow}
          </div>
          <span className="text-[10px] font-bold text-emerald-600 mt-2 block flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Live Multi-Platform Aggregate
          </span>
        </Card>

        <Card className="p-5 border border-slate-200/80 shadow-xs bg-gradient-to-br from-white to-emerald-50/40">
          <span className="text-[10.5px] font-extrabold uppercase text-slate-400 block mb-1">
            Verified & Cleared
          </span>
          <div className="text-2xl font-black text-emerald-700">
            {verifiedInflow}
          </div>
          <span className="text-[10px] font-bold text-slate-400 mt-2 block">
            Verified receipts by currency
          </span>
        </Card>

        <Card className="p-5 border border-slate-200/80 shadow-xs bg-gradient-to-br from-white to-amber-50/40">
          <span className="text-[10.5px] font-extrabold uppercase text-slate-400 block mb-1">
            Pending Clearance
          </span>
          <div className="text-2xl font-black text-amber-700">
            {pendingInflow}
          </div>
          <span className="text-[10px] font-bold text-amber-600 mt-2 block">
            Requires Executive Review
          </span>
        </Card>

        <Card className="p-5 border border-slate-200/80 shadow-xs bg-gradient-to-br from-white to-indigo-50/40">
          <span className="text-[10.5px] font-extrabold uppercase text-slate-400 block mb-1">
            Active Multi-Currencies
          </span>
          <div className="text-2xl font-black text-indigo-700">
            INR • EUR • USD
          </div>
          <span className="text-[10px] font-bold text-slate-400 mt-2 block">
            Original transaction currencies
          </span>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Division Selector Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl overflow-x-auto scrollbar-none">
              {['All', 'Education', 'Trade', 'Rimi', 'Digital'].map(div => (
                <button
                  key={div}
                  onClick={() => setSelectedDivision(div)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    selectedDivision === div
                      ? 'bg-[#58051E] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {div === 'All' ? 'All Divisions' : div}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search reference, client, invoice..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#58051E]"
            />
          </div>
        </div>
      </Card>

      {/* Transaction Table */}
      <Card className="overflow-hidden border border-slate-200/80 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                <th className="py-3 px-4">Ref & Division</th>
                <th className="py-3 px-4">Client / Entity</th>
                <th className="py-3 px-4">Transaction Description</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs font-semibold">
                    Loading cross-divisional treasury records...
                  </td>
                </tr>
              ) : filteredTxns.length > 0 ? (
                filteredTxns.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-extrabold border ${t.divisionBadge}`}>
                          {t.division}
                        </span>
                        <span>{t.refNo}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">
                      {t.client}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {t.description}
                    </td>
                    <td className="py-3.5 px-4 font-black text-slate-900">
                      {t.amountFormatted}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {t.method}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {t.date}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${t.statusBadge}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {t.division === 'Education' ? <Link className="text-xs underline text-[#58051E]" to="/central/education-billing">Manage education payment</Link> : <span className="text-xs text-slate-500">Managed in source division</span>}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs font-semibold">
                    No transactions match your search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
};
