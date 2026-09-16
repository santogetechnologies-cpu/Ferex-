import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PackageCheck, Search, Plus, Filter, CheckCircle2,
  Clock, ArrowRight, Eye, Trash2, X, Send,
  Ship, ShieldCheck, DollarSign, Calendar, MapPin,
  Building2, UserCheck, AlertCircle, RefreshCw
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getTradeOrders,
  createTradeOrder,
  advanceTradeOrderStage,
  deleteTradeOrder,
  getTradeStaffOfficers,
  TRADE_ORDER_STAGES,
  TRADE_INCOTERMS,
  TRADE_CURRENCIES,
  type TradeOrder,
  type TradeOrderStage,
} from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export const TradeShipments: React.FC = () => {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<TradeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState<string>('All');
  const [selectedOrder, setSelectedOrder] = useState<TradeOrder | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState('');
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const staffList = getTradeStaffOfficers();
  const userName = profile?.full_name || 'Trade Officer';

  const initialForm = {
    order_no: `TRD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    po_number: `PO-${Math.floor(100 + Math.random() * 900)}`,
    client_name: '',
    client_email: '',
    client_phone: '',
    client_country: 'Poland',
    commodity: '',
    quantity_units: '1,000 MT',
    incoterm: 'CIF (Cost, Insurance and Freight)',
    currency: 'USD',
    total_amount: 500000,
    advance_percentage: 30,
    payment_terms_desc: '30% Advance Wire, 70% Balance against Shipping B/L copy',
    lc_reference: '',
    stage: 'Inquiry' as TradeOrderStage,
    assigned_staff_name: staffList[0].name,
    assigned_staff_email: staffList[0].email,
    carrier: 'MSC (Mediterranean Shipping Company)',
    vessel_flight: 'MSC Gülsün',
    voyage_no: 'VY-2026-088',
    tracking_number: 'MSCU9839438PL',
    origin_port: 'Port of Gdansk, Poland',
    destination_port: 'Port of Nhava Sheva (JNPT), India',
    etd: new Date().toISOString().split('T')[0],
    eta: new Date(Date.now() + 24 * 86400000).toISOString().split('T')[0],
    notes: '',
  };

  const [formData, setFormData] = useState(initialForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTradeOrders();
      setOrders(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('trade_orders_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_orders' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_trade_orders_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_orders_change', handleLocalChange);
    };
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_name || !formData.commodity || !formData.total_amount) {
      showToastMsg('Please fill in required order details.');
      return;
    }

    try {
      const created = await createTradeOrder(formData);
      setShowCreateModal(false);
      setFormData({
        ...initialForm,
        order_no: `TRD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        po_number: `PO-${Math.floor(100 + Math.random() * 900)}`,
      });
      showToastMsg(`Order ${created.order_no} created & client email triggered!`);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Failed to create order: ${err.message || 'Error'}`);
    }
  };

  const handle1ClickAdvance = async (order: TradeOrder, nextStage: TradeOrderStage) => {
    setAdvancingId(order.id);
    try {
      const updated = await advanceTradeOrderStage(order.id, nextStage, userName);
      if (updated) {
        showToastMsg(`Stage advanced to "${nextStage}"! Automated client email sent.`);
        await loadData();
        if (selectedOrder?.id === order.id) {
          setSelectedOrder(updated);
        }
      }
    } finally {
      setAdvancingId(null);
    }
  };

  const handleDelete = async (id: string, orderNo: string) => {
    if (!window.confirm(`Are you sure you want to remove order ${orderNo}?`)) return;
    await deleteTradeOrder(id);
    showToastMsg(`Order ${orderNo} deleted.`);
    if (selectedOrder?.id === id) setSelectedOrder(null);
    await loadData();
  };

  const getNextStage = (current: TradeOrderStage): TradeOrderStage | null => {
    const idx = TRADE_ORDER_STAGES.indexOf(current);
    if (idx !== -1 && idx < TRADE_ORDER_STAGES.length - 1) {
      return TRADE_ORDER_STAGES[idx + 1];
    }
    return null;
  };

  const getStageColor = (stage: TradeOrderStage) => {
    switch (stage) {
      case 'Inquiry': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Quote Sent': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Order Confirmed': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Production/Sourcing': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Shipped': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Customs Clearance': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Delivered': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch =
      o.order_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.commodity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.tracking_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.carrier || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = filterStage === 'All' || o.stage === filterStage;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 text-xs font-bold"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-[#58051E]" />
            Order & Shipment Lifecycle Tracker
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Full 7-stage order lifecycle with 1-click stage confirmation and automated client email triggers.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreateModal(true)}
          className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Log New Order
        </Button>
      </div>

      {/* 7-Stage Visual Lifecycle Stepper Bar */}
      <Card className="p-4 border border-slate-200/80 bg-gradient-to-r from-slate-900 via-[#3b0413] to-slate-900 text-white shadow-md overflow-x-auto">
        <div className="text-[10px] font-black uppercase tracking-widest text-[#f3cbd4] mb-3 flex items-center justify-between">
          <span>7-Stage Global Trade Workflow</span>
          <span className="text-emerald-400 font-bold">1-Click Automated Client Email Sync</span>
        </div>
        <div className="flex items-center gap-2 min-w-[760px]">
          {TRADE_ORDER_STAGES.map((st, i) => {
            const count = orders.filter(o => o.stage === st).length;
            return (
              <React.Fragment key={st}>
                <div
                  onClick={() => setFilterStage(filterStage === st ? 'All' : st)}
                  className={`flex-1 p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                    filterStage === st
                      ? 'bg-white text-slate-900 border-white shadow-lg scale-105'
                      : 'bg-white/10 border-white/15 hover:bg-white/20 text-white'
                  }`}
                >
                  <div className="text-[10px] font-black uppercase tracking-wide truncate">{st}</div>
                  <div className={`text-xs font-extrabold mt-0.5 ${filterStage === st ? 'text-[#58051E]' : 'text-emerald-300'}`}>
                    {count} {count === 1 ? 'Order' : 'Orders'}
                  </div>
                </div>
                {i < TRADE_ORDER_STAGES.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-white/40 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </Card>

      {/* Filter and Search Bar */}
      <Card className="p-3 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order #, Client, Commodity, Vessel, Carrier..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-[11px] font-bold text-slate-500 shrink-0">Stage:</span>
          {['All', ...TRADE_ORDER_STAGES].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStage(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                filterStage === st
                  ? 'bg-[#58051E] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </Card>

      {/* Orders Table */}
      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#58051E]" /> Loading trade orders...
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <PackageCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No trade orders matching criteria</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Create an order to track inquiry, quotes, production, vessel boarding, and customs clearance.
          </p>
          <Button size="sm" onClick={() => setShowCreateModal(true)} className="mt-4 bg-[#58051E] text-white">
            <Plus className="w-4 h-4 mr-1" /> Create First Order
          </Button>
        </Card>
      ) : (
        <Card className="border border-slate-200/80 shadow-xs overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4">Order / PO #</th>
                  <th className="py-3 px-4">Client & Commodity</th>
                  <th className="py-3 px-4">Current Stage</th>
                  <th className="py-3 px-4">Financials & Advance</th>
                  <th className="py-3 px-4">Logistics / Vessel</th>
                  <th className="py-3 px-4">Officer</th>
                  <th className="py-3 px-4 text-right">Stage Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredOrders.map((order) => {
                  const nextStage = getNextStage(order.stage);
                  const isAdvancing = advancingId === order.id;

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Order / PO */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-black text-slate-900">{order.order_no}</div>
                        <div className="text-[10px] text-slate-400">{order.po_number}</div>
                      </td>

                      {/* Client & Commodity */}
                      <td className="py-3 px-4 max-w-[220px]">
                        <div className="font-extrabold text-slate-900 truncate">{order.client_name}</div>
                        <div className="text-[11px] text-slate-500 truncate" title={order.commodity}>
                          {order.commodity} ({order.quantity_units})
                        </div>
                      </td>

                      {/* Stage Pill */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${getStageColor(order.stage)}`}>
                          <Clock className="w-3 h-3" />
                          {order.stage}
                        </span>
                      </td>

                      {/* Financials & Advance */}
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900">
                          {order.currency} {Number(order.total_amount).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Adv: {order.advance_percentage}% ({order.advance_status === 'Paid' ? '✅ Paid' : '⏳ Pending'})
                        </div>
                      </td>

                      {/* Logistics / Vessel */}
                      <td className="py-3 px-4 max-w-[180px]">
                        {order.carrier ? (
                          <>
                            <div className="font-bold text-slate-800 truncate flex items-center gap-1">
                              <Ship className="w-3 h-3 text-slate-400 shrink-0" />
                              {order.carrier}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {order.vessel_flight || 'Vessel TBA'} • {order.tracking_number || 'Track Live'}
                            </div>
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Logistics pending</span>
                        )}
                      </td>

                      {/* Officer */}
                      <td className="py-3 px-4">
                        <span className="text-xs font-bold text-slate-700">{order.assigned_staff_name}</span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {nextStage && (
                            <button
                              disabled={isAdvancing}
                              onClick={() => handle1ClickAdvance(order, nextStage)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10.5px] font-black flex items-center gap-1 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                              title={`Advance to ${nextStage} & send automated email to ${order.client_email}`}
                            >
                              <Send className="w-3 h-3" />
                              Confirm {nextStage}
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                            title="View Complete Order Dossier"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(order.id, order.order_no)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Delete Order"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── CREATE ORDER MODAL ── */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50" onClick={() => setShowCreateModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto text-left">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-[#58051E]" /> Register New Trade Order
                  </h2>
                  <p className="text-xs text-slate-500 font-semibold">
                    Configures financial split, incoterms, assigned officer, and live tracking.
                  </p>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Order Reference # *</label>
                    <input
                      type="text"
                      required
                      value={formData.order_no}
                      onChange={(e) => setFormData({ ...formData, order_no: e.target.value })}
                      placeholder="TRD-2026-8801"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Client PO Reference #</label>
                    <input
                      type="text"
                      value={formData.po_number}
                      onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                      placeholder="PO-BALTIC-771"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Client / Buyer Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.client_name}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      placeholder="e.g. Baltic Grain Sp. z o.o."
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Client Login Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.client_email}
                      onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                      placeholder="e.g. trade@balticgrain.pl"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Commodity / Goods Description *</label>
                    <input
                      type="text"
                      required
                      value={formData.commodity}
                      onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
                      placeholder="e.g. Milling Wheat Grade A (Non-GMO)"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Quantity & Units</label>
                    <input
                      type="text"
                      value={formData.quantity_units}
                      onChange={(e) => setFormData({ ...formData, quantity_units: e.target.value })}
                      placeholder="e.g. 5,000 Metric Tons"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Total Order Value *</label>
                    <input
                      type="number"
                      required
                      value={formData.total_amount}
                      onChange={(e) => setFormData({ ...formData, total_amount: Number(e.target.value) })}
                      placeholder="1450000"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Currency</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      {TRADE_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Advance Required (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.advance_percentage}
                      onChange={(e) => setFormData({ ...formData, advance_percentage: Number(e.target.value) })}
                      placeholder="30"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Incoterms</label>
                    <input
                      type="text"
                      list="incoterm-options"
                      value={formData.incoterm}
                      onChange={(e) => setFormData({ ...formData, incoterm: e.target.value })}
                      placeholder="Select or enter Incoterms..."
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                    <datalist id="incoterm-options">
                      {TRADE_INCOTERMS.map(i => <option key={i} value={i}>{i}</option>)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Letter of Credit (LC) Ref (Optional)</label>
                    <input
                      type="text"
                      value={formData.lc_reference}
                      onChange={(e) => setFormData({ ...formData, lc_reference: e.target.value })}
                      placeholder="e.g. LC-BNP-PARIS-9021"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="text-[10px] font-black uppercase text-slate-500">Logistics & Ocean Carrier Details (Editable Free-Type)</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9.5px] font-bold text-slate-400 mb-0.5">Ocean / Air Carrier</label>
                      <input
                        type="text"
                        value={formData.carrier}
                        onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                        placeholder="e.g. MSC, Maersk, Hapag-Lloyd"
                        className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-bold text-slate-400 mb-0.5">Vessel Name</label>
                      <input
                        type="text"
                        value={formData.vessel_flight}
                        onChange={(e) => setFormData({ ...formData, vessel_flight: e.target.value })}
                        placeholder="e.g. MSC Gülsün"
                        className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-bold text-slate-400 mb-0.5">Voyage / Flight #</label>
                      <input
                        type="text"
                        value={formData.voyage_no}
                        onChange={(e) => setFormData({ ...formData, voyage_no: e.target.value })}
                        placeholder="VY-2026-088"
                        className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9.5px] font-bold text-slate-400 mb-0.5">Port of Loading (POL)</label>
                      <input
                        type="text"
                        value={formData.origin_port}
                        onChange={(e) => setFormData({ ...formData, origin_port: e.target.value })}
                        placeholder="e.g. Port of Gdansk, Poland"
                        className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-bold text-slate-400 mb-0.5">Port of Discharge (POD)</label>
                      <input
                        type="text"
                        value={formData.destination_port}
                        onChange={(e) => setFormData({ ...formData, destination_port: e.target.value })}
                        placeholder="e.g. Port of Nhava Sheva (JNPT), India"
                        className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Assigned Staff Officer</label>
                    <select
                      value={formData.assigned_staff_name}
                      onChange={(e) => {
                        const st = staffList.find(s => s.name === e.target.value);
                        setFormData({
                          ...formData,
                          assigned_staff_name: e.target.value,
                          assigned_staff_email: st?.email || ''
                        });
                      }}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      {staffList.map(s => <option key={s.email} value={s.name}>{s.name} ({s.role})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Initial Starting Stage</label>
                    <select
                      value={formData.stage}
                      onChange={(e) => setFormData({ ...formData, stage: e.target.value as TradeOrderStage })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      {TRADE_ORDER_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] text-white">Create Order & Notify Client</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── ORDER DETAIL DOSSIER MODAL ── */}
      <AnimatePresence>
        {selectedOrder && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50" onClick={() => setSelectedOrder(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto text-left">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border ${getStageColor(selectedOrder.stage)}`}>
                    {selectedOrder.stage}
                  </span>
                  <h2 className="text-lg font-black text-slate-900 mt-1">{selectedOrder.order_no} Dossier</h2>
                  <p className="text-xs text-slate-500 font-semibold">{selectedOrder.client_name} • {selectedOrder.po_number}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <div className="py-4 space-y-4 text-xs font-semibold">
                {/* Financial Summary */}
                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Total Value</span>
                    <span className="text-sm font-black text-slate-900">{selectedOrder.currency} {Number(selectedOrder.total_amount).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Advance ({selectedOrder.advance_percentage}%)</span>
                    <span className={`text-xs font-bold ${selectedOrder.advance_status === 'Paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {selectedOrder.currency} {Number(selectedOrder.advance_amount).toLocaleString()} ({selectedOrder.advance_status})
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Balance Due</span>
                    <span className={`text-xs font-bold ${selectedOrder.balance_status === 'Paid' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {selectedOrder.currency} {Number(selectedOrder.balance_amount - (selectedOrder.balance_paid || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Logistics */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">Port of Loading</span>
                      <span className="text-xs font-bold text-slate-800">{selectedOrder.origin_port || 'POL'}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 block">Port of Discharge</span>
                      <span className="text-xs font-bold text-slate-800">{selectedOrder.destination_port || 'POD'}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600 flex justify-between">
                    <span>Carrier: <strong>{selectedOrder.carrier || 'N/A'}</strong> ({selectedOrder.vessel_flight})</span>
                    <span>Tracking: <strong className="font-mono">{selectedOrder.tracking_number || 'Live'}</strong></span>
                  </div>
                </div>

                {/* Stage History Timeline */}
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">Stage Progression Timeline</h4>
                  <div className="space-y-2">
                    {selectedOrder.stage_history?.map((h, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100 text-[11px]">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900">{h.stage}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{h.timestamp}</span>
                          </div>
                          <p className="text-[10.5px] text-slate-500">Confirmed by: {h.confirmed_by} {h.notes ? `• ${h.notes}` : ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setSelectedOrder(null)}>Close Dossier</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TradeShipments;
