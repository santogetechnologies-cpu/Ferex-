import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, CheckCircle2, Lightbulb, ArrowUpRight } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const CentralInsights: React.FC = () => {
  const [toast, setToast] = useState('');

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleApplyRec = (rec: string) => {
    showToastMsg(`Executive Action Triggered: ${rec}`);
  };

  return (
    <div className="space-y-6 text-left">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#6A1B2E]" /> Executive Insights & CEO Command Matrix
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Super Admin Console • Platform health score, revenue forecasting models, and executive recommendations.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => showToastMsg('Generated Executive Intelligence Brief (PDF)')}>
          <ArrowUpRight className="w-4 h-4 mr-1.5" /> Download CEO Intelligence Deck
        </Button>
      </div>

      {/* Health Score & High Level Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border border-slate-200/70 shadow-xs bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Business Health Score</span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-400/30">Optimal</span>
            </div>
            <div className="text-4xl font-black text-white flex items-baseline gap-1">
              96 <span className="text-sm text-slate-400 font-bold">/ 100</span>
            </div>
            <p className="text-xs text-slate-300 font-semibold mt-2">
              All 12 operational vectors operating above target efficiency thresholds.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-700/80 flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>SLA Rate: <strong className="text-white">99.4%</strong></span>
            <span>Ledger Clearance: <strong className="text-white">88%</strong></span>
          </div>
        </Card>

        <Card className="p-6 border border-slate-200/70 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400">2026 Q4 Projected Revenue</span>
            <span className="text-3xl font-black text-slate-900 block mt-1">₹6.40 Cr</span>
            <span className="text-xs font-bold text-emerald-600 mt-1 block flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> +28% YoY Forecast Model
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-4">
            Driven by high-demand intakes across Poland and Germany STEM programs.
          </p>
        </Card>

        <Card className="p-6 border border-slate-200/70 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400">Conversion Velocity</span>
            <span className="text-3xl font-black text-[#6A1B2E] block mt-1">65.2%</span>
            <span className="text-xs font-bold text-slate-600 mt-1 block">
              Offer Letter to Visa Clearance Rate
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-4">
            960 students passed embassy interview checks without delays.
          </p>
        </Card>
      </div>

      {/* Executive Recommendations List */}
      <Card className="p-6 border border-slate-200/70 shadow-xs">
        <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" /> Executive Strategic Recommendations (AI Assisted)
        </h3>

        <div className="space-y-3">
          {[
            {
              title: 'Expand Warsaw Campus Alliances by 15 Seats',
              desc: 'High demand in B.Tech Computer Science for Q4 intake. Recommended seat allocation increase.',
              impact: 'High Impact (+₹45L Revenue)',
              action: 'Allocate Seats'
            },
            {
              title: 'Assign Second Verification Specialist for Germany Visas',
              desc: 'TU Berlin applicant queue volume rose 24% this week. Adding staff keeps SLA under 24 hours.',
              impact: 'SLA Protection',
              action: 'Assign Officer'
            },
            {
              title: 'Authorize Batch Swift Tuition Transfer for Leiden University',
              desc: 'Wire transfer queue ready for authorization before Friday campus deadline.',
              impact: 'Financial Payout',
              action: 'Authorize Wire'
            }
          ].map((rec, idx) => (
            <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900">{rec.title}</span>
                  <span className="text-[10px] font-extrabold text-[#6A1B2E] bg-[#6A1B2E]/10 px-2 py-0.5 rounded">{rec.impact}</span>
                </div>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">{rec.desc}</p>
              </div>
              <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold shrink-0 self-end sm:self-center" onClick={() => handleApplyRec(rec.title)}>
                {rec.action}
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
