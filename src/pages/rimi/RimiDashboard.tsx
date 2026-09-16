import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Package, Truck, DollarSign,
  ArrowUpRight, Thermometer, Boxes, Megaphone,
  Users, CheckCircle2, Clock, AlertCircle, RefreshCw,
  Building2, Phone, Calendar, ArrowRight
} from 'lucide-react';
import { Card } from '../../components/Card';
import {
  getRimiDashboardStats,
  getRimiSalesOrders,
  getRimiWarehouses,
  getRimiVehicles,
  getRimiCustomers,
  getRimiTasks,
  type RimiCustomer,
  type RimiSalesOrder
} from '../../lib/api/rimi';
import { useRimiConfig } from '../../hooks/useRimiConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useRimiPermissions } from '../../hooks/usePermissions';
import { supabase } from '../../lib/supabase';

export const RimiDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { config } = useRimiConfig();
  const { profile } = useAuth();
  const { isAdmin, isStaff } = useRimiPermissions();

  const userName = profile?.full_name?.split(' ')[0] || '';
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  })();
  const roleTitle = isAdmin ? 'Cold Chain Manager' : 'Operations Specialist';
  const displayName = userName ? `${greeting}, ${userName}` : `${greeting}, ${roleTitle}`;

  // Migration banner state
  const [showMigrationBanner, setShowMigrationBanner] = useState(() => {
    return localStorage.getItem('ferex_rimi_migrated_v2') !== 'true';
  });

  // Admin Data State
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
  const [recentOrders, setRecentOrders] = useState<RimiSalesOrder[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);

  // Staff Data State (Zero leakage from other staff)
  const [myCustomers, setMyCustomers] = useState<RimiCustomer[]>([]);
  const [myOrders, setMyOrders] = useState<RimiSalesOrder[]>([]);
  const [myTasks, setMyTasks] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  const handleClearCache = () => {
    localStorage.removeItem('ferex_rimi_crm_customers');
    localStorage.removeItem('ferex_rimi_sales_orders');
    localStorage.removeItem('ferex_rimi_payments');
    localStorage.setItem('ferex_rimi_migrated_v2', 'true');
    setShowMigrationBanner(false);
    window.location.reload();
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const staffIdentifier = profile?.id || profile?.full_name || '';

      if (isAdmin) {
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
      } else {
        // Staff Workspace: Strictly load only own assigned accounts
        const [allCusts, allOrders, allTasks] = await Promise.all([
          getRimiCustomers({ staffOnlyId: staffIdentifier }),
          getRimiSalesOrders({ staffOnlyId: staffIdentifier }),
          getRimiTasks(),
        ]);

        const assignedCusts = (allCusts || []).filter(
          c => c.assigned_staff_id === profile?.id || c.assigned_staff_name === profile?.full_name || !c.assigned_staff_id
        );
        const assignedOrders = (allOrders || []).filter(
          o => o.assigned_staff_id === profile?.id || o.assigned_staff_name === profile?.full_name
        );
        const assignedTasks = (allTasks || []).filter(
          t => t.assigned_to_name === profile?.full_name || t.assigned_to_id === profile?.id
        );

        setMyCustomers(assignedCusts);
        setMyOrders(assignedOrders);
        setMyTasks(assignedTasks);
      }
    } finally {
      setLoading(false);
    }
  }, [isAdmin, profile]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_rimi_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_sales_orders' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_products' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_customers' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_payments' }, () => loadData())
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_rimi_sales_orders_change', handleLocalChange);
    window.addEventListener('ferex_rimi_crm_customers_change', handleLocalChange);
    window.addEventListener('ferex_rimi_products_change', handleLocalChange);
    window.addEventListener('ferex_rimi_collections_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_rimi_sales_orders_change', handleLocalChange);
      window.removeEventListener('ferex_rimi_crm_customers_change', handleLocalChange);
      window.removeEventListener('ferex_rimi_products_change', handleLocalChange);
      window.removeEventListener('ferex_rimi_collections_change', handleLocalChange);
    };
  }, [loadData]);

  // Staff KPI calculations
  const myPendingOrders = myOrders.filter(o => o.order_status !== 'Delivered' && o.order_status !== 'Invoiced');
  const myTotalCollectionsDue = myCustomers.reduce((acc, c) => acc + (c.outstanding_balance || 0), 0);

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Migration Notice Banner */}
      {showMigrationBanner && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-black text-amber-950">Database-Driven CRM Active: </span>
              <span className="text-amber-800 font-semibold">
                To guarantee zero mock seeds and synchronize real database accounts, clear your browser demo cache.
              </span>
            </div>
          </div>
          <button
            onClick={handleClearCache}
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors shrink-0 cursor-pointer text-xs"
          >
            Clear Demo Cache
          </button>
        </div>
      )}

      {/* Live Broadcast Announcement Ticker */}
      {config.broadcast?.is_active && config.broadcast.message && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 shadow-xs ${
          config.broadcast.urgency === 'urgent'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : config.broadcast.urgency === 'warning'
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <Megaphone className="w-5 h-5 shrink-0 animate-bounce" />
          <div className="text-xs font-bold leading-relaxed flex-1">
            <span className="uppercase tracking-wider font-black mr-2 px-2 py-0.5 rounded bg-white/80 border text-[10px]">
              {config.broadcast.urgency} Announcement
            </span>
            {config.broadcast.message}
          </div>
        </div>
      )}

      {/* FMCG Cold Chain Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#58051E] via-[#430316] to-[#3B0B16] text-white p-6 md:p-8 shadow-xl border border-[#58051E]/30">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest bg-white/15 px-3 py-1 rounded-full border border-white/20 text-white">
                {isAdmin ? 'Executive Cold Chain Director' : 'Field Operations Desk'}
              </span>
              <span className="text-[10px] font-extrabold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Supabase Realtime Active
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              {displayName}
            </h1>
            <p className="text-xs md:text-sm text-white/85 leading-relaxed font-semibold">
              {isAdmin
                ? (config.branding?.tagline || 'Managing regional frozen food logistics, supermarket reefer supply chains, temperature-controlled warehouses, and batch expiration telemetry.')
                : 'Your dedicated operations workspace. Review assigned customer accounts, pending delivery orders, and today’s collection schedules.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {isAdmin ? (
              <>
                <button
                  onClick={() => navigate('/rimi/sales-orders')}
                  className="h-10 px-5 rounded-xl text-xs font-black text-[#58051E] bg-white hover:bg-slate-100 transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  Dispatch New Sales Order <ArrowUpRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate('/rimi/staff')}
                  className="h-10 px-5 rounded-xl text-xs font-black text-white bg-white/15 hover:bg-white/25 border border-white/30 transition-all shadow-xs cursor-pointer"
                >
                  Manage Operations Staff
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/rimi/customers')}
                  className="h-10 px-5 rounded-xl text-xs font-black text-[#58051E] bg-white hover:bg-slate-100 transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  My Customers <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate('/rimi/collections')}
                  className="h-10 px-5 rounded-xl text-xs font-black text-white bg-white/15 hover:bg-white/25 border border-white/30 transition-all shadow-xs cursor-pointer"
                >
                  Record Payment Collection
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── ROLE-SPLIT WORKSPACE ─── */}
      {isAdmin ? (
        /* ════════════════════ ADMIN VIEW ════════════════════ */
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Total Sales Revenue', value: stats.totalRevenueStr, sub: `${stats.totalOrdersCount} Total Orders Dispatched`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', badge: 'Live Ledger', path: '/rimi/sales-orders' },
              { title: 'Total Collected', value: stats.totalCollectedStr, sub: `Outstanding: ${stats.totalOutstandingStr}`, icon: ShoppingCart, color: 'text-[#58051E] bg-[#58051E]/10 border-[#58051E]/20', badge: 'Settled', path: '/rimi/collections' },
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

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6 text-left border border-slate-200/70 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Recent Cold Chain Sales Orders</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">Live distributor dispatches and delivery statuses</p>
                  </div>
                  <button onClick={() => navigate('/rimi/sales-orders')} className="text-xs font-bold text-[#58051E] hover:underline flex items-center gap-1 cursor-pointer">
                    View All <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {loading ? (
                  <div className="py-8 text-center text-xs font-semibold text-slate-400">Loading live sales orders...</div>
                ) : recentOrders.length === 0 ? (
                  <div className="py-8 text-center text-xs font-semibold text-slate-400">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No sales orders recorded yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {recentOrders.map((order) => (
                      <div key={order.id} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="font-extrabold text-xs text-slate-900">{order.customer_name || order.order_no}</div>
                          <span className="text-[10px] font-semibold text-slate-400">Order: {order.order_no} · Staff: {order.assigned_staff_name || 'Unassigned'}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black text-slate-900">₹{Number(order.total_amount).toLocaleString('en-IN')}</div>
                          <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {order.order_status || 'Draft'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="p-6 text-left border border-slate-200/70 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-[#58051E]" /> Cold Storage Facilities
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
                        <span className="text-xs font-black text-[#58051E]">{wh.temp}</span>
                        <span className="block text-[9px] font-extrabold text-emerald-600">{wh.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </>
      ) : (
        /* ════════════════════ STAFF VIEW ════════════════════ */
        /* Staff sees ZERO data from other staff members */
        <>
          {/* Staff Personal Workspace KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card onClick={() => navigate('/rimi/customers')} className="p-5 border border-slate-200/80 hover:shadow-md cursor-pointer flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-[#58051E]/10 border border-[#58051E]/20 flex items-center justify-center text-[#58051E]">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold text-[#58051E] bg-[#58051E]/10 px-2 py-0.5 rounded-full">
                    My Accounts
                  </span>
                </div>
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">My Customers</span>
                <span className="text-2xl font-black text-slate-900">{myCustomers.length}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[10.5px] font-extrabold text-slate-500">
                Assigned distribution partners
              </div>
            </Card>

            <Card onClick={() => navigate('/rimi/sales-orders')} className="p-5 border border-slate-200/80 hover:shadow-md cursor-pointer flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                    Active Dispatches
                  </span>
                </div>
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Orders in Transit</span>
                <span className="text-2xl font-black text-slate-900">{myPendingOrders.length}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[10.5px] font-extrabold text-slate-500">
                Dispatches requiring follow-up
              </div>
            </Card>

            <Card onClick={() => navigate('/rimi/collections')} className="p-5 border border-slate-200/80 hover:shadow-md cursor-pointer flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    Due from Accounts
                  </span>
                </div>
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Collections Due</span>
                <span className="text-2xl font-black text-amber-600">₹{myTotalCollectionsDue.toLocaleString('en-IN')}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[10.5px] font-extrabold text-slate-500">
                Payment collection schedule
              </div>
            </Card>

            <Card onClick={() => navigate('/rimi/tasks')} className="p-5 border border-slate-200/80 hover:shadow-md cursor-pointer flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Daily Schedule
                  </span>
                </div>
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">My Tasks Today</span>
                <span className="text-2xl font-black text-slate-900">{myTasks.length}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[10.5px] font-extrabold text-slate-500">
                Audits, visits & cold room checks
              </div>
            </Card>
          </div>

          {/* Staff Main Workspace Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* My Customers Roster */}
            <Card className="p-6 border border-slate-200/70 shadow-xs text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900">My Assigned Customer Accounts</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">Accounts you are directly responsible for servicing</p>
                </div>
                <button
                  onClick={() => navigate('/rimi/customers')}
                  className="text-xs font-bold text-[#58051E] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  View CRM <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {myCustomers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-semibold">
                  No accounts assigned to your desk yet. Contact administrator for account allocations.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {myCustomers.slice(0, 5).map(c => (
                    <div key={c.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-extrabold text-xs text-slate-900">{c.business_name}</div>
                        <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-2">
                          <span>{c.customer_type}</span>
                          <span>·</span>
                          <span>{c.contact_person}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {c.pipeline_stage}
                        </span>
                        {c.outstanding_balance !== undefined && c.outstanding_balance > 0 && (
                          <div className="text-[10px] font-bold text-amber-600 mt-1">
                            ₹{c.outstanding_balance.toLocaleString('en-IN')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* My Active Orders & Dispatches */}
            <Card className="p-6 border border-slate-200/70 shadow-xs text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900">My Sales Orders in Progress</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">Orders for your assigned accounts</p>
                </div>
                <button
                  onClick={() => navigate('/rimi/sales-orders')}
                  className="text-xs font-bold text-[#58051E] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  All Orders <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {myOrders.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-semibold">
                  No sales orders recorded for your accounts yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {myOrders.slice(0, 5).map(o => (
                    <div key={o.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-extrabold text-xs text-slate-900">{o.customer_name || o.order_no}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">
                          Order: {o.order_no} · Qty: {o.quantity_kg} KG
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-slate-900">₹{Number(o.total_amount).toLocaleString('en-IN')}</div>
                        <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {o.order_status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
