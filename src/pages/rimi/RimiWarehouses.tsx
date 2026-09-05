import React, { useState, useEffect, useCallback } from 'react';
import { Warehouse, Search, Thermometer, MapPin, Plus, Trash2, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getRimiWarehouses, createRimiWarehouse, deleteRimiWarehouse } from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';

export const RimiWarehouses: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [facilities, setFacilities] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  const [newWh, setNewWh] = useState({
    code: 'WH-MUM-01',
    name: '',
    city: 'Mumbai',
    address: '',
    cold_room_temp_celsius: -22.0,
    total_capacity_pallets: 1200,
    utilized_pallets: 850,
    manager_name: 'Rajesh Sharma'
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRimiWarehouses();
      if (Array.isArray(data)) {
        const mapped = data.map((d: any) => {
          const utilPct = d.total_capacity_pallets > 0 ? Math.round((d.utilized_pallets / d.total_capacity_pallets) * 100) : 75;
          return {
            id: d.code || d.id,
            rawId: d.id,
            name: d.name,
            city: d.city,
            address: d.address || `${d.city} Industrial Zone`,
            temp: `${d.cold_room_temp_celsius || -22.0}°C`,
            capacity: `${Number(d.total_capacity_pallets || 1000).toLocaleString()} Pallets (${utilPct}% Used)`,
            manager: d.manager_name || 'Hub Manager',
            status: 'Active Frozen'
          };
        });
        setFacilities(mapped);
      } else {
        setFacilities([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_rimi_warehouses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_warehouses' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_rimi_warehouses_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_rimi_warehouses_change', handleLocalChange);
    };
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWh.name) return;
    await createRimiWarehouse({
      code: `WH-${newWh.city.slice(0, 3).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`,
      name: newWh.name,
      city: newWh.city,
      address: newWh.address,
      cold_room_temp_celsius: Number(newWh.cold_room_temp_celsius) || -22.0,
      total_capacity_pallets: Number(newWh.total_capacity_pallets) || 1000,
      utilized_pallets: Number(newWh.utilized_pallets) || 400,
      manager_name: newWh.manager_name
    });
    setShowAddModal(false);
    showToastMsg(`Added cold storage facility ${newWh.name}`);
    setNewWh({ code: 'WH-MUM-01', name: '', city: 'Mumbai', address: '', cold_room_temp_celsius: -22.0, total_capacity_pallets: 1200, utilized_pallets: 850, manager_name: 'Rajesh Sharma' });
    await loadData();
  };

  const handleDeleteWh = async (rawId: string) => {
    await deleteRimiWarehouse(rawId);
    setFacilities(prev => prev.filter(f => f.rawId !== rawId));
    showToastMsg('Removed warehouse record');
  };

  const filteredFacilities = facilities.filter(f =>
    (f.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.city || '').toLowerCase().includes(searchQuery.toLowerCase())
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
            <Warehouse className="w-5 h-5 text-[#6A1B2E]" /> Temperature Controlled Cold Hubs
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Rimi Cold Chain Console • Live telemetry monitoring, deep freeze storage, and regional hub capacity.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Register Cold Hub
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search facility name or city..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredFacilities.length} Cold Facilities</span>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading cold facilities...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {filteredFacilities.map((w) => (
            <Card key={w.rawId || w.id} className="p-5 border border-slate-200/70 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase">{w.id}</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">{w.status}</span>
                </div>
                <h3 className="text-base font-black text-slate-900 leading-snug">{w.name}</h3>
                <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#6A1B2E]" /> {w.address || w.city}
                </p>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span className="flex items-center gap-1 text-blue-600">
                      <Thermometer className="w-4 h-4" /> Live Room Temp:
                    </span>
                    <span className="text-[#6A1B2E] font-black">{w.temp}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 font-semibold text-[11px] pt-1">
                    <span>Pallet Capacity:</span>
                    <span className="font-bold text-slate-800">{w.capacity}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Lead: {w.manager}</span>
                <button onClick={() => handleDeleteWh(w.rawId)} className="p-1 text-slate-400 hover:text-red-600 rounded">
                  <Trash2 className="w-3.5 h-3.5" />
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
                <h3 className="text-sm font-black text-slate-900">Register Cold Storage Hub</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddWarehouse} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Facility Name</label>
                  <input type="text" required value={newWh.name} onChange={(e) => setNewWh({ ...newWh, name: e.target.value })} placeholder="e.g. Pune Regional Cold Depot" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">City</label>
                    <input type="text" required value={newWh.city} onChange={(e) => setNewWh({ ...newWh, city: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Cold Temp (°C)</label>
                    <input type="number" step="0.1" required value={newWh.cold_room_temp_celsius} onChange={(e) => setNewWh({ ...newWh, cold_room_temp_celsius: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Facility Manager</label>
                  <input type="text" required value={newWh.manager_name} onChange={(e) => setNewWh({ ...newWh, manager_name: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Register Hub</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
