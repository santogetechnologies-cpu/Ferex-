import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Search, CheckCircle2, Printer, Plus, Trash2, X } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getRimiDeliveries, createRimiDelivery, updateRimiDeliveryStatus, deleteRimiDelivery, getRimiSalesOrders } from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';

export const RimiDeliveries: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newDel, setNewDel] = useState({
    order_id: '',
    vehicle_no: 'MH-12-AZ-8901 (Reefer)',
    driver_name: 'Sanjay Kumar',
    driver_phone: '+91 98765 43210',
    departure_temp: '-18.5°C'
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [delData, orderData] = await Promise.all([
        getRimiDeliveries(),
        getRimiSalesOrders()
      ]);
      setOrders(orderData || []);

      if (Array.isArray(delData)) {
        const mapped = delData.map(d => ({
          id: d.delivery_number || (d.id ? `DEL-${d.id.slice(0, 4).toUpperCase()}` : 'DEL-2026-01'),
          rawId: d.id,
          orderNo: d.order?.order_no || 'SO-2026-101',
          customer: d.order?.distributor?.business_name || d.customer_name || 'HyperCity Hub',
          vehicle: d.vehicle_no || d.vehicle_number || 'Reefer Truck #MH-12-AZ-8901',
          driver: d.driver_name || 'Sanjay Kumar',
          driverPhone: d.driver_phone || '+91 98765 43210',
          temp: d.departure_temp || '-18.5°C',
          status: d.delivery_status || d.status || 'Assigned'
        }));
        setDeliveries(mapped);
      } else {
        setDeliveries([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_rimi_deliveries')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_deliveries' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_rimi_deliveries_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_rimi_deliveries_change', handleLocalChange);
    };
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRimiDelivery({
      order_id: newDel.order_id || (orders.length > 0 ? orders[0].id : undefined),
      vehicle_no: newDel.vehicle_no,
      driver_name: newDel.driver_name,
      driver_phone: newDel.driver_phone,
      departure_temp: newDel.departure_temp,
      delivery_status: 'In Transit'
    });
    setShowAddModal(false);
    showToastMsg(`Dispatched delivery manifest for ${newDel.vehicle_no}`);
    await loadData();
  };

  const handleMarkCompleted = async (rawId: string, delId: string) => {
    await updateRimiDeliveryStatus(rawId, 'Delivered');
    setDeliveries(prev => prev.map(d => d.rawId === rawId ? { ...d, status: 'Delivered' } : d));
    showToastMsg(`Delivery ${delId} marked completed! Temperature log archived.`);
  };

  const handleDeleteDelivery = async (rawId: string) => {
    await deleteRimiDelivery(rawId);
    setDeliveries(prev => prev.filter(d => d.rawId !== rawId));
    showToastMsg('Removed delivery manifest');
  };

  const filteredDeliveries = deliveries.filter(d =>
    (d.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.customer || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.driver || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.vehicle || '').toLowerCase().includes(searchQuery.toLowerCase())
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
            <Truck className="w-5 h-5 text-[#6A1B2E]" /> Reefer Truck Deliveries & Cold Chain POD
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Rimi Cold Chain Console • Live temperature-controlled delivery logs, driver assignments, and proof of delivery.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Dispatch Delivery
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search Delivery #, customer, driver..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredDeliveries.length} Deliveries Logged</span>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading delivery manifests...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDeliveries.map((d) => (
            <Card key={d.rawId || d.id} className="p-5 border border-slate-200/70 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase">{d.id}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${d.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                    {d.status}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-snug">{d.customer}</h3>
                  <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-[#6A1B2E]" /> {d.vehicle}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Driver & Contact:</span>
                    <span className="font-bold text-slate-800">{d.driver} ({d.driverPhone})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Departure Temp:</span>
                    <span className="font-extrabold text-blue-600">{d.temp}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {d.status !== 'Delivered' ? (
                  <Button size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => handleMarkCompleted(d.rawId, d.id)}>
                    Confirm POD
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="flex-1 text-xs font-bold" onClick={() => window.print()}>
                    <Printer className="w-3.5 h-3.5 mr-1" /> POD Slip
                  </Button>
                )}
                <button onClick={() => handleDeleteDelivery(d.rawId)} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Dispatch Reefer Delivery</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddDelivery} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Target Sales Order</label>
                  {orders.length > 0 ? (
                    <select value={newDel.order_id} onChange={(e) => setNewDel({ ...newDel, order_id: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      {orders.map(o => (
                        <option key={o.id} value={o.id}>{o.order_no} - {o.distributor?.business_name || 'Buyer'}</option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" placeholder="SO-2026-101" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Reefer Truck License #</label>
                  <input type="text" required value={newDel.vehicle_no} onChange={(e) => setNewDel({ ...newDel, vehicle_no: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Driver Name</label>
                    <input type="text" required value={newDel.driver_name} onChange={(e) => setNewDel({ ...newDel, driver_name: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Departure Temp</label>
                    <input type="text" required value={newDel.departure_temp} onChange={(e) => setNewDel({ ...newDel, departure_temp: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Dispatch Truck</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
