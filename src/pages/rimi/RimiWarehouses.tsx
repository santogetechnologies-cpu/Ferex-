import React, { useState, useEffect, useCallback } from 'react';
import { Warehouse, Search, Thermometer, MapPin, Plus, Trash2, Edit3, X, CheckCircle2, Phone, Shield, Package, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import {
  getRimiWarehouses,
  createRimiWarehouse,
  updateRimiWarehouse,
  deleteRimiWarehouse,
  getRimiBatches,
  type RimiWarehouseRecord,
  type RimiInventoryBatchRecord
} from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const RIMI_ADMIN_ROLES = ['rimi_admin', 'rimi_frozen', 'admin', 'education_admin', 'central', 'super_admin', 'superadmin', 'operations_manager', 'warehouse_lead', 'warehouse_staff', 'rimi_staff'];

export const RimiWarehouses: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = RIMI_ADMIN_ROLES.includes(profile?.role || '');

  const [searchQuery, setSearchQuery] = useState('');
  const [facilities, setFacilities] = useState<RimiWarehouseRecord[]>([]);
  const [batches, setBatches] = useState<RimiInventoryBatchRecord[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<RimiWarehouseRecord | null>(null);
  const [editingFacility, setEditingFacility] = useState<RimiWarehouseRecord | null>(null);
  const [hubStockSearch, setHubStockSearch] = useState('');
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
      const [whData, batchData] = await Promise.all([
        getRimiWarehouses(),
        getRimiBatches()
      ]);
      setFacilities(whData);
      setBatches(batchData);
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

  const handleSaveFacilityEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFacility) return;
    try {
      await updateRimiWarehouse(editingFacility.id, {
        name: editingFacility.name,
        city: editingFacility.city,
        address: editingFacility.address,
        cold_room_temp_celsius: Number(editingFacility.cold_room_temp_celsius) || -22.0,
        total_capacity_pallets: Number(editingFacility.total_capacity_pallets) || 1000,
        manager_name: editingFacility.manager_name,
        manager_phone: editingFacility.manager_phone
      });
      setEditingFacility(null);
      showToastMsg(`Updated facility "${editingFacility.name}"`);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Error updating facility: ${err.message || 'Database error'}`);
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
            Regional cold hubs, real-time temperature logs, and pallet occupancy tracking.
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

                  {/* Stock Inspection Trigger */}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedFacility(f);
                      setHubStockSearch('');
                    }}
                    className="w-full text-xs font-bold bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-[#58051E]/40 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Package className="w-3.5 h-3.5 text-[#58051E]" />
                    View Stored Products & Stock Details
                  </Button>
                </div>

                {isAdmin && (
                  <div className="pt-2 border-t border-slate-100 flex justify-end items-center gap-1">
                    <button
                      onClick={() => setEditingFacility({ ...f })}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                      title="Edit Facility Details"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
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

            {/* Cold Storage Hub Products & Stock Drawer */}
      <AnimatePresence>
        {selectedFacility && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900 z-40"
              onClick={() => setSelectedFacility(null)}
            />
            <motion.div
              initial={{ translateX: '100%' }}
              animate={{ translateX: 0 }}
              exit={{ translateX: '100%' }}
              transition={{ duration: 0.25 }}
              className="fixed top-0 right-0 h-screen w-full max-w-xl bg-white z-50 shadow-2xl p-6 overflow-y-auto space-y-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400">{selectedFacility.code}</span>
                    <span className="text-[10px] font-mono font-black text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200 flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-cyan-600" /> {selectedFacility.cold_room_temp_celsius}°C
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mt-1">{selectedFacility.name}</h3>
                  <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {selectedFacility.city} {selectedFacility.address ? `• ${selectedFacility.address}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedFacility(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Hub Metrics */}
              {(() => {
                const hubBatches = batches.filter(b =>
                  b.warehouse_id === selectedFacility.id ||
                  (b.warehouse_name && selectedFacility.name && b.warehouse_name.toLowerCase().includes(selectedFacility.name.toLowerCase())) ||
                  (b.warehouse_name && selectedFacility.city && b.warehouse_name.toLowerCase().includes(selectedFacility.city.toLowerCase()))
                );
                const totalUnits = hubBatches.reduce((acc, b) => acc + Number(b.quantity || 0), 0);
                const uniqueSkus = new Set(hubBatches.map(b => b.product_name || b.product_id)).size;

                const filteredStock = hubBatches.filter(b => {
                  const s = hubStockSearch.toLowerCase();
                  return (
                    (b.product_name && b.product_name.toLowerCase().includes(s)) ||
                    (b.batch_no && b.batch_no.toLowerCase().includes(s)) ||
                    (b.product_category && b.product_category.toLowerCase().includes(s))
                  );
                });

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Total Physical Stock</span>
                        <span className="text-base font-black text-[#58051E] mt-0.5 block">{totalUnits.toLocaleString('en-IN')} Units</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Distinct SKUs</span>
                        <span className="text-base font-black text-slate-900 mt-0.5 block">{uniqueSkus} Products</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Pallet Utilization</span>
                        <span className="text-base font-black text-cyan-800 mt-0.5 block">{selectedFacility.utilized_pallets} / {selectedFacility.total_capacity_pallets}</span>
                      </div>
                    </div>

                    {/* Stock Search Filter */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={hubStockSearch}
                        onChange={(e) => setHubStockSearch(e.target.value)}
                        placeholder="Search product name, SKU, or batch number stored here..."
                        className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>

                    {/* Product & Stock List */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Package className="w-4 h-4 text-[#58051E]" /> Products Stored in this Hub ({filteredStock.length})
                        </span>
                        <span className="text-slate-400 font-semibold text-[11px]">Cold Chain Verified</span>
                      </div>

                      {filteredStock.length === 0 ? (
                        <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-1.5">
                          <p className="text-xs font-bold text-slate-600">No matching product stock found in this hub.</p>
                          <p className="text-[11px] text-slate-400">Batches stored at other warehouses or awaiting intake delivery.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredStock.map((b) => {
                            const isExpSoon = b.status === 'Expiring Soon';
                            const isExpired = b.status === 'Expired';
                            const isLowStock = b.status === 'Low Stock';

                            return (
                              <div
                                key={b.id}
                                className="p-3.5 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200/80 transition-all space-y-2"
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="text-xs font-black text-slate-900 leading-tight">{b.product_name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                        Batch: {b.batch_no}
                                      </span>
                                      {b.product_category && (
                                        <span className="text-[10px] font-semibold text-slate-500">
                                          Category: {b.product_category}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    <span className="text-sm font-black text-slate-900 block">
                                      {Number(b.quantity).toLocaleString('en-IN')} {b.unit || 'Units'}
                                    </span>
                                    <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded mt-0.5 ${
                                      isExpired
                                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                        : isExpSoon
                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                        : isLowStock
                                        ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    }`}>
                                      {b.status || 'Active'}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-200/60">
                                  <span className="flex items-center gap-1 font-semibold">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    Expiry: <strong className="text-slate-800">{b.expiry_date}</strong>
                                    {b.days_to_expiry !== undefined && (
                                      <span className="text-[10px] text-slate-400">({b.days_to_expiry} days left)</span>
                                    )}
                                  </span>
                                  <span className="font-mono text-[10px] text-cyan-800 font-bold bg-cyan-50 px-1.5 py-0.5 rounded">
                                    Temp: {b.storage_temp || selectedFacility.cold_room_temp_celsius + '°C'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      className="w-full text-xs font-bold bg-[#58051E] hover:bg-[#430316] text-white"
                      onClick={() => setSelectedFacility(null)}
                    >
                      Close Hub Details
                    </Button>
                  </div>
                );
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Facility Modal */}
      <AnimatePresence>
        {editingFacility && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={() => setEditingFacility(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900">Edit Cold Storage Facility</h3>
                  <p className="text-[10px] font-bold text-[#58051E]">{editingFacility.code} • {editingFacility.name}</p>
                </div>
                <button onClick={() => setEditingFacility(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSaveFacilityEdit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Facility Name *</label>
                  <input
                    type="text"
                    required
                    value={editingFacility.name}
                    onChange={(e) => setEditingFacility({ ...editingFacility, name: e.target.value })}
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">City / Location *</label>
                    <input
                      type="text"
                      required
                      value={editingFacility.city}
                      onChange={(e) => setEditingFacility({ ...editingFacility, city: e.target.value })}
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Cold Room Temp (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editingFacility.cold_room_temp_celsius}
                      onChange={(e) => setEditingFacility({ ...editingFacility, cold_room_temp_celsius: Number(e.target.value) })}
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Pallet Capacity</label>
                    <input
                      type="number"
                      value={editingFacility.total_capacity_pallets}
                      onChange={(e) => setEditingFacility({ ...editingFacility, total_capacity_pallets: Number(e.target.value) })}
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Facility Manager</label>
                    <input
                      type="text"
                      value={editingFacility.manager_name}
                      onChange={(e) => setEditingFacility({ ...editingFacility, manager_name: e.target.value })}
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Manager Phone</label>
                  <input
                    type="text"
                    value={editingFacility.manager_phone || ''}
                    onChange={(e) => setEditingFacility({ ...editingFacility, manager_phone: e.target.value })}
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setEditingFacility(null)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">Update Facility</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
