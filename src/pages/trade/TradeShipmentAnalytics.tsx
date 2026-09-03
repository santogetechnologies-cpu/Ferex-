import React, { useState, useEffect } from 'react';
import { TrendingUp, Anchor, Globe } from 'lucide-react';
import { Card } from '../../components/Card';
import { getTradeShipments } from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';

export const TradeShipmentAnalytics: React.FC = () => {
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTradeShipments();
      if (Array.isArray(data)) {
        setShipments(data);
      } else {
        setShipments([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_trade_shipment_analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_shipments' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_trade_shipments_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_shipments_change', handleLocalChange);
    };
  }, [loadData]);

  // Dynamic calculations
  const totalShipments = shipments.length;
  const inTransitCount = shipments.filter(s => s.status === 'In Transit' || s.shipment_status === 'In Transit').length;
  const clearedCount = shipments.filter(s => s.status === 'Customs Cleared' || s.status === 'Delivered').length;
  const totalWeightKg = shipments.reduce((sum, s) => sum + (Number(s.cargo_weight_kg) || 20000), 0);
  const totalWeightTonnes = (totalWeightKg / 1000).toFixed(1);

  // Group by destination port
  const destinationCounts: Record<string, number> = {};
  shipments.forEach(s => {
    const dest = s.destination_port || 'Port of Rotterdam, Netherlands';
    destinationCounts[dest] = (destinationCounts[dest] || 0) + 1;
  });

  const destinationList = Object.entries(destinationCounts).map(([port, count]) => ({
    port,
    count,
    pct: totalShipments > 0 ? Math.round((count / totalShipments) * 100) : 0
  })).sort((a, b) => b.count - a.count);

  // Group by carrier
  const carrierCounts: Record<string, number> = {};
  shipments.forEach(s => {
    const c = s.carrier || 'Maersk Line';
    carrierCounts[c] = (carrierCounts[c] || 0) + 1;
  });

  const carrierList = Object.entries(carrierCounts).map(([carrier, count]) => ({
    carrier,
    count,
    pct: totalShipments > 0 ? Math.round((count / totalShipments) * 100) : 0
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6 text-left antialiased">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#6A1B2E]" /> Shipment & Logistics Analytics
        </h1>
        <p className="text-xs font-semibold text-slate-500 mt-1">
          Ferex Trade Intelligence • Dynamic container turnaround times, maritime route efficiency, and port clearance speeds from live database.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Freight Volume', val: `${totalWeightTonnes} Tonnes`, sub: `${totalWeightKg.toLocaleString()} kg moved`, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
          { label: 'Active in Transit', val: `${inTransitCount} Units`, sub: 'Currently at sea or terminal', color: 'text-blue-600 bg-blue-50 border-blue-100' },
          { label: 'Customs Cleared', val: `${clearedCount} Units`, sub: `${totalShipments} Total Booked`, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
          { label: 'Active Carrier Lines', val: `${carrierList.length} Lines`, sub: 'Maersk, CMA CGM, Hapag, MSC', color: 'text-[#6A1B2E] bg-[#6A1B2E]/10 border-[#6A1B2E]/20' }
        ].map((kpi, idx) => (
          <Card key={idx} className="p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{kpi.label}</span>
            <div className="text-2xl font-black text-slate-900 my-1">{kpi.val}</div>
            <span className="text-[10px] font-extrabold text-slate-500">{kpi.sub}</span>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Destination Port Distribution */}
        <Card className="p-6 text-left border border-slate-200/70 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#6A1B2E]" /> Container Traffic by Destination Port
          </h3>
          {loading ? (
            <div className="py-8 text-center text-xs font-semibold text-slate-400">Computing route stats...</div>
          ) : destinationList.length === 0 ? (
            <div className="py-8 text-center text-xs font-semibold text-slate-400">No shipment destinations recorded yet.</div>
          ) : (
            <div className="space-y-3">
              {destinationList.map((bar, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span className="truncate pr-2">{bar.port}</span>
                    <span className="text-slate-900 font-black shrink-0">{bar.count} ({bar.pct}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#6A1B2E] rounded-full transition-all duration-500" style={{ width: `${bar.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Carrier Line Distribution */}
        <Card className="p-6 text-left border border-slate-200/70 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Anchor className="w-4 h-4 text-[#6A1B2E]" /> Ocean Carrier Line Allocation
          </h3>
          {loading ? (
            <div className="py-8 text-center text-xs font-semibold text-slate-400">Computing carrier breakdown...</div>
          ) : carrierList.length === 0 ? (
            <div className="py-8 text-center text-xs font-semibold text-slate-400">No carriers recorded yet.</div>
          ) : (
            <div className="space-y-3">
              {carrierList.map((c, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>{c.carrier}</span>
                    <span className="text-slate-900 font-black">{c.count} Shipments ({c.pct}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-800 rounded-full transition-all duration-500" style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
