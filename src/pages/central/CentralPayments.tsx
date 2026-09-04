import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, Search, Download, CheckCircle2, TrendingUp,
  GraduationCap, Globe, Snowflake, Monitor, Check
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

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

  const [transactions, setTransactions] = useState<TransactionItem[]>([
    {
      id: 'TXN-ED-8091',
      division: 'Education',
      divisionBadge: 'bg-rose-50 text-rose-700 border-rose-200',
      divisionIcon: GraduationCap,
      client: 'Rahul Sharma (Warsaw University)',
      description: 'Spring Semester 2026 Tuition Fee Wire',
      amount: 480000,
      currency: 'INR',
      amountFormatted: '₹4,80,000',
      method: 'Bank Wire / Swift',
      date: 'Today, 10:45 AM',
      status: 'Verified',
      statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      refNo: 'FER-EDU-WR-9921',
    },
    {
      id: 'TXN-TR-4022',
      division: 'Trade',
      divisionBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      divisionIcon: Globe,
      client: 'Hamburg Port Logistics BV',
      description: 'Letter of Credit EUR 120,000 Settlement',
      amount: 10800000,
      currency: 'EUR',
      amountFormatted: '€120,000 (~₹1.08 Cr)',
      method: 'LC Swift MT700',
      date: 'Yesterday',
      status: 'Settled',
      statusBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      refNo: 'LC-DE-HAM-8841',
    },
    {
      id: 'TXN-RM-1094',
      division: 'Rimi',
      divisionBadge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      divisionIcon: Snowflake,
      client: 'Metro Fresh Supermarkets Ltd',
      description: 'Cold-Chain Wholesale Batch #8492 Delivery',
      amount: 345000,
      currency: 'INR',
      amountFormatted: '₹3,45,000',
      method: 'RTGS Settlement',
      date: '2 days ago',
      status: 'Verified',
      statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      refNo: 'RIM-ORD-7712',
    },
    {
      id: 'TXN-DG-5011',
      division: 'Digital',
      divisionBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      divisionIcon: Monitor,
      client: 'Nexus FinTech Global',
      description: 'Enterprise React & Node API Milestone 3',
      amount: 150000,
      currency: 'INR',
      amountFormatted: '₹1,50,000',
      method: 'Razorpay Webhook',
      date: '3 days ago',
      status: 'Verified',
      statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      refNo: 'INV-DIG-3390',
    },
    {
      id: 'TXN-ED-8092',
      division: 'Education',
      divisionBadge: 'bg-rose-50 text-rose-700 border-rose-200',
      divisionIcon: GraduationCap,
      client: 'Sneha Roy (TU Berlin)',
      description: 'NAWA Legalization & Embassy Document Clearance',
      amount: 45000,
      currency: 'INR',
      amountFormatted: '₹45,000',
      method: 'UPI AutoPay',
      date: '3 days ago',
      status: 'Verified',
      statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      refNo: 'FER-EDU-DOC-4410',
    },
    {
      id: 'TXN-TR-4023',
      division: 'Trade',
      divisionBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      divisionIcon: Globe,
      client: 'Antwerp Ocean Freight Corp',
      description: 'Ocean Freight Customs Bill of Lading BL-9901',
      amount: 4200000,
      currency: 'EUR',
      amountFormatted: '€46,500 (~₹42.0 L)',
      method: 'Direct Wire Wire-Transfer',
      date: '4 days ago',
      status: 'Pending',
      statusBadge: 'bg-amber-50 text-amber-700 border-amber-200',
      refNo: 'BL-EXP-8891',
    },
    {
      id: 'TXN-RM-1095',
      division: 'Rimi',
      divisionBadge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      divisionIcon: Snowflake,
      client: 'Reliance Retail Supply Hub',
      description: 'Frozen Seafood & Cold Storage Logistics Batch',
      amount: 520000,
      currency: 'INR',
      amountFormatted: '₹5,20,000',
      method: 'Bank Transfer',
      date: '5 days ago',
      status: 'Verified',
      statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      refNo: 'RIM-ORD-7740',
    },
    {
      id: 'TXN-DG-5012',
      division: 'Digital',
      divisionBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      divisionIcon: Monitor,
      client: 'Apex Health Systems',
      description: 'Mobile iOS/Android Health App Sprint 4 Release',
      amount: 250000,
      currency: 'INR',
      amountFormatted: '₹2,50,000',
      method: 'Razorpay PG',
      date: '6 days ago',
      status: 'Verified',
      statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      refNo: 'INV-DIG-3412',
    },
  ]);

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
            94.2% Settlement Rate
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
              {filteredTxns.length > 0 ? (
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
