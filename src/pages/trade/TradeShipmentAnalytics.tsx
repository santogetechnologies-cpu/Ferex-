import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Card } from '../../components/Card';

export const TradeShipmentAnalytics: React.FC = () => {
  return (
    <div className="space-y-6 text-left antialiased">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#6A1B2E]" /> Shipment & Logistics Analytics
        </h1>
        <p className="text-xs font-semibold text-slate-500 mt-1">
          Ferex Trade Intelligence • Container turnaround times, maritime route efficiency, and port clearance speeds.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Avg Port Dwell Time', val: '2.4 Days', sub: '-0.8 days vs last month', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
          { label: 'Customs Pass Rate', val: '99.4%', sub: '277 / 279 containers cleared', color: 'text-blue-600 bg-blue-50 border-blue-100' },
          { label: 'Active Carrier Lines', val: '6 Lines', sub: 'Maersk, MSC, Hapag-Lloyd, etc.', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
          { label: 'On-Time ETA Arrival', val: '96.2%', sub: 'Global maritime SLA met', color: 'text-[#6A1B2E] bg-[#6A1B2E]/10 border-[#6A1B2E]/20' }
        ].map((kpi, idx) => (
          <Card key={idx} className="p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{kpi.label}</span>
            <div className="text-2xl font-black text-slate-900 my-1">{kpi.val}</div>
            <span className="text-[10px] font-extrabold text-slate-500">{kpi.sub}</span>
          </Card>
        ))}
      </div>

      {/* Country Performance Bars */}
      <Card className="p-6 text-left border border-slate-200/70 shadow-xs">
        <h3 className="text-sm font-black text-slate-900 mb-4">Container Traffic Volume by Destination</h3>
        <div className="space-y-3">
          {[
            { country: 'Poland (Port of Gdansk)', volume: '142 Containers', pct: 85 },
            { country: 'Germany (Port of Hamburg)', volume: '98 Containers', pct: 65 },
            { country: 'Netherlands (Port of Rotterdam)', volume: '74 Containers', pct: 48 },
            { country: 'India (Nhava Sheva / JNPT)', volume: '56 Containers', pct: 36 },
          ].map((bar, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>{bar.country}</span>
                <span className="text-slate-900 font-black">{bar.volume}</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#6A1B2E] rounded-full" style={{ width: `${bar.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
