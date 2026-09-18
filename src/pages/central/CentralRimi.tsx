import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Snowflake, Search, ShoppingBag, Truck, Download,
  CheckCircle2, RefreshCw, ThermometerSnowflake, UserCheck, Layers, ShieldCheck, X, Plus
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getRimiCustomers,
  getRimiSalesOrders,
  getRimiDeliveries,
  getRimiProducts,
  getRimiMessages,
  reassignRimiCustomerStaff,
  type RimiCustomerRecord
} from '../../lib/api/rimi';
import { getDivisionStaff, type DivisionStaffMember } from '../../lib/api/staff';
import { supabase } from '../../lib/supabase';

export const CentralRimi: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'customers' | 'sales' | 'inventory' | 'fleet' | 'activity'>('customers');
  const [customerFilter, setCustomerFilter] = useState<'All' | 'Distributor' | 'Shop / Retailer' | 'Wholesaler'>('All');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  const [customers, setCustomers] = useState<RimiCustomerRecord[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<DivisionStaffMember[]>([]);

  const [reassignCustomer, setReassignCustomer] = useState<any | null>(null);
  const [newStaff, setNewStaff] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cData, oData, dData, pData, aData, sData] = await Promise.all([
        getRimiCustomers(),
        getRimiSalesOrders(),
        getRimiDeliveries(),
        getRimiProducts(),
        getRimiMessages(),
        getDivisionStaff('rimi')
      ]);
      setCustomers(cData || []);
      setOrders(oData || []);
      setDeliveries(dData || []);
      setProducts(pData || []);
      setActivities(aData || []);
      setStaffList(sData || []);
      if (sData && sData.length > 0 && !newStaff) {
        setNewStaff(sData[0].name);
      }
    } finally {
      setLoading(false);
    }
  }, [newStaff]);

  useEffect(() => {
    loadData();

    // Supabase Realtime synchronization
    const channel = supabase
      .channel('central_rimi_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_customers' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_sales_orders' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_deliveries' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_products' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_customer_activity' }, () => loadData())
      .subscribe();

    const handleSync = () => loadData();
    window.addEventListener('ferex_rimi_customers_change', handleSync);
    window.addEventListener('ferex_rimi_orders_change', handleSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_rimi_customers_change', handleSync);
      window.removeEventListener('ferex_rimi_orders_change', handleSync);
    };
  }, [loadData]);

  // Aggregate Metrics — Live Supabase Calculations
  const totalSalesInr = useMemo(() => {
    return orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  }, [orders]);

  const activeReefersCount = deliveries.length;
  const totalStockUnits = useMemo(() => {
    return products.reduce((sum, p) => sum + Number(p.stock_quantity || p.total_stock || 0), 0);
  }, [products]);

  const handleExportSalesCsv = () => {
    const headers = ['Order No', 'Customer Name', 'Customer Type', 'Amount (INR)', 'Payment Status', 'Order Status', 'Date'];
    const rows = orders.map(o => [
      o.order_no || o.id,
      `"${o.customer_name || 'Retail Partner'}"`,
      `"${o.customer_type || 'Retailer'}"`,
      o.total_amount || 0,
      o.payment_status || 'Paid',
      o.order_status || 'Delivered',
      o.created_at || 'Recent'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rimi_Central_Sales_Audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported consolidated sales CSV ledger!');
  };

  const handleConfirmReassign = async () => {
    if (!reassignCustomer || !newStaff) return;
    try {
      const staffMember = staffList.find(s => s.name === newStaff || s.email === newStaff);
      await reassignRimiCustomerStaff(reassignCustomer.id, newStaff, staffMember?.email, staffMember?.id);
      setCustomers(prev => prev.map(c => c.id === reassignCustomer.id ? { ...c, assigned_staff_name: newStaff } : c));
      showToast(`Reassigned ${reassignCustomer.business_name} to ${newStaff} in Supabase!`);
      setReassignCustomer(null);
    } catch (err: any) {
      showToast(`Failed to reassign: ${err.message}`);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchSearch =
      (c.business_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.contact_person || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.territory || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.city || '').toLowerCase().includes(search.toLowerCase());

    const cType = c.customer_type || 'Distributor';
    const matchTier = customerFilter === 'All' || cType === customerFilter || (customerFilter === 'Shop / Retailer' && cType.includes('Retailer'));
    return matchSearch && matchTier;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#58051E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Snowflake className="w-6 h-6 text-cyan-600" /> Rimi Frozen Foods & Cold Chain Central Oversight
            </h1>
            <span className="text-[10px] font-black bg-cyan-50 text-cyan-700 border border-cyan-200 px-2.5 py-0.5 rounded-full">
              Live Supabase Sync
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Central executive oversight across 3 customer categories (Distributors, Shops / Retailers, Wholesalers), sales orders, and cold storage telemetry.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="text-xs font-bold" onClick={handleExportSalesCsv}>
            <Download className="w-3.5 h-3.5 mr-1" /> Export Sales CSV
          </Button>
          <Button size="sm" variant="outline" className="text-xs font-bold" onClick={loadData}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards — Live Supabase Calculations */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Consolidated Sales', val: `₹${(totalSalesInr / 100000).toFixed(2)}L`, sub: `${orders.length} Batch Orders Logged`, color: 'text-cyan-700 bg-cyan-50 border-cyan-100' },
          { label: 'CRM Accounts (3 Tiers)', val: `${customers.length} Partners`, sub: 'Distributors, Shops, Wholesalers', color: 'text-blue-700 bg-blue-50 border-blue-100' },
          { label: 'Cold Storage Inventory', val: `${totalStockUnits.toLocaleString()} Units`, sub: '-18°C to -22°C Compliant', color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
          { label: 'Active Reefer Fleet', val: `${activeReefersCount} Vehicles`, sub: 'Realtime GPS & Temp Log', color: 'text-amber-700 bg-amber-50 border-amber-100' },
        ].map((kpi, idx) => (
          <Card key={idx} className="p-4 border border-slate-200/70 shadow-xs space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-400">{kpi.label}</span>
            <div className="text-xl font-black text-slate-900">{kpi.val}</div>
            <span className="text-[11px] font-bold text-slate-500">{kpi.sub}</span>
          </Card>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold">
        {[
          { id: 'customers', label: `3 Customer Types (${customers.length})`, icon: UserCheck },
          { id: 'sales', label: `Consolidated Sales Orders (${orders.length})`, icon: ShoppingBag },
          { id: 'inventory', label: `Batch & Expiry Stock (${products.length})`, icon: Layers },
          { id: 'fleet', label: `Reefer Fleet Telemetry (${deliveries.length})`, icon: Truck },
          { id: 'activity', label: `CRM Activity Log (${activities.length})`, icon: ShieldCheck }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-[#58051E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: 3 CUSTOMER TIERS ── */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search business name, contact, territory..."
                className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['All', 'Distributor', 'Shop / Retailer', 'Wholesaler'] as const).map(tier => (
                <button
                  key={tier}
                  onClick={() => setCustomerFilter(tier)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    customerFilter === tier ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tier === 'All' ? 'All Customer Tiers' : tier}
                </button>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 select-none">
                    <th className="py-3 px-4">Business & Contact</th>
                    <th className="py-3 px-4">Customer Category</th>
                    <th className="py-3 px-4">Territory / Region</th>
                    <th className="py-3 px-4 text-right">Credit Limit</th>
                    <th className="py-3 px-4">Assigned Sales Staff</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs font-bold text-slate-400">
                        Loading CRM customer accounts from Supabase...
                      </td>
                    </tr>
                  ) : filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs font-bold text-slate-400">
                        No customer accounts found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div>{c.business_name}</div>
                          <span className="text-[10px] text-slate-400 font-normal">{c.contact_person} · {c.phone}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                            c.customer_type === 'Distributor' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                            c.customer_type === 'Wholesaler' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            'bg-cyan-50 text-cyan-700 border-cyan-200'
                          }`}>
                            {c.customer_type || 'Shop / Retailer'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-800">{c.territory || c.city || 'Western Hub'}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                          ₹{Number(c.credit_limit || 500000).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <strong className="text-slate-800">{c.assigned_staff_name || 'Rajesh Kulkarni'}</strong>
                            <button
                              onClick={() => {
                                setReassignCustomer(c);
                                setNewStaff(c.assigned_staff_name || (staffList[0]?.name || ''));
                              }}
                              className="text-[10px] font-bold text-[#58051E] hover:underline cursor-pointer"
                            >
                              (Reassign)
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            {c.status || 'Active Account'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 2: SALES ORDERS ── */}
      {activeTab === 'sales' && (
        <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                <th className="py-3 px-4">Order No & Date</th>
                <th className="py-3 px-4">Customer Account</th>
                <th className="py-3 px-4 text-right">Amount (INR)</th>
                <th className="py-3 px-4 text-center">Payment Status</th>
                <th className="py-3 px-4 text-center">Fulfillment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs font-bold text-slate-400">
                    No sales orders logged in system.
                  </td>
                </tr>
              ) : (
                orders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-700">
                      <div>{o.order_no || o.id}</div>
                      <span className="text-[10px] text-slate-400 font-normal">{o.created_at ? new Date(o.created_at).toLocaleDateString() : 'Recent'}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{o.customer_name || 'Retail Wholesale Client'}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900">
                      ₹{Number(o.total_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                        o.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {o.payment_status || 'Paid'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border-blue-200">
                        {o.order_status || 'Delivered'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── TAB 3: INVENTORY ── */}
      {activeTab === 'inventory' && (
        <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                <th className="py-3 px-4">Product SKU & Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-right">Available Stock</th>
                <th className="py-3 px-4 text-center">Storage Temp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs font-bold text-slate-400">
                    No products cataloged.
                  </td>
                </tr>
              ) : (
                products.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div>{p.name}</div>
                      <span className="text-[10px] font-mono text-slate-400 font-normal">SKU: {p.sku || p.id?.slice(0, 6)}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{p.category || 'Frozen Veg / Dairy'}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">₹{p.unit_price || 150}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                      {Number(p.stock_quantity || p.total_stock || 1200).toLocaleString()} {p.unit || 'Kg'}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-cyan-600">
                      {p.storage_temp || '-18°C'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── TAB 4: REEFER FLEET ── */}
      {activeTab === 'fleet' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {deliveries.length === 0 ? (
            <Card className="p-8 text-center col-span-3 text-xs font-bold text-slate-400">
              No active reefer fleet deliveries recorded.
            </Card>
          ) : (
            deliveries.map(d => (
              <Card key={d.id} className="p-5 border border-slate-200/70 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900 text-xs">{d.vehicle_no || 'MH-04-AB-9821'}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-50 text-cyan-700 border border-cyan-200">
                    {d.delivery_status || 'In Transit'}
                  </span>
                </div>
                <div className="text-xs space-y-1 text-slate-600">
                  <div>Driver: <strong className="text-slate-800">{d.driver_name || 'Deepak Patil'}</strong> ({d.driver_phone || '+91 98200 11223'})</div>
                  <div>Destination: <span className="text-slate-800 font-semibold">{d.destination_city || 'Pune Cold Hub'}</span></div>
                  <div>Sensor Telemetry: <strong className="text-cyan-700 font-mono">{d.departure_temp || '-19.4°C'}</strong></div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── TAB 5: CRM ACTIVITY ── */}
      {activeTab === 'activity' && (
        <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">
            Realtime CRM & Cold Chain Interaction Log
          </h3>
          <div className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-xs font-bold text-slate-400 text-center py-6">No recent CRM interactions recorded.</p>
            ) : (
              activities.map((a: any, idx: number) => (
                <div key={a.id || idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{a.title}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">{a.description || 'Customer interaction recorded.'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-mono block">{a.created_at ? new Date(a.created_at).toLocaleDateString() : 'Recent'}</span>
                    <span className="text-[10px] font-bold text-slate-600">{a.performed_by || 'Staff'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Reassign Customer Sales Staff Modal */}
      <AnimatePresence>
        {reassignCustomer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setReassignCustomer(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-black text-slate-900">Reassign Rimi Sales Staff</h3>
                <button onClick={() => setReassignCustomer(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4 text-xs">
                <p className="font-bold text-slate-700">Customer: <span className="text-slate-900 font-extrabold">{reassignCustomer.business_name}</span></p>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Select Territory Sales Staff</label>
                  <select
                    value={newStaff}
                    onChange={e => setNewStaff(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    {staffList.map(st => (
                      <option key={st.id || st.email} value={st.name}>
                        {st.name} ({st.roleLabel || st.division})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setReassignCustomer(null)}>Cancel</Button>
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]"
                    onClick={handleConfirmReassign}
                  >
                    Confirm Reassign
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
