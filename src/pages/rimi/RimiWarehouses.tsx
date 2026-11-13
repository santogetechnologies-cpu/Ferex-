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
  updateRimiBatch,
  deleteRimiBatch,
  updateRimiProduct,
  getRimiProductCategories,
  getRimiStockMovements,
  type RimiWarehouseRecord,
  type RimiInventoryBatchRecord,
  type RimiStockMovementRecord
} from '../../lib/api/rimi';
import { useRimiAccess } from '../../lib/rimiAccess';

/** Occupancy keeps two decimals so a small but real load (e.g. 4 of 1300 pallets = 0.31%) never shows as 0%. */
const fmtPct = (used: number, total: number) => {
  if (!(total > 0)) return '0';
  const v = (used / total) * 100;
  return v === 0 ? '0' : v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(1) : String(Math.round(v));
};

export const RimiWarehouses: React.FC = () => {
  // Admin and Warehouse users can both add, edit and delete cold storage hubs and the stock stored in them.
  const { canManage: isAdmin } = useRimiAccess();

  const [searchQuery, setSearchQuery] = useState('');
  const [facilities, setFacilities] = useState<RimiWarehouseRecord[]>([]);
  const [batches, setBatches] = useState<RimiInventoryBatchRecord[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<RimiWarehouseRecord | null>(null);
  const [editingFacility, setEditingFacility] = useState<RimiWarehouseRecord | null>(null);
  const [hubStockSearch, setHubStockSearch] = useState('');
  const [hubTab, setHubTab] = useState<'stock' | 'history'>('stock');
  const [movements, setMovements] = useState<RimiStockMovementRecord[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [editingStored, setEditingStored] = useState<any>(null);
  const [savingStored, setSavingStored] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  const [newWh, setNewWh] = useState({
    name: '',
    city: '',
    address: '',
    cold_room_temp_celsius: -22.0,
    total_capacity_pallets: 0,
    manager_name: '',
    manager_phone: ''
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [whData, batchData, moveData, catData] = await Promise.all([
        getRimiWarehouses(),
        getRimiBatches(),
        getRimiStockMovements(),
        getRimiProductCategories().catch(() => [] as string[]),
      ]);
      setFacilities(whData);
      setBatches(batchData);
      setMovements(moveData);
      setCategories(catData);
    } catch (err: any) {
      setToast(`Could not load cold storage data: ${err.message || 'Database error'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleSync = () => loadData();
    const events = ['ferex_rimi_warehouses_change', 'ferex_rimi_batches_change', 'ferex_rimi_movements_change'];
    events.forEach(ev => window.addEventListener(ev, handleSync));

    return () => {
      events.forEach(ev => window.removeEventListener(ev, handleSync));
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
      setNewWh({ name: '', city: '', address: '', cold_room_temp_celsius: -22.0, total_capacity_pallets: 0, manager_name: '', manager_phone: '' });
      await loadData();
    } catch (err: any) {
      showToastMsg(`Error adding facility: ${err.message || 'Database error'}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!isAdmin) {
      showToastMsg('Restricted: your role cannot remove cold storage hubs.');
      return;
    }
    if (!window.confirm(`Delete cold storage hub "${name}"? A hub that still holds stock cannot be deleted.`)) return;

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
        total_capacity_pallets: Number(editingFacility.total_capacity_pallets),
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

  const openEditStored = (b: RimiInventoryBatchRecord) => {
    setEditingStored({
      id: b.id,
      product_id: b.product_id,
      product_name: b.product_name,
      unit: b.unit,
      batch_no: b.batch_no,
      quantity: b.quantity,
      mfg_date: b.mfg_date || '',
      expiry_date: b.expiry_date,
      storage_temp: b.storage_temp || '',
      category: b.product_category || '',
    });
  };

  const handleSaveStored = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStored) return;
    if (!(Number(editingStored.quantity) >= 0)) { showToastMsg('Enter a valid quantity.'); return; }
    if (!editingStored.expiry_date) { showToastMsg('Enter the expiry date.'); return; }
    if (editingStored.mfg_date && new Date(editingStored.expiry_date) <= new Date(editingStored.mfg_date)) {
      showToastMsg('Expiry date must be after the manufacturing date.');
      return;
    }
    setSavingStored(true);
    try {
      await updateRimiBatch(editingStored.id, {
        batch_no: editingStored.batch_no.trim(),
        quantity: Number(editingStored.quantity),
        mfg_date: editingStored.mfg_date || undefined,
        expiry_date: editingStored.expiry_date,
        storage_temp: editingStored.storage_temp,
        product_category: editingStored.category || undefined,
      } as any);
      if (editingStored.category && editingStored.product_id) {
        await updateRimiProduct(editingStored.product_id, { category: editingStored.category } as any);
      }
      setEditingStored(null);
      showToastMsg(`Updated ${editingStored.product_name} in this hub.`);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Error updating stored product: ${err.message || 'Database error'}`);
    } finally {
      setSavingStored(false);
    }
  };

  const handleRemoveStored = async (b: RimiInventoryBatchRecord) => {
    if (!window.confirm(`Remove ${b.product_name} (batch ${b.batch_no}, ${Number(b.quantity).toLocaleString('en-IN')} ${b.unit || 'units'}) from this hub? The batch and its history are deleted and the hub's pallet usage is recalculated.`)) return;
    try {
      await deleteRimiBatch(b.id);
      showToastMsg(`Removed ${b.product_name} from this hub.`);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Error removing stored product: ${err.message || 'Database error'}`);
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
            // Occupancy comes from the batches stored in this hub (calculated by the database layer).
            const effectivePallets = Number(f.utilized_pallets) || 0;
            const totalCap = Number(f.total_capacity_pallets) || 0;
            const utilPct = totalCap > 0 ? Math.min(100, (effectivePallets / totalCap) * 100) : 0;

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
                      <span>{effectivePallets} / {totalCap} Pallets ({fmtPct(effectivePallets, totalCap)}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${utilPct > 85 ? 'bg-rose-600' : 'bg-[#58051E]'}`}
                        style={{ width: `${Math.min(100, utilPct)}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                    <span>{f.product_count || 0} product{(f.product_count || 0) === 1 ? '' : 's'} · {f.batch_count || 0} batch{(f.batch_count || 0) === 1 ? '' : 'es'}</span>
                    <span className="font-semibold text-slate-700">{f.manager_name}{f.manager_phone ? ` · ${f.manager_phone}` : ''}</span>
                  </div>

                  {/* Stock Inspection Trigger */}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedFacility(f);
                      setHubStockSearch('');
                      setHubTab('stock');
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
                const live = facilities.find(f => f.id === selectedFacility.id) || selectedFacility;
                // Only the batches that belong to THIS hub (by hub id), never another hub's.
                const hubBatches = batches.filter(b => b.warehouse_id === selectedFacility.id);
                const hubMovements = movements.filter(m => m.warehouse_id === selectedFacility.id);
                const nameOf = (id?: string) => hubBatches.find(b => b.product_id === id)?.product_name || 'Product';
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
                        <span className="text-base font-black text-cyan-800 mt-0.5 block">{live.utilized_pallets} / {live.total_capacity_pallets} ({fmtPct(Number(live.utilized_pallets) || 0, Number(live.total_capacity_pallets) || 0)}%)</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                      <button type="button" onClick={() => setHubTab('stock')} className={`h-9 rounded-xl border cursor-pointer ${hubTab === 'stock' ? 'bg-[#58051E] text-white border-[#58051E]' : 'bg-white text-slate-600 border-slate-200'}`}>Stored Products</button>
                      <button type="button" onClick={() => setHubTab('history')} className={`h-9 rounded-xl border cursor-pointer ${hubTab === 'history' ? 'bg-[#58051E] text-white border-[#58051E]' : 'bg-white text-slate-600 border-slate-200'}`}>History ({hubMovements.length})</button>
                    </div>

                    {hubTab === 'history' ? (
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold text-slate-500">Stock movements for {selectedFacility.name} only.</p>
                        {hubMovements.length === 0 ? (
                          <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs font-bold text-slate-500">No stock movements recorded for this hub yet.</div>
                        ) : hubMovements.map(m => (
                          <div key={m.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-black text-slate-900">{nameOf(m.product_id)} <span className="font-semibold text-slate-500">· {m.movement_type}</span></p>
                              <p className="text-[11px] text-slate-500 font-semibold">{m.reference_no || '—'}{m.notes ? ` · ${m.notes}` : ''}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{new Date(m.created_at).toLocaleString('en-IN')} · {m.performed_by}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`text-sm font-black ${Number(m.quantity_change) < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{Number(m.quantity_change) > 0 ? '+' : ''}{Number(m.quantity_change).toLocaleString('en-IN')}</span>
                              <span className="block text-[10px] text-slate-400">now {Number(m.resulting_quantity).toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (<>
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
                                {isAdmin && (
                                  <div className="flex justify-end gap-1.5 pt-1.5 border-t border-slate-200/60">
                                    <button type="button" onClick={() => openEditStored(b)} className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-white border border-slate-200 flex items-center gap-1 cursor-pointer"><Edit3 className="w-3 h-3" /> Edit</button>
                                    <button type="button" onClick={() => handleRemoveStored(b)} className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 flex items-center gap-1 cursor-pointer"><Trash2 className="w-3 h-3" /> Remove</button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    </>)}

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

      {/* Edit Stored Product Modal */}
      <AnimatePresence>
        {editingStored && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60]" onClick={() => setEditingStored(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-[70] border border-slate-100 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Edit Stored Product — {editingStored.product_name}</h3>
                <button onClick={() => setEditingStored(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSaveStored} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Quantity ({editingStored.unit || 'units'})</label>
                    <input type="number" min="0" step="any" required value={editingStored.quantity} onChange={(e) => setEditingStored({ ...editingStored, quantity: e.target.value })} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Batch Number</label>
                    <input type="text" required value={editingStored.batch_no} onChange={(e) => setEditingStored({ ...editingStored, batch_no: e.target.value })} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Manufacturing Date</label>
                    <input type="date" value={editingStored.mfg_date} onChange={(e) => setEditingStored({ ...editingStored, mfg_date: e.target.value })} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Expiry Date</label>
                    <input type="date" required value={editingStored.expiry_date} onChange={(e) => setEditingStored({ ...editingStored, expiry_date: e.target.value })} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Storage Temperature</label>
                    <input type="text" value={editingStored.storage_temp} onChange={(e) => setEditingStored({ ...editingStored, storage_temp: e.target.value })} placeholder="-18°C" className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Category</label>
                    <select value={editingStored.category} onChange={(e) => setEditingStored({ ...editingStored, category: e.target.value })} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900">
                      {editingStored.category && !categories.includes(editingStored.category) && <option value={editingStored.category}>{editingStored.category}</option>}
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <p className="text-[11px] font-semibold text-slate-500">Changing the quantity is logged as a stock adjustment, and this hub's pallet usage is recalculated.</p>
                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setEditingStored(null)}>Cancel</Button>
                  <Button type="submit" size="sm" disabled={savingStored} className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">{savingStored ? 'Saving…' : 'Save Changes'}</Button>
                </div>
              </form>
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
                      value={newWh.total_capacity_pallets || ""}
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
