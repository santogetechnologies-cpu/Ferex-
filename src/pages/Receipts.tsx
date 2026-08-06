import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCheck, Download, Printer, CheckCircle2, Sparkles } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

export const Receipts: React.FC = () => {
  const [receipts] = useState([
    { id: 1, recNo: 'REC-2026-1049', desc: 'Ferex Administrative Processing Fee', refTx: 'TX-2026-8901', amount: '$450.00', date: 'Jun 12, 2026' },
    { id: 2, recNo: 'REC-2026-1180', desc: 'Stanford Application Submission Fee', refTx: 'TX-2026-9214', amount: '$125.00', date: 'Jun 28, 2026' },
    { id: 3, recNo: 'REC-2026-1215', desc: 'MIT Transcript Evaluation Legalization', refTx: 'TX-2026-9541', amount: '$150.00', date: 'Jul 04, 2026' },
  ]);

  const [toastMessage, setToastMessage] = useState('');

  const handleDownload = (recNo: string) => {
    showToast(`Downloading Official Receipt: ${recNo}.pdf`);
  };

  const handlePrint = (recNo: string) => {
    showToast(`Sending ${recNo} to system printer queue...`);
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
              <FileCheck className="w-5 h-5" />
            </span>
            Receipts
          </h1>
          <p className="text-sm font-semibold text-slate-500">
            Ferex Education • Secure payment confirmations, billing references, and printable transcripts.
          </p>
        </div>
      </div>

      {/* Receipts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {receipts.map((rec) => (
          <Card key={rec.id} className="p-6 flex flex-col justify-between hover:border-slate-200 transition-all h-64 select-none">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-50 pb-3">
                <div className="text-left">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Reference ID</span>
                  <span className="text-xs font-extrabold text-slate-800">{rec.recNo}</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>

              {/* Body */}
              <div className="text-left space-y-1.5">
                <h4 className="text-xs font-bold text-slate-500 truncate">{rec.desc}</h4>
                <p className="text-lg font-extrabold text-slate-900 leading-none">{rec.amount}</p>
                <div className="text-[10px] text-slate-400 font-semibold space-y-0.5 pt-1">
                  <p>Transaction: {rec.refTx}</p>
                  <p>Cleared Date: {rec.date}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => handlePrint(rec.recNo)}
                className="p-2 text-slate-400 hover:text-[#6A1B2E] rounded hover:bg-slate-50 transition-colors"
                title="Print Receipt"
              >
                <Printer className="w-4 h-4" />
              </button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs flex items-center gap-1.5 h-8.5 font-bold px-3.5"
                onClick={() => handleDownload(rec.recNo)}
              >
                <Download className="w-3.5 h-3.5" /> PDF
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
