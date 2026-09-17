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
import { useAuth } from '../../contexts/AuthContext';
import {
  getRimiDashboardMetrics,
  type RimiDashboardMetrics
} from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';

const RIMI_ADMIN_ROLES = ['rimi_admin', 'rimi_frozen', 'admin', 'education_admin', 'central', 'super_admin', 'superadmin'];

export const RimiDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = RIMI_ADMIN_ROLES.includes(profile?.role || '');

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
      const staffEmail = !isAdmin ? profile?.email : undefined;
      const data = await getRimiDashboardMetrics(staffEmail);
      setMetrics(data);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, profile?.email]);

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
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-[#58051E]/10 text-[#58051E] text-[10px] font-black uppercase tracking-wider">
              {isAdmin ? 'Cold Chain Operations Central' : 'Operations Staff Dashboard'}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Telemetry
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Snowflake className="w-5 h-5 text-cyan-600" /> RIMI Frozen Foods Distribution Console
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Real-time cold storage inventory telemetry, unified customer CRM, and fleet logistics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/rimi/inventory')}
            className="text-xs font-bold border-slate-200 hover:border-slate-300"
          >
            <Boxes className="w-3.5 h-3.5 mr-1 text-[#58051E]" /> Batches & Expiry
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/rimi/sales-orders')}
            className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-xs"
          >
            <ShoppingCart className="w-3.5 h-3.5 mr-1" /> New Sales Order
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid (100% Live Calculated from Supabase) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers / Accounts */}
        <Card className="p-4 border border-slate-200/80 shadow-xs space-y-2 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">CRM Accounts</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 block tracking-tight">
              {loading ? '...' : metrics.totalCustomers}
            </span>
            <div className="flex items-center gap-2 text-[10px] font-extrabold text-slate-500 mt-1">
              <span className="text-blue-700">{metrics.activeDistributors} Dist.</span>
              <span>•</span>
              <span className="text-emerald-700">{metrics.activeShops} Retail</span>
              <span>•</span>
              <span className="text-purple-700">{metrics.activeWholesalers} W'sale</span>
            </div>
          </div>
        </Card>

        {/* Orders Today & Active Flow */}
        <Card className="p-4 border border-slate-200/80 shadow-xs space-y-2 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Today's Orders</span>
            <div className="w-8 h-8 rounded-xl bg-[#58051E]/10 text-[#58051E] flex items-center justify-center font-bold">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 block tracking-tight">
              {loading ? '...' : metrics.ordersToday}
            </span>
            <span className="text-[10px] font-extrabold text-slate-500 flex items-center gap-1 mt-1">
              <Truck className="w-3 h-3 text-amber-600" />
              <strong className="text-slate-800">{metrics.pendingDeliveries}</strong> dispatches scheduled
            </span>
          </div>
        </Card>

        {/* Outstanding Receivables */}
        <Card className="p-4 border border-slate-200/80 shadow-xs space-y-2 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Receivables Ledger</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 block tracking-tight">
              {loading ? '...' : `₹${metrics.outstandingPayments.toLocaleString('en-IN')}`}
            </span>
            <Link to="/rimi/collections" className="text-[10px] font-bold text-[#58051E] hover:underline flex items-center gap-0.5 mt-1">
              <span>View Collections Ledger</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        {/* Cold Storage Utilization */}
        <Card className="p-4 border border-slate-200/80 shadow-xs space-y-2 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cold Storage Capacity</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold">
              <Warehouse className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {loading ? '...' : `${metrics.storageUtilizationPercentage}%`}
              </span>
              <span className="text-[11px] font-extrabold text-slate-500">
                {metrics.utilizedStorageCapacity} / {metrics.totalStorageCapacity || 1000} Pallets
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  metrics.storageUtilizationPercentage > 85 ? 'bg-rose-600' : 'bg-cyan-600'
                }`}
                style={{ width: `${Math.min(100, metrics.storageUtilizationPercentage)}%` }}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Critical Stock & Expiry Alerts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Expiring Batches Notice */}
        <Card className="p-4 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3 bg-gradient-to-r from-amber-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">Batch Shelf Life Watch</span>
              <h4 className="text-sm font-black text-slate-900 mt-0.5">
                {metrics.expiringBatchesCount} Lot Batches Expiring in &lt; 30 Days
              </h4>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                Automated cold storage rotation priority assigned.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/rimi/inventory')}
            className="text-xs font-bold border-amber-300 text-amber-900 hover:bg-amber-100 shrink-0"
          >
            Review Batches
          </Button>
        </Card>

        {/* Low Stock Warning */}
        <Card className="p-4 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3 bg-gradient-to-r from-rose-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider">Inventory Threshold Alert</span>
              <h4 className="text-sm font-black text-slate-900 mt-0.5">
                {metrics.lowStockCount} SKUs Below Safety Buffer
              </h4>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                Reorder triggers dispatched to central cold processing hub.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/rimi/products')}
            className="text-xs font-bold border-rose-300 text-rose-900 hover:bg-rose-100 shrink-0"
          >
            Stock Buffer
          </Button>
        </Card>
      </div>

      {/* Main Content Split: Recent Sales Orders & Live Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Sales Orders */}
        <Card className="lg:col-span-2 p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-[#58051E]" /> Active Distribution Orders
              </h3>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                Continuous order lifecycle from receipt to reefer delivery.
              </p>
            </div>
            <Link to="/rimi/sales-orders" className="text-xs font-bold text-[#58051E] hover:underline flex items-center gap-1">
              <span>View All Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {metrics.recentOrders.length === 0 ? (
            <div className="p-8 text-center text-xs font-semibold text-slate-400 bg-slate-50 rounded-2xl">
              No sales orders placed yet. Create an order to initiate distribution.
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
                <Activity className="w-4 h-4 text-[#58051E]" /> Audit Activity Feed
              </h3>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                Real-time chronological events.
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
              <Warehouse className="w-4 h-4 text-[#58051E]" /> Cold Storage Facilities Live Telemetry
            </h3>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              Live temperature calibration & pallet occupancy across primary hubs.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate('/rimi/warehouses')} className="text-xs font-bold">
            Manage Facilities
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
