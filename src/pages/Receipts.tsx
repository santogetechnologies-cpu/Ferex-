import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCheck, Download, Sparkles, Search } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { getReceipts } from '../lib/api/payments';
import type { Receipt } from '../lib/types';

export const Receipts: React.FC = () => {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    getReceipts(user?.id).then(list => {
      setReceipts(list);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleDownload = (recNo: string) => {
    showToast(`Downloading Official Receipt: ${recNo}.pdf`);
  };

  const filteredReceipts = receipts.filter(r => {
    const recTitle = r.receipt_number || r.title || '';
    return recTitle.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6 text-left relative min-h-[500px]">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[#6A1B2E] text-white px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2"
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
            Official Payment Receipts
          </h1>
          <p className="text-sm font-semibold text-slate-500">
            Download verified payment receipts issued for application and university processing fees.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/70 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search receipts by receipt number or payment description..."
            className="w-full h-10 pl-9.5 pr-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
          />
        </div>
      </div>

      {/* Receipts List */}
      {loading ? (
        <div className="py-16 text-center text-xs font-bold text-slate-400">Loading payment receipts...</div>
      ) : filteredReceipts.length === 0 ? (
        <div className="bg-white border border-slate-200/70 rounded-2xl p-12 text-center shadow-xs">
          <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No Payment Receipts Available</h3>
          <p className="text-xs font-semibold text-slate-400 mt-1 max-w-sm mx-auto">
            Once payments are completed, official confirmation receipts will be automatically generated here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReceipts.map((rec) => (
            <Card key={rec.id} className="p-5 border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{rec.receipt_number || rec.id}</span>
                    <h3 className="text-sm font-black text-slate-900 leading-snug">{rec.title || 'Fee Payment Receipt'}</h3>
                  </div>
                  <span className="text-[9.5px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 border rounded-full bg-emerald-50 text-emerald-700 border-emerald-200">
                    Verified
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-4 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Amount Paid:</span>
                  <span className="text-sm font-black text-emerald-700">₹{Number(rec.amount || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400">
                  {new Date(rec.issued_at || rec.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-bold"
                  onClick={() => handleDownload(rec.receipt_number || rec.id)}
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> PDF Receipt
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
