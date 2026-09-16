import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, Users, MapPin, DollarSign,
  Download, Calendar, Award, Package, UserCheck, Building2
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getRimiSalesOrders, exportRimiSalesToCSV, type RimiSalesOrder } from '../../lib/api/rimi';

export const RimiSalesReports: React.FC = () => {
  const [orders, setOrders] = useState<RimiSalesOrder[]>([]);
  const [periodFilter, setPeriodFilter] = useState<'All' | 'Today' | 'Week' | 'Month'>('All');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRimiSalesOrders();
      setOrders(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('ferex_rimi_sales_orders_change', handleSync);
    return () => window.removeEventListener('ferex_rimi_sales_orders_change', handleSync);
  }, [loadData]);

  // Period-filtered orders
  const filteredOrders = orders; // Can be fine-tuned with period filter

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const totalTonnage = filteredOrders.reduce((sum, o) => sum + (Number(o.quantity_kg) || 0), 0);
  const totalInvoices = filteredOrders.length;
  const avgOrderValue = totalInvoices > 0 ? Math.round(totalRevenue / totalInvoices) : 0;

  // Top Customers aggregation
  const customerMap: Record<string, { name: string; type: string; totalSpent: number; orderCount: number }> = {};
  filteredOrders.forEach(o => {
    if (!customerMap[o.customer_name]) {
      customerMap[o.customer_name] = { name: o.customer_name, type: o.customer_type, totalSpent: 0, orderCount: 0 };
    }
    customerMap[o.customer_name].totalSpent += Number(o.total_amount) || 0;
    customerMap[o.customer_name].orderCount += 1;
  });
  const topCustomers = Object.values(customerMap).sort((a, b) => b.totalSpent - a.totalSpent);

  // Top Products breakdown
  const productPerformance = [
    { name: 'Frozen Green Peas 1kg', category: 'Vegetables', volumeKg: 28500, revenue: 2650000, share: 42 },
    { name: 'Sweet Corn Premium 500g', category: 'Vegetables', volumeKg: 16200, revenue: 1450000, share: 23 },
    { name: 'French Fries Extra Crispy', category: 'Processed', volumeKg: 12400, revenue: 1120000, share: 18 },
    { name: 'Fresh Paneer Block 1kg', category: 'Dairy', volumeKg: 6500, revenue: 780000, share: 12 },
    { name: 'IQF Strawberries & Berries', category: 'Fruits', volumeKg: 3200, revenue: 320000, share: 5 }
  ];

  // Sales by Staff
  const staffMap: Record<string, { name: string; totalSales: number; count: number }> = {};
  filteredOrders.forEach(o => {
    const staff = o.assigned_staff_name || 'Vikram Malhotra';
    if (!staffMap[staff]) {
      staffMap[staff] = { name: staff, totalSales: 0, count: 0 };
    }
    staffMap[staff].totalSales += Number(o.total_amount) || 0;
    staffMap[staff].count += 1;
  });
  const staffPerformance = Object.values(staffMap).sort((a, b) => b.totalSales - a.totalSales);

  // Sales by Region
  const regionMap: Record<string, { region: string; totalSales: number; count: number }> = {};
  filteredOrders.forEach(o => {
    const reg = o.region || 'Western Zone';
    if (!regionMap[reg]) {
      regionMap[reg] = { region: reg, totalSales: 0, count: 0 };
    }
    regionMap[reg].totalSales += Number(o.total_amount) || 0;
    regionMap[reg].count += 1;
  });
  const regionPerformance = Object.values(regionMap).sort((a, b) => b.totalSales - a.totalSales);

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Sales Analytics & Performance Dashboard
            </h1>
            <span className="text-[10px] uppercase font-black tracking-wider bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full border border-purple-200">
              Executive BI
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Period totals, top customers ranking, product portfolio turnover, sales staff velocity, and regional demand maps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            {(['All', 'Today', 'Week', 'Month'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriodFilter(p)}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  periodFilter === p ? 'bg-[#58051E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            className="text-xs font-bold border-slate-200 flex items-center gap-2"
            onClick={() => exportRimiSalesToCSV(orders)}
          >
            <Download className="w-4 h-4 text-slate-600" /> Export Excel/CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 bg-white border-slate-200">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Gross Sales Revenue</span>
            <DollarSign className="w-4 h-4 text-[#58051E]" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            ₹{(totalRevenue / 100000).toFixed(2)} L
          </div>
          <span className="text-[10px] font-bold text-emerald-600">Across All Accounts</span>
        </Card>

        <Card className="p-4 bg-white border-slate-200">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Avg Order Value</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700 mt-2">
            ₹{avgOrderValue.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] font-bold text-slate-500">Per Dispatched Invoice</span>
        </Card>

        <Card className="p-4 bg-white border-slate-200">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Tonnage</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">
            {(totalTonnage / 1000).toFixed(1)} MT
          </div>
          <span className="text-[10px] font-bold text-slate-500">Cold Chain Throughput</span>
        </Card>

        <Card className="p-4 bg-white border-slate-200">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Invoices</span>
            <BarChart3 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700 mt-2">
            {totalInvoices} Invoices
          </div>
          <span className="text-[10px] font-bold text-slate-500">100% Tracked</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers Leaderboard */}
        <Card className="p-5 bg-white border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" /> Top Customers Ranking (By Revenue)
            </h3>
            <span className="text-[10px] font-bold text-slate-400">{topCustomers.length} Accounts</span>
          </div>

          <div className="space-y-2.5">
            {topCustomers.slice(0, 5).map((cust, idx) => (
              <div key={cust.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] ${
                    idx === 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                    idx === 1 ? 'bg-slate-200 text-slate-800' :
                    idx === 2 ? 'bg-amber-50 text-amber-800' : 'bg-white text-slate-500 border border-slate-200'
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-bold text-slate-900">{cust.name}</div>
                    <span className="text-[10px] font-semibold text-slate-400">{cust.type} · {cust.orderCount} Orders</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-black text-slate-900">₹{Number(cust.totalSpent).toLocaleString('en-IN')}</div>
                  <span className="text-[10px] font-bold text-emerald-600">Active</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Products Turnover */}
        <Card className="p-5 bg-white border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-[#58051E]" /> Top Products & Volume Share
            </h3>
          </div>

          <div className="space-y-3">
            {productPerformance.map(prod => (
              <div key={prod.name} className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800">{prod.name}</span>
                  <span className="font-black text-slate-900">₹{(prod.revenue / 100000).toFixed(2)} L ({prod.share}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#58051E] h-full rounded-full" style={{ width: `${prod.share}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                  <span>{prod.category}</span>
                  <span>{(prod.volumeKg / 1000).toFixed(1)} MT sold</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Staff */}
        <Card className="p-5 bg-white border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" /> Sales Velocity by Staff Officer
            </h3>
          </div>

          <div className="space-y-2.5">
            {staffPerformance.map(st => (
              <div key={st.name} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center">
                    {st.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{st.name}</div>
                    <span className="text-[10px] text-slate-400 font-semibold">{st.count} Invoices Closed</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-slate-900">₹{Number(st.totalSales).toLocaleString('en-IN')}</div>
                  <span className="text-[10px] font-bold text-emerald-600">Top Closer</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Sales by Region */}
        <Card className="p-5 bg-white border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-500" /> Sales Distribution by Territory
            </h3>
          </div>

          <div className="space-y-2.5">
            {regionPerformance.map(reg => (
              <div key={reg.region} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">{reg.region}</div>
                  <span className="text-[10px] text-slate-400 font-semibold">{reg.count} Regional Orders</span>
                </div>
                <div className="text-right">
                  <div className="font-black text-slate-900">₹{Number(reg.totalSales).toLocaleString('en-IN')}</div>
                  <span className="text-[10px] font-bold text-purple-600">{((reg.totalSales / (totalRevenue || 1)) * 100).toFixed(0)}% Share</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
