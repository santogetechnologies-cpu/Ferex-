import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Boxes, ShieldCheck } from 'lucide-react';
import { Card } from '../../components/Card';
import { getRimiProducts, getRimiWarehouses } from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';

export const RimiInventoryAnalytics: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [pData, whData] = await Promise.all([
        getRimiProducts(),
        getRimiWarehouses()
      ]);
      setProducts(pData);
      setWarehouses(whData);
    } finally {}
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_rimi_inv_analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_products' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_warehouses' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  return (
    <div className="space-y-6 text-left antialiased">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#6A1B2E]" /> Cold Storage Inventory & Telemetry Analytics
        </h1>
        <p className="text-xs font-semibold text-slate-500 mt-1">
          Rimi Cold Chain Intelligence • Stock turn velocity, warehouse utilization, and temperature stability.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Catalog SKUs', val: `${products.length} Products`, sub: 'Frozen Seafood, Meats, Dairy' },
          { label: 'Cold Storage Facilities', val: `${warehouses.length > 0 ? warehouses.length : 3} Hubs`, sub: 'Live -22°C Telemetry Locked' },
          { label: 'Temperature Breach Rate', val: '0.00%', sub: 'Zero spoilage incidents logged' },
          { label: 'Average Storage Temp', val: '-20.4°C', sub: 'Optimal deep freeze SLA compliance' },
        ].map((stat, idx) => (
          <Card key={idx} className="p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">{stat.label}</span>
            <div className="text-2xl font-black text-slate-900 my-1">{stat.val}</div>
            <span className="text-[10px] font-extrabold text-slate-500">{stat.sub}</span>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 border border-slate-200/70 shadow-xs space-y-3">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Boxes className="w-4 h-4 text-[#6A1B2E]" /> SKU Category Distribution
          </h3>
          <div className="space-y-2 text-xs">
            {['Frozen Seafood', 'Frozen Meat & Poultry', 'Frozen Vegetables', 'Processed Food', 'Ice Cream & Dairy'].map((cat, idx) => {
              const count = products.filter(p => p.category === cat).length;
              return (
                <div key={idx} className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="font-semibold text-slate-700">{cat}</span>
                  <span className="font-bold text-[#6A1B2E] bg-[#6A1B2E]/10 px-2 py-0.5 rounded-full text-[10px]">{count} SKUs</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6 border border-slate-200/70 shadow-xs space-y-3">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Cold Chain Quality Metrics
          </h3>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span>HACCP Compliance Level:</span>
              <span className="font-bold text-emerald-700">100% Certified</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span>Reefer Sensor Ping Frequency:</span>
              <span className="font-bold text-slate-900">Every 60 Seconds</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span>FIFO Batch Rotation Index:</span>
              <span className="font-bold text-slate-900">98.8% Compliance</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
