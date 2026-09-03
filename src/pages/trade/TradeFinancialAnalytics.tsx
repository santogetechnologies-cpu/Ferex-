import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Building2, CreditCard, ArrowUpRight } from 'lucide-react';
import { Card } from '../../components/Card';
import { getTradeInvoices, getTradePayments, getTradeLettersOfCredit } from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';

export const TradeFinancialAnalytics: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [lcs, setLcs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [invData, payData, lcData] = await Promise.all([
        getTradeInvoices(),
        getTradePayments(),
        getTradeLettersOfCredit(),
      ]);
      setInvoices(Array.isArray(invData) ? invData : []);
      setPayments(Array.isArray(payData) ? payData : []);
      setLcs(Array.isArray(lcData) ? lcData : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_trade_fin_analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_invoices' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_payments' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_letters_of_credit' }, () => loadData())
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_trade_invoices_change', handleLocalChange);
    window.addEventListener('ferex_trade_payments_change', handleLocalChange);
    window.addEventListener('ferex_trade_lcs_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_invoices_change', handleLocalChange);
      window.removeEventListener('ferex_trade_payments_change', handleLocalChange);
      window.removeEventListener('ferex_trade_lcs_change', handleLocalChange);
    };
  }, [loadData]);

  // Aggregate stats
  const totalInvoiced = invoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const totalSettled = payments.filter(p => p.status === 'Completed').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalOpenLC = lcs.filter(l => l.status !== 'Expired').reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const pendingInvoiced = invoices.filter(i => i.status === 'Issued').reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  const formatCr = (amt: number) => {
    if (!amt || amt === 0) return '₹0';
    if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)} Cr`;
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(2)} Lakh`;
    return `₹${amt.toLocaleString('en-IN')}`;
  };

  // Group invoices by Buyer
  const buyerAmounts: Record<string, number> = {};
  invoices.forEach(i => {
    const b = i.buyer_name || 'Global Buyer';
    buyerAmounts[b] = (buyerAmounts[b] || 0) + Number(i.amount || 0);
  });

  const buyerList = Object.entries(buyerAmounts).map(([buyer, amount]) => ({
    buyer,
    amount,
    amountStr: formatCr(amount),
    pct: totalInvoiced > 0 ? Math.round((amount / totalInvoiced) * 100) : 0
  })).sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-6 text-left antialiased">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-[#6A1B2E]" /> Trade Financial Analytics & Ledger Performance
        </h1>
        <p className="text-xs font-semibold text-slate-500 mt-1">
          Ferex Trade Intelligence • International revenue ledger, gross turnover, LC exposure, and live payment settlements in INR (₹).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Gross Invoiced Turnover', val: formatCr(totalInvoiced), sub: `${invoices.length} Commercial Invoices`, color: 'border-l-emerald-500' },
          { label: 'Settled Payments', val: formatCr(totalSettled), sub: `${payments.length} Settled Wires`, color: 'border-l-blue-500' },
          { label: 'Open LC Exposure', val: formatCr(totalOpenLC), sub: `${lcs.length} Active Bank Guarantees`, color: 'border-l-amber-500' },
          { label: 'Pending Receivables', val: formatCr(pendingInvoiced), sub: 'Awaiting Settlement', color: 'border-l-[#6A1B2E]' }
        ].map((kpi, idx) => (
          <Card key={idx} className={`p-4 border-l-4 ${kpi.color} border-slate-200/80 shadow-xs flex flex-col justify-between`}>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{kpi.label}</span>
            <div className="text-2xl font-black text-slate-900 my-1">{kpi.val}</div>
            <span className="text-[10px] font-extrabold text-slate-500">{kpi.sub}</span>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Buyer Revenue Distribution */}
        <Card className="p-6 text-left border border-slate-200/70 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#6A1B2E]" /> Revenue Turnover by Buyer / Consignee
          </h3>
          {loading ? (
            <div className="py-8 text-center text-xs font-semibold text-slate-400">Computing financial breakdown...</div>
          ) : buyerList.length === 0 ? (
            <div className="py-8 text-center text-xs font-semibold text-slate-400">No buyer invoice records found.</div>
          ) : (
            <div className="space-y-3">
              {buyerList.map((b, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span className="truncate pr-2">{b.buyer}</span>
                    <span className="text-slate-900 font-black shrink-0">{b.amountStr} ({b.pct}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#6A1B2E] rounded-full transition-all duration-500" style={{ width: `${b.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Payment Methods Breakdown */}
        <Card className="p-6 text-left border border-slate-200/70 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#6A1B2E]" /> Payment Settlement Channels
          </h3>
          <div className="space-y-3">
            {[
              { channel: 'SWIFT Wire Transfer', amount: formatCr(payments.filter(p => p.payment_type?.includes('SWIFT')).reduce((s, p) => s + Number(p.amount || 0), 0)), count: payments.filter(p => p.payment_type?.includes('SWIFT')).length },
              { channel: 'Letter of Credit (LC) Settlement', amount: formatCr(payments.filter(p => p.payment_type?.includes('LC')).reduce((s, p) => s + Number(p.amount || 0), 0)), count: payments.filter(p => p.payment_type?.includes('LC')).length },
              { channel: 'Direct Bank Settlement', amount: formatCr(payments.filter(p => !p.payment_type?.includes('SWIFT') && !p.payment_type?.includes('LC')).reduce((s, p) => s + Number(p.amount || 0), 0)), count: payments.filter(p => !p.payment_type?.includes('SWIFT') && !p.payment_type?.includes('LC')).length },
            ].map((ch, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-black text-slate-900">{ch.channel}</div>
                  <span className="text-[10px] font-semibold text-slate-500">{ch.count} Transactions Recorded</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-slate-900">{ch.amount}</div>
                  <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Active Channel</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
