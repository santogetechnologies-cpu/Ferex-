import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, DollarSign, TrendingUp, Boxes, Warehouse,
  Calendar, Clock, ShieldCheck, PieChart, ArrowUpRight,
  AlertTriangle, CheckCircle2, Download, Package
} from 'lucide-react';

import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getRimiAnalyticsMetrics,
  getRimiDashboardMetrics,
  type RimiAnalyticsMetrics,
  type RimiDashboardMetrics
} from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';

export const RimiAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'All' | '30d' | '90d' | '1y'>('All');
  const [analytics, setAnalytics] = useState<RimiAnalyticsMetrics>({
    totalRevenue: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    totalOrdersCount: 0,
    categorySalesDistribution: [],
    regionalCustomerDistribution: [],
    topSellingProducts: [],
    batchExpiryRisks: []
  });

  const [dashboard, setDashboard] = useState<RimiDashboardMetrics>({
    totalCustomers: 0,
    activeDistributors: 0,
    activeShops: 0,
    activeWholesalers: 0,
    ordersToday: 0,
    pendingDeliveries: 0,
    outstandingPayments: 0,
    lowStockCount: 0,
    expiringBatchesCount: 0,
    totalStorageCapacity: 0,
    utilizedStorageCapacity: 0,
    storageUtilizationPercentage: 0,
    recentOrders: [],
    recentActivities: [],
    warehouses: []
  });

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const [anData, dbData] = await Promise.all([
        getRimiAnalyticsMetrics(),
        getRimiDashboardMetrics()
      ]);
      setAnalytics(anData);
      setDashboard(dbData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();

    const channel = supabase
      .channel('realtime_rimi_analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_sales_orders' }, () => loadMetrics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_payments' }, () => loadMetrics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_inventory_batches' }, () => loadMetrics())
      .subscribe();

    const handleSync = () => loadMetrics();
    window.addEventListener('ferex_rimi_orders_change', handleSync);
    window.addEventListener('ferex_rimi_payments_change', handleSync);
    window.addEventListener('ferex_rimi_batches_change', handleSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_rimi_orders_change', handleSync);
      window.removeEventListener('ferex_rimi_payments_change', handleSync);
      window.removeEventListener('ferex_rimi_batches_change', handleSync);
    };
  }, [loadMetrics]);

  const collectionRate = analytics.totalRevenue > 0
    ? Math.round((analytics.totalCollected / analytics.totalRevenue) * 100)
    : 0;

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-[#58051E]/10 text-[#58051E] text-[10px] font-black uppercase tracking-wider">
              Financial Intelligence Hub
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Supabase Engine
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#58051E]" /> Finance, Revenue & Inventory Analytics
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Real-time sales realization, receivables ledger, product sales velocity, and cold chain batch risk valuation.
          </p>
        </div>

        {/* Time Range Filter Tabs */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200/80 shadow-xs">
          {(['All', '30d', '90d', '1y'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setTimeRange(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                timeRange === tab
                  ? 'bg-[#58051E] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab === 'All' ? 'All Time' : tab === '30d' ? 'Last 30 Days' : tab === '90d' ? 'Quarter' : '1 Year'}
            </button>
          ))}
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Gross Sales Invoiced */}
        <Card className="p-4 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Gross Sales Invoiced</span>
            <div className="w-8 h-8 rounded-xl bg-[#58051E]/10 text-[#58051E] flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 block tracking-tight">
              {loading ? '...' : `₹${analytics.totalRevenue.toLocaleString('en-IN')}`}
            </span>
            <span className="text-[10px] font-extrabold text-slate-500 block mt-1">
              Across {analytics.totalOrdersCount} distribution orders
            </span>
          </div>
        </Card>

        {/* Collected Revenue */}
        <Card className="p-4 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Collected Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-emerald-700 block tracking-tight">
              {loading ? '...' : `₹${analytics.totalCollected.toLocaleString('en-IN')}`}
            </span>
            <span className="text-[10px] font-extrabold text-emerald-700 block mt-1">
              {collectionRate}% Realization Rate
            </span>
          </div>
        </Card>

        {/* Outstanding Receivables */}
        <Card className="p-4 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Outstanding Receivables</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-rose-600 block tracking-tight">
              {loading ? '...' : `₹${analytics.totalOutstanding.toLocaleString('en-IN')}`}
            </span>
            <span className="text-[10px] font-extrabold text-slate-500 block mt-1">
              Invoiced customer balances
            </span>
          </div>
        </Card>

        {/* Cold Room Storage Capacity Utilization */}
        <Card className="p-4 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cold Storage Occupancy</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold">
              <Warehouse className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {loading ? '...' : `${dashboard.storageUtilizationPercentage}%`}
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                {dashboard.utilizedStorageCapacity} / {dashboard.totalStorageCapacity || 1000} Pallets
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-cyan-600 rounded-full"
                style={{ width: `${Math.min(100, dashboard.storageUtilizationPercentage)}%` }}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Charts & Breakdowns Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Sales Distribution */}
        <Card className="p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#58051E]" /> Category Sales Volume
              </h3>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                Revenue generation breakdown by product family.
              </p>
            </div>
          </div>

          {analytics.categorySalesDistribution.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-semibold bg-slate-50 rounded-2xl">
              No product sales recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.categorySalesDistribution.map((cat, idx) => (
                <div key={idx} className="space-y-1 text-xs">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>{cat.category}</span>
                    <span className="text-slate-900">₹{cat.value.toLocaleString('en-IN')} ({cat.percentage}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#58051E] rounded-full"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Regional Territory Distribution */}
        <Card className="p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-[#58051E]" /> Regional Customer Distribution
              </h3>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                Customer account concentration & outstanding book across territories.
              </p>
            </div>
          </div>

          {analytics.regionalCustomerDistribution.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-semibold bg-slate-50 rounded-2xl">
              No regional accounts mapped.
            </div>
          ) : (
            <div className="space-y-2.5">
              {analytics.regionalCustomerDistribution.map((reg, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-black text-slate-900 block">{reg.region}</span>
                    <span className="text-[10px] text-slate-500 font-semibold">{reg.count} Active Customer Accounts</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Ledger Outstanding</span>
                    <span className="font-black text-slate-900">₹{reg.volume.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Top 5 Revenue-Generating Frozen SKUs */}
      <Card className="p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-[#58051E]" /> Top Revenue-Generating Frozen SKUs
            </h3>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              Fastest-moving items ranked by realized sales order total.
            </p>
          </div>
        </div>

        {analytics.topSellingProducts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold bg-slate-50 rounded-2xl">
            No product sales tracked yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {analytics.topSellingProducts.map((p, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-6 h-6 rounded-lg bg-[#58051E] text-white font-black text-xs flex items-center justify-center">
                    #{idx + 1}
                  </span>
                  <span className="text-xs font-black text-[#58051E]">₹{p.revenue.toLocaleString('en-IN')}</span>
                </div>
                <h4 className="text-xs font-black text-slate-900 truncate">{p.name}</h4>
                <p className="text-[11px] text-slate-500 font-semibold">Total Dispatched: {p.quantity} Units</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Batch Expiry Risk Watchlist */}
      <Card className="p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Batch Expiry Shelf Life Risk Watchlist (&lt; 30 Days)
            </h3>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              Active inventory batches requiring immediate dispatch priority or price markdown.
            </p>
          </div>
        </div>

        {analytics.batchExpiryRisks.length === 0 ? (
          <div className="p-8 text-center text-emerald-700 bg-emerald-50 rounded-2xl text-xs font-bold border border-emerald-200 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> All active production lot batches have &gt; 30 days of safe shelf life.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-500">
                <tr>
                  <th className="p-3">Lot Batch No</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Current Stock</th>
                  <th className="p-3">Expiry Date</th>
                  <th className="p-3">Days Remaining</th>
                  <th className="p-3 text-right">Estimated Lot Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {analytics.batchExpiryRisks.map((risk, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{risk.batch_no}</td>
                    <td className="p-3 font-bold">{risk.product_name}</td>
                    <td className="p-3 font-black">{risk.quantity} KG</td>
                    <td className="p-3 text-slate-500">{risk.expiry_date}</td>
                    <td className="p-3">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        {risk.days_left} Days Left
                      </span>
                    </td>
                    <td className="p-3 text-right font-black text-slate-900">
                      ₹{risk.risk_value.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
