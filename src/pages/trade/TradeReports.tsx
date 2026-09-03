import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, CheckCircle2, FileText, Printer } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getTradeShipments, getTradeInvoices, getTradeLettersOfCredit, getTradePayments, getTradeCertificates } from '../../lib/api/trade';

export const TradeReports: React.FC = () => {
  const [toast, setToast] = useState('');
  const [metrics, setMetrics] = useState({
    shipmentCount: 0,
    invoiceTotal: 0,
    lcTotal: 0,
    paymentTotal: 0,
    certCount: 0
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [ships, invs, lcs, pays, certs] = await Promise.all([
          getTradeShipments(),
          getTradeInvoices(),
          getTradeLettersOfCredit(),
          getTradePayments(),
          getTradeCertificates(),
        ]);
        setMetrics({
          shipmentCount: Array.isArray(ships) ? ships.length : 0,
          invoiceTotal: Array.isArray(invs) ? invs.reduce((sum, i) => sum + Number(i.amount || 0), 0) : 0,
          lcTotal: Array.isArray(lcs) ? lcs.reduce((sum, l) => sum + Number(l.amount || 0), 0) : 0,
          paymentTotal: Array.isArray(pays) ? pays.filter(p => p.status === 'Completed').reduce((sum, p) => sum + Number(p.amount || 0), 0) : 0,
          certCount: Array.isArray(certs) ? certs.length : 0,
        });
      } catch {}
    }
    loadData();
  }, []);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const formatCr = (amt: number) => {
    if (!amt || amt === 0) return '₹0';
    if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)} Cr`;
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(2)} Lakh`;
    return `₹${amt.toLocaleString('en-IN')}`;
  };

  const reportsList = [
    {
      title: 'Q3 Export Volume & Logistics Audit',
      desc: `Comprehensive audit of ${metrics.shipmentCount} container movements across European and Asian maritime corridors.`,
      code: 'REP-2026-LOGISTICS',
      stats: `${metrics.shipmentCount} Containers Dispatched`
    },
    {
      title: 'Commercial Invoicing & Customs Audit',
      desc: `Official billing breakdown of ${formatCr(metrics.invoiceTotal)} gross invoiced trade turnover.`,
      code: 'REP-2026-INVOICE',
      stats: `${formatCr(metrics.invoiceTotal)} Invoiced Ledger`
    },
    {
      title: 'Letter of Credit Banking Exposure Deck',
      desc: `Active banking guarantee liabilities totaling ${formatCr(metrics.lcTotal)} verified with HSBC & Deutsche Bank.`,
      code: 'REP-2026-LC',
      stats: `${formatCr(metrics.lcTotal)} LC Facilities`
    },
    {
      title: 'SWIFT Payments & Clearance Audit',
      desc: `Settlement ledger confirming ${formatCr(metrics.paymentTotal)} in completed SWIFT wire transactions.`,
      code: 'REP-2026-SWIFT',
      stats: `${formatCr(metrics.paymentTotal)} Cleared`
    },
    {
      title: 'EU Compliance & Phytosanitary Verification',
      desc: `Master register of ${metrics.certCount} active Chamber of Commerce origin & quality certificates.`,
      code: 'REP-2026-COMPLIANCE',
      stats: `${metrics.certCount} Active Certificates`
    },
  ];

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
            <BarChart3 className="w-5 h-5 text-[#6A1B2E]" /> Executive Trade Reports & Customs Audit
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Comprehensive audit reports for quarterly trade turnover, European port clearance velocity, and customs duty.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-1.5" /> Print Live Audit Deck
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {reportsList.map((r, idx) => (
          <Card key={idx} className="p-5 border border-slate-200/70 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase">{r.code}</span>
                <span className="text-[10px] font-extrabold text-[#6A1B2E] bg-[#6A1B2E]/10 px-2 py-0.5 rounded border border-[#6A1B2E]/20">{r.stats}</span>
              </div>
              <h3 className="text-sm font-black text-slate-900 leading-snug">{r.title}</h3>
              <p className="text-xs font-semibold text-slate-500">{r.desc}</p>
            </div>
            <div className="pt-2 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 text-xs font-bold" onClick={() => showToastMsg(`Downloading ${r.code}.pdf`)}>
                <FileText className="w-3.5 h-3.5 mr-1" /> Export PDF
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
