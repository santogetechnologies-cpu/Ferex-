import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Search, CheckCircle2, Plus, Trash2, X, Thermometer, MapPin, Phone, Shield } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import {
  getRimiDeliveries,
  createRimiDelivery,
  updateRimiDeliveryStatus,
  getRimiSalesOrders,
  getRimiVehicles,
  type RimiDeliveryRecord,
  type RimiSalesOrderRecord,
  type RimiVehicleRecord
} from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const RIMI_ADMIN_ROLES = ['rimi_admin', 'rimi_frozen', 'admin', 'education_admin', 'central', 'super_admin', 'superadmin'];

export const RimiDeliveries: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = RIMI_ADMIN_ROLES.includes(profile?.role || '');

  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [deliveries, setDeliveries] = useState<RimiDeliveryRecord[]>([]);
  const [orders, setOrders] = useState<RimiSalesOrderRecord[]>([]);
  const [vehicles, setVehicles] = useState<RimiVehicleRecord[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newDel, setNewDel] = useState({
    order_id: '',
    vehicle_id: '',
    vehicle_no: 'MH-04-RF-9021',
    driver_name: 'Rajesh Sharma',
    driver_phone: '+91 98200 44551',
    departure_temp: '-18.5°C',
    destination_city: 'Mumbai',
    destination_address: '',
    route_name: 'Western Cold Corridor'
  });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [delData, orderData, vehData] = await Promise.all([
        getRimiDeliveries(),
        getRimiSalesOrders(),
        getRimiVehicles()
      ]);
      setDeliveries(delData);
      setOrders(orderData);
      setVehicles(vehData);

      if (orderData.length > 0 && !newDel.order_id) {
        setNewDel(prev => ({
          ...prev,
          order_id: orderData[0].id,
          destination_city: orderData[0].territory || 'Mumbai',
          destination_address: orderData[0].delivery_address || ''
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [newDel.order_id]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_rimi_deliveries_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_deliveries' }, () => loadData())
      .subscribe();

    const handleSync = () => loadData();
    window.addEventListener('ferex_rimi_deliveries_change', handleSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_rimi_deliveries_change', handleSync);
    };
  }, [loadData]);

  const handleAddDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDel.order_id || !newDel.driver_name) return;

    try {
      const ord = orders.find(o => o.id === newDel.order_id);
      await createRimiDelivery({
        order_id: newDel.order_id,
        order_no: ord?.order_no || 'SO-2026-001',
        customer_name: ord?.customer_name || 'Customer Hub',
        destination_city: newDel.destination_city || ord?.territory || 'Mumbai',
        destination_address: newDel.destination_address || ord?.delivery_address || '',
        vehicle_no: newDel.vehicle_no,
        driver_name: newDel.driver_name,
        driver_phone: newDel.driver_phone,
        departure_temp: newDel.departure_temp,
        route_name: newDel.route_name
      });

      setShowAddModal(false);
      showToastMsg('Created and dispatched Reefer vehicle delivery');
      await loadData();
    } catch (err: any) {
      showToastMsg(`Error creating delivery: ${err.message || 'Database error'}`);
    }
  };

  const handleStatusChange = async (id: string, status: RimiDeliveryRecord['delivery_status']) => {
    try {
      await updateRimiDeliveryStatus(id, status);
      showToastMsg(`Delivery status updated to "${status}"`);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Error updating status: ${err.message || 'Database error'}`);
    }
  };

  const filteredDeliveries = deliveries.filter(d => {
    const s = searchQuery.toLowerCase();
    return (
      d.delivery_no.toLowerCase().includes(s) ||
      d.order_no.toLowerCase().includes(s) ||
      d.customer_name.toLowerCase().includes(s) ||
      d.vehicle_no.toLowerCase().includes(s) ||
      d.driver_name.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 text-left antialiased">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#58051E]" /> Reefer Truck Deliveries & Temperature Log
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Real-time cold transit dispatch monitoring, driver telemetry, and delivery challan tracking.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Schedule Dispatch
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/80 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search delivery no, order no, customer, truck plate, driver..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
          />
        </div>
      </Card>

      {/* Deliveries Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400">Loading fleet dispatches...</div>
      ) : filteredDeliveries.length === 0 ? (
        <Card className="p-12 text-center text-xs font-semibold text-slate-400 border-dashed">
          No delivery trips active or scheduled.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDeliveries.map(d => (
            <Card key={d.id} className="p-5 border border-slate-200/80 shadow-xs space-y-3.5 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">{d.delivery_no}</span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                    d.delivery_status === 'Delivered'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : d.delivery_status === 'In Transit'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {d.delivery_status}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-900 leading-snug">{d.customer_name}</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">Order Ref: {d.order_no}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs text-slate-600">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Reefer Vehicle:</span>
                    <span>{d.vehicle_no}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Driver:</span>
                    <span className="font-semibold text-slate-800">{d.driver_name} ({d.driver_phone})</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                    <span className="text-slate-400">Cold Temp:</span>
                    <span className="font-mono text-[10px] font-bold text-cyan-800 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200 flex items-center gap-1">
                      <Thermometer className="w-2.5 h-2.5" /> {d.departure_temp}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                  <span>Destination: {d.destination_city}</span>
                  <span className="font-semibold text-slate-700">{d.route_name || 'Corridor'}</span>
                </div>
              </div>

              {/* Status Update Quick Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  {(['Assigned', 'In Transit', 'Delivered'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(d.id, st)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        d.delivery_status === st
                          ? 'bg-[#58051E] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Schedule Dispatch Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900">Schedule Reefer Fleet Dispatch</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleAddDelivery} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Link Sales Order *</label>
                  <select
                    required
                    value={newDel.order_id}
                    onChange={(e) => {
                      const ord = orders.find(o => o.id === e.target.value);
                      setNewDel({
                        ...newDel,
                        order_id: e.target.value,
                        destination_city: ord?.territory || 'Mumbai',
                        destination_address: ord?.delivery_address || ''
                      });
                    }}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>[{o.order_no}] {o.customer_name} (₹{Number(o.total_amount).toLocaleString('en-IN')})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Reefer Truck *</label>
                    <select
                      value={newDel.vehicle_no}
                      onChange={(e) => {
                        const v = vehicles.find(veh => veh.vehicle_no === e.target.value);
                        setNewDel({
                          ...newDel,
                          vehicle_no: e.target.value,
                          driver_name: v?.driver_name || newDel.driver_name,
                          driver_phone: v?.driver_phone || newDel.driver_phone
                        });
                      }}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                    >
                      {vehicles.map(v => (
                        <option key={v.id} value={v.vehicle_no}>{v.vehicle_no} ({v.model})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Departure Temperature</label>
                    <input
                      type="text"
                      value={newDel.departure_temp}
                      onChange={(e) => setNewDel({ ...newDel, departure_temp: e.target.value })}
                      placeholder="-18.5°C"
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Driver Name *</label>
                    <input
                      type="text"
                      required
                      value={newDel.driver_name}
                      onChange={(e) => setNewDel({ ...newDel, driver_name: e.target.value })}
                      placeholder="Rajesh Sharma"
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Driver Phone</label>
                    <input
                      type="text"
                      value={newDel.driver_phone}
                      onChange={(e) => setNewDel({ ...newDel, driver_phone: e.target.value })}
                      placeholder="+91 98200 44551"
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">Dispatch Reefer Vehicle</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
