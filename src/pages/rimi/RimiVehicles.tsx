import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Search, Plus, CheckCircle2, Thermometer, MapPin, X } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const RimiVehicles: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');

  const [vehicles, setVehicles] = useState([
    { id: 'TRK-101', regNo: 'MH-12-AZ-8901', model: 'Tata Ultra Cold Reefer 14-Ton', temp: '-20.4°C', driver: 'Sanjay Kumar', route: 'Mumbai Central -> Navi Mumbai', status: 'En Route (-20°C)' },
    { id: 'TRK-102', regNo: 'KA-01-F-4412', model: 'Eicher Pro Cold King 10-Ton', temp: '-18.5°C', driver: 'M. Sunderam', route: 'Bengaluru Depot -> Electronic City', status: 'En Route (-18°C)' },
    { id: 'TRK-103', regNo: 'DL-03-CB-9920', model: 'BharatBenz Cold Express 16-Ton', temp: '-22.0°C', driver: 'Harpreet Singh', route: 'Delhi Hub -> Gurgaon Supermarkets', status: 'Stationed (-22°C)' }
  ]);

  const [newVehicle, setNewVehicle] = useState({ regNo: '', model: 'Tata Ultra Cold Reefer', driver: 'Rajesh Kumar' });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.regNo) return;
    const created = {
      id: `TRK-${Math.floor(104 + Math.random() * 90)}`,
      regNo: newVehicle.regNo,
      model: newVehicle.model,
      temp: '-20.0°C',
      driver: newVehicle.driver,
      route: 'Mumbai Central Logistics Depot',
      status: 'Stationed (-20°C)'
    };
    setVehicles([created, ...vehicles]);
    setShowAddModal(false);
    showToastMsg(`Registered reefer vehicle ${newVehicle.regNo}`);
  };

  const filteredVehicles = vehicles.filter(v =>
    v.regNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.driver.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.model.toLowerCase().includes(searchQuery.toLowerCase())
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
            <Truck className="w-5 h-5 text-[#6A1B2E]" /> Reefer Cold Chain Fleet Telemetry
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Rimi Cold Chain Console • Live vehicle registration, GPS location, reefer temperature logs, and driver rosters.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Register Reefer Truck
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search reg #, driver, model..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredVehicles.length} Vehicles Tracked</span>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {filteredVehicles.map((v) => (
          <Card key={v.id} className="p-5 border border-slate-200/70 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{v.id} · {v.regNo}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">{v.status}</span>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">{v.model}</h3>
                <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[#6A1B2E]" /> {v.route}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
                <span className="text-xs font-extrabold text-blue-900 flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4 text-blue-600" /> Reefer Temp:
                </span>
                <span className="text-sm font-black text-blue-900">{v.temp}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs font-bold text-slate-600">
              Assigned Driver: {v.driver}
            </div>
          </Card>
        ))}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Register Reefer Truck Unit</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddVehicle} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Registration Number</label>
                  <input type="text" required value={newVehicle.regNo} onChange={(e) => setNewVehicle({ ...newVehicle, regNo: e.target.value })} placeholder="e.g. MH-12-BC-9081" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Vehicle Model Specs</label>
                  <input type="text" required value={newVehicle.model} onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Driver Name</label>
                  <input type="text" required value={newVehicle.driver} onChange={(e) => setNewVehicle({ ...newVehicle, driver: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
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
