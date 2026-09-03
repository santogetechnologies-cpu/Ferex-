import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Search, Download, Eye, Plus, X, CheckCircle2, Truck, Trash2, Printer } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { getRimiSalesOrders, createRimiSalesOrder, updateRimiOrderStatus, deleteRimiSalesOrder, getRimiDistributors } from '../../lib/api/rimi';

export const RimiSalesOrders: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [distributors, setDistributors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const [orderData, distData] = await Promise.all([
        getRimiSalesOrders(),
        getRimiDistributors()
      ]);
      setDistributors(distData);

      if (Array.isArray(orderData) && orderData.length > 0) {
        setOrders(orderData.map(d => ({
          id: d.order_no || d.id,
          rawId: d.id,
          orderNo: d.order_no,
          buyer: d.distributor?.business_name || d.customer_name || 'HyperCity Hub',
          date: new Date(d.created_at || Date.now()).toLocaleDateString(),
          deliveryDate: d.delivery_date || '2026-09-05',
          items: d.items_summary || 'Frozen Food Assortment',
          rawAmount: Number(d.total_amount || 0),
          amount: `₹${Number(d.total_amount || 0).toLocaleString('en-IN')}`,
          status: d.order_status || d.status || 'Received',
          paymentStatus: d.payment_status || 'Unpaid',
          truck: d.assigned_reefer_truck || 'Reefer Truck #MH-12-AZ-8901'
        })));
      } else {
        setOrders([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel('realtime_rimi_sales_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_sales_orders' }, () => {
        loadOrders();
      })
      .subscribe();

    const handleLocalChange = () => loadOrders();
    window.addEventListener('ferex_rimi_sales_orders_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_rimi_sales_orders_change', handleLocalChange);
    };
  }, [loadOrders]);

  const [newOrder, setNewOrder] = useState({
    distributor_id: '',
    buyer: '',
    items: '50 Packs King Prawns (500g) + 100 Packs Gourmet Chicken Nuggets',
    amount: '85000',
    delivery_date: new Date(Date.now() + 86400000).toISOString().split('T')[0]
  });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = Number(newOrder.amount.replace(/[^0-9.]/g, '')) || 50000;
    const created = await createRimiSalesOrder({
      distributor_id: newOrder.distributor_id || (distributors.length > 0 ? distributors[0].id : undefined),
      customer_name: newOrder.buyer || (distributors.length > 0 ? distributors[0].business_name : 'HyperCity Supermarket'),
      items_summary: newOrder.items,
      total_amount: cleanAmount,
      delivery_date: newOrder.delivery_date
    });
    setShowCreateModal(false);
    showToastMsg(`Created Cold Chain B2B Order ${created.order_no || 'SO-2026'}`);
    setNewOrder({ distributor_id: '', buyer: '', items: '50 Packs King Prawns + 100 Packs Chicken Nuggets', amount: '85000', delivery_date: new Date(Date.now() + 86400000).toISOString().split('T')[0] });
    await loadOrders();
  };

  const handleStatusChange = async (rawId: string, newStatus: string) => {
    await updateRimiOrderStatus(rawId, newStatus);
    setOrders(prev => prev.map(o => o.rawId === rawId ? { ...o, status: newStatus } : o));
    showToastMsg(`Updated order status to "${newStatus}"`);
  };

  const handleDeleteOrder = async (rawId: string) => {
    await deleteRimiSalesOrder(rawId);
    setOrders(prev => prev.filter(o => o.rawId !== rawId));
    showToastMsg('Order record deleted');
  };

  const filteredOrders = orders.filter(o =>
    (o.buyer || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.status || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#6A1B2E]" /> B2B Cold Chain Sales Orders
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Rimi Cold Chain Console • Live purchase orders from distributors, cold dispatch slips, and fulfillment tracking.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Create Sales Order
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search order ID, buyer, status..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredOrders.length} Sales Orders</span>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading sales orders from database...</div>
      ) : filteredOrders.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No sales orders found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery ? 'No sales orders match your search query.' : 'There are no active orders recorded yet. Create your first sales order below.'}
          </p>
          <Button size="sm" className="mt-4 bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Create Sales Order
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                  <th className="py-3 px-4">Order ID & Date</th>
                  <th className="py-3 px-4">B2B Buyer Entity</th>
                  <th className="py-3 px-4">Delivery Due</th>
                  <th className="py-3 px-4">Order Value (₹)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredOrders.map((o) => (
                  <tr key={o.rawId || o.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">
                      <div>{o.id}</div>
                      <span className="text-[10px] font-bold text-slate-400">{o.date}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      <div>{o.buyer}</div>
                      <span className="text-[10px] text-slate-400 font-semibold">{o.truck}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-600">{o.deliveryDate}</td>
                    <td className="py-3.5 px-4 font-black text-slate-900">{o.amount}</td>
                    <td className="py-3.5 px-4">
                      <select
                        value={o.status}
                        onChange={(e) => handleStatusChange(o.rawId, e.target.value)}
                        className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#6A1B2E]"
                      >
                        <option value="Received">Received</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Cold Storage Picking">Cold Storage Picking</option>
                        <option value="Dispatched">Dispatched</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setSelectedOrder(o)} className="p-1.5 text-[#6A1B2E] hover:bg-slate-100 rounded" title="View Invoice">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteOrder(o.rawId)} className="p-1.5 text-slate-400 hover:text-red-600 rounded" title="Delete Order">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowCreateModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Create Cold Chain Sales Order</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleCreateOrder} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Select Buyer Account</label>
                  {distributors.length > 0 ? (
                    <select
                      value={newOrder.distributor_id}
                      onChange={(e) => {
                        const d = distributors.find(item => item.id === e.target.value);
                        setNewOrder({ ...newOrder, distributor_id: e.target.value, buyer: d?.business_name || '' });
                      }}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    >
                      <option value="">Choose an account...</option>
                      {distributors.map(d => (
                        <option key={d.id} value={d.id}>{d.business_name} ({d.tier || 'Retailer'})</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={newOrder.buyer}
                      onChange={(e) => setNewOrder({ ...newOrder, buyer: e.target.value })}
                      placeholder="e.g. Metro Cash & Carry Mumbai Hub"
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Item Manifest / SKU Summary</label>
                  <textarea
                    required
                    value={newOrder.items}
                    onChange={(e) => setNewOrder({ ...newOrder, items: e.target.value })}
                    rows={2}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Order Amount (₹ INR)</label>
                    <input
                      type="number"
                      required
                      value={newOrder.amount}
                      onChange={(e) => setNewOrder({ ...newOrder, amount: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Delivery Due Date</label>
                    <input
                      type="date"
                      required
                      value={newOrder.delivery_date}
                      onChange={(e) => setNewOrder({ ...newOrder, delivery_date: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Dispatch Order</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Invoice Drawer */}
      <AnimatePresence>
        {selectedOrder && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedOrder(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">Cold Chain Sales Invoice</h3>
                <button onClick={() => setSelectedOrder(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-left">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{selectedOrder.id}</span>
                  <h4 className="text-base font-black text-slate-900">{selectedOrder.buyer}</h4>
                  <p className="text-xs font-semibold text-slate-500">Order Date: {selectedOrder.date}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-xs font-semibold text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Invoice Amount:</span>
                    <span className="font-bold text-slate-900 text-sm text-[#6A1B2E]">{selectedOrder.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="font-bold text-emerald-700">{selectedOrder.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Assigned Logistics:</span>
                    <span className="font-bold text-slate-900">{selectedOrder.truck}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Delivery Scheduled:</span>
                    <span className="font-bold text-slate-900">{selectedOrder.deliveryDate}</span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-[11px] text-amber-800">
                  <span className="font-bold block">Cold Chain Compliance:</span>
                  All goods dispatched under strict -18°C temperature control with active reefer GPS datalogging.
                </div>

                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => window.print()}>
                    <Printer className="w-3.5 h-3.5 mr-1" /> Print Slip
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-xs font-bold" onClick={() => setSelectedOrder(null)}>
                    Close
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
