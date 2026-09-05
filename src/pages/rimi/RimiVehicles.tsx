import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Search, Plus, CheckCircle2, Thermometer, X, Trash2 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getRimiVehicles, createRimiVehicle, updateRimiVehicleStatus, deleteRimiVehicle } from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';

export const RimiVehicles: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newVehicle, setNewVehicle] = useState({
    regNo: 'MH-12-AZ-8901',
    driver: 'Sanjay Kumar',
    driver_phone: '+91 98765 43210',
    capacity_tonnes: 14,
    temp: -20.0
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRimiVehicles();
      if (Array.isArray(data)) {
        const formatted = data.map((d: any) => ({
          id: d.id ? `TRK-${d.id.slice(0, 4).toUpperCase()}` : 'TRK-101',
          rawId: d.id,
          regNo: d.vehicle_number,
          model: `${d.capacity_tonnes || 14}-Ton Ultra Cold Reefer`,
          temp: `${d.current_temp_celsius || -20.0}°C`,
          tempNum: d.current_temp_celsius || -20.0,
          driver: d.driver_name,
          phone: d.driver_phone || '+91 98765 43210',
          route: d.status === 'On Route' ? 'Active Delivery Route' : 'Stationed Cold Logistics Depot',
          status: d.status || 'Stationed',
        }));
        setVehicles(formatted);
      } else {
        setVehicles([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_rimi_vehicles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_vehicles' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_rimi_vehicles_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_rimi_vehicles_change', handleLocalChange);
    };
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.regNo) return;
    await createRimiVehicle({
      vehicle_number: newVehicle.regNo,
      driver_name: newVehicle.driver,
      driver_phone: newVehicle.driver_phone,
      capacity_tonnes: Number(newVehicle.capacity_tonnes) || 14,
      current_temp_celsius: Number(newVehicle.temp) || -20.0,
      status: 'Stationed'
    });
    setShowAddModal(false);
    showToastMsg(`Registered reefer vehicle ${newVehicle.regNo}`);
    setNewVehicle({ regNo: '', driver: 'Rajesh Kumar', driver_phone: '+91 98765 43210', capacity_tonnes: 14, temp: -20.0 });
    await loadData();
  };

  const handleToggleStatus = async (rawId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'On Route' ? 'Stationed' : 'On Route';
    await updateRimiVehicleStatus(rawId, nextStatus);
    setVehicles(prev => prev.map(v => v.rawId === rawId ? { ...v, status: nextStatus } : v));
    showToastMsg(`Vehicle status updated to ${nextStatus}`);
  };

  const handleDeleteVehicle = async (rawId: string) => {
    await deleteRimiVehicle(rawId);
    setVehicles(prev => prev.filter(v => v.rawId !== rawId));
    showToastMsg('Removed vehicle registry record');
  };

  const filteredVehicles = vehicles.filter(v =>
    (v.regNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.driver || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.model || '').toLowerCase().includes(searchQuery.toLowerCase())
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
            <Truck className="w-5 h-5 text-[#6A1B2E]" /> Temperature-Controlled Reefer Fleet
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Rimi Cold Chain Console • Live fleet telematics, reefer temperature sensors (-20°C), and driver contact directory.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Register Reefer Vehicle
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search Vehicle #, driver, or model..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredVehicles.length} Registered Reefer Units</span>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading fleet telemetry...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVehicles.map((v) => (
            <Card key={v.rawId || v.id} className="p-5 border border-slate-200/70 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase">{v.id}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${v.status === 'On Route' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                    {v.status}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-snug">{v.regNo}</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">{v.model}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span className="flex items-center gap-1 text-blue-600">
                      <Thermometer className="w-4 h-4" /> Reefer Temp:
                    </span>
                    <span className="text-[#6A1B2E] font-black">{v.temp}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 font-semibold text-[11px] pt-1">
                    <span>Assigned Driver:</span>
                    <span className="font-bold text-slate-800">{v.driver} ({v.phone})</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <Button size="sm" variant="outline" className="flex-1 text-xs font-bold" onClick={() => handleToggleStatus(v.rawId, v.status)}>
                  Toggle State
                </Button>
                <button onClick={() => handleDeleteVehicle(v.rawId)} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
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
                <h3 className="text-sm font-black text-slate-900">Register Reefer Vehicle</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddVehicle} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Registration Plate #</label>
                  <input type="text" required value={newVehicle.regNo} onChange={(e) => setNewVehicle({ ...newVehicle, regNo: e.target.value })} placeholder="MH-12-AZ-8901" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Driver Name</label>
                    <input type="text" required value={newVehicle.driver} onChange={(e) => setNewVehicle({ ...newVehicle, driver: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Driver Phone</label>
                    <input type="text" value={newVehicle.driver_phone} onChange={(e) => setNewVehicle({ ...newVehicle, driver_phone: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Capacity (Tonnes)</label>
                    <input type="number" required value={newVehicle.capacity_tonnes} onChange={(e) => setNewVehicle({ ...newVehicle, capacity_tonnes: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Setpoint Temp (°C)</label>
                    <input type="number" step="0.1" required value={newVehicle.temp} onChange={(e) => setNewVehicle({ ...newVehicle, temp: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Register Vehicle</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
