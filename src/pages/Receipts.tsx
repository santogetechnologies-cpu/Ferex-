import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCheck, Download, Printer, CheckCircle2, Sparkles, Search, Eye, X, ShieldCheck } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

export const Receipts: React.FC = () => {
  const [receipts] = useState([
    { id: 1, recNo: 'REC-2026-1049', desc: 'Ferex Administrative Processing Fee', refTx: 'TX-2026-8901', amount: '₹40,500', date: 'Jun 12, 2026', method: 'Razorpay UPI / NetBanking', issuer: 'Ferex Financial Ledger' },
    { id: 2, recNo: 'REC-2026-1180', desc: 'Stanford Application Submission Fee', refTx: 'TX-2026-9214', amount: '₹11,250', date: 'Jun 28, 2026', method: 'Visa Debit Card ending 4410', issuer: 'Stanford University Desk' },
    { id: 3, recNo: 'REC-2026-1215', desc: 'MIT Transcript Evaluation Legalization', refTx: 'TX-2026-9541', amount: '₹13,500', date: 'Jul 04, 2026', method: 'MasterCard Credit ending 9920', issuer: 'MIT Admissions Attestation' },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
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

  const filteredReceipts = receipts.filter(r =>
    r.recNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.refTx.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left relative">
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

      <Card className="p-4 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search receipt number, transaction, or description..."
            className="w-full h-9 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]"
          />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredReceipts.length} Official Receipts Cleared</span>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredReceipts.map((rec) => (
          <Card key={rec.id} className="p-6 flex flex-col justify-between hover:border-slate-200 transition-all h-64 select-none">
            <div className="space-y-4">
              <div className="flex items-start justify-between border-b border-slate-50 pb-3">
                <div className="text-left">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Reference ID</span>
                  <span className="text-xs font-extrabold text-slate-800">{rec.recNo}</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>

              <div className="text-left space-y-1.5">
                <h4 className="text-xs font-bold text-slate-500 truncate">{rec.desc}</h4>
                <p className="text-lg font-extrabold text-slate-900 leading-none">{rec.amount}</p>
                <div className="text-[10px] text-slate-400 font-semibold space-y-0.5 pt-1">
                  <p>Transaction: {rec.refTx}</p>
                  <p>Cleared Date: {rec.date}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setSelectedReceipt(rec)}
                className="p-1.5 text-slate-400 hover:text-[#6A1B2E] rounded-lg hover:bg-slate-50 transition-colors"
                title="View Receipt Details"
              >
                <Eye className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
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
            </div>
          </Card>
        ))}
      </div>

      {/* View Receipt Drawer */}
      <AnimatePresence>
        {selectedReceipt && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900 z-40"
              onClick={() => setSelectedReceipt(null)}
            />
            <motion.div
              initial={{ translateX: '100%' }}
              animate={{ translateX: 0 }}
              exit={{ translateX: '100%' }}
              transition={{ duration: 0.25 }}
              className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">Official Payment Receipt Document</h3>
                <button onClick={() => setSelectedReceipt(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-left">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{selectedReceipt.recNo}</span>
                  <h4 className="text-xl font-black text-slate-900">{selectedReceipt.amount}</h4>
                  <p className="text-xs font-semibold text-slate-500">{selectedReceipt.desc}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Payment Reference</span>
                  <div className="text-xs font-black text-slate-900">Transaction ID: {selectedReceipt.refTx}</div>
                  <div className="text-xs font-semibold text-slate-500">Method: {selectedReceipt.method}</div>
                  <div className="text-xs font-semibold text-slate-500">Issuer: {selectedReceipt.issuer}</div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2 text-xs font-extrabold text-emerald-800">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  Electronic Receipt Verified & Signed by Ferex Financial Ledger
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <Button size="sm" variant="outline" className="flex-1 text-xs font-bold" onClick={() => handlePrint(selectedReceipt.recNo)}>
                    <Printer className="w-3.5 h-3.5 mr-1" /> Print Official Copy
                  </Button>
                  <Button size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => handleDownload(selectedReceipt.recNo)}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Save PDF Copy
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
