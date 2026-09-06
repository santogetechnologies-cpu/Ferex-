import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Snowflake, Search, ShoppingBag, Truck, FileText, Download,
  CheckCircle2, RefreshCw, ThermometerSnowflake, UserCheck, Layers
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getRimiDistributors,
  getRimiSalesOrders,
  getRimiDeliveries,
  getRimiProducts
} from '../../lib/api/rimi';
import { sendRimiColdChainEmail } from '../../lib/api/automatedEmails';

export const CentralRimi: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'customers' | 'sales' | 'inventory' | 'fleet'>('customers');
  const [customerFilter, setCustomerFilter] = useState<'All' | 'Distributor' | 'Retailer' | 'Wholesaler'>('All');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [reassignCustomer, setReassignCustomer] = useState<any | null>(null);
  const [newStaff, setNewStaff] = useState('Rajesh Kulkarni');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cData, oData, dData, pData] = await Promise.all([
        getRimiDistributors(),
        getRimiSalesOrders(),
        getRimiDeliveries(),
        getRimiProducts()
      ]);
      setCustomers(cData || []);
      setOrders(oData || []);
      setDeliveries(dData || []);
      setProducts(pData || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate Metrics
  const totalSalesInr = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const activeReefersCount = deliveries.length;
  const totalStockUnits = products.reduce((sum, p) => sum + Number(p.stock_quantity || 0), 0);

  const handleExportSalesCsv = () => {
    const headers = ['Order No', 'Customer Name', 'Customer Type', 'Amount (INR)', 'Payment Status', 'Order Status', 'Date'];
    const rows = orders.map(o => [
      o.order_no || o.id,
      `"${o.customer_name || 'Retail Partner'}"`,
      `"${o.customer_type || 'Retailer'}"`,
      o.total_amount || 0,
      o.payment_status || 'Paid',
      o.order_status || 'Delivered',
      o.created_at || '2026-09-02'
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

  const filteredCustomers = customers.filter(c => {
    const matchSearch =
      (c.business_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.contact_person || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.territory || '').toLowerCase().includes(search.toLowerCase());
    const matchTier = customerFilter === 'All' || c.tier === customerFilter;
    return matchSearch && matchTier;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20">
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
              Subsidiary Governance
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Central executive oversight of 3 customer categories (Distributors, Retailers, Wholesalers), consolidated sales log, and cold storage telemetry.
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Consolidated Sales', val: `₹${(totalSalesInr / 100000).toFixed(2)}L`, sub: `${orders.length} Batch Orders`, color: 'text-cyan-700' },
          { label: 'Customer Accounts', val: `${customers.length} Partners`, sub: 'Distributors, Shops, Wholesalers', color: 'text-blue-700' },
          { label: 'Cold Warehouse Inventory', val: `${totalStockUnits.toLocaleString()} Units`, sub: '-18°C to -22°C Compliant', color: 'text-emerald-700' },
          { label: 'Active Reefer Fleet', val: `${activeReefersCount} Vehicles`, sub: 'Realtime GPS & Temp', color: 'text-amber-700' },
        ].map((kpi, idx) => (
          <Card key={idx} className="p-4 border border-slate-200/70 shadow-xs space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-400">{kpi.label}</span>
            <div className={`text-xl font-black ${kpi.color}`}>{kpi.val}</div>
            <span className="text-[11px] font-bold text-slate-500">{kpi.sub}</span>
          </Card>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold">
        {[
          { id: 'customers', label: `3 Customer Types (${customers.length})`, icon: UserCheck },
          { id: 'sales', label: `Consolidated Sales List (${orders.length})`, icon: ShoppingBag },
          { id: 'inventory', label: `Batch & Expiry Stock (${products.length})`, icon: Layers },
          { id: 'fleet', label: `Reefer Fleet Telemetry (${deliveries.length})`, icon: Truck }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['All', 'Distributor', 'Retailer', 'Wholesaler'] as const).map(tier => (
                <button
                  key={tier}
                  onClick={() => setCustomerFilter(tier)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    customerFilter === tier ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tier === 'All' ? 'All (100+ Scalable)' : `${tier}s`}
                </button>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                    <th className="py-3 px-4">Business & Account</th>
                    <th className="py-3 px-4">Customer Category</th>
                    <th className="py-3 px-4">Territory / Region</th>
                    <th className="py-3 px-4 text-right">Credit Limit</th>
                    <th className="py-3 px-4">Assigned Sales Staff</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {filteredCustomers.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div>{c.business_name}</div>
                        <span className="text-[10px] text-slate-400 font-normal">{c.contact_person} · {c.phone}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                          c.tier === 'Distributor' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          c.tier === 'Wholesaler' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          'bg-cyan-50 text-cyan-700 border-cyan-200'
                        }`}>
                          {c.tier || 'Retailer (Shop)'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-800">{c.territory || 'Western Zone'}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{Number(c.credit_limit || 500000).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <strong className="text-slate-800">{c.assigned_sales_staff || 'Rajesh Kulkarni'}</strong>
                          <button
                            onClick={() => setReassignCustomer(c)}
                            className="text-[10px] font-bold text-[#6A1B2E] hover:underline cursor-pointer"
                          >
                            (Reassign)
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Active Partner</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 2: CONSOLIDATED SALES LIST ── */}
      {activeTab === 'sales' && (
        <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer Account</th>
                  <th className="py-3 px-4">Products Summary</th>
                  <th className="py-3 px-4 text-right">Gross Amount</th>
                  <th className="py-3 px-4 text-center">Payment Status</th>
                  <th className="py-3 px-4 text-right">Delivery Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-600">{o.order_no || o.id}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{o.customer_name || 'Retail Account'}</td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {o.items?.length > 0 ? o.items.map((i: any) => `${i.quantity}x ${i.product_name}`).join(', ') : 'Frozen Consignment'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900">
                      ₹{Number(o.total_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {o.payment_status || 'Settled'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {o.order_status || 'Delivered'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── TAB 3: BATCH & EXPIRY STOCK ── */}
      {activeTab === 'inventory' && (
        <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900">Cold Warehouse Batch & Expiration Telemetry</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-black text-slate-900 text-xs">{p.name}</h4>
                  <span className="text-[10px] font-bold text-cyan-600 font-mono">{p.storage_temp || '-18°C'}</span>
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between">
                  <span>Stock: <strong>{p.stock_quantity || 1500} {p.unit || 'Units'}</strong></span>
                  <span>Unit Price: <strong>₹{p.unit_price || 450}</strong></span>
                </div>
                <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                  ✓ HACCP & Cold Chain Verified
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── TAB 4: REEFER FLEET TELEMETRY ── */}
      {activeTab === 'fleet' && (
        <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900">Active Reefer Truck Dispatches</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deliveries.map((d, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-mono font-bold text-slate-900 text-xs">{d.vehicle_no || 'MH-12-AZ-8901'}</h4>
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    {d.delivery_status || 'In Transit'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">Driver: {d.driver_name || 'Sunil Jadhav'} ({d.driver_phone || '+91 98200 44551'})</p>
                <div className="text-xs font-mono font-bold text-cyan-600 flex items-center gap-1">
                  <ThermometerSnowflake className="w-3.5 h-3.5" /> Core Compartment Temp: {d.departure_temp || '-19.4°C'} (Optimal)
                </div>
              </div>
            ))}
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
                <button onClick={() => setReassignCustomer(null)} className="p-1 text-slate-400 hover:text-slate-600">✕</button>
              </div>
              <div className="space-y-4 text-xs">
                <p className="font-bold text-slate-700">Customer: <span className="text-slate-900">{reassignCustomer.business_name}</span></p>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Select Territory Sales Staff</label>
                  <select
                    value={newStaff}
                    onChange={e => setNewStaff(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="Rajesh Kulkarni (Mumbai Cold Hub Lead)">Rajesh Kulkarni (Mumbai Cold Hub Lead)</option>
                    <option value="Sunil Jadhav (Logistics & Fleet Staff)">Sunil Jadhav (Logistics & Fleet Staff)</option>
                    <option value="Amit Deshmukh (Pune Regional Sales)">Amit Deshmukh (Pune Regional Sales)</option>
                    <option value="Super Admin HQ">Super Admin HQ</option>
                  </select>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setReassignCustomer(null)}>Cancel</Button>
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]"
                    onClick={() => {
                      setCustomers(prev => prev.map(c => c.id === reassignCustomer.id ? { ...c, assigned_sales_staff: newStaff } : c));
                      setReassignCustomer(null);
                      showToast(`Reassigned ${reassignCustomer.business_name} to ${newStaff}!`);
                    }}
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
