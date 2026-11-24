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
  getRimiCustomers,
  mapLinkFor,
  type RimiCustomerRecord,
  type RimiDeliveryRecord,
  type RimiSalesOrderRecord,
  type RimiVehicleRecord
} from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';
import { useRimiAccess } from '../../lib/rimiAccess';
import { useAuth } from '../../contexts/AuthContext';
import { BlockCap } from '../../components/CapLoader';
import { DateRangeFilter } from '../../components/DateRangeFilter';
import { ALL_TIME, inRange, type DateRange } from '../../lib/dateRange';

export const RimiDeliveries: React.FC = () => {
  // Admin and Warehouse users both run dispatch.
  const { canManage: isAdmin, isAdmin: isRimiAdmin } = useRimiAccess();
  const { profile } = useAuth();
  const [scope, setScope] = useState<'mine' | 'all'>(isRimiAdmin ? 'all' : 'mine');
  const [customers, setCustomers] = useState<RimiCustomerRecord[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [range, setRange] = useState<DateRange>(ALL_TIME);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [deliveries, setDeliveries] = useState<RimiDeliveryRecord[]>([]);
  const [orders, setOrders] = useState<RimiSalesOrderRecord[]>([]);
  const [vehicles, setVehicles] = useState<RimiVehicleRecord[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newDel, setNewDel] = useState({
    order_id: '',
    vehicle_id: '',
    vehicle_no: '',
    driver_name: '',
    driver_phone: '',
    departure_temp: '-18.5°C',
    destination_city: '',
    destination_address: '',
    route_name: 'Western Cold Corridor',
    scheduled_date: '',
    delivery_instructions: ''
  });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [delData, orderData, vehData, custData] = await Promise.all([
        getRimiDeliveries(),
        getRimiSalesOrders(),
        getRimiVehicles(),
        getRimiCustomers().catch(() => [] as RimiCustomerRecord[])
      ]);
      setCustomers(custData);
      setDeliveries(delData);
      setOrders(orderData);
      setVehicles(vehData);

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
    if (!newDel.order_id) { showToastMsg('Choose the sales order to dispatch.'); return; }
    if (!newDel.vehicle_no) { showToastMsg('Choose the reefer truck.'); return; }
    if (!newDel.driver_name.trim()) { showToastMsg('Choose the driver for this truck.'); return; }
    const driverBusy = deliveries.some(d => liveTrip(d) && (d.driver_name || '').trim().toLowerCase() === newDel.driver_name.trim().toLowerCase());
    if (driverBusy && !window.confirm(`${newDel.driver_name.trim()} is already on a live trip. Assign them to this dispatch as well?`)) return;
    if (!window.confirm(`Dispatch truck ${newDel.vehicle_no} with driver ${newDel.driver_name.trim()}?`)) return;

    try {
      const ord = orders.find(o => o.id === newDel.order_id);
      await createRimiDelivery({
        order_id: newDel.order_id,
        order_no: ord?.order_no || '',
        customer_name: ord?.customer_name || '',
        vehicle_id: vehicles.find(v => v.vehicle_no === newDel.vehicle_no)?.id,
        destination_city: newDel.destination_city || ord?.territory || '',
        destination_address: newDel.destination_address || ord?.delivery_address || '',
        vehicle_no: newDel.vehicle_no,
        driver_name: newDel.driver_name,
        driver_phone: newDel.driver_phone,
        departure_temp: newDel.departure_temp,
        route_name: newDel.route_name,
        scheduled_date: newDel.scheduled_date || undefined,
        delivery_instructions: newDel.delivery_instructions || undefined,
        customer_id: ord?.customer_id
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

  // Only orders that can still go out and are not already on a live delivery, and trucks that are free.
  const dispatchable = orders.filter(o => !['Cancelled', 'Delivered'].includes(o.order_status) && !deliveries.some(d => d.order_id === o.id && !['Delivered', 'Returned', 'Failed'].includes(d.delivery_status)));
  // Drivers come from the fleet and past trips. A driver is only ever assigned by choosing them here.
  const liveTrip = (d: RimiDeliveryRecord) => !['Delivered', 'Returned', 'Failed'].includes(d.delivery_status);
  const drivers = (() => {
    const m = new Map<string, { name: string; phone: string; busy: boolean }>();
    [...vehicles.map(v => ({ name: v.driver_name, phone: v.driver_phone || '' })), ...deliveries.map(d => ({ name: d.driver_name, phone: d.driver_phone || '' }))]
      .forEach(x => { const n = (x.name || '').trim(); if (n && n.toLowerCase() !== 'unassigned' && !m.has(n.toLowerCase())) m.set(n.toLowerCase(), { name: n, phone: x.phone, busy: deliveries.some(d => liveTrip(d) && (d.driver_name || '').trim().toLowerCase() === n.toLowerCase()) }); });
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  })();
  const freeTrucks = vehicles.filter(v => ['Stationed', 'Available'].includes(v.status));

  // A trip is "mine" when I am the assigned driver: by my login, my phone number or my name.
  const norm = (v?: string | null) => (v || '').replace(/\D/g, '').slice(-10);
  const isMine = (d: RimiDeliveryRecord) => Boolean(profile?.id && d.driver_user_id === profile.id)
    || Boolean(norm((profile as any)?.phone) && norm(d.driver_phone) === norm((profile as any)?.phone))
    || Boolean(profile?.full_name && (d.driver_name || '').trim().toLowerCase() === profile.full_name.trim().toLowerCase());
  const mineCount = deliveries.filter(isMine).length;
  const filteredDeliveries = deliveries.filter(d => scope === 'all' || isMine(d)).filter(d => inRange(d.created_at, range)).filter(d => {
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
            <Truck className="w-5 h-5 text-[#5A0122]" /> Deliveries
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Dispatches, drivers and delivery status.</p>
        </div>

        <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          className="bg-[#5A0122] hover:bg-[#68092A] text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Schedule Dispatch
        </Button>
      </div>

      <div className="flex items-center gap-2" role="tablist" aria-label="Which trips">
        {(['mine', 'all'] as const).map(k => (
          <button key={k} role="tab" aria-selected={scope === k} onClick={() => setScope(k)} className={`px-3.5 h-8 rounded-full text-xs font-bold border cursor-pointer ${scope === k ? 'bg-[#5A0122] text-white border-[#5A0122]' : 'bg-white text-slate-600 border-slate-200'}`}>
            {k === 'mine' ? `Assigned to me (${mineCount})` : `All trips (${deliveries.length})`}
          </button>
        ))}
      </div>

      <Card className="p-4 border border-slate-200/80 shadow-xs">
        <DateRangeFilter compact label="Trip date" value={range} onChange={setRange} />
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
        <BlockCap />
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

                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5 text-xs text-slate-700" aria-label="Delivery details">
                  <div className="font-extrabold text-slate-900 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#5A0122]" />{d.customer_name}</div>
                  <p className="font-semibold">{d.destination_address || 'Address not saved'}{d.destination_city ? `, ${d.destination_city}` : ''}{d.pincode ? ` – ${d.pincode}` : ''}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                    {d.contact_person && <span><span className="text-slate-400">Contact:</span> <b>{d.contact_person}</b></span>}
                    {d.contact_phone && <a href={`tel:${d.contact_phone}`} className="inline-flex items-center gap-1 font-bold text-[#5A0122] hover:underline"><Phone className="w-3 h-3" />{d.contact_phone}</a>}
                    {(d.map_url || d.destination_address) && <a href={d.map_url || mapLinkFor(d.destination_address || '', d.destination_city, d.pincode)} target="_blank" rel="noreferrer" className="font-bold text-[#5A0122] hover:underline">Open in Maps</a>}
                  </div>
                  {d.order_summary && <p className="text-[11px]"><span className="text-slate-400">Order:</span> {d.order_summary}</p>}
                  {d.scheduled_date && <p className="text-[11px]"><span className="text-slate-400">Deliver on:</span> <b>{new Date(d.scheduled_date).toLocaleDateString('en-GB')}</b></p>}
                  {d.delivery_instructions && <p className="text-[11px] rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 text-amber-900"><b>Instructions:</b> {d.delivery_instructions}</p>}
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                  <span>Route</span>
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
                          ? 'bg-[#5A0122] text-white shadow-xs'
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
                      const cu = customers.find(c => c.id === ord?.customer_id);
                      setNewDel({
                        ...newDel,
                        order_id: e.target.value,
                        destination_city: cu?.city || ord?.territory || '',
                        destination_address: ord?.delivery_address || cu?.address || '',
                        scheduled_date: (ord as any)?.delivery_date ? String((ord as any).delivery_date).slice(0, 10) : newDel.scheduled_date
                      });
                    }}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="">Select a sales order…</option>
                    {dispatchable.map(o => (
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
                        setNewDel({
                          ...newDel,
                          vehicle_no: e.target.value
                        });
                      }}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                    >
                      <option value="">Select a truck…</option>
                      {freeTrucks.map(v => (
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
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Driver for this truck *</label>
                    <select
                      required
                      aria-label="Driver"
                      value={drivers.some(d => d.name === newDel.driver_name) ? newDel.driver_name : (newDel.driver_name === '' ? '' : '__other')}
                      onChange={(e) => {
                        const d = drivers.find(x => x.name === e.target.value);
                        setNewDel({ ...newDel, driver_name: e.target.value === '__other' ? ' ' : e.target.value, driver_phone: d?.phone || '' });
                      }}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                    >
                      <option value="">Select a driver…</option>
                      {drivers.map(d => <option key={d.name} value={d.name}>{d.name}{d.busy ? ' (on a live trip)' : ''}</option>)}
                      <option value="__other">Someone else…</option>
                    </select>
                    {newDel.driver_name !== '' && !drivers.some(d => d.name === newDel.driver_name) && (
                      <input type="text" required aria-label="Driver name" value={newDel.driver_name.trim() === '' ? '' : newDel.driver_name} onChange={(e) => setNewDel({ ...newDel, driver_name: e.target.value || ' ' })} placeholder="Driver's full name" className="mt-1.5 w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none" />
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Driver Phone</label>
                    <input
                      type="text"
                      value={newDel.driver_phone}
                      onChange={(e) => setNewDel({ ...newDel, driver_phone: e.target.value })}
                      placeholder="+91 98XXX XXXXX"
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                {(() => { const ord = orders.find(o => o.id === newDel.order_id); const cu = customers.find(c => c.id === ord?.customer_id); if (!ord) return null; return (
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1 text-xs" aria-label="Customer delivery details">
                    <p className="text-[10px] font-extrabold text-slate-500 uppercase">Delivery details from the customer record</p>
                    <p className="font-extrabold text-slate-900">{cu?.business_name || ord.customer_name}</p>
                    <p>{ord.delivery_address || cu?.address || <span className="text-rose-700 font-semibold">No delivery address saved. Add it under Customers.</span>}{(cu?.city || newDel.destination_city) ? `, ${cu?.city || newDel.destination_city}` : ''}{cu?.pincode ? ` – ${cu.pincode}` : ''}</p>
                    <p><span className="text-slate-400">Contact:</span> {cu?.contact_person || '—'} · {cu?.phone || '—'}</p>
                  </div>); })()}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Delivery Date</label>
                    <input type="date" value={newDel.scheduled_date} onChange={(e) => setNewDel({ ...newDel, scheduled_date: e.target.value })} className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Special Instructions</label>
                    <input type="text" value={newDel.delivery_instructions} onChange={(e) => setNewDel({ ...newDel, delivery_instructions: e.target.value })} placeholder="e.g. Call before arrival" className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none" />
                  </div>
                </div>

                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#5A0122] hover:bg-[#68092A]">Confirm &amp; Dispatch</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
