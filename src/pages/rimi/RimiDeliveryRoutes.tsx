import React, { useState, useEffect, useCallback } from 'react';
import { Navigation, Search, MapPin, Plus, Trash2, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getRimiVehicles } from '../../lib/api/rimi';

export const RimiDeliveryRoutes: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [routes, setRoutes] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');

  const [newRoute, setNewRoute] = useState({
    name: '',
    stops: '',
    vehicle: 'Reefer MH-12-AZ-8901',
    eta: '60 mins to next drop'
  });

  const loadData = useCallback(async () => {
    const vData = await getRimiVehicles();
    setVehicles(vData);

    const saved = localStorage.getItem('ferex_rimi_routes');
    if (saved) {
      try {
        setRoutes(JSON.parse(saved));
        return;
      } catch {}
    }

    const defaultRoutes = [
      { id: 'RTE-101', name: 'Western Express Cold Corridor', stops: 'Bhiwandi Hub -> Bandra -> Andheri -> Borivali', vehicle: 'Reefer MH-12-AZ-8901', eta: '45 mins to next drop', status: 'Active Dispatch' },
      { id: 'RTE-102', name: 'Delhi NCR Supermarket Circuit', stops: 'Gurugram Facility -> Saket -> Dwarka -> Noida', vehicle: 'Reefer DL-03-CB-9920', eta: 'In Transit', status: 'Active Dispatch' },
      { id: 'RTE-103', name: 'Bengaluru Tech Park HORECA Loop', stops: 'Electronic City -> Koramangala -> Indiranagar -> Whitefield', vehicle: 'Reefer KA-01-EF-4500', eta: 'Scheduled Morning', status: 'Active Dispatch' }
    ];
    setRoutes(defaultRoutes);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoute.name) return;
    const created = {
      id: `RTE-${Math.floor(104 + Math.random() * 900)}`,
      ...newRoute,
      status: 'Active Dispatch'
    };
    const updated = [created, ...routes];
    setRoutes(updated);
    localStorage.setItem('ferex_rimi_routes', JSON.stringify(updated));
    setShowAddModal(false);
    showToastMsg(`Created delivery route ${newRoute.name}`);
    setNewRoute({ name: '', stops: '', vehicle: 'Reefer MH-12-AZ-8901', eta: '60 mins to next drop' });
  };

  const handleDeleteRoute = (id: string) => {
    const updated = routes.filter(r => r.id !== id);
    setRoutes(updated);
    localStorage.setItem('ferex_rimi_routes', JSON.stringify(updated));
    showToastMsg('Removed delivery route');
  };

  const filteredRoutes = routes.filter(r =>
    (r.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.stops || '').toLowerCase().includes(searchQuery.toLowerCase())
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
            <Navigation className="w-5 h-5 text-[#6A1B2E]" /> Cold Chain Distribution Routes
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Rimi Cold Chain Console • Multi-stop drop circuits, reefer truck route optimization, and delivery timing.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Plan Delivery Route
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search route name, stop, or ID..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredRoutes.length} Routes Active</span>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredRoutes.map((r) => (
          <Card key={r.id} className="p-5 border border-slate-200/70 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{r.id}</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">{r.status}</span>
              </div>
              <h3 className="text-base font-black text-slate-900 leading-snug">{r.name}</h3>
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Multi-Stop Drop Sequence</span>
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#6A1B2E] shrink-0" /> {r.stops}
                </div>
              </div>
              <div className="text-xs font-bold text-slate-600">Assigned Reefer: {r.vehicle}</div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>ETA: {r.eta}</span>
              <button onClick={() => handleDeleteRoute(r.id)} className="p-1 text-slate-400 hover:text-red-600 rounded">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
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
                <h3 className="text-sm font-black text-slate-900">Plan Cold Distribution Route</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddRoute} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Route Corridor Title</label>
                  <input type="text" required value={newRoute.name} onChange={(e) => setNewRoute({ ...newRoute, name: e.target.value })} placeholder="e.g. Pune City Central Drop Circuit" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Drop Stops Sequence</label>
                  <textarea required value={newRoute.stops} onChange={(e) => setNewRoute({ ...newRoute, stops: e.target.value })} placeholder="Hub -> Stop 1 -> Stop 2 -> Stop 3" rows={2} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Assigned Vehicle</label>
                  {vehicles.length > 0 ? (
                    <select value={newRoute.vehicle} onChange={(e) => setNewRoute({ ...newRoute, vehicle: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      {vehicles.map(v => (
                        <option key={v.id} value={v.vehicle_number}>{v.vehicle_number} ({v.driver_name})</option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" required value={newRoute.vehicle} onChange={(e) => setNewRoute({ ...newRoute, vehicle: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  )}
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save Route</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
