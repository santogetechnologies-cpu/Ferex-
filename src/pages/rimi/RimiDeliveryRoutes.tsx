import React, { useState, useEffect, useCallback } from 'react';
import { Navigation, Search, MapPin, Plus, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import {
  getRimiVehicles,
  getRimiDeliveryRoutes,
  createRimiDeliveryRoute,
  deleteRimiDeliveryRoute,
  type RimiDeliveryRouteRecord,
  type RimiVehicleRecord
} from '../../lib/api/rimi';
import { useRimiAccess } from '../../lib/rimiAccess';

const blankRoute = { name: '', origin: '', stops: '', vehicle: '', hours: '' };

export const RimiDeliveryRoutes: React.FC = () => {
  const { canManage } = useRimiAccess();
  const [searchQuery, setSearchQuery] = useState('');
  const [routes, setRoutes] = useState<RimiDeliveryRouteRecord[]>([]);
  const [vehicles, setVehicles] = useState<RimiVehicleRecord[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [newRoute, setNewRoute] = useState(blankRoute);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    try {
      const [vData, rData] = await Promise.all([getRimiVehicles(), getRimiDeliveryRoutes()]);
      setVehicles(vData);
      setRoutes(rData);
    } catch (err: any) {
      showToastMsg(`Could not load routes: ${err.message || 'Database error'}`);
    }
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener('ferex_rimi_routes_change', loadData);
    window.addEventListener('ferex_rimi_vehicles_change', loadData);
    return () => {
      window.removeEventListener('ferex_rimi_routes_change', loadData);
      window.removeEventListener('ferex_rimi_vehicles_change', loadData);
    };
  }, [loadData]);

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    const stops = newRoute.stops.split(/->|,|\n/).map(s => s.trim()).filter(Boolean);
    if (!newRoute.name.trim()) { showToastMsg('Enter the route name.'); return; }
    if (stops.length === 0) { showToastMsg('Enter at least one drop stop.'); return; }
    setSaving(true);
    try {
      await createRimiDeliveryRoute({
        route_name: newRoute.name,
        origin_facility: newRoute.origin,
        destinations: stops,
        assigned_vehicle: newRoute.vehicle || undefined,
        estimated_transit_hours: Number(newRoute.hours) || 0,
      });
      setShowAddModal(false);
      showToastMsg(`Created delivery route ${newRoute.name}`);
      setNewRoute(blankRoute);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Could not save the route: ${err.message || 'Database error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoute = async (r: RimiDeliveryRouteRecord) => {
    if (!window.confirm(`Remove route "${r.route_name}"?`)) return;
    try {
      await deleteRimiDeliveryRoute(r.id);
      showToastMsg('Removed delivery route');
      await loadData();
    } catch (err: any) {
      showToastMsg(`Could not remove the route: ${err.message || 'Database error'}`);
    }
  };

  const q = searchQuery.toLowerCase();
  const filteredRoutes = routes.filter(r =>
    (r.route_name || '').toLowerCase().includes(q) ||
    (r.route_code || '').toLowerCase().includes(q) ||
    (r.destinations || []).join(' ').toLowerCase().includes(q)
  );

  return (
    <div className="space-y-6 text-left antialiased">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Navigation className="w-5 h-5 text-[#58051E]" /> Delivery routes
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Multi-stop routes and delivery timing.</p>
        </div>
        {canManage && (
          <Button size="sm" className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold" onClick={() => { setNewRoute(blankRoute); setShowAddModal(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> Plan Delivery Route
          </Button>
        )}
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search route name, stop, or code..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredRoutes.length} Routes</span>
      </Card>

      {filteredRoutes.length === 0 ? (
        <Card className="p-12 text-center text-xs font-semibold text-slate-400 border-dashed">
          {routes.length === 0 ? 'No delivery routes planned yet.' : 'No routes match your search.'}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRoutes.map((r) => (
            <Card key={r.id} className="p-5 border border-slate-200/70 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-[#58051E] uppercase">{r.route_code || 'ROUTE'}</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">{r.status || (r.is_active ? 'Active' : 'Inactive')}</span>
                </div>
                <h3 className="text-base font-black text-slate-900 leading-snug">{r.route_name}</h3>
                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Multi-Stop Drop Sequence</span>
                  <div className="text-xs font-bold text-slate-800 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#58051E] shrink-0 mt-0.5" />
                    <span>{[r.origin_facility, ...(r.destinations || [])].filter(Boolean).join(' → ') || '—'}</span>
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-600">Assigned Reefer: {r.assigned_vehicle || 'Not assigned'}</div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{Number(r.estimated_transit_hours) > 0 ? `Transit: ${r.estimated_transit_hours} h` : 'Transit time not set'}</span>
                {canManage && (
                  <button onClick={() => handleDeleteRoute(r)} className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer" title="Remove route">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

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
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Route Corridor Title *</label>
                  <input type="text" required value={newRoute.name} onChange={(e) => setNewRoute({ ...newRoute, name: e.target.value })} placeholder="e.g. Chennai – Madurai Cold Corridor" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Origin Cold Hub</label>
                  <input type="text" value={newRoute.origin} onChange={(e) => setNewRoute({ ...newRoute, origin: e.target.value })} placeholder="e.g. Chennai House" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Drop Stops (comma or → separated) *</label>
                  <textarea required value={newRoute.stops} onChange={(e) => setNewRoute({ ...newRoute, stops: e.target.value })} placeholder="Stop 1, Stop 2, Stop 3" rows={2} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Assigned Vehicle</label>
                    <select value={newRoute.vehicle} onChange={(e) => setNewRoute({ ...newRoute, vehicle: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="">Not assigned</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.vehicle_number}>{v.vehicle_number} ({v.driver_name})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Transit (hours)</label>
                    <input type="number" min="0" step="any" value={newRoute.hours} onChange={(e) => setNewRoute({ ...newRoute, hours: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" disabled={saving} className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">{saving ? 'Saving…' : 'Save Route'}</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
