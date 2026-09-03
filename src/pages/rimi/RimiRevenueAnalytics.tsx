import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import { Card } from '../../components/Card';
import { getRimiDashboardStats, getRimiSalesOrders, getRimiCollections } from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';

export const RimiRevenueAnalytics: React.FC = () => {
  const [stats, setStats] = useState({
    totalRevenueStr: '₹0',
    totalCollectedStr: '₹0',
    totalOutstandingStr: '₹0',
    totalOrdersCount: 0,
    totalRevenueAmount: 0,
    totalCollectedAmount: 0
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashStats, ordersData] = await Promise.all([
        getRimiDashboardStats(),
        getRimiSalesOrders()
      ]);
      setStats(dashStats);
      setOrders(ordersData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_rimi_revenue_analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_sales_orders' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_payments' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const clearanceRate = stats.totalRevenueAmount > 0 ? Math.min(100, Math.round((stats.totalCollectedAmount / stats.totalRevenueAmount) * 100)) : 100;

  return (
    <div className="space-y-6 text-left antialiased">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-[#6A1B2E]" /> Distribution Revenue Analytics & Margins (₹)
        </h1>
        <p className="text-xs font-semibold text-slate-500 mt-1">
          Rimi Cold Chain Intelligence • Channel profitability, live sales ledger values, and payment collections.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Sales Revenue', val: stats.totalRevenueStr, sub: `${stats.totalOrdersCount} Total Dispatched Orders` },
          { label: 'Settled Collections', val: stats.totalCollectedStr, sub: `${clearanceRate}% Clearance Rate` },
          { label: 'Accounts Receivable', val: stats.totalOutstandingStr, sub: 'Outstanding customer balances' },
          { label: 'Average Gross Margin', val: '28.4%', sub: 'High-margin frozen seafood & poultry' },
        ].map((stat, idx) => (
          <Card key={idx} className="p-4 border-l-4 border-l-[#6A1B2E] border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">{stat.label}</span>
            <div className="text-2xl font-black text-slate-900 my-1">{stat.val}</div>
            <span className="text-[10px] font-extrabold text-slate-500">{stat.sub}</span>
          </Card>
        ))}
      </div>

      <Card className="p-6 border border-slate-200/70 shadow-xs">
        <h3 className="text-sm font-black text-slate-900 mb-3">Live Order Revenue Manifest</h3>
        {loading ? (
          <div className="text-center py-6 text-xs text-slate-400">Loading live financial records...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">No sales orders dispatched yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.slice(0, 6).map((o) => (
              <div key={o.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-extrabold text-slate-900">{o.distributor?.business_name || o.order_no}</span>
                  <span className="text-[10px] text-slate-400 block">Order Date: {o.created_at ? new Date(o.created_at).toLocaleDateString() : 'Recent'}</span>
                </div>
                <div className="text-right">
                  <span className="font-black text-slate-900">₹{Number(o.total_amount).toLocaleString('en-IN')}</span>
                  <span className="text-[9px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full block mt-0.5">{o.order_status || 'Received'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
