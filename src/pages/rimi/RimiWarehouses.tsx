import React, { useState, useEffect, useCallback } from 'react';
import { Warehouse, Search, Thermometer, MapPin, Plus, Trash2, X, CheckCircle2, Phone, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import {
  getRimiWarehouses,
  createRimiWarehouse,
  deleteRimiWarehouse,
  type RimiWarehouseRecord
} from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const RIMI_ADMIN_ROLES = ['rimi_admin', 'rimi_frozen', 'admin', 'education_admin', 'central', 'super_admin', 'superadmin'];

export const RimiWarehouses: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = RIMI_ADMIN_ROLES.includes(profile?.role || '');

  const [searchQuery, setSearchQuery] = useState('');
  const [facilities, setFacilities] = useState<RimiWarehouseRecord[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  const [newWh, setNewWh] = useState({
    name: '',
    city: 'Mumbai',
    address: '',
    cold_room_temp_celsius: -22.0,
    total_capacity_pallets: 1000,
    manager_name: 'Hub Manager',
    manager_phone: '+91 98200 11223'
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRimiWarehouses();
      setFacilities(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_rimi_warehouses_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_warehouses' }, () => loadData())
      .subscribe();

    const handleSync = () => loadData();
    window.addEventListener('ferex_rimi_warehouses_change', handleSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_rimi_warehouses_change', handleSync);
    };
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWh.name || !newWh.city) return;

    try {
      await createRimiWarehouse({
        name: newWh.name,
        city: newWh.city,
        address: newWh.address,
        cold_room_temp_celsius: Number(newWh.cold_room_temp_celsius),
        total_capacity_pallets: Number(newWh.total_capacity_pallets),
        manager_name: newWh.manager_name,
        manager_phone: newWh.manager_phone
      });

      setShowAddModal(false);
      showToastMsg(`Added cold storage facility "${newWh.name}"`);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Error adding facility: ${err.message || 'Database error'}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!isAdmin) {
      showToastMsg('Restricted: Only Cold Chain Admin can remove warehouse hubs.');
      return;
    }
    if (!window.confirm(`Delete facility "${name}"?`)) return;

    try {
      await deleteRimiWarehouse(id);
      showToastMsg(`Deleted ${name}`);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Error deleting facility: ${err.message || 'Database error'}`);
    }
  };

  const filteredFacilities = facilities.filter(f => {
    const s = searchQuery.toLowerCase();
    return (
      f.name.toLowerCase().includes(s) ||
      f.city.toLowerCase().includes(s) ||
      f.code.toLowerCase().includes(s) ||
      f.manager_name.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 text-left antialiased">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-[#58051E]" /> Cold Storage Facilities & Warehouses
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Regional cold hubs, real-time temperature logs, and pallet occupancy telemetry.
          </p>
        </div>

        {isAdmin && (
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Cold Facility
          </Button>
        )}
      </div>

      <Card className="p-4 border border-slate-200/80 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search facility name, city, code, manager..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
          />
        </div>
      </Card>

      {/* Facilities Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400">Loading cold facilities...</div>
      ) : filteredFacilities.length === 0 ? (
        <Card className="p-12 text-center text-xs font-semibold text-slate-400 border-dashed">
          No cold storage facilities registered in database.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFacilities.map(f => {
            const utilPct = f.total_capacity_pallets > 0
              ? Math.round((f.utilized_pallets / f.total_capacity_pallets) * 100)
              : 0;

            return (
              <Card key={f.id} className="p-5 border border-slate-200/80 shadow-xs space-y-3.5 hover:border-slate-300 transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-400">{f.code}</span>
                    <span className="text-[10px] font-mono font-black text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200 flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-cyan-600" /> {f.cold_room_temp_celsius}°C Nominal
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-snug">{f.name}</h3>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {f.city} {f.address ? `• ${f.address}` : ''}
                    </p>
                  </div>

                  {/* Occupancy Bar */}
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>Pallet Occupancy:</span>
                      <span>{f.utilized_pallets} / {f.total_capacity_pallets} Pallets ({utilPct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${utilPct > 85 ? 'bg-rose-600' : 'bg-[#58051E]'}`}
                        style={{ width: `${Math.min(100, utilPct)}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                    <span>Manager: {f.manager_name}</span>
                    <span className="font-semibold text-slate-700">{f.manager_phone}</span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => handleDelete(f.id, f.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                      title="Delete Facility"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Facility Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900">Add Cold Storage Facility</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleAddWarehouse} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Facility Name *</label>
                  <input
                    type="text"
                    required
                    value={newWh.name}
                    onChange={(e) => setNewWh({ ...newWh, name: e.target.value })}
                    placeholder="e.g. Pune Regional Cold Terminal"
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">City / Location *</label>
                    <input
                      type="text"
                      required
                      value={newWh.city}
                      onChange={(e) => setNewWh({ ...newWh, city: e.target.value })}
                      placeholder="Pune"
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Cold Room Temp (°C)</label>
                    <input
                      type="number"
                      value={newWh.cold_room_temp_celsius}
                      onChange={(e) => setNewWh({ ...newWh, cold_room_temp_celsius: Number(e.target.value) })}
                      placeholder="-22.0"
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Pallet Capacity</label>
                    <input
                      type="number"
                      value={newWh.total_capacity_pallets}
                      onChange={(e) => setNewWh({ ...newWh, total_capacity_pallets: Number(e.target.value) })}
                      placeholder="1000"
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Facility Manager</label>
                    <input
                      type="text"
                      value={newWh.manager_name}
                      onChange={(e) => setNewWh({ ...newWh, manager_name: e.target.value })}
                      placeholder="Anand Deshmukh"
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">Register Facility</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
