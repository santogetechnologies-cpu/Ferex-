import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Package, Truck, DollarSign,
  ArrowUpRight, Thermometer,
  Boxes
} from 'lucide-react';
import { Card } from '../../components/Card';
import { getRimiDashboardStats, getRimiSalesOrders, getRimiWarehouses, getRimiVehicles } from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';

export const RimiDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeOrdersCount: 0,
    totalOrdersCount: 0,
    totalRevenueAmount: 0,
    totalRevenueStr: '₹0',
    totalCollectedAmount: 0,
    totalCollectedStr: '₹0',
    totalOutstandingStr: '₹0',
    totalProductsCount: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashStats, ordersData, whData, vData] = await Promise.all([
        getRimiDashboardStats(),
        getRimiSalesOrders(),
        getRimiWarehouses(),
        getRimiVehicles(),
      ]);
      setStats(dashStats);
      setRecentOrders(ordersData.slice(0, 5));
      setWarehouses(whData);
      setVehicles(vData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_rimi_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_sales_orders' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_products' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_distributors' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_payments' }, () => loadData())
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_rimi_sales_orders_change', handleLocalChange);
    window.addEventListener('ferex_rimi_products_change', handleLocalChange);
    window.addEventListener('ferex_rimi_distributors_change', handleLocalChange);
    window.addEventListener('ferex_rimi_collections_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_rimi_sales_orders_change', handleLocalChange);
      window.removeEventListener('ferex_rimi_products_change', handleLocalChange);
      window.removeEventListener('ferex_rimi_distributors_change', handleLocalChange);
      window.removeEventListener('ferex_rimi_collections_change', handleLocalChange);
    };
  }, [loadData]);

  return (
    <div className="space-y-6 text-left antialiased">
      {/* FMCG Cold Chain Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#6A1B2E] via-[#521221] to-[#3B0B16] text-white p-6 md:p-8 shadow-xl border border-[#6A1B2E]/30">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest bg-white/15 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-white">
                FMCG Executive ERP Console
              </span>
              <span className="text-[10px] font-extrabold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Supabase Realtime Active
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Rimi Frozen Distribution Hub
            </h1>
            <p className="text-xs md:text-sm text-white/85 leading-relaxed font-semibold">
              Managing regional frozen food logistics, supermarket reefer supply chains, temperature-controlled warehouses, and batch expiration telemetry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/rimi/sales-orders')}
              className="h-10 px-5 rounded-xl text-xs font-black text-[#6A1B2E] bg-white hover:bg-slate-100 transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              Dispatch New Sales Order <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/rimi/expiry-tracking')}
              className="h-10 px-5 rounded-xl text-xs font-black text-white bg-white/15 hover:bg-white/25 border border-white/30 transition-all shadow-xs cursor-pointer"
            >
              View Expiry Risk Monitor
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Sales Revenue', value: stats.totalRevenueStr, sub: `${stats.totalOrdersCount} Total Orders Dispatched`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', badge: 'Live Ledger', path: '/rimi/sales-orders' },
          { title: 'Total Collected', value: stats.totalCollectedStr, sub: `Outstanding: ${stats.totalOutstandingStr}`, icon: ShoppingCart, color: 'text-[#6A1B2E] bg-[#6A1B2E]/10 border-[#6A1B2E]/20', badge: 'Settled', path: '/rimi/collections' },
          { title: 'Catalog SKUs', value: `${stats.totalProductsCount} Products`, sub: 'Frozen Seafood, Meats, Dairy', icon: Boxes, color: 'text-blue-600 bg-blue-50 border-blue-100', badge: 'Master Catalog', path: '/rimi/products' },
          { title: 'Reefer Fleet', value: `${vehicles.length} Trucks`, sub: `${warehouses.length} Active Cold Warehouses`, icon: Truck, color: 'text-indigo-600 bg-indigo-50 border-indigo-100', badge: 'GPS Active', path: '/rimi/vehicles' },
        ].map((stat, idx) => (
          <Card key={idx} onClick={() => navigate(stat.path)} className="p-5 border border-slate-200/80 hover:border-slate-300 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${stat.color} group-hover:scale-105 transition-transform`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                  {stat.badge}
                </span>
              </div>
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">{stat.title}</span>
              <span className="text-2xl font-black text-slate-900 leading-none">{stat.value}</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-[10.5px] font-extrabold text-slate-500 truncate">
              {stat.sub}
            </div>
          </Card>
        ))}
      </div>

      {/* Main Workspace Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Recent Orders Feed */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 text-left border border-slate-200/70 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <h3 className="text-sm font-black text-slate-900">Recent Cold Chain Sales Orders</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Live distributor dispatches and delivery statuses</p>
              </div>
              <button onClick={() => navigate('/rimi/sales-orders')} className="text-xs font-bold text-[#6A1B2E] hover:underline flex items-center gap-1 cursor-pointer">
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs font-semibold text-slate-400">Loading live sales orders...</div>
            ) : recentOrders.length === 0 ? (
              <div className="py-8 text-center text-xs font-semibold text-slate-400">
                <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                No sales orders recorded yet. Create an order via the Sales Orders module.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentOrders.map((order) => (
                  <div key={order.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-xs text-slate-900">{order.distributor?.business_name || order.order_no}</div>
                      <span className="text-[10px] font-semibold text-slate-400">Order: {order.order_no} · Delivery: {order.delivery_date}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-slate-900">₹{Number(order.total_amount).toLocaleString('en-IN')}</div>
                      <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {order.order_status || 'Received'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Col: Cold Storage Warehouses Telemetry */}
        <div className="space-y-6">
          <Card className="p-6 text-left border border-slate-200/70 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-[#6A1B2E]" /> Cold Storage Facilities
              </h3>
            </div>

            <div className="space-y-3">
              {[
                { name: 'Mumbai Central Deep Freeze', temp: '-22.4°C', capacity: '88% Used', status: 'Optimal' },
                { name: 'Delhi NCR Reefer Hub', temp: '-20.1°C', capacity: '64% Used', status: 'Optimal' },
                { name: 'Bengaluru Cold Transit Depot', temp: '-18.8°C', capacity: '72% Used', status: 'Optimal' }
              ].map((wh, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black text-slate-900">{wh.name}</div>
                    <span className="text-[10px] font-semibold text-slate-500">{wh.capacity}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-[#6A1B2E]">{wh.temp}</span>
                    <span className="block text-[9px] font-extrabold text-emerald-600">{wh.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};
