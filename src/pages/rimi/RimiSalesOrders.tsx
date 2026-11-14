import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Search, Plus, Trash2, Edit3, X, CheckCircle2,
  Truck, DollarSign, Package, User, MapPin, Eye,
  Clock, CheckSquare, FileText, ChevronRight, AlertTriangle, RefreshCw
} from 'lucide-react';

import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import { useAuth } from '../../contexts/AuthContext';
import {
  getRimiSalesOrders,
  createRimiSalesOrder,
  updateRimiSalesOrderStatus,
  updateRimiSalesOrderDetails,
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
import { useRimiAccess } from '../../lib/rimiAccess';

const ORDER_STATUSES = ['Received', 'Confirmed', 'Cold Storage Picking', 'Dispatched', 'Delivered', 'Cancelled'] as const;

export const RimiSalesOrders: React.FC = () => {
  const { profile } = useAuth();
  // Admin and Warehouse users can both manage (create, edit, delete) sales orders.
  const { canManage: isAdmin } = useRimiAccess();

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
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const isSubmittingRef = useRef(false);
  const [selectedOrder, setSelectedOrder] = useState<RimiSalesOrderRecord | null>(null);
  const [editingOrder, setEditingOrder] = useState<RimiSalesOrderRecord | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer');
  const [toast, setToast] = useState('');

  // Order Items Creation Form
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState(new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const activeCustomers = useMemo(() => customers.filter(c => c.pipeline_stage === 'Active Account' && c.status === 'Active'), [customers]);

  const [orderItems, setOrderItems] = useState<Array<{
    product_id: string;
    product_name: string;
    batch_id: string;
    batch_no?: string;
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
        getRimiCustomers(), // All warehouse staff need full visibility over enterprise accounts for logistics
        getRimiProducts(),
        getRimiBatches()
      ]);
      setOrders(orderList);
      setCustomers(custList);
      setProducts(prodList);
      setBatches(batchList);

    } finally {
      setLoading(false);
    }
  }, [isAdmin, profile?.email]);

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

  const blankItem = () => ({ product_id: '', product_name: '', batch_id: '', batch_no: '', quantity: 0, unit_price: 0 });

  const handleAddItemRow = () => {
    setOrderItems([...orderItems, blankItem()]);
  };

  const handleRemoveItemRow = (index: number) => {
    setOrderItems(orderItems.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...orderItems];
    if (field === 'product_id') {
      const p = products.find(prod => prod.id === val);
      updated[index].product_id = val;
      updated[index].product_name = p?.name || '';
      updated[index].unit_price = p ? Number(p.unit_price) : 0;
      // New product: let the system pick the earliest-expiring batch unless the user chooses one.
      updated[index].batch_id = '';
      (updated[index] as any).batch_no = '';
    } else if (field === 'batch_id') {
      const b = batches.find(bt => bt.id === val);
      updated[index].batch_id = val;
      if (b) {
        (updated[index] as any).batch_no = b.batch_no;
      }
    } else {
      (updated[index] as any)[field] = val;
    }
    setOrderItems(updated);
  };

  const calculatedTotal = orderItems.reduce((acc, it) => acc + (Number(it.quantity) * Number(it.unit_price)), 0);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || isSubmittingOrder) return;
    if (!selectedCustomer) {
      showToast('Choose a customer for the order.');
      return;
    }
    const lines = orderItems.filter(it => it.product_id);
    if (lines.length === 0) {
      showToast('Add at least one product to the order.');
      return;
    }
    if (lines.some(it => !(Number(it.quantity) > 0))) {
      showToast('Enter a quantity greater than zero for every product.');
      return;
    }

    const cust = customers.find(c => c.id === selectedCustomer);
    if (cust && cust.pipeline_stage !== 'Active Account') {
      showToast('Restricted: Sales orders can only be created for customers in the "Active Account" stage.');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmittingOrder(true);
    try {
      await createRimiSalesOrder({
        customer_id: selectedCustomer,
        customer_name: cust?.business_name,
        customer_type: cust?.customer_type,
        delivery_date: deliveryDate,
        delivery_address: deliveryAddress,
        territory: cust?.territory,
        assigned_staff_name: profile?.full_name || cust?.assigned_staff_name || 'Sales Officer',
        notes: orderNotes,
        items: lines
      });

      setShowAddModal(false);
      showToast('Created Sales Order and scheduled Reefer delivery');
      await loadData();
    } catch (err: any) {
      showToast(`Error creating order: ${err.message || 'Database error'}`);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmittingOrder(false);
    }
  };

  const handleOpenCreateModal = () => {
    // A new order always starts empty; nothing from earlier orders is carried over.
    setOrderItems([blankItem()]);
    setSelectedCustomer(activeCustomers[0]?.id || '');
    setDeliveryDate(new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]);
    setDeliveryAddress(activeCustomers[0]?.address || activeCustomers[0]?.city || '');
    setOrderNotes('');
    setShowAddModal(true);
  };

  const handleCancelOrderFromPaymentModal = async (orderId: string) => {
    try {
      await handleUpdateStatus(orderId, 'Cancelled', selectedOrder?.order_no);
      setShowPaymentModal(false);
      showToast('Order cancelled and all payment collections revoked.');
      await loadData();
    } catch (err: any) {
      showToast(`Error cancelling order: ${err.message || 'Database error'}`);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: RimiSalesOrderRecord['order_status'], orderNoHint?: string) => {
    try {
      // Optimistically update order status in state so UI reflects it immediately
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, order_status: status } : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, order_status: status } : null);
      }
      await updateRimiSalesOrderStatus(orderId, status, orderNoHint || selectedOrder?.order_no);
      showToast(`Order status updated to "${status}"`);
      await loadData();
    } catch (err: any) {
      showToast(`Error updating order status: ${err.message || 'Database error'}`);
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
      showToast('Restricted: Authorized role required to delete sales orders.');
      return;
    }
    const target = orders.find(o => o.id === orderId);
    const hasPayments = Number(target?.paid_amount || 0) > 0;
    const warning = hasPayments
      ? `Delete order ${orderNo}? It has ₹${Number(target?.paid_amount).toLocaleString('en-IN')} of recorded payments, which will also be deleted. Stock reserved for it returns to inventory. This cannot be undone.`
      : `Delete order ${orderNo}? Stock reserved for it returns to inventory. This cannot be undone.`;
    if (!window.confirm(warning)) return;

    try {
      await deleteRimiSalesOrder(orderId, hasPayments);
      showToast(`Removed order ${orderNo}`);
      await loadData();
    } catch (err: any) {
      showToast(`Error deleting order: ${err.message || 'Database error'}`);
    }
  };

  const handleSaveOrderEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    try {
      await updateRimiSalesOrderDetails(editingOrder.id, {
        delivery_date: editingOrder.delivery_date,
        delivery_address: editingOrder.delivery_address,
        order_status: editingOrder.order_status,
        notes: editingOrder.notes
      });
      setEditingOrder(null);
      showToast(`Updated order ${editingOrder.order_no} successfully.`);
      await loadData();
    } catch (err: any) {
      showToast(`Error updating order: ${err.message || 'Database error'}`);
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
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#58051E]" /> Sales orders
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Orders from customer to batch, delivery and payment.</p>
        </div>

        <Button
          size="sm"
          onClick={handleOpenCreateModal}
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

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => setEditingOrder({ ...ord })}
                    className="text-[11px] text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3 text-slate-400" /> Edit Order
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(ord.id, ord.order_no)}
                      className="text-[11px] text-slate-400 hover:text-rose-600 font-bold p-1 cursor-pointer"
                    >
                      Delete Order
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Sales Order Details Modal */}
      <AnimatePresence>
        {editingOrder && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={() => setEditingOrder(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900">Edit Sales Order</h3>
                  <p className="text-[10px] font-bold text-[#58051E]">{editingOrder.order_no} • {editingOrder.customer_name}</p>
                </div>
                <button onClick={() => setEditingOrder(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSaveOrderEdit} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Target Delivery Date</label>
                    <input
                      type="date"
                      value={editingOrder.delivery_date || ''}
                      onChange={(e) => setEditingOrder({ ...editingOrder, delivery_date: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Order Pipeline Status</label>
                    <select
                      value={editingOrder.order_status}
                      onChange={(e) => setEditingOrder({ ...editingOrder, order_status: e.target.value as any })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                    >
                      {ORDER_STATUSES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Delivery Destination Address</label>
                  <input
                    type="text"
                    value={editingOrder.delivery_address || ''}
                    onChange={(e) => setEditingOrder({ ...editingOrder, delivery_address: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-600">
                  Payment status: <span className="font-black text-slate-900">{editingOrder.payment_status}</span> · Paid ₹{Number(editingOrder.paid_amount || 0).toLocaleString('en-IN')} of ₹{Number(editingOrder.total_amount || 0).toLocaleString('en-IN')}.
                  It updates automatically when payments are recorded in Payment Collections.
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Order Notes / Instructions</label>
                  <textarea
                    rows={2}
                    value={editingOrder.notes || ''}
                    onChange={(e) => setEditingOrder({ ...editingOrder, notes: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setEditingOrder(null)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">Save Order Updates</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
                        const match = activeCustomers.find(c => c.id === e.target.value);
                        if (match) setDeliveryAddress(match.address || match.city || '');
                      }}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                    >
                      {activeCustomers.length === 0 ? (
                        <option value="" disabled>No Active Customers Available (All Leads / Suspended)</option>
                      ) : (
                        activeCustomers.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.business_name} – {c.customer_type} – {c.city || c.territory || 'Central Hub'}
                          </option>
                        ))
                      )}
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
                            <option value="">Select product…</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                [{p.sku || 'SKU'}] {p.name} • {p.category || 'Frozen'} • ₹{p.unit_price} / {p.unit || 'KG'}
                              </option>
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
                            <label className="block text-[9px] font-bold text-slate-400 uppercase">Quantity ({products.find(p => p.id === item.product_id)?.unit || 'KG'}){item.product_id ? ` · ${Number(products.find(p => p.id === item.product_id)?.available_stock || 0)} available` : ''}</label>
                            <input
                              type="number"
                              min={0}
                              value={item.quantity || ''}
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs font-bold"
                    disabled={isSubmittingOrder}
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmittingOrder || !selectedCustomer || orderItems.length === 0}
                    style={{ pointerEvents: isSubmittingOrder ? "none" : "auto" }}
                    className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingOrder ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Confirming & Dispatching...
                      </span>
                    ) : (
                      'Confirm Order & Dispatch Truck'
                    )}
                  </Button>
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

                <div className="pt-3 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowPaymentModal(false)}>
                      Close
                    </Button>
                    <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                      Save & Post to Ledger
                    </Button>
                  </div>
                  {selectedOrder.order_status !== 'Cancelled' && (
                    <button
                      type="button"
                      onClick={() => handleCancelOrderFromPaymentModal(selectedOrder.id)}
                      className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Cancel Sales Order & Revoke Collections
                    </button>
                  )}
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
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">{selectedOrder.order_no}</h3>
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                      selectedOrder.order_status === 'Delivered'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : selectedOrder.order_status === 'Dispatched'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : selectedOrder.order_status === 'Cancelled'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {selectedOrder.order_status}
                    </span>
                  </div>
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
                  Close Order Details
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
