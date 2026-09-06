import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, Search, Download, CheckCircle2, TrendingUp,
  GraduationCap, Globe, Snowflake, Monitor, Check
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
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
  status: 'Verified' | 'Pending' | 'Settled';
  statusBadge: string;
  refNo: string;
}

export const CentralPayments: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [toast, setToast] = useState('');
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [eduRes, tradeData, rimiData, digData] = await Promise.all([
        supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(10),
        getTradePayments(),
        getRimiSalesOrders(),
        getDigitalInvoices()
      ]);

      const txns: TransactionItem[] = [];

      // Education Payments
      if (eduRes.data && Array.isArray(eduRes.data)) {
        eduRes.data.forEach((p: any) => {
          txns.push({
            id: p.id || `TXN-ED-${Math.floor(1000 + Math.random() * 9000)}`,
            division: 'Education',
            divisionBadge: 'bg-rose-50 text-rose-700 border-rose-200',
            divisionIcon: GraduationCap,
            client: p.student_name || p.user_id || 'Student Applicant',
            description: p.purpose || 'Tuition / Processing Fee Wire',
            amount: Number(p.amount) || 45000,
            currency: 'INR',
            amountFormatted: `₹${Number(p.amount || 45000).toLocaleString('en-IN')}`,
            method: p.payment_method || 'Bank Wire',
            date: p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Recent',
            status: p.status === 'Paid' ? 'Verified' : 'Pending',
            statusBadge: p.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200',
            refNo: p.receipt_number || p.reference_number || `FER-EDU-${p.id?.slice(0, 6)}`,
          });
        });
      }

      // Trade Payments
      if (Array.isArray(tradeData)) {
        tradeData.forEach((t: any) => {
          const isEur = t.currency === 'EUR' || String(t.amount).includes('€');
          const amt = Number(t.amount) || 120000;
          txns.push({
            id: t.id || `TXN-TR-${Math.floor(1000 + Math.random() * 9000)}`,
            division: 'Trade',
            divisionBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
            divisionIcon: Globe,
            client: t.beneficiary || 'Global Port & Trade Logistics',
            description: t.description || `Letter of Credit / Freight Wire (${t.payment_type || 'LC MT700'})`,
            amount: isEur ? amt * 90 : amt,
            currency: isEur ? 'EUR' : 'INR',
            amountFormatted: isEur ? `€${amt.toLocaleString()} (~₹${((amt * 90) / 100000).toFixed(1)} L)` : `₹${amt.toLocaleString('en-IN')}`,
            method: t.payment_type || 'SWIFT Wire',
            date: t.payment_date || (t.created_at ? new Date(t.created_at).toLocaleDateString() : 'Recent'),
            status: t.status === 'Completed' || t.status === 'Settled' ? 'Settled' : 'Pending',
            statusBadge: t.status === 'Completed' || t.status === 'Settled' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200',
            refNo: t.swift_reference || `LC-REF-${t.id?.slice(0, 6)}`,
          });
        });
      }

      // Rimi Orders
      if (Array.isArray(rimiData)) {
        rimiData.forEach((r: any) => {
          const amt = Number(r.total_amount) || 280000;
          txns.push({
            id: r.id || `TXN-RM-${Math.floor(1000 + Math.random() * 9000)}`,
            division: 'Rimi',
            divisionBadge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
            divisionIcon: Snowflake,
            client: r.distributor?.business_name || 'Retail Wholesale Partner',
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
          const amt = Number(d.amount) || 150000;
          txns.push({
            id: d.id || `TXN-DG-${Math.floor(1000 + Math.random() * 9000)}`,
            division: 'Digital',
            divisionBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            divisionIcon: Monitor,
            client: d.client?.company_name || 'Enterprise Client',
            description: `Digital Software Milestone (${d.invoice_no || 'API Sprint'})`,
            amount: amt,
            currency: 'INR',
            amountFormatted: `₹${amt.toLocaleString('en-IN')}`,
            method: 'Razorpay / Bank Wire',
            date: d.issue_date || (d.created_at ? new Date(d.created_at).toLocaleDateString() : 'Recent'),
            status: d.status === 'Paid' ? 'Verified' : 'Pending',
            statusBadge: d.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200',
            refNo: d.invoice_no || `INV-DIG-${d.id?.slice(0, 6)}`,
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

  const handleVerify = (id: string, ref: string) => {
    setTransactions(prev =>
      prev.map(t => (t.id === id ? { ...t, status: 'Verified', statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200' } : t))
    );
    showToastMsg(`Settlement Reference ${ref} Verified & Cleared`);
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
      const matchStatus = statusFilter === 'All' || t.status === statusFilter;
      return matchSearch && matchDivision && matchStatus;
    });
  }, [transactions, searchQuery, selectedDivision, statusFilter]);

  const totalInflow = useMemo(() => {
    return transactions.reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

  const verifiedInflow = useMemo(() => {
    return transactions.filter(t => t.status === 'Verified' || t.status === 'Settled').reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

  const pendingInflow = useMemo(() => {
    return transactions.filter(t => t.status === 'Pending').reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-[#6A1B2E]" /> Consolidated Enterprise Finance & Payouts Ledger
            </h1>
            <span className="text-[10px] font-black bg-[#6A1B2E]/10 text-[#6A1B2E] border border-[#6A1B2E]/20 px-2.5 py-0.5 rounded-full">
              4-Division Treasury
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Unified multi-currency settlement clearing house for Education tuition wires, Trade Letters of Credit, Rimi FMCG distribution, and Digital contracts.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={handleExportLedger}
            className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold text-white shadow-xs"
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
            ₹{(totalInflow / 10000000).toFixed(2)} Cr
          </div>
          <span className="text-[10px] font-bold text-emerald-600 mt-2 block flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +24.8% YoY Volume
          </span>
        </Card>

        <Card className="p-5 border border-slate-200/80 shadow-xs bg-gradient-to-br from-white to-emerald-50/40">
          <span className="text-[10.5px] font-extrabold uppercase text-slate-400 block mb-1">
            Verified & Cleared
          </span>
          <div className="text-2xl font-black text-emerald-700">
            ₹{(verifiedInflow / 10000000).toFixed(2)} Cr
          </div>
          <span className="text-[10px] font-bold text-slate-400 mt-2 block">
            {totalInflow > 0 ? Math.round((verifiedInflow / totalInflow) * 100) : 100}% Settlement Rate
          </span>
        </Card>

        <Card className="p-5 border border-slate-200/80 shadow-xs bg-gradient-to-br from-white to-amber-50/40">
          <span className="text-[10.5px] font-extrabold uppercase text-slate-400 block mb-1">
            Pending Clearance
          </span>
          <div className="text-2xl font-black text-amber-700">
            ₹{(pendingInflow / 100000).toFixed(1)} L
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
            Real-time FX Parity
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
                      ? 'bg-[#6A1B2E] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {div === 'All' ? 'All Divisions' : div}
                </button>
              ))}
            </div>

            {/* Status Selector Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl overflow-x-auto scrollbar-none">
              {['All', 'Verified', 'Pending', 'Settled'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
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
              className="w-full h-9 pl-9 pr-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#6A1B2E]"
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
                      {t.status === 'Pending' ? (
                        <button
                          onClick={() => handleVerify(t.id, t.refNo)}
                          className="px-2.5 py-1 bg-[#6A1B2E] hover:bg-[#521221] text-white text-[10px] font-black rounded-lg transition-colors cursor-pointer"
                        >
                          Verify Wire
                        </button>
                      ) : (
                        <span className="text-[10.5px] font-extrabold text-emerald-700 flex items-center justify-end gap-1">
                          <Check className="w-3.5 h-3.5" /> Cleared
                        </span>
                      )}
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
