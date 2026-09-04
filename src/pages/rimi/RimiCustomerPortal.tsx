import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  getRimiProducts,
  getRimiSalesOrders,
  createRimiSalesOrder,
  getRimiDeliveries,
  getRimiCollections,
  getRimiMessages,
  sendRimiMessage,
} from '../../lib/api/rimi';
import {
  Snowflake,
  ShoppingBag,
  Truck,
  FileText,
  CreditCard,
  Layers,
  Send,
  LogOut,
  RefreshCw,
  Building2,
  Clock,
  ShieldCheck,
  Plus,
  ThermometerSnowflake,
  User,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const RimiCustomerPortal: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'overview' | 'catalog' | 'orders' | 'deliveries' | 'invoices' | 'messages'>('overview');
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // New Order Modal State
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [orderQuantity, setOrderQuantity] = useState(10);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const customerEmail = user?.email || profile?.email || '';
  const customerName = profile?.full_name || user?.user_metadata?.full_name || customerEmail.split('@')[0] || 'Store Manager';
  const businessName = user?.user_metadata?.company_name || profile?.department?.replace('Rimi:', '') || 'HyperCity Retail Hub';

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, allOrders, allDelivs, allCols, chatMsgs] = await Promise.all([
        getRimiProducts(),
        getRimiSalesOrders(),
        getRimiDeliveries(),
        getRimiCollections(),
        getRimiMessages('customer_portal'),
      ]);

      setProducts(prods || []);
      setOrders(allOrders || []);
      setDeliveries(allDelivs || []);
      setCollections(allCols || []);
      setMessages(chatMsgs || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('rimi_customer_portal_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_sales_orders' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_deliveries' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || orderQuantity <= 0 || submittingOrder) return;
    setSubmittingOrder(true);
    try {
      const totalAmt = (selectedProduct.unit_price || 450) * orderQuantity;
      await createRimiSalesOrder({
        customer_name: businessName,
        total_amount: totalAmt,
        items: [
          {
            product_id: selectedProduct.id,
            product_name: selectedProduct.name,
            quantity: orderQuantity,
            unit_price: selectedProduct.unit_price,
            total_line_amount: totalAmt,
          },
        ],
      });
      showToast(`Order placed successfully for ${orderQuantity} ${selectedProduct.unit || 'units'} of ${selectedProduct.name}`);
      setShowOrderModal(false);
      setSelectedProduct(null);
      setOrderQuantity(10);
      loadData();
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || sendingMsg) return;
    setSendingMsg(true);
    try {
      await sendRimiMessage({
        conversation_id: 'customer_portal',
        contact_name: businessName,
        contact_role: 'Procurement Partner',
        sender_name: customerName,
        message: newMsg.trim(),
        is_self: true,
      });
      setNewMsg('');
      const updated = await getRimiMessages('customer_portal');
      setMessages(updated);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const totalOrderValue = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const activeDeliveries = deliveries.filter((d) => d.delivery_status !== 'Delivered');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-[#6A1B2E] selection:text-white">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── Top Header Navigation ── */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6A1B2E] to-[#8B263E] flex items-center justify-center shadow-lg shadow-[#6A1B2E]/30 text-white font-black text-xl tracking-wider">
            <Snowflake className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-wide text-white">RIMI FROZEN FOODS</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#6A1B2E]/40 text-pink-300 border border-[#6A1B2E]">
                B2B Customer Portal
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              {businessName} • <User className="w-3 h-3 text-slate-500" /> {customerName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5 border border-slate-700"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">Sync Data</span>
          </button>
          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-800/40 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* ── Sub-navigation Tab Bar ── */}
      <nav className="bg-slate-900 border-b border-slate-800 px-6 overflow-x-auto flex gap-1">
        {[
          { id: 'overview', label: 'Overview', icon: Layers },
          { id: 'catalog', label: `Product Catalog (${products.length})`, icon: ShoppingBag },
          { id: 'orders', label: `My Orders (${orders.length})`, icon: FileText },
          { id: 'deliveries', label: `Cold Chain Deliveries (${activeDeliveries.length})`, icon: Truck },
          { id: 'invoices', label: `Statements & Payments`, icon: CreditCard },
          { id: 'messages', label: 'Cold Hub Dispatch', icon: Send },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'border-pink-500 text-pink-400 bg-pink-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* ── Main Body ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* ── TAB 1: OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg hover:border-pink-500/40 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Live Deliveries</span>
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                    <Truck className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">{activeDeliveries.length} En Route</div>
                <p className="text-xs text-cyan-400 mt-1 flex items-center gap-1 font-semibold">
                  <ThermometerSnowflake className="w-3.5 h-3.5" /> -18.0°C Deep Freeze Monitored
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg hover:border-pink-500/40 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Orders</span>
                  <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">{orders.length} Placed</div>
                <p className="text-xs text-slate-400 mt-1">All cold storage orders</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg hover:border-pink-500/40 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Cumulative Volume</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">
                  ₹{(totalOrderValue / 100000).toFixed(2)} Lakhs
                </div>
                <p className="text-xs text-slate-400 mt-1">B2B Wholesale Procurement</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg hover:border-pink-500/40 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Quality Assurance</span>
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">100% Certified</div>
                <p className="text-xs text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> HACCP & FSSAI Cleared
                </p>
              </div>
            </div>

            {/* Quick Catalog Bar & Order Trigger */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-[#6A1B2E]/30 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
              <div>
                <h3 className="font-bold text-base text-white">Need to restock your cold storage display?</h3>
                <p className="text-xs text-slate-300">Place an instant wholesale supply order with verified next-day reefer delivery.</p>
              </div>
              <button
                onClick={() => setActiveTab('catalog')}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6A1B2E] to-[#8B263E] hover:from-[#8B263E] hover:to-[#A32D49] text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#6A1B2E]/40 transition-all"
              >
                <Plus className="w-4 h-4" /> Browse Catalog & Place Order
              </button>
            </div>

            {/* Recent Orders Table */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-pink-400" /> Recent Supply Orders
                  </h2>
                  <p className="text-xs text-slate-400">Order fulfillment and cold storage picking status</p>
                </div>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-semibold text-pink-400 hover:text-pink-300 flex items-center gap-1"
                >
                  View All ({orders.length}) →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4 rounded-l-lg">Order #</th>
                      <th className="py-3 px-4">Items / Description</th>
                      <th className="py-3 px-4">Order Date</th>
                      <th className="py-3 px-4">Amount (INR)</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4 text-right rounded-r-lg">Fulfillment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {orders.slice(0, 4).map((o: any) => (
                      <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-pink-400">{o.order_no || o.id}</td>
                        <td className="py-3 px-4 text-slate-200">
                          {o.items?.length > 0 ? o.items.map((i: any) => i.product_name).join(', ') : 'Frozen Foods Batch'}
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono">{o.created_at ? o.created_at.split('T')[0] : '2026-09-03'}</td>
                        <td className="py-3 px-4 font-bold text-white font-mono">
                          ₹{Number(o.total_amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            o.payment_status === 'Paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {o.payment_status || 'Unpaid'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            o.order_status === 'Delivered'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                          }`}>
                            <Clock className="w-3 h-3" /> {o.order_status || 'Received'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No orders placed yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: CATALOG ── */}
        {activeTab === 'catalog' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-pink-400" /> Rimi Frozen Wholesale Catalog
              </h2>
              <p className="text-xs text-slate-400">Live wholesale B2B pricing, stock availability, and instant reordering</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p: any) => (
                <div key={p.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 hover:border-pink-500/40 transition-all flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20">
                        {p.category || 'Frozen Foods'}
                      </span>
                      <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1">
                        <ThermometerSnowflake className="w-3.5 h-3.5" /> {p.storage_temp || '-18°C'}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-white">{p.name}</h3>
                    <p className="text-xs text-slate-400 font-mono">SKU: {p.sku || 'RIMI-000'}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 font-bold">Wholesale Price</span>
                      <p className="text-base font-bold text-white font-mono">
                        ₹{Number(p.unit_price || 0).toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-400">/ {p.unit || 'KG'}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedProduct(p);
                        setShowOrderModal(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#6A1B2E] to-[#8B263E] hover:from-[#8B263E] hover:to-[#A32D49] text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Order
                    </button>
                  </div>
                </div>
              ))}
              {products.length === 0 && (
                <div className="col-span-3 p-12 text-center text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
                  No products currently in catalog.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: ORDERS ── */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-pink-400" /> Order History & Fulfilment
              </h2>
              <p className="text-xs text-slate-400">Track all cold storage order dispatches and delivery confirmations</p>
            </div>

            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Order #</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Items Summary</th>
                    <th className="py-3.5 px-4 text-right">Total Amount</th>
                    <th className="py-3.5 px-4 text-center">Payment</th>
                    <th className="py-3.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {orders.map((o: any) => (
                    <tr key={o.id} className="hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-mono font-bold text-pink-400">{o.order_no || o.id}</td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono">{o.created_at ? o.created_at.split('T')[0] : '2026-09-03'}</td>
                      <td className="py-3.5 px-4 text-slate-200">
                        {o.items?.length > 0 ? o.items.map((i: any) => `${i.quantity}x ${i.product_name}`).join(', ') : 'Frozen Consignment'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-white font-mono">
                        ₹{Number(o.total_amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          o.payment_status === 'Paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {o.payment_status || 'Unpaid'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          o.order_status === 'Delivered'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                        }`}>
                          {o.order_status || 'Received'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No orders recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 4: DELIVERIES ── */}
        {activeTab === 'deliveries' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-cyan-400" /> Active Cold Chain Reefer Deliveries
              </h2>
              <p className="text-xs text-slate-400">Live vehicle reefer temperature monitoring and driver contact</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {deliveries.map((d: any) => (
                <div key={d.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-wider">Reefer Truck Dispatch</span>
                      <h3 className="font-mono font-bold text-base text-white mt-1">{d.vehicle_no || 'MH-12-AZ-8901 (10T)'}</h3>
                      <p className="text-xs text-slate-400">Driver: {d.driver_name || 'Sunil Jadhav'} • {d.driver_phone || '+91 98200 44551'}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      d.delivery_status === 'Delivered'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                    }`}>
                      {d.delivery_status || 'In Transit'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Departure Temp</span>
                      <p className="text-cyan-400 font-mono font-bold">{d.departure_temp || '-18.5°C'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Cold Chain Status</span>
                      <p className="text-emerald-400 font-bold flex items-center gap-1 justify-end">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Optimal Frozen
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {deliveries.length === 0 && (
                <div className="col-span-2 p-12 text-center text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
                  No deliveries currently in transit.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 5: STATEMENTS & PAYMENTS ── */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" /> B2B Statements & Settlement Receipts
              </h2>
              <p className="text-xs text-slate-400">Payment receipts, bank transfer logs, and settlement confirmations</p>
            </div>

            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Reference #</th>
                    <th className="py-3.5 px-4">Payment Method</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 text-right">Amount (INR)</th>
                    <th className="py-3.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {collections.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-mono font-bold text-pink-400">{c.reference_no || c.id}</td>
                      <td className="py-3.5 px-4 text-slate-300 font-semibold">{c.payment_method || 'Bank Transfer (NEFT/RTGS)'}</td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono">{c.payment_date || '2026-09-02'}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400 font-mono">
                        ₹{Number(c.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Settled
                        </span>
                      </td>
                    </tr>
                  ))}
                  {collections.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        No payment records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 6: MESSAGES ── */}
        {activeTab === 'messages' && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-pink-400" /> Direct Cold Storage Dispatch Desk
              </h2>
              <p className="text-xs text-slate-400">Direct message channel with Rimi cold chain management</p>
            </div>

            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl flex flex-col h-[520px]">
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/40">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                    <Lock className="w-8 h-8 text-slate-600" />
                    <p className="text-xs">Your encrypted customer communication channel.</p>
                    <p className="text-[11px] text-slate-600">Send inquiries on temperature logs, batch orders, or delivery routes.</p>
                  </div>
                )}
                {messages.map((m: any) => {
                  const isMine = m.is_self || m.sender_name === customerName;
                  return (
                    <div key={m.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      <div className="text-[10px] text-slate-400 mb-0.5 font-semibold">
                        {isMine ? 'You' : m.sender_name} • {m.contact_role || 'Operations'}
                      </div>
                      <div className={`p-3 rounded-2xl max-w-md text-xs leading-relaxed ${
                        isMine
                          ? 'bg-gradient-to-r from-[#6A1B2E] to-[#8B263E] text-white font-medium rounded-tr-none'
                          : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700'
                      }`}>
                        {m.message}
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSendMessage} className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  placeholder="Inquire about batch expiry, route ETA, or special deep freeze orders..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500"
                />
                <button
                  type="submit"
                  disabled={sendingMsg || !newMsg.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6A1B2E] to-[#8B263E] hover:from-[#8B263E] hover:to-[#A32D49] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-[#6A1B2E]/30"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* ── Order Placement Modal ── */}
      {showOrderModal && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-pink-400">Place Wholesale Order</span>
                <h3 className="font-bold text-base text-white mt-0.5">{selectedProduct.name}</h3>
                <p className="text-slate-400 text-xs">SKU: {selectedProduct.sku}</p>
              </div>
              <button
                onClick={() => setShowOrderModal(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold text-xs">Quantity ({selectedProduct.unit || 'Units'}):</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono font-bold"
                  required
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Unit Wholesale Price:</span>
                  <span className="text-white font-mono">₹{Number(selectedProduct.unit_price || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Reefer Storage Required:</span>
                  <span className="text-cyan-400 font-mono font-bold">{selectedProduct.storage_temp || '-18°C'}</span>
                </div>
                <div className="flex justify-between text-white font-bold pt-2 border-t border-slate-800">
                  <span>Total Order Amount:</span>
                  <span className="text-pink-400 font-mono text-sm">
                    ₹{((selectedProduct.unit_price || 450) * orderQuantity).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOrder}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#6A1B2E] to-[#8B263E] hover:from-[#8B263E] hover:to-[#A32D49] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-[#6A1B2E]/40"
                >
                  {submittingOrder ? 'Submitting...' : 'Confirm Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RimiCustomerPortal;
