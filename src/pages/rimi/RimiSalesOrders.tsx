import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Search, Plus, Trash2, X, CheckCircle2,
  Truck, DollarSign, Package, User, MapPin, Eye,
  Clock, CheckSquare, FileText, ChevronRight, AlertTriangle
} from 'lucide-react';

import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import {
  getRimiSalesOrders,
  createRimiSalesOrder,
  updateRimiSalesOrderStatus,
  deleteRimiSalesOrder,
  getRimiCustomers,
  getRimiProducts,
  getRimiBatches,
  createRimiPayment,
  type RimiSalesOrderRecord,
  type RimiCustomerRecord,
  type RimiProductRecord,
  type RimiInventoryBatchRecord
} from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';

const RIMI_ADMIN_ROLES = ['rimi_admin', 'rimi_frozen', 'admin', 'education_admin', 'central', 'super_admin', 'superadmin'];

const ORDER_STATUSES = ['Received', 'Confirmed', 'Cold Storage Picking', 'Dispatched', 'Delivered', 'Cancelled'] as const;

export const RimiSalesOrders: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = RIMI_ADMIN_ROLES.includes(profile?.role || '');

  const [orders, setOrders] = useState<RimiSalesOrderRecord[]>([]);
  const [customers, setCustomers] = useState<RimiCustomerRecord[]>([]);
  const [products, setProducts] = useState<RimiProductRecord[]>([]);
  const [batches, setBatches] = useState<RimiInventoryBatchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [paymentFilter, setPaymentFilter] = useState<string>('All');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<RimiSalesOrderRecord | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer');
  const [toast, setToast] = useState('');

  // Order Items Creation Form
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState(new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderItems, setOrderItems] = useState<Array<{
    product_id: string;
    product_name: string;
    batch_id: string;
    quantity: number;
    unit_price: number;
  }>>([]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const staffEmail = !isAdmin ? profile?.email : undefined;
      const [orderList, custList, prodList, batchList] = await Promise.all([
        getRimiSalesOrders(staffEmail ? { staffEmail } : undefined),
        getRimiCustomers(staffEmail ? { staffEmail } : undefined),
        getRimiProducts(),
        getRimiBatches()
      ]);
      setOrders(orderList);
      setCustomers(custList);
      setProducts(prodList);
      setBatches(batchList);

      if (custList.length > 0 && !selectedCustomer) {
        setSelectedCustomer(custList[0].id);
        setDeliveryAddress(custList[0].address || custList[0].city || '');
      }
      if (prodList.length > 0 && orderItems.length === 0) {
        setOrderItems([{
          product_id: prodList[0].id,
          product_name: prodList[0].name,
          batch_id: batchList.find(b => b.product_id === prodList[0].id)?.id || '',
          quantity: 50,
          unit_price: prodList[0].unit_price
        }]);
      }
    } finally {
      setLoading(false);
    }
  }, [isAdmin, orderItems.length, profile?.email, selectedCustomer]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_rimi_sales_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_sales_orders' }, () => loadData())
      .subscribe();

    const handleSync = () => loadData();
    window.addEventListener('ferex_rimi_orders_change', handleSync);
    window.addEventListener('ferex_rimi_payments_change', handleSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_rimi_orders_change', handleSync);
      window.removeEventListener('ferex_rimi_payments_change', handleSync);
    };
  }, [loadData]);

  const handleAddItemRow = () => {
    if (products.length === 0) return;
    const p = products[0];
    const b = batches.find(bt => bt.product_id === p.id);
    setOrderItems([...orderItems, {
      product_id: p.id,
      product_name: p.name,
      batch_id: b?.id || '',
      quantity: 50,
      unit_price: p.unit_price
    }]);
  };

  const handleRemoveItemRow = (index: number) => {
    setOrderItems(orderItems.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...orderItems];
    if (field === 'product_id') {
      const p = products.find(prod => prod.id === val);
      const b = batches.find(bt => bt.product_id === val);
      updated[index].product_id = val;
      updated[index].product_name = p?.name || '';
      updated[index].unit_price = p?.unit_price || 200;
      updated[index].batch_id = b?.id || '';
    } else {
      (updated[index] as any)[field] = val;
    }
    setOrderItems(updated);
  };

  const calculatedTotal = orderItems.reduce((acc, it) => acc + (Number(it.quantity) * Number(it.unit_price)), 0);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || orderItems.length === 0) return;

    try {
      const cust = customers.find(c => c.id === selectedCustomer);
      await createRimiSalesOrder({
        customer_id: selectedCustomer,
        customer_name: cust?.business_name,
        customer_type: cust?.customer_type,
        delivery_date: deliveryDate,
        delivery_address: deliveryAddress,
        territory: cust?.territory,
        assigned_staff_name: profile?.full_name || cust?.assigned_staff_name || 'Sales Officer',
        notes: orderNotes,
        items: orderItems
      });

      setShowAddModal(false);
      showToast('Created Sales Order and scheduled Reefer delivery');
      await loadData();
    } catch (err: any) {
      showToast(`Error creating order: ${err.message || 'Database error'}`);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: RimiSalesOrderRecord['order_status']) => {
    try {
      await updateRimiSalesOrderStatus(orderId, status);
      showToast(`Order status updated to "${status}"`);
      await loadData();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, order_status: status } : null);
      }
    } catch (err: any) {
      showToast(`Error updating status: ${err.message || 'Database error'}`);
    }
  };

  const handleLogPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !paymentAmount) return;

    try {
      await createRimiPayment({
        customer_id: selectedOrder.customer_id,
        customer_name: selectedOrder.customer_name,
        order_id: selectedOrder.id,
        order_no: selectedOrder.order_no,
        amount: Number(paymentAmount),
        payment_method: paymentMethod,
        collected_by_name: profile?.full_name || 'Finance Team',
        notes: `Payment against order ${selectedOrder.order_no}`
      });

      setShowPaymentModal(false);
      showToast(`Logged payment of ₹${paymentAmount.toLocaleString('en-IN')} for order ${selectedOrder.order_no}`);
      await loadData();
    } catch (err: any) {
      showToast(`Error logging payment: ${err.message || 'Database error'}`);
    }
  };

  const handleDelete = async (orderId: string, orderNo: string) => {
    if (!isAdmin) {
      showToast('Restricted: Only Admin can delete sales orders.');
      return;
    }
    if (!window.confirm(`Delete order ${orderNo}?`)) return;

    try {
      await deleteRimiSalesOrder(orderId);
      showToast(`Removed order ${orderNo}`);
      await loadData();
    } catch (err: any) {
      showToast(`Error deleting order: ${err.message || 'Database error'}`);
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchStatus = statusFilter === 'All' || o.order_status === statusFilter;
    const matchPayment = paymentFilter === 'All' || o.payment_status === paymentFilter;
    const s = search.toLowerCase();
    const matchSearch =
      o.order_no.toLowerCase().includes(s) ||
      o.customer_name.toLowerCase().includes(s) ||
      (o.territory && o.territory.toLowerCase().includes(s));
    return matchStatus && matchPayment && matchSearch;
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
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#58051E]" /> Sales & Distribution Orders Flow
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Single unified workflow connecting CRM Customer → Batch Allocation → Reefer Delivery → Payment.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Create Sales Order
        </Button>
      </div>

      {/* Filter Card */}
      <Card className="p-4 border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order no, customer name..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
        >
          <option value="All">All Order Stages</option>
          {ORDER_STATUSES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
        >
          <option value="All">All Payment Statuses</option>
          <option value="Unpaid">Unpaid</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Paid">Paid</option>
          <option value="Overdue">Overdue</option>
        </select>
      </Card>

      {/* Sales Orders Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400">Loading sales orders...</div>
      ) : filteredOrders.length === 0 ? (
        <Card className="p-12 text-center text-xs font-semibold text-slate-400 border-dashed">
          No sales orders found matching current filters.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((ord) => (
            <Card key={ord.id} className="p-5 border border-slate-200/80 shadow-xs space-y-3.5 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">{ord.order_no}</span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                    ord.order_status === 'Delivered'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : ord.order_status === 'Dispatched'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {ord.order_status}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-900 leading-snug">{ord.customer_name}</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">{ord.customer_type} • {ord.territory}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Total Bill:</span>
                    <span className="font-black text-slate-900">₹{Number(ord.total_amount).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Paid Amount:</span>
                    <span className="font-bold text-emerald-700">₹{Number(ord.paid_amount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Due Balance:</span>
                    <span className={`font-black ${ord.balance_amount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                      ₹{Number(ord.balance_amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                  <span>Delivery: {ord.delivery_date || 'Scheduled'}</span>
                  <span className="font-bold text-slate-700">Items: {ord.items?.length || 1}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedOrder(ord)}
                    className="text-xs font-bold h-8 border-slate-200 hover:border-slate-300"
                  >
                    <Eye className="w-3 h-3 mr-1 text-[#58051E]" /> Details
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedOrder(ord);
                      setPaymentAmount(Number(ord.balance_amount));
                      setShowPaymentModal(true);
                    }}
                    className="text-xs font-bold h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <DollarSign className="w-3 h-3 mr-1" /> Log Payment
                  </Button>
                </div>

                {isAdmin && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleDelete(ord.id, ord.order_no)}
                      className="text-[10px] text-slate-400 hover:text-rose-600 font-bold p-1 cursor-pointer"
                    >
                      Delete Order
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Sales Order Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900">Create Unified Sales Order</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleCreateOrder} className="space-y-4">
                {/* Customer Selector & Target Delivery Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Customer Account *</label>
                    <select
                      required
                      value={selectedCustomer}
                      onChange={(e) => {
                        setSelectedCustomer(e.target.value);
                        const match = customers.find(c => c.id === e.target.value);
                        if (match) setDeliveryAddress(match.address || match.city || '');
                      }}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                    >
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>[{c.customer_type}] {c.business_name} ({c.city})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Target Delivery Date *</label>
                    <input
                      type="date"
                      required
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Delivery Destination Address</label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Hub / Store address"
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>

                {/* Line Items Table */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Order SKUs & Batch Allocation</span>
                    <Button type="button" size="sm" variant="outline" onClick={handleAddItemRow} className="text-[11px] font-bold h-7">
                      <Plus className="w-3 h-3 mr-1" /> Add Product Row
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {orderItems.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center text-xs">
                        <div className="sm:col-span-2">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase">Product SKU</label>
                          <select
                            value={item.product_id}
                            onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                            className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                          >
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name} (₹{p.unit_price}/{p.unit})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase">Batch Lot</label>
                          <select
                            value={item.batch_id}
                            onChange={(e) => handleItemChange(idx, 'batch_id', e.target.value)}
                            className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                          >
                            <option value="">Auto-Allocate Oldest Batch</option>
                            {batches.filter(b => b.product_id === item.product_id).map(b => (
                              <option key={b.id} value={b.id}>{b.batch_no} (Stock: {b.quantity})</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase">Quantity (KG)</label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                              className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                            />
                          </div>
                          {orderItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 mt-3 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Summary */}
                <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-200/80">
                  <span className="text-xs font-black text-slate-700">Calculated Total Payable:</span>
                  <span className="text-lg font-black text-[#58051E]">₹{calculatedTotal.toLocaleString('en-IN')}</span>
                </div>

                <div className="pt-2 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">Confirm Order & Dispatch Truck</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Log Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedOrder && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={() => setShowPaymentModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Record Payment Collection</h3>
                  <span className="text-[10px] font-bold text-[#58051E]">{selectedOrder.order_no} • {selectedOrder.customer_name}</span>
                </div>
                <button onClick={() => setShowPaymentModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleLogPayment} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Collection Amount (₹ INR) *</label>
                  <input
                    type="number"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Payment Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="Cheque">Commercial Cheque</option>
                    <option value="Cash">Cash on Delivery (COD)</option>
                  </select>
                </div>

                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">Record & Sync Ledger</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Order Details Drawer */}
      <AnimatePresence>
        {selectedOrder && !showPaymentModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedOrder(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-lg bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div>
                  <h3 className="text-base font-black text-slate-900">{selectedOrder.order_no}</h3>
                  <span className="text-[10px] font-bold text-[#58051E] uppercase">{selectedOrder.customer_name}</span>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-5 text-left text-xs">
                {/* Workflow Status Switcher */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Advance Order Workflow Stage</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {ORDER_STATUSES.map(st => (
                      <button
                        key={st}
                        onClick={() => handleUpdateStatus(selectedOrder.id, st)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          selectedOrder.order_status === st
                            ? 'bg-[#58051E] text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Financial Details */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Invoice Value:</span>
                    <span className="font-black text-slate-900">₹{Number(selectedOrder.total_amount).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Paid Amount:</span>
                    <span className="font-bold text-emerald-700">₹{Number(selectedOrder.paid_amount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Remaining Balance:</span>
                    <span className="font-black text-rose-600">₹{Number(selectedOrder.balance_amount).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Items in Order */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-[#58051E]" /> Allocated Order SKUs ({selectedOrder.items?.length || 0})
                  </h4>

                  <div className="space-y-1.5">
                    {(selectedOrder.items || []).map((it, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-slate-900 block">{it.product_name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Lot: {it.batch_no || 'Assigned'}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 block">{it.quantity} {it.unit}</span>
                          <span className="text-[10px] text-slate-400">₹{it.unit_price} / unit</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Button size="sm" className="w-full text-xs font-bold bg-[#58051E] hover:bg-[#430316]" onClick={() => setSelectedOrder(null)}>
                  Close Order Dossier
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
