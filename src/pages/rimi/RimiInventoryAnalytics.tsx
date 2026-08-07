import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Card } from '../../components/Card';

export const RimiInventoryAnalytics: React.FC = () => {
  return (
    <div className="space-y-6 text-left antialiased">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#6A1B2E]" /> Cold Storage Inventory & Telemetry Analytics
        </h1>
        <p className="text-xs font-semibold text-slate-500 mt-1">
          Rimi Cold Chain Intelligence • Stock turn velocity, shrinkage rates, and cold room power stability.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Stock Turn Velocity', val: '4.2x / mo', sub: 'High FMCG circulation' },
          { label: 'Cold Room Uptime', val: '99.98%', sub: 'Zero temperature breaches' },
          { label: 'Shrinkage Rate', val: '0.04%', sub: 'Best-in-class cold chain SLA' },
          { label: 'Reefer Truck Efficiency', val: '98.4%', sub: 'Fuel & temperature optimal' },
        ].map((stat, idx) => (
          <Card key={idx} className="p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">{stat.label}</span>
            <div className="text-2xl font-black text-slate-900 my-1">{stat.val}</div>
            <span className="text-[10px] font-extrabold text-slate-500">{stat.sub}</span>
          </Card>
        ))}
      </div>
    </div>
  );
};
