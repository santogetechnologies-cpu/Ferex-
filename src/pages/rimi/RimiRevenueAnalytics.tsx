import React from 'react';
import { DollarSign } from 'lucide-react';
import { Card } from '../../components/Card';

export const RimiRevenueAnalytics: React.FC = () => {
  return (
    <div className="space-y-6 text-left antialiased">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-[#6A1B2E]" /> Distribution Revenue Analytics & Margins (₹)
        </h1>
        <p className="text-xs font-semibold text-slate-500 mt-1">
          Rimi Cold Chain Intelligence • Channel profitability, supermarket margins, and quarterly revenue in Indian Rupee (₹).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Monthly Revenue', val: '₹84.20 Lakhs', sub: '+14.2% YoY Growth' },
          { label: 'Gross Operating Margin', val: '28.4%', sub: 'High-margin gourmet category' },
          { label: 'Supermarket Channel', val: '₹42.50 Lakhs', sub: 'Primary distribution channel' },
          { label: 'Collections Cleared', val: '₹78.10 Lakhs', sub: '92.7% On-Time Receipts' },
        ].map((stat, idx) => (
          <Card key={idx} className="p-4 border-l-4 border-l-[#6A1B2E] border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">{stat.label}</span>
            <div className="text-2xl font-black text-slate-900 my-1">{stat.val}</div>
            <span className="text-[10px] font-extrabold text-slate-500">{stat.sub}</span>
          </Card>
        ))}
      </div>
    </div>
  );
};
