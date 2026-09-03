import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Search, Plus, Eye, Trash2, X, CheckCircle2, Anchor, Navigation, Edit2 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { getTradeShipments, createTradeShipment, deleteTradeShipment, updateTradeShipmentStatus } from '../../lib/api/trade';

export const TradeShipments: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('All');
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadShipments = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTradeShipments();
      if (Array.isArray(data)) {
        setShipments(data.map(d => ({
          id: d.shipment_no || d.id,
          rawId: d.id,
          container: d.container_no,
          carrier: d.carrier,
          origin: d.origin_port,
          destination: d.destination_port,
          cargo: d.cargo_description,
          weight: `${Number(d.cargo_weight_kg || 20000).toLocaleString()} kg`,
          eta: d.eta,
          mode: d.transport_mode || 'Maritime',
          status: d.status || d.shipment_status || 'In Transit',
          statusBadge: (d.status === 'In Transit' || d.shipment_status === 'In Transit')
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : (d.status === 'Delivered' || d.status === 'Customs Cleared')
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
        })));
      } else {
        setShipments([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShipments();

    const channel = supabase
      .channel('realtime_trade_shipments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_shipments' }, () => {
        loadShipments();
      })
      .subscribe();

    const handleLocalChange = () => loadShipments();
    window.addEventListener('ferex_trade_shipments_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_shipments_change', handleLocalChange);
    };
  }, [loadShipments]);

  const [newShipment, setNewShipment] = useState({
    container: '',
    carrier: 'Maersk Line',
    origin: 'Port of Gdansk, Poland',
    destination: 'Port of Rotterdam, Netherlands',
    cargo: 'Industrial Bearing Assemblies',
    weight: '24,500 kg',
    eta: '2026-09-20',
    mode: 'Maritime',
    status: 'In Transit'
  });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShipment.container) return;
    const created = await createTradeShipment({
      container_no: newShipment.container,
      carrier: newShipment.carrier,
      origin_port: newShipment.origin,
      destination_port: newShipment.destination,
      cargo_description: newShipment.cargo,
      cargo_weight_kg: parseFloat(newShipment.weight.replace(/[^0-9.]/g, '')) || 20000,
      transport_mode: newShipment.mode,
      status: newShipment.status,
      eta: newShipment.eta,
    });
    await loadShipments();
    setShowAddModal(false);
    showToastMsg(`Dispatched container ${newShipment.container} and saved to database!`);
    setNewShipment({
      container: '',
      carrier: 'Maersk Line',
      origin: 'Port of Gdansk, Poland',
      destination: 'Port of Rotterdam, Netherlands',
      cargo: 'Industrial Bearing Assemblies',
      weight: '24,500 kg',
      eta: '2026-09-20',
      mode: 'Maritime',
      status: 'In Transit'
    });
  };

  const handleStatusChange = async (id: string, rawId: string, newStatus: string) => {
    await updateTradeShipmentStatus(rawId || id, newStatus);
    showToastMsg(`Updated shipment status to ${newStatus}`);
    await loadShipments();
  };

  const handleDeleteShipment = async (id: string, rawId?: string) => {
    await deleteTradeShipment(rawId || id);
    setShipments(prev => prev.filter(s => s.id !== id && s.rawId !== rawId));
    showToastMsg(`Removed shipment record ${id}`);
  };

  const filteredShipments = shipments.filter(s => {
    const matchesSearch =
      (s.container || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.carrier || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.id || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMode = filterMode === 'All' || s.mode === filterMode;
    return matchesSearch && matchesMode;
  });

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
            <Truck className="w-5 h-5 text-[#6A1B2E]" /> Global Container & Freight Logistics
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Real-time container movement, bill of lading linking, customs clearance, and ETA tracking.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Book Container Shipment
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search Container #, Carrier, or ID..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>

        <div className="flex items-center gap-1.5">
          {['All', 'Maritime', 'Air Cargo'].map((mode) => (
            <button key={mode} onClick={() => setFilterMode(mode)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filterMode === mode ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {mode}
            </button>
          ))}
        </div>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading live shipments from Supabase...</div>
      ) : filteredShipments.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <Truck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No shipments found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery ? 'No shipments match your search filter.' : 'Your global container ledger is currently empty. Book a new shipment to start tracking.'}
          </p>
          <Button size="sm" className="mt-4 bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Book Container Shipment
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                  <th className="py-3 px-4">Container ID & Carrier</th>
                  <th className="py-3 px-4">Origin Port</th>
                  <th className="py-3 px-4">Destination Port</th>
                  <th className="py-3 px-4">Cargo & Weight</th>
                  <th className="py-3 px-4">ETA Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredShipments.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        <Anchor className="w-3.5 h-3.5 text-[#6A1B2E]" /> {s.container}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{s.id} · {s.carrier}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{s.origin}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{s.destination}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{s.cargo}</div>
                      <div className="text-[10px] font-semibold text-slate-400">{s.weight}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{s.eta}</td>
                    <td className="py-3.5 px-4">
                      <select
                        value={s.status}
                        onChange={(e) => handleStatusChange(s.id, s.rawId, e.target.value)}
                        className={`text-[10px] font-extrabold rounded-full px-2.5 py-1 border cursor-pointer ${s.statusBadge}`}
                      >
                        <option value="In Transit">In Transit</option>
                        <option value="Loaded on Vessel">Loaded on Vessel</option>
                        <option value="Customs Cleared">Customs Cleared</option>
                        <option value="Delivered">Delivered</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setSelectedShipment(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Track Live Route">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteShipment(s.id, s.rawId)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete Record">
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

      {/* Book Shipment Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Book Container Shipment</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddShipment} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Container Serial Number</label>
                  <input type="text" required value={newShipment.container} onChange={(e) => setNewShipment({ ...newShipment, container: e.target.value })} placeholder="e.g. MSKU-9988112" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Cargo Description</label>
                  <input type="text" required value={newShipment.cargo} onChange={(e) => setNewShipment({ ...newShipment, cargo: e.target.value })} placeholder="e.g. Industrial Bearing Assemblies" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Origin Port</label>
                    <input type="text" required value={newShipment.origin} onChange={(e) => setNewShipment({ ...newShipment, origin: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Destination Port</label>
                    <input type="text" required value={newShipment.destination} onChange={(e) => setNewShipment({ ...newShipment, destination: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Carrier Line</label>
                    <select value={newShipment.carrier} onChange={(e) => setNewShipment({ ...newShipment, carrier: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="Maersk Line">Maersk Line</option>
                      <option value="CMA CGM Logistics">CMA CGM Logistics</option>
                      <option value="Hapag-Lloyd">Hapag-Lloyd</option>
                      <option value="MSC Line">MSC Line</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Estimated ETA</label>
                    <input type="date" required value={newShipment.eta} onChange={(e) => setNewShipment({ ...newShipment, eta: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Dispatch Shipment</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Tracking Drawer */}
      <AnimatePresence>
        {selectedShipment && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedShipment(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-[#6A1B2E]" /> Live Container Tracking Timeline
                </h3>
                <button onClick={() => setSelectedShipment(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-left">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{selectedShipment.id} · {selectedShipment.carrier}</span>
                  <h4 className="text-base font-black text-slate-900">{selectedShipment.container}</h4>
                  <p className="text-xs font-semibold text-slate-500">{selectedShipment.cargo} · {selectedShipment.weight}</p>
                </div>

                <div className="space-y-3 pt-2">
                  <h5 className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Milestone Route Progress</h5>
                  <div className="space-y-3 pl-4 border-l-2 border-slate-200">
                    <div className="relative">
                      <span className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <div className="text-xs font-black text-slate-900">Origin Departure: {selectedShipment.origin}</div>
                      <div className="text-[10px] font-semibold text-slate-400">Port Gate Out cleared</div>
                    </div>
                    <div className="relative">
                      <span className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
                      <div className="text-xs font-black text-[#6A1B2E]">Current Status: {selectedShipment.status}</div>
                      <div className="text-[10px] font-semibold text-slate-400">Carrier line updated in real time</div>
                    </div>
                    <div className="relative">
                      <span className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-slate-300" />
                      <div className="text-xs font-black text-slate-700">Destination Port: {selectedShipment.destination}</div>
                      <div className="text-[10px] font-semibold text-slate-400">Estimated Arrival: {selectedShipment.eta}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button size="sm" className="w-full text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => setSelectedShipment(null)}>
                    Close Inspector
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
