import React from 'react';
import { DollarSign } from 'lucide-react';
import { Card } from '../../components/Card';

export const TradeFinancialAnalytics: React.FC = () => {
  return (
    <div className="space-y-6 text-left antialiased">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-[#6A1B2E]" /> Trade Financial Analytics & Profitability
        </h1>
        <p className="text-xs font-semibold text-slate-500 mt-1">
          Ferex Trade Intelligence • International revenue ledger, gross margins, LC exposure forecasts in Indian Rupee (₹).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Gross Trade Turnover', val: '₹4.82 Cr', sub: '+18.4% YoY Growth', color: 'border-l-emerald-500' },
          { label: 'Net Operating Profit', val: '₹1.14 Cr', sub: '23.6% Net Margin', color: 'border-l-blue-500' },
          { label: 'Open LC Liability', val: '₹1.45 Cr', sub: '8 Verified Guarantee Lines', color: 'border-l-amber-500' },
          { label: 'Receivables Cleared', val: '₹3.92 Cr', sub: '100% On-Time Ledger', color: 'border-l-[#6A1B2E]' }
        ].map((kpi, idx) => (
          <Card key={idx} className={`p-4 border-l-4 ${kpi.color} border-slate-200/80 shadow-xs flex flex-col justify-between`}>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{kpi.label}</span>
            <div className="text-2xl font-black text-slate-900 my-1">{kpi.val}</div>
            <span className="text-[10px] font-extrabold text-slate-500">{kpi.sub}</span>
          </Card>
        ))}
      </div>

      <Card className="p-6 text-left border border-slate-200/70 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div>
            <h3 className="text-sm font-black text-slate-900">Revenue vs Operating Freight Cost (₹)</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Quarterly financial performance comparison</p>
          </div>
          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Profit Margin: 23.6%
          </span>
        </div>

        <div className="h-[200px] w-full relative">
          <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
            <line x1="0" y1="40" x2="500" y2="40" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="0" y1="90" x2="500" y2="90" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="0" y1="140" x2="500" y2="140" stroke="#f1f5f9" strokeWidth="1" />
            
            <path d="M 0 140 Q 100 100, 200 110 T 400 40 T 500 20" fill="none" stroke="#6A1B2E" strokeWidth="3" />
            <path d="M 0 170 Q 100 140, 200 150 T 400 90 T 500 70" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />
          </svg>
        </div>
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-2 px-1 select-none">
          <span>Q1 2026</span>
          <span>Q2 2026</span>
          <span>Q3 2026 (Active)</span>
          <span>Q4 2026 (Forecast)</span>
        </div>
      </Card>
    </div>
  );
};
