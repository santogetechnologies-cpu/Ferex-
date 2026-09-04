import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck, Search, Plus, Eye, Trash2, X, CheckCircle2, Anchor, Navigation,
  Warehouse, AlertTriangle, ShieldAlert, Layers, ArrowRight,
  TrendingDown, FileText, CheckCircle
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import {
  getTradeShipments,
  createTradeShipment,
  deleteTradeShipment,
  updateTradeShipmentStatus,
  getTradeBondedInventory,
  createTradeBondedItem,
  updateTradeBondedStock,
  deleteTradeBondedItem,
  getTradeCargoLosses,
  createTradeCargoLoss,
  deleteTradeCargoLoss,
  getTradeCargoLossSummary,
  BondedCargoItem,
  CargoLossRecord
} from '../../lib/api/trade';

export const TradeShipments: React.FC = () => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'containers' | 'bonded_warehouse' | 'cargo_losses'>('containers');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('All');
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  // Data States
  const [shipments, setShipments] = useState<any[]>([]);
  const [bondedInventory, setBondedInventory] = useState<BondedCargoItem[]>([]);
  const [cargoLosses, setCargoLosses] = useState<CargoLossRecord[]>([]);
  const [lossSummary, setLossSummary] = useState({
    totalLossInr: 0,
    totalDemurrageInr: 0,
    totalShrinkageTons: 0,
    recoveredInr: 0,
    totalLossesCount: 0
  });

  // Modal States
  const [showAddShipmentModal, setShowAddShipmentModal] = useState(false);
  const [showAddBondedModal, setShowAddBondedModal] = useState(false);
  const [showAddLossModal, setShowAddLossModal] = useState(false);
  const [selectedBondedItem, setSelectedBondedItem] = useState<BondedCargoItem | null>(null);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // Loader
  const loadAllTradeData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [shipData, bondData, lossData, lossSum] = await Promise.all([
        getTradeShipments(),
        getTradeBondedInventory(),
        getTradeCargoLosses(),
        getTradeCargoLossSummary()
      ]);

      if (Array.isArray(shipData)) {
        setShipments(shipData.map(d => ({
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

      setBondedInventory(bondData || []);
      setCargoLosses(lossData || []);
      setLossSummary(lossSum);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllTradeData();

    const channel = supabase
      .channel('realtime_trade_shipments_all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_shipments' }, () => {
        loadAllTradeData();
      })
      .subscribe();

    const handleShipmentSync = () => loadAllTradeData();
    const handleBondedSync = () => loadAllTradeData();
    const handleLossSync = () => loadAllTradeData();

    window.addEventListener('ferex_trade_shipments_change', handleShipmentSync);
    window.addEventListener('ferex_trade_bonded_inventory_change', handleBondedSync);
    window.addEventListener('ferex_trade_cargo_losses_change', handleLossSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_shipments_change', handleShipmentSync);
      window.removeEventListener('ferex_trade_bonded_inventory_change', handleBondedSync);
      window.removeEventListener('ferex_trade_cargo_losses_change', handleLossSync);
    };
  }, [loadAllTradeData]);

  // Form State: Container
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

  // Form State: Bonded Item
  const [newBonded, setNewBonded] = useState({
    sku: '',
    commodity: '',
    category: 'Bulk Energy Commodities',
    port_location: 'Port of Gdansk, Bonded Bay #4A',
    warehouse_bay: 'Bay-04 North Terminal',
    in_stock_metric_tons: 25000,
    reserved_metric_tons: 5000,
    unit_value_inr: 15000,
    customs_bond_no: '',
    status: 'In Bond' as const
  });

  // Form State: Cargo Loss
  const [newLoss, setNewLoss] = useState({
    shipment_no: 'SHP-9021',
    container_no: '',
    loss_type: 'Port Demurrage Penalty' as const,
    port_location: 'Port of Rotterdam (ECT Delta Terminal)',
    loss_amount_inr: 120000,
    shrinkage_metric_tons: 0,
    carrier_responsible: 'Maersk Line',
    insurance_claim_status: 'Not Filed' as const,
    incident_date: new Date().toISOString().split('T')[0],
    description: ''
  });

  // Actions
  const handleAddShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShipment.container) return;
    await createTradeShipment({
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
    await loadAllTradeData();
    setShowAddShipmentModal(false);
    showToastMsg(`Dispatched container ${newShipment.container} successfully!`);
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

  const handleAddBondedItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBonded.commodity) return;
    await createTradeBondedItem(newBonded);
    await loadAllTradeData();
    setShowAddBondedModal(false);
    showToastMsg(`Registered ${newBonded.commodity} in customs bonded warehouse!`);
    setNewBonded({
      sku: '',
      commodity: '',
      category: 'Bulk Energy Commodities',
      port_location: 'Port of Gdansk, Bonded Bay #4A',
      warehouse_bay: 'Bay-04 North Terminal',
      in_stock_metric_tons: 25000,
      reserved_metric_tons: 5000,
      unit_value_inr: 15000,
      customs_bond_no: '',
      status: 'In Bond'
    });
  };

  const handleAddLoss = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoss.loss_amount_inr) return;
    await createTradeCargoLoss(newLoss);
    await loadAllTradeData();
    setShowAddLossModal(false);
    showToastMsg(`Logged incident: ${newLoss.loss_type} (₹${Number(newLoss.loss_amount_inr).toLocaleString('en-IN')})`);
  };

  const handleStatusChange = async (id: string, rawId: string, newStatus: string) => {
    await updateTradeShipmentStatus(rawId || id, newStatus);
    showToastMsg(`Updated shipment status to ${newStatus}`);
    await loadAllTradeData();
  };

  const handleDeleteShipment = async (id: string, rawId?: string) => {
    await deleteTradeShipment(rawId || id);
    setShipments(prev => prev.filter(s => s.id !== id && s.rawId !== rawId));
    showToastMsg(`Removed shipment record ${id}`);
  };

  const handleDeleteBonded = async (id: string) => {
    await deleteTradeBondedItem(id);
    showToastMsg(`Removed bonded inventory SKU ${id}`);
    await loadAllTradeData();
  };

  const handleDeleteLoss = async (id: string) => {
    await deleteTradeCargoLoss(id);
    showToastMsg(`Archived loss incident record ${id}`);
    await loadAllTradeData();
  };

  // Computations
  const totalBondedValuation = bondedInventory.reduce((sum, b) => sum + (b.total_valuation_inr || 0), 0);
  const totalBondedTons = bondedInventory.reduce((sum, b) => sum + (b.in_stock_metric_tons || 0), 0);

  const formatInrCr = (amt: number) => {
    if (!amt || amt === 0) return '₹0';
    if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)} Cr`;
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(2)} L`;
    return `₹${amt.toLocaleString('en-IN')}`;
  };

  const filteredShipments = shipments.filter(s => {
    const matchesSearch =
      (s.container || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.carrier || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.id || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMode = filterMode === 'All' || s.mode === filterMode;
    return matchesSearch && matchesMode;
  });

  const filteredBonded = bondedInventory.filter(b =>
    (b.commodity || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.sku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.port_location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.customs_bond_no || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLosses = cargoLosses.filter(l =>
    (l.shipment_no || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.container_no || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.loss_type || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.port_location || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left antialiased max-w-7xl mx-auto">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-rose-900/40">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Global Stats Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-[#6A1B2E]" /> Global Container & Freight Logistics
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Real-time container movement, bonded warehouse stock, demurrage exposure, and port-to-port manifests.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'containers' && (
            <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold shadow-md shadow-rose-950/10" onClick={() => setShowAddShipmentModal(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Book Container Shipment
            </Button>
          )}
          {activeTab === 'bonded_warehouse' && (
            <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold shadow-md shadow-rose-950/10" onClick={() => setShowAddBondedModal(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Bonded Yard Cargo
            </Button>
          )}
          {activeTab === 'cargo_losses' && (
            <Button size="sm" className="bg-rose-700 hover:bg-rose-800 text-xs font-bold shadow-md shadow-rose-950/10 text-white" onClick={() => setShowAddLossModal(true)}>
              <ShieldAlert className="w-4 h-4 mr-1.5" /> Record Loss / Demurrage
            </Button>
          )}
        </div>
      </div>

      {/* 4 Dynamic Metric Pill Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 border border-slate-200/80 bg-white hover:border-[#6A1B2E]/40 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Fleet</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <Anchor className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{shipments.length}</div>
          <div className="text-[10px] font-semibold text-blue-600 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            {shipments.filter(s => s.status === 'In Transit').length} In Transit Across High Seas
          </div>
        </Card>

        <Card className="p-4 border border-slate-200/80 bg-white hover:border-[#6A1B2E]/40 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bonded Yard Stock</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Warehouse className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalBondedTons.toLocaleString()} <span className="text-xs font-bold text-slate-400">MT</span></div>
          <div className="text-[10px] font-semibold text-slate-500 mt-1">
            Valued at {formatInrCr(totalBondedValuation)} in FTZ / Bond
          </div>
        </Card>

        <Card className="p-4 border border-slate-200/80 bg-white hover:border-[#6A1B2E]/40 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Demurrage Penalties</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 mt-2">{formatInrCr(lossSummary.totalDemurrageInr)}</div>
          <div className="text-[10px] font-semibold text-rose-700 mt-1">
            {lossSummary.totalLossesCount} Recorded Port Demurrage Events
          </div>
        </Card>

        <Card className="p-4 border border-slate-200/80 bg-white hover:border-[#6A1B2E]/40 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Insurance Recovery</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">{formatInrCr(lossSummary.recoveredInr)}</div>
          <div className="text-[10px] font-semibold text-emerald-700 mt-1">
            Marine claims settled & reimbursed
          </div>
        </Card>
      </div>

      {/* Modern High-End Module Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => { setActiveTab('containers'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            activeTab === 'containers'
              ? 'bg-[#6A1B2E] text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Truck className="w-3.5 h-3.5" /> Active Vessel Fleet & Containers ({shipments.length})
        </button>
        <button
          onClick={() => { setActiveTab('bonded_warehouse'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            activeTab === 'bonded_warehouse'
              ? 'bg-[#6A1B2E] text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Warehouse className="w-3.5 h-3.5" /> Customs Bonded Warehouse & Port Yard ({bondedInventory.length})
        </button>
        <button
          onClick={() => { setActiveTab('cargo_losses'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            activeTab === 'cargo_losses'
              ? 'bg-rose-700 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" /> Demurrage & Cargo Loss Engine ({cargoLosses.length})
        </button>
      </div>

      {/* Universal Search and Filter Toolbar */}
      <Card className="p-3.5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'containers' ? 'Search Container Serial #, Carrier, Port...' :
              activeTab === 'bonded_warehouse' ? 'Search SKU, Commodity, Warehouse Bay, Customs Bond...' :
              'Search Incident #, Container #, Port Location...'
            }
            className="w-full h-9 pl-9 pr-4 bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]"
          />
        </div>

        {activeTab === 'containers' && (
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            {['All', 'Maritime', 'Air Cargo'].map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterMode === mode ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* ─────────────────── TAB 1: CONTAINER SHIPMENTS ─────────────────── */}
      {activeTab === 'containers' && (
        <>
          {loading ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400">Loading container manifest...</div>
          ) : filteredShipments.length === 0 ? (
            <Card className="p-12 text-center border border-dashed border-slate-200">
              <Truck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-black text-slate-800">No active shipments matching criteria</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Dispatch a new container shipment or refine your search query.
              </p>
              <Button size="sm" className="mt-4 bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddShipmentModal(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Book Container Shipment
              </Button>
            </Card>
          ) : (
            <Card className="overflow-hidden border border-slate-200/80 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                      <th className="py-3.5 px-4">Container ID & Carrier</th>
                      <th className="py-3.5 px-4">Origin Port</th>
                      <th className="py-3.5 px-4">Destination Port</th>
                      <th className="py-3.5 px-4">Cargo & Weight</th>
                      <th className="py-3.5 px-4">ETA Date</th>
                      <th className="py-3.5 px-4">Status Transition</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
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
        </>
      )}

      {/* ─────────────────── TAB 2: BONDED WAREHOUSE INVENTORY ─────────────────── */}
      {activeTab === 'bonded_warehouse' && (
        <>
          {filteredBonded.length === 0 ? (
            <Card className="p-12 text-center border border-dashed border-slate-200">
              <Warehouse className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-black text-slate-800">No bonded warehouse inventory found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Add customs bonded bulk commodities, metals, or petroleum stockpiles.
              </p>
              <Button size="sm" className="mt-4 bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddBondedModal(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Bonded Yard Cargo
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBonded.map((item) => (
                <Card key={item.id} className="p-5 border border-slate-200/80 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {item.sku}
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                          item.status === 'In Bond' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          item.status === 'Cleared Customs' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <h3 className="text-sm font-black text-slate-900 mt-2">{item.commodity}</h3>
                      <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Warehouse className="w-3.5 h-3.5 text-[#6A1B2E]" /> {item.port_location} · <span className="font-bold text-slate-700">{item.warehouse_bay}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteBonded(item.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Bonded Stock"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Stock Levels & Allocation Bar */}
                  <div className="mt-4 p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-500">In-Stock: <strong className="text-slate-900">{item.in_stock_metric_tons.toLocaleString()} MT</strong></span>
                      <span className="text-amber-700">Reserved: <strong>{item.reserved_metric_tons.toLocaleString()} MT</strong></span>
                      <span className="text-emerald-700 font-extrabold">Available: {item.available_metric_tons.toLocaleString()} MT</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full"
                        style={{ width: `${item.in_stock_metric_tons > 0 ? (item.available_metric_tons / item.in_stock_metric_tons) * 100 : 0}%` }}
                      />
                      <div
                        className="bg-amber-400 h-full"
                        style={{ width: `${item.in_stock_metric_tons > 0 ? (item.reserved_metric_tons / item.in_stock_metric_tons) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Valuation & Customs Bond Code */}
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Total Valuation</span>
                      <div className="font-black text-[#6A1B2E]">{formatInrCr(item.total_valuation_inr)}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Bond Certificate #</span>
                      <div className="font-mono text-[11px] font-bold text-slate-700">{item.customs_bond_no}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs font-bold hover:bg-slate-50"
                      onClick={() => setSelectedBondedItem(item)}
                    >
                      <Layers className="w-3.5 h-3.5 mr-1" /> Adjust Stock & Reservations
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─────────────────── TAB 3: DEMURRAGE & CARGO LOSS ENGINE ─────────────────── */}
      {activeTab === 'cargo_losses' && (
        <div className="space-y-4">
          <div className="p-4 bg-rose-50/70 border border-rose-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-xs">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-rose-950">Demurrage & Maritime Cargo Loss Ledger</h4>
                <p className="text-xs font-medium text-rose-800 mt-0.5">
                  Tracks container detention fines, port storage overstay fees, handling impact damage, and marine insurance recovery.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold shrink-0"
              onClick={() => setShowAddLossModal(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Log Incident
            </Button>
          </div>

          {filteredLosses.length === 0 ? (
            <Card className="p-12 text-center border border-dashed border-slate-200">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-sm font-black text-slate-800">Zero Demurrage & Cargo Loss Incidents</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                No detention penalties or marine damage incidents recorded.
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden border border-slate-200/80 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                      <th className="py-3.5 px-4">Incident ID & Type</th>
                      <th className="py-3.5 px-4">Shipment / Container</th>
                      <th className="py-3.5 px-4">Port Terminal</th>
                      <th className="py-3.5 px-4">Loss Amount</th>
                      <th className="py-3.5 px-4">Carrier Line</th>
                      <th className="py-3.5 px-4">Claim Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {filteredLosses.map((loss) => (
                      <tr key={loss.id} className="hover:bg-rose-50/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                            <TrendingDown className="w-3.5 h-3.5 text-rose-600" /> {loss.loss_type}
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">{loss.id} · {loss.incident_date}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">{loss.shipment_no}</div>
                          <span className="text-[10px] font-mono text-slate-500">{loss.container_no}</span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">{loss.port_location}</td>
                        <td className="py-3.5 px-4 font-black text-rose-600">
                          ₹{Number(loss.loss_amount_inr).toLocaleString('en-IN')}
                          {loss.shrinkage_metric_tons && (
                            <div className="text-[10px] font-semibold text-slate-400">-{loss.shrinkage_metric_tons} MT Shrinkage</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-700">{loss.carrier_responsible || 'Maersk'}</td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                            loss.insurance_claim_status === 'Recovered / Reimbursed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            loss.insurance_claim_status === 'Claim Lodged' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            loss.insurance_claim_status === 'Under Review' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {loss.insurance_claim_status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteLoss(loss.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete Loss Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ─── MODAL: BOOK CONTAINER SHIPMENT ─── */}
      <AnimatePresence>
        {showAddShipmentModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddShipmentModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#6A1B2E]" /> Book Container Shipment
                </h3>
                <button onClick={() => setShowAddShipmentModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
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
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddShipmentModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Dispatch Shipment</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── MODAL: ADD BONDED CARGO ITEM ─── */}
      <AnimatePresence>
        {showAddBondedModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddBondedModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-[#6A1B2E]" /> Add Bonded Yard Cargo Stock
                </h3>
                <button onClick={() => setShowAddBondedModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddBondedItem} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Commodity Name</label>
                  <input type="text" required value={newBonded.commodity} onChange={(e) => setNewBonded({ ...newBonded, commodity: e.target.value })} placeholder="e.g. Polish Thermal Coal 6000 kcal" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Port Location</label>
                    <input type="text" required value={newBonded.port_location} onChange={(e) => setNewBonded({ ...newBonded, port_location: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Warehouse Bay / Shed</label>
                    <input type="text" required value={newBonded.warehouse_bay} onChange={(e) => setNewBonded({ ...newBonded, warehouse_bay: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">In-Stock Quantity (MT)</label>
                    <input type="number" required value={newBonded.in_stock_metric_tons} onChange={(e) => setNewBonded({ ...newBonded, in_stock_metric_tons: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Unit Value (₹ / MT)</label>
                    <input type="number" required value={newBonded.unit_value_inr} onChange={(e) => setNewBonded({ ...newBonded, unit_value_inr: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Customs Bond Certificate #</label>
                  <input type="text" value={newBonded.customs_bond_no} onChange={(e) => setNewBonded({ ...newBonded, customs_bond_no: e.target.value })} placeholder="e.g. PL-GDN-CB-2026-0981" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddBondedModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Register Bond Cargo</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── MODAL: RECORD DEMURRAGE & LOSS ─── */}
      <AnimatePresence>
        {showAddLossModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddLossModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" /> Log Demurrage / Loss Incident
                </h3>
                <button onClick={() => setShowAddLossModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddLoss} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Loss Incident Type</label>
                    <select value={newLoss.loss_type} onChange={(e: any) => setNewLoss({ ...newLoss, loss_type: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="Port Demurrage Penalty">Port Demurrage Penalty</option>
                      <option value="Transit Shrinkage">Transit Shrinkage</option>
                      <option value="Handling Damage">Handling Damage</option>
                      <option value="Contamination / Spillage">Contamination / Spillage</option>
                      <option value="Customs Detention">Customs Detention</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Loss Amount (INR ₹)</label>
                    <input type="number" required value={newLoss.loss_amount_inr} onChange={(e) => setNewLoss({ ...newLoss, loss_amount_inr: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Container Serial #</label>
                    <input type="text" value={newLoss.container_no} onChange={(e) => setNewLoss({ ...newLoss, container_no: e.target.value })} placeholder="e.g. MSCU-884920-1" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Port Location</label>
                    <input type="text" value={newLoss.port_location} onChange={(e) => setNewLoss({ ...newLoss, port_location: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Carrier Line</label>
                    <input type="text" value={newLoss.carrier_responsible} onChange={(e) => setNewLoss({ ...newLoss, carrier_responsible: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Insurance Claim Status</label>
                    <select value={newLoss.insurance_claim_status} onChange={(e: any) => setNewLoss({ ...newLoss, insurance_claim_status: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="Not Filed">Not Filed</option>
                      <option value="Claim Lodged">Claim Lodged</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Recovered / Reimbursed">Recovered / Reimbursed</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Incident Description</label>
                  <textarea rows={2} value={newLoss.description} onChange={(e) => setNewLoss({ ...newLoss, description: e.target.value })} placeholder="Detailed cause of demurrage or damage..." className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddLossModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white">Record Incident</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── MODAL: ADJUST BONDED STOCK LEVEL ─── */}
      <AnimatePresence>
        {selectedBondedItem && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setSelectedBondedItem(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#6A1B2E]" /> Stock Adjustment: {selectedBondedItem.sku}
                </h3>
                <button onClick={() => setSelectedBondedItem(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                  <div className="font-black text-slate-900">{selectedBondedItem.commodity}</div>
                  <div className="text-slate-500">{selectedBondedItem.port_location} · {selectedBondedItem.warehouse_bay}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">In-Stock MT</label>
                    <input
                      type="number"
                      value={selectedBondedItem.in_stock_metric_tons}
                      onChange={(e) => setSelectedBondedItem({ ...selectedBondedItem, in_stock_metric_tons: Number(e.target.value) })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Reserved MT</label>
                    <input
                      type="number"
                      value={selectedBondedItem.reserved_metric_tons}
                      onChange={(e) => setSelectedBondedItem({ ...selectedBondedItem, reserved_metric_tons: Number(e.target.value) })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Customs Bond Status</label>
                  <select
                    value={selectedBondedItem.status}
                    onChange={(e: any) => setSelectedBondedItem({ ...selectedBondedItem, status: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="In Bond">In Bond</option>
                    <option value="Cleared Customs">Cleared Customs</option>
                    <option value="In Transit Transfer">In Transit Transfer</option>
                    <option value="Under Inspection">Under Inspection</option>
                  </select>
                </div>

                <div className="pt-2 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setSelectedBondedItem(null)}>Cancel</Button>
                  <Button
                    size="sm"
                    className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]"
                    onClick={async () => {
                      await updateTradeBondedStock(selectedBondedItem.id, selectedBondedItem);
                      showToastMsg(`Updated inventory and allocation levels for ${selectedBondedItem.sku}`);
                      setSelectedBondedItem(null);
                      await loadAllTradeData();
                    }}
                  >
                    Save Allocations
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── TRACKING DRAWER ─── */}
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
