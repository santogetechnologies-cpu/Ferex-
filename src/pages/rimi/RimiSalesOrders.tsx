import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Search, Plus, Eye, Trash2, X, CheckCircle2,
  Download, Filter, ArrowRight, Truck, Clock, Calendar,
  Building2, Store, Boxes, UserCheck, DollarSign, Package
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getRimiSalesOrders,
  createRimiSalesOrder,
  updateRimiSalesOrderStatus,
  deleteRimiSalesOrder,
  exportRimiSalesToCSV,
  getRimiCustomers,
  getRimiStaffList,
  type RimiSalesOrder,
  type RimiOrderStatus,
  type RimiCustomerType
} from '../../lib/api/rimi';
import { useAuth } from '../../contexts/AuthContext';
import { useRimiPermissions } from '../../hooks/usePermissions';

const ORDER_LIFECYCLE_STAGES: RimiOrderStatus[] = [
  'Order Received',
  'Confirmed',
  'In Production/Packing',
  'Dispatched',
  'Delivered'
];

export const RimiSalesOrders: React.FC = () => {
  const { profile } = useAuth();
  const { isAdmin, isStaff, isCentral, canViewAllCRM, canDelete } = useRimiPermissions();
  const currentUserName = profile?.full_name || profile?.email?.split('@')[0] || 'Rimi Operations Desk';

  const [orders, setOrders] = useState<RimiSalesOrder[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<RimiSalesOrder | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  // Pagination state (25 / 50 / 100)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerType, setSelectedCustomerType] = useState('All');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('All');
  const [selectedOrderStatus, setSelectedOrderStatus] = useState('All');
  const [selectedStaff, setSelectedStaff] = useState('All');
  const [customersList, setCustomersList] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersData, custData, realStaff] = await Promise.all([
        getRimiSalesOrders(),
        getRimiCustomers(),
        getRimiStaffList()
      ]);
      setOrders(ordersData || []);
      setCustomersList(custData || []);
      setStaffList(realStaff || []);
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

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Filter logic with strict staff data isolation
  const filteredOrders = orders.filter(o => {
    if (!canViewAllCRM) {
      const myId = profile?.id;
      const myName = (profile?.full_name || '').toLowerCase();
      const myEmail = (profile?.email || '').toLowerCase();
      const assignedId = o.assigned_staff_id;
      const assignedName = (o.assigned_staff_name || '').toLowerCase();
      const isMine = Boolean(
        (myId && assignedId === myId) ||
        (myName && assignedName.includes(myName)) ||
        (myEmail && (assignedName.includes(myEmail.split('@')[0]) || assignedId === myEmail))
      );
      if (!isMine) return false;
    }
    if (selectedCustomerType !== 'All' && o.customer_type !== selectedCustomerType) return false;
    if (selectedRegion !== 'All' && !o.region.toLowerCase().includes(selectedRegion.toLowerCase())) return false;
    if (selectedPaymentStatus !== 'All' && o.payment_status !== selectedPaymentStatus) return false;
    if (selectedOrderStatus !== 'All' && o.order_status !== selectedOrderStatus) return false;
    if (selectedStaff !== 'All' && o.assigned_staff_name !== selectedStaff && o.assigned_staff_id !== selectedStaff) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNo = o.order_no.toLowerCase().includes(q);
      const matchCust = o.customer_name.toLowerCase().includes(q);
      const matchProd = o.products_summary.toLowerCase().includes(q);
      const matchStaff = (o.assigned_staff_name || '').toLowerCase().includes(q);
      if (!matchNo && !matchCust && !matchProd && !matchStaff) return false;
    }
    return true;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCustomerType, selectedRegion, selectedPaymentStatus, selectedOrderStatus, selectedStaff, searchQuery]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // KPI Calculations
  const totalOrdersCount = orders.length;
  const totalSalesRevenue = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const activeOrdersCount = orders.filter(o => o.order_status !== 'Delivered').length;
  const totalVolumeKg = orders.reduce((sum, o) => sum + (Number(o.quantity_kg) || 0), 0);

  // New Order Form state
  const [newOrder, setNewOrder] = useState({
    customer_name: '',
    customer_type: 'Distributor' as RimiCustomerType,
    region: 'Western Zone (Maharashtra)',
    products_summary: 'Green Peas 1kg (5,000 Bags)',
    quantity_kg: 5000,
    total_amount: 550000,
    delivery_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    payment_status: 'Paid' as const,
    order_status: 'Order Received' as RimiOrderStatus,
    assigned_staff_name: 'Rimi Operations Desk',
    assigned_reefer_truck: 'Reefer Truck #MH-12-AZ-8901',
    notes: 'Standard pre-cooling compliance verified.'
  });

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.customer_name) return;

    const matchedCust = customersList.find(c => c.business_name === newOrder.customer_name);
    const assignedName = newOrder.assigned_staff_name || staffList[0]?.name || currentUserName;
    const matchedStaff = staffList.find(s => s.name === assignedName);

    const created = await createRimiSalesOrder({
      ...newOrder,
      customer_id: matchedCust?.id,
      customer_type: matchedCust?.customer_type || newOrder.customer_type,
      region: matchedCust?.region || newOrder.region,
      assigned_staff_name: assignedName,
      assigned_staff_id: matchedStaff?.id || 'staff-1',
    });

    setShowCreateModal(false);
    showToastMsg(`Order #${created.order_no} created successfully!`);
    loadData();
  };

  const handleAdvanceOrderStatus = async (orderId: string, currentStatus: RimiOrderStatus) => {
    const currentIndex = ORDER_LIFECYCLE_STAGES.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % ORDER_LIFECYCLE_STAGES.length;
    const nextStatus = ORDER_LIFECYCLE_STAGES[nextIndex];

    await updateRimiSalesOrderStatus(orderId, nextStatus);
    showToastMsg(`Order status updated to "${nextStatus}"`);
    loadData();
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, order_status: nextStatus });
    }
  };

  const handleDelete = async (id: string, orderNo: string) => {
    if (!window.confirm(`Are you sure you want to delete order ${orderNo}?`)) return;
    await deleteRimiSalesOrder(id);
    showToastMsg(`Order ${orderNo} deleted.`);
    if (selectedOrder?.id === id) setSelectedOrder(null);
    loadData();
  };

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[#58051E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Consolidated Sales List
            </h1>
            <span className="text-[10px] uppercase font-black tracking-wider bg-[#58051E]/10 text-[#58051E] px-2.5 py-0.5 rounded-full border border-[#58051E]/20">
              Unified Cold Chain Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Complete sales logs across Distributors, Retail Stores, and Wholesalers with multi-filter queries, 5-stage dispatch tracking, and CSV export.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(isAdmin || isCentral) && (
            <Button
              variant="outline"
              className="text-xs font-bold border-slate-200 hover:bg-slate-50 flex items-center gap-2"
              onClick={() => exportRimiSalesToCSV(filteredOrders)}
            >
              <Download className="w-4 h-4 text-slate-600" /> Export CSV
            </Button>
          )}

          <Button
            variant="primary"
            className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-md flex items-center gap-2"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4" /> Create Sales Entry
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 bg-white border-slate-200">
          <span className="text-[10px] font-black uppercase text-slate-400">Total Sales Volume</span>
          <div className="text-xl font-black text-slate-900 mt-1">₹{(totalSalesRevenue / 100000).toFixed(2)} Lakhs</div>
          <span className="text-[10px] font-bold text-emerald-600">{totalOrdersCount} Total Invoices</span>
        </Card>

        <Card className="p-4 bg-white border-slate-200">
          <span className="text-[10px] font-black uppercase text-slate-400">Active Dispatches</span>
          <div className="text-xl font-black text-blue-700 mt-1">{activeOrdersCount} Active</div>
          <span className="text-[10px] font-bold text-slate-500">In Production / Transit</span>
        </Card>

        <Card className="p-4 bg-white border-slate-200">
          <span className="text-[10px] font-black uppercase text-slate-400">Delivered Volume</span>
          <div className="text-xl font-black text-emerald-700 mt-1">
            {orders.filter(o => o.order_status === 'Delivered').length} Completed
          </div>
          <span className="text-[10px] font-bold text-slate-500">Full Cold Chain Handover</span>
        </Card>

        <Card className="p-4 bg-white border-slate-200">
          <span className="text-[10px] font-black uppercase text-slate-400">Total Tonnage</span>
          <div className="text-xl font-black text-purple-700 mt-1">{(totalVolumeKg / 1000).toFixed(1)} MT</div>
          <span className="text-[10px] font-bold text-slate-500">Frozen Food Dispatched</span>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-3.5 bg-white border-slate-200 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Order #, Customer, Product, Staff..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
            />
          </div>

          <div>
            <select
              value={selectedCustomerType}
              onChange={e => setSelectedCustomerType(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
            >
              <option value="All">All Customer Types</option>
              <option value="Distributor">Distributor</option>
              <option value="Shop">Shop / Retailer</option>
              <option value="Wholesaler">Wholesaler</option>
            </select>
          </div>

          <div>
            <select
              value={selectedOrderStatus}
              onChange={e => setSelectedOrderStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
            >
              <option value="All">All 5 Order Stages</option>
              {ORDER_LIFECYCLE_STAGES.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedPaymentStatus}
              onChange={e => setSelectedPaymentStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
            >
              <option value="All">Payment Status: All</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

          <div>
            <select
              value={selectedRegion}
              onChange={e => setSelectedRegion(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
            >
              <option value="All">All Regions</option>
              <option value="Western Zone">Western Zone</option>
              <option value="Gujarat">Gujarat</option>
              <option value="Mumbai Suburban">Mumbai</option>
              <option value="Pune">Pune</option>
              <option value="Tamil Nadu">South Zone</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Orders Table */}
      <Card className="p-0 bg-white border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[9px] font-black tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Customer & Type</th>
                <th className="py-3 px-4">Products & Qty</th>
                <th className="py-3 px-4">Amount (INR)</th>
                <th className="py-3 px-4">Dates</th>
                <th className="py-3 px-4">5-Stage Order Lifecycle</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Closed By Staff</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedOrders.map(o => {
                const canAdvance = isAdmin || isCentral || Boolean(
                  profile?.id === o.assigned_staff_id ||
                  (profile?.full_name && o.assigned_staff_name?.toLowerCase().includes(profile.full_name.toLowerCase()))
                );

                return (
                  <tr
                    key={o.id}
                    onClick={() => setSelectedOrder(o)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-900 group-hover:text-[#58051E]">{o.order_no}</span>
                      <div className="text-[10px] text-slate-400">{o.region}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{o.customer_name}</div>
                      <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.2 rounded-full border ${
                        o.customer_type === 'Distributor' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        o.customer_type === 'Shop' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {o.customer_type}
                      </span>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-medium text-slate-800 line-clamp-1">{o.products_summary}</div>
                      <div className="text-[10px] font-bold text-purple-700">{o.quantity_kg} KG Dispatched</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-black text-slate-900 text-sm">
                        ₹{Number(o.total_amount).toLocaleString('en-IN')}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-[11px] font-semibold text-slate-700">Order: {o.order_date}</div>
                      <div className="text-[10px] text-slate-400">ETA: {o.delivery_date}</div>
                    </td>

                    <td className="py-3 px-4">
                      <button
                        disabled={!canAdvance}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canAdvance) {
                            handleAdvanceOrderStatus(o.id, o.order_status);
                          }
                        }}
                        className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full ${canAdvance ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'} transition-all border ${
                          o.order_status === 'Delivered'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : o.order_status === 'Dispatched'
                            ? 'bg-blue-100 text-blue-900 border-blue-300'
                            : o.order_status === 'In Production/Packing'
                            ? 'bg-purple-100 text-purple-900 border-purple-300'
                            : o.order_status === 'Confirmed'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-slate-100 text-slate-800 border-slate-300'
                        }`}
                        title={canAdvance ? 'Click to advance stage' : 'Only assigned staff or admin can advance stage'}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {o.order_status} {canAdvance && <ArrowRight className="w-2.5 h-2.5 ml-0.5" />}
                      </button>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        o.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                        o.payment_status === 'Partial' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {o.payment_status}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-700 flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-[#58051E]" />
                        {o.assigned_staff_name}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
                          title="View Full Order"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(o.id, o.order_no)}
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600"
                            title="Delete Order"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-semibold">
                    No sales order records matching active filter query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── 25 / 50 / 100 Pagination Toolbar ── */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded px-2 py-1 font-bold text-slate-700 focus:outline-hidden"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>orders per page</span>
            <span className="text-slate-300">|</span>
            <span>
              Showing {filteredOrders.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredOrders.length)} of {filteredOrders.length} orders
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-2.5 py-1 text-xs"
            >
              Previous
            </Button>
            <div className="px-3 py-1 font-bold text-slate-700 bg-white border border-slate-200 rounded text-xs">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Order Detail Modal / Drawer */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedOrder(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full max-w-xl bg-white h-full shadow-2xl z-10 flex flex-col overflow-hidden text-left">
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div>
                  <div className="text-[10px] font-black uppercase text-slate-400">{selectedOrder.order_no}</div>
                  <h2 className="text-lg font-black">{selectedOrder.customer_name}</h2>
                  <p className="text-xs text-slate-400">{selectedOrder.customer_type} Account · {selectedOrder.region}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-white/10 rounded-xl">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 5-Stage Visual Progress */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                  <span className="text-xs font-black text-slate-900">5-Stage Order Lifecycle Progression</span>
                  <div className="grid grid-cols-5 gap-1 text-center">
                    {ORDER_LIFECYCLE_STAGES.map((st, i) => {
                      const curIdx = ORDER_LIFECYCLE_STAGES.indexOf(selectedOrder.order_status);
                      const isPastOrCurrent = i <= curIdx;
                      const isCurrent = i === curIdx;

                      return (
                        <button
                          key={st}
                          onClick={() => handleAdvanceOrderStatus(selectedOrder.id, ORDER_LIFECYCLE_STAGES[i === 0 ? 4 : i - 1])}
                          className={`p-2 rounded-xl border text-[9px] font-black transition-all ${
                            isCurrent
                              ? 'bg-[#58051E] text-white border-[#58051E]'
                              : isPastOrCurrent
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold'
                              : 'bg-white text-slate-400 border-slate-200'
                          }`}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Logistics & Products Breakdown */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-500">Total Invoice Amount</span>
                    <span className="font-black text-slate-900 text-sm">₹{Number(selectedOrder.total_amount).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-500">Products Manifest</span>
                    <span className="font-semibold text-slate-800 text-right max-w-xs">{selectedOrder.products_summary}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-500">Assigned Reefer Truck</span>
                    <span className="font-bold text-blue-700">{selectedOrder.assigned_reefer_truck || 'MH-12-AZ-8901'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-500">Closed By Sales Staff</span>
                    <span className="font-bold text-[#58051E]">{selectedOrder.assigned_staff_name}</span>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs">
                    <span className="font-black text-amber-900 block mb-1">Cold Chain Operational Notes:</span>
                    <p className="text-amber-800 font-medium">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Order Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreateModal(false)} className="fixed inset-0 bg-slate-900/50" />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl z-10 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-black text-sm text-slate-900">Create Sales Entry</h3>
                <button onClick={() => setShowCreateModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <form onSubmit={handleCreateOrder} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Customer Account *</label>
                  <select
                    required
                    value={newOrder.customer_name}
                    onChange={e => {
                      const cust = customersList.find(c => c.business_name === e.target.value);
                      setNewOrder({
                        ...newOrder,
                        customer_name: e.target.value,
                        customer_type: cust?.customer_type || 'Distributor',
                        region: cust?.region || 'Western Zone'
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                  >
                    <option value="">-- Choose Account --</option>
                    {customersList.map(c => (
                      <option key={c.id} value={c.business_name}>{c.business_name} ({c.customer_type})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Products & Quantities *</label>
                  <input
                    required
                    placeholder="e.g. Green Peas 1kg (1,000 Bags), Sweet Corn 500g (500 Bags)"
                    value={newOrder.products_summary}
                    onChange={e => setNewOrder({ ...newOrder, products_summary: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Quantity (KG)</label>
                    <input
                      type="number"
                      value={newOrder.quantity_kg}
                      onChange={e => setNewOrder({ ...newOrder, quantity_kg: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Total Amount (INR) *</label>
                    <input
                      type="number"
                      required
                      value={newOrder.total_amount}
                      onChange={e => setNewOrder({ ...newOrder, total_amount: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Delivery ETA</label>
                    <input
                      type="date"
                      value={newOrder.delivery_date}
                      onChange={e => setNewOrder({ ...newOrder, delivery_date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Initial Order Stage</label>
                    <select
                      value={newOrder.order_status}
                      onChange={e => setNewOrder({ ...newOrder, order_status: e.target.value as RimiOrderStatus })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                    >
                      {ORDER_LIFECYCLE_STAGES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assign Operations Staff</label>
                  <select
                    value={newOrder.assigned_staff_name}
                    onChange={e => setNewOrder({ ...newOrder, assigned_staff_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                  >
                    {staffList.map((s: any) => (
                      <option key={s.id || s.email} value={s.name}>{s.name} ({s.roleLabel || s.role})</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" className="bg-[#58051E] text-white">Save Sales Entry</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
