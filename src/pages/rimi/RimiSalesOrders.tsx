import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Search, Download, Eye, Plus, X, CheckCircle2, Truck } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const RimiSalesOrders: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState('');

  const [orders, setOrders] = useState([
    {
      id: 'SO-2026-901',
      buyer: 'Reliance Fresh Cold Hub',
      items: '240 Packs Frozen Chicken Nuggets, 120 Packs Fish Fillets',
      amount: '₹1,45,000',
      date: 'Aug 06, 2026',
      status: 'Dispatched',
      statusBadge: 'bg-[#6A1B2E]/10 text-[#6A1B2E] border-[#6A1B2E]/20',
      truck: 'Reefer Truck #MH-12-AZ-8901'
    },
    {
      id: 'SO-2026-902',
      buyer: 'Taj Hotels Procurement',
      items: '50 Box Gourmet Vanilla Ice Cream, 80 Box Butter Patties',
      amount: '₹2,10,000',
      date: 'Aug 05, 2026',
      status: 'Delivered & Paid',
      statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      truck: 'Reefer Truck #KA-01-F-4412'
    },
    {
      id: 'SO-2026-903',
      buyer: 'Dominos Pizza Network',
      items: '300 Box Frozen Mozzarella Blocks',
      amount: '₹3,85,000',
      date: 'Aug 06, 2026',
      status: 'In Packing',
      statusBadge: 'bg-amber-50 text-amber-700 border-amber-200',
      truck: 'Reefer Truck #DL-03-CB-9920'
    }
  ]);

  const [newOrder, setNewOrder] = useState({
    buyer: 'Reliance Fresh Cold Hub',
    items: '100 Packs Frozen Vegetable Mix',
    amount: '₹85,000'
  });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.buyer) return;
    const created = {
      id: `SO-2026-${Math.floor(904 + Math.random() * 90)}`,
      buyer: newOrder.buyer,
      items: newOrder.items,
      amount: newOrder.amount,
      date: 'Just now',
      status: 'Dispatched',
      statusBadge: 'bg-[#6A1B2E]/10 text-[#6A1B2E] border-[#6A1B2E]/20',
      truck: 'Reefer Express Unit #MH-14'
    };
    setOrders([created, ...orders]);
    setShowCreateModal(false);
    showToastMsg(`Dispatched sales order ${created.id}`);
  };

  const filteredOrders = orders.filter(o =>
    o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.buyer.toLowerCase().includes(searchQuery.toLowerCase())
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
            <ShoppingCart className="w-5 h-5 text-[#6A1B2E]" /> FMCG Sales Orders & Reefer Dispatch
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Rimi Cold Chain Console • B2B order dispatch, line items breakdown, and delivery invoices in ₹.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Create Sales Order
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search Order # or Buyer..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredOrders.length} Orders Active</span>
      </Card>

      <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                <th className="py-3 px-4">Order ID & Buyer</th>
                <th className="py-3 px-4">Items Summary</th>
                <th className="py-3 px-4">Order Value (₹)</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Fulfillment Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-extrabold text-slate-900">
                    <div>{o.buyer}</div>
                    <span className="text-[10px] font-bold text-[#6A1B2E]">{o.id}</span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{o.items}</td>
                  <td className="py-3.5 px-4 font-black text-slate-900">{o.amount}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{o.date}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${o.statusBadge}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setSelectedOrder(o)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => showToastMsg(`Downloading Order Invoice ${o.id}...`)} className="p-1.5 rounded-lg text-slate-400 hover:text-[#6A1B2E] hover:bg-slate-100">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Order Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowCreateModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Create Frozen Sales Order</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleCreateOrder} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Buyer Customer</label>
                  <input type="text" required value={newOrder.buyer} onChange={(e) => setNewOrder({ ...newOrder, buyer: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">SKU Items Breakdown</label>
                  <input type="text" required value={newOrder.items} onChange={(e) => setNewOrder({ ...newOrder, items: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Order Value (₹ INR)</label>
                  <input type="text" required value={newOrder.amount} onChange={(e) => setNewOrder({ ...newOrder, amount: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
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

      {/* Order Drawer */}
      <AnimatePresence>
        {selectedOrder && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedOrder(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">Sales Order Document Inspector</h3>
                <button onClick={() => setSelectedOrder(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-left">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{selectedOrder.id}</span>
                  <h4 className="text-base font-black text-slate-900">{selectedOrder.buyer}</h4>
                  <p className="text-xs font-semibold text-slate-500">{selectedOrder.items}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Total Order Billing</span>
                  <div className="text-2xl font-black text-slate-900">{selectedOrder.amount}</div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-extrabold text-emerald-800 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-emerald-600 shrink-0" />
                  Assigned Reefer Truck: {selectedOrder.truck}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
