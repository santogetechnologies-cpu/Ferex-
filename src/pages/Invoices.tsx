import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSpreadsheet, Download, Eye, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { Card } from '../components/Card';

export const Invoices: React.FC = () => {
  const [invoices] = useState([
    { id: 1, invNo: 'INV-2026-0410', desc: 'Ferex Administrative Processing Fee', amount: '$450.00', date: 'Jun 12, 2026', status: 'Paid' },
    { id: 2, invNo: 'INV-2026-0457', desc: 'Stanford Application Submission Fee', amount: '$125.00', date: 'Jun 28, 2026', status: 'Paid' },
    { id: 3, invNo: 'INV-2026-0498', desc: 'MIT Transcript Evaluation Legalization', amount: '$150.00', date: 'Jul 04, 2026', status: 'Paid' },
    { id: 4, invNo: 'INV-2026-0560', desc: 'NAWA Polish Equivalency Validation Charge', amount: '$1,200.00', date: 'Aug 01, 2026', status: 'Unpaid' },
  ]);

  const [toastMessage, setToastMessage] = useState('');

  const handleDownload = (invNo: string) => {
    showToast(`Downloading Invoice File: ${invNo}.pdf`);
  };

  const handleView = (invNo: string) => {
    showToast(`Opening Invoice Viewer for ${invNo}...`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  return (
    <div className="space-y-6 text-left relative">
      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[#6A1B2E] text-white px-4 py-3 rounded-lg shadow-lg text-xs font-bold flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1.5 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#6A1B2E]/5 text-[#6A1B2E] flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            Invoices
          </h1>
          <p className="text-sm font-semibold text-slate-500">
            Ferex Education • Invoices generated for program fees, applications, and legal translations.
          </p>
        </div>
      </div>

      {/* Invoices list card/table */}
      <Card className="overflow-hidden border border-slate-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-semibold select-none">
            <thead className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-400 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Invoice ID</th>
                <th className="px-6 py-4">Billing Item Description</th>
                <th className="px-6 py-4">Billing Amount</th>
                <th className="px-6 py-4">Issue Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {invoices.map((inv) => {
                const isPaid = inv.status === 'Paid';

                return (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{inv.invNo}</td>
                    <td className="px-6 py-4 text-slate-500 font-semibold">{inv.desc}</td>
                    <td className="px-6 py-4 text-slate-900 font-extrabold">{inv.amount}</td>
                    <td className="px-6 py-4 text-slate-400">{inv.date}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 border rounded-full text-[9px] uppercase font-bold ${
                        isPaid 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {isPaid ? <CheckCircle2 className="w-3 h-3" strokeWidth={2.5} /> : <AlertCircle className="w-3 h-3" strokeWidth={2.5} />}
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleView(inv.invNo)}
                          className="p-1 text-slate-400 hover:text-[#6A1B2E] rounded hover:bg-slate-50 transition-colors"
                          title="View Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(inv.invNo)}
                          className="p-1 text-slate-400 hover:text-[#6A1B2E] rounded hover:bg-slate-50 transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
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
    </div>
  );
};
