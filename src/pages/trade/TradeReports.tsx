import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Download, CheckCircle2, FileText } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const TradeReports: React.FC = () => {
  const [toast, setToast] = useState('');

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

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
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => showToastMsg('Generating Master Executive Trade Audit PDF...')}>
          <Download className="w-4 h-4 mr-1.5" /> Download Full Audit Deck (PDF)
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { title: 'Q3 Export Volume Report', desc: 'Poland, Germany & Netherlands freight breakdown', code: 'REP-2026-Q3' },
          { title: 'Customs & Tariff Audit', desc: 'EU import duty, phytosanitary verification & tax codes', code: 'REP-2026-TAX' },
          { title: 'Letter of Credit Exposure', desc: 'Banking liability and HSBC / SBI guarantee lines', code: 'REP-2026-LC' },
        ].map((r, idx) => (
          <Card key={idx} className="p-5 border border-slate-200/70 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all">
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase">{r.code}</span>
              <h3 className="text-sm font-black text-slate-900 leading-snug">{r.title}</h3>
              <p className="text-xs font-semibold text-slate-500">{r.desc}</p>
            </div>
            <Button size="sm" variant="outline" className="w-full text-xs font-bold" onClick={() => showToastMsg(`Downloading ${r.code}.pdf`)}>
              <FileText className="w-3.5 h-3.5 mr-1.5" /> Download PDF
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};
