import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Snowflake, Users, Store, Building2, ShoppingCart,
  Boxes, Warehouse, Truck, DollarSign,
  Clock, AlertTriangle, CheckCircle2,
  ArrowRight, ShieldCheck, Activity, Package
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { PageHeader, StatTile } from '../../components/Kit';
import { useAuth } from '../../contexts/AuthContext';
import { useRimiAccess } from '../../lib/rimiAccess';
import {
  getRimiDashboardMetrics,
  type RimiDashboardMetrics
} from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';

export const RimiDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isAdmin, canManage } = useRimiAccess();

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<RimiDashboardMetrics>({
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

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const staffEmail = !canManage ? profile?.email : undefined;
      const data = await getRimiDashboardMetrics(staffEmail);
      setMetrics(data);
    } finally {
      setLoading(false);
    }
  }, [canManage, profile?.email]);

  useEffect(() => {
    loadDashboard();

    const channel = supabase
      .channel('realtime_rimi_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_customers' }, () => loadDashboard())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_sales_orders' }, () => loadDashboard())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_inventory_batches' }, () => loadDashboard())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_deliveries' }, () => loadDashboard())
      .subscribe();

    const handleLocalSync = () => loadDashboard();
    window.addEventListener('ferex_rimi_customers_change', handleLocalSync);
    window.addEventListener('ferex_rimi_orders_change', handleLocalSync);
    window.addEventListener('ferex_rimi_batches_change', handleLocalSync);
    window.addEventListener('ferex_rimi_deliveries_change', handleLocalSync);
    window.addEventListener('ferex_rimi_payments_change', handleLocalSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_rimi_customers_change', handleLocalSync);
      window.removeEventListener('ferex_rimi_orders_change', handleLocalSync);
      window.removeEventListener('ferex_rimi_batches_change', handleLocalSync);
      window.removeEventListener('ferex_rimi_deliveries_change', handleLocalSync);
      window.removeEventListener('ferex_rimi_payments_change', handleLocalSync);
    };
  }, [loadDashboard]);

  return (
    <div className="space-y-6 text-left antialiased">
      <PageHeader
        eyebrow="Rimi Frozen"
        title={(profile?.full_name || '').split(' ')[0] ? `Welcome back, ${(profile?.full_name || '').split(' ')[0]}` : 'Welcome back'}
        subtitle="Customers, orders, cold-chain stock and deliveries at a glance."
        actions={<>
          <Button size="md" variant="outline" onClick={() => navigate('/rimi/inventory')}><Boxes className="w-4 h-4 mr-1.5" />Inventory</Button>
          <Button size="md" onClick={() => navigate('/rimi/sales-orders')}><ShoppingCart className="w-4 h-4 mr-1.5" />New sales order</Button>
        </>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Customers" value={loading ? '…' : metrics.totalCustomers} hint={`${metrics.activeDistributors} distributors · ${metrics.activeShops} shops · ${metrics.activeWholesalers} wholesalers`} icon={Users} tone="blue" to="/rimi/customers" />
        <StatTile label="Orders today" value={loading ? '…' : metrics.ordersToday} hint={`${metrics.pendingDeliveries} deliveries scheduled`} icon={ShoppingCart} tone="brand" to="/rimi/sales-orders" />
        <StatTile label="Outstanding payments" value={loading ? '…' : `₹${metrics.outstandingPayments.toLocaleString('en-IN')}`} hint="Open the collections list" icon={DollarSign} tone="amber" to="/rimi/collections" />
        <StatTile label="Cold storage used" value={loading ? '…' : `${metrics.storageUtilizationPercentage}%`} hint={`${metrics.utilizedStorageCapacity} of ${metrics.totalStorageCapacity || 1000} pallets`} icon={Warehouse} tone={metrics.storageUtilizationPercentage > 85 ? 'rose' : 'blue'} to="/rimi/warehouses" />
      </div>

      {(metrics.expiringBatchesCount > 0 || metrics.lowStockCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.expiringBatchesCount > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
              <div className="flex items-center gap-3"><span className="grid place-items-center w-10 h-10 rounded-xl bg-amber-100 text-amber-800"><Clock className="w-5 h-5" /></span>
                <div><p className="text-sm font-bold text-slate-900">{metrics.expiringBatchesCount} batch{metrics.expiringBatchesCount === 1 ? '' : 'es'} expire within 30 days</p><p className="text-xs font-medium text-slate-600">Sell or move these first.</p></div></div>
              <Button size="sm" variant="outline" onClick={() => navigate('/rimi/inventory')}>Review</Button>
            </div>)}
          {metrics.lowStockCount > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
              <div className="flex items-center gap-3"><span className="grid place-items-center w-10 h-10 rounded-xl bg-rose-100 text-rose-800"><AlertTriangle className="w-5 h-5" /></span>
                <div><p className="text-sm font-bold text-slate-900">{metrics.lowStockCount} product{metrics.lowStockCount === 1 ? '' : 's'} below minimum stock</p><p className="text-xs font-medium text-slate-600">Reorder to avoid running out.</p></div></div>
              <Button size="sm" variant="outline" onClick={() => navigate('/rimi/products')}>Review</Button>
            </div>)}
        </div>
      )}

      {/* Main Content Split: Recent Sales Orders & Live Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Sales Orders */}
        <Card className="lg:col-span-2 p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-[#58051E]" /> Recent orders
              </h3>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                The latest sales orders and their status.
              </p>
            </div>
            <Link to="/rimi/sales-orders" className="text-xs font-bold text-[#58051E] hover:underline flex items-center gap-1">
              <span>All orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {metrics.recentOrders.length === 0 ? (
            <div className="p-8 text-center text-xs font-semibold text-slate-400 bg-slate-50 rounded-2xl">
              No sales orders yet. Create the first order to get started.
            </div>
          ) : (
            <div className="space-y-2.5">
              {metrics.recentOrders.map((ord) => (
                <div
                  key={ord.id}
                  onClick={() => navigate('/rimi/sales-orders')}
                  className="p-3.5 bg-slate-50 hover:bg-slate-100/80 transition-all rounded-2xl border border-slate-200/60 flex items-center justify-between cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900">{ord.order_no}</span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {ord.customer_type}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-700">{ord.customer_name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Delivery: {ord.delivery_date || 'Scheduled'} • Territory: {ord.territory || 'West Zone'}
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="text-sm font-black text-slate-900 block">
                      ₹{Number(ord.total_amount).toLocaleString('en-IN')}
                    </span>
                    <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                      ord.order_status === 'Delivered'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : ord.order_status === 'Dispatched'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {ord.order_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Right 1 Col: Live Activity Stream */}
        <Card className="p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#58051E]" /> Recent activity
              </h3>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                Latest changes across orders and stock.
              </p>
            </div>
          </div>

          {metrics.recentActivities.length === 0 ? (
            <div className="p-8 text-center text-xs font-semibold text-slate-400 bg-slate-50 rounded-2xl">
              No recent activity recorded yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {metrics.recentActivities.map((act) => (
                <div key={act.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                      {act.activity_type}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="font-bold text-slate-900 text-xs">{act.title}</p>
                  {act.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-2">{act.description}</p>
                  )}
                  <span className="text-[9px] text-slate-400 font-semibold block pt-0.5">
                    By: {act.performed_by}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Facilities Live Status Section */}
      <Card className="p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-[#58051E]" /> Cold storage
            </h3>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              Pallet use in each warehouse.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate('/rimi/warehouses')} className="text-xs font-bold">
            Manage warehouses
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.warehouses.map((wh) => (
            <div key={wh.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900">{wh.name}</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200 font-mono">
                  {wh.cold_room_temp_celsius}°C
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500">{wh.city} • Manager: {wh.manager_name}</p>
              
              <div className="space-y-1 pt-1 border-t border-slate-200/60">
                <div className="flex justify-between text-[10px] font-extrabold text-slate-600">
                  <span>Occupancy</span>
                  <span>{wh.utilized_pallets} / {wh.total_capacity_pallets} Pallets</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#58051E] rounded-full"
                    style={{ width: `${Math.min(100, Math.round((wh.utilized_pallets / (wh.total_capacity_pallets || 1)) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
